import {schoolDay,getSchoolTimeZone} from './school-day.js';
import {escapeHtml as e,stat,box,empty,heading,pill,read,button,notice,dateLabel} from './workspace-core.js';

/**
 * Quiet Classroom is deliberately evidence-based, not a language model.
 * It never sends, creates or amends a child record on its own.
 * Family-ready recaps are assembled only from recorded school events.
 */
const localDay=(value)=>{try{return schoolDay(value)}catch{return ''}};
const clock=(value)=>new Intl.DateTimeFormat('en-KE',{timeZone:getSchoolTimeZone(),hour:'2-digit',minute:'2-digit'}).format(new Date(value));
const eventNames={meal:'Meal / snack',nap:'Rest / nap',diaper:'Nappy care',toilet:'Toilet care',mood:'Mood',play:'Play',other:'Care'};
const cap=(str,max)=>String(str||'').slice(0,max);
const onlyLinked=(items,ids)=>items.filter(item=>ids.has(item.student_id));
const safeText=(str)=>String(str||'').replace(/\s+/g,' ').trim();

export async function renderQuietClassroom(ctx){
 const {db,schoolId:sid,go}=ctx;
 const assignments=await read(db,'bp_teacher_classes',q=>q.eq('school_id',sid));
 const allowed=new Set(assignments.map(a=>a.class_id));
 const [classes,allStudents,attendance,care,media,milestones,pickup]=await Promise.all([
  read(db,'bp_classes',q=>q.eq('school_id',sid)),
  read(db,'bp_students',q=>q.eq('school_id',sid)),
  read(db,'bp_attendance',q=>q.eq('school_id',sid).order('attendance_date',{ascending:false}).limit(450)),
  read(db,'bp_care_logs',q=>q.eq('school_id',sid).order('occurred_at',{ascending:false}).limit(600)),
  read(db,'bp_child_media',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(300)),
  read(db,'bp_milestones',q=>q.eq('school_id',sid).order('observed_at',{ascending:false}).limit(300)),
  read(db,'bp_pickup_events',q=>q.eq('school_id',sid).order('occurred_at',{ascending:false}).limit(300))
 ]);
 const rooms=classes.filter(c=>allowed.has(c.id));
 const students=allStudents.filter(s=>allowed.has(s.class_id));
 const ids=new Set(students.map(s=>s.id));
 const now=localDay(new Date());
 const att=onlyLinked(attendance.filter(a=>a.attendance_date===now),ids);
 const careToday=onlyLinked(care.filter(x=>localDay(x.occurred_at)===now),ids);
 const photosToday=onlyLinked(media.filter(x=>x.status==='ready'&&localDay(x.created_at)===now),ids);
 const milestonesToday=onlyLinked(milestones.filter(x=>localDay(x.observed_at||x.created_at)===now),ids);
 const pickupToday=onlyLinked(pickup.filter(x=>localDay(x.occurred_at)===now),ids);
 const attBy=new Map(att.map(a=>[a.student_id,a]));
 const present=students.filter(s=>['present','late'].includes(attBy.get(s.id)?.status));
 const missing=students.filter(s=>!attBy.has(s.id));
 const withUpdates=new Set([...careToday,...photosToday,...milestonesToday].map(x=>x.student_id));
 const updatesCount=present.filter(s=>withUpdates.has(s.id)).length;
 const childInfo=(id)=>{
  const child=students.find(s=>s.id===id);
  if(!child)return null;
  const a=attBy.get(id);
  const logs=careToday.filter(x=>x.student_id===id).sort((x,y)=>new Date(x.occurred_at)-new Date(y.occurred_at));
  const images=photosToday.filter(x=>x.student_id===id);
  const observed=milestonesToday.filter(x=>x.student_id===id);
  const departures=pickupToday.filter(x=>x.student_id===id);
  const facts=[];
  if(a) facts.push('Attendance recorded as '+a.status+(a.note?' ('+safeText(cap(a.note,120))+')':'')+'.');
  else facts.push('Attendance not yet recorded.');
  for(const log of logs.slice(0,8)){
   const description=safeText(cap(log.details,160));
   facts.push((eventNames[log.event_type]||'Care')+' at '+clock(log.occurred_at)+': '+(description||safeText(log.event_value)||'An update was recorded')+'.');
  }
  for(const o of observed.slice(0,3))facts.push('Observed milestone: '+safeText(cap(o.title,125))+'.');
  if(images.length)facts.push(images.length+' private photo/video item'+(images.length===1?'':'s')+' added to the consent-checked school gallery.');
  if(departures.length)facts.push('School pickup/check-in event recorded.');
  return {child,a,logs,images,observed,departures,facts};
 };
 const drafts=students.map(s=>childInfo(s.id));
 const group=rooms.map(c=>'<option value="'+e(c.id)+'">'+e(c.name)+'</option>').join('');
 const html=heading('THE QUIET CLASSROOM','Your calm classroom assistant',
   'Real records in, useful updates out. No invented observations, no compulsory extra report, and nothing sent without you choosing to send it.')+
 '<div class="qc-banner"><div class="qc-mascot">✦<span>🌱</span></div><div class="qc-banner-text"><span>QUIET CLASSROOM · ASSISTED, NOT AUTONOMOUS</span>'+
 '<h2>Be present with the children.<br><em>We will organize the paperwork.</em></h2>'+
 '<p>This assistant works with attendance and updates already recorded by your school. It does not listen to the classroom, identify children from photos, or send their information to an external AI service.</p>'+
 '<div class="qc-banner-actions">'+button('Log one group activity','qc-group','primary')+button('View daily summaries','qc-daily','outline')+'</div></div><div class="qc-banner-stickers" aria-hidden="true"><span>☀️</span><span>🧸</span><span>🖍️</span></div></div>'+
 '<div class="mw-metrics">'+stat('My enrolled children',students.length,'🧸','teal')+
 stat('Attendance recorded',att.length+' / '+students.length,'📝','blue')+
 stat('Present children with updates',updatesCount+' / '+present.length,'💛','amber')+
 stat('Care entries today',careToday.length,'☀️','violet')+'</div>'+
 '<div class="qc-grid"><section class="qc-panel"><div class="qc-panel-title"><span>🧭</span><div><small>THE NEXT USEFUL ACTION</small><h2>Today’s tiny checklist</h2></div></div>'+
 '<p class="qc-understated">Only recorded facts are checked here. An optional photo or milestone never becomes a teacher obligation.</p>'+
 '<div class="qc-task"><span class="qc-task-symbol">'+(students.length&&missing.length===0?'✓':'1')+'</span><div><b>Attendance</b><p>'+(students.length?missing.length?missing.length+' child'+(missing.length===1?'':'ren')+' without a recorded status.':'All assigned children have an attendance status.':'Awaiting a classroom assignment.')+'</p></div>'+button('Open register','qc-att','outline')+'</div>'+
 '<div class="qc-task"><span class="qc-task-symbol">2</span><div><b>Group routine — only if it happened</b><p>Share snack, play, story or rest with participating children in one action.</p></div>'+button('Quick update','qc-group2','outline')+'</div>'+
 '<div class="qc-task"><span class="qc-task-symbol">3</span><div><b>See what families already have</b><p>'+updatesCount+' present child'+(updatesCount===1?'':'ren')+' with a care, media or milestone update today. No invented entries.</p></div>'+button('Preview','qc-preview','outline')+'</div>'+
 '<div class="qc-safe-note">🛡️ Nothing in this checklist posts automatically, and lack of an optional photo or milestone is not an error.</div></section>'+
 '<section class="qc-panel qc-chat"><div class="qc-panel-title"><span>✨</span><div><small>ASK QUIET CLASSROOM</small><h2>What do you need to know?</h2></div></div>'+
 '<div class="qc-assist-chips">'+
 '<button data-quiet-question="missing" type="button">Who needs attendance?</button>'+
 '<button data-quiet-question="day" type="button">What was recorded today?</button>'+
 '<button data-quiet-question="recap" type="button">Can I preview a family update?</button>'+
 '<button data-quiet-question="privacy" type="button">What is sent automatically?</button></div>'+
 '<div id="qc-answer" class="qc-answer" aria-live="polite"><span>🌻</span><p>Choose a question above. I will answer using your assigned classroom records only.</p></div>'+
 '<p class="qc-bot-disclosure">This is a rules-based assistant, not a generative AI chatbot. It cannot invent or certify observations.</p></section></div>'+
 box('Preview a child’s evidence-based daily note',
 '<p class="qc-understated">A private draft assembled only from existing records. You can copy it or go to the usual parent-message screen. <strong>No messages are sent by this preview.</strong></p>'+
 '<div class="qc-pickers"><label class="mw-field"><span>Classroom</span><select id="qc-class"><option value="all">All my classrooms</option>'+group+'</select></label>'+
 '<label class="mw-field"><span>Child</span><select id="qc-child">'+students.map(s=>'<option value="'+e(s.id)+'">'+e(s.full_name)+'</option>').join('')+'</select></label></div>'+
 '<div class="qc-evidence"><div class="qc-evidence-heading"><span>📔</span><div><b>Today at school</b><small>'+dateLabel(now)+' · Private draft · Not sent</small></div></div>'+
 '<p id="qc-preview-text" class="qc-preview-text"></p>'+
 '<div class="qc-evidence-actions">'+button('Copy this factual draft','qc-copy','primary','type="button"')+
 button('Open parent messages','qc-open-messages','outline','type="button"')+button('View full day diary','qc-open-day','outline','type="button"')+'</div></div>'+
 '<p class="qc-understated">Please verify factual accuracy, privacy and the intended recipient before sharing. Records entered earlier may still need correction.</p>')+
 '<div class="qc-principles"><article><span>🧡</span><b>Children before screens</b><p>No mandatory end-of-day essay. Routine updates are optional unless school policy requires them.</p></article>'+
 '<article><span>📝</span><b>One record, many views</b><p>The same confirmed entry feeds the parent diary and the existing daily summary.</p></article>'+
 '<article><span>🔒</span><b>Human decides</b><p>Only authorized staff can record care; only linked families can see their own child’s information.</p></article></div>';
 return {html,bind(){
  const draftBox=document.getElementById('qc-preview-text'),chosen=document.getElementById('qc-child'),classroom=document.getElementById('qc-class');
  const draft=()=>{
   const info=childInfo(chosen.value);
   if(!info)return 'No assigned children to preview.';
   return 'Daily record for '+info.child.full_name+' — '+dateLabel(now)+'\n'+
    info.facts.map(x=>'• '+x).join('\n')+
    '\n\nDraft based on school records. Please check the details before sharing.';
  };
  const draw=()=>{draftBox.textContent=draft()};
  classroom.onchange=()=>{
   const room=classroom.value,children=students.filter(s=>room==='all'||s.class_id===room);
   chosen.innerHTML=children.map(s=>'<option value="'+e(s.id)+'">'+e(s.full_name)+'</option>').join('');
   draw();
  };
  chosen.onchange=draw;draw();
  const respond=(key)=>{
   const answers={
    missing:missing.length?'Attendance not yet recorded for: '+missing.slice(0,12).map(s=>s.full_name).join(', ')+(missing.length>12?' and '+(missing.length-12)+' more.':''):'Everyone on your assigned roster has a recorded attendance status for today.',
    day:'Recorded today: '+att.length+' attendance statuses, '+careToday.length+' individual care entries, '+photosToday.length+' private media items and '+milestonesToday.length+' milestone observations for your assigned children. This is not a count of what actually happened outside the app.',
    recap:'Select a child below. The preview will summarize only school records entered today. It is not sent automatically.',
    privacy:'Quiet Classroom does not send any message, upload classroom audio, identify children from photos, or contact an external AI service. Only existing school actions and approved sharing rules apply.'
   };
   const answer=document.getElementById('qc-answer');
   answer.innerHTML='<span>✦</span><p>'+e(answers[key]||answers.privacy)+'</p>';
  };
  document.querySelectorAll('[data-quiet-question]').forEach(b=>b.onclick=()=>respond(b.dataset.quietQuestion));
  for(const [id,tab] of [['qc-att','attendance'],['qc-group','quickcare'],['qc-group2','quickcare'],['qc-daily','daily_summary'],['qc-open-messages','messages'],['qc-open-day','daily_summary']]){
   document.getElementById(id).onclick=()=>go(tab);
  }
  document.getElementById('qc-preview').onclick=()=>{document.getElementById('qc-preview-text').scrollIntoView({behavior:'smooth',block:'center'});respond('recap')};
  document.getElementById('qc-copy').onclick=async()=>{
   if(!chosen.value)return notice('Choose an assigned child','error');
   try{if(!navigator.clipboard?.writeText)throw Error('Clipboard unavailable. You can select and copy the preview text manually.');
    await navigator.clipboard.writeText(draft());notice('Factual draft copied. Review before sharing.');}
   catch(err){notice(err.message||'Could not copy','error')}
  };
 }};
}
