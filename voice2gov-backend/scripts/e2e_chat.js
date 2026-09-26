// scripts/e2e_chat.js
// Simple E2E: register/login -> submit complaint -> POST /api/ai/chat
const { execFileSync } = require('child_process');

const base = 'http://localhost:5000/api';
const email = process.argv[2] || 'e2e.tester@example.com';
const password = 'password123';

function runCurl(args) {
  try {
    return execFileSync('curl', args, { encoding: 'utf8' });
  } catch (err) {
    throw new Error(err.stdout || err.message);
  }
}

function tryRegister() {
  const body = { name: 'E2E Tester', email, password };
  console.log('Registering', email);
  const out = runCurl(['-s', '-X', 'POST', `${base}/auth/register`, '-H', 'Content-Type: application/json', '-d', JSON.stringify(body)]);
  console.log('Register:', out.trim());
}

function login() {
  console.log('Logging in', email);
  const body = { email, password };
  const out = runCurl(['-s', '-X', 'POST', `${base}/auth/login`, '-H', 'Content-Type: application/json', '-d', JSON.stringify(body)]);
  const j = JSON.parse(out);
  const token = (j && j.token) || (j.data && j.data.token);
  if (!token) throw new Error('Login failed: ' + out);
  console.log('Login successful');
  return token;
}

function submitComplaint(token) {
  console.log('Submitting complaint');
  const args = [
    '-s', '-X', 'POST', `${base}/complaints`,
    '-H', `Authorization: Bearer ${token}`,
    '-F', 'title=E2E: Pothole on Main St',
    '-F', 'description=There is a large pothole on Main St near the post office that needs repair.',
    '-F', 'inputType=text'
  ];
  const out = runCurl(args);
  console.log('Submit response:', out.trim());
  const j = JSON.parse(out);
  const id = (j && j.data && (j.data._id || (j.data.complaint && (j.data.complaint._id || j.data.complaint.id)))) || null;
  if (!id) throw new Error('Submit failed: ' + out);
  return id;
}

function chat(token, complaintId) {
  console.log('Calling /api/ai/chat');
  const body = { messages: [{ role: 'user', content: 'How should I report this pothole? What details do I include?' }], complaintId };
  const out = runCurl(['-s', '-X', 'POST', `${base}/ai/chat`, '-H', `Authorization: Bearer ${token}`, '-H', 'Content-Type: application/json', '-d', JSON.stringify(body)]);
  console.log('Chat response:', out.trim());
}

(async () => {
  try { tryRegister(); } catch (e) { console.log('Register skipped:', e.message.substring(0,200)); }
  const token = login();
  const complaintId = submitComplaint(token);
  chat(token, complaintId);
  console.log('E2E chat flow complete.');
  process.exit(0);
})();
