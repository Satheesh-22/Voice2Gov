// scripts/mock_external_ai.js
// Simple mock external AI server for testing. POST /ai -> returns JSON { text }
const http = require('http');
const port = process.env.PORT || 9001;

const server = http.createServer((req, res) => {
  if (req.method !== 'POST' || !req.url.startsWith('/ai')) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ error: 'not_found' }));
  }

  let body = '';
  req.on('data', (c) => body += c);
  req.on('end', () => {
    // Respond with a provider-agnostic shape that aiService can parse
    const reply = {
      text: 'Mock external AI reply: Please include location, duration, and any immediate dangers.'
    };
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(reply));
  });
});

server.listen(port, () => console.log(`Mock External AI listening on http://localhost:${port}/ai`));
