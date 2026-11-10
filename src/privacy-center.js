import {schoolDay} from './school-day.js';
import {escapeHtml as e,dateLabel,stat,box,empty,pill,field,input,select,textarea,button,heading,option,read,rpc,form,notice,v} from './workspace-core.js';

const TYPES={access:['📁','Access or copy of records'],correction:['✏️','Correct inaccurate information'],deletion:['🧹','Request deletion / retention review'],consent:['🔐','Privacy or consent concern']};
export async function renderPrivacyCenter(ctx){
 const {db,schoolId:sid,role,user,reload}=ctx,admin=role==='school_admin';
 const [requests,children,guardianAudit,childAudit,profiles]=await Promise.all([
  read(db,'bp_privacy_requests',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(180)),
  read(db,'bp_students',q=>q.eq('school_id',sid)),
  admin?read(db,'bp_guardian_link_audit',q=>q.eq('school_id',sid).order('at',{ascending:false}).limit(100)):Promise.resolve([]),
  admin?read(db,'bp_child_record_audit',q=>q.eq('school_id',sid).order('changed_at',{ascending:false}).limit(100)):Promise.resolve([]),
  admin?read(db,'bp_profiles'):Promise.resolve([])
 ]);
 const byName=id=>children.find(c=>c.id===id)?.full_name||'School-wide account request';
 const byUser=id=>profiles.find(p=>p.user_id===id)?.full_name||'Parent account';
 const pending=requests.filter(x=>x.status==='pending'||x.status==='in_review').length;
 const html=heading('DATA SAFETY','Privacy & family records',
  admin?'Review data access requests, corrections and account permissions.':'Access your child’s records and request a correction, data copy, or a privacy review.')+
 '<div class="bp-privacy-promise"><span>🛡️</span><div><strong>Child information belongs in trusted hands.</strong><p>Only linked parents and authorized school staff may access a child’s private records. Formal deletion and retention requests are reviewed by the school; they do not automatically erase safeguarding, attendance or care records.</p></div></div>'+
 '<div class="mw-metrics">'+stat('Privacy requests',requests.length,'📬','teal')+
 stat('Awaiting action',pending,'🔐','amber')+(admin?stat('Recent access changes',guardianAudit.length,'👨‍👩‍👧','blue'):'')+'</div>'+
 (!admin?box('Download a copy of your child’s records',
  '<div class="bp-export-panel"><span>📄</span><div><strong>Private family record export</strong><p>Download a JSON record of child details, care notes, attendance, milestones, incident summaries and media captions. Photos and videos themselves are not included.</p></div></div>'+
  '<div class="mw-form bp-export-row">'+field('Child',select('bp-export-child','<option value="">Select your child</option>'+children.map(k=>option(k.id,k.full_name)).join('')))+
  button('Download private record','bp-export-now','primary','type="button" '+(!children.length?'disabled':''))+'</div>'+
  '<p class="bp-private-hint">The file may contain sensitive child information. Store it securely, avoid sharing it publicly and delete unneeded copies.</p>')+
 box('Ask your school to review a privacy request',
 '<form class="mw-form" id="bp-privacy-form">'+
 field('Request type',select('bp-privacy-type',Object.entries(TYPES).map(([key,r])=>option(key,r[0]+' '+r[1])).join('')))+
 field('Child (optional)',select('bp-privacy-child','<option value="">General account or school concern</option>'+children.map(k=>option(k.id,k.full_name)).join('')))+
 field('What should the school review?',textarea('bp-privacy-details','Be specific about the information, correction or requested action.','required minlength="8" maxlength="1800"'))+
 '<p class="bp-private-hint">If you want information corrected urgently, also contact School Administration directly.</p>'+
 button('Submit privacy request','bp-privacy-submit','primary','type="submit"')+'</form>'):'')+
 box(admin?'Family privacy request queue':'My requests',
 requests.length?'<div class="bp-privacy-list">'+requests.map(r=>
 '<article class="bp-privacy-item"><div class="bp-request-head"><span>'+e(TYPES[r.request_type]?.[0]||'🔐')+'</span><div><h3>'+e(TYPES[r.request_type]?.[1]||r.request_type)+'</h3><small>'+e(byName(r.student_id))+
  (admin?' · '+e(byUser(r.requester_user_id)):'')+' · '+dateLabel(r.created_at)+'</small></div>'+
  pill(r.status,r.status==='completed'?'green':r.status==='declined'?'red':'amber')+'</div>'+
  '<p>'+e(r.details)+'</p>'+
  (r.school_reply?'<div class="bp-family-response"><strong>School response:</strong><p>'+e(r.school_reply)+'</p></div>':'')+
  (admin?'<form class="mw-form bp-privacy-review" data-privacy-review="'+e(r.id)+'">'+
   field('Review stage',select('bp-privacy-status-'+r.id,['pending','in_review','completed','declined'].map(s=>
    '<option value="'+s+'"'+(r.status===s?' selected':'')+'>'+s.replace('_',' ')+'</option>').join('')))+
   field('Response for the family',textarea('bp-privacy-reply-'+r.id,'Describe what was reviewed or corrected. Never mark deletion complete if records still exist.','maxlength="1500"'))+
   '<p class="bp-private-hint">Completing a privacy request changes its status only. It does not automatically delete records or change consent.</p>'+
   button('Save review','bp-privacy-review-'+r.id,'primary','type="submit"')+'</form>':'')+'</article>').join('')+'</div>':
 empty('🔐','No privacy requests yet',admin?'Parent requests will be listed here for review.':'Your privacy requests and school responses will appear here.'))+
 (admin?box('Security change audit',
 '<div class="bp-audit-columns"><div><h3>Guardian account changes</h3>'+
 (guardianAudit.length?guardianAudit.slice(0,20).map(a=>'<div class="bp-audit-row"><b>'+e(a.change_type)+'</b><small>'+e(byName(a.student_id))+' · '+dateLabel(a.at)+'</small></div>').join(''):
 empty('👨‍👩‍👧','No link changes logged','Future guardian link changes are audited here.'))+'</div>'+
 '<div><h3>Child care profile changes</h3>'+
 (childAudit.length?childAudit.slice(0,20).map(a=>'<div class="bp-audit-row"><b>'+e(a.changed_fields?.join(', ')||'Record change')+'</b><small>'+e(byName(a.student_id))+' · '+dateLabel(a.changed_at)+'</small></div>').join(''):
 empty('🧸','No child profile edits logged','Future changes will record the changed field names without copying sensitive values.'))+'</div></div>'):'');
 return{html,bind(){
  if(!admin){
   form('bp-privacy-form',async()=>{
    const r=await rpc(db,'bp_submit_privacy_request',{p_school:sid,p_child:v('bp-privacy-child')||null,
      p_kind:v('bp-privacy-type'),p_details:v('bp-privacy-details')});
    if(!r.ok||!r.id)throw Error('School did not confirm the privacy request');await reload();
   });
   document.getElementById('bp-export-now').onclick=async()=>{
    const id=v('bp-export-child'),child=children.find(c=>c.id===id);
    if(!child)return notice('Choose a child before downloading','error');
    const btn=document.getElementById('bp-export-now');btn.disabled=true;
    try{
     const record=await rpc(db,'bp_export_child_record',{p_school:sid,p_child:id});
     if(!record?.child)throw Error('The server could not verify this child’s export');
     const blob=new Blob([JSON.stringify(record,null,2)],{type:'application/json;charset=utf-8'});
     const url=URL.createObjectURL(blob),link=document.createElement('a');
     link.href=url;link.download='BrightPath-child-record-'+id.slice(0,8)+'-'+schoolDay()+'.json';
     document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);
     notice('Private child record prepared');
    }catch(err){notice(err.message,'error')}finally{btn.disabled=false}
   };
  }else document.querySelectorAll('[data-privacy-review]').forEach(f=>f.onsubmit=async ev=>{
   ev.preventDefault();const btn=f.querySelector('[type="submit"]'),id=f.dataset.privacyReview;
   if(v('bp-privacy-status-'+id)==='pending')return notice('Choose a review stage','error');
   btn.disabled=true;
   try{
    const r=await rpc(db,'bp_review_privacy_request',{p_id:id,p_status:v('bp-privacy-status-'+id),p_reply:v('bp-privacy-reply-'+id)});
    if(!r.ok)throw Error('Review was not saved');await reload();
   }catch(err){notice(err.message,'error');btn.disabled=false}
  });
 }};
}
