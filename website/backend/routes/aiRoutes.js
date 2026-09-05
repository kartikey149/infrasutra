import express from 'express';
import axios from 'axios';
import { GoogleGenAI } from '@google/genai';

const router = express.Router();

/**
 * Benchmark Construction Projects & Schedules Knowledge Base
 * Used when Python FastAPI backend is offline or tasks are not supplied by client
 */
const DEFAULT_PROJECT_DATA = {
  'PRJ-01': {
    name: 'Sector 4 Crude Oil Pipeline Expansion',
    location: 'Upper Assam Basin (Dibrugarh)',
    budget: '₹45.2 Cr',
    plannedCompletion: 45,
    actualExecution: 38,
    spi: 0.84,
    status: 'Active Execution',
    tasks: [
      { id: 'ACT-01', name: 'Right of Way (RoW) Clearing & Grading', discipline: 'Civil', start: '2026-01-10', end: '2026-02-15', progress: 100, dependencies: 'None', resources: 'Dozer-01, Grader-02, 12 Laborers', critical: false },
      { id: 'ACT-02', name: 'Mainline Pipeline Trenching (Chainage 0-14 km)', discipline: 'Civil', start: '2026-02-01', end: '2026-04-10', progress: 68, dependencies: 'ACT-01', resources: '3x Hitachi Excavators, 18 Laborers', critical: true, riskNotes: 'Monsoon waterlogging risk in lowland clay sectors' },
      { id: 'ACT-03', name: 'Cross-Country Pipe Stringing & Bending', discipline: 'Mechanical', start: '2026-02-20', end: '2026-04-25', progress: 55, dependencies: 'ACT-01', resources: 'Pipe Bender, Sidebooms, 14 Riggers', critical: false },
      { id: 'ACT-04', name: 'Automatic Welding of Mainline Joints', discipline: 'Piping', start: '2026-03-01', end: '2026-05-15', progress: 32, dependencies: 'ACT-02, ACT-03', resources: '8 Certified 6G Welders, Welding Bugs', critical: true, riskNotes: 'Welder shortage; 4 days schedule slippage' },
      { id: 'ACT-05', name: 'Non-Destructive Testing (100% Radiography/UT)', discipline: 'Quality', start: '2026-03-10', end: '2026-05-20', progress: 28, dependencies: 'ACT-04', resources: 'Crawler X-ray unit, NDT Level-II Inspectors', critical: true },
      { id: 'ACT-06', name: 'Joint Coating & Field Heat-Shrink Sleeves', discipline: 'Piping', start: '2026-03-20', end: '2026-05-30', progress: 20, dependencies: 'ACT-05', resources: 'Induction Coater, 8 Applicators', critical: true },
      { id: 'ACT-07', name: 'Pipe Lowering-in and Trench Backfilling', discipline: 'Civil', start: '2026-04-01', end: '2026-06-15', progress: 10, dependencies: 'ACT-06', resources: '4x Sidebooms, Padding machines', critical: true, riskNotes: 'Must finish before Assam monsoon peak in June' },
      { id: 'ACT-08', name: 'Sectional Hydrostatic Pressure Testing (125 bar)', discipline: 'Testing', start: '2026-06-10', end: '2026-07-15', progress: 0, dependencies: 'ACT-07', resources: 'High pressure triplex pumps, Break tanks', critical: true },
      { id: 'ACT-09', name: 'Cathodic Protection (CP) Deep Well Ground Bed', discipline: 'Electrical', start: '2026-04-15', end: '2026-07-01', progress: 5, dependencies: 'ACT-07', resources: 'Drilling Rig, CP Transformer Rectifier', critical: false },
      { id: 'ACT-10', name: 'Block Valve Station (BVS-01) Civil Foundations', discipline: 'Civil', start: '2026-03-01', end: '2026-05-10', progress: 45, dependencies: 'ACT-01', resources: 'Concrete batch plant, Shuttering team', critical: false }
    ]
  },
  'PRJ-02': {
    name: 'Assam Gas Processing Plant Unit-2',
    location: 'Duliajan Industrial Area',
    budget: '₹128.5 Cr',
    plannedCompletion: 60,
    actualExecution: 62,
    spi: 1.03,
    status: 'Active Execution',
    tasks: [
      { id: 'GP-01', name: 'Civil Foundations for Gas Dehydration Unit', discipline: 'Civil', start: '2025-09-01', end: '2025-12-15', progress: 100, dependencies: 'None', resources: 'Foundations Crew, Piling Rig', critical: false },
      { id: 'GP-02', name: 'Centrifugal Gas Compressor Skid Heavy Erection', discipline: 'Mechanical', start: '2026-01-05', end: '2026-03-10', progress: 85, dependencies: 'GP-01', resources: '250T Heavy Crawler Crane, Erection Team', critical: true, riskNotes: 'Shaft alignment precision requires vibration specialist' },
      { id: 'GP-03', name: 'TEG Contactor Column Vertical Erection', discipline: 'Mechanical', start: '2026-01-20', end: '2026-03-25', progress: 75, dependencies: 'GP-01', resources: 'Tandem Crane lift, Rigging crew', critical: true },
      { id: 'GP-04', name: 'Process Piping & High Pressure Tie-in Manifolds', discipline: 'Piping', start: '2026-02-15', end: '2026-05-20', progress: 48, dependencies: 'GP-02, GP-03', resources: 'Pipe Fitters, Alloy 625 Welders', critical: true },
      { id: 'GP-05', name: 'DCS & ESD Instrumentation Control Cable Pulling', discipline: 'Instrumentation', start: '2026-03-01', end: '2026-06-10', progress: 40, dependencies: 'GP-02', resources: 'Cable Tray Team, Instrument Techs', critical: false },
      { id: 'GP-06', name: 'Nitrogen Purging & High Pressure Gas Leak Test', discipline: 'Commissioning', start: '2026-06-01', end: '2026-07-20', progress: 0, dependencies: 'GP-04, GP-05', resources: 'Commissioning Team, N2 tankers', critical: true }
    ]
  }
};

const SYSTEM_INSTRUCTION = `You are the Predictive Project Management AI for Infrasutra, an advanced autonomous infrastructure engineering analytics platform deployed on Oil India and heavy civil engineering projects.

CRITICAL LANGUAGE MANDATE:
Regardless of the language or script used in the user query (Hindi, Hinglish, Devanagari script, Bengali, Tamil, Spanish, etc.), you MUST answer and output your response STRICTLY AND EXCLUSIVELY IN CLEAR, PROFESSIONAL ENGLISH TEXT. Never output Devanagari script, Hindi text, or any non-English language.

Your primary mission is to help construction managers, project directors, and lead planners identify future activity delays, evaluate schedule risk, predict critical bottlenecks, and prescribe actionable engineering mitigation strategies before micro-delays cascade on the critical path.

Analytical Framework & Operational Rules:
1. Schedule & Critical Path Evaluation:
   - Scrutinize tasks with zero total float or tasks explicitly tagged as Critical Path (e.g., mainline trenching, tie-ins, heavy welding, hydrostatic pressure testing, compressor skids, DCS integration).
   - Evaluate Earned Value & Schedule Performance: SPI (Schedule Performance Index) < 1.00 indicates schedule slippage. Negative schedule variance requires immediate intervention.
2. Bottleneck & Future Risk Prediction:
   - Identify multi-factor risks: weather impediments (monsoon flooding, heavy rain halting open trench welding), resource constraints (certified 6G welders, crane availability, hydrostatic testing pumps), supply chain / procurement lead times (pipe spools, valves, instrumentation fittings), and permit approvals.
   - Detect sequential dependency traps: where a minor delay in a predecessor task halts multiple downstream parallel workfronts.
3. Actionable Engineering Mitigations:
   - For every delay risk or bottleneck identified, provide concrete, realistic mitigation recommendations:
     * Fast-tracking / Parallel Workfronts (e.g., deploying spread B teams simultaneously)
     * Schedule Crashing (adding 2nd shift, authorized overtime, deploying auxiliary automated welding rigs)
     * Float & Buffer Optimization (re-sequencing non-critical tasks to absorb resource shock)
     * Proactive procurement expediting and pre-commissioning checklists.
4. Response Style & Structure:
   - Do NOT output any <think> or internal reasoning tags. Output ONLY the final response directly.
   - Professional, authoritative, and concise engineering advisory tone in English.
   - Use structured formatting: Risk Level tags (🚨 CRITICAL / ⚠️ HIGH / 🟡 MEDIUM / 🟢 LOW), bullet points, bold task IDs (e.g., **ACT-04**), and clear next steps.
   - Ground all predictions strictly in the provided live project schedule data.`;

/**
 * Intelligent deterministic predictive fallback engine
 * Provides deep construction delay predictions if GEMINI_API_KEY is not configured
 */
function generatePredictiveFallback(userQuery = '', projectInfo = {}, tasks = []) {
  const queryLower = (userQuery || '').toLowerCase();
  const proj = projectInfo || {};
  const projName = proj.name || 'Active Project';
  const projStatus = proj.status || 'Active';
  const plannedComp = proj.plannedCompletion || 0;
  const actualExec = proj.actualExecution || 0;
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const spi = proj.spi || 0.88;

  if (queryLower.includes('rain') || queryLower.includes('weather') || queryLower.includes('monsoon')) {
    return `### 🌧️ Weather Impact & Predictive Delay Assessment: ${projName}

**Current SPI:** \`${spi}\` | **High-Risk Window:** Approaching Pre-Monsoon / Heavy Rains

#### 1. Direct Critical Path Vulnerabilities:
- 🚨 **Mainline Excavation & Foundations (${safeTasks[0]?.name || 'Civil Works'})**:
  - **Risk:** Flash downpours will cause trench wall slumping and water ingress, requiring dewatering pumps and re-shaping.
  - **Predicted Slippage:** **+4 to +8 Days** if civil foundations are not sealed before heavy rains.

#### 2. Engineering Mitigation Plan:
1. **Deploy Weather-Proof Equipment Canopies:** Station 4-inch submersible dewatering pumps at low-lying workfronts.
2. **Crash Excavation Shifts:** Add auxiliary shift on critical path activities to finish civil layout early.`;
  }

  if (queryLower.includes('critical') || queryLower.includes('bottleneck') || queryLower.includes('path')) {
    return `### ⛓️ Critical Path & Bottleneck Forecast: ${projName}

**Schedule Performance Index (SPI):** \`${spi}\` (${spi < 1 ? 'Schedule Slippage Detected' : 'Healthy Execution'})

#### 1. Primary Critical Path Chain:
\`${safeTasks.length > 0 ? safeTasks.map((t) => t.id).join(' ➔ ') : 'WBS-01 ➔ WBS-02 ➔ WBS-03'}\`

#### 2. Key Identified Bottlenecks:
- 🚨 **${safeTasks[0]?.name || 'Civil Foundation Work'}**:
  - **Current Progress:** ${safeTasks[0]?.progress || 0}%
  - **Bottleneck Root Cause:** Subcontractor machinery mobilization & material turnaround times.

#### 3. Prescribed Corrective Action:
- **Parallel Workfront Execution:** Overlap equipment erection with foundation curing to recover lost float.`;
  }

  // Default predictive response for general query
  return `### 📊 Predictive Project Management Analysis: ${projName}

**Status:** ${projStatus} | **Planned:** ${plannedComp}% | **Actual:** ${actualExec}% | **SPI:** \`${spi}\`

#### 1. Predicted Delay Hotspots:
- 🚨 **${safeTasks[0]?.name || 'Civil Excavation'} (${safeTasks[0]?.id || 'WBS-01'})**:
  - Progress stands at **${safeTasks[0]?.progress || 0}%**. Site conditions pose delay risk.

#### 2. Recommended Management Interventions:
1. **Parallel Workfronts (Fast-Tracking):** Divide chainage into independent spreads to isolate subcontractor delays.
2. **Daily Milestone Tracking:** Leverage Infrasutra supervisor voice reports to catch micro-variances within 24 hours.`;
}

/**
 * POST /api/ai/predictive-chat
 * (Also aliased at /api/predictive-chat)
 */
router.post('/predictive-chat', async (req, res) => {
  try {
    const {
      prompt,
      message,
      query,
      projectId,
      projectData,
      history = []
    } = req.body;

    const userMessage = prompt || message || query;

    if (!userMessage || typeof userMessage !== 'string' || !userMessage.trim()) {
      return res.status(400).json({
        success: false,
        error: 'A valid prompt or message is required in request body',
      });
    }

    // Strict No Project Assigned check (Requirement)
    if (!projectId || projectId === 'none' || projectId === 'unassigned' || projectId === 'null' || projectId === 'NO_PROJECT') {
      return res.json({
        success: true,
        source: 'no_project_assigned',
        reply: '⚠️ No project is assigned yet. Please select or create an active project to view schedule analytics and field progress.',
        timestamp: new Date().toISOString()
      });
    }

    // 1. Resolve Project & Schedule Data
    let project = DEFAULT_PROJECT_DATA[projectId] || null;
    let tasks = project ? project.tasks : [];

    if (!project) {
      try {
        const sanitized = String(projectId).replace(/'/g, "''");
        const projCmd = `sqlite3 "${DB_PATH}" "SELECT json_object('id', id, 'name', name, 'location', location, 'department', department, 'description', description, 'contractor', contractor, 'supervisor', supervisor, 'status', status, 'progress', progress, 'varianceDays', varianceDays, 'workersOnSite', workersOnSite) FROM projects WHERE id = '${sanitized}' OR LOWER(name) = LOWER('${sanitized}');"`;
        const projRaw = execSync(projCmd, { encoding: 'utf8' }).trim();
        if (projRaw) {
          const dbProj = JSON.parse(projRaw);
          const actCmd = `sqlite3 "${DB_PATH}" "SELECT json_group_array(json_object('activity_id', activity_id, 'activity_name', activity_name, 'discipline', discipline, 'percent_complete', percent_complete, 'status', status, 'planned_start', planned_start, 'planned_end', planned_end)) FROM schedule_activities WHERE project_id = '${dbProj.id}';"`;
          const actRaw = execSync(actCmd, { encoding: 'utf8' }).trim();
          const dbActivities = actRaw ? JSON.parse(actRaw) : [];

          if (dbActivities.length > 0) {
            tasks = dbActivities.map(a => ({
              id: a.activity_id,
              name: a.activity_name,
              discipline: a.discipline,
              start: a.planned_start,
              end: a.planned_end,
              progress: a.percent_complete,
              dependencies: 'Preceding WBS',
              resources: `${a.discipline} Team`,
              critical: true
            }));
          } else {
            const isWater = dbProj.name.toLowerCase().includes('water') || (dbProj.description && dbProj.description.toLowerCase().includes('water'));
            if (isWater) {
              tasks = [
                { id: 'WTP-01', name: 'Raw Water Intake Sump Excavation & Foundation', discipline: 'Civil', start: '2026-09-10', end: '2026-10-15', progress: 0, critical: true, resources: `${dbProj.contractor || 'Sankalp'} Civil Crew` },
                { id: 'WTP-02', name: 'Water Filtration Skid Foundations & Concrete Curing', discipline: 'Civil', start: '2026-09-20', end: '2026-11-05', progress: 0, critical: true, resources: 'Batching Plant, Shuttering Team' },
                { id: 'WTP-03', name: 'Booster Pump House Piping Manifold & Valve Skids', discipline: 'Piping', start: '2026-10-01', end: '2026-11-20', progress: 0, critical: true, resources: 'Hydraulic Piping Techs' },
                { id: 'WTP-04', name: 'Water Treatment Quality Instrumentation & Calibration', discipline: 'Instrumentation', start: '2026-11-01', end: '2026-12-10', progress: 0, critical: false, resources: 'Calibration Engineers' }
              ];
            } else {
              tasks = [
                { id: 'PRJ-01', name: 'Site Layout Survey & Initial Excavation', discipline: 'Civil', start: '2026-09-10', end: '2026-10-15', progress: 0, critical: true, resources: 'Civil Excavation Team' },
                { id: 'PRJ-02', name: 'Main Structural Foundations & Concrete Works', discipline: 'Civil', start: '2026-09-20', end: '2026-11-05', progress: 0, critical: true, resources: 'Batching Plant Crew' },
                { id: 'PRJ-03', name: 'Equipment Erection & Piping Integration', discipline: 'Piping', start: '2026-10-01', end: '2026-11-20', progress: 0, critical: true, resources: 'Mechanical Erection Team' }
              ];
            }
          }

          project = {
            name: dbProj.name,
            location: dbProj.location,
            budget: dbProj.budget || '₹50.0 Cr',
            plannedCompletion: 100,
            actualExecution: dbProj.progress || 0,
            spi: dbProj.progress > 0 ? 0.95 : 1.00,
            status: dbProj.status || 'Active',
            contractor: dbProj.contractor,
            tasks
          };
        }
      } catch (err) {
        console.warn(`[aiRoutes DB Lookup Error]:`, err.message);
      }
    }

    if (!project) {
      project = {
        name: String(projectId),
        location: 'Vasundhara Sec 4',
        budget: '₹50.0 Cr',
        plannedCompletion: 100,
        actualExecution: 0,
        spi: 1.00,
        status: 'Active',
        contractor: 'Sankalp',
        tasks: tasks || []
      };
    }

    // 2. Format Live Construction Context for Gemini
    const formattedTaskList = tasks
      .map(
        (t) =>
          `- [${t.id}] "${t.name}" | Discipline: ${t.discipline} | Progress: ${t.progress}% | Window: ${t.start} to ${t.end} | Predecessors: ${t.dependencies || 'None'} | Resources: ${t.resources || 'Unassigned'} | Critical Path: ${t.critical ? 'YES (Zero Float)' : 'No'}${t.riskNotes ? ` | Risk Notes: ${t.riskNotes}` : ''}`
      )
      .join('\n');

    const promptWithContext = `[LIVE CONSTRUCTION PROJECT DATA INJECTION]
Project: ${project.name} (ID: ${projectId})
Location: ${project.location}
Budget: ${project.budget}
Planned Schedule Completion: ${project.plannedCompletion}%
Actual Field Execution: ${project.actualExecution}%
Schedule Performance Index (SPI): ${project.spi}
Current Status: ${project.status}

ACTIVE SCHEDULE ACTIVITIES & CRITICAL PATH REGISTER:
${formattedTaskList}

--------------------------------------------------
USER QUERY:
"${userMessage.trim()}"

Provide a structured, predictive construction management analysis addressing this query using the live project data above.`;

    // 3. Query Gemini via official @google/genai SDK if API key is provided
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY' && apiKey.length > 10) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const geminiResponse = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: promptWithContext,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
            temperature: 0.25,
          },
        });

        const replyText = geminiResponse.text;
        if (replyText) {
          return res.json({
            success: true,
            source: 'gemini-2.5-flash',
            model: 'gemini-2.5-flash',
            projectId,
            reply: replyText,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (geminiError) {
        console.warn(`[Gemini API Warning] ${geminiError.message}. Switching to Groq Qwen AI engine.`);
      }
    }

    // 4. Try Secondary Engine: Groq AI (allam-2-7b)
    const groqApiKey = process.env.GROQ_API_KEY;
    if (groqApiKey && groqApiKey.length > 10) {
      try {
        const groqRes = await axios.post(
          'https://api.groq.com/openai/v1/chat/completions',
          {
            model: 'allam-2-7b',
            messages: [
              { role: 'system', content: SYSTEM_INSTRUCTION },
              { role: 'user', content: promptWithContext }
            ],
            temperature: 0.3,
            max_tokens: 600
          },
          {
            headers: {
              'Authorization': `Bearer ${groqApiKey}`,
              'Content-Type': 'application/json'
            },
            timeout: 10000
          }
        );

        if (groqRes.data && groqRes.data.choices && groqRes.data.choices[0]?.message?.content) {
          let text = groqRes.data.choices[0].message.content.trim();
          return res.json({
            success: true,
            source: 'groq-allam-ai',
            model: 'groq-allam-ai',
            projectId,
            reply: text,
            timestamp: new Date().toISOString(),
          });
        }
      } catch (groqError) {
        console.warn(`[Groq AI Warning]: ${groqError.message}. Activating intelligent predictive fallback.`);
      }
    }

    // 5. Intelligent Question-Sensitive Fallback
    const fallbackReply = generatePredictiveFallback(userMessage, project, tasks);
    return res.json({
      success: true,
      source: 'dynamic_predictive_fallback',
      model: 'infrasutra-expert-rules',
      projectId,
      reply: fallbackReply,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error('[Predictive Chat Error]:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Error executing predictive construction analysis',
    });
  }
});

export default router;
