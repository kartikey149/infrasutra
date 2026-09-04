import React, { useState } from 'react';
import { 
  FileText, 
  FileSpreadsheet, 
  Printer, 
  CheckCircle2, 
  Filter
} from 'lucide-react';

export default function ReportExporter() {
  const [reportType, setReportType] = useState('executive');
  const [dateRange, setDateRange] = useState('q2-2026');
  const [isGenerating, setIsGenerating] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  // Mock data for exports
  const reportData = [
    { wbs: 'WBS-1.1', task: 'Site Survey & Land Acquisition', planned: '100%', actual: '100%', variance: '0 Days', status: 'Completed' },
    { wbs: 'WBS-1.2', task: 'Site Earthworks & Clearing (Zone A)', planned: '100%', actual: '90%', variance: '-8 Days', status: 'Delayed' },
    { wbs: 'WBS-2.1', task: 'Pipeline Trenching - Sector 4', planned: '60%', actual: '45%', variance: '-12 Days', status: 'Delayed' },
    { wbs: 'WBS-2.2', task: 'Pipe Welding & NDT Inspection', planned: '25%', actual: '25%', variance: '0 Days', status: 'On Track' },
    { wbs: 'WBS-3.1', task: 'Substation Foundation Concrete Pour', planned: '15%', actual: '10%', variance: '-3 Days', status: 'Warning' },
  ];

  // CSV Generator Function
  const handleExportCSV = () => {
    setIsGenerating(true);
    setTimeout(() => {
      const headers = ['WBS Code', 'Task Description', 'Planned Completion', 'Actual Completion', 'Schedule Variance', 'Status'];
      const rows = reportData.map((item) => [
        item.wbs,
        `"${item.task}"`,
        item.planned,
        item.actual,
        item.variance,
        item.status,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `InfraSutra_Report_${reportType}_${dateRange}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setIsGenerating(false);
      triggerSuccessMessage();
    }, 800);
  };

  // Browser-native Printable PDF Trigger
  const handlePrintPDF = () => {
    window.print();
  };

  const triggerSuccessMessage = () => {
    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3500);
  };

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-[calc(100vh-65px)] text-slate-900 space-y-6 pb-24 sm:pb-8 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-800">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Executive Report & Export Center</h1>
              <p className="text-xs text-slate-500">
                Generate Printable Briefs & Raw CSV Spreadsheets for Audits
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold transition shadow-sm"
          >
            <Printer size={15} className="text-slate-700" /> Print / Save PDF
          </button>
          <button
            onClick={handleExportCSV}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
          >
            <FileSpreadsheet size={15} /> {isGenerating ? 'Exporting...' : 'Export Excel (.CSV)'}
          </button>
        </div>
      </div>

      {downloadSuccess && (
        <div className="p-4 bg-emerald-100 border border-emerald-300 rounded-2xl flex items-center gap-3 text-emerald-800 text-xs font-bold">
          <CheckCircle2 size={18} />
          <span>Report exported successfully! Check your downloads folder.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Configuration Controls */}
        <div className="space-y-5 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-3">
            <Filter size={15} className="text-slate-700" /> Report Parameters
          </h3>

          {/* Select Report Template */}
          <div>
            <label className="block text-xs text-slate-700 mb-1.5 font-semibold">Report Type</label>
            <select
              value={reportType}
              onChange={(e) => setReportType(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
            >
              <option value="executive">Executive S-Curve Summary</option>
              <option value="schedule-variance">Detailed Critical Path & Variance</option>
              <option value="field-audit">Field Inspection & Geotag Audit</option>
            </select>
          </div>

          {/* Select Timeline */}
          <div>
            <label className="block text-xs text-slate-700 mb-1.5 font-semibold">Time Horizon</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:border-slate-900"
            >
              <option value="q2-2026">Q2 2026 (Apr - Jun)</option>
              <option value="q1-2026">Q1 2026 (Jan - Mar)</option>
              <option value="full-year">Full Project Lifecycle (2026)</option>
            </select>
          </div>

          {/* Stakeholder Metadata Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
            <p className="text-slate-600">Organization: <strong className="text-slate-900">SIH Infra Project</strong></p>
            <p className="text-slate-600">Project ID: <strong className="text-slate-900">INFRA-2026-PS122</strong></p>
            <p className="text-slate-600">Data Layer: <strong className="text-amber-800 font-mono">Telegram STT + P6 Engine</strong></p>
          </div>
        </div>

        {/* Right Column: Printable Executive Document Preview */}
        <div className="lg:col-span-2 bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm print:shadow-none print:border-none print:p-0">
          {/* Printable Header */}
          <div className="border-b border-slate-200 pb-4 mb-5 flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">
                Official Status Brief &bull; SIH PS-122
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">
                {reportType === 'executive' && 'Executive Progress & Schedule Variance Report'}
                {reportType === 'schedule-variance' && 'Critical Path & WBS Delay Analysis'}
                {reportType === 'field-audit' && 'Geotagged Field Data Log & Audit Trail'}
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Target Period: {dateRange.toUpperCase()} &bull; Generated on September 2, 2026
              </p>
            </div>
            <div className="text-right">
              <span className="px-2.5 py-1 bg-slate-100 text-slate-800 border border-slate-300 rounded-lg text-[10px] font-bold">
                CONFIDENTIAL
              </span>
            </div>
          </div>

          {/* KPI Brief Summary Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-[10px] text-slate-500">Planned Target</p>
              <p className="text-base font-extrabold text-slate-900">88%</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-[10px] text-slate-500">Actual Executed</p>
              <p className="text-base font-extrabold text-emerald-700">72%</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
              <p className="text-[10px] text-slate-500">SPI Index</p>
              <p className="text-base font-extrabold text-amber-700">0.81</p>
            </div>
          </div>

          {/* Preview Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50">
                  <th className="py-2.5 px-3">WBS</th>
                  <th className="py-2.5 px-3">Task Name</th>
                  <th className="py-2.5 px-3">Plan</th>
                  <th className="py-2.5 px-3">Actual</th>
                  <th className="py-2.5 px-3">Variance</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800">
                {reportData.map((row) => (
                  <tr key={row.wbs} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-mono text-slate-900 font-bold">{row.wbs}</td>
                    <td className="py-2.5 px-3 font-semibold">{row.task}</td>
                    <td className="py-2.5 px-3">{row.planned}</td>
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{row.actual}</td>
                    <td className="py-2.5 px-3 font-mono text-rose-600 font-bold">{row.variance}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-lg text-[10px] font-bold ${
                        row.status === 'Completed' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' :
                        row.status === 'Delayed' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-slate-200 text-slate-800'
                      }`}>
                        {row.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}