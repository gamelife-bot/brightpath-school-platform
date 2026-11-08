import {escapeHtml as e,stat,box,empty,pill,button,heading,read,rpc,notice} from './workspace-core.js';

/**
 * School onboarding is derived entirely from real records.
 * Nothing is marked completed without a confirmed database record.
 */
export async function renderSchoolSetup(ctx){
 const {db,schoolId:sid,go}=ctx;
 const [schools,rooms,kids,roles,teacherLinks,parentLinks,care,contacts,media,events,coverageRules,shifts]=await Promise.all([
  read(db,'bp_schools',q=>q.eq('id',sid)),
  read(db,'bp_classes',q=>q.eq('school_id',sid)),
  read(db,'bp_students',q=>q.eq('school_id',sid)),
  read(db,'bp_memberships',q=>q.eq('school_id',sid)),
  read(db,'bp_teacher_classes',q=>q.eq('school_id',sid)),
  read(db,'bp_parent_links',q=>q.eq('school_id',sid)),
  read(db,'bp_care_logs',q=>q.eq('school_id',sid).limit(1)),
  read(db,'bp_pickup_contacts',q=>q.eq('school_id',sid).limit(1)),
  read(db,'bp_child_media',q=>q.eq('school_id',sid).limit(1)),
  read(db,'bp_school_events',q=>q.eq('school_id',sid).eq('is_published',true).limit(1)),
  read(db,'bp_room_coverage_rules',q=>q.eq('school_id',sid)),
  read(db,'bp_staff_shifts',q=>q.eq('school_id',sid).limit(1))
 ]);
 let pendingTeacher=0,pendingParent=0;
 try{
  const [t,p]=await Promise.all(['teacher','parent'].map(r=>rpc(db,'bp_school_request_queue',{p_school:sid,p_role:r})));
  pendingTeacher=t.filter(x=>x.status==='pending').length;
  pendingParent=p.filter(x=>x.status==='pending').length;
 }catch{}
 const staff=roles.filter(m=>m.role==='teacher'&&m.active),parents=roles.filter(m=>m.role==='parent'&&m.active);
 const checks=[
  {id:1,label:'Create your classrooms',desc:'Add Baby Room, Toddlers, Nursery, Preschool or the rooms your school actually uses.',done:rooms.length>0,tab:'classes',cta:'Manage rooms',icon:'🏡'},
  {id:2,label:'Enroll your children',desc:'Record each child in the correct room with guardian processing authorization.',done:kids.length>0,tab:'students',cta:'Enroll children',icon:'🧸'},
  {id:3,label:'Approve your teachers',desc:pendingTeacher?pendingTeacher+' teacher requests are waiting.':'Teachers register and request access to their school.',done:staff.length>0,tab:'teachers',cta:'Teacher approvals',icon:'🍎'},
  {id:4,label:'Assign teachers to rooms',desc:'Assign approved teachers to the children and classrooms they care for.',done:teacherLinks.length>0,tab:'people',cta:'Assign staff',icon:'📚'},
  {id:5,label:'Approve parent accounts',desc:pendingParent?pendingParent+' parent requests are waiting.':'Parents register with their own verified email addresses.',done:parents.length>0,tab:'parents',cta:'Parent approvals',icon:'💛'},
  {id:6,label:'Verify and link guardians',desc:'Verify a guardian’s identity before connecting their account to a child.',done:parentLinks.length>0,tab:'families',cta:'Guardian links',icon:'👨‍👩‍👧'},
  {id:7,label:'Confirm individual care information',desc:'Record allergies, emergency contacts and daily routines supplied by guardians.',done:false,tab:'profiles',cta:'Child profiles',icon:'🩹'},
  {id:8,label:'Publish your first daily care update',desc:'Start with a meal, nap, mood or playtime observation.',done:care.length>0,tab:'care',cta:'Daily care diary',icon:'☀️'},
  {id:9,label:'Set up safe pickups',desc:'Add and approve the adults authorized to collect each child.',done:contacts.length>0,tab:'pickup',cta:'Pickup safety',icon:'🎒'},
  {id:10,label:'Share a family moment',desc:'Share a private photo or short video after individual guardian consent.',done:media.length>0,tab:'moments',cta:'Photos & videos',icon:'📸'},
  {id:11,label:'Publish your first school calendar event',desc:'Schedule a family meeting, celebration or important school closure.',done:events.length>0,tab:'events',cta:'School calendar',icon:'🗓️'},
  {id:12,label:'Set classroom caregiver targets',desc:'Set each room’s school-defined coverage target after checking the requirements that apply to your school.',done:rooms.length>0&&rooms.every(r=>coverageRules.some(c=>c.class_id===r.id)),tab:'staffing',cta:'Staff ratios',icon:'🍎'},
  {id:13,label:'Schedule the teaching team',desc:'Create a staff rota and have teachers confirm arrival on their scheduled day.',done:shifts.length>0,tab:'staffing',cta:'Staff shifts',icon:'🗓️'},
  {id:14,label:'Send the parent handbook for signature',desc:'Ask a verified guardian to review and sign an individual school document.',done:false,tab:'signatures',cta:'Signature requests',icon:'✍️'},
  {id:15,label:'Ask families for feedback',desc:'Publish a three-question parent survey to learn what families need.',done:false,tab:'feedback',cta:'Parent surveys',icon:'💛'}
 ];
 const [signatures,surveys]=await Promise.all([read(db,'bp_signature_requests',q=>q.eq('school_id',sid).limit(1)),read(db,'bp_family_surveys',q=>q.eq('school_id',sid).limit(1))]);
 checks[13].done=signatures.length>0;checks[14].done=surveys.length>0;
 const details=await read(db,'bp_child_details',q=>q.eq('school_id',sid));
 checks[6].done=details.some(x=>x.emergency_contact_name&&x.emergency_contact_phone);
 const completed=checks.filter(x=>x.done).length,pct=Math.round(100*completed/checks.length);
 const html=heading('DAYCARE SETUP','Your school launch checklist','A guided path from the first classroom to the first happy update home.')+
 '<div class="bp-setup-hero"><div><span class="bp-overline">WELCOME TO BRIGHTPATH</span><h2>'+e(schools[0]?.name||'Your daycare')+'</h2><p>Set up your school at your own pace. We’ll keep track of what is already in place.</p><div class="bp-setup-progress"><div style="width:'+pct+'%"></div></div><strong>'+completed+' of '+checks.length+' steps completed · '+pct+'%</strong></div><div class="bp-setup-illustration" aria-hidden="true">🧸<span>✦</span></div></div>'+
 '<div class="bp-setup-grid">'+checks.map(c=>'<article class="bp-setup-step '+(c.done?'bp-setup-done':'')+'"><div class="bp-setup-step-icon">'+c.icon+'</div>'+
 '<div class="bp-setup-step-copy"><div class="bp-setup-step-top"><span>STEP '+c.id+'</span>'+pill(c.done?'Completed':'To do',c.done?'green':'amber')+'</div>'+
 '<h3>'+e(c.label)+'</h3><p>'+e(c.desc)+'</p><button class="mw-btn mw-btn-outline" type="button" data-setup-go="'+c.tab+'">'+e(c.cta)+' ↗</button></div></article>').join('')+'</div>'+
 box('Before you invite real families','<div class="bp-care-safety-guide"><div>🔐 <b>Check permissions</b><p>Verify accounts, classroom assignments, guardian relationships and photo consent.</p></div>'+
 '<div>☎️ <b>Complete emergency information</b><p>Ensure contact details and care instructions have been confirmed by the family.</p></div>'+
 '<div>🧪 <b>Test actual workflows</b><p>Run a real parent–teacher–admin test before adding children’s sensitive information. Payments and email/SMS delivery are not active.</p></div>'+
 '<div>💊 <b>Medication plans when needed</b><p>Families authorize plans in writing; an administrator verifies each plan before trained staff record administration.</p><button type="button" data-setup-go="medications" class="mw-btn mw-btn-outline">Medication safety ↗</button></div>'+
 '<div>🔐 <b>Family privacy</b><p>Review requests for access, correction and retention with documented safeguards.</p><button type="button" data-setup-go="privacy" class="mw-btn mw-btn-outline">Privacy center ↗</button></div></div>');
 return{html,bind(){document.querySelectorAll('[data-setup-go]').forEach(b=>b.onclick=()=>go(b.dataset.setupGo))}};
}
