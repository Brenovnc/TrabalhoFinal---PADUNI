const fs = require('fs').promises;
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const LOGS_FILE = path.join(DATA_DIR, 'critical_actions_log.json');

// Ensure data directory exists
async function ensureDataDirectory() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Read all logs from JSON file
async function readLogs() {
  await ensureDataDirectory();
  try {
    const data = await fs.readFile(LOGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      // File doesn't exist, return empty array
      return [];
    }
    throw error;
  }
}

// Write logs to JSON file (append-only)
async function writeLogs(logs) {
  await ensureDataDirectory();
  await fs.writeFile(LOGS_FILE, JSON.stringify(logs, null, 2), 'utf8');
}

// Add a new log entry (append-only, cannot be modified or deleted)
async function addLogEntry(logEntry) {
  const logs = await readLogs();
  
  // Create immutable log entry
  const entry = {
    id: Date.now().toString() + '-' + Math.random().toString(36).substr(2, 9),
    timestamp: new Date().toISOString(),
    responsible: logEntry.responsible, // ID or email of the person who performed the action
    action: logEntry.action, // Type of action (e.g., 'USER_DELETION', 'PROFILE_VIEW', 'MATCH_DELETION')
    target: logEntry.target, // ID or identifier of the target (user ID, match ID, etc.)
    justification: logEntry.justification || '', // Optional justification/reason
    metadata: logEntry.metadata || {} // Additional metadata
  };
  
  logs.push(entry);
  await writeLogs(logs);
  return entry;
}

// Get all logs (read-only access)
async function getAllLogs() {
  return await readLogs();
}

// Get logs filtered by criteria
async function getLogsByAction(action) {
  const logs = await readLogs();
  return logs.filter(log => log.action === action);
}

async function getLogsByResponsible(responsible) {
  const logs = await readLogs();
  return logs.filter(log => log.responsible === responsible);
}

module.exports = {
  addLogEntry,
  getAllLogs,
  getLogsByAction,
  getLogsByResponsible
};

