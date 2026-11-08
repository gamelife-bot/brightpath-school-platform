import {escapeHtml as e,numberLabel as n,dateLabel,initial,stat,box,empty,pill,field,input,select,textarea,button,heading,table,tr,option,read,rpc,form,notice,v} from './workspace-core.js';

/**
 * School-admin approvals: teachers and parents have separate, visible
 * approval queues. Approval is executed only by the server-side RPC.
 */
export async function renderSchoolApprovals(ctx,kind){
 const {db,schoolId:sid,reload,go}=ctx;
 const isTeacher=kind==='teacher',role=isTeacher?'teacher':'parent';
 let approvalQueueError=null;
 const [requests,members,profiles,classes,students,links,assignments]=await Promise.all([
  rpc(db,'bp_school_request_queue',{p_school:sid,p_role:role}).catch(async err=>{
   try{return await read(db,'bp_access_requests',q=>q.eq('school_id',sid).eq('requested_role',role).order('requested_at',{ascending:false}).limit(150))}
   catch(fallbackErr){approvalQueueError=fallbackErr;return []}
  }),
  read(db,'bp_memberships',q=>q.eq('school_id',sid).eq('role',role)),
  read(db,'bp_profiles'),
  read(db,'bp_classes',q=>q.eq('school_id',sid).order('name')),
  read(db,'bp_students',q=>q.eq('school_id',sid).order('full_name')),
  read(db,'bp_parent_links',q=>q.eq('school_id',sid)),
  read(db,'bp_teacher_classes',q=>q.eq('school_id',sid))
 ]);
 const profilesById=new Map(profiles.map(p=>[p.user_id,p]));
 const pending=requests.filter(x=>x.status==='pending');
 const active=members.filter(x=>x.active);
 const title=isTeacher?'Teacher approvals':'Parent approvals';
 const noun=isTeacher?'teacher':'parent';
 const specific=isTeacher?
  'Review teaching accounts and assign approved staff to classes.':
  'Review parent accounts and connect verified guardians to their children.';
 const requestTable=approvalQueueError?empty('◷','Approval requests temporarily unavailable','Please refresh this page to retry.'):
 pending.length?table(['Applicant','Request date','Decision'],
  pending.map(r=>tr([
   '<span class="mw-identity"><span class="mw-round-icon">'+initial(r.requester_name)+'</span><span><b>'+e(r.requester_name)+'</b><small>'+e(r.requester_email)+'</small></span></span>',
   dateLabel(r.requested_at),
   '<div class="mw-approval-buttons">'+button('Approve','mw-approve-'+r.id,'primary','data-request-id="'+e(r.id)+'" data-decision="approved"')+
   button('Reject','mw-reject-'+r.id,'danger','data-request-id="'+e(r.id)+'" data-decision="rejected"')+'</div>'
  ]))):empty(isTeacher?'👩‍🏫':'💛','No pending '+(isTeacher?'teacher':'parent')+' requests',
   'New applications will appear here as soon as '+(isTeacher?'teachers':'parents')+' request access to this school.');
 const statusRows=active.map(m=>{
  const p=profilesById.get(m.user_id);
  const detail=isTeacher?
   assignments.filter(x=>x.teacher_user_id===m.user_id).map(a=>classes.find(c=>c.id===a.class_id)?.name).filter(Boolean).join(', '):
   links.filter(l=>l.parent_user_id===m.user_id).map(l=>students.find(s=>s.id===l.student_id)?.full_name).filter(Boolean).join(', ');
  return tr([
   '<span class="mw-identity"><span class="mw-round-icon">'+initial(p?.full_name||p?.email)+'</span><span><b>'+e(p?.full_name||'School member')+'</b><small>'+e(p?.email||'')+'</small></span></span>',
   detail?e(detail):pill(isTeacher?'Class not assigned':'Child not linked','amber'),
   pill('Approved','green')
  ]);
 });
 const reviewed=requests.filter(r=>r.status!=='pending').slice(0,20);
 const html=heading('SCHOOL ACCOUNTS',title,specific)+
 (approvalQueueError?'<div class="mw-inline mw-inline-error">Unable to read the approval queue. You can still approve registered accounts below by email.</div>':'')+
 '<div class="mw-metrics">'+stat('Pending approval',approvalQueueError?'—':n(pending.length),'◷','amber')+
 stat('Approved '+(isTeacher?'teachers':'parents'),n(active.length),isTeacher?'👩‍🏫':'💛','teal')+
 stat(isTeacher?'Assigned classrooms':'Verified family links',n(isTeacher?assignments.length:links.length),isTeacher?'📚':'♡','blue')+'</div>'+
 box('Waiting for approval '+(pending.length?'<span class="mw-count">'+pending.length+'</span>':''),
 '<div class="bp-approval-refresh"><span>Applications submitted to this school</span>'+button('↻ Refresh requests','mw-refresh-approvals','outline')+'</div>'+requestTable)+
 '<div class="mw-two mw-two-side">'+
 box('Approve by registered email',
 '<form class="mw-form" id="mw-direct-approve">'+
  field(isTeacher?'Teacher email':'Parent email',input('mw-approve-email',isTeacher?'teacher@school.edu':'parent@email.com','email','required'))+
  '<p class="mw-fine">Use this when the person has already registered and verified their BrightPath account.</p>'+
  button('Approve '+noun,'mw-direct-approve-button','primary','type="submit"')+'</form>')+
 box(isTeacher?'Assign an approved teacher':'Connect an approved parent',
 isTeacher?
  '<form id="mw-approve-class-form" class="mw-form">'+
  field('Approved teacher',select('mw-assign-person','<option value="">Choose a teacher</option>'+active.map(m=>option(profilesById.get(m.user_id)?.email||'',profilesById.get(m.user_id)?.full_name||profilesById.get(m.user_id)?.email||'Teacher')).join(''),'required'))+
  field('Class',select('mw-assign-class','<option value="">Choose a class</option>'+classes.map(c=>option(c.id,c.name)).join(''),'required'))+
  button('Assign to class','mw-approve-class-button','primary','type="submit" '+(!active.length||!classes.length?'disabled':''))+'</form>':
  '<form id="mw-approve-family-form" class="mw-form">'+
  field('Approved parent',select('mw-link-person','<option value="">Choose a parent</option>'+active.map(m=>option(profilesById.get(m.user_id)?.email||'',profilesById.get(m.user_id)?.full_name||profilesById.get(m.user_id)?.email||'Parent')).join(''),'required'))+
  field('Student',select('mw-link-child','<option value="">Choose a student</option>'+students.map(s=>option(s.id,s.full_name)).join(''),'required'))+
  '<label class="mw-check-label"><input id="mw-approve-guardian-confirmed" type="checkbox" required><span>I have verified the parent’s or guardian’s identity and authority to access this student.</span></label>'+
  field('Independent verification record',textarea('mw-approve-guardian-proof','Record how guardian authority was checked. Do not store ID numbers in this field.','required minlength="12" maxlength="700"'))+
  button('Link parent and child','mw-approve-family-button','primary','type="submit" '+(!active.length||!students.length?'disabled':''))+'</form>')+'</div>'+
 box(isTeacher?'Approved teachers':'Approved parents',
  statusRows.length?table(['Member',isTeacher?'Assigned classes':'Linked children','Status'],statusRows):
   empty(isTeacher?'📚':'♡','No approved accounts yet','Approve your first '+noun+' above.'))+
 box('Review history',reviewed.length?table(['Applicant','Submitted','Decision','Reviewed'],reviewed.map(r=>tr([
  '<b>'+e(r.requester_name)+'</b><br><small>'+e(r.requester_email)+'</small>',
  dateLabel(r.requested_at),
  pill(r.status,r.status==='approved'?'green':'red'),
  dateLabel(r.reviewed_at)
 ]))):empty('✓','No previous decisions','Your approval history will appear here.'));
 return {html,bind(){
  const refresh=document.getElementById('mw-refresh-approvals');
  if(refresh)refresh.onclick=async()=>{refresh.disabled=true;refresh.textContent='Checking…';await reload()};
  document.querySelectorAll('[data-request-id]').forEach(btn=>btn.addEventListener('click',async()=>{
   const decision=btn.dataset.decision;
   if(!confirm(decision==='approved'?
    'Approve this '+noun+' account for your school?'+(!isTeacher?' You must separately verify the guardian before linking any child.':''):
    'Reject this '+noun+' access request?'))return;
   btn.disabled=true;
   try{await rpc(db,'bp_review_school_access',{p_request:btn.dataset.requestId,p_decision:decision});
    notice('Request '+(decision==='approved'?'approved':'rejected'));await reload();
   }catch(err){notice(err.message||String(err),'error');btn.disabled=false}
  }));
  form('mw-direct-approve',async()=>{
   await rpc(db,'bp_grant_role',{p_school:sid,p_email:v('mw-approve-email'),p_role:role});
   await reload();
  });
  if(isTeacher){
   form('mw-approve-class-form',async()=>{
    await rpc(db,'bp_assign_teacher',{p_school:sid,p_class:v('mw-assign-class'),p_email:v('mw-assign-person')});await reload();
   });
  }else{
   form('mw-approve-family-form',async()=>{
    if(!document.getElementById('mw-approve-guardian-confirmed').checked)throw Error('Confirm guardian identity and authority first');
    await rpc(db,'bp_verified_link_parent',{p_school:sid,p_student:v('mw-link-child'),p_email:v('mw-link-person'),p_verification_ref:v('mw-approve-guardian-proof')});await reload();
   });
  }
 }};
}
