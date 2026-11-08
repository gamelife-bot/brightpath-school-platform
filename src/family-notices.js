import {escapeHtml as e,dateLabel,stat,box,empty,pill,field,input,select,textarea,button,heading,option,read,rpc,form,notice,v} from './workspace-core.js';
const TYPES={
 absence:['🏡','Child absent','My child will be absent'],
 late_arrival:['🕗','Late arrival','My child will arrive later than usual'],
 early_pickup:['🎒','Early pickup','I plan to collect my child early'],
 care_change:['🧸','Change to daily routine','I need to update today’s care instructions'],
 other:['💌','Another notice','I need to tell School Administration something']
};
const localToday=()=>new Date(Date.now()-new Date().getTimezoneOffset()*60000).toISOString().slice(0,10);
const fineDate=s=>s?dateLabel(s):'—';
export async function renderFamilyNotices(ctx){
 const {db,role,schoolId:sid,user,reload}=ctx,admin=role==='school_admin';
 if(!admin&&role!=='parent')return{html:heading('Family notices','Unavailable','This section is for parents and school administrators.')};
 const [items,kids,profiles]=await Promise.all([
  read(db,'bp_family_notices',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(200)),
  read(db,'bp_students',q=>q.eq('school_id',sid)),
  admin?read(db,'bp_profiles'):Promise.resolve([])
 ]);
 const people=new Map(profiles.map(p=>[p.user_id,p.full_name||p.email]));
 const byChild=id=>kids.find(k=>k.id===id)?.full_name||'Child';
 const pending=items.filter(x=>x.status==='submitted');
 const label=(entry)=>{
  const type=TYPES[entry.notice_type]||TYPES.other;
  const detail=entry.start_date===entry.end_date?fineDate(entry.start_date):fineDate(entry.start_date)+' – '+fineDate(entry.end_date);
  return '<article class="bp-family-notice">'+
   '<div class="bp-family-notice-header"><span class="bp-family-notice-emoji">'+type[0]+'</span>'+
   '<div><strong>'+e(type[1])+'</strong><small>'+e(byChild(entry.student_id))+(admin?' · '+e(people.get(entry.parent_user_id)||'Parent'):'')+'</small><small>'+e(detail)+'</small></div>'+
   pill(entry.status==='submitted'?'Needs review':'Acknowledged',entry.status==='submitted'?'amber':'green')+'</div>'+
   (entry.note?'<p>'+e(entry.note)+'</p>':'')+
   (entry.admin_response?'<div class="bp-family-response"><strong>School Administration replied:</strong><p>'+e(entry.admin_response)+'</p></div>':'')+
   (admin&&entry.status==='submitted'?'<form class="bp-family-response-form" data-family-ack="'+e(entry.id)+'">'+
    field('Optional school response',textarea('bp-family-reply-'+entry.id,'e.g. Thank you, we have noted your child’s absence.','maxlength="700"'))+
    button('Acknowledge notice','bp-family-ack-'+entry.id,'primary','type="submit"')+'</form>':'')+'</article>';
 };
 const today=localToday();
 const html=heading('SCHOOL DAY COMMUNICATION',admin?'Parent notices':'Notify your school',
  admin?'Review absences, late arrivals, pickup changes and family notices.':'Tell School Administration about a planned absence, late arrival or change in routine.')+
 '<div class="mw-metrics">'+stat(admin?'Notices to review':'My notices',admin?pending.length:items.length,'💌','amber')+
 stat('Acknowledged',items.filter(x=>x.status==='acknowledged').length,'✓','teal')+'</div>'+
 (!admin?box('Send a school-day notice',
  '<form class="mw-form" id="bp-family-notice-form">'+
  field('Child',select('bp-family-child','<option value="">Choose your child</option>'+kids.map(k=>option(k.id,k.full_name)).join(''),'required'))+
  field('Notice type',select('bp-family-type',Object.entries(TYPES).map(([id,entry])=>option(id,entry[0]+' '+entry[1])).join('')))+
  '<div class="bp-family-date-grid">'+field('First day','<input type="date" id="bp-family-start" value="'+today+'" required>')+
  field('Last day','<input type="date" id="bp-family-end" value="'+today+'" required>')+'</div>'+
  field('Details for the school',textarea('bp-family-note','Add the time or any other practical details staff should know…','maxlength="700"'))+
  '<div class="bp-private-hint">Sending a notice does not automatically mark attendance or authorize pickup changes. Contact the school directly for urgent matters.</div>'+
  button('Send notice to School Administration','bp-family-notice-send','primary','type="submit" '+(!kids.length?'disabled':''))+'</form>'):'')+
 box(admin?'Notices awaiting acknowledgment':'My school-day notices',
 items.length?'<div class="bp-family-notice-list">'+items.map(label).join('')+'</div>':
 empty('💛',admin?'No notices received':'No notices submitted yet',admin?
 'When parents send absence or care notices, they will appear here.':'Your school-day notices and responses appear here.'));
 return{html,bind(){
  if(!admin){
   const start=document.getElementById('bp-family-start'),end=document.getElementById('bp-family-end');
   if(start&&end)start.onchange=()=>{if(end.value<start.value)end.value=start.value;};
   form('bp-family-notice-form',async()=>{
    const id=v('bp-family-child');
    if(!kids.some(k=>k.id===id))throw Error('Choose a linked child');
    if(v('bp-family-end')<v('bp-family-start'))throw Error('End date must be on or after the start date');
    const result=await rpc(db,'bp_submit_family_notice',{p_school:sid,p_child:id,p_kind:v('bp-family-type'),
     p_start:v('bp-family-start'),p_end:v('bp-family-end'),p_note:v('bp-family-note')});
    if(!result.ok||!result.notice_id)throw Error('The notice was not confirmed. Please check before submitting again.');
    notice('Your school has received the notice');await reload();
   });
  }else{
   document.querySelectorAll('[data-family-ack]').forEach(f=>f.onsubmit=async ev=>{
    ev.preventDefault();const btn=f.querySelector('[type="submit"]');btn.disabled=true;
    try{
     const result=await rpc(db,'bp_acknowledge_family_notice',{p_notice:f.dataset.familyAck,p_response:v('bp-family-reply-'+f.dataset.familyAck)});
     if(!result.ok)throw Error('Acknowledgment was not confirmed');
     notice('Parent notice acknowledged');await reload();
    }catch(err){notice(err.message,'error');btn.disabled=false;}
   });
  }
 }};
}
