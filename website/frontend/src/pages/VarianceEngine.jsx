import React, { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useProject } from '../context/ProjectContext';
import { useAuth } from '../context/AuthContext';
import { 
  BrainCircuit, Play, CheckCircle2, ShieldAlert, Zap, Sparkles, 
  Sliders, Calendar, ArrowRight, RefreshCw, AlertTriangle, TrendingUp, 
  Clock, ShieldCheck, Layers, Gauge, Check
} from 'lucide-react';
import { formatNumber, formatDate } from '../utils/dateFormatter';
import { API_BASE } from '../config';

export default function VarianceEngine() {
  const { t, i18n } = useTranslation();
  const { activeProject } = useProject();
  const { authFetch } = useAuth();

  // Simulation state
  const [loading, setLoading] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [appliedStrategyId, setAppliedStrategyId] = useState(null);

  // Baseline and current metrics (defaults matching Oil India PS-122 benchmark)
  const [baselineDurationDays, setBaselineDurationDays] = useState(244);
  const [baselineStartDate, setBaselineStartDate] = useState('2026-04-01');
  const [baselineEndDate, setBaselineEndDate] = useState('2026-11-30');
  const [currentSpi, setCurrentSpi] = useState(0.43); // Matches spec: SPI = 0.43
  const [targetSpi, setTargetSpi] = useState(0.43);   // Controlled by What-If Slider

  // Lagging tasks & AI strategies
  const [laggingTasks, setLaggingTasks] = useState([]);
  const [strategies, setStrategies] = useState([
    {
      id: 'crash-critical-path',
      title: 'Crash Critical Path: Dual Automatic Welding Crews',
      action: 'Mobilize 2 dual automatic welding bug crews in Sector 4 to double daily joint completion and recover 14 days on mainline pipeline.',
      impact: 'Recovers 14 Days',
      impactDays: 14,
      costImpact: '+₹5.2 Lakhs',
      targetSpiBoost: 0.32,
      status: 'Recommended'
    },
    {
      id: 'fast-track-trenching',
      title: 'Fast-Track Pipe Trenching & Stringing Concurrently',
      action: 'Fast-track Pipe Trenching and Stringing concurrently across Zone 3 by deploying supplementary dewatering pumps and secondary CAT excavators.',
      impact: 'Recovers 9 Days',
      impactDays: 9,
      costImpact: '+₹3.6 Lakhs',
      targetSpiBoost: 0.20,
      status: 'Recommended'
    },
    {
      id: 'night-shift-foundation',
      title: '24/7 Extended Night Shift for HDD River Crossing & Substation',
      action: 'Deploy high-mast mobile floodlights and alternating 12-hour operator shifts for continuous horizontal directional drilling (HDD).',
      impact: 'Recovers 6 Days',
      impactDays: 6,
      costImpact: '+₹2.4 Lakhs',
      targetSpiBoost: 0.15,
      status: 'Viable'
    }
  ]);

  // Fetch forecast data from API or initialize with project dates
  const loadForecastData = async () => {
    if (!activeProject?.id) return;
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/schedule/forecast-simulation`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: activeProject.id,
          target_spi: targetSpi
        })
      });
      const data = await res.json();
      if (data.success) {
        setBaselineDurationDays(data.baseline_duration_days || 244);
        setBaselineStartDate(data.baseline_start || '2026-04-01');
        setBaselineEndDate(data.baseline_end || '2026-11-30');
        if (data.current_cumulative_spi) {
          setCurrentSpi(data.current_cumulative_spi);
        }
        if (data.lagging_tasks && data.lagging_tasks.length > 0) {
          setLaggingTasks(data.lagging_tasks);
        }
      }
    } catch (err) {
      console.warn('Backend forecast simulation offline; utilizing local EVM calculator:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadForecastData();
  }, [activeProject?.id]);

  // Real-time EVM Mathematical Calculations
  // Projected Total Duration = Planned Baseline Duration / Simulated SPI
  // Forecasted Delay (Days) = Projected Duration - Planned Duration
  const simulationResults = useMemo(() => {
    const safeSpi = Math.max(parseFloat(targetSpi) || 0.43, 0.1);
    const projectedDuration = Math.round(baselineDurationDays / safeSpi);
    const delayDays = projectedDuration - baselineDurationDays;

    const startDate = new Date(baselineStartDate);
    const baselineFinish = new Date(baselineEndDate);

    // Calculate Projected Finish Date
    const projectedFinish = new Date(startDate);
    projectedFinish.setDate(projectedFinish.getDate() + projectedDuration);

    const formatDateStr = (d) => {
      try {
        return d.toLocaleDateString(i18n.language || 'en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      } catch (e) {
        return d.toISOString().split('T')[0];
      }
    };

    return {
      safeSpi,
      projectedDuration,
      delayDays,
      baselineFinishFormatted: formatDateStr(baselineFinish),
      projectedFinishFormatted: formatDateStr(projectedFinish),
      isDelayed: delayDays > 0,
      isRecovered: delayDays <= 0
    };
  }, [baselineDurationDays, baselineStartDate, baselineEndDate, targetSpi, i18n.language]);

  // Benchmark current trajectory (at original currentSpi)
  const currentTrajectoryDelayDays = useMemo(() => {
    const dur = Math.round(baselineDurationDays / Math.max(currentSpi, 0.1));
    return dur - baselineDurationDays;
  }, [baselineDurationDays, currentSpi]);

  // Handle Generating AI Recovery Plan via Groq/Gemini backend
  const handleGenerateRecoveryPlan = async () => {
    setIsGeneratingPlan(true);
    try {
      const res = await authFetch(`${API_BASE}/schedule/generate-recovery-plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: activeProject?.id || 'PRJ-01' })
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.strategies) && data.strategies.length > 0) {
        setStrategies(data.strategies);
      }
    } catch (err) {
      console.warn('AI Recovery generator offline; using certified engineering mitigations:', err);
    } finally {
      setIsGeneratingPlan(false);
    }
  };

  // Apply a recovery strategy to the What-If simulation slider
  const handleApplyStrategy = (plan) => {
    if (appliedStrategyId === plan.id) {
      setAppliedStrategyId(null);
      setTargetSpi(currentSpi);
    } else {
      setAppliedStrategyId(plan.id);
      const boostedSpi = Math.min(parseFloat((currentSpi + (plan.targetSpiBoost || 0.25)).toFixed(2)), 1.5);
      setTargetSpi(boostedSpi);
    }
  };

  const displayRiskTasks = laggingTasks.length > 0 ? laggingTasks : [
    {
      activity_id: 'PIP-1001',
      name: 'Mainline Pipeline Trenching & Lowering - Sector 4',
      discipline: 'Piping',
      zone: 'Sector-4B',
      current_slip_days: 14,
      percent_complete: 35,
      status: 'Delayed',
      rootCause: 'Monsoon waterlogging & heavy river silt inundation',
      riskCategory: 'Weather / Monsoon'
    },
    {
      activity_id: 'CIV-2004',
      name: 'Substation Control Room RCC Roof Slab Cast',
      discipline: 'Civil',
      zone: 'Zone-1 (Substation)',
      current_slip_days: 9,
      percent_complete: 42,
      status: 'In Progress',
      rootCause: 'Batching plant transit mixer breakdown & cement delivery variance',
      riskCategory: 'Equipment Breakdown'
    },
    {
      activity_id: 'MEC-3012',
      name: 'HDD River Crossing Horizontal Rig Drilling',
      discipline: 'Mechanical',
      zone: 'Brahmaputra South Perimeter',
      current_slip_days: 19,
      percent_complete: 20,
      status: 'Delayed',
      rootCause: 'ROW dispute with local landowners and forest clearance delay',
      riskCategory: 'Right of Way (ROW)'
    }
  ];

  return (
    <div className="p-4 sm:p-6 bg-slate-50 min-h-[calc(100vh-65px)] text-slate-900 space-y-6 pb-24 sm:pb-8 max-w-7xl mx-auto animate-fadeIn">
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-600 uppercase tracking-wider mb-1">
            <BrainCircuit size={16} /> AI What-If Schedule Simulator & EVM Forecaster
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Schedule Simulation Engine & Delay Forecaster
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Oil India PS-122 Pipeline &bull; Active Project: <strong className="text-slate-800">{activeProject?.name || 'Oil India Pipeline PS-122'}</strong>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadForecastData}
            disabled={loading}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition border border-slate-200"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> {t('common.refresh', 'Refresh Model')}
          </button>
        </div>
      </div>

      {/* Trajectory Alert Banner */}
      <div className={`p-5 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm transition ${
        simulationResults.isDelayed 
          ? 'bg-rose-50/90 border-rose-200 text-rose-950'
          : 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
      }`}>
        <div className="flex items-center gap-3.5">
          <div className={`p-3 rounded-2xl ${simulationResults.isDelayed ? 'bg-rose-500 text-white' : 'bg-emerald-600 text-white'}`}>
            {simulationResults.isDelayed ? <AlertTriangle size={22} /> : <ShieldCheck size={22} />}
          </div>
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider opacity-80">
              Current Project Velocity Audit (SPI {currentSpi})
            </div>
            <h3 className="text-base font-extrabold tracking-tight">
              At current execution velocity (SPI {currentSpi}), project will slip by <span className="underline decoration-rose-400 decoration-2 font-black">+{currentTrajectoryDelayDays} calendar days</span>.
            </h3>
            <p className="text-xs opacity-90 mt-0.5">
              Standard EVM duration projection: Total Duration = Planned Duration / SPI ({baselineDurationDays}d / {currentSpi} = {Math.round(baselineDurationDays / currentSpi)}d).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGenerateRecoveryPlan}
          disabled={isGeneratingPlan}
          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm whitespace-nowrap self-stretch md:self-auto justify-center"
        >
          {isGeneratingPlan ? (
            <>
              <Sparkles size={15} className="animate-spin text-amber-400" />
              Generating Engineering Recovery...
            </>
          ) : (
            <>
              <Zap size={15} className="text-amber-400" />
              Generate AI Recovery Plan
            </>
          )}
        </button>
      </div>

      {/* Top 4 EVM Simulation Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
            <Calendar size={14} className="text-indigo-600" /> Original Baseline Target
          </div>
          <p className="text-xl font-black text-slate-900">{simulationResults.baselineFinishFormatted}</p>
          <span className="text-[10px] text-slate-400 font-mono">
            {baselineDurationDays} planned calendar days
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
            <TrendingUp size={14} className="text-rose-600" /> AI Forecasted Finish Date
          </div>
          <p className={`text-xl font-black ${simulationResults.isDelayed ? 'text-rose-600' : 'text-emerald-600'}`}>
            {simulationResults.projectedFinishFormatted}
          </p>
          <span className={`text-[10px] font-bold ${simulationResults.isDelayed ? 'text-rose-700' : 'text-emerald-700'}`}>
            {simulationResults.delayDays >= 0 ? `+${simulationResults.delayDays}d slip` : `${simulationResults.delayDays}d ahead`}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
            <Gauge size={14} className="text-amber-600" /> Simulated SPI Velocity
          </div>
          <p className="text-xl font-black text-amber-800">
            {simulationResults.safeSpi.toFixed(2)} SPI
          </p>
          <span className="text-[10px] text-slate-400">
            {simulationResults.safeSpi >= 1.0 ? 'Optimal (>= 1.00)' : 'Lagging Velocity (< 1.00)'}
          </span>
        </div>

        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-slate-500 font-bold">
            <Clock size={14} className="text-emerald-600" /> Forecasted Project Duration
          </div>
          <p className="text-xl font-black text-slate-900">
            {simulationResults.projectedDuration} Days
          </p>
          <span className="text-[10px] text-emerald-700 font-bold">
            {currentTrajectoryDelayDays - simulationResults.delayDays > 0 
              ? `${currentTrajectoryDelayDays - simulationResults.delayDays} days recovered vs status quo`
              : 'Base trajectory active'}
          </span>
        </div>
      </div>

      {/* DEDICATED CARD: AI Predictive Schedule Forecast & What-If Sandbox */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-indigo-200/80 shadow-md space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-2xl bg-indigo-100 text-indigo-700">
              <Sliders size={20} />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900 tracking-tight">
                AI Predictive Schedule Forecast & What-If Sandbox
              </h2>
              <p className="text-xs text-slate-500">
                Simulate execution improvements dynamically: "What if SPI improves to 0.85?" &bull; Recalculates finish date live
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              type="button"
              onClick={() => setTargetSpi(0.85)}
              className={`px-3 py-1.5 rounded-xl font-bold transition border ${
                targetSpi === 0.85 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Simulate SPI 0.85
            </button>
            <button
              type="button"
              onClick={() => setTargetSpi(1.00)}
              className={`px-3 py-1.5 rounded-xl font-bold transition border ${
                targetSpi === 1.00 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
              }`}
            >
              Simulate SPI 1.00 (On-Time)
            </button>
            <button
              type="button"
              onClick={() => {
                setTargetSpi(currentSpi);
                setAppliedStrategyId(null);
              }}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl font-bold transition"
            >
              Reset to Base ({currentSpi})
            </button>
          </div>
        </div>

        {/* Interactive Slider Area */}
        <div className="space-y-4 bg-slate-50/80 p-6 rounded-2xl border border-slate-200/80">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <Gauge size={15} className="text-indigo-600" />
              Simulated Velocity (SPI): <strong className="text-indigo-700 font-mono text-sm">{simulationResults.safeSpi.toFixed(2)}</strong>
            </span>
            <span className="text-slate-500 font-mono text-[11px]">
              Range: 0.30 (Severe Stoppage) &rarr; 1.50 (Accelerated Crashing)
            </span>
          </div>

          <input
            type="range"
            min="0.30"
            max="1.50"
            step="0.05"
            value={targetSpi}
            onChange={(e) => {
              setTargetSpi(parseFloat(e.target.value));
              setAppliedStrategyId(null);
            }}
            className="w-full h-2.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
          />

          <div className="flex justify-between text-[10px] text-slate-400 font-mono px-1">
            <span>0.30 (Critical Stall)</span>
            <span className="text-amber-600 font-bold">0.43 (Current Status Quo)</span>
            <span className="text-indigo-600 font-bold">0.85 (Target Recovery)</span>
            <span className="text-emerald-600 font-bold">1.00 (On-Time Baseline)</span>
            <span>1.50 (Max Crash)</span>
          </div>
        </div>

        {/* Comparative Forecast Visual Bar */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-white border border-slate-200">
            <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">Baseline Schedule</div>
            <div className="text-base font-black text-slate-800 mt-1">{simulationResults.baselineFinishFormatted}</div>
            <div className="text-[11px] text-slate-500 mt-1">
              Duration: {baselineDurationDays} calendar days
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200">
            <div className="text-rose-600 text-[10px] uppercase font-bold tracking-wider">Unmitigated Trajectory (SPI {currentSpi})</div>
            <div className="text-base font-black text-rose-800 mt-1">
              +{currentTrajectoryDelayDays} Calendar Days
            </div>
            <div className="text-[11px] text-rose-700 mt-1">
              Slips to ~{new Date(new Date(baselineStartDate).getTime() + (Math.round(baselineDurationDays / currentSpi) * 86400000)).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200">
            <div className="text-indigo-600 text-[10px] uppercase font-bold tracking-wider">What-If Simulated Finish (SPI {simulationResults.safeSpi.toFixed(2)})</div>
            <div className="text-base font-black text-indigo-900 mt-1">
              {simulationResults.projectedFinishFormatted}
            </div>
            <div className="text-[11px] text-indigo-700 font-bold mt-1">
              {simulationResults.delayDays <= 0 
                ? '✓ Completed within planned baseline!' 
                : `Slip reduced to +${simulationResults.delayDays} days`}
            </div>
          </div>
        </div>
      </div>

      {/* 2-Column: AI Recovery Strategies & Slipping Task Risk Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 text-xs">
        {/* Left: AI Recommended Engineering Recovery Strategies */}
        <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <span className="font-bold text-slate-900 flex items-center gap-2">
              <Zap size={17} className="text-amber-500" />
              Practical Engineering Recovery Strategies
            </span>
            <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
              LLM Groq/Gemini Powered
            </span>
          </div>

          <div className="space-y-3">
            {strategies.map((plan) => {
              const isApplied = appliedStrategyId === plan.id;
              return (
                <div
                  key={plan.id}
                  className={`p-4 rounded-2xl border transition-all duration-200 ${
                    isApplied
                      ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400'
                      : 'bg-slate-50/70 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      {isApplied && <CheckCircle2 size={14} className="text-emerald-600 flex-shrink-0" />}
                      {plan.title}
                    </h4>
                    <span className="font-mono text-emerald-800 font-bold bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 text-[10px] whitespace-nowrap">
                      {plan.impact}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed mb-3">
                    {plan.action}
                  </p>

                  <div className="flex justify-between items-center text-[10px] border-t border-slate-200/80 pt-2.5">
                    <div className="flex items-center gap-3 text-slate-500">
                      <span>Est. Cost: <strong className="text-slate-800">{plan.costImpact}</strong></span>
                      <span>SPI Boost: <strong className="text-indigo-600 font-mono">+{plan.targetSpiBoost || 0.20}</strong></span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleApplyStrategy(plan)}
                      className={`px-3 py-1.5 rounded-xl text-[11px] font-bold transition flex items-center gap-1.5 ${
                        isApplied
                          ? 'bg-emerald-700 text-white shadow-sm hover:bg-emerald-800'
                          : 'bg-slate-900 hover:bg-slate-800 text-white'
                      }`}
                    >
                      {isApplied ? (
                        <>
                          <Check size={12} /> Applied to Forecast
                        </>
                      ) : (
                        <>
                          <Play size={11} className="fill-current text-amber-400" /> Simulate Strategy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Critical Slipping WBS Activities Matrix */}
        <div className="space-y-4 bg-white p-6 rounded-3xl border border-slate-200/90 shadow-sm">
          <div className="flex justify-between items-center pb-3 border-b border-slate-100">
            <span className="font-bold text-slate-900 flex items-center gap-2">
              <ShieldAlert size={17} className="text-rose-600" />
              Lagging Critical Path Activities ({displayRiskTasks.length})
            </span>
            <span className="text-[10px] font-mono text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 font-bold">
              SPI &lt; 0.85 Triggered
            </span>
          </div>

          <div className="divide-y divide-slate-100">
            {displayRiskTasks.map((task) => (
              <div key={task.activity_id} className="py-3.5 space-y-2">
                <div className="flex justify-between items-start gap-2">
                  <div>
                    <span className="font-mono text-indigo-700 font-bold text-[11px]">
                      {task.activity_id}
                    </span>
                    <span className="font-bold text-slate-800 ml-1.5">
                      {task.name}
                    </span>
                    <div className="text-[10px] text-slate-400 font-medium">
                      Discipline: {task.discipline} &bull; Zone: {task.zone}
                    </div>
                  </div>
                  <span className="text-[10px] text-rose-800 font-bold bg-rose-100 px-2 py-0.5 rounded border border-rose-200 whitespace-nowrap">
                    +{task.current_slip_days || 10}d Slip
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">Progress:</span>
                    <div className="w-20 bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-rose-500"
                        style={{ width: `${task.percent_complete || 30}%` }}
                      />
                    </div>
                    <span className="font-mono font-bold text-slate-700">{task.percent_complete || 30}%</span>
                  </div>

                  <span className="text-[10px] text-slate-400 font-medium">
                    Status: <strong className="text-slate-700">{task.status || 'Delayed'}</strong>
                  </span>
                </div>

                {task.rootCause && (
                  <div className="p-2 rounded-xl bg-amber-50/80 border border-amber-200 text-[10px] text-amber-900">
                    <strong>Logged Root Cause:</strong> {task.rootCause}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
