import {escapeHtml as e,dateLabel,stat,box,empty,pill,field,input,select,textarea,button,heading,option,read,write,update,rpc,form,notice,v} from './workspace-core.js';

const dateToday=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Nairobi'});
const choose=(id,arr,field='name')=>'<option value="">Choose…</option>'+arr.map(a=>option(a.id,a[field])).join('');
const time=x=>String(x||'').slice(0,5);
export async function renderStaffCoverage(ctx){
 const {db,schoolId:sid,user,role,reload}=ctx,admin=role==='school_admin';
 let [rooms,children,shifts,ratios,attendance,presence,staff]=await Promise.all([
  read(db,'bp_classes',q=>q.eq('school_id',sid).order('name')),
  read(db,'bp_students',q=>q.eq('school_id',sid)),
  read(db,'bp_staff_shifts',q=>q.eq('school_id',sid).order('shift_date',{ascending:false}).limit(500)),
  read(db,'bp_room_coverage_rules',q=>q.eq('school_id',sid)),
  read(db,'bp_attendance',q=>q.eq('school_id',sid).order('attendance_date',{ascending:false}).limit(800)),
  read(db,'bp_staff_presence',q=>q.eq('school_id',sid).limit(500)),
  admin?read(db,'bp_memberships',q=>q.eq('school_id',sid).eq('role','teacher').eq('active',true)):Promise.resolve([])
 ]);
 if(!admin){const assignments=await read(db,'bp_teacher_classes',q=>q.eq('school_id',sid));const allowed=new Set(assignments.map(a=>a.class_id));rooms=rooms.filter(r=>allowed.has(r.id));}
 const profiles=admin?await read(db,'bp_profiles'):[];
 const named=id=>profiles.find(p=>p.user_id===id)?.full_name||'Teacher';
 const teachers=staff.map(t=>({...t,name:named(t.user_id)}));
 const dayParams=new URLSearchParams(location.search),today=dateToday();
 const current=/^\d{4}-\d{2}-\d{2}$/.test(dayParams.get('day')||'')?dayParams.get('day'):today;
 const info=room=>{
  const enrolled=children.filter(k=>k.class_id===room.id);
  const dayAtt=attendance.filter(a=>a.attendance_date===current&&enrolled.some(c=>c.id===a.student_id));
  const marked=dayAtt.length;
  const present=dayAtt.filter(a=>['present','late'].includes(a.status)).length;
  const duty=shifts.filter(s=>s.shift_date===current&&s.class_id===room.id&&s.status!=='cancelled');
  const clocked=duty.filter(s=>presence.some(p=>p.shift_id===s.id&&!p.checked_out_at));
  const rule=ratios.find(r=>r.class_id===room.id);
  const maxPer=rule?.target_children_per_staff||null;
  const minStaff=present&&maxPer?Math.ceil(present/maxPer):null;
  const ratio=present&&clocked.length?present+':'+clocked.length:'—';
  const state=marked===0?'No attendance':!rule?'Set room target':!present?'No children present':!clocked.length?'No staff checked in':clocked.length>=minStaff?'At target':'Below target';
  return {enrolled:enrolled.length,marked,present,duty,clocked,rule,maxPer,minStaff,ratio,state};
 };
 const roomCards=rooms.map(room=>{
  const x=info(room),warn=x.state==='Below target'||x.state==='No staff checked in';
  return '<article class="bp-staff-room '+(warn?'bp-staff-warning':'')+'"><div class="bp-staff-room-head"><span>🧸</span><div><h3>'+e(room.name)+'</h3><small>'+x.enrolled+' enrolled · '+x.marked+' attendance records</small></div>'+
    pill(x.state,warn?'red':x.state==='At target'?'green':'amber')+'</div>'+
    '<div class="bp-staff-room-counts"><div><b>'+x.present+'</b><small>Children marked present</small></div><div><b>'+x.clocked.length+'</b><small>Staff checked in</small></div><div><b>'+x.duty.length+'</b><small>Scheduled shifts</small></div></div>'+
    '<p>Coverage target: '+(x.maxPer?'1 caregiver per '+x.maxPer+' children':'Not set')+
    (x.minStaff?' · '+x.minStaff+' caregivers estimated needed':'')+'</p>'+
    (admin?'<form class="bp-ratio-form" data-ratio-room="'+e(room.id)+'">'+
    field('Children per caregiver target','<input id="bp-ratio-target-'+room.id+'" type="number" min="1" max="30" required value="'+e(x.maxPer||'')+'" placeholder="Set school target">')+
    field('Room capacity (optional)','<input id="bp-ratio-capacity-'+room.id+'" type="number" min="1" max="500" value="'+e(x.rule?.room_capacity||'')+'">')+
    button('Save target','bp-ratio-save-'+room.id,'outline','type="submit"')+'</form>':'')+'</article>';
 }).join('');
 const selected=shifts.filter(s=>s.shift_date===current),shiftName=s=>rooms.find(c=>c.id===s.class_id)?.name||'Room';
 const shiftCards=selected.map(s=>{
  const p=presence.find(x=>x.shift_id===s.id),mine=s.staff_user_id===user.id,canClock=mine&&current===today&&s.status!=='cancelled';
  return '<article class="bp-shift"><div class="bp-shift-icon">🍎</div><div><strong>'+e(admin?named(s.staff_user_id):mine?'My shift':'Another classroom caregiver')+'</strong><small>'+
    e(shiftName(s))+' · '+e(time(s.starts_at))+'–'+e(time(s.ends_at))+' · '+s.break_minutes+' min break</small>'+
    (s.notes?'<p>'+e(s.notes)+'</p>':'')+'</div><div class="bp-shift-actions">'+
    pill(p?.checked_out_at?'Completed':p?.checked_in_at?'On duty':s.status,'green')+
    (canClock&&!p?button('Check in','bp-shift-in-'+s.id,'outline','data-clock-shift="'+e(s.id)+'" data-clock-action="in"'):'')+
    (canClock&&p&&!p.checked_out_at?button('Check out','bp-shift-out-'+s.id,'outline','data-clock-shift="'+e(s.id)+'" data-clock-action="out"'):'')+
    (admin&&s.status!=='cancelled'&&!p?button('Cancel','bp-shift-cancel-'+s.id,'danger','data-cancel-shift="'+e(s.id)+'"'):'')+
  '</div></article>';
 }).join('');
 const html=heading('SAFE CLASSROOM COVERAGE',admin?'Staff shifts & ratios':'My shifts & check-ins',
  admin?'Organize teaching shifts and compare school-set coverage targets with recorded attendance.':'Check your assigned shifts and confirm when you are on or off duty.')+
 '<div class="bp-staff-notice">🛟 <strong>Staffing safety:</strong> This is an operational estimate based on recorded attendance and check-ins. Your school must independently determine and follow any applicable legal staffing requirements. A green indicator is not a compliance certificate.</div>'+
 '<div class="bp-staff-filter">'+field('Schedule date','<input type="date" id="bp-staff-day" value="'+current+'">')+button('Today','bp-staff-today','outline','type="button"')+'</div>'+
 '<div class="mw-metrics">'+stat('Rooms',rooms.length,'🏡','teal')+stat('Shifts on selected day',selected.length,'📅','amber')+
 stat('Staff clocked in',selected.filter(s=>presence.some(p=>p.shift_id===s.id&&!p.checked_out_at)).length,'✅','blue')+'</div>'+
 (admin?box('Schedule a teacher',
 '<form class="mw-form" id="bp-shift-form">'+
 field('Approved teacher',select('bp-shift-teacher','<option value="">Choose teacher</option>'+teachers.map(t=>option(t.user_id,t.name)).join(''),'required'))+
 field('Classroom',select('bp-shift-room',choose('bp-shift-room',rooms),'required'))+
 field('Date','<input id="bp-shift-date" type="date" required value="'+current+'">')+
 '<div class="bp-shift-time-grid">'+field('Start','<input id="bp-shift-start" type="time" required value="08:00">')+
 field('Finish','<input id="bp-shift-end" type="time" required value="17:00">')+
 field('Break (minutes)','<input id="bp-shift-break" type="number" min="0" max="240" value="45" required>')+'</div>'+
 field('Notes for staff',textarea('bp-shift-notes','Optional information (do not include child health details)','maxlength="500"'))+
 button('Schedule shift','bp-shift-create','primary','type="submit" '+(!teachers.length||!rooms.length?'disabled':''))+'</form>'):'')+
 box(admin?'Room coverage overview':'My classroom coverage',rooms.length?'<div class="bp-staff-room-grid">'+roomCards+'</div>':
 empty('🏡','No classrooms yet','Create a room before managing staff coverage.'))+
 box('Shifts for '+dateLabel(current),selected.length?'<div class="bp-shift-list">'+shiftCards+'</div>':
 empty('🍎','No shifts scheduled','An administrator can assign a staff shift to a classroom.'));
 return{html,bind(){
  const dayInput=document.getElementById('bp-staff-day');
  const setDay=value=>{const url=new URL(location.href);url.searchParams.set('day',value);history.replaceState(null,'',url.pathname+url.search);reload();};
  dayInput.onchange=()=>setDay(dayInput.value);
  document.getElementById('bp-staff-today').onclick=()=>setDay(today);
  if(admin){
   form('bp-shift-form',async()=>{
    const staffId=v('bp-shift-teacher'),room=v('bp-shift-room');
    if(!teachers.some(t=>t.user_id===staffId))throw Error('Choose an approved teacher');
    if(!rooms.some(r=>r.id===room))throw Error('Choose a school classroom');
    if(v('bp-shift-end')<=v('bp-shift-start'))throw Error('Shift must end after it begins');
    await write(db,'bp_staff_shifts',{school_id:sid,staff_user_id:staffId,class_id:room,shift_date:v('bp-shift-date'),
      starts_at:v('bp-shift-start'),ends_at:v('bp-shift-end'),break_minutes:Number(v('bp-shift-break')),notes:v('bp-shift-notes'),status:'planned',created_by:user.id});
    setDay(v('bp-shift-date'));
   });
   document.querySelectorAll('[data-ratio-room]').forEach(f=>f.onsubmit=async ev=>{
    ev.preventDefault();const id=f.dataset.ratioRoom,old=ratios.find(r=>r.class_id===id);
    const target=Number(v('bp-ratio-target-'+id)),capacity=v('bp-ratio-capacity-'+id)?Number(v('bp-ratio-capacity-'+id)):null;
    if(!Number.isInteger(target)||target<1||target>30)return notice('Choose between 1 and 30 children','error');
    if(capacity!==null&&(!Number.isInteger(capacity)||capacity<1||capacity>500))return notice('Room capacity must be between 1 and 500','error');
    const data={target_children_per_staff:target,room_capacity:capacity,updated_by:user.id,updated_at:new Date().toISOString()};
    try{if(old)await update(db,'bp_room_coverage_rules',data,{school_id:sid,class_id:id});
     else await write(db,'bp_room_coverage_rules',{school_id:sid,class_id:id,...data});
     notice('School-set room coverage target saved');await reload();
    }catch(err){notice(err.message,'error')}
   });
   document.querySelectorAll('[data-cancel-shift]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Cancel this planned staff shift?'))return;
    try{await update(db,'bp_staff_shifts',{status:'cancelled'},{id:b.dataset.cancelShift,school_id:sid});notice('Shift cancelled');await reload()}
    catch(err){notice(err.message,'error')}
   });
  }
  document.querySelectorAll('[data-clock-shift]').forEach(b=>b.onclick=async()=>{
   b.disabled=true;try{const res=await rpc(db,'bp_toggle_staff_presence',{p_shift:b.dataset.clockShift,p_action:b.dataset.clockAction});
    if(!res.ok)throw Error('Check-in could not be confirmed');notice('Attendance recorded');await reload();}
   catch(err){notice(err.message,'error');b.disabled=false}
  });
 }};
}
