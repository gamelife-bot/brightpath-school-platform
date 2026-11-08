import {escapeHtml as e,dateLabel,stat,box,empty,pill,field,input,select,textarea,button,heading,option,read,rpc,form,notice,v,checked} from './workspace-core.js';

const today=()=>new Date().toLocaleDateString('en-CA',{timeZone:'Africa/Nairobi'});
const formatDate=x=>new Date(x).toLocaleString('en-KE',{dateStyle:'medium',timeStyle:'short'});
const statusKind=s=>s==='approved'?'green':['revoked','declined'].includes(s)?'red':'amber';
export async function renderMedicationSafety(ctx){
 const {db,schoolId:sid,user,role,reload}=ctx,isAdmin=role==='school_admin',parent=role==='parent';
 const [plans,logs,children]=await Promise.all([
  read(db,'bp_medication_authorizations',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(200)),
  read(db,'bp_medication_logs',q=>q.eq('school_id',sid).order('administered_at',{ascending:false}).limit(200)),
  read(db,'bp_students',q=>q.eq('school_id',sid))
 ]);
 const named=id=>children.find(c=>c.id===id)?.full_name||'Child';
 const allowedParents=parent?plans.filter(m=>m.parent_user_id===user.id):plans;
 const pending=allowedParents.filter(p=>p.status==='pending').length;
 const assigned=allowedParents.filter(p=>p.status==='approved'&&p.start_date<=today()&&p.end_date>=today());
 const logsFor=plan=>logs.filter(l=>l.authorization_id===plan.id);
 const html=heading('SAFETY-FIRST CARE','Medication authorizations',
  parent?'Authorize written medication plans and review staff administration logs.':'Verify parent medication permissions and record what staff actually administered.')+
 '<div class="bp-med-warning"><span>🩺</span><div><strong>Do not use this software to determine medication, dose or treatment.</strong><p>Follow the child’s written guardian authorization, verified prescriber instructions and your school’s medication policy. Respond to emergencies directly. Digital records do not replace clinical orders, training or secure medicine storage.</p></div></div>'+
 '<div class="mw-metrics">'+stat('Medication plans',allowedParents.length,'💊','teal')+
  stat('Pending school review',pending,'📋','amber')+
  stat('Approved & in date',assigned.length,'✓','blue')+
  stat('Awaiting second check',logs.filter(l=>!l.witnessed_at).length,'🧑‍⚕️','violet')+'</div>'+
 (parent?box('Authorize a medication plan for your child',
  '<form class="mw-form" id="bp-med-request">'+
   field('Child',select('bp-med-child','<option value="">Choose a child</option>'+children.map(c=>option(c.id,c.full_name)).join(''),'required'))+
   field('Medication name — exactly as prescribed',input('bp-med-name','Full medication name','text','required minlength="2" maxlength="160"'))+
   field('Exact written dose and units',input('bp-med-dose','Copy prescription; do not guess or calculate','text','required minlength="2" maxlength="160"'))+
   field('Schedule & instructions',textarea('bp-med-instructions','When to administer, route, storage, side effects or special instructions from the written order…','required minlength="8" maxlength="1500"'))+
   '<div class="bp-family-date-grid">'+field('First day','<input id="bp-med-start" type="date" value="'+today()+'" required>')+
   field('Last day','<input id="bp-med-end" type="date" value="'+today()+'" required>')+'</div>'+
   '<label class="mw-check-label"><input id="bp-med-authorized" type="checkbox" required><span>I am an authorized guardian. These instructions come from an approved written order, and I authorize the school to consider them after its independent review.</span></label>'+
   '<p class="bp-private-hint">Submitting does not approve administration. Your school must verify guardian authority and prescriber instructions first.</p>'+
   button('Submit medication authorization','bp-med-request-submit','primary','type="submit" '+(!children.length?'disabled':''))+'</form>'):'')+
 box(isAdmin?'Medication review queue':parent?'My child’s medication plans':'Approved medication instructions',
 allowedParents.length?'<div class="bp-med-plans">'+allowedParents.map(p=>{
  const ownLogs=logsFor(p),canAdminister=!parent&&p.status==='approved'&&p.start_date<=today()&&p.end_date>=today();
  return '<article class="bp-med-plan"><div class="bp-med-plan-head"><span class="bp-med-pill">💊</span><div><h3>'+e(p.medication_name)+'</h3><small>'+e(named(p.student_id))+' · '+dateLabel(p.start_date)+' – '+dateLabel(p.end_date)+'</small></div>'+
    pill(p.status,statusKind(p.status))+'</div>'+
   '<div class="bp-med-instructions"><div><small>Authorized written dose</small><strong>'+e(p.prescribed_dose)+'</strong></div>'+
   '<div><small>Schedule & instructions</small><p>'+e(p.schedule_instructions)+'</p></div></div>'+
   (p.school_review_note?'<div class="bp-private-hint"><b>School review:</b> '+e(p.school_review_note)+'</div>':'')+
   (isAdmin&&p.status==='pending'?'<form class="mw-form bp-med-review" data-med-review="'+e(p.id)+'">'+
    field('Verified order reference',input('bp-med-proof-'+p.id,'Describe how parent consent and the written prescriber order were verified','text','maxlength="500"'))+
    field('School review notes',textarea('bp-med-note-'+p.id,'Required handling, storage, trained staff, concerns…','maxlength="1000"'))+
    '<label class="mw-check-label"><input type="checkbox" id="bp-med-confirm-'+p.id+'"><span>I verified the guardian’s authority and the prescriber’s written instructions. Appropriate trained staff and safe storage are available.</span></label>'+
    '<div class="bp-review-actions">'+button('Approve verified plan','bp-med-approve-'+p.id,'primary','data-med-review-action="'+e(p.id)+'" data-med-approve="true" type="button"')+
     button('Decline / request revision','bp-med-decline-'+p.id,'outline','data-med-review-action="'+e(p.id)+'" data-med-approve="false" type="button"')+'</div></form>':'')+
   ((parent&&p.parent_user_id===user.id||isAdmin)&&['pending','approved'].includes(p.status)?
    button('Revoke authorization','bp-med-revoke-'+p.id,'danger','data-med-revoke="'+e(p.id)+'" type="button"'):'')+
   (canAdminister?'<form class="mw-form bp-med-administer" data-med-administer="'+e(p.id)+'">'+
    '<h4>Record administration</h4>'+
    field('Exact dose administered',input('bp-med-given-'+p.id,'Type exact authorized dose above','text','required minlength="2" maxlength="160"'))+
    field('Staff observation / notes',textarea('bp-med-admin-notes-'+p.id,'What was actually administered; any relevant observation.','maxlength="1000"'))+
    '<label class="mw-check-label"><input type="checkbox" id="bp-med-given-confirm-'+p.id+'" required><span>Medication has already been administered by authorized staff according to the verified written plan. This records the completed action.</span></label>'+
    button('Record completed administration','bp-med-log-'+p.id,'primary','type="submit"')+'</form>':'')+
   '<div class="bp-med-logs"><b>Administration records ('+ownLogs.length+')</b>'+
    (ownLogs.length?ownLogs.map(l=>'<div class="bp-med-log"><span>📝</span><div><strong>'+e(l.dose_given)+'</strong><small>'+
      formatDate(l.administered_at)+' · '+(l.witnessed_at?'Second-checked':'Awaiting second staff check')+'</small>'+
      (l.note?'<p>'+e(l.note)+'</p>':'')+'</div>'+
      (!parent&&!l.witnessed_at&&l.administered_by!==user.id?
        button('Second check','bp-med-witness-'+l.id,'outline','data-med-witness="'+e(l.id)+'" type="button"'):'')+'</div>').join(''):
    '<p>No administration has been recorded for this plan.</p>')+'</div></article>';
 }).join('')+'</div>':
 empty('💊','No medication plans yet',parent?'Submit a plan only when the child needs medication and has a written order.':'Parents will submit medication authorizations here for review.'))+
 box('Medication safety checks','<div class="bp-care-safety-guide"><div>🔐 <b>Parent consent</b><p>Only the child’s verified guardian may submit an authorization.</p></div>'+
 '<div>📋 <b>School verification</b><p>School administrators independently review the parent and written clinical order before approving.</p></div>'+
 '<div>🍎 <b>Staff administration & second check</b><p>Only assigned staff can log an administered dose. A different authorized staff account must second-check the record.</p></div></div>');
 return{html,bind(){
  if(parent)form('bp-med-request',async()=>{
   if(!checked('bp-med-authorized'))throw Error('Explicit guardian authorization required');
   const child=v('bp-med-child');if(!children.some(c=>c.id===child))throw Error('Choose your child');
   const r=await rpc(db,'bp_authorize_medication',{p_school:sid,p_child:child,p_name:v('bp-med-name'),p_dose:v('bp-med-dose'),
     p_instructions:v('bp-med-instructions'),p_start:v('bp-med-start'),p_end:v('bp-med-end'),p_authorized:true});
   if(!r.ok||!r.id)throw Error('Medication request was not confirmed');notice('School review requested');await reload();
  });
  if(isAdmin)document.querySelectorAll('[data-med-review-action]').forEach(b=>b.onclick=async()=>{
   const id=b.dataset.medReviewAction,approve=b.dataset.medApprove==='true',proof=v('bp-med-proof-'+id);
   if(approve&&(!checked('bp-med-confirm-'+id)||proof.length<12))return notice('Confirm written order verification and enter the reference','error');
   if(!confirm(approve?'Approve this medication plan after independent verification?':'Decline this medication plan?'))return;
   b.disabled=true;try{
    const r=await rpc(db,'bp_review_medication',{p_id:id,p_approve:approve,p_instruction_reference:proof,p_note:v('bp-med-note-'+id)});
    if(!r.ok)throw Error('Review not confirmed');await reload();
   }catch(err){notice(err.message,'error');b.disabled=false}
  });
  document.querySelectorAll('[data-med-revoke]').forEach(b=>b.onclick=async()=>{
   if(!confirm('Revoke this authorization? Staff must immediately stop using this plan.'))return;
   b.disabled=true;try{const r=await rpc(db,'bp_revoke_medication',{p_id:b.dataset.medRevoke});if(!r.ok)throw Error('Revocation not confirmed');await reload();}
   catch(err){notice(err.message,'error');b.disabled=false}
  });
  if(!parent){
   document.querySelectorAll('[data-med-administer]').forEach(f=>form(f.id||((f.id='bp-med-form-'+f.dataset.medAdminister),f.id),async()=>{
    const id=f.dataset.medAdminister;if(!checked('bp-med-given-confirm-'+id))throw Error('Confirm this was actually administered');
    const r=await rpc(db,'bp_record_medication',{p_authorization:id,p_actual_dose:v('bp-med-given-'+id),p_note:v('bp-med-admin-notes-'+id)});
    if(!r.ok||!r.log_id)throw Error('Administration record not confirmed');notice('Recorded. Second staff check required.');await reload();
   }));
   document.querySelectorAll('[data-med-witness]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Confirm you independently checked this medication administration record?'))return;
    b.disabled=true;try{const r=await rpc(db,'bp_witness_medication',{p_log:b.dataset.medWitness});if(!r.ok)throw Error('Second check not confirmed');await reload();}
    catch(err){notice(err.message,'error');b.disabled=false}
   });
  }
 }};
}
