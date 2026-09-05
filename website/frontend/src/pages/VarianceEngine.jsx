import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BrainCircuit, Play, CheckCircle2, ShieldAlert, Zap, Sparkles } from 'lucide-react';
import { formatNumber } from '../utils/dateFormatter';

export default function VarianceEngine() {
  const { t, i18n } = useTranslation();
  const [isSimulating, setIsSimulating] = useState(false);
  const [appliedMitigation, setAppliedMitigation] = useState(null);

  const riskTasks = [
    {
      wbs: 'WBS-2.1',
      name: t('mitigation.pipelineTrenching', 'Pipeline Trenching - Sector 4'),
      currentSlip: `-12 ${t('dashboard.days', 'Days')}`,
      predictedSlip: `-21 ${t('dashboard.days', 'Days')}`,
      confidence: `${formatNumber(94, i18n.language)}%`,
      rootCause: t('dataCapture.delayReasons.weather', 'Monsoon earthwork slowdown & heavy rocky terrain'),
      riskLevel: t('analytics.critical', 'High'),
    },
    {
      wbs: 'WBS-1.2',
      name: t('mitigation.siteEarthworks', 'Site Earthworks & Clearing (Zone A)'),
      currentSlip: `-8 ${t('dashboard.days', 'Days')}`,
      predictedSlip: `-14 ${t('dashboard.days', 'Days')}`,
      confidence: `${formatNumber(88, i18n.language)}%`,
      rootCause: t('dataCapture.delayReasons.equipment', 'Subcontractor equipment maintenance delay'),
      riskLevel: t('analytics.critical', 'High'),
    },
    {
      wbs: 'WBS-3.1',
      name: t('mitigation.substationFoundation', 'Substation Foundation Concrete Pour'),
      currentSlip: `-3 ${t('dashboard.days', 'Days')}`,
      predictedSlip: `-9 ${t('dashboard.days', 'Days')}`,
      confidence: `${formatNumber(79, i18n.language)}%`,
      rootCause: t('dataCapture.delayReasons.material', 'Cement supply chain lead time variance'),
      riskLevel: t('analytics.moderate', 'Medium'),
    },
  ];

  const mitigations = [
    {
      id: 'fast-track',
      title: t('mitigation.fastTrackTitle', 'Fast-Track Pipeline Welding & Trenching'),
      action: t('mitigation.fastTrackAction', 'Overlapping WBS-2.1 and WBS-2.2 in parallel using dual-crew deployment.'),
      impact: t('mitigation.fastTrackImpact', 'Recovers 11 Days'),
      costImpact: '+₹4.2 Lakhs',
      status: t('mitigation.recommended', 'Recommended'),
    },
    {
      id: 'night-shift',
      title: t('mitigation.nightShiftTitle', 'Authorize 24/7 Night Shifts for Site Clearing'),
      action: t('mitigation.nightShiftAction', 'Deploy temporary lighting and dual excavator operators for WBS-1.2.'),
      impact: t('mitigation.nightShiftImpact', 'Recovers 6 Days'),
      costImpact: '+₹2.8 Lakhs',
      status: t('mitigation.viable', 'Viable'),
    },
    {
      id: 'supplier-switch',
      title: t('mitigation.supplierSwitchTitle', 'Reallocate Ready-Mix Cement from Alternate Supplier'),
      action: t('mitigation.supplierSwitchAction', 'Switch WBS-3.1 supply to local batching plant within 15 km radius.'),
      impact: t('mitigation.supplierSwitchImpact', 'Recovers 5 Days'),
      costImpact: '+₹1.1 Lakhs',
      status: t('mitigation.viable', 'Viable'),
    },
  ];

  const handleRunSimulation = () => {
    setIsSimulating(true);
    setTimeout(() => setIsSimulating(false), 1000);
  };

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-[calc(100vh-65px)] text-slate-900 space-y-6 pb-24 sm:pb-8 max-w-7xl mx-auto">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-100 border border-amber-300 text-amber-800">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">{t('mitigation.engineTitle', 'AI Schedule Variance & Mitigation Engine')}</h1>
              <p className="text-xs text-slate-500">
                {t('mitigation.engineSub', 'Machine Learning Forecast Models & Schedule Crash Strategy Optimizer')}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={handleRunSimulation}
          disabled={isSimulating}
          className="flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition shadow-sm disabled:opacity-50"
        >
          {isSimulating ? (
            <>
              <Sparkles size={14} className="animate-spin" /> {t('mitigation.simulating', 'Simulating Monte Carlo Risk...')}
            </>
          ) : (
            <>
              <Play size={14} className="fill-current text-amber-400" /> {t('mitigation.runSimulation', 'Run Risk Simulation')}
            </>
          )}
        </button>
      </div>

      {/* Metric Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs bg-white p-5 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <span className="text-slate-500 font-semibold">{t('mitigation.baselineTarget', 'Baseline Target')}</span>
          <p className="text-xl font-black text-slate-900 mt-1">Nov 30, 2026</p>
          <span className="text-[10px] text-slate-400 font-mono">{t('dataCapture.primaveraBaseline', 'Primavera P6 Active Baseline')}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold">{t('mitigation.forecast', 'AI Unmitigated Forecast')}</span>
          <p className="text-xl font-black text-rose-600 mt-1">
            {appliedMitigation ? 'Dec 11, 2026' : 'Dec 22, 2026'}
          </p>
          <span className="text-[10px] text-emerald-700 font-bold">
            {appliedMitigation ? t('mitigation.recoveryApplied', '+11 Days Recovery Applied') : t('mitigation.projectedSlip', '+22 Days Projected Slip')}
          </span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold">{t('mitigation.spiVelocity', 'Forecast SPI Velocity')}</span>
          <p className="text-xl font-black text-amber-700 mt-1">0.78 {t('chatbot.spi', 'SPI')}</p>
          <span className="text-[10px] text-slate-400">{t('mitigation.criticalDelay', 'Critical Path Delay')}</span>
        </div>
        <div>
          <span className="text-slate-500 font-semibold">{t('mitigation.pathRisk', 'Critical Path Risk')}</span>
          <p className="text-xl font-black text-slate-900 mt-1">{formatNumber(94.2, i18n.language)}% {t('analytics.critical', 'High')}</p>
          <span className="text-[10px] text-slate-400">{t('mitigation.exceedingFloat', '3 tasks exceeding float limit')}</span>
        </div>
      </div>

      {/* 2-Column Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 text-xs">
        {/* Delay Probability List */}
        <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200">
            <span className="font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert size={16} className="text-rose-600" /> {t('mitigation.highDelayRiskTasks', 'High Delay Risk Tasks')}
            </span>
            <span className="text-[10px] font-mono text-slate-500">Model: XGBoost-v2</span>
          </div>

          <div className="divide-y divide-slate-200">
            {riskTasks.map((task) => (
              <div key={task.wbs} className="py-3.5 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-slate-900 font-bold">{task.wbs} &bull; <span className="text-slate-700 font-sans">{task.name}</span></span>
                  <span className="text-[10px] text-rose-800 font-bold bg-rose-100 px-2 py-0.5 rounded border border-rose-300">
                    {task.riskLevel} ({task.confidence})
                  </span>
                </div>
                <div className="flex gap-6 text-[11px] text-slate-600">
                  <span>{t('dashboard.current', 'Current')}: <strong className="text-amber-800 font-mono">{task.currentSlip}</strong></span>
                  <span>{t('dashboard.forecast', 'Forecast')}: <strong className="text-rose-700 font-mono">{task.predictedSlip}</strong></span>
                </div>
                <p className="text-[11px] text-slate-500 italic">{t('mitigation.rootCause', 'Root Cause')}: {task.rootCause}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Mitigation Strategies */}
        <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
          <div className="flex justify-between items-center pb-3 border-b border-slate-200">
            <span className="font-bold text-slate-900 flex items-center gap-2">
              <Zap size={16} className="text-amber-600" /> {t('mitigation.recommendedTitle', 'AI Recommended Mitigation Strategies')}
            </span>
            <span className="text-[10px] text-slate-500">{t('mitigation.crashOptimization', 'Schedule Crash Optimization')}</span>
          </div>

          <div className="space-y-3">
            {mitigations.map((plan) => {
              const isApplied = appliedMitigation === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 ${
                    isApplied
                      ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-300'
                      : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <h4 className="font-bold text-slate-900 text-xs">{plan.title}</h4>
                    <span className="font-mono text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 text-[10px]">
                      {plan.impact}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mb-3">{plan.action}</p>
                  <div className="flex justify-between items-center text-[10px] border-t border-slate-200 pt-2.5">
                    <span className="text-slate-500">{t('mitigation.estimatedCost', 'Estimated Cost')}: <strong className="text-slate-900">{plan.costImpact}</strong></span>
                    <button
                      onClick={() => setAppliedMitigation(plan.id)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 ${
                        isApplied
                          ? 'bg-emerald-700 text-white shadow-sm'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {isApplied ? <><CheckCircle2 size={13} /> {t('mitigation.appliedToForecast', 'Applied to Forecast')}</> : t('mitigation.simulateStrategy', 'Simulate Strategy')}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}