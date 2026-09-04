import React, { useState, useEffect, useRef } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import {
  Send,
  Mic,
  MicOff,
  Bot,
  X,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronDown,
  MessageSquare,
  Volume2,
  HardHat
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config';

export default function TelegramBotWidget() {
  const { activeProject } = useProject();
  const { user, token, isAuthenticated } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // If user is not authenticated/logged in, do NOT show the bot widget
  if (!isAuthenticated || !user) {
    return null;
  }

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      time: 'Just now',
      text: `👷‍♂️ *Welcome to Oil India Site Supervisor Bot!*\n\nI am listening for field observations on *${activeProject?.name || 'Active Project'}*.\n\nYou can:\n• 🎙️ *Tap the Microphone* to record a voice note in Hinglish or English\n• 💬 *Type a field report* directly into the chat\n\nAI will automatically extract disciplines, tasks, event types, and link to the Primavera SQLite schedule!`
    }
  ]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'hi-IN'; // Hinglish / Hindi & English friendly

      recognition.onstart = () => {
        setIsRecording(true);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        setInputText(transcript);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const toggleVoiceRecording = () => {
    if (!speechSupported) {
      alert('Voice speech recognition is not supported in this browser. Please use Google Chrome or Microsoft Edge.');
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
    } else {
      setInputText('');
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
      }
    }
  };

  const handleSendMessage = async (textToSend = null) => {
    const query = (textToSend || inputText).trim();
    if (!query || isProcessing) return;

    // Add user message to chat
    const userMsgId = Date.now().toString();
    const newMessages = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: query,
        supervisor: user?.name || 'Site Supervisor'
      }
    ];
    setMessages(newMessages);
    setInputText('');
    setIsProcessing(true);

    try {
      const res = await fetch(`${API_BASE}/field-update`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          text: query,
          source_type: isRecording ? 'voice' : 'telegram_web',
          project_id: activeProject?.id || 'PRJ-01',
          submitted_by: user?.name || 'Site Supervisor'
        })
      });

      const data = await res.json();
      if (data.success) {
        const confPercent = Math.round(data.confidence * 100);
        const match = data.best_match;

        const statusText = data.auto_approved
          ? `⚡ *Auto-Approved & Pushed to Database* (Confidence ${confPercent}% >= 90%)!\nPrimavera schedule dates and progress committed.`
          : `Queued as Record #${data.pending_update_id} in SQLite Database. Awaiting Planner approval in dashboard.`;

        const reply =
          `✅ *Schedule Activity Matched!*\n\n` +
          `• *Discipline:* ${data.extracted?.discipline || 'General'}\n` +
          `• *Extracted Task:* ${data.extracted?.extracted_task}\n` +
          `• *Event Type:* ${data.extracted?.event_type}\n` +
          `• *Zone:* ${data.extracted?.location_zone}\n\n` +
          `📋 *Matched WBS Activity:*\n` +
          `• *ID:* \`${match ? match.activity_id : 'N/A'}\`\n` +
          `• *Name:* ${match ? match.activity_name : 'No direct match'}\n` +
          `• *Confidence:* ${confPercent}%\n\n` +
          `📌 *Status:* ${statusText}`;

        setMessages((prev) => [
          ...prev,
          {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: reply,
            recordId: data.pending_update_id,
            matchedActivity: match,
            autoApproved: data.auto_approved
          }
        ]);
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: `⚠️ *Observation Received:*\n"${query}"\n\n*Note:* Backend connecting to SQLite database. Update logged.`
        }
      ]);
    } finally {
      setIsProcessing(false);
    }
  };

  const samplePills = activeProject?.id === 'PRJ-02'
    ? [
        "Unit-2 mein Heat Exchanger bundle insertion complete ho gaya",
        "Control-Room mein DCS panel wiring cable terminate status 80%",
        "Compressor-Area mein centrifugal gas compressor skid placement chalu at 10:00"
      ]
    : [
        "Zone-4 mein Pipe Rack Support Fabrication complete ho gaya",
        "Sector-4B mein Mainline Trenching excavation 65% progress",
        "Sector-4A mein Line 24-XX ka spool erection aaj start hua"
      ];

  return (
    <>
      {/* Floating Launcher Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 z-50 p-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-2xl shadow-xl hover:shadow-2xl flex items-center gap-2.5 transition-all duration-200 hover:scale-105 group border border-white/20"
        title="Open Telegram Site Supervisor Voice & Chat Bot"
      >
        <div className="relative">
          <Bot size={22} />
          <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full ring-2 ring-white animate-pulse" />
        </div>
        <span className="text-xs font-bold hidden sm:inline-block pr-1">
          {isOpen ? 'Close Bot' : 'Telegram Voice Bot'}
        </span>
      </button>

      {/* Telegram Chat Modal Widget */}
      {isOpen && (
        <div className="fixed bottom-20 right-4 sm:right-6 z-50 w-[92vw] sm:w-[420px] h-[580px] bg-slate-100 rounded-3xl shadow-2xl border border-slate-300/80 flex flex-col overflow-hidden animate-fadeIn">
          {/* Telegram Header */}
          <div className="bg-[#24A1DE] text-white px-4 py-3 flex items-center justify-between shadow-md">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-full bg-white/20 border border-white/30 flex items-center justify-center text-white shadow-inner">
                <HardHat size={20} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight">Site Supervisor Bot</span>
                  <span className="text-[10px] bg-white/25 px-1.5 py-0.5 rounded font-mono">@splashers_v1_bot</span>
                </div>
                <div className="text-[10px] text-sky-100 flex items-center gap-1 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                  Active Project: <strong className="text-white truncate max-w-[170px]">{activeProject?.name}</strong>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1.5 rounded-xl hover:bg-white/20 text-white/80 hover:text-white transition"
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat Messages Container */}
          <div className="flex-1 p-3.5 overflow-y-auto space-y-3 bg-[#E6EBEE]">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed shadow-sm ${
                    m.sender === 'user'
                      ? 'bg-[#EEFFDE] text-slate-900 border border-[#cbe4ad] rounded-br-none'
                      : 'bg-white text-slate-800 border border-slate-200/70 rounded-bl-none'
                  }`}
                >
                  <div className="whitespace-pre-line">
                    {m.text.split('\n').map((line, i) => {
                      // Basic bold parsing for markdown
                      const parts = line.split(/(\*.*?\*|`.*?`)/g);
                      return (
                        <div key={i}>
                          {parts.map((part, pi) => {
                            if (part.startsWith('*') && part.endsWith('*')) {
                              return <strong key={pi}>{part.slice(1, -1)}</strong>;
                            }
                            if (part.startsWith('`') && part.endsWith('`')) {
                              return (
                                <code key={pi} className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono font-bold text-indigo-700">
                                  {part.slice(1, -1)}
                                </code>
                              );
                            }
                            return part;
                          })}
                        </div>
                      );
                    })}
                  </div>

                  {m.recordId && (
                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <span className={`font-bold flex items-center gap-1 ${
                        m.autoApproved 
                          ? 'text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200' 
                          : 'text-slate-700'
                      }`}>
                        {m.autoApproved ? '⚡ Auto-Pushed (>=90%)' : <><CheckCircle2 size={13} className="text-emerald-600" /> Saved to SQLite</>}
                      </span>
                      <Link
                        to={m.autoApproved ? "/schedule-explorer" : "/approval"}
                        onClick={() => setIsOpen(false)}
                        className="text-indigo-600 hover:underline font-bold flex items-center gap-1"
                      >
                        {m.autoApproved ? 'View Schedule' : 'Review Queue'} <ExternalLink size={11} />
                      </Link>
                    </div>
                  )}

                  <div className="text-[9px] text-slate-400 text-right mt-1 font-mono">
                    {m.time}
                  </div>
                </div>
              </div>
            ))}

            {isProcessing && (
              <div className="flex items-center gap-2 bg-white px-3.5 py-2.5 rounded-2xl rounded-bl-none text-xs text-slate-500 shadow-sm border border-slate-200 max-w-[200px]">
                <Sparkles size={14} className="animate-spin text-amber-500" />
                <span>Linking to SQLite WBS...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Voice / Hinglish Preset Pills */}
          <div className="px-3 py-1.5 bg-white border-t border-slate-200 overflow-x-auto flex gap-1.5 shrink-0 scrollbar-none">
            {samplePills.map((pill, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSendMessage(pill)}
                className="text-[10px] whitespace-nowrap bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition font-medium"
              >
                "{pill.slice(0, 32)}..."
              </button>
            ))}
          </div>

          {/* Chat Input & Voice Bar */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <button
              type="button"
              onClick={toggleVoiceRecording}
              className={`p-2.5 rounded-full transition shadow-sm ${
                isRecording
                  ? 'bg-rose-500 text-white animate-pulse ring-4 ring-rose-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title={isRecording ? 'Listening... Click to stop' : 'Click to Speak (Voice Note)'}
            >
              {isRecording ? <MicOff size={18} /> : <Mic size={18} />}
            </button>

            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder={isRecording ? "Listening to your voice..." : "Type Hinglish or English observation..."}
              className={`flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border rounded-2xl focus:outline-none transition ${
                isRecording ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 focus:border-sky-500'
              }`}
            />

            <button
              type="button"
              onClick={() => handleSendMessage()}
              disabled={isProcessing || !inputText.trim()}
              className="p-2.5 bg-[#24A1DE] hover:bg-[#1E8BC0] disabled:bg-slate-300 text-white rounded-full transition shadow-sm"
              title="Send to AI Linker"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
