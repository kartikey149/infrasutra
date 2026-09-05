import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles,
  Bot,
  User,
  Send,
  X,
  ChevronDown,
  AlertTriangle,
  Clock,
  TrendingDown,
  ShieldAlert,
  Zap,
  RefreshCw,
  Layers,
  ArrowRight,
  CheckCircle2,
  Maximize2,
  Minimize2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { EXPRESS_API_BASE, API_BASE } from '../config';

export default function ChatBot() {
  const { t } = useTranslation();
  const { activeProject } = useProject();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      role: 'assistant',
      time: 'Just now',
      content: `👋 **Hello! I am your Predictive Project Management AI.**\n\nI monitor **${activeProject?.name || 'Active Project'}** to evaluate schedules, forecast activity bottlenecks, and calculate critical path delays before they impact your milestone deadlines.\n\nAsk me anything about schedule variance, weather risks, or resource constraints, or click one of the quick prompts below.`
    }
  ]);

  // Auto scroll to bottom
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen, loading]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  const quickSuggestionChips = [
    { label: '🔍 Analyze Delay Risks', text: '🔍 Analyze Delay Risks: What activities are facing projected schedule slippage?' },
    { label: '⚠️ Show Blocker Tasks', text: '⚠️ Show Blocker Tasks: Which critical path dependencies and resources are blocked?' },
    { label: '💡 Mitigation Plan', text: '💡 Mitigation Plan: Recommend 1-2 practical engineering mitigations to recover schedule float.' }
  ];

  const handleSendMessage = async (textToSend = null) => {
    const query = (textToSend || inputText).trim();
    if (!query || loading) return;

    const userMsg = {
      id: `user-${Date.now()}`,
      role: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      content: query
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Check if active project is formed or assigned
    const currentProjId = activeProject?.id || null;
    if (!currentProjId || currentProjId === 'unassigned' || currentProjId === 'none') {
      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          role: 'assistant',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          content: '⚠️ No project is assigned yet. Please select or create an active project to view schedule analytics and field progress.'
        }
      ]);
      return;
    }

    setLoading(true);

    try {
      // Call Express predictive chat backend (port 5000 /api/chat)
      let res;
      try {
        res = await fetch(`${EXPRESS_API_BASE}/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: query, projectId: currentProjId })
        });
      } catch (networkErr) {
        res = await fetch(`${EXPRESS_API_BASE}/ai/predictive-chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message: query, projectId: currentProjId })
        });
      }

      if (!res || !res.ok) {
        throw new Error(`Server responded with status ${res?.status || 'network error'}`);
      }

      const data = await res.json();

      if (data.success && data.reply) {
        let cleanReply = data.reply;
        // If reply contains Devanagari script, translate to English via /api/to-english
        if (/[\u0900-\u097F]/.test(cleanReply)) {
          try {
            const transRes = await fetch(`${EXPRESS_API_BASE}/to-english`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ text: cleanReply })
            });
            const transData = await transRes.json();
            if (transData.success && transData.english) {
              cleanReply = transData.english;
            }
          } catch (e) {
            console.warn('Reply translation fallback:', e);
          }
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: cleanReply,
            source: data.source || 'gemini-2.5-flash'
          }
        ]);
      } else {
        throw new Error(data.error || 'Failed to generate predictive analysis');
      }
    } catch (err) {
      console.warn('[Predictive Chat Error]:', err);
      if (!activeProject || !activeProject.id) {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: '⚠️ No project is assigned yet. Please select or create an active project to view schedule analytics and field progress.'
          }
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: `ai-${Date.now()}`,
            role: 'assistant',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            content: `### 📊 Schedule Risk Assessment: ${activeProject?.name || 'Active Project'}\n\n` +
              `* **Schedule Performance Index (SPI):** \`${activeProject?.spi || '0.92'}\`\n` +
              `* 🚨 **Critical Path Status:** Monitoring active field progress and resource allocations.\n` +
              `* 💡 **Recommendation:** Review pending field updates and milestone logs for schedule alignment.`
          }
        ]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Basic Markdown Renderer for formatting headings, bold, code, bullets, and risk tags
  const renderFormattedText = (text) => {
    return text.split('\n').map((line, idx) => {
      // Headings
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className="text-xs font-black text-slate-900 mt-2 mb-1 uppercase tracking-wider flex items-center gap-1.5">
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('#### ')) {
        return (
          <h5 key={idx} className="text-[11px] font-bold text-slate-800 mt-1.5 mb-0.5">
            {line.replace('#### ', '')}
          </h5>
        );
      }
      // List items
      const isBullet = line.startsWith('- ') || line.startsWith('* ');
      const content = isBullet ? line.slice(2) : line;

      // Highlight tags and markdown chunks
      const parts = content.split(/(\*\*.*?\*\*|`.*?`|🚨|⚠️|💡|✅)/g);

      return (
        <div key={idx} className={`${isBullet ? 'pl-2.5 relative flex items-start gap-1 my-0.5' : 'my-0.5'}`}>
          {isBullet && <span className="text-amber-500 font-bold shrink-0">&bull;</span>}
          <span className="flex-1 leading-relaxed">
            {parts.map((part, pIdx) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return (
                  <strong key={pIdx} className="font-bold text-slate-900">
                    {part.slice(2, -2)}
                  </strong>
                );
              }
              if (part.startsWith('`') && part.endsWith('`')) {
                return (
                  <code key={pIdx} className="bg-amber-100/70 text-amber-900 px-1 py-0.5 rounded text-[10px] font-mono font-bold">
                    {part.slice(1, -1)}
                  </code>
                );
              }
              if (part === '🚨') {
                return <span key={pIdx} className="text-rose-600 font-bold mr-1">🚨 CRITICAL:</span>;
              }
              if (part === '⚠️') {
                return <span key={pIdx} className="text-amber-600 font-bold mr-1">⚠️ HIGH RISK:</span>;
              }
              if (part === '💡') {
                return <span key={pIdx} className="text-sky-600 font-bold mr-1">💡 MITIGATION:</span>;
              }
              if (part === '✅') {
                return <span key={pIdx} className="text-emerald-600 font-bold mr-1">✅ STATUS:</span>;
              }
              return part;
            })}
          </span>
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Action Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 p-3.5 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 flex items-center gap-2.5 border group ${
          isOpen
            ? 'bg-slate-900 text-white border-slate-700 rotate-0'
            : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-600 hover:to-orange-600 text-white border-white/20 hover:scale-105 shadow-amber-500/25'
        }`}
        title={t('chatbot.openAI')}
      >
        <div className="relative">
          <Sparkles className="w-5 h-5 text-amber-100 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white animate-pulse" />
        </div>
        <div className="text-left hidden sm:block pr-1">
          <div className="text-xs font-bold leading-tight">
            {isOpen ? t('chatbot.closeAI') : t('chatbot.predictiveAI')}
          </div>
          <div className="text-[9px] text-amber-100/90 font-medium">{t('chatbot.powered')}</div>
        </div>
      </button>

      {/* Floating Chat Modal */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-white rounded-3xl shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden transition-all duration-300 ${
            isExpanded
              ? 'bottom-4 right-4 sm:right-6 w-[95vw] sm:w-[680px] h-[85vh]'
              : 'bottom-20 right-4 sm:right-6 w-[92vw] sm:w-[440px] h-[590px]'
          }`}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white p-4 flex items-center justify-between border-b border-slate-700/80 shadow-sm shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold text-white tracking-tight">
                    {t('chatbot.title')}
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    {t('chatbot.geminiActive')}
                  </span>
                </div>
                <div className="text-[10px] text-slate-300 truncate max-w-[220px] sm:max-w-[280px]">
                  {t('chatbot.project')}: <strong className="text-amber-200 font-semibold">{activeProject?.name || 'No Project Assigned'}</strong>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 text-slate-400">
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1.5 hover:bg-slate-800 hover:text-white rounded-xl transition"
                title={isExpanded ? 'Collapse size' : 'Expand window'}
              >
                {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-slate-800 hover:text-white rounded-xl transition"
                title="Close chatbot"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Schedule Status Micro-Bar */}
          <div className="bg-slate-100/90 border-b border-slate-200 px-3.5 py-1.5 flex items-center justify-between text-[11px] text-slate-600 shrink-0">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${activeProject?.id ? 'bg-emerald-500 animate-ping' : 'bg-amber-500'}`} />
              <span className="font-semibold text-slate-700">{t('chatbot.scheduleInjected')}:</span>
              <span className="font-mono text-slate-800">{activeProject?.id || 'Unassigned'}</span>
            </div>
            <div className="flex items-center gap-3 font-medium">
              <span>{t('chatbot.spi')}: <strong className={activeProject?.id ? 'text-amber-700 font-mono' : 'text-slate-400 font-mono'}>{activeProject?.id ? (activeProject.spi || '0.88') : 'N/A'}</strong></span>
              <span>{t('chatbot.variance')}: <strong className={activeProject?.id ? 'text-rose-600 font-mono' : 'text-slate-400 font-mono'}>{activeProject?.id ? (activeProject.varianceDays ? `${activeProject.varianceDays}d` : '-4d') : '0d'}</strong></span>
            </div>
          </div>

          {/* Chat Messages Container */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/70">
            {messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  {!isUser && (
                    <div className="w-7 h-7 rounded-xl bg-amber-500 text-slate-950 font-bold flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <Sparkles className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs shadow-sm ${
                      isUser
                        ? 'bg-slate-900 text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-none'
                    }`}
                  >
                    <div className="space-y-1">{renderFormattedText(m.content)}</div>
                    <div
                      className={`text-[9px] mt-2 font-mono text-right ${
                        isUser ? 'text-slate-400' : 'text-slate-400'
                      }`}
                    >
                      {m.time} {m.source && `• ${m.source}`}
                    </div>
                  </div>

                  {isUser && (
                    <div className="w-7 h-7 rounded-xl bg-slate-800 text-white flex items-center justify-center shrink-0 mt-0.5 shadow-sm">
                      <User className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center gap-2.5 bg-white border border-slate-200 px-4 py-3 rounded-2xl rounded-bl-none text-xs text-slate-600 max-w-[280px] shadow-sm">
                <RefreshCw className="w-4 h-4 text-amber-500 animate-spin shrink-0" />
                <div className="flex items-center gap-1.5 font-medium">
                  <span>{t('chatbot.analyzing')}</span>
                  <span className="flex gap-1 items-center ml-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips (Instant Demo Clicks) */}
          <div className="p-2.5 bg-white border-t border-slate-200/80 overflow-x-auto flex gap-1.5 shrink-0 scrollbar-none">
            <button
              type="button"
              onClick={() => handleSendMessage(t('chatbot.analyzeRisks') + ': What activities are facing projected schedule slippage?')}
              disabled={loading}
              className="whitespace-nowrap px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 transition active:scale-95 disabled:opacity-50 shadow-sm flex items-center gap-1 cursor-pointer"
            >
              {t('chatbot.analyzeRisks')}
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage(t('chatbot.showBlockers') + ': Which critical path dependencies and resources are blocked?')}
              disabled={loading}
              className="whitespace-nowrap px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 transition active:scale-95 disabled:opacity-50 shadow-sm flex items-center gap-1 cursor-pointer"
            >
              {t('chatbot.showBlockers')}
            </button>
            <button
              type="button"
              onClick={() => handleSendMessage(t('chatbot.mitigationPlan') + ': Recommend engineering mitigations to recover float.')}
              disabled={loading}
              className="whitespace-nowrap px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 transition active:scale-95 disabled:opacity-50 shadow-sm flex items-center gap-1 cursor-pointer"
            >
              {t('chatbot.mitigationPlan')}
            </button>
          </div>

          {/* Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={t('chatbot.placeholder')}
              disabled={loading}
              className="flex-1 px-4 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-amber-500 focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={loading || !inputText.trim()}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white rounded-xl transition flex items-center justify-center font-bold text-xs shadow-sm active:scale-95"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </form>
        </div>
      )}
    </>
  );
}
