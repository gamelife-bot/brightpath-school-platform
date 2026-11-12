import './qa-devices.css';
import {validateTrackerReport} from './src/tracker-report.js';
import {button, empty, escapeHtml as e, heading, pill} from './src/workspace-core.js';
import {getSchoolTimeZone} from './src/school-day.js';

const startedAt=Date.now();
const devices = [
 {id:'schoolbag', owner:'family-a', label:'Schoolbag', report:{place:'School entrance', reportedAt:startedAt-3*60000, battery:78}},
 {id:'sportsbag', owner:'family-a', label:'Sports bag', report:{place:'Sports hall entrance', reportedAt:startedAt-95*60000, battery:15}},
 {id:'wristband', owner:'family-a', label:'Wristband', kind:'wristband', report:null},
 {id:'weekendbag', owner:'family-b', label:'Weekend bag', report:null}
];
const householdLabels={'family-a':'Example Family A','family-b':'Example Family B'};



export function renderDevicesPreview({user,reload}){
 const owned=devices.filter(device=>device.owner===user.id);
 const otherHousehold=user.id==='family-a'?'family-b':'family-a';
 const now=Date.now();
 const format=new Intl.DateTimeFormat('en-KE',{timeZone:getSchoolTimeZone(),dateStyle:'medium',timeStyle:'medium'});
 const cards=owned.map(device=>{
  const {id,name=device.label,kind='bag',paused,report,staleMinutes=30,simulationBattery}=device;
  const deviceType=kind==='wristband'?'Wristband':'Bag tracker';
  const stale=report&&now-report.reportedAt>=staleMinutes*60000;
  const status=paused?'Tracking paused':!report?'No location yet':stale?'Location update is old':'Recent update';
  const location=report
   ? '<strong>'+e(report.place)+'</strong><time datetime="'+new Date(report.reportedAt).toISOString()+'">'+e(format.format(report.reportedAt))+' · '+e(getSchoolTimeZone())+'</time>'
   : '<strong>No report received</strong><small>Simulate a report to see a location.</small>';
  const battery=report
   ? '<strong>'+report.battery+'%'+(report.battery<=20?' · Low battery':'')+'</strong>'+
     '<meter min="0" max="100" low="21" optimum="100" value="'+report.battery+'" aria-label="Battery level"></meter>'
   : '<strong>Unavailable</strong>';
  return '<article class="qa-device-card" id="device-'+id+'">'+
   '<header class="qa-device-header"><span class="qa-device-icon" aria-hidden="true">'+(kind==='wristband'?'⌚':'🎒')+'</span><div><h2>'+e(name)+'</h2>'+
   '<span class="qa-device-type">'+deviceType+'</span>'+
   pill(status,paused||!report||stale?'amber':'green')+'</div></header>'+
   '<div class="qa-device-details"><div><h3>Last reported location</h3>'+location+'</div><div><h3>Battery</h3>'+battery+'</div></div>'+
   '<div class="qa-device-actions">'+button('Simulate report','device-report-'+id,'primary',paused?'disabled':'')+
   button(paused?'Resume tracking':'Pause tracking','device-pause-'+id,'outline')+
   button('Settings','device-manage-'+id,'outline')+'</div>'+
   '<dialog class="qa-device-dialog" id="device-dialog-'+id+'" aria-labelledby="device-dialog-title-'+id+'">'+
   '<h2 id="device-dialog-title-'+id+'">'+e(name)+' settings</h2>'+
   '<form class="mw-form" data-device-settings>'+
   '<label class="mw-field">Device name<input name="name" value="'+e(name)+'" required maxlength="60" autofocus></label>'+
   '<label class="mw-field">Mark location as old after (minutes)<input name="staleMinutes" type="number" min="1" max="1440" value="'+staleMinutes+'" required></label>'+
   '<label class="mw-field">Battery for simulated reports (%)<input name="simulationBattery" type="number" min="0" max="100" step="1" value="'+(simulationBattery??'')+'" placeholder="Use last reading"></label>'+
   '<p data-settings-error role="alert"></p><button class="mw-btn mw-btn-primary" type="submit">Save settings</button></form>'+
   '<details class="qa-device-settings-section"><summary>Test a hardware report</summary>'+
   '<form class="mw-form" data-device-import><p>Device ID <code>'+id+'</code>. Paste a report from a test adapter or try the sample.</p>'+
   '<label class="mw-field">Report JSON<textarea name="report" rows="5" required spellcheck="false"></textarea></label>'+
   '<p data-import-error role="alert"></p><div class="mw-form-actions">'+
   '<button class="mw-btn mw-btn-outline" type="button" data-sample-report>Load sample</button>'+
   '<button class="mw-btn mw-btn-primary" type="submit">Apply report</button></div></form></details>'+
   '<details class="qa-device-settings-section"><summary>Transfer or remove</summary>'+
   '<form method="dialog" class="mw-form" data-device-ownership>'+
   '<p>Transferring clears the previous report and gives access to the other example household.</p>'+
   '<div class="mw-form-actions"><button class="mw-btn mw-btn-outline" value="transfer">Transfer to '+householdLabels[otherHousehold]+'</button>'+
   '<button class="mw-btn mw-btn-danger" value="remove">Remove device</button></div></form></details>'+
   '<form method="dialog" class="qa-device-close"><button class="mw-btn mw-btn-outline">Close</button></form></dialog></article>';
 }).join('');
 return {
  html:heading('PRIVATE PROTOTYPE','Devices','Simulated tracker reports for '+householdLabels[user.id]+'.')+
   '<p class="qa-devices-note">Simulate report uses the battery reading selected in Settings. School staff confirm pickup separately.</p>'+
   (cards?'<div class="qa-device-grid">'+cards+'</div>':empty('🎒','No devices linked')),
  bind(){
   owned.forEach(device=>{
    const {id}=device;
    const dialog=document.getElementById('device-dialog-'+id);
    document.getElementById('device-pause-'+id).onclick=()=>{
     device.paused=!device.paused;
     reload();
    };
    document.getElementById('device-report-'+id).onclick=()=>{
     if(device.paused)return;
     device.report={place:'School gate',reportedAt:Date.now(),battery:device.simulationBattery??device.report?.battery??100};
     reload();
    };
    document.getElementById('device-manage-'+id).onclick=()=>dialog.showModal();
    const settings=dialog.querySelector('[data-device-settings]');
    settings.onsubmit=event=>{
     event.preventDefault();
     const name=settings.elements.name.value.trim();
     if(!name){
      settings.querySelector('[data-settings-error]').textContent='Enter a device name.';
      return;
     }
     device.name=name;
     device.staleMinutes=settings.elements.staleMinutes.valueAsNumber;
     const battery=settings.elements.simulationBattery;
     device.simulationBattery=battery.value===''?undefined:battery.valueAsNumber;
     dialog.close();
     reload();
    };
    const importForm=dialog.querySelector('[data-device-import]');
    importForm.querySelector('[data-sample-report]').onclick=()=>{
     importForm.elements.report.value=JSON.stringify({
      deviceId:id,reportedAt:new Date().toISOString(),batteryPercent:64,latitude:-1.2864,longitude:36.8172
     },null,2);
    };
    importForm.onsubmit=event=>{
     event.preventDefault();
     try{
      if(device.paused)throw Error('Resume tracking before applying a report.');
      let payload;
      try{payload=JSON.parse(importForm.elements.report.value)}catch{throw Error('Enter a valid JSON report.')}
      device.report=validateTrackerReport(payload,device);
     }catch(error){
      importForm.querySelector('[data-import-error]').textContent=error.message;
      return;
     }
     dialog.close();
     reload();
    };
    dialog.querySelector('[data-device-ownership]').onsubmit=event=>{
     const action=event.submitter.value;
     event.preventDefault();
     device.owner=action==='transfer'?otherHousehold:null;
     device.report=null;
     delete device.name;
     device.paused=false;
     delete device.simulationBattery;
     delete device.staleMinutes;
     dialog.close();
     reload();
    };
   });
  }
 };
}
