import {createHash, timingSafeEqual} from 'node:crypto';
import {createServer} from 'node:http';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {validateTrackerReport} from '../../src/tracker-report.js';

const [configPath, databasePath] = process.argv.slice(2);
if (!configPath || !databasePath) {
  throw Error('Usage: node ops/tracker/receiver.mjs <device-config.json> <reports.sqlite>');
}

const hash = token => createHash('sha256').update(token).digest();
const devices = new Map();
const tokens = new Set();
for (const {id, kind, writeToken, readToken} of JSON.parse(readFileSync(configPath, 'utf8'))) {
  if (typeof id !== 'string' || !/^[a-z0-9-]{1,60}$/.test(id) || devices.has(id) || !['bag', 'wristband'].includes(kind)) {
    throw Error('Each device must have a unique ID and a supported kind.');
  }
  for (const token of [writeToken, readToken]) {
    if (typeof token !== 'string' || !/^[a-zA-Z0-9_-]{43,}$/.test(token) || tokens.has(token)) {
      throw Error('Give each device distinct read and write tokens generated from 32 random bytes or more.');
    }
    tokens.add(token);
  }
  devices.set(id, {id, kind, readHash: hash(readToken), writeHash: hash(writeToken)});
}

process.umask(0o077);
const db = new DatabaseSync(databasePath);
db.exec(`CREATE TABLE IF NOT EXISTS latest_report (
  device_id TEXT PRIMARY KEY,
  reported_at INTEGER NOT NULL,
  payload TEXT NOT NULL
)`);
const getLatest = db.prepare('SELECT payload FROM latest_report WHERE device_id=?');
const saveLatest = db.prepare(`
  INSERT INTO latest_report (device_id, reported_at, payload) VALUES (?, ?, ?)
  ON CONFLICT(device_id) DO UPDATE SET reported_at=excluded.reported_at, payload=excluded.payload
  WHERE excluded.reported_at > latest_report.reported_at
`);

function send(response, status, body) {
  response.writeHead(status, {'Content-Type': 'application/json', 'Cache-Control': 'no-store'});
  response.end(JSON.stringify(body));
}

const server = createServer(async (request, response) => {
  const route = request.url.match(/^\/devices\/([a-z0-9-]{1,60})\/report$/);
  if (!route) return send(response, 404, {error: 'Unknown route.'});
  if (!['GET', 'POST'].includes(request.method)) return send(response, 405, {error: 'Use GET or POST.'});
  const device = devices.get(route[1]);
  const token = request.headers.authorization?.match(/^Bearer ([a-zA-Z0-9_-]{43,})$/)?.[1];
  const expected = request.method === 'GET' ? device?.readHash : device?.writeHash;
  if (!expected || !token || !timingSafeEqual(hash(token), expected)) {
    request.resume();
    return send(response, 401, {error: 'Invalid device credential.'});
  }
  if (request.method === 'GET') {
    try {
      const latest = getLatest.get(device.id);
      return send(response, 200, {id: device.id, kind: device.kind, report: latest ? JSON.parse(latest.payload) : null});
    } catch {
      return send(response, 503, {error: 'Report storage unavailable.'});
    }
  }
  if (request.headers['content-type']?.split(';')[0] !== 'application/json') {
    request.resume();
    return send(response, 415, {error: 'Send application/json.'});
  }
  let report;
  try {
    const chunks = [];
    let size = 0;
    for await (const chunk of request) {
      size += chunk.length;
      if (size > 4096) {
        send(response, 413, {error: 'Report is too large.'});
        return;
      }
      chunks.push(chunk);
    }
    report = validateTrackerReport(JSON.parse(Buffer.concat(chunks)), device);
  } catch (error) {
    return send(response, 400, {error: error instanceof SyntaxError ? 'Send a valid JSON report.' : error.message});
  }
  try {
    const saved = saveLatest.run(device.id, report.reportedAt, JSON.stringify(report));
    if (!saved.changes) return send(response, 409, {error: 'Report is older than or equal to the saved report.'});
    return send(response, 202, {accepted: true});
  } catch {
    return send(response, 503, {error: 'Report storage unavailable.'});
  }
});

server.requestTimeout = 10000;
server.listen(Number(process.env.BP_TRACKER_PORT ?? 4421), '127.0.0.1', () => {
  console.log('BrightPath tracker receiver listening on 127.0.0.1:' + server.address().port);
});
