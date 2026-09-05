import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { 
  Table2, Search, Filter, RefreshCw, Calendar, 
  AlertCircle, CheckCircle, Clock, Database, Edit3, Plus, X, Save, Check
} from 'lucide-react';
import { formatDate, formatNumber } from '../utils/dateFormatter';
import { API_BASE } from '../config';

export default function ScheduleExplorer() {
  const { t, i18n } = useTranslation();
  const { activeProject } = useProject();
  const { isManager, authFetch } = useAuth();

  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [disciplineFilter, setDisciplineFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');

  // Edit Activity Modal
  const [editingActivity, setEditingActivity] = useState(null);
  const [editFormData, setEditFormData] = useState({
    activity_name: '',
    discipline: '',
    planned_start: '',
    planned_end: '',
    actual_start: '',
    actual_end: '',
    status: 'In Progress',
    percent_complete: 0,
    location_zone: '',
  });

  // Create Activity Modal
  const [isCreating, setIsCreating] = useState(false);
  const [createFormData, setCreateFormData] = useState({
    activity_id: '',
    activity_name: '',
    discipline: 'Piping',
    planned_start: '2026-05-01',
    planned_end: '2026-05-30',
    planned_duration_days: 30,
    location_zone: 'Zone-1',
  });

  const fetchSchedule = async () => {
    if (!activeProject?.id) {
      setActivities([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const url = `${API_BASE}/schedule/activities?project_id=${activeProject.id}`;
      const res = await authFetch(url);
      const data = await res.json();
      if (data.success) {
        setActivities(data.activities);
      }
    } catch (err) {
      console.error('Failed to fetch schedule activities:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedule();
  }, [activeProject?.id]);

  const disciplines = ['All', ...new Set(activities.map((a) => a.discipline))];

  const filtered = activities.filter((a) => {
    const matchesSearch =
      a.activity_name.toLowerCase().includes(search.toLowerCase()) || 
      a.activity_id.toLowerCase().includes(search.toLowerCase()) ||
      a.location_zone.toLowerCase().includes(search.toLowerCase());
    const matchesDisc = disciplineFilter === 'All' || a.discipline === disciplineFilter;
    const matchesStatus = statusFilter === 'All' || a.status === statusFilter;
    return matchesSearch && matchesDisc && matchesStatus;
  });

  const calculateDelay = (plannedEnd, actualEnd) => {
    if (!actualEnd || !plannedEnd) return 0;
    const diff = new Date(actualEnd) - new Date(plannedEnd);
    return Math.round(diff / (1000 * 60 * 60 * 24));
  };

  const openEditModal = (act) => {
    setEditingActivity(act);
    setEditFormData({
      activity_name: act.activity_name,
      discipline: act.discipline,
      planned_start: act.planned_start,
      planned_end: act.planned_end,
      actual_start: act.actual_start || '',
      actual_end: act.actual_end || '',
      status: act.status,
      percent_complete: act.percent_complete || 0,
      location_zone: act.location_zone,
    });
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    if (!editingActivity) return;

    try {
      const res = await authFetch(`${API_BASE}/schedule/activities/${editingActivity.activity_id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editFormData,
          actual_start: editFormData.actual_start || null,
          actual_end: editFormData.actual_end || null,
          percent_complete: parseInt(editFormData.percent_complete, 10) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Failed to update activity');
      }

      setEditingActivity(null);
      await fetchSchedule();
    } catch (err) {
      alert(`Error updating activity in database: ${err.message}`);
    }
  };

  const handleCreateActivity = async (e) => {
    e.preventDefault();
    if (!activeProject?.id) return;
    try {
      const res = await authFetch(`${API_BASE}/schedule/activities`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...createFormData,
          project_id: activeProject.id,
        }),
      });

      if (res.ok) {
        setIsCreating(false);
        fetchSchedule();
      }
    } catch (err) {
      alert(`Error creating activity: ${err.message}`);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <Database size={16} /> {t('schedule.wbsDatabase', 'Active SQLite WBS Database')}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('schedule.title', 'Schedule Explorer')}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t('schedule.filteredTo', 'Filtered to')}: <strong className="text-slate-800">{activeProject?.name}</strong> ({activities.length} {t('dashboard.activities', 'activities')})
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isManager && (
            <button
              type="button"
              onClick={() => setIsCreating(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
            >
              <Plus size={15} /> {t('schedule.addActivity', 'Add Activity')}
            </button>
          )}

          <button
            onClick={fetchSchedule}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-200"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {t('common.refresh', 'Refresh')}
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={t('schedule.searchPlaceholder', 'Search by Activity ID, task name, zone...')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-slate-900 font-medium"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto text-xs">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Filter size={13} className="text-slate-400" />
            <span className="font-bold text-slate-600">{t('schedule.discipline', 'Discipline')}:</span>
            <select
              value={disciplineFilter}
              onChange={(e) => setDisciplineFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              {disciplines.map((d) => (
                <option key={d} value={d}>{d === 'All' ? t('common.all', 'All') : d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <span className="font-bold text-slate-600">{t('schedule.status', 'Status')}:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-transparent font-semibold text-slate-800 focus:outline-none cursor-pointer"
            >
              <option value="All">{t('common.all', 'All')}</option>
              <option value="Not Started">{t('schedule.notStarted', 'Not Started')}</option>
              <option value="In Progress">{t('schedule.inProgress', 'In Progress')}</option>
              <option value="Completed">{t('schedule.completed', 'Completed')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3.5 px-4">{t('schedule.activityId', 'Activity ID')}</th>
                <th className="py-3.5 px-4">{t('schedule.taskNameWbs', 'Task Name & WBS')}</th>
                <th className="py-3.5 px-4">{t('schedule.discipline', 'Discipline')}</th>
                <th className="py-3.5 px-4">{t('schedule.zone', 'Zone')}</th>
                <th className="py-3.5 px-4">{t('schedule.plannedDates', 'Planned Dates')}</th>
                <th className="py-3.5 px-4">{t('schedule.actualDates', 'Actual Dates')}</th>
                <th className="py-3.5 px-4">{t('schedule.progress', 'Progress')}</th>
                <th className="py-3.5 px-4">{t('schedule.status', 'Status')}</th>
                <th className="py-3.5 px-4 text-right">{t('common.actions', 'Actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    {t('schedule.loadingDatabase', 'Loading Primavera activities from SQLite...')}
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    {t('schedule.noMatchingActivities', 'No matching activities found for {{name}}.', { name: activeProject?.name || '' })}
                  </td>
                </tr>
              ) : (
                filtered.map((act) => {
                  const delay = calculateDelay(act.planned_end, act.actual_end);
                  const isDelayed = delay > 0;

                  return (
                    <tr key={act.activity_id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-700">
                        {act.activity_id}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="font-bold text-slate-900 truncate">
                          {act.activity_name}
                        </div>
                        <div className="text-[10px] text-slate-400 truncate">
                          {act.wbs_path || `${act.project_id} > ${act.discipline}`}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px]">
                          {act.discipline}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-600">
                        {act.location_zone}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                        <div>{formatDate(act.planned_start, i18n.language)}</div>
                        <div className="text-slate-400">to {formatDate(act.planned_end, i18n.language)}</div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] whitespace-nowrap">
                        {act.actual_start ? (
                          <div>
                            <div>{formatDate(act.actual_start, i18n.language)}</div>
                            <div className="text-slate-400">{act.actual_end ? `to ${formatDate(act.actual_end, i18n.language)}` : '(ongoing)'}</div>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                act.percent_complete === 100 ? 'bg-emerald-500' : 'bg-indigo-600'
                              }`}
                              style={{ width: `${act.percent_complete}%` }}
                            />
                          </div>
                          <span className="font-bold text-[11px]">{formatNumber(act.percent_complete, i18n.language)}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          act.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : act.status === 'In Progress'
                            ? 'bg-sky-100 text-sky-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {act.status === 'Completed' ? t('schedule.completed', 'Completed') : act.status === 'In Progress' ? t('schedule.inProgress', 'In Progress') : t('schedule.notStarted', 'Not Started')}
                        </span>
                        {isDelayed && (
                          <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-700">
                            +{formatNumber(delay, i18n.language)}d
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => openEditModal(act)}
                          className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-200 transition"
                          title="Edit Activity in SQLite"
                        >
                          <Edit3 size={14} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* EDIT ACTIVITY MODAL */}
      {editingActivity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Edit Activity {editingActivity.activity_id}
                </h3>
                <p className="text-xs text-slate-500">
                  Update dates, progress percentage, or execution status in SQLite.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingActivity(null)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveActivity} className="space-y-3 text-xs">
              <div className="space-y-1">
                <label className="font-bold text-slate-700">Activity Name</label>
                <input
                  type="text"
                  value={editFormData.activity_name}
                  onChange={(e) => setEditFormData({ ...editFormData, activity_name: e.target.value })}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Discipline</label>
                  <input
                    type="text"
                    value={editFormData.discipline}
                    onChange={(e) => setEditFormData({ ...editFormData, discipline: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
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

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Planned Start</label>
                  <input
                    type="date"
                    value={editFormData.planned_start}
                    onChange={(e) => setEditFormData({ ...editFormData, planned_start: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Planned End</label>
                  <input
                    type="date"
                    value={editFormData.planned_end}
                    onChange={(e) => setEditFormData({ ...editFormData, planned_end: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Actual Start</label>
                  <input
                    type="date"
                    value={editFormData.actual_start}
                    onChange={(e) => setEditFormData({ ...editFormData, actual_start: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Actual End</label>
                  <input
                    type="date"
                    value={editFormData.actual_end}
                    onChange={(e) => setEditFormData({ ...editFormData, actual_end: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Status</label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  >
                    <option value="Not Started">Not Started</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Percent Complete ({editFormData.percent_complete}%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editFormData.percent_complete}
                    onChange={(e) => setEditFormData({ ...editFormData, percent_complete: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-bold shadow-sm"
                >
                  Save Activity to SQLite
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE ACTIVITY MODAL */}
      {isCreating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl border border-slate-200 w-full max-w-lg shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Add New Activity to {activeProject?.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Insert a new Primavera schedule task into the active database.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Activity ID</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PIP-1015"
                    value={createFormData.activity_id}
                    onChange={(e) => setCreateFormData({ ...createFormData, activity_id: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Discipline</label>
                  <select
                    value={createFormData.discipline}
                    onChange={(e) => setCreateFormData({ ...createFormData, discipline: e.target.value })}
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

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Task Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Hydrostatic testing of line 32-YY"
                  value={createFormData.activity_name}
                  onChange={(e) => setCreateFormData({ ...createFormData, activity_name: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Planned Start</label>
                  <input
                    type="date"
                    required
                    value={createFormData.planned_start}
                    onChange={(e) => setCreateFormData({ ...createFormData, planned_start: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Planned End</label>
                  <input
                    type="date"
                    required
                    value={createFormData.planned_end}
                    onChange={(e) => setCreateFormData({ ...createFormData, planned_end: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-bold text-slate-700">Location Zone</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sector-4A or Unit-2"
                  value={createFormData.location_zone}
                  onChange={(e) => setCreateFormData({ ...createFormData, location_zone: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-medium"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 hover:bg-slate-100 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm"
                >
                  Create Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
