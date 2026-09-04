import 'dotenv/config';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';

export const liveVoiceReports = [];

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const GROQ_KEY = process.env.GROQ_API_KEY;

console.log("----------------------------------------");
console.log("🔍 Checking Telegram Bot Environment Config...");
console.log("• TELEGRAM_BOT_TOKEN:", BOT_TOKEN ? "✅ Found" : "❌ Missing");
console.log("• GROQ_API_KEY:", GROQ_KEY ? "✅ Found" : "❌ Missing");

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

async function processVoiceToText(fileUrl) {
  if (!GROQ_KEY) throw new Error("GROQ_API_KEY missing");
  const openai = new OpenAI({ apiKey: GROQ_KEY, baseURL: "https://api.groq.com/openai/v1" });
  
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

    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(filePath),
      model: 'whisper-large-v3',
    });
    return transcription.text;
  } finally {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

async function processAndReply(chatId, supervisorName, text, sourceType) {
  try {
    await sendTelegramMessage(chatId, "⚡ Linking update to Primavera Schedule Database...");
    
    const response = await axios.post('http://localhost:8000/api/field-update', {
      text: text,
      source_type: sourceType,
      project_id: 'PRJ-01',
      submitted_by: supervisorName
    });

    const data = response.data;
    if (data.success) {
      const match = data.best_match;
      const confPercent = Math.round(data.confidence * 100);

      const reply = 
        `✅ *Schedule Activity Matched!*\n\n` +
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
    await sendTelegramMessage(chatId, 
      `⚠️ *Note:* Observation received: "${text}"\n` +
      `AI Linker service on port 8000 returned an error or is starting up.`
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
        await sendTelegramMessage(chatId,
          `👷‍♂️ *Welcome to Oil India Site Supervisor Bot!*\n\n` +
          `You can submit site updates by:\n` +
          `1. 🎙️ *Sending a Voice Note* (Hinglish/English)\n` +
          `2. 💬 *Typing Text* (e.g. "Line 24-XX spool erection completed")\n\n` +
          `The AI automatically extracts disciplines and links updates to the Primavera schedule!`
        );
      } else if (msg.voice) {
        await sendTelegramMessage(chatId, "🎙️ Transcribing voice note via Groq Whisper...");
        try {
          const fileUrl = await getFileUrl(msg.voice.file_id);
          const transcribedText = await processVoiceToText(fileUrl);
          await sendTelegramMessage(chatId, `📝 *Transcribed:* "${transcribedText}"`);
          await processAndReply(chatId, supervisorName, transcribedText, 'voice');
        } catch (err) {
          console.error("Voice Error:", err);
          await sendTelegramMessage(chatId, `❌ Voice Processing Error: ${err.message}`);
        }
      } else if (msg.text) {
        await processAndReply(chatId, supervisorName, msg.text, 'telegram_text');
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
  console.log("🤖 Telegram Long-Polling Bot Active & Listening!");
  pollUpdates();
}
console.log("----------------------------------------");

export default {};