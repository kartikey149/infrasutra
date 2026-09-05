/**
 * Infrasutra Generative Suggestion Engine
 * Works 100% client-side. Zero API calls. Zero latency.
 */

export function extractEntities(text) {
  const t = text.toLowerCase();
  const locationMatch =
    text.match(/\b(Zone[-\s]?\d+[A-Za-z]?)\b/i) ||
    text.match(/\b(Sector[-\s]?\d+[A-Za-z]?)\b/i) ||
    text.match(/\b(Area[-\s]?\d+[A-Za-z]?)\b/i) ||
    text.match(/\b(Unit[-\s]?\d+[A-Za-z]?)\b/i);
  const location = locationMatch ? locationMatch[1] : null;
  const pctMatch = text.match(/(\d{1,3})\s*%/) || text.match(/(\d{1,3})\s*percent/i);
  const percentage = pctMatch ? parseInt(pctMatch[1]) : null;
  const timeMatch = text.match(/\bat\s+(\d{1,2}[:.]\d{2})\b/) || text.match(/\b(\d{1,2}[:.]\d{2})\b/);
  const time = timeMatch ? timeMatch[1] : null;
  const sizeMatch = text.match(/(\d+)["']\s*(?:NPS|DN|dia)?/i) || text.match(/(\d+)[-\s]?inch/i);
  const pipeSize = sizeMatch ? sizeMatch[1] : null;
  const workerMatch = text.match(/(\d+)\s*(?:workers?|men|crew|labour)/i);
  const workers = workerMatch ? parseInt(workerMatch[1]) : null;
  const lengthMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:m\b|meters?|km|feet|ft)/i);
  const length = lengthMatch ? `${lengthMatch[1]}m` : null;
  const isComplete = /complete|finish|done|ho gaya|hua|complet/i.test(t);
  const isStart = /start|shuru|begin|chalu|launch/i.test(t);
  const isProgress = /progress|ongoing|chal|raha|percent|%/i.test(t);
  const status = isComplete ? 'complete' : isStart ? 'start' : isProgress ? 'progress' : 'update';
  return { location, percentage, time, pipeSize, workers, length, status };
}

const DISCIPLINE_SIGNALS = {
  Piping: ['pipe', 'piping', 'weld', 'spool', 'flange', 'elbow', 'valve', 'fitting', 'nozzle', 'manifold', 'coating', 'joint', 'line'],
  Civil: ['civil', 'foundation', 'concrete', 'rcc', 'grading', 'trench', 'excavat', 'backfill', 'formwork', 'rebar', 'shuttering', 'pile', 'footing'],
  Mechanical: ['erect', 'crane', 'lift', 'compressor', 'skid', 'exchanger', 'vessel', 'pump', 'turbine', 'coupling', 'alignment', 'install', 'fabricat'],
  Electrical: ['electric', 'cable', 'wiring', 'dcs', 'esd', 'panel', 'cathodic', 'earthing', 'transformer', 'substation', 'conduit', 'tray', 'mcc'],
  Instrumentation: ['instrument', 'control', 'sensor', 'transmitter', 'loop', 'calibrat', 'scada', 'flow meter', 'plc', 'rtu', 'pressure gauge'],
  Testing: ['test', 'hydrostatic', 'hydro', 'pressure', 'ndt', 'radiograph', 'rt ', 'ut ', 'inspect', 'pwht', 'flush', 'commissi'],
  Safety: ['safety', 'hse', 'toolbox', 'permit', 'ptw', 'gas test', 'barricade', 'ppe', 'hazard', 'loto'],
};

export function detectDiscipline(text) {
  const t = text.toLowerCase();
  const scores = {};
  for (const [disc, keywords] of Object.entries(DISCIPLINE_SIGNALS)) {
    scores[disc] = keywords.filter(k => t.includes(k)).length;
  }
  const top = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return top[0][1] > 0 ? top[0][0] : 'General';
}

const L = (e) => e.location || 'Site';
const P = (e) => e.percentage ? `${e.percentage}%` : null;
const T = (e) => e.time || null;
const S = (e) => e.pipeSize ? `${e.pipeSize}"` : null;
const Ln = (e) => e.length || null;
const rnd = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;

const TEMPLATES = {
  Piping: [
    (e) => `${L(e)} mein Mainline pipe rack erection ${P(e) || '75%'} complete${T(e) ? ` at ${T(e)}` : ''}`,
    (e) => `${L(e)} mein ${S(e) || '24"'} NPS pipe spool welding complete � joint P-${rnd(10,50)} passed RT`,
    (e) => `${L(e)} mein pipe coating application in progress � ${Ln(e) || '120m'} done today`,
    (e) => `${L(e)} mein mainline pipeline trenching excavation ${P(e) || '65%'} complete`,
    (e) => `${L(e)} mein hydrostatic pressure test passed${T(e) ? ` at ${T(e)}` : ''} � 1.5x design pressure hold & pass`,
    (e) => `${L(e)} mein ${S(e) || '12"'} gate valve installation complete, NDE inspection cleared`,
    (e) => `${L(e)} mein pipe support fabrication & erection work complete � ${Ln(e) || '45m'} span done`,
    (e) => `${L(e)} mein pre-fab spool delivery received, material inspection passed`,
    (e) => `${L(e)} mein pipeline tie-in work started${T(e) ? ` at ${T(e)}` : ''}, hot work permit issued`,
    (e) => `${L(e)} mein HDPE pipe laying work in progress � ${P(e) || '40%'} stretch complete`,
  ],
  Civil: [
    (e) => `${L(e)} mein concrete pouring for equipment pad complete${T(e) ? ` at ${T(e)}` : ''} � M25 grade`,
    (e) => `${L(e)} mein excavation work ${P(e) || '80%'} complete, RL achieved at -${(rnd(10,25)/10).toFixed(1)}m`,
    (e) => `${L(e)} mein RCC foundation formwork ready, rebar tying ${P(e) || '90%'} done`,
    (e) => `${L(e)} mein backfilling & compaction work complete � plate compaction test passed`,
    (e) => `${L(e)} mein pile foundation driving in progress � ${rnd(5,15)} of ${rnd(16,24)} piles done`,
    (e) => `${L(e)} mein site grading & leveling complete � as-built survey submitted`,
    (e) => `${L(e)} mein cable trench excavation ${Ln(e) || '200m'} stretch complete`,
    (e) => `${L(e)} mein concrete curing in progress � 7-day cube test samples collected`,
    (e) => `${L(e)} mein retaining wall shuttering complete, ready for concrete pour`,
    (e) => `${L(e)} mein road reinstatement work complete after pipeline crossing`,
  ],
  Mechanical: [
    (e) => `${L(e)} mein centrifugal pump P-${String(rnd(1,10)).padStart(2,'0')} mechanical alignment complete`,
    (e) => `${L(e)} mein compressor skid erection complete � grouting work in progress`,
    (e) => `${L(e)} mein heat exchanger bundle pull-out & inspection complete${T(e) ? ` at ${T(e)}` : ''}`,
    (e) => `${L(e)} mein crane lift for vessel V-${String(rnd(1,5)).padStart(2,'0')} complete � rigging plan executed`,
    (e) => `${L(e)} mein equipment skid installation & leveling ${P(e) || '100%'} complete`,
    (e) => `${L(e)} mein turbine coupling alignment checked � within 0.05mm tolerance`,
    (e) => `${L(e)} mein air cooler fan assembly complete � blade angle set to design`,
    (e) => `${L(e)} mein pressure vessel nozzle orientation confirmed � ready for piping`,
    (e) => `${L(e)} mein mechanical seal replacement for pump P-0${rnd(1,5)} complete`,
    (e) => `${L(e)} mein agitator gearbox oil fill & rotation check done${T(e) ? ` at ${T(e)}` : ''}`,
  ],
  Electrical: [
    (e) => `${L(e)} mein HT power cable ${Ln(e) || '300m'} laying complete � megger test passed`,
    (e) => `${L(e)} mein MCC panel termination work ${P(e) || '85%'} complete`,
    (e) => `${L(e)} mein cathodic protection anode installation complete � ${rnd(5,15)} anodes placed`,
    (e) => `${L(e)} mein earthing & bonding network complete � 2 ohm resistance verified`,
    (e) => `${L(e)} mein cable tray installation work ${P(e) || '70%'} complete`,
    (e) => `${L(e)} mein transformer energization complete${T(e) ? ` at ${T(e)}` : ''} � 33kV line live`,
    (e) => `${L(e)} mein electrical panel wiring & loop check ${P(e) || '60%'} done`,
    (e) => `${L(e)} mein DCS I/O loop checking in progress � ${P(e) || '40%'} loops verified`,
    (e) => `${L(e)} mein fire alarm panel wiring & detector placement complete`,
    (e) => `${L(e)} mein lighting pole erection complete � ${rnd(5,15)} poles installed`,
  ],
  Testing: [
    (e) => `${L(e)} mein hydrostatic pressure test at 150% design pressure � HOLD & PASS`,
    (e) => `${L(e)} mein NDT radiography (RT) complete � ${rnd(5,20)} joints shot, all clear`,
    (e) => `${L(e)} mein ultrasonic thickness (UT) survey done � min wall ${(rnd(60,90)/10).toFixed(1)}mm verified`,
    (e) => `${L(e)} mein pneumatic leak test complete � bubble test passed, zero leaks`,
    (e) => `${L(e)} mein PWHT cycle complete for ${rnd(2,7)} joints � chart records attached`,
    (e) => `${L(e)} mein pre-commissioning flush complete � ${Ln(e) || '500m'} section cleared`,
    (e) => `${L(e)} mein nitrogen purge & gas freeing complete${T(e) ? ` at ${T(e)}` : ''}`,
    (e) => `${L(e)} mein DCS functional test complete � all interlocks verified & signed off`,
  ],
  Safety: [
    (e) => `${L(e)} mein toolbox talk conducted � ${e.workers || rnd(20,50)} workers attended`,
    (e) => `${L(e)} mein hot work permit issued for welding activity � gas test clear, LEL 0%`,
    (e) => `${L(e)} mein height work PTW issued � full body harness & lifeline verified`,
    (e) => `${L(e)} mein confined space entry permit issued � O2 20.9%, LEL 0%`,
    (e) => `${L(e)} mein safety barricading & signage complete for excavation zone`,
    (e) => `${L(e)} mein daily site safety inspection done � zero near-miss today`,
    (e) => `${L(e)} mein LOTO applied on E-${String(rnd(1,10)).padStart(2,'0')} for maintenance`,
    (e) => `${L(e)} mein emergency drill conducted � muster time ${rnd(2,5)} min`,
  ],
  General: [
    (e) => `${L(e)} mein daily progress meeting held � schedule on track, no slippage`,
    (e) => `${L(e)} mein material inspection & GRN raised � ${rnd(2,8)} packages accepted`,
    (e) => `${L(e)} mein as-built drawing update submitted to engineering${T(e) ? ` at ${T(e)}` : ''}`,
    (e) => `${L(e)} mein QC inspection & punch list closure ${P(e) || '80%'} complete`,
    (e) => `${L(e)} mein sub-contractor coordination meeting done � lookahead updated`,
    (e) => `${L(e)} mein snag list review complete � ${rnd(5,15)} items closed today`,
    (e) => `${L(e)} mein daily manpower deployment: ${e.workers || rnd(30,80)} workers on site`,
    (e) => `${L(e)} mein work front handover from night shift � ${P(e) || '60%'} target achieved`,
    (e) => `${L(e)} mein construction sequence review done � critical path updated`,
    (e) => `${L(e)} mein site inspection by client QC team � RFI raised for ${rnd(2,6)} items`,
  ],
};

export function generateSuggestions(query, projectCtx = {}, maxResults = 5) {
  if (!query || query.trim().length < 3) return [];
  const entities = extractEntities(query);
  const discipline = detectDiscipline(query);
  const primaryPool = TEMPLATES[discipline] || TEMPLATES.General;
  const secondaryPool = discipline !== 'General' ? TEMPLATES.General : [];
  const candidates = [];
  for (const tmpl of primaryPool) {
    try {
      const text = tmpl(entities);
      if (text) candidates.push({ text, discipline, isGenerated: true });
    } catch {}
  }
  if (candidates.length < maxResults) {
    for (const tmpl of secondaryPool) {
      if (candidates.length >= maxResults * 2) break;
      try {
        const text = tmpl(entities);
        if (text) candidates.push({ text, discipline: 'General', isGenerated: true });
      } catch {}
    }
  }
  const queryWords = query.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const scored = candidates.map(c => {
    const ct = c.text.toLowerCase();
    const hits = queryWords.filter(w => ct.includes(w)).length;
    const locBonus = entities.location && ct.includes(entities.location.toLowerCase()) ? 2 : 0;
    return { ...c, _score: hits + locBonus };
  });
  scored.sort((a, b) => b._score - a._score);
  const seen = new Set();
  const unique = [];
  for (const s of scored) {
    const key = s.text.slice(0, 30).toLowerCase();
    if (!seen.has(key)) { seen.add(key); unique.push(s); }
    if (unique.length >= maxResults) break;
  }
  return unique;
}

const INSTANT_COMPLETIONS = [
  { trigger: /^zone/i, completions: ['Zone-4 mein pipe rack fabrication complete at 17:30', 'Zone-4 mein cable tray installation 80% done', 'Zone-4 mein concrete pour for equipment pad complete'] },
  { trigger: /^sector/i, completions: ['Sector-4A mein mainline pipe erection complete', 'Sector-4B mein excavation 65% progress today', 'Sector-4B mein Mainline Trenching excavation complete'] },
  { trigger: /^unit/i, completions: ['Unit-2 mein heat exchanger bundle insertion complete', 'Unit-2 mein DCS panel wiring 85% done', 'Unit-3 mein compressor skid erection started'] },
  { trigger: /^pipe/i, completions: ['Pipe rack fabrication complete at Zone-4 at 17:30', 'Pipe spool welding 85% complete � 12 joints done today', 'Pipeline hydrostatic test passed � 150% design pressure hold'] },
  { trigger: /^weld/i, completions: ['Welding work 75% complete � 28 of 37 joints done', 'Weld joint RT (radiography) passed � zero defects found', 'Welding of tie-in joint P-47 complete at 16:00'] },
  { trigger: /^concret/i, completions: ['Concrete pouring for equipment pad complete at 14:30', 'Concrete M25 � slump test 90mm, cube samples collected', 'Concrete curing in progress � 3rd day water curing done'] },
  { trigger: /^excavat/i, completions: ['Excavation 80% complete � RL -1.8m achieved at Zone-4', 'Excavation of trench for 24" pipeline Sector-4B done', 'Excavation complete � shoring & dewatering in place'] },
  { trigger: /^cable/i, completions: ['Cable laying 300m complete � megger test passed', 'Cable tray installation 70% done at Zone-3', 'Cable termination at MCC panel 90% complete'] },
  { trigger: /^compressor/i, completions: ['Compressor skid erection complete � grouting in progress', 'Compressor coupling alignment � within 0.05mm tolerance', 'Compressor pre-commission checklist 80% complete'] },
  { trigger: /^test|^hydro/i, completions: ['Hydrostatic pressure test passed � hold & pass, zero leaks', 'Testing of gas detector calibration done � all passed', 'Test pack PT-23 closed � ready for pre-commissioning'] },
  { trigger: /^safety|^hse|^toolbox/i, completions: ['Safety toolbox talk conducted � 45 workers attended', 'Safety inspection done � zero near-miss today', 'Safety barricading complete for excavation at Zone-4'] },
  { trigger: /^valve/i, completions: ['Valve installation and hydro test complete at Zone-4', 'Valve CV-105 stroke test done � 100% travel verified', 'Valve alignment & bolt torquing complete � leak test pass'] },
  { trigger: /^foundation/i, completions: ['Foundation concrete pouring complete � M30 grade', 'Foundation bolt setting & grouting done for compressor skid', 'Foundation excavation & PCC complete � ready for rebar'] },
  { trigger: /^commission/i, completions: ['Commissioning punch list closure 80% complete', 'Commissioning nitrogen purge complete � pipeline clean', 'Commissioning team mobilized � pre-comm activities started'] },
  { trigger: /mein/i, completions: ['Zone-4 mein pipe rack support fabrication complete ho gaya', 'Sector-4A mein concrete pouring start hua at 10:00', 'Zone-4 mein cable tray erection 75% complete ho gaya'] },
  { trigger: /^progress|^update/i, completions: ['Progress update: Zone-4 piping 78% complete today', 'Progress meeting held � schedule on track, no delay', 'Progress of mainline pipeline: 45 of 60 spools erected'] },
  { trigger: /^aaj|^today/i, completions: ['Aaj Zone-4 mein pipe spool erection complete hua', 'Today mainline welding 3 joints complete at Sector-4A', 'Aaj safety toolbox talk & daily briefing conducted for 40 workers'] },
];

export function getInstantCompletions(query) {
  if (!query || query.trim().length < 4) return [];
  const results = [];
  for (const rule of INSTANT_COMPLETIONS) {
    if (rule.trigger.test(query.trim())) {
      results.push(...rule.completions.map(text => ({ text, isInstant: true, isGenerated: true })));
      if (results.length >= 3) break;
    }
  }
  return results.slice(0, 3);
}
