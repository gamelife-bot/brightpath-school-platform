import {escapeHtml as h,dateLabel,stat,box,empty,pill,field,input,select,textarea,button,heading,table,tr,option,read,write,update,rpc,form,click,notice,v,checked} from './workspace-core.js';

const label={check_in:'Checked in',check_out:'Picked up'};
const SCHOOL_TZ='Africa/Nairobi';
const schoolDay=(value=new Date())=>{
 const pieces=new Intl.DateTimeFormat('en-GB',{timeZone:SCHOOL_TZ,day:'2-digit',month:'2-digit',year:'numeric'}).formatToParts(new Date(value));
 const parts=Object.fromEntries(pieces.map(x=>[x.type,x.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
};
const time=iso=>new Date(iso).toLocaleString('en-KE',{dateStyle:'medium',timeStyle:'short',timeZone:SCHOOL_TZ});
const childOpts=kids=>'<option value="">Choose a child</option>'+kids.map(c=>option(c.id,c.full_name)).join('');
export async function renderPickupDesk(ctx){
 const {db,schoolId:sid,user,role,reload}=ctx;
 const [allChildren,links,allContacts,allEvents,allRelayConfirmations]=await Promise.all([
  read(db,'bp_students',q=>q.eq('school_id',sid).order('full_name')),
  role==='parent'?read(db,'bp_parent_links',q=>q.eq('school_id',sid)):Promise.resolve([]),
  read(db,'bp_pickup_contacts',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(220)),
  read(db,'bp_pickup_events',q=>q.eq('school_id',sid).order('occurred_at',{ascending:false}).limit(220)),
  read(db,'bp_care_relay_pickups',q=>q.eq('school_id',sid).order('confirmed_at',{ascending:false}).limit(220))
 ]);
 let children=allChildren;
 if(role==='parent'){const ids=new Set(links.map(x=>x.student_id));children=allChildren.filter(x=>ids.has(x.id))}
 if(role==='teacher'){
  const assignments=await read(db,'bp_teacher_classes',q=>q.eq('school_id',sid));
  const ids=new Set(assignments.map(x=>x.class_id));
  children=allChildren.filter(x=>ids.has(x.class_id));
 }
 const childSet=new Set(children.map(c=>c.id));
 const contacts=allContacts.filter(x=>childSet.has(x.student_id));
 const events=allEvents.filter(x=>childSet.has(x.student_id));
 const relayConfirmed=new Set(allRelayConfirmations.filter(x=>childSet.has(x.student_id)).map(x=>x.pickup_event_id));
 const currentDay=schoolDay();
 const checkoutToday=events.filter(x=>x.event_type==='check_out'&&schoolDay(x.occurred_at)===currentDay);
 const name=id=>children.find(c=>c.id===id)?.full_name||'Child';
 const contactName=id=>contacts.find(c=>c.id===id)?.full_name||'Guardian';
 const pending=contacts.filter(c=>c.status==='pending');
 const isStaff=role!=='parent';
 const isAdmin=role==='school_admin';
 const html=heading('SAFE ARRIVALS','Check-in & pickup','Know when each child arrives and who is authorized to collect them.')+
 '<div class="mw-metrics">'+stat('Approved pickup contacts',contacts.filter(c=>c.status==='approved').length,'✅','teal')+
 stat('Contacts pending',pending.length,'◷','amber')+
 stat('Check-ins today',events.filter(e=>e.event_type==='check_in'&&schoolDay(e.occurred_at)===currentDay).length,'🎒','blue')+
 stat('Pickups today',events.filter(e=>e.event_type==='check_out'&&schoolDay(e.occurred_at)===currentDay).length,'👋','violet')+'</div>'+
 '<div class="mw-two mw-two-side">'+
 box(role==='parent'?'Nominate a pickup contact':'Add a pickup contact',
  '<form id="bp-pickup-contact-form" class="mw-form">'+
  field('Child',select('bp-contact-child',childOpts(children),'required'))+
  field('Pickup person’s full name',input('bp-contact-name','Full name','text','required minlength="2" maxlength="140"'))+
  field('Relationship',select('bp-contact-relation',['Mother','Father','Grandparent','Guardian','Family member','Other approved adult'].map(x=>option(x,x)).join('')))+
  field('Contact number',input('bp-contact-phone','Phone number','tel','required minlength="6" maxlength="36"'))+
  '<p class="mw-fine">School approval is required before this person can collect the child. A parent note or nomination is not pickup authorization.</p>'+
  '<div class="mw-form-actions">'+button('Submit contact','bp-contact-submit','primary','type="submit" '+(!children.length?'disabled':''))+'</div></form>')+
 (isStaff?box('Record arrival or pickup',
  '<form id="bp-pickup-event-form" class="mw-form">'+field('Child',select('bp-event-child',childOpts(children),'required'))+
  field('Action',select('bp-event-action','<option value="check_in">Morning check-in</option><option value="check_out">Pickup / check-out</option>'))+
  '<div id="bp-pickup-person-holder" hidden>'+field('Approved pickup person',select('bp-event-contact','<option value="">Select approved person</option>'))+
  '<label class="mw-check-label"><input type="checkbox" id="bp-pickup-verified"><span>I checked the pickup person’s identity and school authorization in person.</span></label><p id="bp-pickup-helper" class="mw-fine" role="status"></p></div>'+
  field('Notes (optional)',textarea('bp-event-notes','Optional arrival or pickup note','maxlength="350"'))+
  '<div class="mw-form-actions">'+button('Save record','bp-event-submit','primary','type="submit" '+(!children.length?'disabled':''))+'</div></form>'):
  box('Pickup process',
   '<div class="mw-guidance">'+
    '<div><span>1</span><p><b>Add a pickup person</b><small>Give their name and contact details</small></p></div>'+
    '<div><span>2</span><p><b>School verifies the person</b><small>Only approved contacts can collect a child</small></p></div>'+
    '<div><span>3</span><p><b>See pickup confirmation</b><small>Staff record the actual handover</small></p></div></div>'))+'</div>'+
 (isAdmin?box('Contacts awaiting school approval',pending.length?
  table(['Child','Pickup person','Relationship','Phone','Approve'],pending.map(c=>tr([
   h(name(c.student_id)),h(c.full_name),h(c.relationship),h(c.phone),
   '<div class="mw-approval-buttons">'+button('Approve','bp-pickup-approve-'+c.id,'primary','data-contact-action="approved" data-contact-id="'+h(c.id)+'"')+
   button('Reject','bp-pickup-reject-'+c.id,'danger','data-contact-action="revoked" data-contact-id="'+h(c.id)+'"')+'</div>'
  ]))):empty('✓','No pickup contacts waiting','New contact nominations appear here.')):
 (role==='parent'?box('Waiting for school approval',pending.length?table(['Child','Pickup person','Relationship','Status'],pending.map(c=>tr([h(name(c.student_id)),h(c.full_name),h(c.relationship),pill('Pending','amber')]))):empty('✓','No pending pickup contacts','Any new pickup nominations will appear here.')):''))+
 box('Authorized pickup people',contacts.filter(c=>c.status!=='pending').length?
  table(['Child','Person','Relationship','Status',...(isAdmin?['Action']:[])],contacts.filter(c=>c.status!=='pending').map(c=>tr([
   h(name(c.student_id)),h(c.full_name),h(c.relationship),pill(c.status,c.status==='approved'?'green':'red'),
   ...(isAdmin?[c.status==='approved'?button('Revoke','bp-revoke-'+c.id,'danger','data-contact-action="revoked" data-contact-id="'+h(c.id)+'"'):'—']:[])
  ]))):empty('💛','No approved pickup contacts','Once the school approves an adult, they will appear here.'))+
 box('Arrival & pickup history',events.length?
  table(['Child','Action','Pickup person','Date & time','Verification'],events.map(x=>tr([
   h(name(x.student_id)),pill(label[x.event_type],x.event_type==='check_in'?'green':'neutral'),
   x.event_type==='check_in'?'—':h(contactName(x.contact_id)),time(x.occurred_at),
   x.event_type==='check_in'?'—':relayConfirmed.has(x.id)?pill('Care Relay confirmed','green'):pill('School record only','amber')
  ]))):empty('🎒','No arrival or pickup records yet','Each confirmed arrival and handover will appear here.'));
 return{html,bind(){
  form('bp-pickup-contact-form',async()=>{
   if(!children.some(x=>x.id===v('bp-contact-child')))throw Error('Choose a child');
   await write(db,'bp_pickup_contacts',{school_id:sid,student_id:v('bp-contact-child'),full_name:v('bp-contact-name'),relationship:v('bp-contact-relation'),phone:v('bp-contact-phone'),created_by:user.id,status:'pending'});
   await reload();
  });
  document.querySelectorAll('[data-contact-action]').forEach(b=>b.onclick=async()=>{
   const newStatus=b.dataset.contactAction;
   if(!confirm(newStatus==='approved'?'Approve this adult to collect this child?':'Revoke or reject this pickup contact?'))return;
   try{
    await update(db,'bp_pickup_contacts',{status:newStatus,approved_by:user.id,approved_at:new Date().toISOString()},{id:b.dataset.contactId,school_id:sid});
    notice(newStatus==='approved'?'Pickup contact approved':'Pickup contact revoked');await reload();
   }catch(err){notice(err.message,'error')}
  });
  if(isStaff){
   const chooser=document.getElementById('bp-event-child'),action=document.getElementById('bp-event-action'),picker=document.getElementById('bp-event-contact');
   const refresh=()=>{
    const isCheckout=action.value==='check_out';
    const child=chooser.value,approved=contacts.filter(c=>c.student_id===child&&c.status==='approved');
    const alreadyRecorded=checkoutToday.some(e=>e.student_id===child);
    const box=document.getElementById('bp-pickup-person-holder');
    box.hidden=!isCheckout;
    picker.innerHTML='<option value="">Select approved person</option>'+approved.map(c=>option(c.id,c.full_name+' · '+c.relationship)).join('');
    const helper=document.getElementById('bp-pickup-helper');
    helper.textContent=!child?'Choose a child first.':alreadyRecorded?'A checkout is already recorded for this child today. Review the history or open Care Relay for a previous confirmation.':!approved.length?'No approved collector is listed for this child. Approve a contact first.':'Check the approved contact and photo ID in person before recording.';
    const submit=document.getElementById('bp-event-submit');
    if(submit)submit.disabled=!child||(isCheckout&&(alreadyRecorded||!approved.length));
   };
   chooser.onchange=refresh;action.onchange=refresh;refresh();
   form('bp-pickup-event-form',async()=>{
    const child=v('bp-event-child'),type=v('bp-event-action');
    if(!children.some(c=>c.id===child))throw Error('Choose a child');
    if(type==='check_out'){
     const contact=v('bp-event-contact');
     if(!contacts.some(c=>c.id===contact&&c.student_id===child&&c.status==='approved')||!checked('bp-pickup-verified'))
      throw Error('Choose an approved collector and confirm their identity in person');
     const response=await rpc(db,'bp_relay_record_pickup',{p_school:sid,p_child:child,p_contact:contact,p_identity_checked:true,p_note:v('bp-event-notes')});
     if(response?.ok!==true||!response.pickup_event_id)throw Error('Pickup was not confirmed. Check school history before retrying.');
     notice('Verified pickup and Care Relay handback recorded');
    }else{
     await write(db,'bp_pickup_events',{school_id:sid,student_id:child,event_type:'check_in',
      contact_id:null,identity_verified:false,notes:v('bp-event-notes'),recorded_by:user.id});
    }
    await reload();
   });
  }
 }};
}
