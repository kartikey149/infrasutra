import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Layers, 
  RefreshCw,
  FileSpreadsheet,
  Eye,
  Calendar,
} from 'lucide-react';
import { mockApi } from '../services/mockApi';
import XerImporterModal from '../components/XerImporterModal';
import TaskDetailModal from '../components/TaskDetailModal';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';

export default function Schedule() {
  const { activeProject } = useProject();
  const { authFetch } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState('All');

  // Modal States
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [selectedTaskDetail, setSelectedTaskDetail] = useState(null);

  const loadTasks = async () => {
    setLoading(true);
    if (activeProject?.id) {
      try {
        const res = await authFetch(`${API_BASE}/schedule/activities?project_id=${activeProject.id}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.activities) && data.activities.length > 0) {
            const mapped = data.activities.map((a) => {
              const pStart = a.planned_start || '2026-04-01';
              const pEnd = a.planned_end || '2026-06-30';
              const aEnd = a.actual_end;
              let variance = 0;
              if (aEnd && pEnd) {
                variance = Math.round((new Date(aEnd) - new Date(pEnd)) / (1000 * 60 * 60 * 24));
              }
              return {
                wbs: a.activity_id,
                name: a.activity_name,
                discipline: a.discipline,
                baselineStart: pStart,
                baselineEnd: pEnd,
                actualStart: a.actual_start,
                actualEnd: a.actual_end,
                plannedProgress: a.status === 'Completed' ? 100 : a.status === 'In Progress' ? 60 : 20,
                actualProgress: a.percent_complete || 0,
                varianceDays: variance,
                status: a.status === 'Completed' ? 'Completed' : a.status === 'In Progress' ? 'In Progress' : 'On Track',
                criticalPath: a.discipline === 'Civil' || a.discipline === 'Piping',
                locationZone: a.location_zone,
                rawActivity: a
              };
            });
            setTasks(mapped);
            setLoading(false);
            return;
          }
        }
      } catch (err) {
        console.warn('Could not fetch SQLite schedule activities, using fallback:', err);
      }
    }
    mockApi.getTasks().then((data) => {
      setTasks(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadTasks();
  }, [activeProject?.id]);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.wbs.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter =
      selectedFilter === 'All' ||
      (selectedFilter === 'Delayed' && task.status === 'Delayed') ||
      (selectedFilter === 'Critical Path' && task.criticalPath) ||
      (selectedFilter === 'On Track' && task.status === 'On Track');
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-[calc(100vh-65px)] text-slate-900 space-y-6 pb-24 sm:pb-8">
      {/* Top Header Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-100 border border-indigo-200 text-indigo-800">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Primavera P6 Schedule Workspace</h1>
              <p className="text-xs text-slate-500">
                Active CPM Schedule Baselines & Live Field Execution Sync
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsImporterOpen(true)}
            className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition shadow-sm"
          >
            <FileSpreadsheet size={15} className="text-emerald-700" /> Import .XER / .XML
          </button>
          <button
            onClick={loadTasks}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm"
          >
            <RefreshCw size={14} /> Refresh Schedule
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-center bg-white p-3.5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search WBS code or task name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-10 pr-3.5 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-900 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Filter size={14} className="text-slate-500 shrink-0 mr-1" />
          {['All', 'Critical Path', 'Delayed', 'On Track'].map((filter) => (
            <button
              key={filter}
              onClick={() => setSelectedFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition shrink-0 ${
                selectedFilter === filter
                  ? 'bg-slate-900 text-white shadow-sm font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Task & Gantt Schedule Visualizer */}
      <div className="bg-white border border-slate-200/90 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading Primavera schedule tasks...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4">WBS Code</th>
                  <th className="py-3.5 px-4">Task Description</th>
                  <th className="py-3.5 px-4">Baseline Timeline</th>
                  <th className="py-3.5 px-4">Execution vs Planned</th>
                  <th className="py-3.5 px-4">Variance</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Audit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs text-slate-700">
                {filteredTasks.map((task) => (
                  <tr key={task.wbs} className="hover:bg-slate-50 transition">
                    <td className="py-4 px-4 font-mono font-bold text-slate-900">
                      {task.wbs}
                      {task.criticalPath && (
                        <span className="ml-2 px-1.5 py-0.5 text-[9px] bg-rose-100 text-rose-800 border border-rose-300 rounded-md font-bold">
                          CP
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-4 font-semibold text-slate-900">{task.name}</td>
                    <td className="py-4 px-4 text-slate-500">
                      <div className="flex items-center gap-1 text-[11px]">
                        <Calendar size={12} className="text-slate-400" />
                        <span>{task.baselineStart} &rarr; {task.baselineEnd}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4 w-60">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-emerald-700 font-semibold">Actual: {task.actualProgress}%</span>
                          <span className="text-slate-500">Plan: {task.plannedProgress}%</span>
                        </div>
                        <div className="w-full h-2 bg-slate-200 rounded-full overflow-hidden relative">
                          <div
                            className="h-full bg-slate-400/40 absolute top-0 left-0"
                            style={{ width: `${task.plannedProgress}%` }}
                          />
                          <div
                            className={`h-full relative z-10 ${
                              task.actualProgress < task.plannedProgress ? 'bg-amber-500' : 'bg-emerald-600'
                            }`}
                            style={{ width: `${task.actualProgress}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 font-mono">
                      {task.varianceDays < 0 ? (
                        <span className="text-rose-600 font-bold">{task.varianceDays} Days</span>
                      ) : (
                        <span className="text-emerald-600 font-bold">0 Days</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setSelectedTaskDetail(task)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition border border-slate-300"
                        title="View Geotag Proofs"
                      >
                        <Eye size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <XerImporterModal
        isOpen={isImporterOpen}
        onClose={() => setIsImporterOpen(false)}
        onImportSuccess={loadTasks}
      />

      <TaskDetailModal
        task={selectedTaskDetail}
        onClose={() => setSelectedTaskDetail(null)}
      />
    </div>
  );
}

function StatusBadge({ status }) {
  switch (status) {
    case 'Completed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 size={12} /> Completed
        </span>
      );
    case 'Delayed':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
          <AlertTriangle size={12} /> Delayed
        </span>
      );
    case 'On Track':
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-200 text-slate-800 border border-slate-300">
          <Clock size={12} /> On Track
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300">
          Pending
        </span>
      );
  }
}