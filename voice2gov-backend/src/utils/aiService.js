// src/utils/aiService.js
// Generic AI integration wrapper — abstracts any external AI provider.
// Falls back to local JS engine when no external AI API key is configured.

const http = require('http');
const https  = require('https');
const { URL } = require('url');
const { analyzeComplaint: localFallback } = require('./nlpEngine');
const logger = require('../config/logger');

const AI_API_KEY = process.env.AI_API_KEY || '';
const EXTERNAL_AI_HOST = process.env.EXTERNAL_AI_HOST || '';
const EXTERNAL_AI_PATH = process.env.EXTERNAL_AI_PATH || '';
const MODEL = process.env.AI_MODEL || 'ai-model-v1';
const TIMEOUT_MS = 20_000;

// Low-level POST to external AI provider (host/path configured via env)
const callExternalAI = ({ system, messages, max_tokens = 1024 }) =>
  new Promise((resolve, reject) => {
    if (!AI_API_KEY || !EXTERNAL_AI_HOST || !EXTERNAL_AI_PATH) {
      return reject(new Error('External AI not configured'));
    }

    const body = JSON.stringify({ model: MODEL, max_tokens, system, messages });

    // Allow EXTERNAL_AI_HOST to be a full URL (http[s]://host:port) or just a host
    let fullUrl;
    try {
      fullUrl = new URL(EXTERNAL_AI_PATH, EXTERNAL_AI_HOST);
    } catch (e) {
      return reject(new Error(`Invalid EXTERNAL_AI_HOST / EXTERNAL_AI_PATH: ${e.message}`));
    }

    const isHttps = fullUrl.protocol === 'https:';
    const lib = isHttps ? https : http;

    const headers = {
      'Content-Type':   'application/json',
      'Content-Length': Buffer.byteLength(body),
    };
    // Support both x-api-key and Authorization: Bearer for providers like Gemini
    if (AI_API_KEY) {
      headers['x-api-key'] = AI_API_KEY;
      headers['Authorization'] = `Bearer ${AI_API_KEY}`;
    }

    const options = {
      hostname: fullUrl.hostname,
      port:     fullUrl.port || (isHttps ? 443 : 80),
      path:     `${fullUrl.pathname}${fullUrl.search || ''}`,
      method:   'POST',
      headers,
      timeout: TIMEOUT_MS,
    };

    const req = lib.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => {
        try {
          const data = JSON.parse(raw || '{}');
          if (data.error) return reject(new Error(data.error.message || JSON.stringify(data.error)));
          // Try to extract text content in a provider-agnostic way
          const text = data.content?.find?.((b) => b.type === 'text')?.text || data.text || data.result || '';
          resolve(text);
        } catch (e) {
          reject(new Error(`AI parse error: ${e.message}`));
        }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('AI API timeout')); });
    req.on('error',   (e) => reject(new Error(`AI request error: ${e.message}`)));
    req.write(body);
    req.end();
  });

// 1. Complaint analysis via external AI — returns same shape as nlpEngine.analyzeComplaint
const ANALYSIS_SYSTEM = `You are an AI complaint classification engine for Voice2Gov,
a citizen grievance management system used by municipal authorities in Tamil Nadu, India.

Analyze the complaint and respond ONLY with a valid JSON object — no markdown, no explanation.

JSON shape (follow exactly):
{
  "category":   "Infrastructure" | "Water Supply" | "Electricity" | "Sanitation" | "Noise" | "Safety" | "General",
  "department": "<department name>",
  "priority": {
    "label": "Critical" | "High" | "Medium" | "Low",
    "score": <integer 1-10>
  },
  "sentiment": "Highly negative" | "Negative" | "Neutral" | "Positive",
  "keywords": [<array of 5-8 key nouns/phrases from complaint>],
  "summary": "<one-sentence routing summary mentioning category and department>",
  "confidence": <float 0.0-1.0>,
  "processedBy": "ai-api"
}`;

const analyzeWithAI = async (text, title = '') => {
  const userContent = `Title: ${title || '(none)'}\nDescription: ${text}`;

  try {
    const raw = await callExternalAI({ system: ANALYSIS_SYSTEM, messages: [{ role: 'user', content: userContent }], max_tokens: 512 });
    const clean  = raw.replace(/```json|```/gi, '').trim();
    const result = JSON.parse(clean);

    logger.info(`[AI] category=${result.category} priority=${result.priority?.label} confidence=${result.confidence}`);
    return result;

  } catch (err) {
    logger.warn(`[AI analysis failed] ${err.message} — falling back to JS engine`);
    return localFallback(text, title);
  }
};

// 2. Citizen chat assistant
const CHAT_SYSTEM = `You are a helpful AI assistant for Voice2Gov, a civic grievance system in Tamil Nadu, India.
Your role is to:
- Help citizens understand how to report issues effectively
- Explain complaint categories: Infrastructure, Water Supply, Electricity, Sanitation, Noise, Safety
- Guide citizens on what information to include when reporting (location, duration, impact)
- Provide realistic timelines for complaint resolution by category:
    Safety/Critical: within 24 hours
    Infrastructure/Water/Electricity: 3-7 working days
    Sanitation: 1-3 working days
    Noise: 2-5 working days
- Reassure citizens and set appropriate expectations
- If asked about a specific complaint, use the provided context
- Be concise, empathetic, and professional
- Answer in the same language the citizen uses (Tamil or English)
- Never make up specific facts about complaint statuses you don't have`;

// Local fallback for chat when external AI is not configured
function generateLocalChatReply(messages, context) {
  const last = (messages && messages.length) ? messages[messages.length - 1].content.toLowerCase() : '';
  if (last.includes('how') && last.includes('report')) {
    return `You can report an issue by providing a short title, a clear description, the exact location, and any photos if available. Choose the correct category so it routes faster.`;
  }
  if (last.includes('status') || last.includes('progress')) {
    return `To check complaint status, open the complaint detail in the app or provide the complaint reference ID — the municipality updates status when work begins.`;
  }
  return `The external AI service is not available. Include location, how long the problem has existed, and any immediate dangers for faster triage.`;
}

const chatWithAI = async (messages, context = null) => {
  let systemPrompt = CHAT_SYSTEM;

  if (context?.complaint) {
    const c = context.complaint;
    systemPrompt += `\n\nCurrent complaint context:\n` +
      `Reference: ${c.referenceId}\n` +
      `Title: ${c.title}\n` +
      `Status: ${c.status}\n` +
      `Category: ${c.aiAnalysis?.category}\n` +
      `Department: ${c.assignedDepartment}\n` +
      `Priority: ${c.aiAnalysis?.priority?.label}\n` +
      `Submitted: ${new Date(c.createdAt).toLocaleDateString('en-IN')}`;
  }

  // If external AI not configured, return local fallback
  if (!AI_API_KEY || !EXTERNAL_AI_HOST || !EXTERNAL_AI_PATH) {
    const reply = generateLocalChatReply(messages, context);
    return { reply, model: 'local-fallback' };
  }

  try {
    const reply = await callExternalAI({ system: systemPrompt, messages, max_tokens: 600 });
    return { reply, model: MODEL };
  } catch (err) {
    logger.warn(`[AI chat failed] ${err.message}`);
    throw err;
  }
};

const reanalyzeWithAI = async (complaints) => {
  const results = [];
  for (const c of complaints) {
    const analysis = await analyzeWithAI(c.description, c.title);
    results.push({ id: c._id, analysis });
    await new Promise((r) => setTimeout(r, 300));
  }
  return results;
};

module.exports = { analyzeWithAI, chatWithAI, reanalyzeWithAI };
