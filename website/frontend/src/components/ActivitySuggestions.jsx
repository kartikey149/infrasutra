import React, { useState, useEffect, useRef, useCallback } from "react";
import { Sparkles, Activity, ChevronRight, Mic, X, Wand2, Database, Zap } from "lucide-react";
import { generateSuggestions, getInstantCompletions, detectDiscipline } from "../utils/suggestionEngine";

// --- Score activity against query ---------------------------------------------
function scoreActivity(query, activity) {
  if (!query || !activity) return { score: 0, matched: [] };
  const q = query.toLowerCase().replace(/[^\w\s]/g, " ");
  const queryWords = q.split(/\s+/).filter((w) => w.length > 2);
  const activityText = [
    activity.name || activity.activity_name || "",
    activity.discipline || "",
    activity.id || activity.activity_id || "",
    activity.resources || "",
  ].join(" ").toLowerCase();
  if (!activityText.trim()) return { score: 0, matched: [] };
  const matched = [];
  let score = 0;
  for (const word of queryWords) {
    if (activityText.includes(word)) {
      matched.push(word);
      score += word.length > 5 ? 0.3 : 0.15;
    }
  }
  const DISC_KW = {
    civil: ["civil","foundation","concrete","trench","excavat","backfill","pad"],
    piping: ["pipe","piping","weld","spool","joint","coating","sleeve","manifold"],
    mechanical: ["erect","crane","lift","compressor","skid","exchanger","vessel"],
    electrical: ["electric","cable","wiring","dcs","esd","panel","cathodic"],
    testing: ["test","hydrostatic","pressure","ndt","radiograph","inspect"],
  };
  for (const [disc, keywords] of Object.entries(DISC_KW)) {
    if (keywords.some((k) => q.includes(k))) {
      if ((activity.discipline || "").toLowerCase() === disc) score += 0.25;
    }
  }
  if (/complete|finish|done|ho gaya/.test(q) && activity.progress < 100) score += 0.1;
  if (/start|chalu|shuru/.test(q) && (activity.progress || 0) === 0) score += 0.1;
  return { score: Math.min(score, 1), matched };
}

// --- Highlight matched words ---------------------------------------------------
function HighlightText({ text, matched }) {
  if (!matched || matched.length === 0) return <span>{text}</span>;
  const safe = matched.map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  const regex = new RegExp(`(${safe})`, "gi");
  return (
    <span>
      {text.split(regex).map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-amber-200 text-amber-900 rounded px-0.5 font-bold not-italic">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
}

// --- Discipline badge ----------------------------------------------------------
const DISC_COLORS = {
  Civil: "bg-orange-100 text-orange-700 border-orange-200",
  Mechanical: "bg-blue-100 text-blue-700 border-blue-200",
  Piping: "bg-purple-100 text-purple-700 border-purple-200",
  Electrical: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Instrumentation: "bg-cyan-100 text-cyan-700 border-cyan-200",
  Testing: "bg-rose-100 text-rose-700 border-rose-200",
  Commissioning: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Safety: "bg-red-100 text-red-700 border-red-200",
  General: "bg-slate-100 text-slate-600 border-slate-200",
};
function DisciplineBadge({ discipline }) {
  const cls = DISC_COLORS[discipline] || DISC_COLORS.General;
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold border uppercase tracking-wider ${cls}`}>
      {discipline || "General"}
    </span>
  );
}

// --- Section header ------------------------------------------------------------
function SectionHeader({ icon, label, count, color = "text-indigo-600" }) {
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border-b border-slate-100 text-[9px] font-bold uppercase tracking-widest ${color}`}>
      {icon}
      {label}
      <span className="ml-auto bg-white border border-current/20 rounded-full px-1.5 py-0.5 text-[8px]">{count}</span>
    </div>
  );
}

// --- Generated suggestion row --------------------------------------------------
function GeneratedRow({ item, isActive, onSelect, onHover }) {
  return (
    <button
      type="button"
      onClick={() => onSelect(item.text)}
      onMouseEnter={onHover}
      className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition border-b border-slate-50 last:border-0 group ${
        isActive ? "bg-violet-50" : "hover:bg-slate-50"
      }`}
    >
      <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-lg flex items-center justify-center ${
        isActive ? "bg-violet-100 text-violet-600" : "bg-violet-50 text-violet-400 group-hover:bg-violet-100 group-hover:text-violet-500"
      }`}>
        <Wand2 size={10} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <DisciplineBadge discipline={item.discipline} />
          {item.isInstant && (
            <span className="text-[8px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-1 rounded flex items-center gap-0.5">
              <Zap size={7} /> instant
            </span>
          )}
        </div>
        <p className="text-[11px] font-medium text-slate-800 leading-snug">{item.text}</p>
      </div>
      <ChevronRight size={13} className={`shrink-0 mt-1 ${isActive ? "text-violet-400" : "text-slate-200 group-hover:text-slate-300"}`} />
    </button>
  );
}

// --- Activity match row --------------------------------------------------------
function ActivityRow({ item, isActive, onSelect, onHover }) {
  const { act, score, matched } = item;
  const name = act.name || act.activity_name || "Unknown Activity";
  const actId = act.id || act.activity_id || "";
  const progress = act.progress ?? 0;
  return (
    <button
      type="button"
      onClick={() => onSelect(act)}
      onMouseEnter={onHover}
      className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition border-b border-slate-50 last:border-0 group ${
        isActive ? "bg-indigo-50" : "hover:bg-slate-50"
      }`}
    >
      <div className={`mt-0.5 shrink-0 w-5 h-5 rounded-lg flex items-center justify-center ${
        isActive ? "bg-indigo-100 text-indigo-600" : "bg-slate-100 text-slate-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"
      }`}>
        <Activity size={10} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="font-mono text-[9px] font-bold text-slate-400">{actId}</span>
          <DisciplineBadge discipline={act.discipline} />
          {act.critical && (
            <span className="text-[8px] font-bold text-rose-600 bg-rose-50 border border-rose-200 px-1 rounded">CRIT</span>
          )}
        </div>
        <p className="text-[11px] font-semibold text-slate-800 leading-snug">
          <HighlightText text={name} matched={matched} />
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex-1 bg-slate-200 rounded-full h-1">
            <div
              className={`h-1 rounded-full ${progress === 100 ? "bg-emerald-500" : progress > 0 ? "bg-indigo-500" : "bg-slate-300"}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[9px] font-bold text-slate-400 shrink-0">{progress}%</span>
          <span className={`text-[9px] font-bold shrink-0 ${score > 0.6 ? "text-emerald-600" : score > 0.35 ? "text-amber-600" : "text-slate-400"}`}>
            {Math.round(score * 100)}% match
          </span>
        </div>
      </div>
      <ChevronRight size={13} className={`shrink-0 mt-1 ${isActive ? "text-indigo-400" : "text-slate-200 group-hover:text-slate-300"}`} />
    </button>
  );
}

// -------------------------------------------------------------------------------
// Main Component
// -------------------------------------------------------------------------------
export default function ActivitySuggestions({
  query = "",
  activities = [],
  onSelect,         // callback(text|activity) � text for generated, activity object for matched
  onDismiss,
  variant = "dropdown",  // 'dropdown' | 'popup'
  isVoice = false,
}) {
  const [generatedItems, setGeneratedItems] = useState([]);
  const [matchedItems, setMatchedItems] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const containerRef = useRef(null);

  // Recompute both lists whenever query changes
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setGeneratedItems([]);
      setMatchedItems([]);
      setActiveIdx(-1);
      return;
    }

    // 1. Instant completions (character-level fast)
    const instant = getInstantCompletions(query);

    // 2. Generative AI suggestions from domain templates
    const disc = detectDiscipline(query);
    const generated = generateSuggestions(query, {}, 5);

    // Merge instant + generated, deduplicate
    const seenTexts = new Set();
    const allGenerated = [];
    for (const item of [...instant, ...generated]) {
      const key = item.text.slice(0, 35).toLowerCase();
      if (!seenTexts.has(key)) {
        seenTexts.add(key);
        allGenerated.push(item);
      }
      if (allGenerated.length >= 5) break;
    }
    setGeneratedItems(allGenerated);

    // 3. Activity matches from project schedule
    if (activities.length > 0) {
      const scored = activities
        .map((act) => ({ act, ...scoreActivity(query, act) }))
        .filter((s) => s.score > 0.1)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
      setMatchedItems(scored);
    } else {
      setMatchedItems([]);
    }

    setActiveIdx(-1);
  }, [query, activities]);

  // Flat list for keyboard nav: generated first, then matched
  const totalCount = generatedItems.length + matchedItems.length;

  // Keyboard navigation
  const handleKeyDown = useCallback(
    (e) => {
      if (!totalCount) return;
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, totalCount - 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, 0)); }
      if (e.key === "Enter" && activeIdx >= 0) {
        e.preventDefault();
        if (activeIdx < generatedItems.length) {
          onSelect?.(generatedItems[activeIdx].text);
        } else {
          onSelect?.(matchedItems[activeIdx - generatedItems.length].act);
        }
      }
      if (e.key === "Escape") onDismiss?.();
    },
    [totalCount, activeIdx, generatedItems, matchedItems, onSelect, onDismiss]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  // Click outside ? dismiss
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        // Do not dismiss if user clicks inside the Telegram bot widget
        if (e.target?.closest && e.target.closest('[data-telegram-widget="true"]')) {
          return;
        }
        onDismiss?.();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onDismiss]);

  if (!generatedItems.length && !matchedItems.length) return null;

  const isPopup  = variant === "popup";
  const isInline = variant === "inline";
  const isLeftPanel = variant === "leftPanel";

  // leftPanel = dedicated flyout panel on the left of Telegram voice widget
  // Inline    = inside widget flow
  // Popup     = absolute above input (FieldUpdatePage dropdown)
  // dropdown  = default below textarea

  const wrapperClass = isLeftPanel
    ? "w-full h-full bg-white flex flex-col"
    : isInline
    ? "w-full bg-white"              // parent wraps with border/scroll
    : isPopup
    ? "z-50 w-full bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-fadeIn absolute bottom-full mb-2 left-0 right-0"
    : "z-50 w-full bg-white border border-slate-200 shadow-2xl rounded-2xl overflow-hidden animate-fadeIn mt-2";

  const listMaxH = (isInline || isLeftPanel) ? "none" : isPopup ? "270px" : "350px";

  return (
    <div ref={containerRef} className={wrapperClass}>
      {/* ── Header bar ── */}
      <div className={`flex items-center justify-between px-3 py-2.5 border-b border-slate-100 shrink-0 ${
        isVoice
          ? "bg-gradient-to-r from-rose-50 via-orange-50 to-amber-50"
          : "bg-gradient-to-r from-violet-50 via-indigo-50 to-blue-50"
      }`}>
        <div className="flex items-center gap-2 text-[10px] font-bold">
          {isVoice ? (
            <span className="flex items-center gap-1 text-rose-600">
              <Mic size={10} className="animate-pulse" /> Voice matched
            </span>
          ) : (
            <span className="flex items-center gap-1 text-violet-600">
              <Sparkles size={10} className="text-amber-500" /> AI suggestions
            </span>
          )}
          <span className="text-slate-300">|</span>
          <span className="text-slate-500">{generatedItems.length} generated</span>
          {matchedItems.length > 0 && (
            <>
              <span className="text-slate-300">|</span>
              <span className="text-slate-500">{matchedItems.length} from schedule</span>
            </>
          )}
        </div>
        <button type="button" onClick={onDismiss} className="p-0.5 rounded hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition">
          <X size={12} />
        </button>
      </div>

      {/* ── Voice recording live indicator ── */}
      {isVoice && (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border-b border-rose-200 shrink-0">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shrink-0 ring-2 ring-rose-300" />
          <span className="text-[10px] text-rose-800 font-semibold truncate">
            🎙️ Voice recognized: <span className="font-bold underline">"{query}"</span> — tap suggestion to auto-fill:
          </span>
        </div>
      )}

      <div className={`overflow-y-auto ${isLeftPanel ? "flex-1 min-h-0" : ""}`} style={{ maxHeight: listMaxH }}>
        {/* ── Section 1: AI Generated ── */}
        {generatedItems.length > 0 && (
          <>
            <SectionHeader icon={<Wand2 size={9} />} label="AI Generated" count={generatedItems.length} color="text-violet-600" />
            {generatedItems.map((item, idx) => (
              <GeneratedRow
                key={idx}
                item={item}
                isActive={activeIdx === idx}
                onSelect={(text) => { onSelect?.(text); onDismiss?.(); }}
                onHover={() => setActiveIdx(idx)}
              />
            ))}
          </>
        )}

        {/* ── Section 2: Schedule Matches ── */}
        {matchedItems.length > 0 && (
          <>
            <SectionHeader icon={<Database size={9} />} label="From Schedule" count={matchedItems.length} color="text-indigo-600" />
            {matchedItems.map((item, idx) => {
              const globalIdx = generatedItems.length + idx;
              return (
                <ActivityRow
                  key={idx}
                  item={item}
                  isActive={activeIdx === globalIdx}
                  onSelect={(act) => { onSelect?.(act); onDismiss?.(); }}
                  onHover={() => setActiveIdx(globalIdx)}
                />
              );
            })}
          </>
        )}
      </div>

      {/* ── Footer hint ── */}
      <div className="px-3 py-1.5 bg-slate-50 border-t border-slate-100 text-[9px] text-slate-400 flex items-center gap-1 shrink-0">
        <kbd className="px-1 bg-white border border-slate-200 rounded text-[8px]">up/down</kbd> navigate
        <kbd className="px-1 bg-white border border-slate-200 rounded text-[8px] ml-1">Enter</kbd> select
        <kbd className="px-1 bg-white border border-slate-200 rounded text-[8px] ml-1">Esc</kbd> close
        <span className="ml-auto flex items-center gap-0.5 text-violet-500 font-bold">
          <Wand2 size={8} /> AI-powered
        </span>
      </div>
    </div>
  );
}
