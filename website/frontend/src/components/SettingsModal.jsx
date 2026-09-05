import React, { useState } from 'react';
import {
  X,
  User,
  Settings,
  Sparkles,
  Bell,
  Database,
  Shield,
  Sliders,
  Check,
  HardHat,
  Briefcase,
  Volume2,
  RefreshCw,
  Info
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';

export default function SettingsModal({ isOpen, onClose }) {
  const { user } = useAuth();
  const { activeProject } = useProject();

  const [activeTab, setActiveTab] = useState('profile'); // profile | ai | notifications | system
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Settings State with LocalStorage persistence
  const [autoApprovalThreshold, setAutoApprovalThreshold] = useState(() => {
    return localStorage.getItem('sih_setting_auto_thresh') || '90';
  });
  const [speechLanguage, setSpeechLanguage] = useState(() => {
    return localStorage.getItem('sih_setting_speech_lang') || 'hi-IN';
  });
  const [soundAlerts, setSoundAlerts] = useState(() => {
    return localStorage.getItem('sih_setting_sound') !== 'false';
  });
  const [emailAlerts, setEmailAlerts] = useState(() => {
    return localStorage.getItem('sih_setting_email') !== 'false';
  });
  const [predictiveModel, setPredictiveModel] = useState(() => {
    return localStorage.getItem('sih_setting_model') || 'gemini-2.5-flash';
  });

  if (!isOpen) return null;

  const handleSaveSettings = () => {
    localStorage.setItem('sih_setting_auto_thresh', autoApprovalThreshold);
    localStorage.setItem('sih_setting_speech_lang', speechLanguage);
    localStorage.setItem('sih_setting_sound', soundAlerts.toString());
    localStorage.setItem('sih_setting_email', emailAlerts.toString());
    localStorage.setItem('sih_setting_model', predictiveModel);

    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 900);
  };

  const handleClearCache = () => {
    if (window.confirm('Reset local demo cache? This will refresh project assignments and notifications.')) {
      localStorage.removeItem('sih_infrasutra_projects_v2');
      localStorage.removeItem('sih_local_notifications');
      window.location.reload();
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile & Role', icon: User },
    { id: 'ai', label: 'Gemini AI & Thresholds', icon: Sparkles },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'system', label: 'System Diagnostics', icon: Database },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-400/20 text-amber-400 border border-amber-400/30 flex items-center justify-center">
              <Settings size={20} />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Platform Settings & Preferences</h3>
              <p className="text-xs text-slate-400">Configure Infrasutra workspace, AI models, and alerting</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-2 gap-2 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? 'border-amber-500 text-amber-700 bg-white rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'
                }`}
              >
                <Icon size={14} className={isActive ? 'text-amber-600' : 'text-slate-400'} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* TAB 1: Profile */}
          {activeTab === 'profile' && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex items-center gap-4">
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner ${
                    user?.roleKey === 'supervisor'
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                  }`}
                >
                  {user?.roleKey === 'supervisor' ? <HardHat size={28} /> : <Briefcase size={28} />}
                </div>
                <div className="space-y-0.5">
                  <h4 className="font-extrabold text-base text-slate-900">{user?.name || 'Authorized Engineer'}</h4>
                  <p className="text-xs text-slate-500">{user?.email || 'engineer@oilindia.in'}</p>
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-200 text-slate-800 mt-1">
                    Role: {user?.role || 'Project Planner'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Active Project In View</span>
                  <p className="font-bold text-slate-800 truncate">{activeProject?.name || 'Sector 4 Pipeline Expansion'}</p>
                  <p className="text-[11px] text-slate-500">{activeProject?.location || 'Dibrugarh, Assam'}</p>
                </div>
                <div className="p-3 bg-white border border-slate-200 rounded-xl space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold">Security & Authorization</span>
                  <p className="font-bold text-emerald-700 flex items-center gap-1">
                    <Shield size={13} /> Strict WBS Isolation Active
                  </p>
                  <p className="text-[11px] text-slate-500">Database Role-Based Access Control</p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: AI & Thresholds */}
          {activeTab === 'ai' && (
            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Schedule-Linking Auto-Approval Confidence Threshold</span>
                  <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-mono font-black text-xs">
                    {autoApprovalThreshold}%
                  </span>
                </label>
                <input
                  type="range"
                  min="70"
                  max="98"
                  step="1"
                  value={autoApprovalThreshold}
                  onChange={(e) => setAutoApprovalThreshold(e.target.value)}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <p className="text-[11px] text-slate-500">
                  Field observations matching Primavera P6 activities with confidence &ge; {autoApprovalThreshold}% are auto-committed directly to the schedule database.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800">
                  Predictive Project Management AI Engine
                </label>
                <select
                  value={predictiveModel}
                  onChange={(e) => setPredictiveModel(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                >
                  <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Recommended - Real-Time Analysis)</option>
                  <option value="gemini-3-flash-preview">Google Gemini 3 Flash Preview</option>
                  <option value="predictive-deterministic">Autonomous Analytical Fallback (Zero Latency Offline)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-800">
                  Voice Speech Recognition Default Dialect
                </label>
                <select
                  value={speechLanguage}
                  onChange={(e) => setSpeechLanguage(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500"
                >
                  <option value="hi-IN">Hindi / Hinglish (India - hi-IN)</option>
                  <option value="en-IN">Indian English (en-IN)</option>
                  <option value="en-US">Standard English (en-US)</option>
                </select>
              </div>
            </div>
          )}

          {/* TAB 3: Notifications */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900">Audio Feedback & Sound Alerts</div>
                  <div className="text-[11px] text-slate-500">Play chime when new field observations are submitted</div>
                </div>
                <input
                  type="checkbox"
                  checked={soundAlerts}
                  onChange={(e) => setSoundAlerts(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-200 rounded-2xl cursor-pointer hover:bg-slate-100 transition">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-slate-900">Email Dispatch Notifications</div>
                  <div className="text-[11px] text-slate-500">Send assignment & critical path delay emails to site teams</div>
                </div>
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                />
              </label>
            </div>
          )}

          {/* TAB 4: System Diagnostics */}
          {activeTab === 'system' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">Node/Express Server</div>
                  <div className="font-mono font-bold text-slate-800 mt-1">Port 5000 (Active)</div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">● @google/genai ready</div>
                </div>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <div className="text-[10px] uppercase font-bold text-slate-400">FastAPI ML Core</div>
                  <div className="font-mono font-bold text-slate-800 mt-1">Port 8000 (Active)</div>
                  <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">● Schedule Linker ready</div>
                </div>
              </div>

              <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl flex items-start gap-3">
                <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 space-y-1">
                  <strong className="block font-bold">Local Demo Reset Action:</strong>
                  <span>If you want to clear stored test notifications and reset standalone mock projects back to initial benchmark state, click the reset button below.</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleClearCache}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 border border-slate-300 hover:border-rose-300 text-slate-700 font-bold text-xs rounded-xl transition flex items-center justify-center gap-2"
              >
                <RefreshCw size={14} /> Reset Local Cache & Restart
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-400 font-medium">
            Infrasutra v2.5 &bull; Oil India PS-122
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 bg-white border border-slate-300 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveSettings}
              className="px-5 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-300 rounded-xl shadow-md transition active:scale-95 flex items-center gap-1.5"
            >
              {savedSuccess ? (
                <>
                  <Check size={14} /> Saved!
                </>
              ) : (
                'Save Preferences'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
