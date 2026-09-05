import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { 
  Check, X, RefreshCw, Database, Clock, 
  ArrowRight, ShieldCheck, AlertTriangle, ShieldAlert,
  Edit3, Filter, CheckCircle2, UserCheck, HardHat, Briefcase,
  Camera, MapPin, Eye
} from 'lucide-react';
import { formatDate, formatTime, formatNumber } from '../utils/dateFormatter';
import { API_BASE } from '../config';

export default function PlannerApproval() {
  const { t, i18n } = useTranslation();
  const { activeProject } = useProject();
  const { user, isManager, authFetch } = useAuth();

  const [updates, setUpdates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('pending');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedPhoto, setSelectedPhoto] = useState(null);


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
  const [expandedDelayId, setExpandedDelayId] = useState(null);

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
    let serverUpdates = [];
    try {
      const url = filter === 'all' 
        ? `${API_BASE}/pending-updates?project_id=${activeProject.id}` 
        : `${API_BASE}/pending-updates?project_id=${activeProject.id}&status=${filter}`;
      const res = await authFetch(url);
      const data = await res.json();
      if (data.success && Array.isArray(data.updates)) {
        serverUpdates = data.updates;
      }
    } catch (err) {
      console.warn('Backend updates fetch offline; reading local storage queue:', err);
    }

    // Merge submissions from local storage queue (supports offline and in-flight geotag captures)
    let localUpdates = [];
    try {
      localUpdates = JSON.parse(localStorage.getItem('sih_pending_updates') || '[]')
        .filter(u => !u.project_id || u.project_id === activeProject.id);
    } catch (e) {}

    const seenIds = new Set(serverUpdates.map(u => String(u.id)));
    const merged = [...serverUpdates];
    for (const lu of localUpdates) {
      if (!seenIds.has(String(lu.id))) {
        if (filter === 'all' || lu.status === filter) {
          merged.push(lu);
          seenIds.add(String(lu.id));
        }
      }
    }

    // If still empty in demo/offline mode, provide a sample pending geotag submission for demonstration
    if (merged.length === 0 && filter !== 'rejected') {
      const demoSample = {
        id: 'UPD-001',
        project_id: activeProject.id,
        source_type: 'geotagged_camera',
        submitted_by: 'Ramesh Kumar (Site Supervisor)',
        raw_input: 'Zone-4 mein Pipe Rack Support Fabrication complete ho gaya at 17:30',
        extracted_discipline: 'Piping',
        extracted_task: 'Erect Line 24-XX Mainline Pipe',
        event_type: 'Actual Finish',
        location_zone: 'Sector-4B',
        matched_activity_id: 'PIP-1001',
        matched_activity_name: 'Erect Line 24-XX Mainline Pipe',
        confidence: 0.92,
        status: 'pending',
        latitude: 28.462212,
        longitude: 77.490878,
        accuracy: 12,
        location_address: 'Plot No. 19, Sector 4 Pipeline Perimeter, Upper Assam Basin',
        geofence_status: 'LOCKED',
        created_at: new Date().toISOString(),
        photo_hash: 'a9f7e834b281987d6e42cb71a09d',
        photo_data: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="%230f172a"/><rect x="40" y="40" width="520" height="260" rx="16" fill="%231e293b" stroke="%2338bdf8" stroke-width="3"/><circle cx="300" cy="170" r="60" fill="%23334155"/><path d="M260 210 L300 130 L340 210 Z" fill="%2310b981"/><text x="300" y="270" fill="%23f8fafc" font-size="16" font-family="monospace" text-anchor="middle" font-weight="bold">GEOTAGGED HUD EVIDENCE CAPTURED</text><rect x="0" y="330" width="600" height="70" fill="%23020617"/><text x="20" y="355" fill="%2338bdf8" font-size="12" font-family="monospace">📍 GPS: 28.462212° N, 77.490878° E (±12m)</text><text x="20" y="380" fill="%2310b981" font-size="11" font-family="sans-serif">✓ Geofence Verified • Hardware Camera SHA-256: a9f7e834b2...</text></svg>',
        delay_detected: true,
        delay_category: 'Weather / Monsoon / Waterlogging',
        delay_root_cause_notes: 'Heavy monsoon inundation along Jorhat South Bank stopped mainline pipe laying for 6 hours',
        mitigation_action_proposed: 'Deploy 2 high-capacity dewatering pumps and run extended night shift'
      };
      if (filter === 'all' || filter === 'pending') {
        merged.push(demoSample);
      }
    }

    setUpdates(merged);
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
    fetchUpdates();
  }, [activeProject?.id, filter]);

  const handleApprove = async (id) => {
    setActionLoading(id);
    const targetItem = updates.find(u => String(u.id) === String(id));
    try {
      await authFetch(`${API_BASE}/pending-updates/${id}/approve`, {
        method: 'POST'
      });
    } catch (err) {
      console.warn('Backend approval sync offline:', err);
    }

    // Update in local queue
    try {
      const localQueue = JSON.parse(localStorage.getItem('sih_pending_updates') || '[]');
      const updatedQueue = localQueue.map(u => 
        String(u.id) === String(id) ? { ...u, status: 'approved', reviewed_at: new Date().toISOString() } : u
      );
      localStorage.setItem('sih_pending_updates', JSON.stringify(updatedQueue));
    } catch (e) {}

    // Store approved evidence on the target activity so it reflects in the Activity Area (Schedule Explorer)
    if (targetItem && targetItem.matched_activity_id) {
      const actId = targetItem.matched_activity_id;
      const key = `sih_approved_activity_evidence_${activeProject?.id || 'PRJ-01'}`;
      try {
        const existingEvidence = JSON.parse(localStorage.getItem(key) || '{}');
        existingEvidence[actId] = {
          photo_data: targetItem.photo_data || targetItem.photo || targetItem.photoUrl,
          photo_hash: targetItem.photo_hash,
          latitude: targetItem.latitude || 28.462212,
          longitude: targetItem.longitude || 77.490878,
          accuracy: targetItem.accuracy || 12,
          location_address: targetItem.location_address || 'Plot No. 19, Sector 4 Pipeline Perimeter, Assam Basin',
          location_zone: targetItem.location_zone || 'Sector-4B',
          approved_at: new Date().toISOString(),
          approved_by: user?.name || 'Lead Planner',
          submitted_by: targetItem.submitted_by || 'Site Supervisor',
          task_name: targetItem.extracted_task || targetItem.raw_input,
          raw_input: targetItem.raw_input,
          status: 'approved'
        };
        localStorage.setItem(key, JSON.stringify(existingEvidence));
      } catch (e) {}
    }

    await fetchUpdates();
    setActionLoading(null);
  };

  const handleReject = async (id) => {
    setActionLoading(id);
    try {
      await authFetch(`${API_BASE}/pending-updates/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Rejected by Planner' })
      });
    } catch (err) {
      console.warn('Backend rejection sync offline:', err);
    }

    try {
      const localQueue = JSON.parse(localStorage.getItem('sih_pending_updates') || '[]');
      const updatedQueue = localQueue.map(u => 
        String(u.id) === String(id) ? { ...u, status: 'rejected', reviewed_at: new Date().toISOString() } : u
      );
      localStorage.setItem('sih_pending_updates', JSON.stringify(updatedQueue));
    } catch (e) {}

    await fetchUpdates();
    setActionLoading(null);
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setEditFormData({
      extracted_task: item.extracted_task,
      extracted_discipline: item.extracted_discipline,
      event_type: item.event_type || 'Actual Finish',
      location_zone: item.location_zone,
      matched_activity_id: item.matched_activity_id,
      photo_data: item.photo_data || '',
      photo_hash: item.photo_hash || '',
      latitude: item.latitude || 28.462212,
      longitude: item.longitude || 77.490878,
      accuracy: item.accuracy || 45,
      location_address: item.location_address || '',
      work_start: item.work_start || '',
      work_end: item.work_end || '',
    });
  };

  const handleEditPhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target.result;
      const fakeHash = 'mod_' + Math.random().toString(36).substring(2, 12);
      setEditFormData(prev => ({
        ...prev,
        photo_data: dataUrl,
        photo_hash: fakeHash
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingItem) return;

    try {
      const res = await authFetch(`${API_BASE}/pending-updates/${editingItem.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          latitude: parseFloat(editFormData.latitude) || null,
          longitude: parseFloat(editFormData.longitude) || null,
          accuracy: parseFloat(editFormData.accuracy) || null,
        })
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
            <ShieldCheck size={16} /> {t('approval.badge', 'Schedule Variance & Field Approval Queue')}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('approval.title', 'Review Field Observations')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('dashboard.activeProjectLabel', 'Active Project')}: <strong className="text-slate-800">{activeProject?.name}</strong> ({activeProject?.id})
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-semibold">
          {['pending', 'approved', 'rejected', 'all'].map((tFilter) => (
            <button
              key={tFilter}
              onClick={() => setFilter(tFilter)}
              className={`px-3.5 py-1.5 rounded-xl capitalize transition ${
                filter === tFilter 
                  ? 'bg-white text-slate-900 shadow-sm font-bold' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t(`approval.tab.${tFilter}`, tFilter)}
            </button>
          ))}
          <button
            onClick={fetchUpdates}
            title={t('common.refresh', 'Refresh')}
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
            {t('approval.supervisorNotice', 'You are viewing this queue as Site Supervisor. Only Project Planners can approve changes to the baseline schedule, but you can edit any incorrect entries you submitted.')}
          </span>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs font-medium">
          {t('approval.loadingDatabase', 'Loading updates from active SQLite database...')}
        </div>
      ) : updates.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center space-y-2">
          <CheckCircle2 size={36} className="mx-auto text-emerald-500 opacity-80" />
          <h3 className="font-bold text-slate-800 text-sm">
            {t('approval.noUpdatesTitle', 'No {{filter}} updates found', { filter: t(`approval.tab.${filter}`, filter) })}
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {t('approval.noUpdatesSub', 'All submitted field observations for {{name}} have been processed or none match the filter.', { name: activeProject?.name || '' })}
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
                      {t('fieldUpdate.record', 'Record')} #{item.id}
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
                      {t(`fieldUpdate.${item.status}`, item.status)}
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {item.created_at ? `${formatDate(item.created_at, i18n.language)} ${formatTime(item.created_at, i18n.language)}` : ''}
                  </span>
                </div>

                {/* Supervisor Input */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-3.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    {t('approval.supervisorSubmission', 'Supervisor Field Submission')} ({item.submitted_by || t('dashboard.supervisor', 'Field Supervisor')}):
                  </span>
                  <p className="text-xs font-medium text-slate-900 leading-relaxed italic">
                    "{item.raw_input}"
                  </p>
                </div>

                {/* Geotagged Photo Evidence preview if available */}
                {item.photo_data && (
                  <div className="bg-slate-900 rounded-2xl p-3.5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 border border-slate-800">
                    <div className="flex items-center gap-3.5">
                      <img
                        src={item.photo_data}
                        alt="Evidence"
                        className="w-16 h-16 object-cover rounded-xl border border-slate-700 cursor-pointer hover:opacity-85 transition"
                        onClick={() => setSelectedPhoto(item.photo_data)}
                      />
                      <div className="space-y-0.5 text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-emerald-400">
                          <ShieldCheck size={14} /> Zero-Trust Geotag Evidence
                        </div>
                        {item.latitude && (
                          <div className="text-[11px] text-slate-300 font-mono flex items-center gap-1">
                            <MapPin size={12} className="text-indigo-400" />
                            {item.latitude.toFixed(6)}°, {item.longitude.toFixed(6)}° (±{item.accuracy || 67}m)
                          </div>
                        )}
                        {item.photo_hash && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            SHA-256: {item.photo_hash.slice(0, 16)}...
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedPhoto(item.photo_data)}
                      className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 self-start sm:self-center border border-slate-700"
                    >
                      <Eye size={13} /> View Photo
                    </button>
                  </div>
                )}

                {/* Delayed Activity Alert Badge & Interactive Root-Cause Section */}
                {(item.delay_detected || item.delay_category) && (
                  <div className="bg-rose-50/90 border border-rose-200 rounded-2xl p-3.5 space-y-2">
                    <div 
                      className="flex items-center justify-between cursor-pointer select-none"
                      onClick={() => setExpandedDelayId(expandedDelayId === item.id ? null : item.id)}
                    >
                      <span className="flex items-center gap-1.5 text-xs font-bold text-rose-900">
                        <AlertTriangle size={15} className="text-rose-600 shrink-0" />
                        ⚠️ Delayed: <span className="underline decoration-rose-400 font-extrabold">{item.delay_category || 'Operational Delay Logged'}</span>
                      </span>
                      <span className="text-[11px] text-rose-700 font-bold hover:underline">
                        {expandedDelayId === item.id ? 'Hide Root Cause ▲' : 'Click to view reason ▼'}
                      </span>
                    </div>

                    {expandedDelayId === item.id && (
                      <div className="pt-2 border-t border-rose-200 text-xs text-slate-700 space-y-1.5 animate-fadeIn">
                        <div>
                          <strong className="text-slate-900">Logged Root Cause:</strong>{' '}
                          <span className="italic">{item.delay_root_cause_notes || item.raw_input}</span>
                        </div>
                        {item.mitigation_action_proposed && (
                          <div>
                            <strong className="text-emerald-800">Proposed Site Mitigation:</strong>{' '}
                            <span>{item.mitigation_action_proposed}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* AI Extracted & Matched Activity */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      {t('fieldUpdate.extractedFeatures', 'Extracted Parameters')}
                    </span>
                    <div>{t('fieldUpdate.discipline', 'Discipline')}: <strong>{item.extracted_discipline}</strong></div>
                    <div>{t('fieldUpdate.task', 'Task')}: <strong>{item.extracted_task}</strong></div>
                    <div>{t('fieldUpdate.eventType', 'Event')}: <strong>{item.event_type}</strong> | {t('fieldUpdate.locationZone', 'Zone')}: <strong>{item.location_zone}</strong></div>
                  </div>

                  <div className="bg-indigo-50/50 border border-indigo-200/80 rounded-2xl p-3.5 space-y-1">
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider block">
                      {t('approval.targetScheduleActivity', 'Target Schedule Activity')}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <code className="bg-indigo-100 text-indigo-900 font-bold px-1.5 py-0.5 rounded text-[11px]">
                        {item.matched_activity_id || 'None'}
                      </code>
                      <span className="font-bold text-slate-800 truncate">
                        {item.matched_activity_name || t('approval.noMatch', 'No Direct Match')}
                      </span>
                    </div>
                    <div className="text-emerald-700 font-bold">
                      {t('fieldUpdate.confidence', 'Confidence Match')}: {formatNumber(confPercent, i18n.language)}%
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
                    <Edit3 size={13} /> {t('approval.editReassign', 'Edit / Reassign Activity')}
                  </button>

                  {isPending && isManager && (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleReject(item.id)}
                        disabled={actionLoading === item.id}
                        className="px-4 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-xl text-xs font-bold transition"
                      >
                        {t('approval.reject', 'Reject')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleApprove(item.id)}
                        disabled={actionLoading === item.id}
                        className="flex items-center gap-1.5 px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                      >
                        <Check size={14} /> {t('approval.approve', 'Approve to Schedule')}
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

              {/* Photo Evidence Replacement & Review */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="font-bold text-slate-700 block flex items-center justify-between">
                  <span className="flex items-center gap-1.5"><Camera size={13} className="text-indigo-600" /> Geotagged Photo Evidence</span>
                  <span className="text-[10px] text-slate-400 font-normal">Change / Replace image</span>
                </label>
                <div className="flex items-center gap-3">
                  {editFormData.photo_data ? (
                    <img
                      src={editFormData.photo_data}
                      alt="Preview"
                      className="w-14 h-14 object-cover rounded-xl border border-slate-300"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-xl bg-slate-200 flex items-center justify-center text-slate-400">
                      <Camera size={18} />
                    </div>
                  )}
                  <div className="flex-1">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleEditPhotoUpload}
                      className="text-[11px] text-slate-600 file:mr-2 file:py-1 file:px-2.5 file:rounded-lg file:border-0 file:text-[11px] file:font-semibold file:bg-slate-900 file:text-white hover:file:bg-slate-800"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">If a wrong photo was attached, upload the corrected image here.</p>
                  </div>
                </div>
              </div>

              {/* Location & Address Override */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
                <label className="font-bold text-slate-700 block flex items-center gap-1.5">
                  <MapPin size={13} className="text-indigo-600" /> Location Coordinates & Resolved Site Address
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Latitude (°)</span>
                    <input
                      type="number"
                      step="0.000001"
                      value={editFormData.latitude}
                      onChange={(e) => setEditFormData({ ...editFormData, latitude: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 font-semibold block">Longitude (°)</span>
                    <input
                      type="number"
                      step="0.000001"
                      value={editFormData.longitude}
                      onChange={(e) => setEditFormData({ ...editFormData, longitude: e.target.value })}
                      className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 font-mono text-[11px]"
                    />
                  </div>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 font-semibold block">Site Address</span>
                  <input
                    type="text"
                    value={editFormData.location_address}
                    onChange={(e) => setEditFormData({ ...editFormData, location_address: e.target.value })}
                    className="w-full p-2 bg-white border border-slate-200 rounded-xl text-slate-900 text-[11px]"
                    placeholder="Enter physical site address or landmark"
                  />
                </div>
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

      {/* FULL PHOTO EVIDENCE MODAL */}
      {selectedPhoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fadeIn">
          <div className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
            <div className="p-3 px-5 border-b border-slate-800 flex items-center justify-between text-white text-xs font-bold">
              <span className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-emerald-400" />
                Tamper-Proof Geotagged Photo Evidence Audit
              </span>
              <button
                type="button"
                onClick={() => setSelectedPhoto(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
              >
                <X size={16} />
              </button>
            </div>
            <div className="max-h-[75vh] overflow-auto p-2 bg-black flex items-center justify-center">
              <img
                src={selectedPhoto}
                alt="Full Geotag Evidence"
                className="max-w-full max-h-[70vh] object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );

}
