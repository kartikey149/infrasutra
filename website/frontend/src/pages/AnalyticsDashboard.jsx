import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, CheckCircle, Clock, 
  BarChart3, RefreshCw, Database, Award 
} from 'lucide-react';

import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';

import { API_BASE } from '../config';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function AnalyticsDashboard() {
  const { activeProject } = useProject();
  const { authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchAnalytics = async () => {
    if (!activeProject?.id) {
      setData({ total: 0, completed: 0, inProgress: 0, notStarted: 0, delayed: 0, byDiscipline: [] });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/analytics/summary?project_id=${activeProject.id}`);
      const json = await res.json();
      if (json.success) {
        setData(json.analytics);
      }
    } catch (err) {
      console.error('Failed to load analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [activeProject?.id]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center text-slate-400 font-medium">
        Loading execution analytics from SQLite Database...
      </div>
    );
  }

  const { total, completed, inProgress, notStarted, delayed, byDiscipline } = data || {
    total: 0, completed: 0, inProgress: 0, notStarted: 0, delayed: 0, byDiscipline: []
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <BarChart3 size={16} /> Historical Execution Intelligence
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Schedule Performance & Delay Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time insights on discipline variance, contractor delays, and milestone completion trends.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-bold rounded-xl transition"
        >
          <RefreshCw size={16} /> Recalculate
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Total L5/L6 Tasks</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{total}</div>
          <div className="text-[11px] text-slate-500 mt-1">WBS activity nodes</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-emerald-600 text-xs font-bold uppercase tracking-wider">Completed</div>
          <div className="text-3xl font-black text-emerald-700 mt-1">{completed}</div>
          <div className="text-[11px] text-slate-500 mt-1">{Math.round((completed / (total || 1)) * 100)}% execution rate</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-amber-600 text-xs font-bold uppercase tracking-wider">In Progress</div>
          <div className="text-3xl font-black text-amber-600 mt-1">{inProgress}</div>
          <div className="text-[11px] text-slate-500 mt-1">Active on construction site</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">Not Started</div>
          <div className="text-3xl font-black text-slate-600 mt-1">{notStarted}</div>
          <div className="text-[11px] text-slate-500 mt-1">Pending kickoff</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-sm col-span-2 lg:col-span-1">
          <div className="text-rose-600 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle size={14} /> Critical Delays
          </div>
          <div className="text-3xl font-black text-rose-700 mt-1">{delayed}</div>
          <div className="text-[11px] text-rose-600 mt-1">Actual End &gt; Planned End</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Discipline Delays */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Delayed Activities by Discipline</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDiscipline} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="discipline" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Bar dataKey="delayed" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Average Delay in Days */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">Average Schedule Slip (Days) by Discipline</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDiscipline} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="discipline" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="d" />
                <Tooltip formatter={(value) => [`${value} Days`, 'Avg Delay']} />
                <Bar dataKey="avgDelayDays" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">Discipline Execution Performance Matrix</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <th className="py-2.5 px-4">Discipline</th>
                <th className="py-2.5 px-4">Total Activities</th>
                <th className="py-2.5 px-4">Completed</th>
                <th className="py-2.5 px-4">Delayed Count</th>
                <th className="py-2.5 px-4">Average Delay</th>
                <th className="py-2.5 px-4">Execution Health</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {byDiscipline.map((d, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-900">{d.discipline}</td>
                  <td className="py-3 px-4 text-slate-700">{d.total}</td>
                  <td className="py-3 px-4 text-emerald-700 font-semibold">{d.completed}</td>
                  <td className="py-3 px-4 text-rose-600 font-semibold">{d.delayed}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{d.avgDelayDays} Days</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      d.delayed === 0 ? 'bg-emerald-100 text-emerald-800' :
                      d.avgDelayDays > 3 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {d.delayed === 0 ? 'Optimal' : d.avgDelayDays > 3 ? 'Critical' : 'Moderate'}
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
