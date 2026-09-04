import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Import Telegram Bot & shared report store
import './bot/supervisorBot.js';
import { liveVoiceReports } from './bot/supervisorBot.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const PYTHON_PATH = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
const SCRIPT_PATH = path.join(__dirname, 'predict_delay.py');
const EXECUTION_TIMEOUT_MS = 3000;

// Enable CORS for React UI
app.use(cors());
app.use(express.json());

function getFallbackDelay(dist, weather, hour) {
  const base = 5;
  const weatherPenalty = (weather || 1) * 3;
  const rushHourPenalty = (hour >= 7 && hour <= 9) || (hour >= 16 && hour <= 19) ? 10 : 0;
  return Math.round(base + weatherPenalty + rushHourPenalty);
}

function runXGBoostInference(payload) {
  return new Promise((resolve, reject) => {
    let isSettled = false;
    const pyProcess = spawn(PYTHON_PATH, [SCRIPT_PATH]);
    let stdoutData = '';
    let stderrData = '';

    const timer = setTimeout(() => {
      if (!isSettled) {
        isSettled = true;
        pyProcess.kill('SIGTERM');
        reject(new Error(`Python process timed out after ${EXECUTION_TIMEOUT_MS}ms`));
      }
    }, EXECUTION_TIMEOUT_MS);

    try {
      pyProcess.stdin.write(JSON.stringify(payload));
      pyProcess.stdin.end();
    } catch (err) {
      clearTimeout(timer);
      return reject(err);
    }

    pyProcess.stdout.on('data', (chunk) => {
      stdoutData += chunk.toString();
    });

    pyProcess.stderr.on('data', (chunk) => {
      stderrData += chunk.toString();
    });

    pyProcess.on('error', (err) => {
      if (!isSettled) {
        isSettled = true;
        clearTimeout(timer);
        reject(new Error(`Failed to start Python process: ${err.message}`));
      }
    });

    pyProcess.on('close', (code) => {
      if (isSettled) return;
      isSettled = true;
      clearTimeout(timer);

      if (code !== 0) {
        console.error(`[Python Process Error] Code ${code}: ${stderrData}`);
        return reject(new Error(`Python script exited with code ${code}`));
      }

      try {
        resolve(JSON.parse(stdoutData.trim()));
      } catch (parseErr) {
        reject(new Error('Failed to parse Python JSON output'));
      }
    });
  });
}

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    telegramBot: process.env.TELEGRAM_BOT_TOKEN ? 'Active' : 'Disabled',
    whisper: process.env.OPENAI_API_KEY ? 'Active' : 'Disabled',
    timestamp: new Date().toISOString()
  });
});

// Live Voice Reports Endpoint for React UI
app.get('/api/voice-reports', (req, res) => {
  res.json({ success: true, reports: liveVoiceReports || [] });
});

// Delay Prediction Endpoint
app.post('/api/predict-delay', async (req, res) => {
  const { dist, weather, hour } = req.body;

  if (dist === undefined || weather === undefined || hour === undefined) {
    return res.status(400).json({
      error: 'Invalid input payload',
      requiredFields: ['dist', 'weather', 'hour']
    });
  }

  try {
    const prediction = await runXGBoostInference({ dist, weather, hour });
    return res.json({ success: true, source: 'xgboost_model', data: prediction });
  } catch (error) {
    console.warn(`[ML Inference Failed] ${error.message}. Triggering baseline fallback.`);
    const fallbackDelay = getFallbackDelay(dist, weather, hour);
    return res.json({
      success: true,
      source: 'baseline_fallback',
      warning: error.message,
      data: { predicted_delay_min: fallbackDelay }
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Express server running on http://localhost:${PORT}`);
});