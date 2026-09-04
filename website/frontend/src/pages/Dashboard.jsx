import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useProject } from '../context/ProjectContext';
import { mockApi } from '../services/mockApi';
import {
  LayoutDashboard,
  Activity,
  TrendingUp,
  AlertTriangle,
  Mic,
  Clock,
  HardHat,
  RefreshCw,
  Zap,
  Bot,
  ArrowRight,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { API_BASE } from '../config';

export default function Dashboard() {
  const { user, authFetch } = useAuth();
  const { activeProject, projects } = useProject();
  const [metrics, setMetrics] = useState({
    plannedCompletion: '0%',
    actualExecution: '0%',
    scheduleVariance: '0%',
    spiIndex: '1.00',
    delayedTasksCount: 0,
  });
  const [tasks, setTasks] = useState([]);
  const [voiceLogs, setVoiceLogs] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboardData = async () => {
    if (!activeProject?.id) {
      setTasks([]);
      setVoiceLogs([]);
      setMetrics({
        plannedCompletion: '0%',
        actualExecution: '0%',
        scheduleVariance: '0%',
        spiIndex: '1.00',
        delayedTasksCount: 0,
      });
      return;
    }

    setRefreshing(true);
    try {
      const projId = activeProject.id;
      const [analyticsRes, activitiesRes, updatesRes] = await Promise.all([
        authFetch(`${API_BASE}/analytics/summary?project_id=${projId}`),
        authFetch(`${API_BASE}/schedule/activities?project_id=${projId}`),
        authFetch(`${API_BASE}/pending-updates?project_id=${projId}`)
      ]);

      const analyticsData = await analyticsRes.json();
      const activitiesData = await activitiesRes.json();
      const updatesData = await updatesRes.json();

      if (analyticsData.success) {
        const a = analyticsData.analytics;
        const total = a.total || 1;
        const actualPct = Math.round(((a.completed + a.inProgress * 0.5) / total) * 100);
        const plannedPct = activeProject?.progress || 0;
        const variance = actualPct - plannedPct;
        const spi = (actualPct / (plannedPct || 1)).toFixed(2);

        setMetrics({
          plannedCompletion: `${plannedPct}%`,
          actualExecution: `${actualPct}%`,
          scheduleVariance: `${variance >= 0 ? '+' : ''}${variance}%`,
          spiIndex: spi,
          delayedTasksCount: a.delayed || 0,
        });
      }

      if (activitiesData.success) {
        setTasks(activitiesData.activities.map(act => ({
          id: act.activity_id,
          wbs: act.wbs_level ? `WBS-${act.wbs_level}` : act.discipline,
          name: act.activity_name,
          baselineStart: act.planned_start,
          baselineEnd: act.planned_end,
          actualProgress: act.percent_complete,
          plannedProgress: act.status === 'Completed' ? 100 : act.status === 'In Progress' ? 50 : 0,
          varianceDays: act.actual_end && act.planned_end && act.actual_end > act.planned_end ? -Math.round((new Date(act.actual_end) - new Date(act.planned_end))/(86400000)) : 0,
          status: act.status,
          criticalPath: act.discipline === 'Piping' || act.discipline === 'Civil'
        })));
      }

      if (updatesData.success) {
        setVoiceLogs(updatesData.updates.map(u => ({
          id: u.id,
          timestamp: u.created_at ? u.created_at.slice(11, 19) : 'Just now',
          supervisor: u.submitted_by || 'Site Supervisor',
          transcription: u.raw_input,
          aiAnalysis: `Matched to ${u.matched_activity_id || 'None'} (${Math.round((u.confidence || 0) * 100)}% conf)`
        })));
      }
    } catch (err) {
      console.error('Error loading dashboard data from SQLite:', err);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [activeProject?.id]);

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-[calc(100vh-65px)] text-slate-900 space-y-6 pb-24 sm:pb-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200/90 p-5 rounded-3xl shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-500/10 to-orange-500/10 border border-amber-300 text-amber-600 flex items-center justify-center shrink-0">
            <LayoutDashboard className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Project Control & Schedule-Linking Center
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                Oil India PS-122
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Active Project: <strong className="text-slate-800">{activeProject?.name || 'Sector 4 Pipeline Alignment'}</strong> &bull; Site: {activeProject?.location || 'Dibrugarh'}
            </p>
          </div>
        </div>

        {/* Quick Links & Refresh */}
        <div className="flex items-center gap-2">
          <Link
            to="/approval"
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
          >
            Planner Queue <ArrowRight size={14} />
          </Link>
          <button
            type="button"
            onClick={loadDashboardData}
            disabled={refreshing}
            className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-300 text-xs font-semibold text-slate-700 transition flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Empty Project Assignment Banner (Scenario 6) */}
      {projects.length === 0 && (
        <div className="p-6 bg-amber-50/80 border border-amber-200 rounded-2xl text-center space-y-2">
          <div className="w-10 h-10 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
            <HardHat className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-amber-900">No Projects Assigned to Your Account</h3>
          <p className="text-xs text-amber-700 max-w-md mx-auto">
            Logged in as <strong>{user?.name}</strong> ({user?.role}). You currently have no active project assignments in the database. Projects will appear here once assigned by a Project Planner.
          </p>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progress Execution */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl space-y-3 shadow-sm relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span className="font-semibold">Execution Progress</span>
            <Activity className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{metrics.actualExecution}</span>
            <span className="text-[11px] text-slate-500">Target: {metrics.plannedCompletion}</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200">
            <div
              className="bg-gradient-to-r from-indigo-600 to-amber-500 h-full rounded-full transition-all duration-500"
              style={{ width: metrics.actualExecution }}
            />
          </div>
        </div>

        {/* Schedule Variance */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl space-y-3 shadow-sm relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span className="font-semibold">Schedule Slip</span>
            <TrendingUp className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">
              {metrics.scheduleVariance}
            </span>
            <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
              Behind Baseline
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Planned vs actual duration delta
          </p>
        </div>

        {/* SPI Index */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl space-y-3 shadow-sm relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span className="font-semibold">Schedule Performance (SPI)</span>
            <Zap className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-slate-900">{metrics.spiIndex}</span>
            <span className="text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              0.81 Ratio
            </span>
          </div>
          <p className="text-[11px] text-slate-500">
            Execution efficiency (&lt; 1.0 indicates delay)
          </p>
        </div>

        {/* Critical Path Delays */}
        <div className="bg-white border border-slate-200/90 p-4 rounded-2xl space-y-3 shadow-sm relative overflow-hidden group hover:border-slate-300 transition">
          <div className="flex justify-between items-center text-xs text-slate-500">
            <span className="font-semibold">Delayed WBS Activities</span>
            <AlertTriangle className="w-4 h-4 text-rose-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold text-rose-600">{metrics.delayedTasksCount}</span>
            <span className="text-[11px] text-slate-500">Critical Tasks</span>
          </div>
          <p className="text-[11px] text-rose-600 font-medium">
            Requires planner review & re-baselining
          </p>
        </div>
      </div>

      {/* Main Grid: Live Telegram Voice Feed & Architecture Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Field Supervisor Live Voice Feed */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700">
                  <Mic className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Live Field Supervisor Voice Feed</h2>
                  <p className="text-[11px] text-slate-500">Telegram Bot & Groq Whisper STT Stream</p>
                </div>
              </div>
              <a 
                href="https://t.me/splashers_v1_bot"
                target="_blank"
                rel="noopener noreferrer"
                className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center gap-1.5 hover:bg-indigo-100 transition"
              >
                <Bot size={12} /> @splashers_v1_bot ↗
              </a>
            </div>

            <div className="mt-4">
              {voiceLogs.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                  <Mic className="w-8 h-8 text-amber-500 mx-auto" />
                  <p className="text-xs text-slate-700 font-semibold">No live voice reports recorded yet.</p>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    Send a voice note to <strong className="text-indigo-600">@splashers_v1_bot</strong> on Telegram. It transcribes in real time and links directly to the schedule.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {voiceLogs.map((log) => (
                    <div
                      key={log.id || Math.random()}
                      className="bg-amber-50/50 p-4 rounded-2xl border-l-4 border-amber-500 border border-amber-200/80 space-y-2 hover:border-amber-300 transition"
                    >
                      <div className="flex justify-between items-center text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <HardHat className="w-3.5 h-3.5 text-amber-700" /> {log.supervisor || 'Site Engineer'}
                        </span>
                        <span className="font-mono text-slate-500">{log.timestamp}</span>
                      </div>
                      <p className="text-xs font-medium text-slate-900 italic bg-white p-2.5 rounded-xl border border-slate-200">
                        "{log.transcription}"
                      </p>
                      {log.aiAnalysis && (
                        <div className="p-2 rounded-xl bg-slate-900 text-[11px] text-amber-300 font-mono">
                          {log.aiAnalysis}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">New logs queue directly for approval</span>
            <Link to="/approval" className="font-bold text-indigo-600 hover:underline flex items-center gap-1">
              Review Queue &rarr;
            </Link>
          </div>
        </div>

        {/* SIH26122 Architecture Flow Card (Replacing irrelevant XGBoost) */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">How SIH26122 Solves the Problem</h2>
                  <p className="text-[11px] text-slate-500">Intelligent Data Capture & Schedule-Linking Layer</p>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Active Architecture
              </span>
            </div>

            <div className="mt-4 space-y-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-800 font-bold flex items-center justify-center shrink-0 text-xs">1</span>
                <div>
                  <h4 className="font-bold text-slate-900">Unstructured Ingestion (Field)</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Supervisors speak or type updates in Hinglish or English via Telegram or web app.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-indigo-100 text-indigo-800 font-bold flex items-center justify-center shrink-0 text-xs">2</span>
                <div>
                  <h4 className="font-bold text-slate-900">AI Entity Extraction & Matching</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    LLaMA-3 parses discipline and task. TF-IDF + fuzzy matching pairs it with exact L5/L6 activities.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-start gap-3">
                <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center shrink-0 text-xs">3</span>
                <div>
                  <h4 className="font-bold text-slate-900">Human-in-the-Loop Verification</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Planners review confidence scores and approve updates with 1-click to prevent bad data in Primavera.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-xs">
            <span className="text-slate-500">198 WBS Activities loaded in SQLite</span>
            <Link to="/schedule-explorer" className="font-bold text-indigo-600 hover:underline flex items-center gap-1">
              Explore Schedule &rarr;
            </Link>
          </div>
        </div>
      </div>

      {/* Active WBS Task Status Table */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-5 space-y-4 shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 pb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-700" /> Active Primavera P6 Schedule Status
          </h2>
          <Link to="/schedule-explorer" className="text-xs font-bold text-indigo-600 hover:underline">
            View All 198 Activities &rarr;
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="px-3 py-3 rounded-l-xl">WBS Code</th>
                <th className="px-3 py-3">Task Name</th>
                <th className="px-3 py-3">Planned</th>
                <th className="px-3 py-3">Actual Execution</th>
                <th className="px-3 py-3">Variance</th>
                <th className="px-3 py-3 rounded-r-xl">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {tasks.map((task) => (
                <tr key={task.id} className="hover:bg-slate-50/70 transition">
                  <td className="px-3 py-3 font-mono font-bold text-indigo-700">{task.wbs}</td>
                  <td className="px-3 py-3 font-bold text-slate-900">{task.name}</td>
                  <td className="px-3 py-3 text-slate-500">{task.plannedProgress}%</td>
                  <td className="px-3 py-3 font-semibold text-slate-900">{task.actualProgress}%</td>
                  <td className="px-3 py-3">
                    <span
                      className={`font-semibold ${
                        task.varianceDays < 0 ? 'text-rose-600' : 'text-emerald-700'
                      }`}
                    >
                      {task.varianceDays} Days
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        task.status === 'Completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : task.status === 'Delayed'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {task.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}