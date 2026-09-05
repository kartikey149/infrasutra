import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Activity, ChevronRight, Mic, X } from 'lucide-react';

// ─── Keyword → Activity matcher ───────────────────────────────────────────────
// Scores an activity against the user's typed/voice text using keyword overlap.
// Returns a score 0–1 and the matched keywords for highlight rendering.
function scoreActivity(query, activity) {
  if (!query || !activity) return { score: 0, matched: [] };

  const q = query.toLowerCase().replace(/[^\w\s]/g, ' ');
  const queryWords = q.split(/\s+/).filter(w => w.length > 2);

  // Build searchable text from all activity fields
  const activityText = [
    activity.name || activity.activity_name || '',
    activity.discipline || '',
    activity.id || activity.activity_id || '',
    activity.resources || '',
    activity.riskNotes || '',
  ].join(' ').toLowerCase();

  if (!activityText.trim()) return { score: 0, matched: [] };

  const matched = [];
  let score = 0;

  for (const word of queryWords) {
    if (activityText.includes(word)) {
      matched.push(word);
      score += word.length > 5 ? 0.3 : 0.15; // longer matches = stronger signal
    }
  }

  // Bonus: discipline keyword matches (civil, piping, electrical, etc.)
  const DISCIPLINE_KEYWORDS = {
    civil: ['civil', 'foundation', 'concrete', 'grading', 'trench', 'excavat', 'backfill', 'pad'],
    piping: ['pipe', 'piping', 'weld', 'spool', 'joint', 'coating', 'sleeve', 'manifold'],
    mechanical: ['erect', 'crane', 'lift', 'compressor', 'skid', 'exchanger', 'vessel'],
    electrical: ['electric', 'cable', 'wiring', 'DCS', 'ESD', 'panel', 'cathodic'],
    testing: ['test', 'hydrostatic', 'pressure', 'NDT', 'radiograph', 'inspect'],
    commissioning: ['commission', 'purge', 'nitrogen', 'leak', 'startup'],
  };

  for (const [disc, keywords] of Object.entries(DISCIPLINE_KEYWORDS)) {
    if (keywords.some(k => q.includes(k))) {
      if ((activity.discipline || '').toLowerCase() === disc) {
        score += 0.25;
      }
    }
  }

  // Progress keywords
  if ((q.includes('complete') || q.includes('finish') || q.includes('done') || q.includes('ho gaya')) && activity.progress < 100) score += 0.1;
  if ((q.includes('start') || q.includes('chalu') || q.includes('shuru')) && (activity.progress || 0) === 0) score += 0.1;
  if ((q.includes('progress') || q.includes('ongoing') || q.includes('chal raha')) && (activity.progress || 0) > 0 && (activity.progress || 0) < 100) score += 0.1;

  return { score: Math.min(score, 1), matched };
}

// ─── Highlight matched words in text ─────────────────────────────────────────
function HighlightText({ text, matched }) {
  if (!matched || matched.length === 0) return <span>{text}</span>;
  const regex = new RegExp(`(${matched.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi');
  const parts = text.split(regex);
  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part)
          ? <mark key={i} className="bg-amber-200 text-amber-900 rounded px-0.5 font-bold not-italic">{part}</mark>
          : <span key={i}>{part}</span>
      )}
    </span>
  );
}

// ─── Discipline color badge ───────────────────────────────────────────────────
function DisciplineBadge({ discipline }) {
  const colors = {
    Civil: 'bg-orange-100 text-orange-700 border-orange-200',
    Mechanical: 'bg-blue-100 text-blue-700 border-blue-200',
    Piping: 'bg-purple-100 text-purple-700 border-purple-200',
    Electrical: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    Instrumentation: 'bg-cyan-100 text-cyan-700 border-cyan-200',
    Testing: 'bg-rose-100 text-rose-700 border-rose-200',
    Commissioning: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    Quality: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  };
  const cls = colors[discipline] || 'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${cls}`}>
      {discipline || 'General'}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
/**
 * ActivitySuggestions
 *
 * Props:
 *   query          – current text in the input (typed or voice-converted)
 *   activities     – array of activity objects from the project schedule
 *   onSelect       – callback(activity) when user picks a suggestion
 *   onDismiss      – callback to hide the panel
 *   variant        – 'dropdown' (below textarea, FieldUpdate) | 'popup' (above input, Telegram)
 *   isVoice        – boolean, true when text came from voice recognition
 */
export default function ActivitySuggestions({
  query = '',
  activities = [],
  onSelect,
  onDismiss,
  variant = 'dropdown',
  isVoice = false,
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef(null);

  // Recompute suggestions whenever query or activities change
  useEffect(() => {
    if (!query || query.trim().length < 3 || activities.length === 0) {
      setSuggestions([]);
      setActiveIdx(-1);
      return;
    }

    const scored = activities
      .map(act => ({ act, ...scoreActivity(query, act) }))
      .filter(s => s.score > 0.1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6); // max 6 suggestions like Google

    setSuggestions(scored);
    setActiveIdx(-1);
  }, [query, activities]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e) => {
    if (!suggestions.length) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, 0)); }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); onSelect?.(suggestions[activeIdx].act); }
    if (e.key === 'Escape') onDismiss?.();
  }, [suggestions, activeIdx, onSelect, onDismiss]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Click outside to dismiss
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        onDismiss?.();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onDismiss]);

  if (!suggestions.length) return null;

  const isPopup = variant === 'popup'; // Telegram: appears above input

  return (
    <div
      ref={containerRef}
      className={`
        z-50 w-full bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-fadeIn
        ${isPopup ? 'absolute bottom-full mb-2 left-0 right-0' : 'mt-1.5'}
      `}
      style={{ maxHeight: isPopup ? '280px' : '320px' }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-indigo-50 to-blue-50 border-b border-slate-100">
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-indigo-700 uppercase tracking-wider">
          {isVoice
            ? <><Mic size={11} className="text-rose-500 animate-pulse" /> Voice matched {suggestions.length} schedule activit{suggestions.length === 1 ? 'y' : 'ies'}</>
            : <><Sparkles size={11} className="text-amber-500" /> {suggestions.length} matching schedule activit{suggestions.length === 1 ? 'y' : 'ies'}</>
          }
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition"
        >
          <X size={12} />
        </button>
      </div>

      {/* Suggestions list */}
      <ul className="overflow-y-auto" style={{ maxHeight: isPopup ? '230px' : '270px' }}>
        {suggestions.map(({ act, score, matched }, idx) => {
          const name = act.name || act.activity_name || 'Unknown Activity';
          const actId = act.id || act.activity_id || '';
          const progress = act.progress ?? 0;
          const isActive = idx === activeIdx;

          return (
            <li key={actId || idx}>
              <button
                type="button"
                onClick={() => onSelect?.(act)}
                onMouseEnter={() => setActiveIdx(idx)}
                className={`
                  w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition border-b border-slate-50 last:border-0 group
                  ${isActive ? 'bg-indigo-50' : 'hover:bg-slate-50'}
                `}
              >
                {/* Activity icon */}
                <div className={`mt-0.5 shrink-0 w-6 h-6 rounded-lg flex items-center justify-center ${isActive ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-500'}`}>
                  <Activity size={12} />
                </div>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="font-mono text-[9px] font-bold text-slate-400">{actId}</span>
                    <DisciplineBadge discipline={act.discipline} />
                    {act.critical && (
                      <span className="text-[9px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1 rounded">CRITICAL</span>
                    )}
                  </div>
                  <p className="text-[11px] font-semibold text-slate-800 mt-0.5 leading-tight">
                    <HighlightText text={name} matched={matched} />
                  </p>

                  {/* Progress bar mini */}
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 bg-slate-200 rounded-full h-1">
                      <div
                        className={`h-1 rounded-full transition-all ${progress === 100 ? 'bg-emerald-500' : progress > 0 ? 'bg-indigo-500' : 'bg-slate-300'}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[9px] font-bold text-slate-500 shrink-0">{progress}%</span>
                    <span className={`text-[9px] font-bold shrink-0 ${score > 0.6 ? 'text-emerald-600' : score > 0.35 ? 'text-amber-600' : 'text-slate-400'}`}>
                      {Math.round(score * 100)}% match
                    </span>
                  </div>
                </div>

                <ChevronRight size={14} className={`shrink-0 mt-1 ${isActive ? 'text-indigo-500' : 'text-slate-300 group-hover:text-slate-400'}`} />
              </button>
            </li>
          );
        })}
      </ul>

      {/* Footer hint */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[9px] text-slate-400 flex items-center gap-1">
        <kbd className="px-1 bg-white border border-slate-200 rounded text-[8px]">↑↓</kbd> navigate
        <kbd className="px-1 bg-white border border-slate-200 rounded text-[8px] ml-1">↵</kbd> select
        <kbd className="px-1 bg-white border border-slate-200 rounded text-[8px] ml-1">Esc</kbd> dismiss
      </div>
    </div>
  );
}
