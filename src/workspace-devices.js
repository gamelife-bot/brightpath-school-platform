import {banners, box, button, click, empty, escapeHtml as e, field, form, heading, input, notice, option, pill, rpc, select} from './workspace-core.js';

export async function renderDevices({db,reload,timeZone}){
 const {students,devices}=await rpc(db,'bp_tracker_list');
 const dateFormat=new Intl.DateTimeFormat('en-KE',{timeZone,dateStyle:'medium',timeStyle:'short'});
 const cards=devices.map(device=>{
  const bag=device.kind==='bag';
  const student=students.find(child=>child.id===device.studentId);
  const hasReport=!!device.reportedAt;
  const stale=hasReport&&Date.now()-Date.parse(device.reportedAt)>=30*60000;
  const label=device.paused?'Tracking paused':!hasReport?'Waiting for first report':stale?'Location update is old':'Recent update';
  const location=hasReport?
   '<p><strong>Last reported location</strong><br>'+Number(device.latitude).toFixed(5)+', '+Number(device.longitude).toFixed(5)+'</p>'+
   '<p><strong>Reported at</strong><br>'+e(dateFormat.format(new Date(device.reportedAt)))+' · '+e(timeZone)+'</p>'+
   '<p><strong>Battery</strong><br>'+Number(device.battery)+'%'+(device.battery<=20?' · Low battery':'')+'</p>':'';
  return box((bag?'🎒 Bag tracker':'⌚ Wristband')+' · '+e(student?.name||'Student'),
   pill(label,device.paused||!hasReport||stale?'amber':'green')+location+
   '<div class="mw-form-actions">'+button(device.paused?'Resume tracking':'Pause tracking','tracker-pause-'+device.id,'outline')+
   button('Remove device','tracker-remove-'+device.id,'outline')+'</div>');
 }).join('');
 const pairing=students.length?box('Pair a tracker',
  '<form class="mw-form" id="tracker-pair">'+
  field('Student',select('tracker-student','<option value="">Select a student</option>'+students.map(student=>option(student.id,student.name)).join(''),'required'))+
  field('Pairing code',input('tracker-code','Enter the code supplied with the tracker','text','required maxlength="86" autocomplete="off" autocapitalize="off" spellcheck="false"'))+
  '<label class="mw-check-label"><input type="checkbox" required name="consent">I authorize BrightPath to receive the tracker’s location and show the latest report in my account.</label>'+
  button('Pair device','tracker-pair-submit','primary','type="submit"')+'</form>'):
  empty('🎒','No eligible students linked','Ask your school to verify your guardian link and record the required consent.');
 return {
  html:heading('MY FAMILY','Devices','Pair a bag tracker or wristband for a linked student in any class.',button('Refresh devices','tracker-refresh','outline'))+
   banners('info','Tracker reports show the last location of the device. School staff verify pickup separately.')+
   pairing+(cards?'<div class="mw-two">'+cards+'</div>':empty('🎒','No trackers paired')),
  bind(){
   click('tracker-refresh',()=>reload());
   form('tracker-pair',async element=>{
    const fields=new FormData(element);
    await rpc(db,'bp_tracker_pair',{p_student:element.querySelector('#tracker-student').value,p_code:String(fields.get('tracker-code')).trim(),p_consent:fields.has('consent')});
    await reload();
   });
   for(const device of devices){
    const control=async (event,action)=>{
     event.currentTarget.disabled=true;
     try{await rpc(db,'bp_tracker_control',{p_device:device.id,p_action:action});await reload()}
     catch(error){notice(error.message,'error');event.target.disabled=false}
    };
    click('tracker-pause-'+device.id,event=>control(event,device.paused?'resume':'pause'));
    click('tracker-remove-'+device.id,event=>{
     if(window.confirm('Remove this device and clear its last location? You will need a new pairing code to use it again.'))return control(event,'remove');
    });
   }
  }
 };
}
