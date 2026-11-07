import './style.css';
import { createClient, BetterAuthVanillaAdapter } from '@neondatabase/neon-js';

const ROOT='/brightpath-school-platform/';
const AUTH_URL='https://ep-falling-frog-bao493od.neonauth.c-8.eu-central-1.aws.neon.tech/neondb/auth';
const DATA_URL='https://ep-falling-frog-bao493od.apirest.c-8.eu-central-1.aws.neon.tech/neondb/rest/v1';
const db=createClient({auth:{url:AUTH_URL,adapter:BetterAuthVanillaAdapter()},dataApi:{url:DATA_URL}});
const app=document.getElementById('app');
const portal=document.body.dataset.portal||'landing';
const portalLabel={owner:'Platform Owner',school_admin:'School Administration',teacher:'Teacher Workspace',parent:'Parent Portal'};
let currentUser=null,context=null,currentSchool='',busy=false;
const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const $=id=>document.getElementById(id);
const url=path=>ROOT+path;
const itemOpt=(id,name)=>'<option value="'+h(id)+'">'+h(name)+'</option>';
const asDate=x=>new Date(x).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
const empty=(t='No records yet.')=>'<div class="empty">'+h(t)+'</div>';
const msg=(txt,type='notice')=>'<div class="notice '+(type==='err'?'err':type==='warn'?'warn':'')+'">'+h(txt)+'</div>';
const brand=()=>'<span class="logo">✦ brightpath<b>.</b></span>';
function errText(err){return err?.message||err?.details||String(err)||'Something went wrong'}
function check(result){if(result?.error)throw new Error(errText(result.error));return result?.data}
const portalLinks={parent:url('parent/'),teacher:url('teacher/'),'school-admin':url('school-admin/')};
function renderLanding(){
 app.innerHTML='<header class="top">'+brand()+'<nav class="top-links"><a href="'+url('parent/')+'">Parents</a><a href="'+url('teacher/')+'">Teachers</a><a href="'+url('school-admin/')+'">Schools</a></nav></header>'+
 '<section class="hero"><div class="eyebrow">School & home, connected</div><h1>Every school day deserves to be shared.</h1><p>Teachers record real classroom activities and performance. Parents follow their child’s progress. Schools manage classes and staff in their own secure workspace.</p><div class="hero-actions"><a class="btn" href="'+url('parent/')+'">Parent sign in</a><a class="btn ghost" href="'+url('school-admin/')+'">School administration</a></div></section>'+
 '<section class="section"><h2>One platform. Separate secure workspaces.</h2><p class="sub">A dedicated login and permission boundary for each responsibility.</p><div class="feature-grid"><div class="feature"><div class="feature-icon">👨‍👩‍👧</div><h3>Parents</h3><p>See updates, scores and approved pictures for only the children linked to your verified account.</p><p><a class="btn ghost small" href="'+url('parent/')+'">Parent portal</a></p></div><div class="feature"><div class="feature-icon">📝</div><h3>Teachers</h3><p>Share observations, enter scores and publish activities for students in classes assigned by the school.</p><p><a class="btn ghost small" href="'+url('teacher/')+'">Teacher portal</a></p></div><div class="feature"><div class="feature-icon">🏫</div><h3>Schools</h3><p>Manage school classes, verified teacher accounts, student records, guardian links and recorded photo consent.</p><p><a class="btn ghost small" href="'+url('school-admin/')+'">School portal</a></p></div></div></section>'+
 '<footer class="foot">© BrightPath · Separate school roles · No public student directory</footer>';
}
function shell(body,title=portalLabel[portal]){
 app.innerHTML='<div class="portal"><header class="portal-header"><div>'+brand()+'<div class="portal-name">'+h(title)+'</div></div><div id="user-actions"></div></header><main class="portal-main" id="workspace">'+body+'</main><footer class="foot">© BrightPath · Access is controlled by verified accounts and school assignments</footer></div>';
 if(currentUser){
  $('user-actions').innerHTML='<span style="font-size:13px;color:#c5dedf;margin-right:12px">'+h(currentUser.email||'')+'</span><button class="btn small" id="logout">Sign out</button>';
  $('logout').onclick=logout;
 }
}
function renderAuth(mode='signin',note=''){
 currentUser=null;
 const title=mode==='signup'?'Create your account':'Sign in to continue';
 const verification=mode==='verify';
 shell('<div class="login-shell"><div class="card"><h1 style="font-size:25px;margin:0 0 8px">'+(verification?'Verify your email':title)+'</h1><p class="muted" style="font-size:14px">Access to '+h(portalLabel[portal])+' requires an approved account and correct role.</p><div class="auth-switch"><button class="btn '+(mode==='signin'?'':'ghost')+'" id="switch-in">Sign in</button><button class="btn '+(mode==='signup'?'':'ghost')+'" id="switch-up">Register</button></div>'+
 (verification?'<form id="verify-form"><label class="field">Email<input id="email" type="email" autocomplete="email" required></label><label class="field">Verification code from email<input id="otp" inputmode="numeric" autocomplete="one-time-code" required></label><button class="btn full" type="submit">Verify email</button></form>':
 '<form id="auth-form">'+(mode==='signup'?'<label class="field">Full name<input id="full-name" autocomplete="name" minlength="2" required></label>':'')+'<label class="field">Email<input id="email" type="email" autocomplete="email" required></label><label class="field">Password<input id="password" type="password" minlength="8" autocomplete="'+(mode==='signup'?'new-password':'current-password')+'" required></label><button class="btn full" type="submit">'+(mode==='signup'?'Register account':'Sign in')+'</button></form>')+
 '<p class="smallnote">Registration does not automatically give school, teacher, or parent access. A school must verify and assign your account.</p><div id="auth-note">'+(note?msg(note):'')+'</div></div></div>');
 $('switch-in').onclick=()=>renderAuth('signin');$('switch-up').onclick=()=>renderAuth('signup');
 if(verification){$('verify-form').onsubmit=async e=>{e.preventDefault();try{const email=$('email').value.trim();const otp=$('otp').value.trim();check(await db.auth.emailOtp.verifyEmail({email,otp}));renderAuth('signin','Email verified. Sign in to open your workspace.')}catch(err){$('auth-note').innerHTML=msg(errText(err),'err')}};return}
 $('auth-form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const button=e.currentTarget.querySelector('button[type=submit]');button.disabled=true;
 try{const email=$('email').value.trim();const password=$('password').value;if(mode==='signup'){const name=$('full-name').value.trim();check(await db.auth.signUp.email({email,password,name}));renderAuth('verify','A verification code may have been sent to your email. Enter it to activate your account.');const inp=$('email');if(inp)inp.value=email}else{check(await db.auth.signIn.email({email,password}));await enterPortal()}}
 catch(err){$('auth-note').innerHTML=msg(errText(err),'err');button.disabled=false}finally{busy=false}};
}
async function logout(){try{await db.auth.signOut()}catch{}currentUser=null;context=null;renderAuth('signin','Signed out.')}
async function sessionUser(){const result=await db.auth.getSession();if(result.error)throw new Error(errText(result.error));const s=result.data||result;return s?.user||s?.session?.user||null}
async function enterPortal(){
 shell('<div class="card"><h2>Checking your account…</h2><p class="muted">Verifying your school permissions.</p></div>');
 try{
 currentUser=await sessionUser();
 if(!currentUser){renderAuth('signin');return}
 check(await db.rpc('bp_register_profile'));
 context=check(await db.rpc('bp_context'));
 if(typeof context==='string')context=JSON.parse(context);
 const memberships=(context?.memberships||[]).filter(m=>m.role===portal&&m.active);
 if(portal==='owner'&&!context?.is_owner){renderDenied();return}
 if(portal!=='owner'&&!memberships.length){renderDenied();return}
 currentSchool=memberships[0]?.school_id||'';
 if(portal==='owner')await renderOwner();
 else if(portal==='school_admin')await renderSchoolAdmin();
 else if(portal==='teacher')await renderTeacher();
 else await renderParent();
 }catch(err){shell('<div class="card"><h2>Unable to open this account</h2>'+msg(errText(err),'err')+'<p class="muted">Verify your email and sign in again if needed.</p><button class="btn" id="relogin">Back to sign in</button></div>');$('relogin').onclick=()=>renderAuth('signin')}
}
function renderDenied(){
 shell('<div class="card" style="max-width:670px"><h1>Access not yet approved</h1><p class="muted">Your account is authenticated, but it does not have permission for this workspace. Role access cannot be changed from this page.</p>'+msg('For teachers and parents: your school administrator must register your role. For school admins: the platform owner must approve your school.','warn')+'<div><button class="btn ghost" id="refresh">Check again</button></div></div>');
 $('refresh').onclick=()=>enterPortal();
}
function pageHead(title,subtitle,action=''){return '<div class="page-head"><div><h1>'+h(title)+'</h1><div class="muted">'+h(subtitle)+'</div></div>'+action+'</div>'}
function schoolOptions(memberships){return memberships.map(m=>itemOpt(m.school_id,m.school_name)).join('')}
function bindSwitchSchool(handler){const s=$('school-selector');if(s){s.value=currentSchool;s.onchange=async()=>{currentSchool=s.value;await handler()}}}
function schoolSwitcher(){const m=(context?.memberships||[]).filter(m=>m.role===portal&&m.active);return m.length>1?'<label class="field" style="max-width:320px;margin:0">School<select id="school-selector">'+schoolOptions(m)+'</select></label>':''}
function formatActivity(a){return '<li><div class="list-row"><div><div class="list-name">'+h(a.title)+'</div><div class="list-meta">'+h(a.subject)+' · '+asDate(a.created_at)+'</div></div><span class="chip">'+a.score+' / 100</span></div><p>'+h(a.notes)+'</p>'+(a.photo_data_url?'<img class="photo" loading="lazy" src="'+h(a.photo_data_url)+'" alt="Classroom activity photo">':'')+'</li>'}

async function renderOwner(){
 const schools=check(await db.from('bp_schools').select('id,name,status,created_at').order('created_at',{ascending:false}));
 const members=check(await db.from('bp_memberships').select('school_id,role,active'));
 const profiles=check(await db.from('bp_profiles').select('user_id,email'));
 shell(pageHead('Platform operations','Your private platform-owner backend. School administrators cannot enter this workspace.')+
 '<div class="cards"><div class="card"><div class="stat">'+schools.length+'</div><div class="stat-label">Registered schools</div></div><div class="card"><div class="stat">'+members.filter(m=>m.active).length+'</div><div class="stat-label">Assigned school accounts</div></div><div class="card"><div class="stat">'+profiles.length+'</div><div class="stat-label">Verified platform profiles</div></div></div>'+
 '<div class="grid"><section class="card"><h2>Register a school</h2><p class="muted">Create a real school workspace. No sample schools are created automatically.</p><form id="add-school"><label class="field">School name<input id="school-name" minlength="2" maxlength="140" required placeholder="Official school name"></label><button class="btn" type="submit">Create school</button><div id="school-msg"></div></form></section>'+
 '<section class="card"><h2>Appoint a school administrator</h2><p class="muted">Only the platform owner may assign a school-admin role. The administrator must register with their verified email first.</p><form id="appoint-admin"><label class="field">School<select id="admin-school" required>'+schools.map(s=>itemOpt(s.id,s.name)).join('')+'</select></label><label class="field">Administrator’s registered email<input id="admin-email" type="email" required placeholder="admin@school.org"></label><button class="btn" type="submit" '+(schools.length?'':'disabled')+'>Grant school administration</button><div id="grant-msg"></div></form></section></div>'+
 '<section class="card" style="margin-top:20px"><h2>Schools</h2>'+(schools.length?'<div class="scroll"><table class="portal-table"><thead><tr><th>School</th><th>Status</th><th>Added</th><th>Action</th></tr></thead><tbody>'+schools.map(s=>'<tr><td><strong>'+h(s.name)+'</strong></td><td>'+h(s.status)+'</td><td>'+asDate(s.created_at)+'</td><td><button class="btn small '+(s.status==='active'?'danger':'ghost')+'" data-toggle-school="'+h(s.id)+'" data-next="'+(s.status==='active'?'suspended':'active')+'">'+(s.status==='active'?'Suspend':'Activate')+'</button></td></tr>').join('')+'</tbody></table></div>':empty('No schools registered yet. Create your first school above.'))+'</section>');
 $('add-school').onsubmit=async e=>{e.preventDefault();try{check(await db.from('bp_schools').insert({name:$('school-name').value.trim()}));await renderOwner()}catch(err){$('school-msg').innerHTML=msg(errText(err),'err')}};
 $('appoint-admin').onsubmit=async e=>{e.preventDefault();try{check(await db.rpc('bp_grant_role',{p_school:$('admin-school').value,p_email:$('admin-email').value.trim(),p_role:'school_admin'}));$('grant-msg').innerHTML=msg('School administrator assigned.');}catch(err){$('grant-msg').innerHTML=msg(errText(err),'err')}};
 document.querySelectorAll('[data-toggle-school]').forEach(b=>b.onclick=async()=>{const next=b.dataset.next;if(!confirm('Change school status to '+next+'?'))return;try{check(await db.from('bp_schools').update({status:next}).eq('id',b.dataset.toggleSchool));await renderOwner()}catch(err){alert(errText(err))}});
}
async function renderSchoolAdmin(){
 const sid=currentSchool;if(!sid){renderDenied();return}
 const [classes,students,activities]=await Promise.all([
 db.from('bp_classes').select('id,name,school_id').eq('school_id',sid).order('name'),
 db.from('bp_students').select('id,full_name,class_id,photo_consent').eq('school_id',sid).order('full_name'),
 db.from('bp_activities').select('id,student_id,subject,title,score,created_at').eq('school_id',sid).order('created_at',{ascending:false}).limit(25)
 ]);
 const cls=check(classes),kids=check(students),updates=check(activities);
 shell(pageHead('School administration','Manage only the school(s) assigned to your account.',schoolSwitcher())+
 '<div class="cards"><div class="card"><div class="stat">'+cls.length+'</div><div class="stat-label">Classes</div></div><div class="card"><div class="stat">'+kids.length+'</div><div class="stat-label">Enrolled students</div></div><div class="card"><div class="stat">'+updates.length+'</div><div class="stat-label">Recent learning updates</div></div></div>'+
 '<div class="grid"><section class="card"><h2>Create a class</h2><form id="add-class"><label class="field">Class name<input id="class-name" maxlength="100" minlength="2" required placeholder="e.g. Primary 4 Blue"></label><button class="btn" type="submit">Add class</button><div id="class-msg"></div></form><hr class="divider"><h3>Your classes</h3>'+(cls.length?'<ul class="list">'+cls.map(c=>'<li>'+h(c.name)+'</li>').join('')+'</ul>':empty('Create your first class.'))+'</section>'+
 '<section class="card"><h2>Enroll a student</h2><form id="add-student"><label class="field">Student’s full name<input id="student-name" minlength="2" maxlength="160" required placeholder="Student name"></label><label class="field">Class<select id="student-class" required><option value="">Select a class</option>'+cls.map(c=>itemOpt(c.id,c.name)).join('')+'</select></label><p class="smallnote">Photo permissions start disabled until written guardian consent is verified by your school.</p><button class="btn" type="submit" '+(cls.length?'':'disabled')+'>Add student</button><div id="student-msg"></div></form></section></div>'+
 '<div class="grid" style="margin-top:18px"><section class="card"><h2>Assign staff and parents</h2><form id="grant-role"><label class="field">Registered user’s email<input id="member-email" type="email" required placeholder="person@email.com"></label><label class="field">Access role<select id="member-role"><option value="teacher">Teacher</option><option value="parent">Parent</option></select></label><button class="btn" type="submit">Approve role</button><div id="member-msg"></div></form><hr class="divider"><h3>Assign teacher to class</h3><form id="assign-teacher"><label class="field">Teacher’s registered email<input type="email" required id="teacher-email"></label><label class="field">Class<select id="teacher-class" required>'+cls.map(c=>itemOpt(c.id,c.name)).join('')+'</select></label><button class="btn" type="submit" '+(cls.length?'':'disabled')+'>Assign class</button><div id="teacher-msg"></div></form></section>'+
 '<section class="card"><h2>Link a verified parent to a student</h2><p class="smallnote">Only link a parent after checking guardianship using your school’s identity-verification process.</p><form id="link-parent"><label class="field">Parent’s registered email<input id="parent-email" type="email" required></label><label class="field">Student<select id="parent-student" required>'+kids.map(k=>itemOpt(k.id,k.full_name)).join('')+'</select></label><label class="field" style="display:flex;gap:9px;align-items:flex-start"><input type="checkbox" id="guardian-confirm" required style="width:auto;margin:2px 0">I have verified the parent or guardian’s identity and authority to access this child’s records.</label><button class="btn" type="submit" '+(kids.length?'':'disabled')+'>Link parent and child</button><div id="parent-msg"></div></form></section></div>'+
 '<section class="card" style="margin-top:18px"><h2>Students and photo-consent records</h2><p class="smallnote">Consent must be obtained outside the system from the parent/guardian. Every consent status change is audit-logged.</p>'+(kids.length?'<div class="scroll"><table class="portal-table"><thead><tr><th>Student</th><th>Class</th><th>Photo consent</th><th>Update</th></tr></thead><tbody>'+kids.map(k=>'<tr><td>'+h(k.full_name)+'</td><td>'+h(cls.find(c=>c.id===k.class_id)?.name||'')+'</td><td>'+(k.photo_consent?'<span class="chip">Recorded</span>':'Not recorded')+'</td><td><button class="btn small '+(k.photo_consent?'danger':'ghost')+'" data-consent="'+h(k.id)+'" data-set="'+(!k.photo_consent)+'">'+(k.photo_consent?'Revoke':'Record consent')+'</button></td></tr>').join('')+'</tbody></table></div>':empty('No students enrolled yet.'))+'</section>');
 bindSwitchSchool(renderSchoolAdmin);
 $('add-class').onsubmit=async e=>{e.preventDefault();try{check(await db.from('bp_classes').insert({school_id:sid,name:$('class-name').value.trim()}));await renderSchoolAdmin()}catch(err){$('class-msg').innerHTML=msg(errText(err),'err')}};
 $('add-student').onsubmit=async e=>{e.preventDefault();try{check(await db.from('bp_students').insert({school_id:sid,class_id:$('student-class').value,full_name:$('student-name').value.trim()}));await renderSchoolAdmin()}catch(err){$('student-msg').innerHTML=msg(errText(err),'err')}};
 $('grant-role').onsubmit=async e=>{e.preventDefault();try{check(await db.rpc('bp_grant_role',{p_school:sid,p_email:$('member-email').value.trim(),p_role:$('member-role').value}));$('member-msg').innerHTML=msg('Access assigned to verified account.')}catch(err){$('member-msg').innerHTML=msg(errText(err),'err')}};
 $('assign-teacher').onsubmit=async e=>{e.preventDefault();try{check(await db.rpc('bp_assign_teacher',{p_school:sid,p_class:$('teacher-class').value,p_email:$('teacher-email').value.trim()}));$('teacher-msg').innerHTML=msg('Teacher assigned to class.')}catch(err){$('teacher-msg').innerHTML=msg(errText(err),'err')}};
 $('link-parent').onsubmit=async e=>{e.preventDefault();if(!$('guardian-confirm').checked)return;try{check(await db.rpc('bp_link_parent',{p_school:sid,p_student:$('parent-student').value,p_email:$('parent-email').value.trim()}));$('parent-msg').innerHTML=msg('Parent account linked to student.')}catch(err){$('parent-msg').innerHTML=msg(errText(err),'err')}};
 document.querySelectorAll('[data-consent]').forEach(b=>b.onclick=async()=>{const isGrant=b.dataset.set==='true';if(!confirm(isGrant?'Have you obtained verified, written guardian consent allowing student photos to be shared with authorized parents?':'Revoke photographic consent for this student?'))return;try{check(await db.from('bp_students').update({photo_consent:isGrant}).eq('id',b.dataset.consent).eq('school_id',sid));await renderSchoolAdmin()}catch(err){alert(errText(err))}});
}

async function photoData(file){
 if(!file)return null;
 if(!file.type.startsWith('image/'))throw new Error('Choose an image file.');
 if(file.size>12*1024*1024)throw new Error('Photo must be under 12 MB before resizing.');
 const source=URL.createObjectURL(file);
 try{
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('The selected image could not be opened.'));i.src=source});
  const ratio=Math.min(1,900/Math.max(img.width,img.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*ratio));canvas.height=Math.max(1,Math.round(img.height*ratio));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL('image/jpeg',.67);
  if(data.length>440000)throw new Error('Photo is too large after compression. Choose a smaller photo.');
  return data;
 }finally{URL.revokeObjectURL(source)}
}
async function renderTeacher(){
 const sid=currentSchool;
 const [assignmentsResult,classesResult,studentsResult,activitiesResult]=await Promise.all([
  db.from('bp_teacher_classes').select('class_id,teacher_user_id').eq('school_id',sid),
  db.from('bp_classes').select('id,name').eq('school_id',sid),
  db.from('bp_students').select('id,full_name,class_id,photo_consent').eq('school_id',sid).order('full_name'),
  db.from('bp_activities').select('id,student_id,subject,title,notes,score,photo_data_url,created_at').eq('school_id',sid).order('created_at',{ascending:false}).limit(40)
 ]);
 const assignments=check(assignmentsResult),allClasses=check(classesResult),students=check(studentsResult),activities=check(activitiesResult);
 const ids=new Set(assignments.map(a=>a.class_id));const cls=allClasses.filter(c=>ids.has(c.id));
 shell(pageHead('Teacher workspace','Record learning achievements for your assigned classes only.',schoolSwitcher())+
 '<div class="cards two"><div class="card"><div class="stat">'+cls.length+'</div><div class="stat-label">Your classes</div></div><div class="card"><div class="stat">'+students.length+'</div><div class="stat-label">Students assigned to you</div></div></div>'+
 '<div class="grid"><section class="card"><h2>Post a classroom activity</h2><p class="muted" style="font-size:13px">Updates become visible to verified parents linked to this student.</p><form id="activity-form"><label class="field">Student<select id="activity-student" required><option value="">Select student</option>'+students.map(s=>itemOpt(s.id,s.full_name+' · '+(allClasses.find(c=>c.id===s.class_id)?.name||''))).join('')+'</select></label><label class="field">Subject<select id="activity-subject"><option>Reading</option><option>Mathematics</option><option>Science</option><option>Art & Creativity</option><option>Physical Education</option><option>Social Skills</option><option>Other</option></select></label><label class="field">Activity title<input id="activity-title" minlength="2" maxlength="120" required placeholder="What did the student do?"></label><label class="field">Teacher observation<textarea id="activity-notes" maxlength="2000" minlength="2" required placeholder="Describe their progress, participation, and strengths."></textarea></label><label class="field">Performance score (0–100)<input id="activity-score" type="number" min="0" max="100" value="85" required></label><label class="field">Activity photo (optional)<input id="activity-photo" type="file" accept="image/*"></label><div id="photo-consent-note" class="smallnote">Only post child photos with recorded guardian consent. Photos are accessible only to authorized accounts.</div><button class="btn" type="submit" '+(students.length?'':'disabled')+'>Publish learning activity</button><div id="activity-message"></div></form></section>'+
 '<section class="card"><h2>Your classes</h2>'+(cls.length?'<ul class="list">'+cls.map(c=>'<li><div class="list-name">'+h(c.name)+'</div><div class="list-meta">'+students.filter(s=>s.class_id===c.id).length+' assigned students</div></li>').join('')+'</ul>':empty('No classes assigned yet. Ask your school administrator to assign your teaching classes.'))+
 '<hr class="divider"><h2>Student roster</h2>'+(students.length?'<ul class="list">'+students.map(s=>'<li><div class="list-name">'+h(s.full_name)+'</div><div class="list-meta">'+h(allClasses.find(c=>c.id===s.class_id)?.name||'')+' · Photo consent '+(s.photo_consent?'recorded':'not recorded')+'</div></li>').join('')+'</ul>':empty('No students assigned yet.'))+'</section></div>'+
 '<section class="card" style="margin-top:20px"><h2>Recent recorded activities</h2>'+(activities.length?'<ul class="list">'+activities.map(a=>'<li>'+formatActivity(a).replace(/^<li>|<\/li>$/g,'')+'</li>').join('')+'</ul>':empty('No activities recorded yet. When a real lesson is posted, it will appear here.'))+'</section>');
 bindSwitchSchool(renderTeacher);
 const photoHint=$('photo-consent-note');
 $('activity-student').onchange=()=>{const kid=students.find(s=>s.id===$('activity-student').value);photoHint.textContent=kid?(kid.photo_consent?'Written photo consent has been recorded by the school.':'No photo consent recorded. You can post notes and scores, but not a student photo.'):'Only post child photos with recorded guardian consent.'};
 $('activity-form').onsubmit=async e=>{
  e.preventDefault();const button=e.currentTarget.querySelector('button[type=submit]');button.disabled=true;
  try{
   const studentId=$('activity-student').value;const kid=students.find(s=>s.id===studentId);
   if(!kid)throw new Error('Please select a student assigned to your class.');
   const file=$('activity-photo').files[0];
   if(file&&!kid.photo_consent)throw new Error('This student has no recorded parental consent for photos.');
   const data=file?await photoData(file):null;
   check(await db.from('bp_activities').insert({school_id:sid,student_id:studentId,teacher_user_id:currentUser.id,subject:$('activity-subject').value,title:$('activity-title').value.trim(),notes:$('activity-notes').value.trim(),score:Number($('activity-score').value),photo_data_url:data}));
   await renderTeacher();
  }catch(err){$('activity-message').innerHTML=msg(errText(err),'err');button.disabled=false}
 };
}
async function renderParent(){
 const sid=currentSchool;
 const [linksResult,studentsResult,activitiesResult]=await Promise.all([
  db.from('bp_parent_links').select('student_id').eq('school_id',sid),
  db.from('bp_students').select('id,full_name,class_id').eq('school_id',sid),
  db.from('bp_activities').select('id,student_id,subject,title,notes,score,photo_data_url,created_at').eq('school_id',sid).order('created_at',{ascending:false}).limit(80)
 ]);
 const linked=check(linksResult),students=check(studentsResult),activities=check(activitiesResult);
 const linkedIds=new Set(linked.map(l=>l.student_id)),myKids=students.filter(s=>linkedIds.has(s.id));
 const visible=activities.filter(a=>linkedIds.has(a.student_id));
 const mean=visible.length?Math.round(visible.reduce((sum,a)=>sum+a.score,0)/visible.length):null;
 shell(pageHead('Your child’s learning','Only children verified and linked to your parent account are shown here.',schoolSwitcher())+
 '<div class="cards"><div class="card"><div class="stat">'+myKids.length+'</div><div class="stat-label">Linked children</div></div><div class="card"><div class="stat">'+visible.length+'</div><div class="stat-label">Activities shared with you</div></div><div class="card"><div class="stat">'+(mean===null?'—':mean+'%')+'</div><div class="stat-label">Average activity score</div></div></div>'+
 '<div class="grid"><section class="card"><h2>Your children</h2>'+(myKids.length?'<ul class="list">'+myKids.map(s=>'<li><div class="list-name">'+h(s.full_name)+'</div><div class="list-meta">School-verified parent connection</div></li>').join('')+'</ul>':empty('Your school has not linked a child to this account yet. Contact your school administrator to verify the relationship.'))+'</section>'+
 '<section class="card"><h2>How parent access works</h2><p class="muted" style="font-size:14px">Your school verifies guardianship and links children to your registered email. Only linked children’s authorized activities, photos and scores appear here. Teachers cannot give parent access themselves.</p><p class="security">Student photos stay behind authenticated, row-level database permissions. Your account cannot view records belonging to other families.</p></section></div>'+
 '<section class="card" style="margin-top:18px"><h2>Latest teacher updates</h2>'+(visible.length?'<ul class="list">'+visible.map(a=>'<li><div class="list-meta" style="margin-bottom:9px">'+h(myKids.find(s=>s.id===a.student_id)?.full_name||'')+'</div>'+formatActivity(a).replace(/^<li>|<\/li>$/g,'')+'</li>').join('')+'</ul>':empty('No classroom updates have been shared for your linked children yet.'))+'</section>');
 bindSwitchSchool(renderParent);
}
if(portal==='landing'){renderLanding()}else{enterPortal()}
