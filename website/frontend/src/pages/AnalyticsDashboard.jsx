import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell 
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, CheckCircle, Clock, 
  BarChart3, RefreshCw, Database, Award,
  FileSpreadsheet, FileText, Download, CheckCircle2
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';
import { formatNumber } from '../utils/dateFormatter';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

export default function AnalyticsDashboard() {
  const { t, i18n } = useTranslation();
  const { activeProject } = useProject();
  const { authFetch } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(null); // 'pdf' | 'excel'
  const [exportSuccess, setExportSuccess] = useState(null);


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
        {t('analytics.loadingDatabase', 'Loading execution analytics from SQLite Database...')}
      </div>
    );
  }

  const { total, completed, inProgress, notStarted, delayed, byDiscipline } = data || {
    total: 0, completed: 0, inProgress: 0, notStarted: 0, delayed: 0, byDiscipline: []
  };

  const handleExportPDF = () => {
    try {
      setExportLoading('pdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Top Brand Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 36, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(15);
      doc.setFont('helvetica', 'bold');
      doc.text('INFRASUTRA | SCHEDULE & DELAY INTELLIGENCE', 14, 15);
      
      doc.setFontSize(9.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Project: ${activeProject?.name || 'Sector 4 Crude Oil Pipeline'} [${activeProject?.id || 'PRJ-01'}]`, 14, 23);
      doc.text(`Exported: ${new Date().toLocaleString()} | Official Primavera WBS Execution Audit`, 14, 29);

      // Section 1: Executive KPI Summary
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Executive Schedule KPIs', 14, 46);

      const kpiData = [
        ['Total WBS Tasks (L5/L6)', total.toString(), 'All scheduled activity nodes'],
        ['Completed Activities', `${completed} (${Math.round((completed / (total || 1)) * 100)}%)`, 'Finished on site'],
        ['Active In-Progress', inProgress.toString(), 'Currently under construction'],
        ['Pending Kickoff (Not Started)', notStarted.toString(), 'Scheduled for upcoming cycles'],
        ['Critical Delayed Tasks', delayed.toString(), 'Actual End date > Planned Baseline']
      ];

      autoTable(doc, {
        startY: 50,
        head: [['Key Performance Indicator', 'Current Value', 'Context / Status']],
        body: kpiData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 3.5 },
        margin: { left: 14, right: 14 }
      });

      // Section 2: Discipline Execution Matrix
      const matrixStartY = (doc).lastAutoTable.finalY + 12;
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('2. Discipline Execution Performance Matrix', 14, matrixStartY);

      const tableData = (byDiscipline || []).map(d => [
        d.discipline,
        d.total.toString(),
        d.completed.toString(),
        d.delayed.toString(),
        `${d.avgDelayDays} Days`,
        d.delayed === 0 ? 'Optimal' : d.avgDelayDays > 3 ? 'Critical' : 'Moderate'
      ]);

      autoTable(doc, {
        startY: matrixStartY + 4,
        head: [['Discipline', 'Total Nodes', 'Completed', 'Delayed', 'Avg Slip', 'Health']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 3.5 },
        didParseCell: function (data) {
          if (data.column.index === 5 && data.cell.raw === 'Optimal') {
            data.cell.styles.textColor = [16, 185, 129];
            data.cell.styles.fontStyle = 'bold';
          } else if (data.column.index === 5 && data.cell.raw === 'Critical') {
            data.cell.styles.textColor = [239, 68, 68];
            data.cell.styles.fontStyle = 'bold';
          } else if (data.column.index === 5 && data.cell.raw === 'Moderate') {
            data.cell.styles.textColor = [245, 158, 11];
            data.cell.styles.fontStyle = 'bold';
          }
        },
        margin: { left: 14, right: 14 }
      });

      // Footer
      const finalY = (doc).lastAutoTable.finalY + 10;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text('Report cryptographically generated from live SQLite schedule database & AI variance engine.', 14, finalY);

      doc.save(`InfraSutra_Analytics_${activeProject?.id || 'PRJ'}_${new Date().toISOString().slice(0, 10)}.pdf`);
      setExportSuccess('pdf');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF: ' + err.message);
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportExcel = () => {
    try {
      setExportLoading('excel');
      const wb = XLSX.utils.book_new();

      // Sheet 1: Executive Summary
      const summaryRows = [
        ['INFRASUTRA ANALYTICS & DELAY INTELLIGENCE REPORT'],
        ['Project ID', activeProject?.id || 'PRJ-01'],
        ['Project Name', activeProject?.name || 'Sector 4 Crude Oil Pipeline Expansion'],
        ['Generated At', new Date().toLocaleString()],
        [],
        ['Metric Name', 'Metric Value', 'Context / Description'],
        ['Total Tasks (L5/L6)', total, 'Total activity nodes in WBS'],
        ['Completed Activities', completed, 'Finished on site'],
        ['In Progress', inProgress, 'Currently active work'],
        ['Not Started', notStarted, 'Pending execution kickoff'],
        ['Critical Delays', delayed, 'Actual end date exceeds planned baseline'],
        ['Execution Rate (%)', Math.round((completed / (total || 1)) * 100), 'Overall project velocity']
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Executive KPIs');

      // Sheet 2: Discipline Performance Matrix
      const matrixRows = [
        ['Discipline', 'Total Activities', 'Completed', 'Delayed Count', 'Average Schedule Slip (Days)', 'Execution Health'],
        ...(byDiscipline || []).map(d => [
          d.discipline,
          d.total,
          d.completed,
          d.delayed,
          d.avgDelayDays,
          d.delayed === 0 ? 'Optimal' : d.avgDelayDays > 3 ? 'Critical' : 'Moderate'
        ])
      ];
      const wsMatrix = XLSX.utils.aoa_to_sheet(matrixRows);
      XLSX.utils.book_append_sheet(wb, wsMatrix, 'Discipline Variance');

      XLSX.writeFile(wb, `InfraSutra_Analytics_${activeProject?.id || 'PRJ'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setExportSuccess('excel');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err) {
      console.error('Excel generation error:', err);
      alert('Failed to generate Excel file: ' + err.message);
    } finally {
      setExportLoading(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase tracking-wider mb-1">
            <BarChart3 size={16} /> {t('analytics.badge', 'Historical Execution Intelligence')}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            {t('analytics.title', 'Schedule Performance & Delay Analytics')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {t('analytics.subtitle', 'Real-time insights on discipline variance, contractor delays, and milestone completion trends.')}
          </p>
        </div>

        {/* Action Buttons: PDF, Excel, Recalculate */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            disabled={exportLoading === 'pdf'}
            className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50"
            title="Download executive analytics summary in PDF"
          >
            {exportSuccess === 'pdf' ? (
              <CheckCircle2 size={15} className="text-emerald-600" />
            ) : (
              <FileText size={15} className="text-rose-600" />
            )}
            {exportLoading === 'pdf' ? 'Generating PDF...' : exportSuccess === 'pdf' ? 'PDF Downloaded!' : 'Export PDF'}
          </button>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            disabled={exportLoading === 'excel'}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50 shadow-emerald-600/20"
            title="Download full analytics & discipline matrix in Excel (.xlsx)"
          >
            {exportSuccess === 'excel' ? (
              <CheckCircle2 size={15} className="text-white" />
            ) : (
              <FileSpreadsheet size={15} />
            )}
            {exportLoading === 'excel' ? 'Exporting...' : exportSuccess === 'excel' ? 'Excel Exported!' : 'Export Excel (.XLSX)'}
          </button>

          {/* Recalculate Button */}
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
          >
            <RefreshCw size={15} /> {t('analytics.recalculate', 'Recalculate')}
          </button>
        </div>
      </div>


      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t('analytics.totalTasks', 'Total L5/L6 Tasks')}</div>
          <div className="text-3xl font-black text-slate-900 mt-1">{formatNumber(total, i18n.language)}</div>
          <div className="text-[11px] text-slate-500 mt-1">{t('analytics.wbsNodes', 'WBS activity nodes')}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-emerald-600 text-xs font-bold uppercase tracking-wider">{t('dashboard.completed', 'Completed')}</div>
          <div className="text-3xl font-black text-emerald-700 mt-1">{formatNumber(completed, i18n.language)}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            {formatNumber(Math.round((completed / (total || 1)) * 100), i18n.language)}% {t('analytics.executionRate', 'execution rate')}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-amber-600 text-xs font-bold uppercase tracking-wider">{t('dashboard.inProgress', 'In Progress')}</div>
          <div className="text-3xl font-black text-amber-600 mt-1">{formatNumber(inProgress, i18n.language)}</div>
          <div className="text-[11px] text-slate-500 mt-1">{t('analytics.activeOnSite', 'Active on construction site')}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-slate-400 text-xs font-bold uppercase tracking-wider">{t('dashboard.notStarted', 'Not Started')}</div>
          <div className="text-3xl font-black text-slate-600 mt-1">{formatNumber(notStarted, i18n.language)}</div>
          <div className="text-[11px] text-slate-500 mt-1">{t('analytics.pendingKickoff', 'Pending kickoff')}</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-sm col-span-2 lg:col-span-1">
          <div className="text-rose-600 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
            <AlertTriangle size={14} /> {t('analytics.criticalDelays', 'Critical Delays')}
          </div>
          <div className="text-3xl font-black text-rose-700 mt-1">{formatNumber(delayed, i18n.language)}</div>
          <div className="text-[11px] text-rose-600 mt-1">{t('analytics.actualEndVsPlanned', 'Actual End > Planned End')}</div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Discipline Delays */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-base font-bold text-slate-900">{t('analytics.delayedByDiscipline', 'Delayed Activities by Discipline')}</h3>
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
          <h3 className="text-base font-bold text-slate-900">{t('analytics.avgSlipByDiscipline', 'Average Schedule Slip (Days) by Discipline')}</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={byDiscipline} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="discipline" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} unit="d" />
                <Tooltip formatter={(value) => [`${formatNumber(value, i18n.language)} ${t('dashboard.days', 'Days')}`, t('analytics.avgDelay', 'Avg Delay')]} />
                <Bar dataKey="avgDelayDays" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Breakdown Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden p-6 space-y-4">
        <h3 className="text-base font-bold text-slate-900">{t('analytics.matrixTitle', 'Discipline Execution Performance Matrix')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 font-bold uppercase border-b border-slate-200">
                <th className="py-2.5 px-4">{t('schedule.discipline', 'Discipline')}</th>
                <th className="py-2.5 px-4">{t('dashboard.totalActivities', 'Total Activities')}</th>
                <th className="py-2.5 px-4">{t('dashboard.completed', 'Completed')}</th>
                <th className="py-2.5 px-4">{t('analytics.delayedCount', 'Delayed Count')}</th>
                <th className="py-2.5 px-4">{t('analytics.averageDelay', 'Average Delay')}</th>
                <th className="py-2.5 px-4">{t('analytics.executionHealth', 'Execution Health')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {byDiscipline.map((d, i) => (
                <tr key={i} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-bold text-slate-900">{d.discipline}</td>
                  <td className="py-3 px-4 text-slate-700">{formatNumber(d.total, i18n.language)}</td>
                  <td className="py-3 px-4 text-emerald-700 font-semibold">{formatNumber(d.completed, i18n.language)}</td>
                  <td className="py-3 px-4 text-rose-600 font-semibold">{formatNumber(d.delayed, i18n.language)}</td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-800">{formatNumber(d.avgDelayDays, i18n.language)} {t('dashboard.days', 'Days')}</td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      d.delayed === 0 ? 'bg-emerald-100 text-emerald-800' :
                      d.avgDelayDays > 3 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {d.delayed === 0 ? t('analytics.optimal', 'Optimal') : d.avgDelayDays > 3 ? t('analytics.critical', 'Critical') : t('analytics.moderate', 'Moderate')}
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
