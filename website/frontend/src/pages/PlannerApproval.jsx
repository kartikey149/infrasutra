import React, { useState, useEffect } from 'react';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { 
  Check, X, RefreshCw, Database, Clock, 
  ArrowRight, ShieldCheck, AlertTriangle, ShieldAlert,
  Edit3, Filter, CheckCircle2, UserCheck, HardHat, Briefcase
} from 'lucide-react';

import { API_BASE } from '../config';

export default function PlannerApproval() {
  const { activeProject } = useProject();
  const { user, isManager, authFetch } = useAuth();

  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);

  // Edit / Override Modal
  const [editingItem, setEditingItem] = useState(null);
  const [editFormData, setEditFormData] = useState({
    extracted_task: '',
    extracted_discipline: '',
    event_type: '',
    location_zone: '',
    matched_activity_id: '',
  });
  const [projectActivities, setProjectActivities] = useState([]);

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

  const fetchUpdates = async () => {
    if (!activeProject?.id) {
      setUpdates([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const url = filter === 'all' 
        ? `${API_BASE}/pending-updates?project_id=${activeProject.id}` 
        : `${API_BASE}/pending-updates?project_id=${activeProject.id}&status=${filter}`;
      const res = await authFetch(url);
      const data = await res.json();
      if (data.success) {
        setUpdates(data.updates);
      }
    } catch (err) {
      console.error('Failed to fetch updates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
    fetchUpdates();
  }, [activeProject?.id, filter]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    try {
      const res = await authFetch(`${API_BASE}/pending-updates/${id}/approve`, {
        method: 'POST'
      });
      if (res.ok) await fetchUpdates();
    } catch (err) {
      console.error('Error approving:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      const res = await authFetch(`${API_BASE}/pending-updates/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected by Planner' })
      });
      if (res.ok) await fetchUpdates();
    } catch (err) {
      console.error('Error rejecting:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditFormData({
      extracted_task: item.extracted_task,
      extracted_discipline: item.extracted_discipline,
      event_type: item.event_type,
      location_zone: item.location_zone,
      matched_activity_id: item.matched_activity_id,
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
        fetchUpdates();
      }
    } catch (err) {
      console.error('Error editing:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header with Project Scope & Role Badge */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <ShieldCheck size={16} /> Schedule Variance & Field Approval Queue
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Review Field Observations
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Active Project: <strong className="text-slate-800">{activeProject?.name}</strong> ({activeProject?.id})
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-semibold">
          {['pending', 'approved', 'rejected', 'all'].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-3.5 py-1.5 rounded-xl capitalize transition ${
                filter === t 
                  ? 'bg-white text-slate-900 shadow-sm font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t}
            </button>
          ))}
          <button
            onClick={fetchUpdates}
            title="Refresh"
            className="p-2 text-slate-600 hover:text-slate-900 rounded-xl hover:bg-white/50 transition"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Role Notice */}
      {!isManager && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs text-amber-800 flex items-center gap-2">
          <HardHat size={16} className="shrink-0" />
          <span>
            You are viewing this queue as <strong>Site Supervisor</strong>. Only Project Planners can approve changes to the baseline schedule, but you can edit any incorrect entries you submitted.
          </span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs font-medium">
          Loading updates from active SQLite database...
        </div>
      ) : updates.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2">
          <CheckCircle2 size={36} className="mx-auto text-emerald-500 opacity-80" />
          <h3 className="font-bold text-slate-800 text-sm">No {filter} updates found</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            All submitted field observations for {activeProject?.name} have been processed or none match the filter.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {updates.map((item) => {
            const isPending = item.status === 'pending';
            const isApproved = item.status === 'approved';
            const confPercent = Math.round((item.confidence || 0) * 100);

            return (
              <div 
                key={item.id}
                className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm space-y-4 transition-all hover:border-slate-300"
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      Record #{item.id}
                    </span>
                    <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold">
                      {item.source_type}
                    </span>
                    <span className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold uppercase ${
                      isApproved 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : item.status === 'rejected'
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {item.status}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400">
                    {item.created_at ? item.created_at.slice(0, 16).replace('T', ' ') : ''}
                  </span>
                </div>

                {/* Supervisor Input */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    Supervisor Field Submission ({item.submitted_by || 'Field Supervisor'}):
                  </span>
                  <p className="text-xs font-medium text-slate-900 leading-relaxed italic">
                    "{item.raw_input}"
                  </p>
                </div>

                {/* AI Extracted & Matched Activity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Extracted Parameters
                    </span>
                    <div>Discipline: <strong>{item.extracted_discipline}</strong></div>
                    <div>Task: <strong>{item.extracted_task}</strong></div>
                    <div>Event: <strong>{item.event_type}</strong> | Zone: <strong>{item.location_zone}</strong></div>
                  </div>

                  <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-2xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                      Target Schedule Activity
                    </span>
                    <div className="flex items-center gap-1.5">
                      <code className="bg-indigo-100 text-indigo-900 font-bold px-1.5 py-0.5 rounded text-[11px]">
                        {item.matched_activity_id || 'None'}
                      </code>
                      <span className="font-bold text-slate-800 truncate">
                        {item.matched_activity_name || 'No Direct Match'}
                      </span>
                    </div>
                    <div className="text-emerald-700 font-bold">
                      Confidence Match: {confPercent}%
                    </div>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => openEditModal(item)}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                  >
                    <Edit3 size={13} /> Edit / Reassign Activity
                  </button>

                  {isPending && isManager && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleReject(item.id)}
                        disabled={actionLoading === item.id}
                        className="px-4 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition"
                      >
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(item.id)}
                        disabled={actionLoading === item.id}
                        className="flex items-center gap-1.5 px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                      >
                        <Check size={14} /> Approve to Schedule
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT MODAL */}
      {editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit & Correct Update #{editingItem.id}
                </h3>
                <p className="text-xs text-slate-500">
                  Override discipline, event type, or manually pick the correct WBS activity.
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
                <label className="font-bold text-slate-700">Task Name</label>
                <input
                  type="text"
                  value={editFormData.extracted_task}
                  onChange={(e) => setEditFormData({ ...editFormData, extracted_task: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Reassign Matched Activity</label>
                <select
                  value={editFormData.matched_activity_id}
                  onChange={(e) => setEditFormData({ ...editFormData, matched_activity_id: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                >
                  <option value="">-- Select WBS Activity --</option>
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
                  Save & Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
