// voice2gov-backend/src/utils/nlpService.js
// ─────────────────────────────────────────────────────────────────────────────
// HTTP client that calls the Python NLP microservice.
// If the service is unavailable, falls back to the local JS rule-based engine.
// ─────────────────────────────────────────────────────────────────────────────

const http   = require('http');
const https  = require('https');
const { analyzeComplaint: localAnalyze } = require('./nlpEngine');
const logger = require('../config/logger');

const NLP_URL     = process.env.NLP_SERVICE_URL || 'http://localhost:8000';
const NLP_API_KEY = process.env.NLP_API_KEY     || '';
const TIMEOUT_MS  = 5000; // 5-second timeout — fall back if Python is slow

/**
 * POST to the Python NLP microservice.
 * Falls back to the local JS engine on any error.
 *
 * @param {string} text    - Complaint description
 * @param {string} title   - Complaint title (optional)
 * @returns {Promise<object>} - Analysis result
 */
async function analyzeWithService(text, title = '') {
  return new Promise((resolve) => {
    const body    = JSON.stringify({ text, title });
    const url     = new URL('/analyze', NLP_URL);
    const isHttps = url.protocol === 'https:';
    const lib     = isHttps ? https : http;

    const options = {
      hostname: url.hostname,
      port:     url.port || (isHttps ? 443 : 80),
      path:     url.pathname,
      method:   'POST',
      headers: {
        'Content-Type':   'application/json',
        'Content-Length': Buffer.byteLength(body),
        ...(NLP_API_KEY ? { 'x-api-key': NLP_API_KEY } : {}),
      },
      timeout: TIMEOUT_MS,
    };

    const req = lib.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        try {
          const data = JSON.parse(raw);
          if (data.success) {
            logger.debug(`[NLP Service] ${data.category} | ${data.priority.label} | ${data.processingMs}ms`);
            resolve(data);
          } else {
            throw new Error('Service returned success=false');
          }
        } catch (err) {
          logger.warn(`[NLP Service] Parse error — using local engine: ${err.message}`);
          resolve(localAnalyze(text, title));
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      logger.warn('[NLP Service] Timeout — using local JS engine');
      resolve(localAnalyze(text, title));
    });

    req.on('error', (err) => {
      logger.warn(`[NLP Service] Unreachable (${err.message}) — using local JS engine`);
      resolve(localAnalyze(text, title));
    });

    req.write(body);
    req.end();
  });
}

module.exports = { analyzeWithService };
