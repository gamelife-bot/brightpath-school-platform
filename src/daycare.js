import {schoolDay,schoolTime,schoolDateTime,getSchoolTimeZone} from './school-day.js';
import {schoolDateTimeInput,schoolLocalToUtc} from './school-clock-input.js';
import {escapeHtml as h,numberLabel as n,dateLabel,initial,stat,box,empty,pill,status,field,input,select,textarea,button,heading,table,tr,option,bar,read,write,update,rpc,result,form,click,notice,v,checked} from './workspace-core.js';

const icons={meal:'🥣',nap:'😴',diaper:'🧷',toilet:'🚽',mood:'😊',play:'🧸',other:'🌻'};
const eventLabel={meal:'Meal',nap:'Nap',diaper:'Diaper change',toilet:'Toilet visit',mood:'Mood check',play:'Playtime',other:'Other care'};
const progressLabel={emerging:'Starting to explore',developing:'Developing',achieved:'Achieved'};
const areas={communication:['💬','Communication & speech'],social:['🤝','Friendship & social skills'],physical:['🏃','Movement & coordination'],thinking:['🧩','Thinking & problem-solving'],self_care:['🌱','Independence & self-care'],creativity:['🎨','Creativity & imagination']};
const dateTime=v=>schoolDateTime(v);
const time=v=>schoolTime(v);
const isToday=iso=>schoolDay(iso)===schoolDay();
const safeDate=iso=>iso?schoolDateTimeInput(iso):'';
const careValue={meal:['All eaten','Most eaten','Half eaten','A little','Did not eat'],nap:['Rested well','Short nap','Woke early'],diaper:['Wet','Soiled','Dry'],toilet:['Used toilet','Needs help','Accident'],mood:['Happy','Calm','Tired','Upset','Energetic'],play:['Indoor','Outdoor','Group play','Individual'],other:['Update']};
function childDropdown(students){return '<option value="">Choose a child</option>'+students.map(s=>option(s.id,s.full_name)).join('')}
function prettyName(students,id){return students.find(s=>s.id===id)?.full_name||'Child'}
function careList(entries,students){
 return entries.length?'<div class="bp-care-feed">'+entries.map(log=>
 '<article class="bp-care-item"><div class="bp-care-emoji">'+(icons[log.event_type]||'🌻')+'</div><div class="bp-care-body">'+
 '<div class="bp-care-head"><strong>'+h(eventLabel[log.event_type]||log.event_type)+'</strong><span>'+time(log.occurred_at)+'</span></div>'+
 '<div class="bp-care-child">'+h(prettyName(students,log.student_id))+' · '+dateLabel(log.occurred_at)+'</div>'+
 (log.event_value?pill(log.event_value,'green'):'')+
 '<p>'+h(log.details)+'</p>'+(log.ended_at?'<small>Until '+time(log.ended_at)+'</small>':'')+'</div></article>').join('')+'</div>':
 empty('🌤️','Today’s diary is ready','Your child’s daily moments will appear here.');
}
async function childRoster(ctx){
 const {db,schoolId:sid,role}=ctx;
 const children=await read(db,'bp_students',q=>q.eq('school_id',sid).order('full_name'));
 if(role==='school_admin')return children;
 if(role==='teacher'){
  const assigned=await read(db,'bp_teacher_classes',q=>q.eq('school_id',sid));
  const ids=new Set(assigned.map(a=>a.class_id));
  return children.filter(c=>ids.has(c.class_id));
 }
 const links=await read(db,'bp_parent_links',q=>q.eq('school_id',sid));
 const ids=new Set(links.map(a=>a.student_id));
 return children.filter(c=>ids.has(c.id));
}
const childPicker=(students,id='bp-child')=>field('Child',select(id,childDropdown(students),'required'));
function formActions(html){return '<div class="mw-form-actions">'+html+'</div>'}
function noticeRow(title,desc,icon){return '<div class="bp-info-row"><span>'+icon+'</span><div><b>'+h(title)+'</b><small>'+h(desc)+'</small></div></div>'}

export async function renderCareDiary(ctx){
 const {db,schoolId:sid,user,reload,role}=ctx;
 const students=await childRoster(ctx);
 const ids=new Set(students.map(s=>s.id));
 const all=await read(db,'bp_care_logs',q=>q.eq('school_id',sid).order('occurred_at',{ascending:false}).limit(160));
 const logs=all.filter(l=>ids.has(l.student_id));
 const day=logs.filter(l=>isToday(l.occurred_at));
 const canPost=role!=='parent';
 const counts={meal:day.filter(l=>l.event_type==='meal').length,nap:day.filter(l=>l.event_type==='nap').length,mood:day.filter(l=>l.event_type==='mood').length,other:day.length};
 const html=heading('DAILY CARE','Daily care diary')+
 '<div class="mw-metrics">'+stat('Care updates today',counts.other,'🌤️','teal')+
 stat('Meals logged',counts.meal,'🥣','amber')+
 stat('Naps logged',counts.nap,'😴','blue')+
 stat('Mood checks',counts.mood,'😊','violet')+'</div>'+
 (canPost?'<div class="mw-two mw-two-side">'+box('Log a care moment',
 '<form id="bp-care-form" class="mw-form">'+childPicker(students,'bp-care-child')+
 field('Care activity',select('bp-care-type',Object.entries(eventLabel).map(([id,label])=>option(id,icons[id]+' '+label)).join('')))+
 field('What happened?',textarea('bp-care-description','Describe how the child is doing…','required minlength="2" maxlength="1200"'))+
 field('Observation',select('bp-care-value',careValue.meal.map(s=>option(s,s)).join('')))+
 field('Time','<input id="bp-care-when" type="datetime-local" value="'+schoolDateTimeInput()+'" required>')+
 '<label id="bp-nap-end-container" class="mw-field" hidden><span>Nap finished (optional)</span><input id="bp-nap-end" type="datetime-local"></label>'+
 formActions(button('Save care update','bp-care-save','primary','type="submit" '+(!students.length?'disabled':'')))+'</form>')+
 box('A caring daily rhythm',
 noticeRow('Meals & snacks','How much the child ate','🥣')+
 noticeRow('Rest & nap','When sleep started and ended','😴')+
 noticeRow('Toilet care','Diaper changes and bathroom visits','🧷')+
 noticeRow('Play & mood','Activities, emotions and little joys','🧸'))+'</div>':'')+
 box('Child’s daily timeline',
 '<div class="mw-filter-row">'+(students.length>1?field('Show child',select('bp-diary-filter','<option value="all">All children</option>'+students.map(s=>option(s.id,s.full_name)).join(''))):'')+
 field('When',select('bp-diary-day','<option value="today">Today</option><option value="week">Last 7 days</option><option value="all">All updates</option>'))+'</div>'+
 '<div id="bp-diary-feed">'+careList(day,students)+'</div>');
 return {html,bind(){
  const careType=document.getElementById('bp-care-type'),value=document.getElementById('bp-care-value');
  if(careType){
   careType.onchange=()=>{value.innerHTML=careValue[careType.value].map(s=>option(s,s)).join('');
    document.getElementById('bp-nap-end-container').hidden=careType.value!=='nap';};
   document.getElementById('bp-nap-end-container').hidden=true;
   form('bp-care-form',async()=>{
    const child=v('bp-care-child');
    if(!students.some(s=>s.id===child))throw Error('Select a child from your class');
    const start=schoolLocalToUtc(v('bp-care-when'));
    if(Number.isNaN(start.getTime()))throw Error('Choose a valid date and time');
    const finish=v('bp-nap-end')&&careType.value==='nap'?schoolLocalToUtc(v('bp-nap-end')).toISOString():null;
    if(finish&&new Date(finish)<start)throw Error('Nap finish must be after nap start');
    await write(db,'bp_care_logs',{school_id:sid,student_id:child,event_type:careType.value,details:v('bp-care-description'),event_value:value.value,occurred_at:start.toISOString(),ended_at:finish,created_by:user.id});
    await reload();
   });
  }
  const show=()=>{
   const filter=document.getElementById('bp-diary-filter')?.value||'all';
   const scope=document.getElementById('bp-diary-day')?.value||'today';
   const boundary=Date.now()-7*86400000;
   const shown=logs.filter(l=>(filter==='all'||l.student_id===filter)&&
    (scope==='all'||(scope==='today'&&isToday(l.occurred_at))||(scope==='week'&&new Date(l.occurred_at).getTime()>=boundary)));
   document.getElementById('bp-diary-feed').innerHTML=careList(shown,students);
  };
  document.getElementById('bp-diary-filter')?.addEventListener('change',show);
  document.getElementById('bp-diary-day')?.addEventListener('change',show);
 }};
}

export async function renderMilestones(ctx){
 const {db,schoolId:sid,user,reload,role}=ctx;
 const students=await childRoster(ctx),ids=new Set(students.map(s=>s.id));
 const all=await read(db,'bp_milestones',q=>q.eq('school_id',sid).order('observed_at',{ascending:false}).limit(150));
 const marks=all.filter(m=>ids.has(m.student_id));
 const achieved=marks.filter(m=>m.progress==='achieved');
 const html=heading('GROWTH & DISCOVERY','Development milestones')+
 '<div class="mw-metrics">'+stat('Observations',marks.length,'✦','teal')+
 stat('Milestones achieved',achieved.length,'🌟','amber')+
 stat('Developing skills',marks.filter(m=>m.progress==='developing').length,'🌱','blue')+'</div>'+
 (role!=='parent'?'<div class="mw-two mw-two-side">'+box('Record a milestone',
 '<form id="bp-milestone-form" class="mw-form">'+childPicker(students,'bp-milestone-child')+
 field('Development area',select('bp-milestone-area',Object.entries(areas).map(([code,rec])=>option(code,rec[0]+' '+rec[1])).join('')))+
 field('Milestone title',input('bp-milestone-title','e.g. Stacked five blocks independently','text','required minlength="2" maxlength="150"'))+
 field('Progress',select('bp-milestone-progress','<option value="emerging">Starting to explore</option><option value="developing">Developing</option><option value="achieved">Achieved</option>'))+
 field('What did you observe?',textarea('bp-milestone-detail','Describe the moment, support given and next steps…','required minlength="2" maxlength="1800"'))+
 formActions(button('Save milestone','bp-milestone-submit','primary','type="submit" '+(!students.length?'disabled':'')))+'</form>')+
 box('What we celebrate','<div class="bp-skill-grid">'+Object.values(areas).map(([ico,label])=>
 '<div><span>'+ico+'</span><b>'+h(label)+'</b></div>').join('')+'</div>')+'</div>':'')+
 box('Milestone journal',marks.length?'<div class="bp-milestone-grid">'+marks.map(m=>
 '<article class="bp-milestone-card"><div class="bp-milestone-top"><span>'+areas[m.area]?.[0]+'</span>'+pill(progressLabel[m.progress],m.progress==='achieved'?'green':'amber')+'</div><p class="bp-overline">'+h(prettyName(students,m.student_id))+' · '+dateLabel(m.observed_at)+'</p><h3>'+h(m.title)+'</h3><p>'+h(m.observation)+'</p><small>'+h(areas[m.area]?.[1]||m.area)+'</small></article>').join('')+'</div>':
 empty('🌻','Growth moments will appear here','Each new skill is worth celebrating.'));
 return{html,bind(){
  if(role!=='parent')form('bp-milestone-form',async()=>{
   const id=v('bp-milestone-child');if(!students.some(s=>s.id===id))throw Error('Choose a child');
   await write(db,'bp_milestones',{school_id:sid,student_id:id,area:v('bp-milestone-area'),title:v('bp-milestone-title'),observation:v('bp-milestone-detail'),progress:v('bp-milestone-progress'),teacher_user_id:user.id});await reload();
  });
 }};
}

export async function renderChildMessages(ctx){
 const {db,schoolId:sid,user,reload,role,go}=ctx;
 const students=await childRoster(ctx),ids=new Set(students.map(s=>s.id));
 const records=await read(db,'bp_child_messages',q=>q.eq('school_id',sid).order('created_at',{ascending:true}).limit(350));
 const messages=records.filter(m=>ids.has(m.student_id));
 const current=new URLSearchParams(window.location.search).get('child')||students[0]?.id||'';
 const active=students.some(s=>s.id===current)?current:students[0]?.id||'';
 const thread=(id)=>{
  const list=messages.filter(m=>m.student_id===id);
  return list.length?'<div class="bp-chat-messages">'+list.map(m=>
   '<div class="bp-chat-bubble '+(m.sender_user_id===user.id?'bp-chat-out':'bp-chat-in')+'">'+
    '<small>'+(m.sender_user_id===user.id?'You':role==='parent'?'School team':'Parent / school team')+' · '+time(m.created_at)+'</small>'+
    '<p>'+h(m.body)+'</p></div>').join('')+'</div>':
   empty('💌','Start a conversation','Send a message about your child’s day.');
 };
 const html=heading('FAMILY COMMUNICATION',role==='parent'?'Classroom teacher messages':'Family messages',
  'Talk with your child’s classroom team. These messages are visible to authorized school staff and linked guardians.')+
 (role==='parent'?'<div class="bp-parent-office-banner"><span>💌</span><div><strong>Need to write directly to School Administration?</strong><p>Use your separate private school-office inbox for fees, formal concerns or confidential questions. Classroom teachers cannot read it.</p></div>'+button('Message School Admin','bp-open-admin-from-messages','outline')+'</div>':'')+
 '<div class="bp-chat-layout"><div class="bp-chat-children"><h2>Children</h2>'+
 (students.length?students.map(s=>'<button type="button" class="bp-chat-child '+(s.id===active?'active':'')+'" data-chat-child="'+h(s.id)+'"><span class="mw-round-icon">'+initial(s.full_name)+'</span><b>'+h(s.full_name)+'</b><small>↗</small></button>').join(''):
 empty('♡','No child linked','An approved child connection is required to message.'))+'</div>'+
 '<section class="bp-chat-panel">'+
 '<div class="bp-chat-panel-head"><span>💬</span><div><b id="bp-chat-child-name">'+h(prettyName(students,active))+'</b><small>School & family conversation</small></div></div>'+
 '<div id="bp-thread">'+thread(active)+'</div>'+
 '<form id="bp-chat-form" class="bp-chat-composer"><label class="sr-only" for="bp-chat-body">Message</label><textarea id="bp-chat-body" placeholder="Write a message about your child…" maxlength="2000" required></textarea>'+
 button('Send ↗','bp-chat-send','primary','type="submit" '+(!students.length?'disabled':''))+'</form></section></div>';
 return{html,bind(){
  if(role==='parent')click('bp-open-admin-from-messages',()=>go('admin_inbox'));
  let selected=active;
  document.querySelectorAll('[data-chat-child]').forEach(b=>b.onclick=()=>{
   selected=b.dataset.chatChild;
   document.querySelectorAll('[data-chat-child]').forEach(x=>x.classList.toggle('active',x.dataset.chatChild===selected));
   document.getElementById('bp-chat-child-name').textContent=prettyName(students,selected);
   document.getElementById('bp-thread').innerHTML=thread(selected);
  });
  form('bp-chat-form',async()=>{
   if(!students.some(s=>s.id===selected))throw Error('Choose a child');
   await write(db,'bp_child_messages',{school_id:sid,student_id:selected,sender_user_id:user.id,body:v('bp-chat-body')});
   await reload();
  });
  const el=document.getElementById('bp-thread');if(el)el.scrollTop=el.scrollHeight;
 }};
}
