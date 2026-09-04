import React, { useState } from 'react';
import { 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  Sparkles, 
  Layers, 
  Clock, 
  Send,
  Mic,
  MicOff,
  Bot,
  ShieldCheck,
  ShieldAlert,
  MessageSquare,
} from 'lucide-react';

export default function DataCapture() {
  const [selectedTask, setSelectedTask] = useState('WBS-2.1');
  const [actualProgress, setActualProgress] = useState(45);
  const [remarks, setRemarks] = useState('');
  const [hasDelay, setHasDelay] = useState(false);
  const [delayReason, setDelayReason] = useState('Weather / Heavy Rain');
  const [images, setImages] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState(false);

  // Browser Voice Recording State
  const [isRecording, setIsRecording] = useState(false);
  const [audioTranscript, setAudioTranscript] = useState('');
  const [validationResult, setValidationResult] = useState(null);

  const tasks = [
    { wbs: 'WBS-1.1', name: 'Site Clearing & Grading', planned: 100, actual: 92 },
    { wbs: 'WBS-1.2', name: 'Site Earthworks & Clearing (Zone A)', planned: 80, actual: 65 },
    { wbs: 'WBS-2.1', name: 'Pipeline Trenching - Sector 4', planned: 60, actual: 45 },
    { wbs: 'WBS-3.1', name: 'Substation Foundation Concrete Pour', planned: 40, actual: 35 },
  ];

  const recentLogs = [
    { id: 1, wbs: 'WBS-1.1', progress: '92%', user: 'Ramesh K. (Site Eng)', time: '2 hours ago', confidence: '96.4%', status: 'Auto-Saved (≥90%)' },
    { id: 2, wbs: 'WBS-2.1', progress: '45%', user: 'Kartik K. (Supervisor)', time: 'Yesterday', confidence: '84.2%', status: 'Escalated to Supervisor (<90%)' },
  ];

  const handleToggleRecord = () => {
    if (!isRecording) {
      setIsRecording(true);
      setAudioTranscript('');
      setValidationResult(null);

      // Simulate voice capture
      setTimeout(() => {
        setIsRecording(false);
        const sampleText = "Completed sector 4 pipeline trenching up to chainage 2+400. Heavy monsoon rain caused 15% slowdown on excavators.";
        setAudioTranscript(sampleText);

        // Run 90% Confidence NLP Validation check
        const confidence = 94.5; // >90%
        setValidationResult({
          text: sampleText,
          wbs: 'WBS-2.1',
          extractedProgress: 45,
          extractedIssue: 'Monsoon Heavy Rain',
          confidence: confidence,
          isValidated: confidence >= 90,
          action: 'Auto-Saved to Database (≥90% Confidence)',
        });
      }, 3000);
    } else {
      setIsRecording(false);
    }
  };

  const simulateLowConfidence = () => {
    const lowText = "Muck clearing done near pillar 14... need more cement or maybe sand, not sure...";
    setAudioTranscript(lowText);
    const confidence = 74.8; // <90%
    setValidationResult({
      text: lowText,
      wbs: 'WBS-1.2',
      extractedProgress: 65,
      extractedIssue: 'Uncertain material note',
      confidence: confidence,
      isValidated: false,
      action: 'Escalated to Supervisor Telegram for Verification (<90%)',
    });
  };

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    const newImages = files.map((file) => ({
      id: Math.random().toString(),
      name: file.name,
      url: URL.createObjectURL(file),
    }));
    setImages((prev) => [...prev, ...newImages]);
  };

  const removeImage = (id) => {
    setImages((prev) => prev.filter((img) => img.id !== id));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setSuccessMessage(true);
      setTimeout(() => setSuccessMessage(false), 3000);
    }, 900);
  };

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-[calc(100vh-65px)] text-slate-900 space-y-6 pb-24 sm:pb-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-800">
              <Mic className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Voice-First Field Data Capture</h1>
              <p className="text-xs text-slate-500">
                Speak notes via Browser or Telegram Bot &bull; AI Word Separation & 90% Confidence Validation Engine
              </p>
            </div>
          </div>
        </div>

        {successMessage && (
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-3.5 py-2 rounded-xl">
            <CheckCircle2 size={16} /> Progress Logged & P6 Synced
          </div>
        )}
      </div>

      {/* Hero Voice Input Card */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-6 relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div>
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> AI Speech-to-Text & Validation Pipeline
            </span>
            <h2 className="text-lg font-extrabold text-slate-900 mt-1">Record Site Voice Update</h2>
          </div>

          {/* Telegram Bot Indicator */}
          <a 
            href="https://t.me/splashers_v1_bot" 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-2xl border border-indigo-200 text-xs transition cursor-pointer shadow-sm group"
          >
            <Bot className="w-4 h-4 text-indigo-700 group-hover:scale-110 transition-transform" />
            <span className="text-slate-600 font-medium">Live Telegram Bot:</span>
            <span className="font-mono text-indigo-700 font-extrabold underline">@splashers_v1_bot</span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
          {/* Audio Record Mic Trigger */}
          <div className="md:col-span-1 flex flex-col items-center justify-center p-6 bg-slate-50 border border-slate-200 rounded-2xl space-y-3 text-center">
            <button
              type="button"
              onClick={handleToggleRecord}
              className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-300 shadow-lg ${
                isRecording
                  ? 'bg-rose-600 text-white animate-pulse shadow-rose-500/30 ring-4 ring-rose-300'
                  : 'bg-gradient-to-tr from-amber-500 to-orange-500 text-white hover:scale-105 shadow-amber-500/25'
              }`}
            >
              {isRecording ? <MicOff className="w-8 h-8" /> : <Mic className="w-8 h-8" />}
            </button>

            <div>
              <p className="text-xs font-bold text-slate-900">
                {isRecording ? 'Listening... Speak your site update' : 'Tap to Record Voice Note'}
              </p>
              <p className="text-[10px] text-slate-500 mt-0.5">
                {isRecording ? 'Capturing audio waveform...' : 'Or send voice audio to Telegram bot'}
              </p>
            </div>

            <button
              type="button"
              onClick={simulateLowConfidence}
              className="text-[10px] text-amber-700 hover:underline font-semibold"
            >
              [Test Low Confidence Flow (&lt;90%)]
            </button>
          </div>

          {/* AI Voice Parsing Result Display */}
          <div className="md:col-span-2 space-y-3 bg-slate-50 p-5 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center text-xs">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <MessageSquare className="w-4 h-4 text-amber-600" /> Transcribed Audio Text
              </span>
              {validationResult && (
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
                    validationResult.isValidated
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {validationResult.isValidated ? (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" /> Confidence {validationResult.confidence}% (Valid ≥90%)
                    </>
                  ) : (
                    <>
                      <ShieldAlert className="w-3.5 h-3.5" /> Confidence {validationResult.confidence}% (&lt;90% Escalate)
                    </>
                  )}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-800 italic min-h-[44px] bg-white p-3 rounded-xl border border-slate-200 font-mono">
              {audioTranscript ? `"${audioTranscript}"` : 'Record voice above or send a Telegram voice note to see AI separation...'}
            </p>

            {validationResult && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1 text-[11px] font-mono">
                <div className="flex justify-between text-slate-600">
                  <span>Parsed WBS: <strong className="text-slate-900">{validationResult.wbs}</strong></span>
                  <span>Extracted Issue: <strong className="text-slate-900">{validationResult.extractedIssue}</strong></span>
                </div>
                <div className="text-slate-700">
                  Action Status: <strong className={validationResult.isValidated ? 'text-emerald-700' : 'text-amber-700'}>{validationResult.action}</strong>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 2-Column Section: Manual Log Form & Audit Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-xs">
        {/* Main Log Form (2 cols) */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-5 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 border-b border-slate-200 pb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-700" /> Manual Progress & Evidence Backup
          </h3>

          {/* Task Selector */}
          <div className="space-y-1.5">
            <label className="text-slate-700 font-semibold flex items-center justify-between">
              <span>Select WBS Activity</span>
              <span className="text-[10px] text-slate-400 font-mono">Primavera P6 Active Baseline</span>
            </label>
            <select
              value={selectedTask}
              onChange={(e) => {
                setSelectedTask(e.target.value);
                const task = tasks.find((t) => t.wbs === e.target.value);
                if (task) setActualProgress(task.actual);
              }}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900 font-mono"
            >
              {tasks.map((task) => (
                <option key={task.wbs} value={task.wbs}>
                  {task.wbs} — {task.name} (Planned: {task.planned}%)
                </option>
              ))}
            </select>
          </div>

          {/* Progress Slider */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex justify-between items-center">
              <label className="text-slate-700 font-semibold">Updated Progress Percentage</label>
              <span className="font-mono text-lg font-extrabold text-slate-900">{actualProgress}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={actualProgress}
              onChange={(e) => setActualProgress(Number(e.target.value))}
              className="w-full accent-slate-900 bg-slate-200 h-2 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex gap-2 justify-end text-[10px]">
              <button
                type="button"
                onClick={() => setActualProgress((p) => Math.min(100, p + 5))}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-lg text-slate-700 font-semibold"
              >
                +5%
              </button>
              <button
                type="button"
                onClick={() => setActualProgress((p) => Math.min(100, p + 10))}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-lg text-slate-700 font-semibold"
              >
                +10%
              </button>
              <button
                type="button"
                onClick={() => setActualProgress(100)}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-300 px-2.5 py-1 rounded-lg text-amber-800 font-semibold"
              >
                100% Complete
              </button>
            </div>
          </div>

          {/* Photo Upload Area */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <label className="text-slate-700 font-semibold flex justify-between">
              <span>Site Evidence Photos</span>
              <span className="text-[10px] text-slate-400">{images.length} attached</span>
            </label>

            <div className="border-2 border-dashed border-slate-300 hover:border-slate-400 bg-slate-50 rounded-2xl p-4 text-center transition">
              <input
                type="file"
                multiple
                accept="image/*"
                id="photo-upload"
                onChange={handleImageUpload}
                className="hidden"
              />
              <label htmlFor="photo-upload" className="cursor-pointer space-y-1.5 block">
                <Upload size={22} className="mx-auto text-slate-600" />
                <p className="text-xs text-slate-800 font-semibold">Click to upload site evidence</p>
                <p className="text-[10px] text-slate-400">PNG, JPG, or WEBP (Auto-geotagged)</p>
              </label>
            </div>

            {/* Thumbnail Preview */}
            {images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto py-1">
                {images.map((img) => (
                  <div key={img.id} className="relative w-16 h-16 rounded-xl border border-slate-300 shrink-0 overflow-hidden group">
                    <img src={img.url} alt="Site evidence" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(img.id)}
                      className="absolute top-0.5 right-0.5 bg-slate-900/80 text-rose-300 p-0.5 rounded-md"
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Delay Flagging */}
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="delayFlag"
                checked={hasDelay}
                onChange={(e) => setHasDelay(e.target.checked)}
                className="rounded bg-white border-slate-300 text-rose-600 focus:ring-0"
              />
              <label htmlFor="delayFlag" className="text-slate-700 font-semibold cursor-pointer flex items-center gap-1.5">
                <AlertTriangle size={15} className={hasDelay ? 'text-rose-600' : 'text-slate-400'} />
                Flag Schedule Impediment
              </label>
            </div>

            {hasDelay && (
              <select
                value={delayReason}
                onChange={(e) => setDelayReason(e.target.value)}
                className="w-full bg-rose-50 border border-rose-300 rounded-xl px-3 py-2 text-xs text-rose-900 focus:outline-none"
              >
                <option value="Weather / Heavy Rain">Monsoon Earthwork Slowdown</option>
                <option value="Equipment Breakdown">Equipment Breakdown / Operator Absenteeism</option>
                <option value="Material Delay">Raw Material / Ready-Mix Supply Variance</option>
                <option value="Subcontractor Delay">Subcontractor Workforce Deficit</option>
              </select>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-md disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Sparkles size={16} className="animate-spin" /> Syncing with Primavera P6...
              </>
            ) : (
              <>
                <Send size={16} /> Submit Field Log & Sync P6 Baseline
              </>
            )}
          </button>
        </form>

        {/* Right Sidebar: Recent Audits & Confidence Rules (1 col) */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm space-y-3">
            <span className="font-bold text-slate-900 flex items-center gap-2">
              <Clock size={16} className="text-slate-700" /> Recent Site Audits
            </span>

            <div className="divide-y divide-slate-200">
              {recentLogs.map((log) => (
                <div key={log.id} className="py-3 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-slate-900 font-bold">{log.wbs}</span>
                    <span className="font-mono font-extrabold text-emerald-700">{log.progress}</span>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>{log.user}</span>
                    <span>{log.time}</span>
                  </div>
                  <div className="text-[10px] text-amber-800 font-mono pt-0.5">
                    Score: {log.confidence} &bull; {log.status}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="p-5 bg-white border border-slate-200/90 rounded-3xl shadow-sm space-y-2 text-[11px]">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-emerald-700" /> 90% Confidence Validation Rule
            </span>
            <p className="text-slate-600 leading-relaxed">
              Transcribed site voice notes are automatically structured by our LLaMA-3 NLP model. Notes with confidence &ge;90% are auto-kept in P6 database. Notes &lt;90% are routed to supervisor Telegram bot for manual approval.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}