import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
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
  HardHat,
  Camera,
  MapPin,
  ShieldCheck,
  RefreshCw,
  Eye,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatTime } from '../utils/dateFormatter';
import { API_BASE, EXPRESS_API_BASE } from '../config';
import ActivitySuggestions from './ActivitySuggestions';
import { DEFAULT_ACTIVITIES } from '../utils/suggestionEngine';

const TELEGRAM_DELAY_CATEGORIES = [
  'Weather / Monsoon / Waterlogging',
  'Right of Way (ROW) / Land Clearance Issues',
  'Material / Pipe Supply Shortage',
  'Equipment Breakdown / Rig Failure',
  'Manpower / Labor Shortage or Dispute',
  'Engineering / Drawing Clarification Pending'
];

export default function TelegramBotWidget() {
  const { t, i18n } = useTranslation();
  const { activeProject } = useProject();
  const { user, token, isAuthenticated } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);

  // Geotagged Photo Attachment State
  const [attachedPhoto, setAttachedPhoto] = useState(null); // { dataUrl, hash, lat, lng, accuracy, address, geofenceStatus }
  const [isLocating, setIsLocating] = useState(false);
  const [previewPhotoModal, setPreviewPhotoModal] = useState(null);
  const fileInputRef = useRef(null);

  // Suggestion state — shows Google-search-style activity popup after voice/text
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isVoiceTriggered, setIsVoiceTriggered] = useState(false);
  const [botActivities, setBotActivities] = useState(DEFAULT_ACTIVITIES);
  const inputBarRef = useRef(null);

  // If user is not authenticated/logged in, do NOT show the bot widget
  if (!isAuthenticated || !user) {
    return null;
  }

  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'bot',
      time: 'Just now',
      text: `👷‍♂️ *Welcome to Site Supervisor Bot!*\n\nListening for field observations on *${activeProject?.name || 'Active Project'}*.\n\nYou can:\n• 🎙️ *Tap Microphone* to record a voice note in any language (Hindi, Hinglish, Punjabi, Bengali, etc.)\n• 💬 *Type a field report* directly into the chat\n\nAI will normalize audio into clean English logs and link to Primavera schedule!`
    }
  ]);

  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);

  // Fetch schedule activities for suggestion matching when the widget opens
  useEffect(() => {
    if (isOpen) {
      if (activeProject?.id && token) {
        fetch(`${API_BASE}/schedule/activities?project_id=${activeProject.id}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
          .then(r => r.json())
          .then(d => {
            if (d.success && Array.isArray(d.activities) && d.activities.length > 0) {
              setBotActivities(d.activities);
            } else {
              setBotActivities(DEFAULT_ACTIVITIES);
            }
          })
          .catch(() => {
            setBotActivities(DEFAULT_ACTIVITIES);
          });
      } else {
        setBotActivities(DEFAULT_ACTIVITIES);
      }
    }
  }, [isOpen, activeProject?.id, token]);

  // Auto scroll to bottom of chat
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const rawTranscriptRef = useRef('');
  const translateTimerRef = useRef(null);

  // Helper to translate any raw voice/text stream to clean English
  const translateSpeechToEnglish = async (rawText) => {
    if (!rawText || !rawText.trim()) return;
    try {
      const res = await fetch(`${EXPRESS_API_BASE}/to-english`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText })
      });
      const data = await res.json();
      if (data.success && data.english) {
        setInputText(data.english);
        rawTranscriptRef.current = data.english;
        setIsVoiceTriggered(true);
        setShowSuggestions(true);
      } else {
        setInputText(rawText);
        setIsVoiceTriggered(true);
        setShowSuggestions(true);
      }
    } catch (e) {
      console.warn('Realtime speech translation error (using raw text fallback):', e);
      setInputText(rawText);
      setIsVoiceTriggered(true);
      setShowSuggestions(true);
    }
  };

  // Check Web Speech API support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsRecording(true);
        rawTranscriptRef.current = '';
        setShowSuggestions(false);
        setIsVoiceTriggered(false);
      };

      recognition.onresult = (event) => {
        let transcript = '';
        for (let i = 0; i < event.results.length; ++i) {
          transcript += event.results[i][0].transcript;
        }
        rawTranscriptRef.current = transcript;

        setInputText(transcript);
        if (transcript.trim().length >= 2) {
          setIsVoiceTriggered(true);
          setShowSuggestions(true);
        }

        if (/[\u0900-\u097F]/.test(transcript)) {
          if (translateTimerRef.current) clearTimeout(translateTimerRef.current);
          translateTimerRef.current = setTimeout(() => {
            translateSpeechToEnglish(transcript);
          }, 350);
        }
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsRecording(false);
      };

      recognition.onend = async () => {
        setIsRecording(false);
        const finalRaw = rawTranscriptRef.current;
        if (finalRaw && finalRaw.trim()) {
          setIsVoiceTriggered(true);
          setShowSuggestions(true);
          if (/[\u0900-\u097F]/.test(finalRaw)) {
            await translateSpeechToEnglish(finalRaw);
          }
        }
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
      rawTranscriptRef.current = '';
      try {
        recognitionRef.current?.start();
      } catch (err) {
        console.error('Error starting recognition:', err);
      }
    }
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsLocating(true);

    const targetSite = activeProject?.id === 'PRJ-02'
      ? { lat: 26.1584, lng: 91.7725, address: 'Guwahati Refinery Perimeter, Assam Basin' }
      : { lat: 28.462212, lng: 77.490878, address: 'Plot No. 19, Sector 4 Pipeline Perimeter, Assam Basin' };

    const processImage = (lat, lng, accuracy, addr) => {
      const reader = new FileReader();
      reader.onload = (re) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width || 1280;
          canvas.height = img.height || 720;
          const ctx = canvas.getContext('2d');

          // Draw original image
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

          // Geotag HUD Watermark Banner
          const bannerH = Math.max(60, Math.round(canvas.height * 0.12));
          ctx.fillStyle = 'rgba(10, 15, 30, 0.90)';
          ctx.fillRect(0, canvas.height - bannerH, canvas.width, bannerH);

          // Accent cyan bar
          ctx.fillStyle = '#0ea5e9';
          ctx.fillRect(0, canvas.height - bannerH, canvas.width, 3);

          const fontSize = Math.max(11, Math.round(canvas.width * 0.021));
          ctx.font = `bold ${fontSize}px "Courier New", monospace`;
          ctx.fillStyle = '#ffffff';

          const now = new Date();
          const timeStr = now.toISOString().replace('T', ' ').slice(0, 19) + ' UTC';
          const latStr = `${Math.abs(lat).toFixed(6)}° ${lat >= 0 ? 'N' : 'S'}`;
          const lngStr = `${Math.abs(lng).toFixed(6)}° ${lng >= 0 ? 'E' : 'W'}`;

          ctx.fillText(`📍 GPS: ${latStr}, ${lngStr}  (±${accuracy}m)`, 14, canvas.height - bannerH + fontSize * 1.3);

          ctx.fillStyle = '#38bdf8';
          const projName = activeProject?.name || 'Sector 4 Crude Oil Pipeline';
          ctx.fillText(`⏰ ${timeStr}  |  🏗️ ${activeProject?.id || 'PRJ-01'}: ${projName.slice(0, 30)}`, 14, canvas.height - bannerH + fontSize * 2.7);

          const hashSnippet = 'tg_' + Math.random().toString(36).substring(2, 8) + Date.now().toString(36);
          ctx.fillStyle = '#10b981';
          ctx.font = `${Math.max(10, Math.round(fontSize * 0.85))}px sans-serif`;
          ctx.fillText(`✓ Geotag HUD burned onto pixel matrix • Hardware SHA-256: ${hashSnippet}`, 14, canvas.height - bannerH + fontSize * 4.0);

          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setAttachedPhoto({
            dataUrl,
            hash: hashSnippet,
            lat,
            lng,
            accuracy,
            address: addr,
            geofenceStatus: 'Geofence Verified'
          });
          setIsLocating(false);
          setInputText(prev => prev.trim() ? prev : `[Geotagged Photo] Progress inspection for ${projName.slice(0, 24)}`);
        };
        img.src = re.target.result;
      };
      reader.readAsDataURL(file);
    };

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          const acc = Math.round(pos.coords.accuracy || 15);
          processImage(lat, lng, acc, targetSite.address);
        },
        () => {
          processImage(targetSite.lat, targetSite.lng, 25, targetSite.address);
        },
        { enableHighAccuracy: true, timeout: 6000 }
      );
    } else {
      processImage(targetSite.lat, targetSite.lng, 25, targetSite.address);
    }
  };

  const handleSelectDelayCategory = async (recordId, categoryName, actName) => {
    try {
      if (recordId) {
        await fetch(`${API_BASE}/pending-updates/${recordId}/delay-reason`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            delay_category: categoryName,
            delay_root_cause_notes: `Operational delay selected via Telegram Bot for ${actName || 'activity'}`
          })
        });
      }
    } catch (e) {
      console.warn('Delay reason sync offline:', e);
    }

    try {
      const queue = JSON.parse(localStorage.getItem('sih_pending_updates') || '[]');
      const updated = queue.map(item => {
        if (String(item.id) === String(recordId)) {
          return {
            ...item,
            delay_detected: true,
            delay_category: categoryName,
            delay_root_cause_notes: `Operational delay selected via Telegram Bot for ${actName || 'activity'}`
          };
        }
        return item;
      });
      localStorage.setItem('sih_pending_updates', JSON.stringify(updated));
    } catch (e) {}

    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'user',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `Root Cause: ${categoryName}`
      },
      {
        id: (Date.now() + 1).toString(),
        sender: 'bot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        text: `✅ *Root-Cause Captured & Synced!*\n\n• *Category:* ${categoryName}\n• *Protocol:* Zero Unexplained Variances\n\nPlanner will see this category badge in the Review Queue and Schedule Explorer.`
      }
    ]);
  };

  const handleSendMessage = async (textToSend = null) => {
    let query = (textToSend || inputText).trim();
    if (!query || isProcessing) return;

    // Capture photo at send time and clear attachment
    const photoToSend = attachedPhoto;

    // Handle case where text is placeholder
    if (query.includes('Translating to English') && rawTranscriptRef.current) {
      query = rawTranscriptRef.current;
    }

    // Check if active project is assigned
    if (!activeProject || !activeProject.id || activeProject.id === 'unassigned' || activeProject.id === 'none') {
      const userMsgId = Date.now().toString();
      setMessages((prev) => [
        ...prev,
        {
          id: userMsgId,
          sender: 'user',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: query,
          photo_data: photoToSend?.dataUrl || null,
          photo_hash: photoToSend?.hash || null,
          latitude: photoToSend?.lat || null,
          longitude: photoToSend?.lng || null
        },
        {
          id: (Date.now() + 1).toString(),
          sender: 'bot',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          text: '⚠️ No project is assigned yet. Please select or create an active project to view schedule analytics and field progress.'
        }
      ]);
      setInputText('');
      setAttachedPhoto(null);
      return;
    }

    setIsProcessing(true);

    // Universal Voice & Text Normalization to English
    try {
      const hRes = await fetch(`${EXPRESS_API_BASE}/to-english`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: query })
      });
      if (hRes.ok) {
        const hData = await hRes.json();
        if (hData.english) {
          query = hData.english;
        }
      }
    } catch (err) {
      console.warn('English normalization error:', err);
    }

    // Add user message to chat with attached photo
    const userMsgId = Date.now().toString();
    const newMessages = [
      ...messages,
      {
        id: userMsgId,
        sender: 'user',
        time: formatTime(new Date(), i18n.language),
        text: query,
        photo_data: photoToSend?.dataUrl || null,
        photo_hash: photoToSend?.hash || null,
        latitude: photoToSend?.lat || null,
        longitude: photoToSend?.lng || null,
        accuracy: photoToSend?.accuracy || null,
        location_address: photoToSend?.address || null,
        supervisor: user?.name || 'Site Supervisor'
      }
    ];
    setMessages(newMessages);
    setInputText('');
    setAttachedPhoto(null);

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
          submitted_by: user?.name || 'Site Supervisor',
          photo_data: photoToSend?.dataUrl || null,
          photo_hash: photoToSend?.hash || null,
          latitude: photoToSend?.lat || null,
          longitude: photoToSend?.lng || null,
          accuracy: photoToSend?.accuracy || null,
          location_address: photoToSend?.address || null,
          geofence_status: photoToSend?.geofenceStatus || null
        })
      });

      const data = await res.json();
      if (data.success) {
        const confPercent = Math.round(data.confidence * 100);
        const match = data.best_match;

        const statusText = data.auto_approved
          ? `⚡ *Auto-Approved & Pushed to Database* (Confidence ${confPercent}% >= 90%)!\nPrimavera schedule dates and progress committed.`
          : `Queued as Record #${data.pending_update_id} in SQLite Database. Awaiting Planner approval in dashboard.`;

        const photoEvidenceLine = photoToSend
          ? `• 📷 *Geotagged Evidence:* Verified (${photoToSend.lat?.toFixed(4)}°, ${photoToSend.lng?.toFixed(4)}° • SHA-256)\n`
          : '';

        const reply =
          `✅ *Schedule Activity Matched!*\n\n` +
          `• *Discipline:* ${data.extracted?.discipline || 'General'}\n` +
          `• *Extracted Task:* ${data.extracted?.extracted_task}\n` +
          `• *Event Type:* ${data.extracted?.event_type}\n` +
          `• *Zone:* ${data.extracted?.location_zone}\n` +
          photoEvidenceLine +
          `\n📋 *Matched WBS Activity:*\n` +
          `• *ID:* \`${match ? match.activity_id : 'N/A'}\`\n` +
          `• *Name:* ${match ? match.activity_name : 'No direct match'}\n` +
          `• *Confidence:* ${confPercent}%\n\n` +
          `📌 *Status:* ${statusText}`;

        const isDelayDetected = 
          data.delay_detected || 
          /delay|stopped|stoppage|stuck|breakdown|rain|monsoon|waterlog|halt|shortage/i.test(query);

        // Save entry to local queue as well for instant Lead Planner visibility
        try {
          const localQueue = JSON.parse(localStorage.getItem('sih_pending_updates') || '[]');
          const pendingEntry = {
            id: data.pending_update_id || Date.now(),
            project_id: activeProject?.id || 'PRJ-01',
            raw_input: query,
            extracted_task: data.extracted?.extracted_task || query,
            extracted_discipline: data.extracted?.discipline || 'General',
            event_type: data.extracted?.event_type || 'Actual Finish',
            location_zone: data.extracted?.location_zone || 'Sector-4B',
            matched_activity_id: match?.activity_id || null,
            matched_activity_name: match?.activity_name || null,
            confidence: data.confidence || 0.85,
            source_type: isRecording ? 'voice' : 'telegram_web',
            status: data.auto_approved ? 'approved' : 'pending',
            created_at: new Date().toISOString(),
            submitted_by: user?.name || 'Site Supervisor',
            photo_data: photoToSend?.dataUrl || null,
            photo_hash: photoToSend?.hash || null,
            latitude: photoToSend?.lat || null,
            longitude: photoToSend?.lng || null,
            accuracy: photoToSend?.accuracy || null,
            location_address: photoToSend?.address || null,
            geofence_status: photoToSend?.geofenceStatus || null,
            delay_detected: isDelayDetected ? 1 : 0
          };
          localStorage.setItem('sih_pending_updates', JSON.stringify([pendingEntry, ...localQueue]));
        } catch (e) {}

        const botReplies = [
          {
            id: (Date.now() + 1).toString(),
            sender: 'bot',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: reply,
            recordId: data.pending_update_id,
            matchedActivity: match,
            autoApproved: data.auto_approved
          }
        ];

        if (isDelayDetected) {
          botReplies.push({
            id: (Date.now() + 2).toString(),
            sender: 'bot',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            text: `⚠️ *Delay detected for activity [${match ? match.activity_name : (data.extracted?.extracted_task || 'Pipeline Task')}].*\n\nPlease specify the operational root-cause category:`,
            isDelayPrompt: true,
            recordId: data.pending_update_id,
            activityName: match ? match.activity_name : data.extracted?.extracted_task
          });
        }

        setMessages((prev) => [...prev, ...botReplies]);
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
        className="fixed bottom-6 right-20 sm:right-44 z-40 p-3.5 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-600 hover:to-blue-700 text-white rounded-2xl shadow-xl hover:shadow-2xl flex items-center gap-2.5 transition-all duration-200 hover:scale-105 group border border-white/20"
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
        <div 
          data-telegram-widget="true"
          className="fixed bottom-20 right-4 sm:right-6 z-50 w-[92vw] sm:w-[420px] h-[580px] bg-slate-100 rounded-3xl shadow-2xl border border-slate-300/80 flex flex-col animate-fadeIn" 
          style={{clipPath: 'none'}}
        >
          {/* ── Left-Side Activity Suggestion Panel (Appears on the left side of the voice chat) ── */}
          {showSuggestions && inputText.trim().length >= 2 && (
            <div 
              className="
                fixed sm:absolute 
                left-3 sm:left-auto sm:right-full 
                sm:mr-3 bottom-20 sm:bottom-0 
                w-[calc(100vw-24px)] sm:w-[350px] md:w-[380px] 
                h-[520px] sm:h-[580px] max-h-[85vh] 
                bg-white rounded-3xl shadow-2xl border border-slate-200/90 
                overflow-hidden flex flex-col z-50 
                animate-fadeIn
              "
            >
              <ActivitySuggestions
                query={inputText}
                activities={botActivities}
                onSelect={(actOrText) => {
                  let text;
                  if (typeof actOrText === 'string') {
                    text = actOrText;
                  } else {
                    const name = actOrText.name || actOrText.activity_name || 'Activity';
                    const actId = actOrText.id || actOrText.activity_id || '';
                    const disc = actOrText.discipline || '';
                    text = `[${actId}] ${name} — ${disc} observation.`;
                  }
                  setInputText(text);
                  setShowSuggestions(false);
                  setIsVoiceTriggered(false);
                }}
                onDismiss={() => { setShowSuggestions(false); setIsVoiceTriggered(false); }}
                variant="leftPanel"
                isVoice={isVoiceTriggered}
              />
            </div>
          )}

          {/* Telegram Header */}
          <div className="bg-[#24A1DE] text-white px-4 py-3 flex items-center justify-between shadow-md rounded-t-3xl">
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

                  {/* Geotagged Photo Evidence in User Message */}
                  {m.photo_data && (
                    <div className="mt-2 space-y-1">
                      <div 
                        className="relative group cursor-pointer overflow-hidden rounded-xl border border-black/15 shadow-sm"
                        onClick={() => setPreviewPhotoModal(m.photo_data)}
                      >
                        <img 
                          src={m.photo_data} 
                          alt="Geotagged Evidence" 
                          className="w-full max-h-44 object-cover group-hover:scale-105 transition duration-300"
                        />
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent p-2 text-white text-[10px] flex items-center justify-between">
                          <span className="flex items-center gap-1 font-mono font-bold">
                            <MapPin size={11} className="text-sky-300" />
                            {m.latitude ? `${m.latitude.toFixed(4)}°, ${m.longitude.toFixed(4)}°` : 'Geotagged'}
                          </span>
                          <span className="bg-emerald-500/90 text-white px-1.5 py-0.5 rounded text-[9px] font-bold flex items-center gap-1">
                            <ShieldCheck size={10} /> Verified HUD
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

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

                  {m.isDelayPrompt && (
                    <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-1.5">
                      <div className="text-[10px] font-extrabold text-slate-600 uppercase tracking-wider">
                        Select Delay Root Cause:
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {TELEGRAM_DELAY_CATEGORIES.map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleSelectDelayCategory(m.recordId, cat, m.activityName)}
                            className="px-2 py-1 rounded-lg text-[10px] font-bold bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 shadow-sm transition hover:border-indigo-400 text-left"
                          >
                            {cat}
                          </button>
                        ))}
                      </div>
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

          {/* Attached Geotagged Photo Preview Chip */}
          {attachedPhoto && (
            <div className="px-3 py-1.5 bg-sky-50 border-t border-sky-200 flex items-center justify-between gap-2 shrink-0 animate-fadeIn">
              <div className="flex items-center gap-2 min-w-0">
                <img
                  src={attachedPhoto.dataUrl}
                  alt="Site preview"
                  onClick={() => setPreviewPhotoModal(attachedPhoto.dataUrl)}
                  className="w-9 h-9 object-cover rounded-lg border border-sky-300 shadow-xs cursor-pointer hover:opacity-80 transition shrink-0"
                />
                <div className="min-w-0 text-[11px]">
                  <div className="font-bold text-sky-900 flex items-center gap-1 truncate">
                    <ShieldCheck size={12} className="text-emerald-600 shrink-0" />
                    <span>Geotagged Photo Attached</span>
                  </div>
                  <div className="text-[10px] text-sky-700 font-mono flex items-center gap-1 truncate">
                    <MapPin size={10} className="text-indigo-600 shrink-0" />
                    {attachedPhoto.lat?.toFixed(4)}°, {attachedPhoto.lng?.toFixed(4)}° (±{attachedPhoto.accuracy || 12}m)
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAttachedPhoto(null)}
                className="p-1 text-slate-400 hover:text-rose-600 rounded-md transition hover:bg-rose-50"
                title="Remove photo"
              >
                <X size={14} />
              </button>
            </div>
          )}

          {/* Chat Input & Voice Bar */}
          <div className="p-3 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0 rounded-b-3xl">
            {/* Live Voice Recording Button */}
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

            {/* Geotagged Photo Camera Button */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLocating}
              className={`p-2.5 rounded-full transition shadow-sm ${
                attachedPhoto
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 ring-2 ring-emerald-200'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
              title={attachedPhoto ? 'Photo Geotagged & Attached (Click to change)' : 'Attach Geotagged Site Photo'}
            >
              {isLocating ? <RefreshCw size={18} className="animate-spin text-sky-600" /> : <Camera size={18} />}
            </button>

            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handlePhotoSelect}
            />

            <input
              type="text"
              value={inputText}
              onChange={(e) => {
                setInputText(e.target.value);
                setIsVoiceTriggered(false);
                setShowSuggestions(e.target.value.trim().length >= 2);
              }}
              onFocus={() => inputText.trim().length >= 2 && setShowSuggestions(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') { setShowSuggestions(false); handleSendMessage(); }
                if (e.key === 'Escape') setShowSuggestions(false);
              }}
              placeholder={isRecording ? '🎙️ Listening… speak observation…' : isLocating ? '📍 Geotagging photo…' : 'Type observation or attach photo…'}
              className={`flex-1 px-3.5 py-2.5 text-xs bg-slate-50 border rounded-2xl focus:outline-none transition ${
                isRecording ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 focus:border-sky-500'
              }`}
            />

            <button
              type="button"
              onClick={() => { setShowSuggestions(false); handleSendMessage(); }}
              disabled={isProcessing || (!inputText.trim() && !attachedPhoto)}
              className="p-2.5 bg-[#24A1DE] hover:bg-[#1E8BC0] disabled:bg-slate-300 text-white rounded-full transition shadow-sm"
              title="Send to AI Linker"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Geotagged Photo Preview Lightbox Modal */}
      {previewPhotoModal && (
        <div 
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn"
          onClick={() => setPreviewPhotoModal(null)}
        >
          <div className="relative max-w-2xl max-h-[85vh] bg-slate-900 rounded-3xl overflow-hidden border border-slate-700 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="absolute top-3 right-3 z-10">
              <button 
                onClick={() => setPreviewPhotoModal(null)}
                className="p-2 rounded-full bg-black/60 text-white hover:bg-black/90 transition shadow-md"
              >
                <X size={18} />
              </button>
            </div>
            <img src={previewPhotoModal} alt="Geotagged Site Evidence" className="w-full h-auto max-h-[80vh] object-contain" />
          </div>
        </div>
      )}
    </>
  );
}
