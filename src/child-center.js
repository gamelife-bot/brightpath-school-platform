import {schoolDay} from './school-day.js';
import {escapeHtml as e,dateLabel,initial,stat,box,empty,pill,field,input,select,textarea,button,heading,table,tr,option,read,write,update,form,notice,v,checked} from './workspace-core.js';

const DISPLAY_DATE=x=>x?new Date(x).toLocaleString('en-KE',{dateStyle:'medium',timeStyle:'short'}):'—';
const TODAY=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,16);
const TYPES={injury:'🩹 Injury',illness:'🌡️ Illness',behavior:'💛 Wellbeing / behaviour',safety:'🛟 Safety concern',other:'📋 Other'};
const SEVERITY={minor:'Minor',moderate:'Needs attention',urgent:'Urgent'};
function age(dob){
 if(!dob)return 'Age not recorded';
 const d=new Date(dob+'T12:00:00'),now=new Date();
 let y=now.getFullYear()-d.getFullYear(),m=now.getMonth()-d.getMonth();
 if(now.getDate()<d.getDate())m--;
 if(m<0){y--;m+=12}
 if(y<0)return 'Date needs review';
 return y===0?m+' months':y+' years'+(y<5?', '+m+' months':'');
}
export async function visibleChildren(ctx){
 const {db,schoolId:sid,role}=ctx;
 const children=await read(db,'bp_students',q=>q.eq('school_id',sid).order('full_name'));
 if(role==='school_admin')return children;
 if(role==='teacher'){
  const links=await read(db,'bp_teacher_classes',q=>q.eq('school_id',sid));
  const ids=new Set(links.map(a=>a.class_id));return children.filter(c=>ids.has(c.class_id));
 }
 if(role==='parent'){
  const links=await read(db,'bp_parent_links',q=>q.eq('school_id',sid));
  const ids=new Set(links.map(a=>a.student_id));return children.filter(c=>ids.has(c.id));
 }
 return [];
}
const childChoice=children=>'<option value="">Choose a child</option>'+children.map(c=>option(c.id,c.full_name)).join('');
const portrait=(child,details)=>'<span class="bp-profile-avatar" aria-hidden="true">'+initial(details?.preferred_name||child.full_name)+'<span>✦</span></span>';

export async function renderChildProfiles(ctx){
 const {db,schoolId:sid,user,role,reload,go}=ctx;
 const [children,details,classes]=await Promise.all([
   visibleChildren(ctx),
   read(db,'bp_child_details',q=>q.eq('school_id',sid)),
   read(db,'bp_classes',q=>q.eq('school_id',sid))
 ]);
 const known=new Map(details.map(d=>[d.student_id,d]));
 const query=new URLSearchParams(window.location.search).get('child');
 const selected=children.some(c=>c.id===query)?query:children[0]?.id||'';
 const card=(child)=>{
  const data=known.get(child.id);
  const klass=classes.find(c=>c.id===child.class_id)?.name||'Classroom not assigned';
  return '<button type="button" class="bp-child-select '+(selected===child.id?'active':'')+'" data-profile-child="'+e(child.id)+'">'+
   portrait(child,data)+'<span><strong>'+e(data?.preferred_name||child.full_name)+'</strong><small>'+e(klass)+' · '+e(age(data?.date_of_birth))+'</small></span><span aria-hidden="true">↗</span></button>';
 };
 const detailsView=(id)=>{
  const child=children.find(c=>c.id===id);if(!child)return empty('🧸','No child selected','Choose a child to see their profile.');
  const d=known.get(id),klass=classes.find(c=>c.id===child.class_id)?.name||'Unassigned';
  return '<div class="bp-profile-hero">'+portrait(child,d)+'<div><span class="bp-overline">MY BRIGHTPATH PROFILE</span><h2>'+e(child.full_name)+'</h2>'+
   '<p>'+e(klass)+' · '+e(age(d?.date_of_birth))+'</p><div class="bp-profile-tags">'+pill(child.photo_consent?'📸 Photos allowed':'📷 Photos off',child.photo_consent?'green':'neutral')+' '+pill(child.video_consent?'🎥 Videos allowed':'🎞️ Videos off',child.video_consent?'green':'neutral')+'</div></div></div>'+
   '<div class="bp-profile-info-grid">'+
    [['🎂','Birthday',d?.date_of_birth?dateLabel(d.date_of_birth):'Not recorded'],
     ['🧑','Preferred name',d?.preferred_name||'Not recorded'],
     ['📞','Emergency contact',d?.emergency_contact_name||'Not recorded'],
     ['☎️','Emergency phone',d?.emergency_contact_phone||'Not recorded'],
     ['🥗','Allergies & restrictions',d?.allergies||'None recorded — confirm with the family'],
     ['🌡️','Care / health notes',d?.medical_notes||'No notes recorded'],
     ['🧸','Comfort & daily routines',d?.care_instructions||'No preferences recorded']
    ].map(([ico,key,value])=>'<div class="bp-profile-info"><span>'+ico+'</span><div><small>'+key+'</small><strong>'+e(value)+'</strong></div></div>').join('')+'</div>'+
   (role==='parent'?'<p class="bp-private-hint">Need to correct an allergy or emergency contact? Send a message to the school. Staff verify and update official records.</p>':'')+
   (role==='teacher'?'<p class="bp-private-hint">Check these notes before activities, snacks or rest time. Ask the administrator to update any missing information.</p>':'');
 };
 const editForm=(id)=>{
  const child=children.find(c=>c.id===id),d=known.get(id);if(!child)return '';
  const value=x=>e(d?.[x]??'');
  return '<form id="bp-profile-form" class="mw-form">'+
   field('Full legal name',input('bp-full-name',child.full_name,'text','disabled value="'+e(child.full_name)+'"'))+
   field('Preferred name',input('bp-preferred','What this child likes to be called','text','maxlength="100" value="'+value('preferred_name')+'"'))+
   field('Date of birth','<input id="bp-birthday" type="date" max="'+schoolDay()+'" value="'+value('date_of_birth')+'">')+
   '<div class="bp-profile-form-pair">'+
    field('Emergency contact name',input('bp-emergency-name','Parent or trusted guardian','text','maxlength="140" value="'+value('emergency_contact_name')+'"'))+
    field('Emergency contact phone',input('bp-emergency-phone','e.g. +254…','tel','maxlength="40" value="'+value('emergency_contact_phone')+'"'))+'</div>'+
   field('Allergies & food restrictions',textarea('bp-allergies','List confirmed allergies or food restrictions; write "None reported" only if confirmed','maxlength="1500"'))+
   field('Health and care notes',textarea('bp-medical','Important care information supplied by the guardian (do not include unnecessary details)','maxlength="2000"'))+
   field('Comfort & daily routines',textarea('bp-instructions','Comfort items, sleep routines, toileting preferences…','maxlength="2000"'))+
   '<label class="mw-check-label"><input type="checkbox" id="bp-profile-verified" required><span>I have verified these details with the child’s parent or authorized guardian.</span></label>'+
   '<div class="mw-form-actions">'+button('Save child profile','bp-profile-save','primary','type="submit"')+'</div></form>';
 };
 const html=heading('CHILD-CENTRED CARE',role==='parent'?'My little ones':'Child profiles','A safe, personal view of each child’s needs, routines and happy milestones.')+
  '<div class="bp-profile-layout"><aside class="bp-profile-list"><div class="bp-profile-list-title">Children <span>'+children.length+'</span></div>'+
  (children.length?children.map(card).join(''):empty('🧸','No children yet','The school must enroll and link a child first.'))+
  (role==='school_admin'?'<div class="bp-profile-note">💛 Important: collect and verify emergency details before the child’s first day.</div>':'')+
  '</aside><section id="bp-profile-main" class="bp-profile-content">'+detailsView(selected)+'</section></div>'+
  (role==='school_admin'?box('Manage verified care details','<div class="bp-profile-edit-intro">Only school administrators can change these records. Parents and assigned teachers can view them.</div><div id="bp-profile-editor">'+editForm(selected)+'</div>'):'');
 return {html,bind(){
  const bindForm=()=>{
   if(role!=='school_admin')return;
   const record=known.get(selectedId);
   if(document.getElementById('bp-allergies'))document.getElementById('bp-allergies').value=record?.allergies||'';
   if(document.getElementById('bp-medical'))document.getElementById('bp-medical').value=record?.medical_notes||'';
   if(document.getElementById('bp-instructions'))document.getElementById('bp-instructions').value=record?.care_instructions||'';
   form('bp-profile-form',async()=>{
    if(!checked('bp-profile-verified'))throw Error('Confirm the parent or guardian has verified the details');
    if(!selectedId)throw Error('Choose a child');
    const dob=v('bp-birthday')||null;
    if(dob&&new Date(dob)>new Date())throw Error('Date of birth cannot be in the future');
    const payload={school_id:sid,student_id:selectedId,date_of_birth:dob,
     preferred_name:v('bp-preferred')||null,emergency_contact_name:v('bp-emergency-name')||null,
     emergency_contact_phone:v('bp-emergency-phone')||null,allergies:v('bp-allergies'),
     medical_notes:v('bp-medical'),care_instructions:v('bp-instructions'),updated_by:user.id,updated_at:new Date().toISOString()};
    if(known.has(selectedId))await update(db,'bp_child_details',payload,{school_id:sid,student_id:selectedId});
    else await write(db,'bp_child_details',payload);
    notice('Child profile saved');await reload();
   });
  };
  let selectedId=selected;
  const setChild=id=>{
   if(!children.some(c=>c.id===id))return;
   selectedId=id;
   const url=new URL(window.location.href);url.searchParams.set('child',id);
   history.replaceState(null,'',url.pathname+url.search);
   document.querySelectorAll('[data-profile-child]').forEach(x=>x.classList.toggle('active',x.dataset.profileChild===id));
   document.getElementById('bp-profile-main').innerHTML=detailsView(id);
   const editor=document.getElementById('bp-profile-editor');
   if(editor){editor.innerHTML=editForm(id);bindForm();}
  };
  document.querySelectorAll('[data-profile-child]').forEach(b=>b.onclick=()=>setChild(b.dataset.profileChild));
  bindForm();
 }};
}

export async function renderIncidents(ctx){
 const {db,schoolId:sid,user,role,reload}=ctx;
 const children=await visibleChildren(ctx),allow=new Set(children.map(c=>c.id));
 const events=(await read(db,'bp_incident_reports',q=>q.eq('school_id',sid).order('happened_at',{ascending:false}).limit(160))).filter(x=>allow.has(x.student_id));
 const isStaff=role!=='parent',admin=role==='school_admin';
 const byId=id=>children.find(c=>c.id===id)?.full_name||'Child';
 const html=heading('CARE & SAFETY','Health & incident reports','Private records of important care events, actions taken and follow-up.')+
 '<div class="mw-metrics">'+stat('Open reports',events.filter(x=>x.status==='open').length,'🩹','amber')+
 stat('Under review',events.filter(x=>x.status==='under_review').length,'🌡️','blue')+
 stat('Closed reports',events.filter(x=>x.status==='closed').length,'✓','teal')+'</div>'+
 (isStaff?'<div class="mw-two mw-two-side">'+box('Record a care incident',
 '<form class="mw-form" id="bp-incident-create">'+
  field('Child',select('bp-incident-child',childChoice(children),'required'))+
  field('What happened?',select('bp-incident-type',Object.entries(TYPES).map(([key,name])=>option(key,name)).join('')))+
  field('Attention level',select('bp-incident-severity','<option value="minor">Minor</option><option value="moderate">Needs attention</option><option value="urgent">Urgent — follow emergency procedure</option>'))+
  field('Date & time','<input type="datetime-local" id="bp-incident-time" required value="'+TODAY()+'">')+
  field('Factual description',textarea('bp-incident-details','What happened? Include the time, place, and observations. Avoid diagnosis.','required minlength="10" maxlength="3000"'))+
  field('Actions taken',textarea('bp-incident-actions','First aid or care provided and who was informed.','required minlength="5" maxlength="2500"'))+
  '<label class="mw-check-label"><input type="checkbox" id="bp-incident-contacted"><span>Parent or guardian has been contacted directly.</span></label>'+
  '<p class="bp-private-hint">Urgent cases require immediate emergency action and direct guardian contact. This form is not an emergency alert service.</p>'+
  '<div class="mw-form-actions">'+button('Save incident report','bp-incident-save','primary','type="submit" '+(!children.length?'disabled':''))+'</div></form>')+
 box('Safe incident handling','<div class="bp-care-safety-guide"><div>🩺 <b>Respond first</b><p>Follow your school’s health and emergency procedures before entering records.</p></div><div>📞 <b>Inform the guardian</b><p>For significant incidents, call an approved contact directly.</p></div><div>🔐 <b>Share privately</b><p>Only authorized staff and linked parents can access the child’s report.</p></div></div>')+'</div>':'')+
 box(role==='parent'?'Your child’s incident reports':'School incident register',
 events.length?'<div class="bp-incident-list">'+events.map(x=>
 '<article class="bp-incident-entry"><div class="bp-incident-heading"><div><span>'+e(TYPES[x.category]||x.category)+'</span><h3>'+e(byId(x.student_id))+'</h3><small>'+DISPLAY_DATE(x.happened_at)+'</small></div><div>'+pill(SEVERITY[x.severity],x.severity==='urgent'?'red':'amber')+' '+pill(x.status,x.status==='closed'?'green':'neutral')+'</div></div>'+
  '<div class="bp-incident-notes"><div><b>What happened</b><p>'+e(x.description)+'</p></div><div><b>Actions taken</b><p>'+e(x.action_taken)+'</p></div>'+
  (x.follow_up?'<div><b>Follow-up</b><p>'+e(x.follow_up)+'</p></div>':'')+'</div>'+
  '<div class="bp-incident-footer"><span>'+(x.parent_contacted?'☎ Guardian contacted':'⚠ Guardian contact not yet confirmed')+'</span>'+
  (admin?'<button type="button" class="mw-btn mw-btn-outline" data-incident-review="'+e(x.id)+'">Review / follow up</button>':'')+'</div>'+
  (admin?'<form class="bp-incident-review" data-incident-form="'+e(x.id)+'" hidden>'+
   field('Status',select('bp-incident-status-'+x.id,['open','under_review','closed'].map(z=>'<option value="'+z+'"'+(z===x.status?' selected':'')+'>'+z.replace('_',' ')+'</option>').join('')))+
   field('Follow-up notes',textarea('bp-incident-follow-'+x.id,'What has been done to resolve or monitor this?','maxlength="2000"'))+
   '<label class="mw-check-label"><input type="checkbox" id="bp-incident-parent-'+x.id+'"'+(x.parent_contacted?' checked':'')+'><span>Guardian contact is confirmed.</span></label>'+
   button('Save follow-up','bp-incident-update-'+x.id,'primary','type="submit"')+'</form>':'')+
 '</article>').join('')+'</div>':
 empty('🩺','No incidents recorded','Your safety register will show important care events when they occur.'));
 return {html,bind(){
  if(isStaff)form('bp-incident-create',async()=>{
   const child=v('bp-incident-child');if(!allow.has(child))throw Error('Select a child in your care');
   const when=new Date(v('bp-incident-time'));if(Number.isNaN(when.getTime())||when>Date.now()+5*60000)throw Error('Choose a valid incident date');
   await write(db,'bp_incident_reports',{school_id:sid,student_id:child,category:v('bp-incident-type'),
    severity:v('bp-incident-severity'),happened_at:when.toISOString(),description:v('bp-incident-details'),
    action_taken:v('bp-incident-actions'),parent_contacted:checked('bp-incident-contacted'),reported_by:user.id,status:'open'});
   await reload();
  });
  if(admin)events.forEach(x=>{
   const b=document.querySelector('[data-incident-review="'+x.id+'"]');
   if(b)b.onclick=()=>{const f=document.querySelector('[data-incident-form="'+x.id+'"]');f.hidden=!f.hidden;const area=document.getElementById('bp-incident-follow-'+x.id);if(area&&area.value==='')area.value=x.follow_up||'';};
   const f=document.querySelector('[data-incident-form="'+x.id+'"]');
   if(f)f.onsubmit=async ev=>{
    ev.preventDefault();const btn=f.querySelector('[type=submit]');btn.disabled=true;
    try{await update(db,'bp_incident_reports',{status:v('bp-incident-status-'+x.id),follow_up:v('bp-incident-follow-'+x.id),
      parent_contacted:checked('bp-incident-parent-'+x.id),reviewed_by:user.id,reviewed_at:new Date().toISOString()},{school_id:sid,id:x.id});
      notice('Follow-up saved');await reload();
    }catch(err){notice(err.message,'error');btn.disabled=false}
   };
  });
 }};
}
