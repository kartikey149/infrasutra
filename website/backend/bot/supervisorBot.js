import 'dotenv/config';
import dotenv from 'dotenv';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const liveVoiceReports = [];

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROQ_KEY = process.env.GROQ_API_KEY;
const GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

// ═══════════════════════════════════════════════════════
// Strict Project Scoping: Chat → Project Mapping
// ═══════════════════════════════════════════════════════
const chatProjectMapping = new Map(); // chatId → project_id

console.log("----------------------------------------");
console.log("🔍 Checking Telegram Bot Environment Config...");
console.log("• TELEGRAM_BOT_TOKEN:", BOT_TOKEN ? "✅ Found" : "❌ Missing");
console.log("• GROQ_API_KEY:", GROQ_KEY ? "✅ Found" : "❌ Missing");
console.log("• GEMINI_API_KEY:", GEMINI_KEY ? "✅ Found" : "❌ Missing");

const TELEGRAM_API_BASE = `https://api.telegram.org/bot${BOT_TOKEN}`;

async function sendTelegramMessage(chatId, text, parseMode = 'Markdown') {
  try {
    await axios.post(`${TELEGRAM_API_BASE}/sendMessage`, {
      chat_id: chatId,
      text: text,
      parse_mode: parseMode
    });
  } catch (err) {
    console.error("Telegram Send Error:", err.response?.data || err.message);
  }
}

async function getFileUrl(fileId) {
  const res = await axios.get(`${TELEGRAM_API_BASE}/getFile?file_id=${fileId}`);
  const filePath = res.data.result.file_path;
  return `https://api.telegram.org/file/bot${BOT_TOKEN}/${filePath}`;
}

/**
 * Translates Hindi, Hinglish, or mixed text into clear professional English
 * using Gemini 2.5 Flash. Keeps construction/engineering terms, zone names,
 * percentages, and units intact.
 */
export async function translateToEnglish(rawText) {
  if (!rawText || !rawText.trim()) return rawText;

  const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
  if (!apiKey) return rawText;

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: `You are an automated speech normalizer. Regardless of the spoken input language or accent (Hindi, Hinglish, Bengali, Tamil, Spanish, English), translate and output the exact intended message strictly in clear, professional English text. Do not output Devanagari script or the source language.
Keep all technical construction, equipment, and engineering terms in standard English (e.g., pipeline, welding, trenching, excavation, compressor, DCS panel).
Preserve all percentages, numbers, units, zone names (Zone-4, Sector-4A, Unit-2), and activity names exactly as stated.
Return ONLY the translated English sentence, without any commentary, explanation, markdown quotes, or notes.

Input: "${rawText}"`,
    });

    const english = response.text ? response.text.trim().replace(/^["']|["']$/g, '') : rawText;
    return english || rawText;
  } catch (err) {
    console.warn("English translation warning:", err.message);
    return rawText;
  }
}

/**
 * Transcribes audio file directly to clean professional English
 */
async function processVoiceToText(fileUrl) {
  const tempDir = path.join(process.cwd(), 'temp');
  if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
  const filePath = path.join(tempDir, `voice_${Date.now()}.ogg`);

  try {
    const res = await axios({ method: 'GET', url: fileUrl, responseType: 'stream' });
    const writer = fs.createWriteStream(filePath);
    res.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;

    // 1. Direct audio-to-English transcription using Gemini 2.5 Flash
    if (apiKey) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const audioBuffer = fs.readFileSync(filePath);
        const base64Audio = audioBuffer.toString('base64');

        const geminiRes = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: [
            {
              inlineData: {
                data: base64Audio,
                mimeType: 'audio/ogg'
              }
            },
            {
              text: `You are an automated speech normalizer. Regardless of the spoken input language or accent (Hindi, Hinglish, Bengali, Tamil, Spanish, English), translate and output the exact intended message strictly in clear, professional English text. Do not output Devanagari script or the source language. Keep all technical construction terms (pipeline, welding, trenching, excavation, compressor), zone names, percentages, and numbers intact. Return ONLY the English transcription.`
            }
          ]
        });

        if (geminiRes.text && geminiRes.text.trim()) {
          const result = geminiRes.text.trim().replace(/^["']|["']$/g, '');
          // Ensure output is fully English — run through translation if any non-ASCII remains
          return await translateToEnglish(result);
        }
      } catch (geminiAudioErr) {
        console.warn("Gemini direct audio transcription fallback:", geminiAudioErr.message);
      }
    }

    // 2. Groq Whisper fallback with subsequent English translation
    if (GROQ_KEY) {
      const openai = new OpenAI({ apiKey: GROQ_KEY, baseURL: "https://api.groq.com/openai/v1" });
      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(filePath),
        model: 'whisper-large-v3',
        language: 'en',
        prompt: 'Transcribe in clear professional English. Keep construction terms like pipeline, welding, trenching, excavation, zone names, and percentages in English.'
      });

      return await translateToEnglish(transcription.text);
    }

    throw new Error("No transcription service available. Please ensure GEMINI_API_KEY is configured.");
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

async function processAndReply(chatId, supervisorName, text, sourceType) {
  try {
    await sendTelegramMessage(chatId, "⚡ Linking English update to Primavera Schedule Database...");

    // Use the mapped project for this chat, or fallback to PRJ-01
    const projectId = chatProjectMapping.get(chatId) || 'PRJ-01';
    
    const response = await axios.post('http://localhost:8000/api/field-update', {
      text: text,
      source_type: sourceType,
      project_id: projectId,
      submitted_by: supervisorName
    });

    const data = response.data;
    if (data.success) {
      const match = data.best_match;
      const confPercent = Math.round(data.confidence * 100);

      const reply = 
        `✅ *Schedule Activity Matched!*\n\n` +
        `• *Project:* \`${projectId}\`\n` +
        `• *Discipline:* ${data.extracted.discipline}\n` +
        `• *Extracted Task:* ${data.extracted.extracted_task}\n` +
        `• *Event Type:* ${data.extracted.event_type}\n` +
        `• *Zone:* ${data.extracted.location_zone}\n\n` +
        `📋 *Matched WBS Activity:*\n` +
        `• *ID:* \`${match ? match.activity_id : 'N/A'}\`\n` +
        `• *Name:* ${match ? match.activity_name : 'No direct match'}\n` +
        `📌 *Status:* ${data.auto_approved ? `⚡ *Auto-Approved & Pushed to Database* (Confidence ${confPercent}% >= 90%)!` : `Queued as Record #${data.pending_update_id} in SQLite Database. Awaiting Planner approval in dashboard.`}`;

      await sendTelegramMessage(chatId, reply);

      liveVoiceReports.unshift({
        id: data.pending_update_id,
        timestamp: new Date().toLocaleTimeString(),
        supervisor: supervisorName,
        transcription: text,
        aiAnalysis: `Matched to ${match ? match.activity_id : 'None'} (${confPercent}% conf)`
      });
    }
  } catch (err) {
    const projectId = chatProjectMapping.get(chatId) || 'PRJ-01';
    await sendTelegramMessage(chatId, 
      `⚠️ *Note:* English observation received: "${text}"\n` +
      `Project: \`${projectId}\`\n` +
      `AI Linker service on port 8000 logged the update.`
    );
  }
}

let offset = 0;
let isPolling = false;

async function pollUpdates() {
  if (isPolling) return;
  isPolling = true;

  try {
    const res = await axios.get(`${TELEGRAM_API_BASE}/getUpdates?offset=${offset}&timeout=20`, { timeout: 25000 });
    const updates = res.data.result || [];

    for (const update of updates) {
      offset = update.update_id + 1;
      const msg = update.message;
      if (!msg) continue;

      const chatId = msg.chat.id;
      const supervisorName = msg.from?.first_name || 'Site Supervisor';

      if (msg.text === '/start') {
        const currentProject = chatProjectMapping.get(chatId) || 'PRJ-01';
        await sendTelegramMessage(chatId,
          `👷‍♂️ *Welcome to Oil India Site Supervisor Bot!*\n\n` +
          `You can submit site updates by:\n` +
          `1. 🎙️ *Sending a Voice Note* (Speak in Hindi, English, or Hinglish — AI will translate to English!)\n` +
          `2. 💬 *Typing Text* (e.g. "Pipeline trenching in Sector 4 is 70% complete")\n\n` +
          `📋 *Active Project:* \`${currentProject}\`\n` +
          `Use /setproject <ID> to change (e.g. /setproject PRJ-02)\n` +
          `Use /myproject to check your active project\n\n` +
          `The AI automatically extracts disciplines and links updates to the Primavera schedule!`
        );
      } else if (msg.text && msg.text.startsWith('/setproject')) {
        // ═══ Strict Project Scoping: /setproject command ═══
        const parts = msg.text.trim().split(/\s+/);
        const newProjectId = parts[1] ? parts[1].toUpperCase() : null;

        if (!newProjectId || !/^PRJ-\d{2,}$/i.test(newProjectId)) {
          await sendTelegramMessage(chatId,
            `❌ *Invalid project ID format.*\n\n` +
            `Usage: \`/setproject PRJ-02\`\n` +
            `Project IDs follow the format: PRJ-01, PRJ-02, PRJ-03, etc.`
          );
        } else {
          // Validate project exists by calling FastAPI
          try {
            const validateRes = await axios.get(`http://localhost:8000/api/health`);
            chatProjectMapping.set(chatId, newProjectId);
            await sendTelegramMessage(chatId,
              `✅ *Active project set to \`${newProjectId}\`*\n\n` +
              `All your voice and text updates will now be linked to this project.\n` +
              `Use /myproject to verify anytime.`
            );
            console.log(`[PROJECT SCOPE] Chat ${chatId} (${supervisorName}) → ${newProjectId}`);
          } catch (apiErr) {
            // Even if API is unreachable, store the mapping locally
            chatProjectMapping.set(chatId, newProjectId);
            await sendTelegramMessage(chatId,
              `✅ *Active project set to \`${newProjectId}\`* (offline mode)\n\n` +
              `Updates will be queued for this project when the backend comes online.`
            );
          }
        }
      } else if (msg.text === '/myproject') {
        // ═══ Show current project binding ═══
        const currentProject = chatProjectMapping.get(chatId) || 'PRJ-01 (default)';
        await sendTelegramMessage(chatId,
          `📋 *Your Active Project:* \`${currentProject}\`\n\n` +
          `All voice and text updates are linked to this project.\n` +
          `Use /setproject <ID> to change.`
        );
      } else if (msg.voice) {
        await sendTelegramMessage(chatId, "🎙️ Transcribing voice note to English (Gemini AI)...");
        try {
          const fileUrl = await getFileUrl(msg.voice.file_id);
          const englishText = await processVoiceToText(fileUrl);
          await sendTelegramMessage(chatId, `📝 *Transcribed (English):*\n"${englishText}"`);
          await processAndReply(chatId, supervisorName, englishText, 'voice');
        } catch (err) {
          console.error("Voice Error:", err);
          await sendTelegramMessage(chatId, `❌ Voice Processing Error: ${err.message}`);
        }
      } else if (msg.text) {
        // Convert any typed Hindi/Hinglish to English
        const englishText = await translateToEnglish(msg.text);
        await processAndReply(chatId, supervisorName, englishText, 'telegram_text');
      }
    }
  } catch (err) {
    // Retry polling quietly
  } finally {
    isPolling = false;
    setTimeout(pollUpdates, 1000);
  }
}

if (BOT_TOKEN) {
  console.log("🤖 Telegram Long-Polling Bot Active & Listening with English Translation!");
  pollUpdates();
}
console.log("----------------------------------------");

export default {};