import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { 
  Sparkles, CheckCircle2, ArrowRight, Bot, 
  Send, Zap, Edit3, Trash2, History, PlusCircle,
  AlertCircle, HardHat, Briefcase, Filter, X
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config';

export default function FieldUpdatePage() {
  const { activeProject } = useProject();
  const { user, isManager, isSupervisor, authFetch } = useAuth();

  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'history'
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  // Submissions History & Editing
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    raw_input: '',
    extracted_discipline: '',
    extracted_task: '',
    event_type: 'Actual Finish',
    location_zone: '',
    matched_activity_id: '',
  });
  const [projectActivities, setProjectActivities] = useState([]);

  // Fetch activities for manual override dropdown
  const fetchActivities = async () => {
    if (!activeProject?.id) {
      setProjectActivities([]);
      return;
    }
    try {
      const res = await authFetch(`${API_BASE}/schedule/activities?project_id=${activeProject.id}`);
      const data = await res.json();
      if (data.success) {
        setProjectActivities(data.activities);
      }
    } catch (err) {
      console.warn('Failed to load project activities:', err);
    }
  };

  const fetchHistory = async () => {
    if (!activeProject?.id) {
      setHistory([]);
      setHistoryLoading(false);
      return;
    }
    setHistoryLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/pending-updates?project_id=${activeProject.id}`);
      const data = await res.json();
      if (data.success) {
        setHistory(data.updates);
      }
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    if (activeTab === 'history') {
      fetchHistory();
    }
  }, [activeProject?.id, activeTab]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    if (!activeProject?.id) {
      setError('No project selected or assigned. Cannot submit field report.');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await authFetch(`${API_BASE}/field-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          text: inputText, 
          source_type: 'web_text',
          project_id: activeProject.id,
          submitted_by: user?.name || 'Site Supervisor'
        })
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
        setInputText('');
      } else {
        setError(data.detail || 'Failed to process update');
      }
    } catch (err) {
      setError(`Backend error: ${err.message}. Ensure backend is running.`);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditFormData({
      raw_input: item.raw_input,
      extracted_discipline: item.extracted_discipline || 'Civil',
      extracted_task: item.extracted_task || '',
      event_type: item.event_type || 'Actual Finish',
      location_zone: item.location_zone || '',
      matched_activity_id: item.matched_activity_id || '',
    });
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const res = await authFetch(`${API_BASE}/pending-updates/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editFormData)
      });
      if (res.ok) {
        setEditingItem(null);
        fetchHistory();
      }
    } catch (err) {
      alert(`Error updating submission: ${err.message}`);
    }
  };

  const handleDeleteSubmission = async (id) => {
    if (!confirm('Are you sure you want to delete this submission?')) return;
    try {
      const res = await authFetch(`${API_BASE}/pending-updates/${id}`, { method: 'DELETE' });
      if (res.ok) fetchHistory();
    } catch (err) {
      alert(`Error deleting: ${err.message}`);
    }
  };

  const samplePrompts = activeProject?.id === 'PRJ-02'
    ? [
        "Unit-2 mein Heat Exchanger bundle insertion complete ho gaya",
        "Control-Room mein DCS panel wiring cable terminate ho gaya status updated",
        "Gas Turbine Generator foundation concrete pouring finished at 18:00"
      ]
    : [
        "Sector-4A mein Line 24-XX ka spool erection aaj start ho gaya",
        "Zone-4 mein Pipe Rack Support Fabrication complete ho gaya",
        "Sector-4B mein Mainline Trenching excavation 65% complete"
      ];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Top Banner & Project Scope */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <HardHat size={16} /> Site Observation & Field Logger
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {activeProject?.name}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Role: <span className="font-bold text-slate-800 capitalize">{user?.role || 'Site Supervisor'}</span> | Log updates in Hinglish or English to sync with SQLite database.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl border border-slate-200 text-xs font-bold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'new'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <PlusCircle size={14} /> New Log
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 transition ${
              activeTab === 'history'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <History size={14} /> Submissions & Edit ({history.length || '•'})
          </button>
        </div>
      </div>

      {/* TAB 1: NEW OBSERVATION */}
      {activeTab === 'new' && (
        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1.5">
                Field Observation Notes (Hinglish or English)
              </label>
              <textarea
                rows={3}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="e.g. Zone-4 mein Pipe Rack Support Fabrication complete ho gaya at 17:30..."
                className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-900 focus:outline-none focus:border-slate-900 resize-none font-medium leading-relaxed"
              />
            </div>

            {/* Example prompts */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Template Presets for {activeProject?.id}:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {samplePrompts.map((ex, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setInputText(ex)}
                    className="text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl transition border border-slate-200"
                  >
                    "{ex}"
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-between items-center pt-3 border-t border-slate-100">
              <div className="text-[11px] text-slate-400">
                AI extracts discipline, task name, event type, and links to SQLite WBS.
              </div>
              <button
                type="submit"
                disabled={loading || !inputText.trim()}
                className="flex items-center gap-2 px-6 py-2.5 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 text-white font-bold text-xs rounded-xl transition shadow-sm"
              >
                <Sparkles size={14} className={loading ? "animate-spin" : "text-amber-400"} />
                {loading ? 'AI Linking...' : 'Submit & Queue in SQLite'}
              </button>
            </div>
          </form>

          {/* Error display */}
          {error && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-xs font-semibold flex items-center gap-2">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Result Card */}
          {result && (
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 animate-fadeIn">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-700">
                  {result.auto_approved ? (
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 rounded-xl flex items-center gap-1.5 border border-emerald-300">
                      ⚡ Auto-Approved & Pushed to Schedule (Confidence {Math.round(result.confidence * 100)}% &gt;= 90%)
                    </span>
                  ) : (
                    <>
                      <CheckCircle2 size={18} /> Successfully Stored in SQLite (Record #{result.pending_update_id})
                    </>
                  )}
                </div>
                <Link
                  to={result.auto_approved ? "/schedule-explorer" : "/approval"}
                  className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline"
                >
                  {result.auto_approved ? 'View Updated Schedule' : 'Review in Approval Queue'} <ArrowRight size={14} />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    AI Extracted Features
                  </span>
                  <div>• <strong>Discipline:</strong> {result.extracted?.discipline}</div>
                  <div>• <strong>Task:</strong> {result.extracted?.extracted_task}</div>
                  <div>• <strong>Event Type:</strong> {result.extracted?.event_type}</div>
                  <div>• <strong>Location:</strong> {result.extracted?.location_zone}</div>
                </div>

                <div className="bg-indigo-50/50 border border-indigo-200/70 rounded-2xl p-4 space-y-1.5">
                  <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                    Matched Schedule WBS Activity
                  </span>
                  <div className="font-mono font-bold text-indigo-900 bg-white px-2 py-0.5 rounded inline-block border border-indigo-200">
                    {result.best_match?.activity_id}
                  </div>
                  <div className="font-bold text-slate-800 text-sm">
                    {result.best_match?.activity_name}
                  </div>
                  <div className="text-emerald-700 font-bold">
                    Confidence: {Math.round(result.confidence * 100)}%
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: MY SUBMISSIONS & EDIT PREVIOUS WORK */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs text-slate-500 px-1">
            <span>
              Showing submissions for <strong>{activeProject?.name}</strong>. If previous work was logged incorrectly, you can edit or fix it below.
            </span>
          </div>

          {historyLoading ? (
            <div className="text-center py-12 text-slate-400 text-xs">Loading database records...</div>
          ) : history.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-3xl border border-slate-200 p-8 text-slate-400 text-xs">
              No field updates submitted for this project yet. Use the New Log tab or the Telegram Bot to submit.
            </div>
          ) : (
            <div className="space-y-3">
              {history.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-sm">Record #{item.id}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.status === 'approved'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.status === 'rejected'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {item.status.toUpperCase()}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.created_at?.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>

                    <p className="text-slate-700 italic font-medium">"{item.raw_input}"</p>

                    <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-500">
                      <span>Task: <strong className="text-slate-800">{item.extracted_task}</strong></span>
                      <span>•</span>
                      <span>Discipline: <strong className="text-slate-800">{item.extracted_discipline}</strong></span>
                      <span>•</span>
                      <span>Matched ID: <code className="font-bold text-indigo-700 bg-indigo-50 px-1 py-0.5 rounded">{item.matched_activity_id}</code></span>
                      <span>•</span>
                      <span>By: {item.submitted_by || 'Site Supervisor'}</span>
                    </div>
                  </div>

                  {/* Actions (Edit / Delete) */}
                  <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-2 md:pt-0">
                    <button
                      type="button"
                      onClick={() => openEditModal(item)}
                      className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold transition"
                      title="Edit this submission to correct errors"
                    >
                      <Edit3 size={13} /> Edit Work
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubmission(item.id)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition"
                      title="Delete submission"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Previous Submission (Record #{editingItem.id})
                </h3>
                <p className="text-xs text-slate-500">
                  Correct mistakes in the task name, zone, or reassign the matched activity.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Raw Input Text</label>
                <textarea
                  rows={2}
                  value={editFormData.raw_input}
                  onChange={(e) => setEditFormData({ ...editFormData, raw_input: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Extracted Task Name</label>
                  <input
                    type="text"
                    value={editFormData.extracted_task}
                    onChange={(e) => setEditFormData({ ...editFormData, extracted_task: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Discipline</label>
                  <select
                    value={editFormData.extracted_discipline}
                    onChange={(e) => setEditFormData({ ...editFormData, extracted_discipline: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  >
                    <option value="Civil">Civil</option>
                    <option value="Piping">Piping</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Electrical">Electrical</option>
                    <option value="Instrumentation">Instrumentation</option>
                    <option value="Structural Steel">Structural Steel</option>
                    <option value="Fire Protection">Fire Protection</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Event Type</label>
                  <select
                    value={editFormData.event_type}
                    onChange={(e) => setEditFormData({ ...editFormData, event_type: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  >
                    <option value="Actual Start">Actual Start</option>
                    <option value="Actual Finish">Actual Finish</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Location Zone</label>
                  <input
                    type="text"
                    value={editFormData.location_zone}
                    onChange={(e) => setEditFormData({ ...editFormData, location_zone: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Reassign Matched WBS Activity</label>
                <select
                  value={editFormData.matched_activity_id}
                  onChange={(e) => setEditFormData({ ...editFormData, matched_activity_id: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                >
                  <option value="">-- Choose Matched Activity --</option>
                  {projectActivities.map((act) => (
                    <option key={act.activity_id} value={act.activity_id}>
                      [{act.activity_id}] {act.activity_name} ({act.discipline})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-sm"
                >
                  Save Changes to SQLite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
