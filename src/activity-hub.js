import {schoolDay,schoolDateTime,schoolTime} from './school-day.js';
import {escapeHtml as e,dateLabel,stat,box,empty,pill,field,input,select,textarea,button,heading,table,tr,option,read,rpc,form,notice,v} from './workspace-core.js';
import {visibleChildren} from './child-center.js';

const icon={care:'☀️',milestone:'🌱',photo:'📷',video:'🎥',message:'💌',pickup:'🎒',incident:'🩹',school_request:'🔔'};
const prettyDate=x=>schoolDateTime(x);
const dayKey=x=>schoolDay(x);
const emptyAction=description=>empty('🧸','Nothing shared yet',description);
export async function renderNotifications(ctx){
 const {db,user,schoolId:sid,role,go,reload,refreshNotifications}=ctx;
 const all=await read(db,'bp_notifications',q=>q.eq('recipient_user_id',user.id).order('created_at',{ascending:false}).limit(250));
 const notifications=all.filter(n=>n.school_id===sid);
 const unread=notifications.filter(n=>!n.read_at);
 const cards=notifications.map(n=>'<article class="bp-notification '+(!n.read_at?'bp-notification-unread':'')+'">'+
 '<div class="bp-notification-icon">'+(icon[n.kind]||'🔔')+'</div><div class="bp-notification-copy"><div><strong>'+e(n.title)+'</strong>'+(!n.read_at?'<span class="bp-new-pill">NEW</span>':'')+'</div><p>'+e(n.summary)+'</p><small>'+prettyDate(n.created_at)+'</small></div>'+
 '<div class="bp-notification-actions">'+button('Open','bp-note-open-'+n.id,'outline','data-open-notice="'+n.id+'" data-open-tab="'+e(n.target_tab)+'"')+
 (!n.read_at?button('Mark read','bp-note-read-'+n.id,'outline','data-read-notice="'+n.id+'"'):'')+'</div></article>').join('');
 return{html:heading('YOUR UPDATES','Notifications')+
 '<div class="mw-metrics">'+stat('Unread',unread.length,'🔔','amber')+stat('All updates',notifications.length,'💌','teal')+'</div>'+
 box('Notification inbox',
  '<div class="bp-notifications-toolbar"><span>'+unread.length+' unread update'+(unread.length===1?'':'s')+'</span>'+button('Mark all as read','bp-mark-all','outline','type="button" '+(!unread.length?'disabled':''))+
   button('Refresh','bp-notes-refresh','outline','type="button"')+button('Enable browser alerts','bp-enable-browser-notices','outline','type="button"')+'</div>'+
 (notifications.length?'<div class="bp-notifications-list">'+cards+'</div>':emptyAction('You’ll receive private updates when the school shares new moments or requests.'))),bind(){
  const setRead=async ids=>{await rpc(db,'bp_mark_notifications_read',{p_ids:ids});if(refreshNotifications)await refreshNotifications();await reload();};
  document.getElementById('bp-notes-refresh').onclick=()=>reload();
  const enable=document.getElementById('bp-enable-browser-notices');
  if(enable){
   const key='bp-notice-browser-'+user.id+'-'+sid;
   if(typeof Notification==='undefined'||!window.isSecureContext){enable.disabled=true;enable.textContent='Browser alerts unavailable';}
   else{
    if(Notification.permission==='granted'&&localStorage.getItem(key)==='yes')enable.textContent='Browser alerts enabled';
    enable.onclick=async()=>{
     try{
      if(Notification.permission==='denied')throw Error('Browser notifications are blocked in site settings');
      const permission=Notification.permission==='granted'?'granted':await Notification.requestPermission();
      if(permission!=='granted')throw Error('Browser alert permission was not granted');
      localStorage.setItem(key,'yes');enable.textContent='Browser alerts enabled';
      notice('Browser alerts enabled while BrightPath is open in a tab');
     }catch(err){notice(err.message,'error')}
    };
   }
  }

  document.getElementById('bp-mark-all').onclick=async()=>{try{await setRead(null)}catch(err){notice(err.message,'error')}};
  document.querySelectorAll('[data-read-notice]').forEach(b=>b.onclick=async()=>{try{await setRead([Number(b.dataset.readNotice)])}catch(err){notice(err.message,'error')}});
  document.querySelectorAll('[data-open-notice]').forEach(b=>b.onclick=async()=>{
   const n=notifications.find(x=>String(x.id)===b.dataset.openNotice);if(!n)return;
   try{
    if(!n.read_at)await rpc(db,'bp_mark_notifications_read',{p_ids:[Number(n.id)]});
    if(refreshNotifications)await refreshNotifications();
    go(n.target_tab);
   }catch(err){notice(err.message,'error')}
  });
 }};
}

const GROUP_TYPES={
 meal:['🥣','Meal / snack','Children ate or were offered a meal'],
 nap:['😴','Rest / nap','Rest time in the classroom'],
 mood:['😊','Mood check','How the children were feeling'],
 play:['🧸','Classroom play','Playtime or group activity'],
 diaper:['🧷','Diaper change','Diaper or nappy care'],
 toilet:['🚽','Toilet visit','Bathroom routine'],
 other:['🌻','Other','Other daily-care observation']
};
const presets=[
 ['🥣 Snack time','meal','Snack time completed.'],
 ['📚 Storytime','play','Joined group storytime and enjoyed the book.'],
 ['🧸 Outdoor play','play','Played outdoors with their group.'],
 ['😴 Nap time','nap','Settled in for the scheduled rest time.'],
 ['😊 Mood check','mood','Calm and comfortable during classroom activities.']
];
export async function renderQuickCare(ctx){
 const {db,schoolId:sid,role,go,reload}=ctx;
 if(role==='parent')return{html:heading('School staff only','Care updates','Only authorized staff can publish classroom updates.')};
 const today=schoolDay();
 const [children,classes,todayAttendance]=await Promise.all([
  visibleChildren(ctx),read(db,'bp_classes',q=>q.eq('school_id',sid).order('name')),
  read(db,'bp_attendance',q=>q.eq('school_id',sid).eq('attendance_date',today))
 ]);
 const presentIds=new Set(todayAttendance.filter(a=>['present','late'].includes(a.status)).map(a=>a.student_id));
 const available=classes.filter(c=>children.some(k=>k.class_id===c.id));
 const roster=id=>children.filter(c=>c.class_id===id);
 const html=heading('FAST CLASSROOM LOGGING','Quick classroom update')+
 '<div class="bp-quick-intro"><span>✨</span><div><strong>One update for selected children</strong><p>Each linked family receives only their child’s update.</p></div></div>'+
 '<div class="mw-two mw-two-side">'+box('Post to your classroom',
 '<form id="bp-group-care-form" class="mw-form">'+
 field('Classroom or group',select('bp-group-class','<option value="">Choose a room</option>'+available.map(c=>option(c.id,c.name)).join(''),'required'))+
 '<div class="bp-roster-head"><b>Choose the children who actually participated</b><label><input type="checkbox" id="bp-group-selectall"> Select all in this room</label></div>'+
 '<div class="bp-presence-tools"><button class="mw-btn mw-btn-outline" id="bp-group-present" type="button">✓ Select children marked present today</button><small id="bp-group-present-count">Attendance must be marked first; adjust the selection to match who participated.</small></div>'+
 '<div id="bp-group-children" class="bp-group-checklist">'+empty('🧸','Choose a classroom','Your assigned children will appear here.')+'</div>'+
 '<div id="bp-group-count" class="bp-group-counter">0 children selected</div>'+
 field('Type of activity',select('bp-group-type',Object.entries(GROUP_TYPES).map(([k,[ico,label]])=>option(k,ico+' '+label)).join('')))+
 field('Details shared with families',textarea('bp-group-details','Describe what happened. Keep it factual and appropriate for all selected children.','required minlength="2" maxlength="1200"'))+
 field('Observation',input('bp-group-value','e.g. Enjoyed, Completed, Participated','text','maxlength="100"'))+
 '<p class="bp-private-hint">Do not include one child’s personal or medical information in a group update. For individual needs, use the Daily care diary.</p>'+
 '<div class="mw-form-actions">'+button('Save updates for selected children','bp-group-save','primary','type="submit" '+(!children.length?'disabled':''))+'</div></form>')+
 box('Classroom templates','<div class="bp-quick-presets">'+presets.map(([label,type,details])=>
 '<button type="button" class="bp-preset" data-preset-type="'+e(type)+'" data-preset-details="'+e(details)+'">'+label+' <span>↗</span></button>').join('')+'</div>')+'</div>';
 return{html,bind(){
  const chooser=document.getElementById('bp-group-class'),list=document.getElementById('bp-group-children'),all=document.getElementById('bp-group-selectall');
  const selected=()=>[...document.querySelectorAll('[data-group-child]:checked')].map(x=>x.value);
  const updateCount=()=>{document.getElementById('bp-group-count').textContent=selected().length+' children selected';};
  const draw=()=>{
   all.checked=false;
   const records=roster(chooser.value);
   list.innerHTML=records.length?records.map(k=>
    '<label class="bp-roster-option"><input type="checkbox" data-group-child value="'+e(k.id)+'"><span class="mw-round-icon">'+e(k.full_name.charAt(0))+'</span><b>'+e(k.full_name)+'</b></label>').join(''):
    empty('🧸','No children in this room','Choose another classroom or enroll a child.');
   list.querySelectorAll('[data-group-child]').forEach(x=>x.onchange=updateCount);updateCount();
  };
  chooser.onchange=draw;
  document.getElementById('bp-group-present').onclick=()=>{
   const rosterBoxes=[...list.querySelectorAll('[data-group-child]')];
   if(!rosterBoxes.length)return notice('Choose a classroom first','error');
   if(!rosterBoxes.some(x=>presentIds.has(x.value)))return notice('No children in this room have been marked present today. Mark attendance or select participants manually.','error');
   rosterBoxes.forEach(x=>{x.checked=presentIds.has(x.value)});
   all.checked=rosterBoxes.length>0&&rosterBoxes.every(x=>x.checked);updateCount();
  };
  if(available.length===1){chooser.value=available[0].id;draw();}
  document.getElementById('bp-group-present-count').textContent=presentIds.size+' children marked present today across assigned rooms. Review selection before saving.';
  all.onchange=()=>{list.querySelectorAll('[data-group-child]').forEach(x=>x.checked=all.checked);updateCount()};
  document.querySelectorAll('[data-preset-type]').forEach(b=>b.onclick=()=>{
   document.getElementById('bp-group-type').value=b.dataset.presetType;
   document.getElementById('bp-group-details').value=b.dataset.presetDetails;
   document.getElementById('bp-group-details').focus();
  });
  form('bp-group-care-form',async()=>{
   const ids=selected(),room=chooser.value;
   if(!room||!available.some(c=>c.id===room))throw Error('Choose your assigned classroom');
   if(ids.length<1)throw Error('Select at least one child');
   if(ids.length>30)throw Error('Choose a maximum of 30 children at a time');
   if(!ids.every(id=>roster(room).some(x=>x.id===id)))throw Error('One of the selected children is not in this class');
   const answer=await rpc(db,'bp_group_care_update',{p_school:sid,p_student_ids:ids,p_type:v('bp-group-type'),p_details:v('bp-group-details'),p_value:v('bp-group-value')||null});
   if(!answer?.ok||answer.saved!==ids.length)throw Error('The update was not confirmed. Check before retrying.');
   notice('Saved updates for '+answer.saved+' children');
   await reload();
  });
  draw();
 }};
}

export async function renderDailySummary(ctx){
 const {db,schoolId:sid,role}=ctx;
 const kids=await visibleChildren(ctx),ids=new Set(kids.map(k=>k.id));
 const [care,marks,media,pickup,attendance,incidents]=await Promise.all([
  read(db,'bp_care_logs',q=>q.eq('school_id',sid).order('occurred_at',{ascending:false}).limit(400)),
  read(db,'bp_milestones',q=>q.eq('school_id',sid).order('observed_at',{ascending:false}).limit(200)),
  read(db,'bp_child_media',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(200)),
  read(db,'bp_pickup_events',q=>q.eq('school_id',sid).order('occurred_at',{ascending:false}).limit(200)),
  read(db,'bp_attendance',q=>q.eq('school_id',sid).order('attendance_date',{ascending:false}).limit(400)),
  read(db,'bp_incident_reports',q=>q.eq('school_id',sid).order('happened_at',{ascending:false}).limit(200))
 ]);
 const today=schoolDay();
 const dateScope=(id,date)=>{
  const logs=care.filter(x=>x.student_id===id&&dayKey(x.occurred_at)===date);
  const mill=marks.filter(x=>x.student_id===id&&dayKey(x.observed_at)===date);
  const videos=media.filter(x=>x.student_id===id&&dayKey(x.created_at)===date);
  const events=pickup.filter(x=>x.student_id===id&&dayKey(x.occurred_at)===date);
  const att=attendance.find(x=>x.student_id===id&&x.attendance_date===date);
  const incident=incidents.filter(x=>x.student_id===id&&dayKey(x.happened_at)===date);
  const sections=[
   {title:'🥣 Meals & snacks',items:logs.filter(x=>x.event_type==='meal')},
   {title:'😴 Rest & sleep',items:logs.filter(x=>x.event_type==='nap')},
   {title:'😊 Mood, play & care',items:logs.filter(x=>!['meal','nap'].includes(x.event_type))},
  ];
  const selected=kids.find(k=>k.id===id);
  return '<div class="bp-summary-paper"><div class="bp-summary-brand"><span>✦ brightpath.</span><span>Daily care summary</span></div>'+
   '<div class="bp-summary-head"><div><span>YOUR LITTLE ONE’S DAY</span><h2>'+e(selected?.full_name||'Child')+'</h2><p>'+e(dateLabel(date))+'</p></div><span class="bp-summary-illustration">🧸</span></div>'+
   '<div class="bp-summary-stats">'+[['Attendance',att?.status||'Not recorded'],['Photos / videos',videos.length+' shared'],['New milestones',mill.length+' recorded']].map(([k,v])=>
    '<div><small>'+k+'</small><strong>'+e(v)+'</strong></div>').join('')+'</div>'+
   sections.map(({title,items})=>'<section class="bp-summary-section"><h3>'+title+'</h3>'+
    (items.length?items.map(x=>'<div class="bp-summary-line"><strong>'+schoolTime(x.occurred_at)+'</strong><span>'+
     e(x.details)+(x.event_value?' · '+e(x.event_value):'')+'</span></div>').join(''):'<p>No updates recorded for this part of the day.</p>')+'</section>').join('')+
   '<section class="bp-summary-section"><h3>🌱 Learning moments</h3>'+
    (mill.length?mill.map(x=>'<p><b>'+e(x.title)+'</b> — '+e(x.observation)+'</p>').join(''):'<p>No milestones recorded today.</p>')+'</section>'+
   '<section class="bp-summary-section"><h3>🎒 Arrival & pickup</h3>'+
    (events.length?events.map(x=>'<p>'+e(x.event_type==='check_in'?'Arrived':'Picked up')+' · '+schoolTime(x.occurred_at)+'</p>').join(''):'<p>No arrival or pickup record for this date.</p>')+'</section>'+
   (incident.length?'<div class="bp-summary-alert">🩹 An incident report exists for this day. Review the private Health & incidents page for details.</div>':'')+
   '<div class="bp-summary-foot">Prepared from school-recorded updates. Missing entries mean no update was recorded, not that care did not occur.</div></div>';
 };
 const current=new URLSearchParams(location.search).get('child');
 const active=kids.some(k=>k.id===current)?current:kids[0]?.id||'';
 const html=heading('ONE LOVELY DAY','Daily summary')+
 '<div class="bp-summary-tools">'+field('Child',select('bp-summary-child','<option value="">Choose a child</option>'+kids.map(c=>option(c.id,c.full_name)).join('')))+
 field('Day','<input type="date" id="bp-summary-date" value="'+today+'" max="'+today+'">')+
 button('Print / Save as PDF','bp-summary-print','primary','type="button" '+(!kids.length?'disabled':''))+'</div>'+
 '<div id="bp-summary-display">'+(active?dateScope(active,today):empty('📔','Your daily reports will appear here','Your school must first enroll and link a child.'))+'</div>';
 return{html,bind(){
  const child=document.getElementById('bp-summary-child'),day=document.getElementById('bp-summary-date');
  if(active)child.value=active;
  const render=()=>{document.getElementById('bp-summary-display').innerHTML=child.value?dateScope(child.value,day.value):
   empty('📔','Choose a child','A report will appear here.');};
  child.onchange=render;day.onchange=render;
  document.getElementById('bp-summary-print').onclick=()=>window.print();
 }};
}
