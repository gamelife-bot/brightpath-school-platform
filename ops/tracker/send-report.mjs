import {readFileSync} from 'node:fs';
import {createClient, BetterAuthVanillaAdapter} from '@neondatabase/neon-js';
import {validateTrackerReport} from '../../src/tracker-report.js';

// Run on the hardware adapter. The browser never receives the report key.
const {BP_AUTH_URL, BP_DATA_URL, BP_TRACKER_ID, BP_TRACKER_REPORT_KEY} = process.env;
if (!BP_AUTH_URL || !BP_DATA_URL || !BP_TRACKER_ID || !BP_TRACKER_REPORT_KEY) {
  throw Error('Set BP_AUTH_URL, BP_DATA_URL, BP_TRACKER_ID and BP_TRACKER_REPORT_KEY.');
}
const payload = JSON.parse(readFileSync(0, 'utf8'));
const report = validateTrackerReport(payload, {id: BP_TRACKER_ID});
if (report.latitude === undefined) throw Error('A production report requires latitude and longitude.');

const client = createClient({
  auth: {url: BP_AUTH_URL, adapter: BetterAuthVanillaAdapter(), allowAnonymous: true},
  dataApi: {url: BP_DATA_URL}
});
const result = await client.rpc('bp_tracker_report', {
  p_device: BP_TRACKER_ID,
  p_key: BP_TRACKER_REPORT_KEY,
  p_at: new Date(report.reportedAt).toISOString(),
  p_lat: report.latitude,
  p_lon: report.longitude,
  p_battery: report.battery
});
if (result.error) throw Error('BrightPath report submission failed.');
if (result.data !== true) throw Error('The report was not accepted. Check device pairing, credentials, tracking status and timestamp.');
console.log('Tracker report accepted.');
