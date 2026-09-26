// scripts/runE2EFlow.js
// Automated end-to-end flow using curl (register -> promote -> login -> submit -> update -> verify)

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
  console.log('Registering', email);
  const body = { name: 'E2E Tester', email, password };
  const out = runCurl(['-s', '-X', 'POST', `${base}/auth/register`, '-H', 'Content-Type: application/json', '-d', JSON.stringify(body)]);
  console.log('Register response:', out.trim());
}

function promote() {
  console.log('Promoting', email);
  const out = execFileSync('node', ['scripts/promoteUser.js', email], { encoding: 'utf8' });
  console.log(out.trim());
}

function login() {
  console.log('Logging in', email);
  const body = { email, password };
  const out = runCurl(['-s', '-X', 'POST', `${base}/auth/login`, '-H', 'Content-Type: application/json', '-d', JSON.stringify(body)]);
  const j = JSON.parse(out);
  const token = (j && j.token) || (j.data && j.data.token);
  if (!token) throw new Error('Login failed: ' + out);
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
  const j = JSON.parse(out);
  const id = (j && j.data && (j.data._id || (j.data.complaint && (j.data.complaint._id || j.data.complaint.id)))) || null;
  if (!id) throw new Error('Submit failed: ' + out);
  console.log('Submitted complaint id:', id);
  return id;
}

function updateStatus(token, id) {
  console.log('Updating status for', id);
  const body = { status: 'Acknowledged', note: 'Automated test update' };
  const out = runCurl(['-s', '-X', 'PUT', `${base}/complaints/${id}/status`, '-H', `Authorization: Bearer ${token}`, '-H', 'Content-Type: application/json', '-d', JSON.stringify(body)]);
  console.log('Update response:', out.trim());
}

function fetchNotifications(token) {
  console.log('Fetching notifications for', email);
  const out = runCurl(['-s', '-X', 'GET', `${base}/notifications`, '-H', `Authorization: Bearer ${token}`]);
  console.log('Notifications response:', out.trim());
}

(async () => {
  try {
    tryRegister();
  } catch (err) {
    console.log('Register step failed or user exists, continuing:', err.message.substring(0,200));
  }

  try {
    promote();
  } catch (err) {
    console.log('Promote failed:', err.message.substring(0,200));
  }

  const token = login();
  const complaintId = submitComplaint(token);
  updateStatus(token, complaintId);
  fetchNotifications(token);

  console.log('\nE2E flow complete. Complaint ID:', complaintId);
  process.exit(0);
})();
