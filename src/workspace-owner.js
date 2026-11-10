import {escapeHtml as e,numberLabel as n,dollar,initial,dateLabel,stat,box,empty,pill,status,field,input,select,button,heading,table,tr,option,read,write,update,rpc,result,form,click,notice,v,checked} from './workspace-core.js';

const roleName={school_admin:'School admin',teacher:'Teacher',parent:'Parent'};
async function ownerData(db){
 const [schools,profiles,members]=await Promise.all([
  read(db,'bp_schools',q=>q.order('created_at',{ascending:false})),
  read(db,'bp_profiles',q=>q.order('created_at',{ascending:false})),
  read(db,'bp_memberships',q=>q.order('created_at',{ascending:false}))
 ]);
 return {schools,profiles,members};
}
function schoolTag(s){return status(s?.status||'active')}
function smallSchool(s){return '<span class="mw-identity"><span class="mw-round-icon">🏫</span><span><b>'+e(s.name)+'</b><small>Added '+dateLabel(s.created_at)+'</small></span></span>'}
function quick(title,description,tab,emoji){return '<button type="button" class="mw-action" data-quick="'+tab+'"><span>'+emoji+'</span><b>'+e(title)+'</b><small>'+e(description)+'</small><i>↗</i></button>'}
function bindQuick(go){document.querySelectorAll('[data-quick]').forEach(b=>b.onclick=()=>go(b.dataset.quick))}
export async function renderOwnerPage(ctx,tab){
 const {db,user,go,reload}=ctx;
 if(tab==='overview'){
  const {schools,profiles,members}=await ownerData(db);
  const [requests,activities]=await Promise.all([
   read(db,'bp_school_plan_requests',q=>q.order('requested_at',{ascending:false}).limit(100)),
   read(db,'bp_activities',q=>q.order('created_at',{ascending:false}).limit(100))
  ]);
  const html=heading('PLATFORM CONTROL CENTER','Good to see you, '+(user.name?.split(' ')[0]||'Owner'),'Your schools, subscriptions and operations at a glance.')+
  '<div class="mw-metrics">'+stat('Total schools',n(schools.length),'🏫','teal','Registered on BrightPath')+
  stat('School accounts',n(members.filter(m=>m.active).length),'♙','blue','Approved members')+
  stat('Registered users',n(profiles.length),'👥','amber','Across your platform')+
  stat('Learning updates',n(activities.length),'📈','violet','Recent recorded activities')+'</div>'+
  (schools.length===0?'<div class="mw-welcome"><div><span class="mw-welcome-kicker">GET STARTED</span><h2>Build your first school community</h2><p>Set up a school, approve its administrator and let the school enroll students and invite teachers.</p>'+button('Register first school →','mw-add-school','light')+'</div><div class="mw-welcome-art">🏫<span>✦</span></div></div>':'')+
  '<div class="mw-section-title"><h2>Quick actions</h2><span>Manage BrightPath</span></div><div class="mw-actions-grid">'+
  quick('Register a school','Create a school workspace','schools','🏫')+
  quick('Manage access','Approve administrators and members','people','🔐')+
  quick('Revenue dashboard','View requests and earnings','revenue','💳')+
  quick('Support inbox','Review school requests','support','✉')+'</div>'+
  '<div class="mw-two">'+box('Recently added schools',
   schools.length?table(['School','Status'],schools.slice(0,6).map(s=>tr([smallSchool(s),schoolTag(s)]))):
   empty('🏫','Your school directory is ready','Start by registering your first school.',button('Add school','mw-add-school2','outline')))
   +box('Platform checklist',
    '<div class="mw-checklist">'+[
      [schools.length>0,'Register a school','Create its workspace'],
      [members.some(m=>m.role==='school_admin'&&m.active),'Approve school administrator','Assign leadership'],
      [members.some(m=>m.role==='teacher'&&m.active),'Bring on teaching staff','Schools approve teacher accounts'],
      [activities.length>0,'First classroom update','Teachers publish real learning records']
    ].map(([yes,title,desc])=>'<div class="mw-check"><span class="'+(yes?'mw-checked':'')+'">'+(yes?'✓':'○')+'</span><div><b>'+title+'</b><small>'+desc+'</small></div></div>').join('')+'</div>')+'</div>'+
  box('Go-live readiness · owner checklist',
   '<div class="mw-checklist">'+[
    ['🌍','School regions','Each school administrator confirms country, city and IANA timezone before real attendance.'],
    ['🏢','Register the operating company','Company registration, tax identity and a verified business support contact are owner-managed external steps.'],
    ['🛡️','Data protection registration','For Kenya, verify the appropriate ODPC data-controller / processor registration and publish legal contact and child-data terms before inviting families.'],
    ['🔐','Real multi-account privacy test','Before enrolling children, sign in as a real administrator, an assigned teacher and two separately linked parents and verify that records never cross families.'],
    ['🌐','Attach your own domain','After buying and verifying a domain, switch the public root build, configure GitHub Pages and DNS/HTTPS. The current GitHub Pages URL remains active.'],
    ['💳','Payments and country pricing','Payment collection, automated subscription enforcement and non-Kenyan prices are not live. Do not collect production subscriptions yet.']
   ].map(([icon,title,detail])=>'<div class="mw-check"><span>'+icon+'</span><div><b>'+title+'</b><small>'+detail+'</small></div></div>').join('')+'</div>'+
   '<p class="mw-fine">Technical tests are not government approvals or proof of a completed live family pilot. Confirm each requirement before onboarding real children.</p>');
  return {html,bind(){bindQuick(go);click('mw-add-school',()=>go('schools'));click('mw-add-school2',()=>go('schools'))}};
 }
 if(tab==='schools'){
  const {schools,members}=await ownerData(db);
  const students=await read(db,'bp_students',q=>q.select('id,school_id'));
  const counts=new Map(schools.map(s=>[s.id,students.filter(k=>k.school_id===s.id).length]));
  const html=heading('SCHOOLS','School directory','Register schools, review enrollment and manage operating status.')+
   '<div class="mw-two mw-two-side"><section class="mw-card"><div class="mw-card-head"><h2>Register school</h2></div><form id="mw-school-create" class="mw-form">'+field('Official school name',input('mw-school-name','Enter school name','text','minlength="2" maxlength="140" required'))+
   '<div class="mw-form-tip">Each school receives its own separate administration workspace.</div>'+button('Create school →','mw-school-create-btn','primary','type="submit"')+'</form></section>'+
   '<section class="mw-card mw-how"><div class="mw-card-head"><h2>Onboarding flow</h2></div><div class="mw-steps"><div><span>1</span><p><b>Register the school</b><small>Create its profile</small></p></div><div><span>2</span><p><b>Assign administrator</b><small>Approve the leader’s account</small></p></div><div><span>3</span><p><b>Start enrollment</b><small>Schools manage staff, classes and families</small></p></div></div></section></div>'+
   box('<span>All schools</span><span class="mw-count">'+schools.length+'</span>',
    schools.length?'<div class="mw-filter-row">'+input('mw-school-search','Search schools')+'</div><div id="mw-schools-table">'+
    table(['School','Students','Accounts','Status','Action'],schools.map(s=>tr([
     smallSchool(s),n(counts.get(s.id)),n(members.filter(m=>m.school_id===s.id&&m.active).length),status(s.status),
     button(s.status==='active'?'Suspend':'Reactivate','mw-status-'+s.id,s.status==='active'?'danger':'outline','data-school-id="'+e(s.id)+'" data-next="'+(s.status==='active'?'suspended':'active')+'"')
    ])))+'</div>':empty('🏫','No schools yet','Once added, each school will appear here.'));
  return{html,bind(){
   form('mw-school-create',async()=>{
    await write(db,'bp_schools',{name:v('mw-school-name')});
    await reload();
   });
   document.querySelectorAll('[data-school-id]').forEach(b=>b.onclick=async()=>{
    if(!window.confirm('Set this school to '+b.dataset.next+'?'))return;
    try{await update(db,'bp_schools',{status:b.dataset.next},{id:b.dataset.schoolId});notice('School status updated');await reload()}catch(err){notice(err.message,'error')}
   });
   const search=document.getElementById('mw-school-search');
   if(search)search.oninput=()=>{
    const term=search.value.toLowerCase();
    document.querySelectorAll('#mw-schools-table tbody tr').forEach(row=>{row.hidden=!row.textContent.toLowerCase().includes(term)});
   };
  }};
 }
 if(tab==='people'){
  const {schools,profiles,members}=await ownerData(db);
  const person=new Map(profiles.map(p=>[p.user_id,p]));
  const roles=members.map(m=>({...m,school:schools.find(s=>s.id===m.school_id)?.name||'School',person:person.get(m.user_id)}));
  const html=heading('IDENTITY & PERMISSIONS','People and access','Approve school administrators and review school memberships.')+
   '<div class="mw-two mw-two-side">'+box('Assign school administrator',
    '<form id="mw-assign-admin" class="mw-form">'+field('School',select('mw-admin-school',schools.map(s=>option(s.id,s.name)).join(''),'required'))+
    field('Registered administrator email',input('mw-admin-email','admin@school.edu','email','required'))+
    '<p class="mw-fine">Administrators must first create and verify their account.</p>'+button('Approve administrator','mw-admin-submit','primary','type="submit" '+(!schools.length?'disabled':''))+'</form>')+
   box('Account summary','<div class="mw-split-stats"><div><strong>'+n(profiles.length)+'</strong><small>Registered people</small></div><div><strong>'+n(roles.filter(m=>m.active).length)+'</strong><small>Active memberships</small></div></div><p class="mw-fine">School admins can invite teachers and parents, but only your owner account can assign other school administrators.</p>')+'</div>'+
   box('School memberships',
    roles.length?'<div class="mw-filter-row">'+input('mw-people-search','Search by name, email, school or role')+'</div><div id="mw-people-table">'+table(['Member','School','Role','Status','Manage'],roles.map(m=>tr([
     '<span class="mw-identity"><span class="mw-round-icon">'+initial(m.person?.full_name||m.person?.email)+'</span><span><b>'+e(m.person?.full_name||'Registered user')+'</b><small>'+e(m.person?.email||'')+'</small></span></span>',
     e(m.school),e(roleName[m.role]||m.role),pill(m.active?'Active':'Inactive',m.active?'green':'neutral'),
     m.active?button('Deactivate','mw-revoke-'+m.user_id,'danger','data-revoke-user="'+e(m.user_id)+'" data-revoke-school="'+e(m.school_id)+'"'):'—'
    ])))+'</div>':empty('🔐','No school memberships','Approve an administrator to begin school onboarding.'));
  return{html,bind(){
   form('mw-assign-admin',async()=>{
    await rpc(db,'bp_grant_role',{p_school:v('mw-admin-school'),p_email:v('mw-admin-email'),p_role:'school_admin'});await reload();
   });
   document.querySelectorAll('[data-revoke-user]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Deactivate this school membership?'))return;
    try{await rpc(db,'bp_revoke_member',{p_school:b.dataset.revokeSchool,p_user_id:b.dataset.revokeUser});notice('Membership deactivated');await reload()}catch(err){notice(err.message,'error')}
   });
   const f=document.getElementById('mw-people-search');if(f)f.oninput=()=>{
    const term=f.value.toLowerCase();
    document.querySelectorAll('#mw-people-table tbody tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(term));
   };
  }};
 }
 if(tab==='analytics'){
  const [schools,activities,students,classes,attendance]=await Promise.all([
   read(db,'bp_schools'),read(db,'bp_activities',q=>q.order('created_at',{ascending:false}).limit(100)),
   read(db,'bp_students',q=>q.select('id,school_id')),read(db,'bp_classes'),read(db,'bp_attendance',q=>q.order('attendance_date',{ascending:false}).limit(100))
  ]);
  const counts=schools.map(s=>({school:s,students:students.filter(x=>x.school_id===s.id).length,classes:classes.filter(x=>x.school_id===s.id).length,activities:activities.filter(x=>x.school_id===s.id).length}));
  const html=heading('PLATFORM INSIGHTS','Activity monitor','Review live educational activity and enrollment across your schools.')+
   '<div class="mw-metrics">'+stat('Students',n(students.length),'🎒','teal')+stat('Classes',n(classes.length),'📗','blue')+stat('Recent activities',n(activities.length),'✎','violet')+stat('Attendance entries',n(attendance.length),'✓','amber')+'</div>'+
   box('School performance',counts.length?table(['School','Classes','Students','Recent posts'],counts.map(o=>tr([e(o.school.name),n(o.classes),n(o.students),n(o.activities)]))):empty('📊','No school activity','School enrollment and activity will appear once schools start using BrightPath.'))+
   box('Latest learning activity',activities.length?table(['School','Activity','Subject','Score','Date'],activities.slice(0,20).map(a=>tr([e(schools.find(s=>s.id===a.school_id)?.name||'School'),e(a.title),e(a.subject),pill(a.score+'%','green'),dateLabel(a.created_at)]))):empty('✏️','Learning feed is empty','Teacher activity updates will show here.'));
  return{html};
 }
 if(tab==='revenue'){
  const html=heading('SUBSCRIPTIONS','Revenue and subscriptions','Plan requests, payment records and school revenue-sharing details.')+'<div id="mw-billing-mount"></div>';
  return{html,async bind(){
   const {renderOwnerBilling}=await import('./billing.js');
   await renderOwnerBilling(db);
  }};
 }
 if(tab==='support'){
  const [tickets,schools,profiles]=await Promise.all([
   read(db,'bp_support_tickets',q=>q.order('created_at',{ascending:false}).limit(100)),
   read(db,'bp_schools'),read(db,'bp_profiles')
  ]);
  const p=new Map(profiles.map(x=>[x.user_id,x]));
  const html=heading('SERVICE DESK','Support inbox','Resolve requests sent by school administrators.')+
   '<div class="mw-metrics">'+stat('Open tickets',tickets.filter(t=>t.status==='open').length,'✉','amber')+
   stat('In progress',tickets.filter(t=>t.status==='in_progress').length,'◷','blue')+
   stat('Resolved',tickets.filter(t=>t.status==='resolved').length,'✓','teal')+'</div>'+
   (tickets.length?'<div class="mw-ticket-list">'+tickets.map(t=>
    box('<span>'+e(t.subject)+'</span>'+status(t.status),
     '<div class="mw-mini-meta">'+e(schools.find(s=>s.id===t.school_id)?.name||'School')+' · '+e(p.get(t.requester_user_id)?.email||'')+' · '+dateLabel(t.created_at)+'</div>'+
     '<p class="mw-message">'+e(t.details)+'</p><form id="mw-ticket-'+e(t.id)+'" class="mw-form">'+field('Response', '<textarea id="mw-ticket-reply-'+e(t.id)+'" maxlength="3000" placeholder="Write a response…">'+e(t.owner_reply||'')+'</textarea>')+
     field('Status',select('mw-ticket-status-'+e(t.id),
      ['open','in_progress','resolved'].map(s=>'<option '+(s===t.status?'selected':'')+' value="'+s+'">'+s.replace('_',' ')+'</option>').join('')))+
      button('Save response','mw-save-ticket-'+e(t.id),'outline','type="submit"')+'</form>')
    ).join('')+'</div>':empty('📬','Support inbox is clear','Schools can contact BrightPath from their administration portal.'));
  return{html,bind(){
   for(const t of tickets)form('mw-ticket-'+t.id,async()=>{
    await update(db,'bp_support_tickets',{status:v('mw-ticket-status-'+t.id),owner_reply:v('mw-ticket-reply-'+t.id),updated_at:new Date().toISOString()},{id:t.id});
    await reload();
   });
  }};
 }
 return{html:heading('Owner portal','Page not found','Choose a section from the left sidebar.')};
}
