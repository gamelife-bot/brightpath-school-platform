import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {randomBytes} from 'node:crypto';
import {once} from 'node:events';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {test} from 'node:test';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';

test('bag and wristband reports are credential-scoped, ordered, and durable', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'brightpath-tracker-'));
  const config = join(dir, 'devices.json');
  const db = join(dir, 'reports.sqlite');
  const token = () => randomBytes(32).toString('base64url');
  const devices = [
    {id:'bag', kind:'bag', readToken:token(), writeToken:token()},
    {id:'band', kind:'wristband', readToken:token(), writeToken:token()}
  ];
  await writeFile(config, JSON.stringify(devices), {mode:0o600});
  let server;
  const start = async () => {
    server = spawn(process.execPath, [fileURLToPath(new URL('./receiver.mjs', import.meta.url)), config, db], {
      env: {...process.env, BP_TRACKER_PORT:'0'}, stdio: ['ignore', 'pipe', 'inherit']
    });
    const lines = createInterface({input:server.stdout});
    try {
      const [line] = await once(lines, 'line', {signal:AbortSignal.timeout(4000)});
      return 'http://127.0.0.1:' + line.split(':').at(-1);
    } finally {
      lines.close();
    }
  };
  const stop = async () => {
    if (!server || server.exitCode !== null || server.signalCode !== null) return;
    const exited = once(server, 'exit');
    server.kill();
    await exited;
  };
  try {
    let origin = await start();
    const request = (device, credential, payload) => fetch(origin+'/devices/'+device.id+'/report', {
      method:payload?'POST':'GET', headers:{Authorization:'Bearer '+credential,'Content-Type':'application/json'},
      body:payload?JSON.stringify(payload):undefined
    });
    const [bag,band] = devices;
    assert.equal((await request(bag, band.readToken)).status,401);
    assert.equal((await request(bag, bag.writeToken)).status,401);
    assert.equal((await (await request(band, band.readToken)).json()).report,null);
    const timestamp = Date.now()-1000;
    const report = deviceId => ({deviceId, reportedAt:new Date(timestamp).toISOString(), latitude:-1.28, longitude:36.82, batteryPercent:64});
    assert.equal((await request(bag, bag.readToken, report(bag.id))).status,401);
    assert.equal((await request(bag, bag.writeToken, report(band.id))).status,400);
    assert.equal((await request(bag, bag.writeToken, {...report(bag.id), batteryPercent:101})).status,400);
    assert.equal((await request(bag, bag.writeToken, report(bag.id))).status,202);
    assert.equal((await request(band, band.writeToken, {...report(band.id), batteryPercent:38})).status,202);
    assert.equal((await request(bag, bag.writeToken, report(bag.id))).status,409);
    assert.equal((await request(bag, bag.writeToken, {...report(bag.id), reportedAt:new Date(timestamp-1000).toISOString()})).status,409);
    await stop();
    origin = await start();
    const bagState = await (await request(bag, bag.readToken)).json();
    const bandState = await (await request(band, band.readToken)).json();
    assert.equal(bagState.report.reportedAt,timestamp);
    assert.equal(bagState.report.battery,64);
    assert.equal(bagState.report.latitude,-1.28);
    assert.equal(bandState.kind,'wristband');
    assert.equal(bandState.report.battery,38);
  } finally {
    await stop();
    await rm(dir,{recursive:true,force:true});
  }
});
