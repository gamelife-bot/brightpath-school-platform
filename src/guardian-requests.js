import {escapeHtml as e,dateLabel,stat,box,empty,pill,field,input,select,textarea,button,heading,option,read,rpc,form,notice,v,checked} from './workspace-core.js';

const TYPES={add_guardian:['💛','Add approved guardian'],remove_guardian:['🔐','Remove guardian access'],correct_details:['📝','Correct guardian details']};
export async function renderGuardianChanges(ctx){
 const {db,schoolId:sid,role,user,reload,go}=ctx,admin=role==='school_admin';
 const [requests,children,profiles,links]=await Promise.all([
  read(db,'bp_guardian_change_requests',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(200)),
  read(db,'bp_students',q=>q.eq('school_id',sid)),
  admin?read(db,'bp_profiles'):Promise.resolve([]),
  read(db,'bp_parent_links',q=>q.eq('school_id',sid))
 ]);
 const name=id=>children.find(x=>x.id===id)?.full_name||'Child';
 const person=id=>profiles.find(x=>x.user_id===id)?.full_name||'Parent account';
 const pending=requests.filter(x=>x.status==='pending').length;
 const html=heading('SAFE FAMILY ACCESS',admin?'Guardian verification requests':'Request a guardian change',
  'Changes to a child’s family account require identity checks and School Administration approval.')+
 '<div class="bp-staff-notice">🔐 <b>Access stays protected.</b> Submitting a request does not add or remove any guardian. School Administration must independently verify identity, authority and the child relationship before approving. Every link or unlink is logged.</div>'+
 '<div class="mw-metrics">'+stat('Requests',requests.length,'💌','teal')+stat('Awaiting review',pending,'🕵️','amber')+'</div>'+
 (!admin?box('Ask for a guardian-access change',
 '<form class="mw-form" id="bp-guardian-request">'+
 field('Child',select('bp-guardian-child','<option value="">Choose a child</option>'+children.map(c=>option(c.id,c.full_name)).join(''),'required'))+
 field('Request type',select('bp-guardian-action',Object.entries(TYPES).map(([k,v])=>option(k,v[0]+' '+v[1])).join('')))+
 field('Guardian account email',input('bp-guardian-email','guardian@example.com','email','required maxlength="255"'))+
 field('Reason for this change',textarea('bp-guardian-reason','Describe the family relationship and what needs to change.','required minlength="8" maxlength="1200"'))+
 '<p class="bp-private-hint">For new guardian access, the person must first have an approved parent account at this school. Sensitive guardianship disputes require direct school review.</p>'+
 button('Submit change request','bp-guardian-submit','primary','type="submit" '+(!children.length?'disabled':''))+'</form>'):'')+
 box(admin?'Review family access requests':'Guardian request history',
 requests.length?'<div class="bp-request-grid">'+requests.map(req=>
 '<article class="bp-guard-request"><div class="bp-request-head"><span>'+e(TYPES[req.change_type]?.[0]||'🔐')+'</span><div><h3>'+e(TYPES[req.change_type]?.[1]||req.change_type)+'</h3>'+
  '<small>'+e(name(req.student_id))+' · '+dateLabel(req.created_at)+'</small>'+
  (admin?'<small>From '+e(person(req.requester_user_id))+'</small>':'')+'</div>'+
  pill(req.status,req.status==='approved'?'green':req.status==='declined'?'red':'amber')+'</div>'+
  '<p><b>Guardian email:</b> '+e(req.target_email)+'</p><p>'+e(req.reason)+'</p>'+
  (req.status!=='pending'&&req.verification_reference?'<div class="bp-private-hint">School review reference: '+e(req.verification_reference)+'</div>':'')+
  (admin&&req.status==='pending'?'<form class="mw-form bp-guardian-review" data-guardian-review="'+e(req.id)+'">'+
  field('Verification reference (required to approve)',
   textarea('bp-guardian-proof-'+req.id,'Describe the independent verification method and date; do not enter ID numbers.','maxlength="700"'))+
  '<label class="mw-check-label"><input type="checkbox" id="bp-guardian-checked-'+req.id+'"><span>I independently verified this person’s identity, relationship and authority to access this child.</span></label>'+
  '<div class="bp-review-actions">'+button('Approve and apply','bp-guardian-approve-'+req.id,'primary','type="button" data-guardian-decision="'+e(req.id)+'" data-guardian-approve="true"')+
   button('Decline','bp-guardian-decline-'+req.id,'outline','type="button" data-guardian-decision="'+e(req.id)+'" data-guardian-approve="false"')+'</div></form>':'')+'</article>').join('')+'</div>':
 empty('💛','No changes requested',admin?'Parent requests for guardian access will appear here.':'Ask your school to add, remove or correct a guardian account.'))+
 (admin?box('Current family connections','<div class="bp-care-safety-guide"><div>👨‍👩‍👧 <b>'+links.length+' verified child–guardian links</b>'+
 '<p>Manage existing accounts in the Guardian links section. Direct access changes are audited.</p>'+
 button('Open guardian links','bp-guardian-open-links','outline')+'</div></div>'):'');
 return {html,bind(){
  if(!admin)form('bp-guardian-request',async()=>{
   const id=v('bp-guardian-child');if(!children.some(c=>c.id===id))throw Error('Choose a verified linked child');
   const r=await rpc(db,'bp_request_guardian_change',{p_school:sid,p_child:id,
    p_action:v('bp-guardian-action'),p_email:v('bp-guardian-email'),p_reason:v('bp-guardian-reason')});
   if(!r.ok||!r.request_id)throw Error('The request was not confirmed');await reload();
  });
  if(admin){
   document.getElementById('bp-guardian-open-links').onclick=()=>go('families');
   document.querySelectorAll('[data-guardian-decision]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.guardianDecision,approval=b.dataset.guardianApprove==='true',proof=v('bp-guardian-proof-'+id);
    if(approval&&(!checked('bp-guardian-checked-'+id)||proof.length<12))return notice('Confirm the independent verification and record the reference','error');
    if(!confirm(approval?'Apply this guardian-access change after verifying authority?':'Decline this guardian request?'))return;
    b.disabled=true;try{
     const r=await rpc(db,'bp_review_guardian_change',{p_request:id,p_approve:approval,p_verification_ref:proof});
     if(!r.ok)throw Error('Review was not confirmed');notice('Guardian request reviewed');await reload();
    }catch(err){notice(err.message,'error');b.disabled=false}
   });
  }
 }};
}
