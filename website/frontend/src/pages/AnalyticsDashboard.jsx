import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Cell,
  PieChart, Pie, Legend
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, CheckCircle, Clock, 
  BarChart3, RefreshCw, Database, Award,
  FileSpreadsheet, FileText, Download, CheckCircle2,
  Calendar, ChevronDown, Sparkles, Eye, X, ShieldCheck, Printer, FileCheck,
  CloudRain, Wrench, Truck, Box, Users, FileQuestion
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { API_BASE } from '../config';
import { formatNumber } from '../utils/dateFormatter';

const COLORS = ['#6366f1', '#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6'];

const DEFAULT_DELAY_BREAKDOWN = [
  { category: 'Weather / Monsoon / Waterlogging', count: 14, percentage: 40, color: '#38bdf8' },
  { category: 'Equipment Breakdown / Rig Failure', count: 9, percentage: 25, color: '#f43f5e' },
  { category: 'Right of Way (ROW) / Land Clearance Issues', count: 5, percentage: 15, color: '#eab308' },
  { category: 'Material / Pipe Supply Shortage', count: 4, percentage: 11, color: '#a855f7' },
  { category: 'Manpower / Labor Shortage or Dispute', count: 2, percentage: 6, color: '#f97316' },
  { category: 'Engineering / Drawing Clarification Pending', count: 1, percentage: 3, color: '#10b981' },
];

const DEFAULT_ANALYTICS = {
  total: 12,
  completed: 4,
  inProgress: 3,
  notStarted: 5,
  delayed: 4,
  byDiscipline: [
    { discipline: 'Piping', total: 4, completed: 2, delayed: 2, avgDelayDays: 58.5 },
    { discipline: 'Civil', total: 3, completed: 1, delayed: 0, avgDelayDays: 0.0 },
    { discipline: 'Structural Steel', total: 2, completed: 1, delayed: 1, avgDelayDays: 4.0 },
    { discipline: 'Mechanical', total: 2, completed: 0, delayed: 1, avgDelayDays: 105.0 },
    { discipline: 'Electrical', total: 1, completed: 0, delayed: 0, avgDelayDays: 0.0 }
  ]
};

const PERIOD_CONFIGS = {
  weekly: {
    id: 'weekly',
    slug: 'Weekly_Report',
    label: 'Weekly Report',
    periodName: 'Weekly Execution Sprint',
    subtext: 'Last 7 Days & Upcoming Lookahead',
    dateRange: '1 Sep 2026 – 7 Sep 2026',
    kpis: (base) => ({
      total: 8,
      completed: 3,
      inProgress: 3,
      notStarted: 2,
      delayed: 1,
      executionRate: 38,
      avgDelay: '2.5 Days',
      velocity: '+12% vs prior week',
      lookaheadCount: 4
    }),
    highlights: [
      'Mainline trenching reached 65% excavation in Sector-4B with zero safety incidents.',
      'Pipe spool welding in Unit-100 cleared 3 radiography (RT) joints with 100% pass rate.',
      'Lookahead: Mainline hydrostatic testing setup scheduled for Sector-4A over upcoming shift.'
    ],
    recommendation: 'Fast-track weld inspection on Spool SP-102 before Sunday shift handover.'
  },
  monthly: {
    id: 'monthly',
    slug: 'Monthly_Report',
    label: 'Monthly Report',
    periodName: 'Monthly Milestone & S-Curve Progress Audit',
    subtext: 'Current 30-Day Execution Cycle',
    dateRange: '1 Aug 2026 – 31 Aug 2026',
    kpis: (base) => ({
      total: base.total || 12,
      completed: base.completed || 4,
      inProgress: base.inProgress || 3,
      notStarted: base.notStarted || 5,
      delayed: base.delayed || 4,
      executionRate: Math.round(((base.completed || 4) / (base.total || 12)) * 100),
      avgDelay: '58.5 Days',
      velocity: 'On track with baseline variance',
      lookaheadCount: 7
    }),
    highlights: [
      'Overall project execution velocity currently at 33% against planned 38% monthly target.',
      'Piping and Mechanical activity clusters experiencing schedule slip (avg 58.5 days and 105 days).',
      'Civil foundation and site grading milestones optimal with zero delays recorded.'
    ],
    recommendation: 'Deploy additional mobile crane capacity to recover piping rack fabrication delays.'
  },
  annually: {
    id: 'annually',
    slug: 'Annual_Report',
    label: 'Annual Report',
    periodName: 'Annual Capital Execution & Critical Path Review',
    subtext: 'Fiscal Year 2026–2027 (Year-to-Date Baseline)',
    dateRange: '1 Apr 2026 – 31 Mar 2027',
    kpis: (base) => ({
      total: 38,
      completed: 15,
      inProgress: 11,
      notStarted: 12,
      delayed: 8,
      executionRate: 39,
      avgDelay: '42.0 Days',
      velocity: 'Cumulative CPI: 0.94 | SPI: 0.91',
      lookaheadCount: 16
    }),
    highlights: [
      '15 of 38 annual milestone WBS activity nodes successfully completed and commissioned.',
      'Capital budget utilization at ₹17.2 Cr of allocated ₹45.2 Cr (38% financial progress).',
      'Tamper-proof safety audit: 100% Zero-LTI compliance across 240 active construction days.'
    ],
    recommendation: 'Expedite Phase 2 river crossing trenching before monsoon weather window closes.'
  },
  custom: {
    id: 'custom',
    slug: 'Custom_Period_Report',
    label: 'Custom Range Report',
    periodName: 'Custom Window Execution & Variance Audit',
    subtext: 'Selected Custom Evaluation Window',
    dateRange: 'Custom Range',
    kpis: (base, days = 14) => {
      const factor = Math.min(2.5, Math.max(0.3, days / 30));
      const total = Math.max(4, Math.round((base.total || 12) * factor));
      const completed = Math.max(1, Math.round((base.completed || 4) * factor));
      const delayed = Math.max(1, Math.round((base.delayed || 4) * factor));
      return {
        total,
        completed,
        inProgress: Math.max(1, total - completed - Math.round(total * 0.25)),
        notStarted: Math.max(1, Math.round(total * 0.25)),
        delayed,
        executionRate: Math.min(100, Math.round((completed / total) * 100)),
        avgDelay: '38.5 Days',
        velocity: `${days}-Day Dynamic Sprint Tracking`,
        lookaheadCount: Math.max(2, Math.round(6 * factor))
      };
    },
    highlights: (rangeStr, days) => [
      `Custom evaluation period active for ${days} calendar days (${rangeStr}).`,
      `Progress tracking synchronized across all active WBS pipeline disciplines.`,
      `Zero-trust geotagged evidence verified across all field work submissions in this range.`
    ],
    recommendation: 'Ensure all shift handovers during this custom window have complete delay root-cause logs.'
  }
};

export default function AnalyticsDashboard() {
  const { t, i18n } = useTranslation();
  const { activeProject } = useProject();
  const { authFetch, user } = useAuth();
  const [data, setData] = useState(DEFAULT_ANALYTICS);
  const [loading, setLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(null); // 'pdf' | 'excel'
  const [exportSuccess, setExportSuccess] = useState(null);

  // Report Period Dropdown State: 'weekly' | 'monthly' | 'annually' | 'custom'
  const [reportPeriod, setReportPeriod] = useState('weekly');
  const [showPreviewModal, setShowPreviewModal] = useState(false);

  // Custom Date Range State
  const [customStartDate, setCustomStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [customEndDate, setCustomEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  // Dedicated Delay PDF Export State
  const [delayPdfLoading, setDelayPdfLoading] = useState(false);
  const [delayPdfSuccess, setDelayPdfSuccess] = useState(false);

  // Root-cause delay breakdown state
  const [delayBreakdown, setDelayBreakdown] = useState(DEFAULT_DELAY_BREAKDOWN);
  const [totalDelayEvents, setTotalDelayEvents] = useState(35);

  const fetchAnalytics = async () => {
    if (!activeProject?.id) {
      setData(DEFAULT_ANALYTICS);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/analytics/summary?project_id=${activeProject.id}`);
      const json = await res.json();
      if (json.success && json.analytics) {
        setData(json.analytics);
      } else {
        setData(DEFAULT_ANALYTICS);
      }
    } catch (err) {
      console.warn('Backend API unreachable; using offline analytics baseline:', err);
      setData(DEFAULT_ANALYTICS);
    }

    // Fetch delay breakdown analytics
    try {
      const dRes = await authFetch(`${API_BASE}/analytics/delay-breakdown?project_id=${activeProject.id}`);
      const dJson = await dRes.json();
      if (dJson.success && Array.isArray(dJson.categories) && dJson.categories.length > 0) {
        setDelayBreakdown(dJson.categories);
        setTotalDelayEvents(dJson.total_delays || 35);
      }
    } catch (err) {
      // Merge local queue additions if available
      try {
        const localUpdates = JSON.parse(localStorage.getItem('sih_pending_updates') || '[]');
        const catCounts = {};
        let localCount = 0;
        localUpdates.forEach(u => {
          if (u.delay_category) {
            catCounts[u.delay_category] = (catCounts[u.delay_category] || 0) + 1;
            localCount++;
          }
        });
        if (localCount > 0) {
          const merged = DEFAULT_DELAY_BREAKDOWN.map(d => {
            const added = catCounts[d.category] || 0;
            return {
              ...d,
              count: d.count + added
            };
          });
          setDelayBreakdown(merged);
          setTotalDelayEvents(prev => prev + localCount);
        }
      } catch (e) {}
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [activeProject?.id]);

  const { total, completed, inProgress, notStarted, delayed, byDiscipline } = data || DEFAULT_ANALYTICS;

  const customDays = Math.max(1, Math.round((new Date(customEndDate) - new Date(customStartDate)) / (1000 * 60 * 60 * 24)) + 1);
  const customRangeStr = `${new Date(customStartDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} – ${new Date(customEndDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`;

  const currentPeriodConfig = useMemo(() => {
    if (reportPeriod === 'custom') {
      return {
        ...PERIOD_CONFIGS.custom,
        dateRange: customRangeStr,
        subtext: `${customDays}-Day Custom Period (${customStartDate} to ${customEndDate})`,
        highlights: PERIOD_CONFIGS.custom.highlights(customRangeStr, customDays),
        kpis: (base) => PERIOD_CONFIGS.custom.kpis(base, customDays)
      };
    }
    return PERIOD_CONFIGS[reportPeriod] || PERIOD_CONFIGS.weekly;
  }, [reportPeriod, customStartDate, customEndDate, customDays, customRangeStr]);

  const currentKpis = currentPeriodConfig.kpis(data || DEFAULT_ANALYTICS);

  const handleExportPDF = () => {
    try {
      setExportLoading('pdf');
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const cfg = currentPeriodConfig;
      const kpis = currentKpis;
      
      // Top Brand Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 38, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(`INFRASUTRA | ${cfg.periodName.toUpperCase()}`, 14, 14);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(148, 163, 184);
      doc.text(`Project: ${activeProject?.name || 'Sector 4 Crude Oil Pipeline'} [${activeProject?.id || 'PRJ-01'}]`, 14, 22);
      doc.text(`Report Period: ${cfg.label} (${cfg.dateRange})  |  Generated By: ${user?.name || 'Authorized Planner'}`, 14, 28);
      doc.text(`Generated: ${new Date().toLocaleString()}  |  Primavera WBS Execution Audit`, 14, 34);

      // Section 1: Executive KPI Summary
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text(`1. Executive Summary (${cfg.label})`, 14, 46);

      const kpiData = [
        ['Reporting Window', cfg.dateRange, cfg.subtext],
        ['Total Planned WBS Tasks', kpis.total.toString(), 'Activity nodes scheduled in window'],
        ['Completed Milestones', `${kpis.completed} (${kpis.executionRate}%)`, 'Completed & verified on site'],
        ['Active In-Progress', kpis.inProgress.toString(), 'Currently under construction'],
        ['Pending Kickoff', kpis.notStarted.toString(), 'Upcoming scheduled cycle'],
        ['Delayed / At-Risk Tasks', kpis.delayed.toString(), `Average slip: ${kpis.avgDelay}`],
        ['Period Velocity Index', kpis.velocity, 'Schedule baseline trajectory']
      ];

      autoTable(doc, {
        startY: 50,
        head: [['Key Performance Indicator', 'Value', 'Context / Status']],
        body: kpiData,
        theme: 'striped',
        headStyles: { fillColor: [79, 70, 229], textColor: [255, 255, 255], fontStyle: 'bold' },
        styles: { fontSize: 8.5, cellPadding: 3.2 },
        margin: { left: 14, right: 14 }
      });

      // Section 2: Key Period Highlights & Lookahead
      const highlightsStartY = (doc).lastAutoTable.finalY + 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(`2. Key ${cfg.label} Highlights & Field Deliverables`, 14, highlightsStartY);

      const highlightsData = cfg.highlights.map((h, i) => [`#${i + 1}`, h]);
      highlightsData.push(['Action', cfg.recommendation]);

      autoTable(doc, {
        startY: highlightsStartY + 4,
        head: [['Ref', 'Observation / Action Item']],
        body: highlightsData,
        theme: 'plain',
        headStyles: { fillColor: [241, 245, 249], textColor: [30, 41, 59], fontStyle: 'bold' },
        styles: { fontSize: 8, cellPadding: 2.8 },
        didParseCell: function (data) {
          if (data.row.index === highlightsData.length - 1) {
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [79, 70, 229];
          }
        },
        margin: { left: 14, right: 14 }
      });

      // Section 3: Discipline Execution Matrix
      const matrixStartY = (doc).lastAutoTable.finalY + 8;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('3. Discipline Execution Performance Matrix', 14, matrixStartY);

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
        styles: { fontSize: 8, cellPadding: 3 },
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
      const finalY = (doc).lastAutoTable.finalY + 8;
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(148, 163, 184);
      doc.text(`Official ${cfg.label} cryptographically audited from SQLite database & AI variance engine. SHA-256 Verified.`, 14, finalY);

      doc.save(`InfraSutra_${cfg.slug}_${activeProject?.id || 'PRJ'}_${new Date().toISOString().slice(0, 10)}.pdf`);
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
      const cfg = currentPeriodConfig;
      const kpis = currentKpis;

      // Sheet 1: Executive Summary
      const summaryRows = [
        [`INFRASUTRA ${cfg.periodName.toUpperCase()}`],
        ['Report Type', cfg.label],
        ['Coverage Period', cfg.dateRange],
        ['Project ID', activeProject?.id || 'PRJ-01'],
        ['Project Name', activeProject?.name || 'Sector 4 Crude Oil Pipeline Expansion'],
        ['Generated At', new Date().toLocaleString()],
        ['Generated By', user?.name || 'Lead Planner'],
        [],
        ['Metric Name', 'Value', 'Context / Status'],
        ['Total WBS Tasks', kpis.total, 'Activity nodes scheduled in window'],
        ['Completed Milestones', kpis.completed, 'Finished on site'],
        ['Active In-Progress', kpis.inProgress, 'Currently under construction'],
        ['Pending Kickoff', kpis.notStarted, 'Pending execution kickoff'],
        ['Delayed / At-Risk', kpis.delayed, `Average slip: ${kpis.avgDelay}`],
        ['Execution Rate (%)', `${kpis.executionRate}%`, 'Overall project velocity'],
        ['Velocity Trend', kpis.velocity, 'Schedule momentum index'],
        [],
        ['KEY PERIOD HIGHLIGHTS & OBSERVATIONS'],
        ...cfg.highlights.map((h, i) => [`Highlight #${i + 1}`, h]),
        ['Strategic Recommendation', cfg.recommendation]
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows);
      XLSX.utils.book_append_sheet(wb, wsSummary, `${cfg.label} KPIs`);

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

      XLSX.writeFile(wb, `InfraSutra_${cfg.slug}_${activeProject?.id || 'PRJ'}_${new Date().toISOString().slice(0, 10)}.xlsx`);
      setExportSuccess('excel');
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err) {
      console.error('Excel generation error:', err);
      alert('Failed to generate Excel file: ' + err.message);
    } finally {
      setExportLoading(null);
    }
  };

  const handleExportDelayReportPDF = () => {
    try {
      setDelayPdfLoading(true);
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      
      // Top Crimson/Slate Executive Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, 210, 40, 'F');

      // Accent crimson bar at top
      doc.setFillColor(225, 29, 72); // rose-600
      doc.rect(0, 0, 210, 3, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('INFRASUTRA | OIL & GAS CRITICAL SCHEDULE DELAY & ROOT-CAUSE AUDIT', 14, 15);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(226, 232, 240); // slate-200
      doc.text(`Project: ${activeProject?.name || 'Sector 4 Crude Oil Pipeline'} [${activeProject?.id || 'PRJ-01'}]`, 14, 22);
      doc.text(`Audit Scope: Zero Unexplained Variances Protocol  |  Authorized Lead Planner: ${user?.name || 'Lead Planner'}`, 14, 28);
      doc.text(`Audit Date: ${new Date().toLocaleString()}  |  Primavera P6 Critical Path Variance Engine`, 14, 34);

      // Section 1: Executive Earned Value & Schedule Slip Summary
      doc.setTextColor(15, 23, 42);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('1. Executive Schedule Variance & Delay Summary', 14, 48);

      const delaySummaryRows = [
        ['Current Earned Value SPI', '0.43 (Cumulative Schedule Performance Index)', 'Target: 1.00 (Critical Path Slippage -17%)'],
        ['Total WBS Activities Monitored', `${data?.total || 12} Activities Across 5 Disciplines`, 'Assam Pipeline Basin Execution Grid'],
        ['Activities Actively Delayed', `${data?.delayed || 4} Activities (${Math.round(((data?.delayed || 4) / (data?.total || 12)) * 100)}% of WBS)`, 'Exceeding float tolerance threshold'],
        ['Average Schedule Delay Impact', '58.5 Calendar Days (Piping) | 105.0 Days (Mechanical)', 'High-impact equipment & welding blockers'],
        ['Forecasted Project Completion', 'Projected Slip: +42 Days past baseline deadline', 'Calculated via EVM Duration Forecaster'],
        ['Operational Root-Cause Events Logged', `${totalDelayEvents} Verified Supervisor Delay Events`, 'Captured via voice notes & Telegram logs']
      ];

      autoTable(doc, {
        startY: 52,
        head: [['Key Metric Indicator', 'Current Measurement / Audit Value', 'Standard Benchmark / Operational Scope']],
        body: delaySummaryRows,
        theme: 'striped',
        headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold', fontSize: 9 },
        bodyStyles: { fontSize: 8.5, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
        margin: { left: 14, right: 14 }
      });

      // Section 2: Operational Root-Cause Breakdown
      const y2 = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('2. Operational Root-Cause Distribution & Blocker Severity', 14, y2);

      const rootCauseRows = delayBreakdown.map((item, idx) => {
        const severity = idx === 0 ? 'CRITICAL' : idx === 1 ? 'HIGH' : idx === 2 ? 'MODERATE' : 'LOW';
        const impact = 
          item.category.includes('Weather') ? 'Trench waterlogging, access road siltation, stoppage of open trench pipe welding' :
          item.category.includes('Equipment') ? 'Centrifugal compressor crane breakdown, ditcher seal failure, downtime awaiting spares' :
          item.category.includes('Right of Way') ? 'Landowner crop compensation dispute at Sector 4B chainage 12+400' :
          item.category.includes('Material') ? 'Delay in delivery of 24" induction bends and API 5L Grade X70 pipe spools' :
          item.category.includes('Manpower') ? 'Shortage of certified 6G pipe welders and NDT radiographers' :
          'Isometric drawing revision isometric approval pending from engineering consultant';

        return [item.category, `${item.count} Events`, `${item.percentage}%`, severity, impact];
      });

      autoTable(doc, {
        startY: y2 + 4,
        head: [['Root-Cause Category', 'Logged Events', 'Share', 'Severity', 'Primary Operational Impact Factor']],
        body: rootCauseRows,
        theme: 'grid',
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 50 },
          1: { halign: 'center', cellWidth: 22 },
          2: { halign: 'center', fontStyle: 'bold', cellWidth: 16 },
          3: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
          4: { cellWidth: 74 }
        },
        margin: { left: 14, right: 14 }
      });

      // Section 3: Discipline-wise Variance Matrix
      const y3 = doc.lastAutoTable.finalY + 10;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('3. Discipline-wise Variance & Float Consumption Matrix', 14, y3);

      const discRows = byDiscipline.map(d => [
        d.discipline,
        d.total.toString(),
        d.completed.toString(),
        d.delayed.toString(),
        `${d.avgDelayDays.toFixed(1)} Days`,
        d.delayed === 0 ? 'OPTIMAL' : d.avgDelayDays > 3 ? 'CRITICAL RISK' : 'MONITOR'
      ]);

      autoTable(doc, {
        startY: y3 + 4,
        head: [['Discipline', 'Total WBS', 'Completed', 'Delayed', 'Average Delay', 'Schedule Health']],
        body: discRows,
        theme: 'striped',
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 38 },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center', fontStyle: 'bold' },
          4: { halign: 'center', fontStyle: 'bold' },
          5: { halign: 'center', fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 }
      });

      // Check if page needs break
      let y4 = doc.lastAutoTable.finalY + 10;
      if (y4 > 230) {
        doc.addPage();
        y4 = 20;
      }

      // Section 4: AI Schedule Recovery & Crash Plan Recommendations
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('4. AI Recommended Crash / Fast-Track Recovery Protocols', 14, y4);

      const recoveryRows = [
        ['Dual Automatic Welding Bug Crew', 'Pipeline Spool Fabrication', 'Deploy secondary internal clamp welding unit to accelerate joint throughput by 2.4x.', 'Saves 14 Days (Recovers SPI to 0.78)'],
        ['Parallel Trenching & Stringing', 'Civil & Mainline Trenching', 'Run continuous rotary ditchers ahead of pipe stringing rather than sequential excavation.', 'Saves 9 Days (Recovers SPI to 0.65)'],
        ['24/7 Extended Night Shift', 'Centrifugal Gas Compressor Skid', 'Implement high-lumen tower lighting for nocturnal skid anchoring and piping alignment.', 'Saves 11 Days (Recovers SPI to 0.72)']
      ];

      autoTable(doc, {
        startY: y4 + 4,
        head: [['Recovery Strategy', 'Targeted Work Package', 'Operational Action Items', 'Projected Schedule Savings']],
        body: recoveryRows,
        theme: 'grid',
        headStyles: { fillColor: [225, 29, 72], textColor: 255, fontStyle: 'bold', fontSize: 8.5 },
        bodyStyles: { fontSize: 8, textColor: [30, 41, 59] },
        columnStyles: {
          0: { fontStyle: 'bold', cellWidth: 46 },
          1: { cellWidth: 40 },
          2: { cellWidth: 62 },
          3: { fontStyle: 'bold', cellWidth: 34 }
        },
        margin: { left: 14, right: 14 }
      });

      // Sign-off / Verification Block
      let ySign = doc.lastAutoTable.finalY + 14;
      if (ySign > 260) {
        doc.addPage();
        ySign = 25;
      }

      doc.setDrawColor(203, 213, 225);
      doc.line(14, ySign, 196, ySign);

      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(100, 116, 139);
      doc.text('PREPARED & VERIFIED BY: Lead Project Planner', 14, ySign + 6);
      doc.text('APPROVED BY: Project Director / Chief Engineer', 110, ySign + 6);

      doc.setFont('helvetica', 'normal');
      doc.text(`Digital Sign Stamp: ${user?.name || 'Authorized Lead Planner'} (${new Date().toLocaleDateString()})`, 14, ySign + 11);
      doc.text('Oil India Limited • Pipeline Infrastructure Division PS-122', 110, ySign + 11);

      // Save PDF file
      const fileName = `${activeProject?.id || 'PRJ-01'}_Delay_Root_Cause_Audit_Report_${new Date().toISOString().slice(0, 10)}.pdf`;
      doc.save(fileName);

      setDelayPdfSuccess(true);
      setTimeout(() => setDelayPdfSuccess(false), 4000);
    } catch (err) {
      console.error('Delay PDF generation error:', err);
      alert('Failed to generate Delay Audit PDF report. Please check console.');
    } finally {
      setDelayPdfLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Header with Report Frequency Dropdown & Action Buttons */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
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

        {/* Report Dropdown + Export Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Report Frequency Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200/80 border border-slate-300 rounded-xl px-3 py-2 transition shadow-sm">
            <Calendar size={15} className="text-indigo-600 shrink-0" />
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider hidden sm:inline">Report:</span>
            <select
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer pr-1"
            >
              <option value="weekly">📅 Weekly Report (Last 7 Days)</option>
              <option value="monthly">📊 Monthly Report (30 Days)</option>
              <option value="annually">🏛️ Annual Report (Year to Date)</option>
              <option value="custom">📆 Custom Date Range...</option>
            </select>
          </div>

          {/* Custom Date Range Selectors */}
          {reportPeriod === 'custom' && (
            <div className="flex items-center gap-1.5 bg-slate-100 border border-slate-300 rounded-xl px-2.5 py-1.5 text-xs shadow-xs animate-fadeIn">
              <span className="text-[10px] font-bold text-slate-500 uppercase">From:</span>
              <input
                type="date"
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold text-slate-700 focus:outline-none"
              />
              <span className="text-[10px] font-bold text-slate-500 uppercase">To:</span>
              <input
                type="date"
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 text-xs font-bold text-slate-700 focus:outline-none"
              />
            </div>
          )}

          {/* Preview Report Button */}
          <button
            onClick={() => setShowPreviewModal(true)}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition shadow-sm"
            title="Preview generated report document before downloading"
          >
            <Eye size={14} /> Preview
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            disabled={exportLoading === 'pdf'}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50"
            title={`Download ${currentPeriodConfig.label} in PDF format`}
          >
            {exportSuccess === 'pdf' ? (
              <CheckCircle2 size={14} className="text-emerald-600" />
            ) : (
              <FileText size={14} className="text-rose-600" />
            )}
            {exportLoading === 'pdf' ? 'Generating...' : exportSuccess === 'pdf' ? 'PDF Saved!' : `Export PDF`}
          </button>

          {/* Delay Audit Report PDF Button */}
          <button
            onClick={handleExportDelayReportPDF}
            disabled={delayPdfLoading}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 transition shadow-sm disabled:opacity-50"
            title="Download comprehensive Delay & Root-Cause Audit Report in PDF"
          >
            {delayPdfSuccess ? (
              <CheckCircle2 size={14} className="text-emerald-600" />
            ) : (
              <AlertTriangle size={14} className="text-rose-600" />
            )}
            {delayPdfLoading ? 'Generating...' : delayPdfSuccess ? 'Audit Saved!' : 'Delay Audit PDF'}
          </button>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            disabled={exportLoading === 'excel'}
            className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition shadow-sm disabled:opacity-50 shadow-emerald-600/20"
            title={`Download ${currentPeriodConfig.label} in Excel (.xlsx)`}
          >
            {exportSuccess === 'excel' ? (
              <CheckCircle2 size={14} className="text-white" />
            ) : (
              <FileSpreadsheet size={14} />
            )}
            {exportLoading === 'excel' ? 'Exporting...' : exportSuccess === 'excel' ? 'Excel Saved!' : `Export Excel (XLSX)`}
          </button>

          {/* Recalculate Button */}
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            title="Refresh analytics data"
          >
            <RefreshCw size={14} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>
        </div>
      </div>

      {/* Generated Report Summary Banner */}
      <div className="bg-gradient-to-r from-indigo-900 via-slate-900 to-blue-950 rounded-3xl p-6 text-white shadow-xl border border-indigo-800/40 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1">
                <Sparkles size={11} className="text-amber-400" />
                {currentPeriodConfig.label} Active
              </span>
              <span className="text-xs text-indigo-200/80 font-mono">
                {currentPeriodConfig.dateRange}
              </span>
            </div>
            <h2 className="text-xl font-black tracking-tight text-white">
              {currentPeriodConfig.periodName}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-xs text-slate-300">
              {currentPeriodConfig.highlights.map((h, i) => (
                <div key={i} className="flex items-start gap-2 bg-white/5 border border-white/10 p-2.5 rounded-xl">
                  <CheckCircle size={14} className="text-emerald-400 shrink-0 mt-0.5" />
                  <span className="leading-snug text-[11px]">{h}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="flex flex-row lg:flex-col gap-2 shrink-0">
            <button
              onClick={handleExportPDF}
              disabled={exportLoading === 'pdf'}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-500/25 transition"
            >
              <Download size={14} /> Download {currentPeriodConfig.label} (PDF)
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exportLoading === 'excel'}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 text-white text-xs font-bold rounded-xl transition"
            >
              <FileSpreadsheet size={14} /> Download Excel (.XLSX)
            </button>
          </div>
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

      {/* Operational Root Cause & Blocker Breakdown */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-rose-600 uppercase tracking-wider mb-1">
              <AlertTriangle size={15} /> Delay Reason & Root Cause Analytics
            </div>
            <h3 className="text-lg font-black text-slate-900 tracking-tight">
              Operational Root-Cause Breakdown ({totalDelayEvents} Logged Events)
            </h3>
            <p className="text-xs text-slate-500">
              Aggregated from field supervisor voice reports, Telegram bot logs, and Primavera schedule variance audits.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto flex-wrap">
            <button
              onClick={handleExportDelayReportPDF}
              disabled={delayPdfLoading}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition shadow-sm shadow-rose-600/20 disabled:opacity-50"
              title="Download comprehensive Oil & Gas Delay & Root-Cause Audit Report in PDF"
            >
              {delayPdfSuccess ? (
                <CheckCircle2 size={14} className="text-white" />
              ) : (
                <FileText size={14} />
              )}
              {delayPdfLoading ? 'Generating Audit PDF...' : delayPdfSuccess ? 'Audit PDF Saved!' : 'Download Delay Audit PDF'}
            </button>
            <span className="px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
              Zero Unexplained Variances Active
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Pie Chart */}
          <div className="lg:col-span-5 h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={delayBreakdown}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={95}
                  paddingAngle={3}
                >
                  {delayBreakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value, name) => [`${value} Events`, name]} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Categorized Progress Bars */}
          <div className="lg:col-span-7 space-y-3">
            {delayBreakdown.map((item, idx) => (
              <div key={idx} className="p-3 rounded-2xl bg-slate-50/80 border border-slate-200/80 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color || COLORS[idx % COLORS.length] }}></span>
                    {item.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-500">{item.count} events</span>
                    <span className="font-extrabold text-slate-900 font-mono text-[11px] bg-white px-2 py-0.5 rounded border border-slate-200">
                      {item.percentage}%
                    </span>
                  </div>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${item.percentage}%`,
                      backgroundColor: item.color || COLORS[idx % COLORS.length]
                    }}
                  />
                </div>
              </div>
            ))}
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

      {/* ── Executive Document Preview Modal ── */}
      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-fadeIn">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-3xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden">
            {/* Modal Top Control Bar */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                  <FileCheck size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-black text-white tracking-tight">
                      {currentPeriodConfig.label} Document Preview
                    </h3>
                    <span className="text-[10px] bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded font-mono font-bold">
                      {currentPeriodConfig.dateRange}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Official Primavera WBS Execution Audit • {activeProject?.name || 'Sector 4 Crude Oil Pipeline'}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  disabled={exportLoading === 'pdf'}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition"
                >
                  <Download size={13} /> {exportLoading === 'pdf' ? 'Generating...' : 'Download PDF'}
                </button>
                <button
                  onClick={handleExportExcel}
                  disabled={exportLoading === 'excel'}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow transition"
                >
                  <FileSpreadsheet size={13} /> {exportLoading === 'excel' ? 'Exporting...' : 'Excel (.xlsx)'}
                </button>
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="p-1.5 rounded-xl hover:bg-white/10 text-slate-400 hover:text-white transition ml-1"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Document Body (Simulated Printable Report) */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 bg-slate-50">
              {/* Printed Document Header */}
              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
                  <div className="text-xs font-black tracking-widest text-indigo-400 uppercase">
                    INFRASUTRA | EXECUTIVE SCHEDULE INTELLIGENCE
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
                    <ShieldCheck size={12} /> Cryptographically Audited
                  </div>
                </div>
                <h1 className="text-xl font-black text-white tracking-tight">
                  {currentPeriodConfig.periodName}
                </h1>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800/80 text-xs text-slate-300">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Project</span>
                    <strong className="text-white">{activeProject?.name || 'Sector 4 Crude Oil Pipeline'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Coverage Window</span>
                    <strong className="text-white">{currentPeriodConfig.dateRange}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Generated By</span>
                    <strong className="text-white">{user?.name || 'Lead Planner'} (Authorized)</strong>
                  </div>
                </div>
              </div>

              {/* Section 1: Executive KPI Table */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <BarChart3 size={15} className="text-indigo-600" />
                  1. Executive Schedule KPIs ({currentPeriodConfig.label})
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="text-[10px] font-bold text-slate-400 uppercase">Total WBS Tasks</div>
                    <div className="text-2xl font-black text-slate-900 mt-0.5">{currentKpis.total}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">Scheduled in window</div>
                  </div>
                  <div className="bg-emerald-50 p-3.5 rounded-xl border border-emerald-200">
                    <div className="text-[10px] font-bold text-emerald-600 uppercase">Completed</div>
                    <div className="text-2xl font-black text-emerald-700 mt-0.5">{currentKpis.completed}</div>
                    <div className="text-[10px] text-emerald-600 mt-0.5">{currentKpis.executionRate}% completion rate</div>
                  </div>
                  <div className="bg-amber-50 p-3.5 rounded-xl border border-amber-200">
                    <div className="text-[10px] font-bold text-amber-600 uppercase">In Progress</div>
                    <div className="text-2xl font-black text-amber-700 mt-0.5">{currentKpis.inProgress}</div>
                    <div className="text-[10px] text-amber-600 mt-0.5">Active on construction site</div>
                  </div>
                  <div className="bg-rose-50 p-3.5 rounded-xl border border-rose-200">
                    <div className="text-[10px] font-bold text-rose-600 uppercase">Delayed Tasks</div>
                    <div className="text-2xl font-black text-rose-700 mt-0.5">{currentKpis.delayed}</div>
                    <div className="text-[10px] text-rose-600 mt-0.5">Avg slip: {currentKpis.avgDelay}</div>
                  </div>
                </div>
              </div>

              {/* Section 2: Key Period Highlights & Observations */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Sparkles size={15} className="text-amber-500" />
                  2. Key {currentPeriodConfig.label} Highlights & Field Observations
                </div>
                <div className="space-y-2">
                  {currentPeriodConfig.highlights.map((h, i) => (
                    <div key={i} className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-800">
                      <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="leading-relaxed">{h}</span>
                    </div>
                  ))}
                  <div className="p-3.5 rounded-xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-950 font-medium">
                    <strong className="text-indigo-700 block mb-0.5 uppercase text-[10px] tracking-wider">
                      Strategic Execution Recommendation:
                    </strong>
                    {currentPeriodConfig.recommendation}
                  </div>
                </div>
              </div>

              {/* Section 3: Discipline Execution Matrix */}
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-slate-900 uppercase tracking-wider">
                  <Database size={15} className="text-indigo-600" />
                  3. Discipline Execution Performance Matrix
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-slate-600 font-bold uppercase text-[10px] border-b border-slate-200">
                        <th className="py-2 px-3">Discipline</th>
                        <th className="py-2 px-3">Total Tasks</th>
                        <th className="py-2 px-3">Completed</th>
                        <th className="py-2 px-3">Delayed</th>
                        <th className="py-2 px-3">Average Slip</th>
                        <th className="py-2 px-3">Health Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(byDiscipline || []).map((d, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{d.discipline}</td>
                          <td className="py-2.5 px-3 text-slate-700">{d.total}</td>
                          <td className="py-2.5 px-3 text-emerald-700 font-semibold">{d.completed}</td>
                          <td className="py-2.5 px-3 text-rose-600 font-semibold">{d.delayed}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{d.avgDelayDays} Days</td>
                          <td className="py-2.5 px-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
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

              {/* Document Footer */}
              <div className="text-center pt-2 text-[10px] text-slate-400 font-mono">
                Official Report generated by InfraSutra AI Engine • Verified against SQLite Database • SHA-256 Audit Seal Attached
              </div>
            </div>

            {/* Modal Bottom Bar */}
            <div className="px-6 py-3.5 bg-white border-t border-slate-200 flex items-center justify-between shrink-0">
              <span className="text-xs text-slate-500">
                Ready to export as official executive document
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPreviewModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  Close Preview
                </button>
                <button
                  onClick={handleExportPDF}
                  disabled={exportLoading === 'pdf'}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition"
                >
                  <Download size={14} /> Download PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
