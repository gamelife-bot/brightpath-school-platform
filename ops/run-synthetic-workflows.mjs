import { spawn } from 'node:child_process';
import { setTimeout as pause } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const project=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const addr='http://127.0.0.1:4407/brightpath-school-platform/qa-activity.html';
const vite=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4407','--strictPort'],
 {cwd:project,stdio:['ignore','pipe','pipe']});
let log='',closed=false;
vite.stderr.on('data',d=>{log+=d.toString()});
vite.stdout.on('data',d=>{log+=d.toString()});
vite.on('exit',()=>{closed=true});
try{
 let ready=false;
 for(let n=0;n<80;n++){
  if(closed)throw Error('Vite server failed to start: '+log.slice(-1000));
  try{const r=await fetch(addr,{signal:AbortSignal.timeout(1500)});if(r.ok){ready=true;break}}catch{}
  await pause(250);
 }
 if(!ready)throw Error('Local QA server was not ready: '+log.slice(-1000));
 const runner=spawn(process.execPath,['qa-activity-test.mjs'],{cwd:project,stdio:'inherit',env:process.env});
 const status=await new Promise((resolve,reject)=>{runner.on('error',reject);runner.on('close',(code)=>resolve(code))});
 if(status!==0)process.exitCode=status||1;
}finally{
 vite.kill('SIGTERM');
}
