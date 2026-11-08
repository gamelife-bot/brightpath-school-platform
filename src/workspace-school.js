import {renderSignatures} from './signature-center.js';
import {renderFamilyFeedback} from './family-feedback.js';
import {renderGuardianChanges} from './guardian-requests.js';
import {renderPrivacyCenter} from './privacy-center.js';
import {renderStaffCoverage} from './staff-coverage.js';
import {renderMedicationSafety} from './medication-safety.js';
import {renderAdminInbox} from './family-office.js';
import {renderFamilyNotices} from './family-notices.js';
import {renderSchoolCalendar} from './school-calendar.js';
import {renderSchoolSetup} from './school-setup.js';
import {renderChildProfiles,renderIncidents} from './child-center.js';
import {renderNotifications,renderQuickCare,renderDailySummary} from './activity-hub.js';
import {welcomeArt} from './playful-art.js';
import {renderCareDiary,renderMilestones,renderChildMessages} from './daycare.js';
import {renderPickupDesk} from './daycare-pickup.js';
import {renderChildMoments} from './daycare-media.js';
import {renderSchoolApprovals} from './workspace-approvals.js';
import {escapeHtml as e,numberLabel as n,dateLabel,dollar,initial,stat,box,empty,pill,status,field,input,select,textarea,button,heading,table,tr,option,bar,read,write,update,rpc,result,form,click,notice,v,checked} from './workspace-core.js';

const today=()=>new Date().toLocaleDateString('en-CA');
const roleName={school_admin:'School administrator',teacher:'Teacher',parent:'Parent'};
const actions=(s)=>'<div class="mw-form-actions">'+s+'</div>';
function classOptions(classes){return '<option value="">Choose a class</option>'+classes.map(c=>option(c.id,c.name)).join('')}
function kidOptions(students){return '<option value="">Choose a student</option>'+students.map(k=>option(k.id,k.full_name)).join('')}
function userName(person,id){return person?.get(id)?.full_name||person?.get(id)?.email||'User'}
function findClass(classes,id){return classes.find(c=>c.id===id)?.name||'Class'}
const rowHelp=(t)=>'<p class="mw-fine">'+e(t)+'</p>';
function badgeProgress(steps){return '<div class="mw-checklist">'+steps.map(([ok,title,desc])=>
 '<div class="mw-check"><span class="'+(ok?'mw-checked':'')+'">'+(ok?'✓':'○')+'</span><div><b>'+e(title)+'</b><small>'+e(desc)+'</small></div></div>').join('')+'</div>'}
async function schoolData(db,sid){
 const [schools,classes,students,members,activities]=await Promise.all([
 read(db,'bp_schools',q=>q.eq('id',sid)),
 read(db,'bp_classes',q=>q.eq('school_id',sid).order('name')),
 read(db,'bp_students',q=>q.eq('school_id',sid).order('full_name')),
 read(db,'bp_memberships',q=>q.eq('school_id',sid)),
 read(db,'bp_activities',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(100))
 ]);
 return {school:schools[0],classes,students,members,activities};
}
export async function renderSchoolPage(ctx,tab){
 const {db,user,reload,go,schoolId:sid}=ctx;
 if(!sid)throw new Error('No school has been assigned to this account.');
 if(tab==='signatures')return renderSignatures(ctx);
 if(tab==='feedback')return renderFamilyFeedback(ctx);
 if(tab==='events')return renderSchoolCalendar(ctx);
 if(tab==='medications')return renderMedicationSafety(ctx);
 if(tab==='staffing')return renderStaffCoverage(ctx);
 if(tab==='guardian_changes')return renderGuardianChanges(ctx);
 if(tab==='privacy')return renderPrivacyCenter(ctx);

 if(tab==='admin_inbox')return renderAdminInbox(ctx);
 if(tab==='family_notices')return renderFamilyNotices(ctx);
 if(tab==='notifications')return renderNotifications(ctx);
 if(tab==='profiles')return renderChildProfiles(ctx);
 if(tab==='incidents')return renderIncidents(ctx);
 if(tab==='daily_summary')return renderDailySummary(ctx);
 if(tab==='quickcare')return renderQuickCare(ctx);
 if(tab==='setup')return renderSchoolSetup(ctx);
 if(tab==='care')return renderCareDiary(ctx);
 if(tab==='milestones')return renderMilestones(ctx);
 if(tab==='messages')return renderChildMessages(ctx);
 if(tab==='pickup')return renderPickupDesk(ctx);
 if(tab==='moments')return renderChildMoments(ctx);
 if(tab==='overview'){
  const {school,classes,students,members,activities}=await schoolData(db,sid);
  const attended=await read(db,'bp_attendance',q=>q.eq('school_id',sid).eq('attendance_date',today()));
  const careToday=await read(db,'bp_care_logs',q=>q.eq('school_id',sid).order('occurred_at',{ascending:false}).limit(100));
  const careCount=careToday.filter(x=>new Date(x.occurred_at).toDateString()===new Date().toDateString()).length;
  let approvalQueueError=null;
  const pendingRequests=await Promise.all(['teacher','parent'].map(role=>rpc(db,'bp_school_request_queue',{p_school:sid,p_role:role}).catch(async()=>{
   try{return await read(db,'bp_access_requests',q=>q.eq('school_id',sid).eq('requested_role',role))}
   catch(err){approvalQueueError=err;return []}
  }))).then(items=>items.flat().filter(r=>r.status==='pending'));
  const pendingTeachers=approvalQueueError?'—':pendingRequests.filter(r=>r.requested_role==='teacher').length;
  const pendingParents=approvalQueueError?'—':pendingRequests.filter(r=>r.requested_role==='parent').length;
  const teachers=members.filter(m=>m.active&&m.role==='teacher').length;
  const [officeMessages,familyNotices]=await Promise.all([
   read(db,'bp_admin_conversations',q=>q.eq('school_id',sid).eq('status','open').limit(200)).catch(()=>[]),
   read(db,'bp_family_notices',q=>q.eq('school_id',sid).eq('status','submitted').limit(200)).catch(()=>[])
  ]);
  const html=heading('DAYCARE OPERATIONS',school?.name||'Your school','Care, classrooms, families and your team — everything in one organized place.')+
   '<div class="mw-metrics">'+stat('Enrolled students',n(students.length),'🎒','teal')+stat('Classes',n(classes.length),'📚','blue')+
   stat('Active teachers',n(teachers),'👩‍🏫','amber')+stat('Care notes today',careCount,'☀','violet')+'</div>'+
   '<div class="mw-welcome mw-welcome-school"><div><span class="mw-welcome-kicker">YOUR SCHOOL WORKSPACE</span><h2>Make every school day count</h2><p>Coordinate early-years classrooms, daily care, parent updates and safe pickup in one place.</p>'+button('Enroll a child ↗','mw-quick-enroll','light')+button('School setup','mw-quick-setup','light')+'</div><div class="mw-welcome-art">'+welcomeArt('school')+'</div></div>'+
   (approvalQueueError?'<div class="mw-inline mw-inline-error">Approval requests could not be loaded. The rest of your school workspace is still available. Try refreshing.</div>':'')+
   '<div class="mw-two mw-approval-overview">'+box('Teacher approvals', '<div class="mw-approval-overview-count">'+pendingTeachers+'</div><p class="mw-fine">Pending teacher access requests</p>'+button('Review teacher requests','mw-review-teachers','outline'))+box('Parent approvals','<div class="mw-approval-overview-count">'+pendingParents+'</div><p class="mw-fine">Pending parent access requests</p>'+button('Review parent requests','mw-review-parents','outline'))+'</div>'+
   '<div class="bp-admin-communication"><div><span>💌</span><div><b>'+officeMessages.length+' open parent conversation'+(officeMessages.length===1?'':'s')+'</b><small>Private questions for School Administration</small></div>'+button('Open inbox','mw-open-admin-inbox','outline')+'</div><div><span>📮</span><div><b>'+familyNotices.length+' parent notice'+(familyNotices.length===1?'':'s')+' awaiting review</b><small>Absences, arrivals and care changes</small></div>'+button('Review notices','mw-open-family-notices','outline')+'</div></div>'+
   '<div class="mw-section-title"><h2>Manage your school</h2><span>Quick actions</span></div><div class="mw-actions-grid">'+[
    ['Parent administration inbox','admin_inbox','💌'],['Parent day notices','family_notices','📮'],['Family signatures','signatures','✍️'],['Parent surveys & reviews','feedback','💛'],['School calendar','events','🗓️'],['Staff shifts & ratios','staffing','🍎'],['Medication safety','medications','💊'],['Guardian requests','guardian_changes','👨‍👩‍👧'],['Privacy center','privacy','🛡️'],['Child profiles','profiles','🧸'],['Quick classroom updates','quickcare','✨'],['Safe pickup desk','pickup','👋'],['Approve teachers','teachers','👩‍🏫'],['Approve parents','parents','💛']
   ].map(([t,p,i])=>'<button class="mw-action" type="button" data-goto="'+p+'"><span>'+i+'</span><b>'+t+'</b><small>Open workspace</small><i>↗</i></button>').join('')+'</div>'+
   '<div class="mw-two">'+box('School setup',
    badgeProgress([[classes.length>0,'Create your first class','Organize classrooms'],
      [students.length>0,'Enroll students','Start school records'],
      [teachers>0,'Approve and assign teachers','Connect your team'],
      [members.some(m=>m.active&&m.role==='parent'),'Link parent accounts','Connect families']]))+
    box('This school day',
     '<div class="mw-daily"><div><strong>'+n(attended.filter(a=>a.status==='present').length)+'</strong><span>Present today</span></div><div><strong>'+n(attended.filter(a=>a.status==='absent').length)+'</strong><span>Absent today</span></div><div><strong>'+n(attended.filter(a=>a.status==='late').length)+'</strong><span>Late arrivals</span></div></div>'+
     '<div class="mw-form-actions">'+button('View attendance','mw-view-attendance','outline')+'</div>')+'</div>'+
   box('Latest care moments',careToday.length?table(['Child','Care activity','Observation','When'],careToday.slice(0,8).map(log=>tr([e(students.find(k=>k.id===log.student_id)?.full_name||'Child'),e(log.event_type),e(log.details),dateLabel(log.occurred_at)]))):empty('☀️','Today’s care diary is ready','Staff can record snacks, naps, moods and playtime from the Daily care or Quick group updates sections.'));
  return{html,bind(){
   click('mw-quick-setup',()=>go('setup'));click('mw-open-admin-inbox',()=>go('admin_inbox'));click('mw-open-family-notices',()=>go('family_notices'));click('mw-quick-enroll',()=>go('students'));click('mw-view-attendance',()=>go('attendance'));click('mw-review-teachers',()=>go('teachers'));click('mw-review-parents',()=>go('parents'));
   document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>go(b.dataset.goto));
  }};
 }
 if(tab==='classes'){
  const {classes,students,members}=await schoolData(db,sid);
  const teacherClasses=await read(db,'bp_teacher_classes',q=>q.eq('school_id',sid));
  const teachers=new Set(teacherClasses.map(t=>t.teacher_user_id));
  const profiles=await read(db,'bp_profiles');
  const names=new Map(profiles.map(p=>[p.user_id,p.full_name]));
  const html=heading('ROOMS & CLASSES','Classes and daycare rooms','Organize children into their daycare rooms and assign teachers.')+
   '<div class="mw-two mw-two-side">'+box('Create class / room',
    '<form id="mw-class-form" class="mw-form">'+field('Class name',input('mw-class-name','e.g. Baby Room, Toddlers, Nursery A','text','required minlength="2" maxlength="100"'))+
    actions(button('Create class / room','mw-class-create','primary','type="submit"'))+'</form>')+
    box('Class overview','<div class="mw-split-stats"><div><strong>'+n(classes.length)+'</strong><small>Classes</small></div><div><strong>'+n(students.length)+'</strong><small>Students</small></div></div>'+
     rowHelp('Teachers can only access students in classrooms assigned to them.'))+'</div>'+
   box('All classrooms',classes.length?table(['Class','Enrollment','Assigned teachers','Open'],classes.map(c=>tr([
    '<b>'+e(c.name)+'</b>',n(students.filter(k=>k.class_id===c.id).length),
    e(teacherClasses.filter(tc=>tc.class_id===c.id).map(tc=>names.get(tc.teacher_user_id)||'Assigned teacher').join(', ')||'Not assigned'),
    button('Manage','mw-go-staff-'+c.id,'outline','data-assign-class="'+e(c.id)+'"')
   ]))):empty('📚','No classes created','Add your first class above to begin student enrollment.'));
  return{html,bind(){
   form('mw-class-form',async()=>{await write(db,'bp_classes',{school_id:sid,name:v('mw-class-name')});await reload()});
   document.querySelectorAll('[data-assign-class]').forEach(b=>b.onclick=()=>go('people'));
  }};
 }
 if(tab==='students'){
  const {classes,students,activities}=await schoolData(db,sid);
  const noClasses=classes.length===0;
  const html=heading('DAYCARE ENROLLMENT','Children & enrollment','Create a class or daycare room, then register children into it.')+
   '<div class="mw-metrics">'+
    stat('Classes & rooms',n(classes.length),'📚','teal')+
    stat('Enrolled children',n(students.length),'🎒','blue')+
    stat('Photo permissions',n(students.filter(s=>s.photo_consent).length),'📷','amber')+
    stat('Video permissions',n(students.filter(s=>s.video_consent).length),'🎬','violet')+'</div>'+
   (noClasses?'<div class="bp-class-setup-alert" id="mw-class-setup-alert"><span>🏫</span><div><strong>Start by creating your first class or daycare room</strong><p>Once saved, it will immediately appear in the Class dropdown for enrolling children.</p></div></div>':'')+
   '<div class="mw-two mw-two-side">'+box('1. Create a class or room',
     '<form id="mw-enroll-class-form" class="mw-form">'+
       field('Class / daycare room name',input('mw-enroll-class-name','e.g. Toddlers, Nursery A or Preschool','text','required minlength="2" maxlength="100"'))+
       '<div class="bp-room-ideas"><small>Examples:</small><button type="button" data-room-name="Baby Room">Baby Room</button><button type="button" data-room-name="Toddlers">Toddlers</button><button type="button" data-room-name="Nursery">Nursery</button><button type="button" data-room-name="Preschool">Preschool</button></div>'+
       '<div id="mw-enroll-class-result" role="status" aria-live="polite"></div>'+
       actions(button('Create class / room','mw-enroll-class-save','primary','type="submit"'))+'</form>'+rowHelp('Class names are specific to your school. Add as many rooms as you need.'))+
   box('2. Enroll a child',
     '<form id="mw-enroll-form" class="mw-form">'+field('Child’s full name',input('mw-kid-name','Full name','text','required minlength="2" maxlength="160"'))+
     field('Assign to class / room',select('mw-kid-class',classOptions(classes),'required'))+
     '<div id="mw-class-help" class="mw-form-tip" '+(noClasses?'':'hidden')+'>Create a class or room using the form on this page first.</div>'+
     '<label class="mw-check-label"><input type="checkbox" id="mw-kid-permission" required><span>I confirm the parent or guardian authorized processing of this child’s school records and the school holds that authorization.</span></label>'+
     actions(button('Enroll child','mw-enroll-submit','primary','type="submit" '+(noClasses?'disabled':'')))+'</form>')+'</div>'+
   box('Enrolled children',students.length?'<div class="mw-filter-row">'+input('mw-kid-search','Search children or classes')+'</div><div id="mw-kid-table">'+
    table(['Child','Room','Photo','Video','Activities','Permissions'],students.map(s=>tr([
     '<span class="mw-identity"><span class="mw-round-icon">'+initial(s.full_name)+'</span><b>'+e(s.full_name)+'</b></span>',
     '<select class="mw-inline-select" data-move-student="'+e(s.id)+'" aria-label="Move child to class">'+classes.map(c=>'<option value="'+e(c.id)+'" '+(c.id===s.class_id?'selected':'')+'>'+e(c.name)+'</option>').join('')+'</select>',
     status(s.photo_consent?'approved':'not recorded'),status(s.video_consent?'approved':'not recorded'),n(activities.filter(a=>a.student_id===s.id).length),
     '<div class="bp-consent-actions">'+button(s.photo_consent?'Revoke photos':'Allow photos','mw-consent-'+s.id,s.photo_consent?'danger':'outline','data-photo-student="'+e(s.id)+'" data-photo-next="'+(!s.photo_consent)+'"')+
      button(s.video_consent?'Revoke videos':'Allow videos','mw-video-'+s.id,s.video_consent?'danger':'outline','data-video-student="'+e(s.id)+'" data-video-next="'+(!s.video_consent)+'"')+'</div>'
    ])))+'</div>':empty('🎒','No children enrolled yet','Create a class or room, then use the enrollment form above.'));
  return{html,bind(){
   document.querySelectorAll('[data-room-name]').forEach(b=>b.onclick=()=>{
    document.getElementById('mw-enroll-class-name').value=b.dataset.roomName;
    document.getElementById('mw-enroll-class-name').focus();
   });
   form('mw-enroll-class-form',async()=>{
    const name=v('mw-enroll-class-name').replace(/\s+/g,' ').trim();
    if(name.length<2)throw Error('Enter a class or room name');
    const existing=await read(db,'bp_classes',q=>q.eq('school_id',sid).order('name'));
    if(existing.some(c=>c.name.trim().toLowerCase()===name.toLowerCase()))throw Error('This class or room already exists');
    await write(db,'bp_classes',{school_id:sid,name});
    const updated=await read(db,'bp_classes',q=>q.eq('school_id',sid).order('name'));
    const created=updated.find(c=>c.name.trim().toLowerCase()===name.toLowerCase());
    if(!created)throw Error('Class could not be confirmed. Refresh to check before trying again.');
    const dropdown=document.getElementById('mw-kid-class');
    dropdown.innerHTML=classOptions(updated);
    dropdown.value=created.id;
    document.getElementById('mw-enroll-submit').disabled=false;
    document.getElementById('mw-class-help').hidden=true;
    const alert=document.getElementById('mw-class-setup-alert');if(alert)alert.hidden=true;
    const total=document.querySelector('.mw-metrics .mw-stat:first-child > strong');if(total)total.textContent=n(updated.length);
    document.getElementById('mw-enroll-class-name').value='';
    document.getElementById('mw-enroll-class-result').innerHTML='<div class="mw-inline mw-inline-info">'+e(name)+' created. It is now selected in the enrollment form.</div>';
   });
   form('mw-enroll-form',async()=>{
    if(!checked('mw-kid-permission'))throw Error('Guardian authorization is required');
    await write(db,'bp_students',{school_id:sid,class_id:v('mw-kid-class'),full_name:v('mw-kid-name'),guardian_processing_consent_confirmed:true});
    await reload();
   });
   document.querySelectorAll('[data-move-student]').forEach(s=>s.onchange=async()=>{
    if(!confirm('Move this student to the selected class?')){await reload();return}
    try{await update(db,'bp_students',{class_id:s.value},{id:s.dataset.moveStudent,school_id:sid});notice('Class updated');await reload()}catch(err){notice(err.message,'error')}
   });
   document.querySelectorAll('[data-video-student]').forEach(b=>b.onclick=async()=>{
    const enabled=b.dataset.videoNext==='true';
    if(!confirm(enabled?'Confirm written guardian consent to share short videos of this child?':'Withdraw video-sharing permission for this child?'))return;
    try{await update(db,'bp_students',{video_consent:enabled},{id:b.dataset.videoStudent,school_id:sid});notice('Video permissions updated');await reload()}catch(err){notice(err.message,'error')}
   });
   document.querySelectorAll('[data-photo-student]').forEach(b=>b.onclick=async()=>{
    const enabled=b.dataset.photoNext==='true';
    if(!confirm(enabled?'Confirm guardian photo consent has been obtained and documented?':'Revoke photo-sharing permission for this student?'))return;
    try{await update(db,'bp_students',{photo_consent:enabled},{id:b.dataset.photoStudent,school_id:sid});notice('Photo permissions updated');await reload()}catch(err){notice(err.message,'error')}
   });
   const f=document.getElementById('mw-kid-search');if(f)f.oninput=()=>{
    const term=f.value.toLowerCase();document.querySelectorAll('#mw-kid-table tbody tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(term));
   };
  }};
 }
 if(tab==='teachers')return await renderSchoolApprovals(ctx,'teacher');
 if(tab==='parents')return await renderSchoolApprovals(ctx,'parent');
 if(tab==='people'){
  const {classes,members}=await schoolData(db,sid);
  const [profiles,teacherClasses]=await Promise.all([read(db,'bp_profiles'),read(db,'bp_teacher_classes',q=>q.eq('school_id',sid))]);
  const names=new Map(profiles.map(p=>[p.user_id,p]));
  const html=heading('SCHOOL ACCOUNTS','Staff and access','Approve staff accounts, assign teaching classes and manage permissions.')+
   '<div class="mw-metrics">'+stat('Teachers',members.filter(m=>m.role==='teacher'&&m.active).length,'👩‍🏫','teal')+
   stat('Parents',members.filter(m=>m.role==='parent'&&m.active).length,'💛','blue')+
   stat('Administrators',members.filter(m=>m.role==='school_admin'&&m.active).length,'🔑','amber')+'</div>'+
   '<div class="mw-two">'+box('Approve a user',
    '<form id="mw-grant-role" class="mw-form">'+field('Registered email',input('mw-role-email','person@email.com','email','required'))+
    field('Account type',select('mw-role-kind','<option value="teacher">Teacher</option><option value="parent">Parent</option>'))+
    rowHelp('Users must register and verify their email before approval.')+
    actions(button('Approve account','mw-role-submit','primary','type="submit"'))+'</form>')+
   box('Assign teacher to class','<form id="mw-assign-teacher" class="mw-form">'+
    field('Teacher email',input('mw-teacher-email','teacher@school.edu','email','required'))+
    field('Class',select('mw-class-select',classOptions(classes),'required'))+
    actions(button('Assign teacher','mw-teacher-submit','primary','type="submit" '+(!classes.length?'disabled':'')))+'</form>')+'</div>'+
   box('Approved members',members.length?table(['Person','Role','Status','Assigned classes','Action'],members.map(m=>{
    const person=names.get(m.user_id);
    const assigned=teacherClasses.filter(t=>t.teacher_user_id===m.user_id).map(t=>classes.find(c=>c.id===t.class_id)?.name).filter(Boolean);
    return tr(['<span class="mw-identity"><span class="mw-round-icon">'+initial(person?.full_name||'U')+'</span><span><b>'+e(person?.full_name||'Member')+'</b><small>'+e(person?.email||'')+'</small></span></span>',
     e(roleName[m.role]||m.role),pill(m.active?'Active':'Disabled',m.active?'green':'neutral'),e(assigned.join(', ')||'—'),
     m.active&&m.role!=='school_admin'?button('Deactivate','mw-user-'+m.user_id,'danger','data-revoke="'+e(m.user_id)+'"'):'—']);
   })):empty('👥','No team members assigned','Start by approving a teacher or parent.'));
  return{html,bind(){
   form('mw-grant-role',async()=>{await rpc(db,'bp_grant_role',{p_school:sid,p_email:v('mw-role-email'),p_role:v('mw-role-kind')});await reload()});
   form('mw-assign-teacher',async()=>{await rpc(db,'bp_assign_teacher',{p_school:sid,p_email:v('mw-teacher-email'),p_class:v('mw-class-select')});await reload()});
   document.querySelectorAll('[data-revoke]').forEach(b=>b.onclick=async()=>{if(!confirm('Deactivate this account’s school access?'))return;try{await rpc(db,'bp_revoke_member',{p_school:sid,p_user_id:b.dataset.revoke});notice('Access deactivated');await reload()}catch(err){notice(err.message,'error')}});
  }};
 }
 if(tab==='families'){
  const {students,classes,members}=await schoolData(db,sid);
  const [links,profiles]=await Promise.all([read(db,'bp_parent_links',q=>q.eq('school_id',sid)),read(db,'bp_profiles')]);
  const names=new Map(profiles.map(p=>[p.user_id,p]));
  const html=heading('FAMILY CONNECTIONS','Parents and guardians','Link verified family accounts to the correct children.')+
   '<div class="mw-metrics">'+stat('Approved parents',members.filter(m=>m.role==='parent'&&m.active).length,'💛','teal')+
   stat('Family connections',links.length,'↗','blue')+
   stat('Unlinked students',students.filter(s=>!links.some(l=>l.student_id===s.id)).length,'🎒','amber')+'</div>'+
   '<div class="mw-two mw-two-side">'+box('Link a guardian',
    '<form id="mw-parent-link-form" class="mw-form">'+field('Verified parent email',input('mw-parent-email','parent@email.com','email','required'))+
    field('Student',select('mw-parent-student',kidOptions(students),'required'))+
    '<label class="mw-check-label"><input id="mw-guardian-verified" type="checkbox" required><span>I have confirmed this guardian’s identity and their relationship to the student.</span></label>'+
    field('Independent verification record',textarea('mw-guardian-proof','Record verification method and date. Do not enter ID numbers or upload identity documents here.','required minlength="12" maxlength="700"'))+
    actions(button('Link account','mw-parent-link-submit','primary','type="submit" '+(!students.length?'disabled':'')))+'</form>')+
   box('Account setup',badgeProgress([[members.some(m=>m.role==='parent'&&m.active),'Approve parent account','In Parent approvals'],[students.length>0,'Enroll student','In Students'],[links.length>0,'Connect family','Link the guardian here']])+
     '<div class="mw-form-actions">'+button('Open Parent approvals ↗','mw-go-members','outline')+'</div>')+'</div>'+
   box('Linked families',links.length?table(['Student','Class','Guardian','Verified','Manage'],links.map(l=>{
    const s=students.find(k=>k.id===l.student_id),p=names.get(l.parent_user_id);
    return tr([e(s?.full_name||'Student'),e(findClass(classes,s?.class_id)),
      '<b>'+e(p?.full_name||'Parent')+'</b><br><small>'+e(p?.email||'')+'</small>',dateLabel(l.verified_at),
      (links.filter(x=>x.student_id===l.student_id).length<=1?pill('Last verified guardian','amber'):button('Unlink','mw-unlink-'+l.student_id,'danger','data-unlink-student="'+e(l.student_id)+'" data-unlink-parent="'+e(l.parent_user_id)+'"'))]);
   })):empty('♡','Family connections will appear here','Each verified guardian will be linked to their own child.'))+
   '<form id="mw-unlink-confirm" class="mw-form bp-unlink-verify" hidden><h3>Verify guardian access removal</h3><p id="mw-unlink-target">A school administrator must independently verify and document this change.</p>'+ 
   field('Independent verification reference',textarea('mw-unlink-proof','Why and how was this guardian access change authorized?','required minlength="12" maxlength="700"'))+
   '<label class="mw-check-label"><input type="checkbox" id="mw-unlink-checked" required><span>I verified the request and confirmed that another authorized guardian remains linked to the child.</span></label>'+ 
   '<div class="bp-review-actions">'+button('Confirm access removal','mw-unlink-do','danger','type="submit"')+button('Cancel','mw-unlink-cancel','outline','type="button"')+'</div></form>';
  return{html,bind(){
   form('mw-parent-link-form',async()=>{
    if(!checked('mw-guardian-verified'))throw Error('Please verify the guardian first');
    await rpc(db,'bp_verified_link_parent',{p_school:sid,p_email:v('mw-parent-email'),p_student:v('mw-parent-student'),p_verification_ref:v('mw-guardian-proof')});await reload();
   });
   click('mw-go-members',()=>go('parents'));
   let selectedLink=null;
   document.querySelectorAll('[data-unlink-student]').forEach(b=>b.onclick=()=>{
    selectedLink={student:b.dataset.unlinkStudent,parent:b.dataset.unlinkParent};
    const panel=document.getElementById('mw-unlink-confirm');panel.hidden=false;
    document.getElementById('mw-unlink-proof').value='';document.getElementById('mw-unlink-checked').checked=false;
    document.getElementById('mw-unlink-target').textContent='Review the removal for '+(students.find(s=>s.id===selectedLink.student)?.full_name||'this child')+'. A replacement guardian must remain linked.';
    panel.scrollIntoView({behavior:'smooth',block:'center'});
   });
   click('mw-unlink-cancel',()=>{document.getElementById('mw-unlink-confirm').hidden=true;selectedLink=null});
   form('mw-unlink-confirm',async()=>{
    if(!selectedLink||!checked('mw-unlink-checked')||v('mw-unlink-proof').length<12)throw Error('Independent verification required');
    if(!confirm('Remove this verified guardian’s access to the child’s private information?'))return;
    const r=await rpc(db,'bp_verified_unlink_parent',{p_school:sid,p_student:selectedLink.student,p_parent_id:selectedLink.parent,p_verification_ref:v('mw-unlink-proof')});
    if(!r.ok)throw Error('Guardian access revocation was not confirmed');notice('Guardian link removed and audited');await reload();
   });
  }};
 }
 if(tab==='attendance'){
  return await renderSchoolAttendance(ctx);
 }
 if(tab==='activities'){
  const {students,classes,activities}=await schoolData(db,sid);
  const mean=activities.length?Math.round(activities.reduce((sum,a)=>sum+Number(a.score),0)/activities.length):null;
  const html=heading('ACADEMIC REPORTS','Learning reports','Monitor activity scores and teacher observations.')+
   '<div class="mw-metrics">'+stat('Recent assessments',activities.length,'✎','teal')+
   stat('Average score',mean===null?'—':mean+'%','◈','blue')+
   stat('Participating students',new Set(activities.map(a=>a.student_id)).size,'🎓','violet')+'</div>'+
   box('Recent classroom assessments',
    activities.length?'<div class="mw-filter-row">'+input('mw-activity-search','Search activities and subjects')+'</div><div id="mw-activities-table">'+
    table(['Student','Subject','Activity','Score','Date'],activities.map(a=>tr([
     e(students.find(s=>s.id===a.student_id)?.full_name||'Student'),e(a.subject),
     '<b>'+e(a.title)+'</b>',pill(a.score+'%','green'),dateLabel(a.created_at)
    ])))+'</div>':empty('📊','No learning reports yet','Teachers will publish assessments through their own portal.'));
  return{html,bind(){
   const f=document.getElementById('mw-activity-search');if(f)f.oninput=()=>{
    const term=f.value.toLowerCase();document.querySelectorAll('#mw-activities-table tbody tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(term));
   };
  }};
 }
 if(tab==='announcements'){
  const announcements=await read(db,'bp_announcements',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(100));
  const html=heading('COMMUNICATIONS','School announcements','Publish updates for your families, teachers or the whole school.')+
   '<div class="mw-two mw-two-side">'+box('Write an announcement',
    '<form id="mw-announcement-form" class="mw-form">'+field('Title',input('mw-notice-title','e.g. Sports day schedule','text','required minlength="3" maxlength="160"'))+
    field('Message',textarea('mw-notice-body','Write your update…','required minlength="3" maxlength="4000"'))+
    field('Audience',select('mw-notice-audience','<option value="all">Everyone</option><option value="parents">Parents</option><option value="teachers">Teachers</option>'))+
    actions(button('Publish announcement','mw-announcement-submit','primary','type="submit"'))+'</form>')+
   box('Communication overview','<div class="mw-split-stats"><div><strong>'+announcements.length+'</strong><small>Announcements</small></div><div><strong>'+announcements.filter(a=>a.is_published).length+'</strong><small>Published</small></div></div>'+
    rowHelp('Announcements appear only in authorized school accounts.'))+'</div>'+
   box('Previous announcements',announcements.length?
    '<div class="mw-ticket-list">'+announcements.map(a=>'<article class="mw-notice-entry"><div class="mw-line-between"><div><strong>'+e(a.title)+'</strong><small>'+dateLabel(a.created_at)+' · '+e(a.audience)+'</small></div>'+
    '<div>'+status(a.is_published?'active':'suspended')+' '+button(a.is_published?'Unpublish':'Publish','mw-toggle-'+a.id,'outline','data-toggle-notice="'+e(a.id)+'" data-published="'+(!a.is_published)+'"')+'</div></div><p>'+e(a.body)+'</p></article>').join('')+'</div>':
    empty('📣','No announcements yet','Share your school’s first update above.'));
  return{html,bind(){
   form('mw-announcement-form',async()=>{
    await write(db,'bp_announcements',{school_id:sid,title:v('mw-notice-title'),body:v('mw-notice-body'),audience:v('mw-notice-audience'),created_by:user.id,is_published:true});await reload();
   });
   document.querySelectorAll('[data-toggle-notice]').forEach(b=>b.onclick=async()=>{
    try{await update(db,'bp_announcements',{is_published:b.dataset.published==='true'},{id:b.dataset.toggleNotice,school_id:sid});notice('Announcement updated');await reload()}catch(err){notice(err.message,'error')}
   });
  }};
 }
 if(tab==='billing'){
  return {html:heading('PARTNER FINANCES','Subscriptions and earnings','Your school plans, requests and Parent Plus revenue share.')+'<div id="mw-billing-mount"></div>',async bind(){
   const {renderSchoolBilling}=await import('./billing.js');await renderSchoolBilling(db,sid,user);
  }};
 }
 if(tab==='settings'){
  const {school}=await schoolData(db,sid);
  const records=await read(db,'bp_school_settings',q=>q.eq('school_id',sid));
  const settings=records[0]||{};
  const html=heading('SCHOOL PROFILE','School settings','Keep your school contact details and academic term up to date.')+
   '<div class="mw-two mw-two-side">'+box('School information','<div class="mw-setting-name">🏫 '+e(school?.name||'School')+'</div><div class="mw-setting-lines"><div>School status '+status(school?.status)+'</div><div>Created '+dateLabel(school?.created_at)+'</div></div>')+
   box('Contact and academic details','<form id="mw-settings-form" class="mw-form">'+
    field('Contact email','<input id="mw-school-contact-email" type="email" maxlength="160" value="'+e(settings.contact_email||'')+'" placeholder="office@school.edu">')+
    field('Telephone','<input id="mw-school-phone" maxlength="35" value="'+e(settings.contact_phone||'')+'" placeholder="+254…">')+
    field('School address','<textarea id="mw-school-address" maxlength="240" placeholder="School location">'+e(settings.school_address||'')+'</textarea>')+
    field('Academic term','<input id="mw-school-term" maxlength="100" value="'+e(settings.academic_term||'')+'" placeholder="e.g. Term 1, 2027">')+
    actions(button('Save school details','mw-settings-submit','primary','type="submit"'))+'</form>')+'</div>';
  return{html,bind(){
   form('mw-settings-form',async()=>{
    const payload={school_id:sid,contact_email:v('mw-school-contact-email')||null,contact_phone:v('mw-school-phone')||null,school_address:v('mw-school-address')||null,academic_term:v('mw-school-term')||null,updated_at:new Date().toISOString()};
    result(await db.from('bp_school_settings').upsert(payload,{onConflict:'school_id'}));await reload();
   });
  }};
 }
 if(tab==='support'){
  const tickets=await read(db,'bp_support_tickets',q=>q.eq('school_id',sid).order('created_at',{ascending:false}));
  const html=heading('HELP DESK','BrightPath support','Reach the platform team about account, school or subscription matters.')+
   '<div class="mw-two mw-two-side">'+box('New support request',
    '<form id="mw-support-form" class="mw-form">'+field('Subject',input('mw-support-subject','What can we help with?','text','minlength="5" maxlength="160" required'))+
    field('Your message',textarea('mw-support-details','Describe the issue…','minlength="10" maxlength="3000" required'))+
    actions(button('Submit support request','mw-support-submit','primary','type="submit"'))+'</form>')+
   box('Support status','<div class="mw-split-stats"><div><strong>'+tickets.filter(t=>t.status!=='resolved').length+'</strong><small>Open requests</small></div><div><strong>'+tickets.filter(t=>t.status==='resolved').length+'</strong><small>Resolved</small></div></div>')+'</div>'+
   box('Your requests',tickets.length?'<div class="mw-ticket-list">'+tickets.map(t=>
    '<article class="mw-notice-entry"><div class="mw-line-between"><div><strong>'+e(t.subject)+'</strong><small>'+dateLabel(t.created_at)+'</small></div>'+status(t.status)+'</div><p>'+e(t.details)+'</p>'+(t.owner_reply?'<div class="mw-reply"><b>BrightPath team</b><p>'+e(t.owner_reply)+'</p></div>':'')+'</article>'
   ).join('')+'</div>':empty('✉','No support requests','Your messages to BrightPath will appear here.'));
  return{html,bind(){
   form('mw-support-form',async()=>{
    await write(db,'bp_support_tickets',{school_id:sid,requester_user_id:user.id,subject:v('mw-support-subject'),details:v('mw-support-details')});await reload();
   });
  }};
 }
 return {html:heading('School workspace','Page not found','Select a section from your sidebar.')};
}

async function renderSchoolAttendance(ctx){
 const {db,schoolId:sid,user,reload}=ctx;
 const [students,classes,records]=await Promise.all([
  read(db,'bp_students',q=>q.eq('school_id',sid).order('full_name')),
  read(db,'bp_classes',q=>q.eq('school_id',sid).order('name')),
  read(db,'bp_attendance',q=>q.eq('school_id',sid).order('attendance_date',{ascending:false}).limit(500))
 ]);
 const day=today(),todays=records.filter(r=>r.attendance_date===day),count=st=>todays.filter(r=>r.status===st).length;
 const html=heading('SCHOOL ATTENDANCE','Attendance register','Record and review student attendance by date and class.')+
  '<div class="mw-metrics">'+stat('Present today',count('present'),'✓','teal')+stat('Absent today',count('absent'),'✕','amber')+
  stat('Late today',count('late'),'◷','blue')+stat('Recorded today',todays.length,'▤','violet')+'</div>'+
  box('Daily attendance','<div class="mw-filter-row">'+field('Date','<input type="date" id="mw-att-date" value="'+day+'">')+
   field('Class',select('mw-att-class','<option value="all">All classes</option>'+classes.map(c=>option(c.id,c.name)).join('')))+'</div>'+
   '<div id="mw-att-roster"></div>')+
  box('Recent attendance records',records.length?table(['Student','Date','Status','Recorded'],records.slice(0,25).map(r=>tr([
   e(students.find(s=>s.id===r.student_id)?.full_name||'Student'),
   dateLabel(r.attendance_date),status(r.status),dateLabel(r.marked_at)
  ]))):empty('📋','Attendance records will appear here','Choose a date and mark your students.'));
 return{html,bind(){
  const renderRoster=()=>{
   const date=v('mw-att-date')||day,cls=v('mw-att-class')||'all';
   const filtered=students.filter(k=>cls==='all'||k.class_id===cls);
   document.getElementById('mw-att-roster').innerHTML=filtered.length?table(['Student','Class','Attendance','Save'],filtered.map(k=>{
    const rec=records.find(r=>r.student_id===k.id&&r.attendance_date===date);
    return tr([e(k.full_name),e(findClass(classes,k.class_id)),
      select('mw-att-status-'+k.id,
       '<option value="">Select status</option>'+['present','late','absent','excused'].map(s=>'<option value="'+s+'" '+(rec?.status===s?'selected':'')+'>'+s+'</option>').join('')),
      button('Save','mw-mark-'+k.id,'outline','data-att-id="'+e(k.id)+'"')]);
   })):empty('🎒','No students in this class','Enroll students to begin taking attendance.');
   document.querySelectorAll('[data-att-id]').forEach(b=>b.onclick=async()=>{
    const status=v('mw-att-status-'+b.dataset.attId);
    if(!status){notice('Select attendance status first','error');return}
    try{
     result(await db.from('bp_attendance').upsert({school_id:sid,student_id:b.dataset.attId,attendance_date:date,status,marked_by:user.id,marked_at:new Date().toISOString()},{onConflict:'school_id,student_id,attendance_date'}));
     notice('Attendance saved');await reload();
    }catch(err){notice(err.message,'error')}
   });
  };
  document.getElementById('mw-att-date').onchange=renderRoster;
  document.getElementById('mw-att-class').onchange=renderRoster;
  renderRoster();
 }};
}
