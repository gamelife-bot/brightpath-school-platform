import {schoolDay,SCHOOL_TIME_ZONE} from './school-day.js';
import {escapeHtml as e,dateLabel,stat,box,empty,pill,field,select,textarea,button,heading,option,read,rpc,form,notice,v,checked} from './workspace-core.js';
import {careRelayArt} from './care-relay-art.js';
const localDay=schoolDay;
const time=(input)=>input?new Date(input).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',timeZone:SCHOOL_TIME_ZONE}):'—';
const mood={not_shared:'No mood shared',settled:'Feeling settled',tired:'A little tired',needs_comfort:'May need extra comfort'};
const sleep={not_shared:'Not shared',usual:'Slept as usual',less:'Less sleep than usual',restless:'Restless night'};
const icons={meal:'🥣',nap:'😴',mood:'😊',play:'🧸',diaper:'🧷',toilet:'🚽',other:'✨'};
const safe=(x)=>e(String(x??''));
const atToday=(str,day)=>str&&localDay(str)===day;
const within=(items,id)=>items.filter(x=>x.student_id===id);
const factualSummary=(data)=>{
 if(!data)return '';
 const lines=['Attendance: '+(data.attendance?String(data.attendance).replace(/_/g,' '):'Not recorded')+'.'];
 for(const item of (data.care||[]).slice(0,45))lines.push((icons[item.event_type]||'☀️')+' '+time(item.occurred_at)+' — '+(item.details||item.event_value||'Care update recorded'));
 for(const item of (data.milestones||[]))lines.push('🌱 Observed: '+item.title);
 if(Number(data.media_count)>0)lines.push('📷 '+data.media_count+' permitted private photo/video item(s) were recorded.');
 if(data.pickup)lines.push(data.pickup.relay_confirmed?'✅ School pickup contact and identity check recorded.':'🎒 A school pickup record exists; the Care Relay confirmation is not recorded.');
 if(lines.length===1)lines.push('No additional care or learning events were recorded in BrightPath for this date.');
 return lines.join('\n');
};
const hero=(eyebrow,title,description,variant='parent')=>
 '<div class="cr-hero cr-hero-'+variant+'"><div class="cr-hero-copy"><span class="cr-eyebrow">✦ '+eyebrow+'</span><h2>'+title+'</h2><p>'+description+'</p>'+
 '<div class="cr-hero-chips"><span>🌞 Morning</span><span>🧸 School day</span><span>🎒 Safe pickup</span><span>🌙 Evening</span></div></div>'+
 '<div class="cr-hero-visual">'+careRelayArt({small:true})+'</div><span class="cr-hero-deco" aria-hidden="true">✳</span></div>';
const stages=[['🌞','Home','Parent morning note'],['🍎','School','Assigned teacher sees what matters'],['🎒','Pickup','Approved adult and ID checked'],['🌙','Evening','Verified factual handback']];
const rail=()=>'<div class="cr-journey" aria-label="Care Relay stages">'+stages.map(([icon,title,description],i)=>
 '<div class="cr-journey-step"><span>'+icon+'</span><div><b>'+title+'</b><small>'+description+'</small></div></div>'+(i<3?'<span class="cr-journey-arrow" aria-hidden="true">→</span>':'')).join('')+'</div>';
function morningCard(entry,{staff=false,name='Child'}={}){
 const attention=entry.needs_attention;
 return '<article class="cr-note '+(attention?'cr-note-attention':'')+'"><div class="cr-note-top"><div class="cr-note-avatar">'+(attention?'💛':'☀️')+'</div><div class="cr-note-title"><strong>'+safe(name)+'</strong><small>'+dateLabel(entry.relay_day)+' · '+time(entry.created_at)+'</small></div>'+
 pill(entry.acknowledged_at?'Seen by staff':attention?'Needs acknowledgment':'Shared',entry.acknowledged_at?'green':attention?'amber':'neutral')+'</div>'+
 '<div class="cr-note-facts"><span>😴 '+safe(sleep[entry.sleep_status]||'Not shared')+'</span><span>🌼 '+safe(mood[entry.morning_mood]||'Not shared')+'</span></div>'+
 (entry.note?'<p class="cr-note-copy">'+safe(entry.note)+'</p>':'')+
 (entry.pickup_note?'<div class="cr-pickup-remark"><b>🎒 Family pickup information</b><p>'+safe(entry.pickup_note)+'</p><small>This does not authorize a collector.</small></div>':'')+
 (staff&&!entry.acknowledged_at&&attention?button('Acknowledge note','cr-ack-'+entry.id,'outline','type="button" data-cr-ack="'+safe(entry.id)+'"'):'')+'</article>';
}
function eveningCard(verified){
 const facts=factualSummary(verified.snapshot||{});
 return '<article class="cr-summary-card"><div class="cr-summary-head"><span>🌙</span><div><span class="cr-mini-heading">SCHOOL-VERIFIED DAY</span><h3>'+dateLabel(verified.relay_day)+'</h3><small>Verified '+dateLabel(verified.verified_at)+' at '+time(verified.verified_at)+' · Revision '+safe(verified.revision||1)+'</small></div>'+pill('Verified','green')+'</div>'+
 '<div class="cr-summary-facts">'+facts.split('\n').map(line=>'<p>'+safe(line)+'</p>').join('')+'</div>'+
 '<p class="cr-summary-note">A snapshot of records entered when staff verified the day. Unrecorded activities may still have happened. Open the child’s full diary for later corrections.</p>'+
 button('Open full daily diary','cr-open-diary','outline','type="button"')+'</article>';
}
async function parentRelay(ctx){
 const {db,schoolId:sid,go,user,reload}=ctx,day=localDay();
 const [links,allChildren,mornings,evenings,pickups,confirmations,contacts]=await Promise.all([
  read(db,'bp_parent_links',q=>q.eq('school_id',sid)),
  read(db,'bp_students',q=>q.eq('school_id',sid).order('full_name')),
  read(db,'bp_care_relay_mornings',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(90)),
  read(db,'bp_care_relay_evenings',q=>q.eq('school_id',sid).order('relay_day',{ascending:false}).limit(100)),
  read(db,'bp_pickup_events',q=>q.eq('school_id',sid).order('occurred_at',{ascending:false}).limit(130)),
  read(db,'bp_care_relay_pickups',q=>q.eq('school_id',sid).order('confirmed_at',{ascending:false}).limit(130)),
  read(db,'bp_pickup_contacts',q=>q.eq('school_id',sid).limit(130))
 ]);
 const ids=new Set(links.map(x=>x.student_id)),children=allChildren.filter(x=>ids.has(x.id));
 const initial=new URLSearchParams(location.search).get('child'),first=children.some(x=>x.id===initial)?initial:children[0]?.id||'';
 const mine=mornings.filter(x=>x.parent_user_id===user.id&&ids.has(x.student_id));
 const todayNotes=mine.filter(x=>x.relay_day===day).length;
 const todayEvenings=evenings.filter(x=>ids.has(x.student_id)&&x.relay_day===day).length;
 const html=heading('HOME ↔ SCHOOL','Care Relay','One caring note from home, a safer school day, and a verified handback from existing records.')+
 hero('HOME & SCHOOL, CONNECTED','A little note from home.<br><em>A happier handover.</em>',
 'Share what matters with your child’s school. The teacher sees important exceptions; the evening view comes only from actual school records.')+rail()+
 '<div class="mw-metrics">'+stat('Linked children',children.length,'🧸','teal')+stat('Morning notes today',todayNotes,'☀️','amber')+
 stat('Verified evening summaries today',todayEvenings,'🌙','blue')+'</div>'+
 (children.length?'<div class="cr-child-picker"><span>💛</span><div><b>Choose your little one</b><small>Each child’s handover and summary stays private.</small></div>'+
 '<select id="cr-parent-child" aria-label="Choose child">'+children.map(x=>option(x.id,x.full_name)).join('')+'</select></div><div id="cr-parent-detail"></div>':
 empty('🧸','Your family relay is waiting','Your school must approve your parent account and link your child first.'))+
 '<div class="cr-care-promise"><div>🛡️ <b>Private child notes</b><p>Only the submitting parent, assigned teachers and authorized school administrators can read morning notes.</p></div>'+
 '<div>🍎 <b>Light work for teachers</b><p>Routine family notes do not demand extra reports. Important concerns require acknowledgement.</p></div>'+
 '<div>📞 <b>Emergencies need a phone call</b><p>This feature is not an emergency service and does not approve pickup changes.</p></div></div>';
 const detail=(id)=>{
  const child=children.find(x=>x.id===id);if(!child)return '';
  const todayNote=mine.find(x=>x.student_id===id&&x.relay_day===day);
  const earlier=mine.filter(x=>x.student_id===id&&x.relay_day!==day).slice(0,3);
  const childEvenings=evenings.filter(x=>x.student_id===id);
  const latest=childEvenings[0]||null;
  const pickup=pickups.find(x=>x.student_id===id&&x.event_type==='check_out'&&atToday(x.occurred_at,day));
  const relayPickup=pickup&&confirmations.some(c=>c.pickup_event_id===pickup.id);
  const collectors=contacts.filter(x=>x.student_id===id&&x.status==='approved');
  return '<div class="cr-two-columns"><div class="cr-stack">'+
   box('🌞 Morning family handover',
    todayNote?'<div class="cr-inline-confirm">✓ Today’s note was received. To update it, message the classroom.</div>'+
    morningCard(todayNote,{name:child.full_name})+button('Message the classroom','cr-family-message','outline','type="button"'):
    '<p class="cr-field-intro">An optional, 30-second handover. No need to submit anything if nothing has changed.</p>'+
    '<form class="mw-form cr-handover-form" id="cr-parent-handover">'+
    field('How was their sleep?',select('cr-sleep','<option value="not_shared">Prefer not to share</option><option value="usual">Slept as usual</option><option value="less">Less sleep than usual</option><option value="restless">Restless night</option>'))+
    field('How are they feeling?',select('cr-mood','<option value="not_shared">Prefer not to share</option><option value="settled">Feeling settled</option><option value="tired">A little tired</option><option value="needs_comfort">May need extra comfort</option>'))+
    field('Anything their teacher should know?',textarea('cr-note','For example: They are tired and may appreciate a quieter start.','maxlength="700"'))+
    field('Pickup plans or changes (information only)',textarea('cr-pickup-note','Optional. Changes to collectors still require separate school approval.','maxlength="350"'))+
    '<label class="mw-check-label"><input type="checkbox" id="cr-needs-attention"><span>This needs a teacher’s acknowledgment today (not for emergencies).</span></label>'+
    '<p class="cr-form-disclaimer">A parent note cannot authorize a collector or replace an urgent school phone call.</p>'+
    button('Send morning note','cr-send-morning','primary','type="submit"')+'</form>')+
   box('🎒 Safe pickup confirmation','<div class="cr-pickup-state"><span class="cr-pickup-state-icon">'+(relayPickup?'✅':pickup?'🗂️':'🎒')+'</span><div><b>'+
    (relayPickup?'Verified school handover':pickup?'School pickup recorded':'Pickup not recorded yet')+'</b><p>'+
    (relayPickup?'School staff confirmed an approved contact and in-person identity check.':pickup?'The school has a checkout record; Care Relay confirmation is not yet recorded.':
     'Staff will record pickup only after checking an approved adult’s identity and authority.')+'</p>'+
    (pickup?'<small>Recorded at '+time(pickup.occurred_at)+'</small>':'')+'</div></div>'+
    '<div class="cr-approved-contacts"><b>Approved collectors</b><div>'+(collectors.length?collectors.map(c=>'<span>✓ '+safe(c.full_name)+'</span>').join(''):'<span>No approved contacts yet</span>')+'</div></div>'+
    '<p class="cr-form-disclaimer">A parent note never replaces independent approval and identity checks at the school gate.</p>'+
    button('View approved pickup contacts','cr-open-pickup','outline','type="button"'))+'</div><div class="cr-stack">'+
   box('🌙 Verified evening handback',latest?eveningCard(latest)+
     (childEvenings.length>1?'<div class="cr-evening-history"><b>Earlier verified days</b>'+
     childEvenings.slice(1,6).map(x=>'<button type="button" data-cr-evening="'+safe(x.id)+'">📔 '+dateLabel(x.relay_day)+' <span>View ↗</span></button>').join('')+'</div>':''):
     empty('🌙','A family summary appears here','School staff will review and verify an evidence-based summary. Missing details are never made up.'))+
   (earlier.length?box('🌻 Earlier morning notes','<div class="cr-history">'+earlier.map(x=>morningCard(x,{name:child.full_name})).join('')+'</div>'):'')+'</div></div>';
 };
 return{html,bind(){
  if(!children.length)return;
  const picker=document.getElementById('cr-parent-child'),root=document.getElementById('cr-parent-detail');picker.value=first;
  const bindDetail=()=>{
   const id=picker.value,todayNote=mine.find(x=>x.student_id===id&&x.relay_day===day);
   if(!todayNote)form('cr-parent-handover',async()=>{
    if(!children.some(x=>x.id===id))throw Error('Child is not linked to your account');
    const result=await rpc(db,'bp_relay_submit_morning',{p_school:sid,p_child:id,p_sleep:v('cr-sleep'),p_mood:v('cr-mood'),p_note:v('cr-note'),
      p_pickup_note:v('cr-pickup-note'),p_attention:checked('cr-needs-attention'),p_day:day});
    if(!result.ok||!result.id)throw Error('Morning handover was not confirmed');
    notice('Your morning note was shared privately');await reload();
   });
   for(const [bid,tab] of [['cr-open-pickup','pickup'],['cr-family-message','messages'],['cr-open-diary','daily_summary']]){
    const b=document.getElementById(bid);if(b)b.onclick=()=>go(tab);
   }
   document.querySelectorAll('[data-cr-evening]').forEach(b=>b.onclick=()=>{
    const record=evenings.find(x=>x.id===b.dataset.crEvening);if(!record)return;
    const old=root.querySelector('.cr-summary-card');if(old)old.outerHTML=eveningCard(record);
    const diary=document.getElementById('cr-open-diary');if(diary)diary.onclick=()=>go('daily_summary');
   });
  };
  const show=()=>{root.innerHTML=detail(picker.value);bindDetail()};
  picker.onchange=show;show();
 }};
}
async function staffRelay(ctx){
 const {db,schoolId:sid,role,go,reload}=ctx,admin=role==='school_admin',day=localDay();
 const [assignments,allChildren,rooms,mornings,attendances,care,media,milestones,events,contacts,confirmations,evenings]=await Promise.all([
  admin?Promise.resolve([]):read(db,'bp_teacher_classes',q=>q.eq('school_id',sid)),
  read(db,'bp_students',q=>q.eq('school_id',sid).order('full_name')),read(db,'bp_classes',q=>q.eq('school_id',sid)),
  read(db,'bp_care_relay_mornings',q=>q.eq('school_id',sid).eq('relay_day',day).order('created_at',{ascending:false}).limit(250)),
  read(db,'bp_attendance',q=>q.eq('school_id',sid).eq('attendance_date',day).limit(450)),
  read(db,'bp_care_logs',q=>q.eq('school_id',sid).order('occurred_at',{ascending:false}).limit(600)),
  read(db,'bp_child_media',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(350)),
  read(db,'bp_milestones',q=>q.eq('school_id',sid).order('observed_at',{ascending:false}).limit(350)),
  read(db,'bp_pickup_events',q=>q.eq('school_id',sid).order('occurred_at',{ascending:false}).limit(350)),
  read(db,'bp_pickup_contacts',q=>q.eq('school_id',sid).limit(500)),
  read(db,'bp_care_relay_pickups',q=>q.eq('school_id',sid).order('confirmed_at',{ascending:false}).limit(400)),
  read(db,'bp_care_relay_evenings',q=>q.eq('school_id',sid).eq('relay_day',day).limit(450))
 ]);
 const allowedRooms=admin?new Set(rooms.map(x=>x.id)):new Set(assignments.map(x=>x.class_id));
 const children=allChildren.filter(x=>allowedRooms.has(x.class_id)),ids=new Set(children.map(x=>x.id));
 const byId=new Map(children.map(x=>[x.id,x]));
 const attendance=attendances.filter(x=>ids.has(x.student_id)),byAttendance=new Map(attendance.map(x=>[x.student_id,x]));
 const missing=children.filter(x=>!byAttendance.has(x.id));
 const notes=mornings.filter(x=>ids.has(x.student_id));
 const priority=notes.filter(x=>x.needs_attention&&!x.acknowledged_at);
 const routine=notes.filter(x=>!priority.some(p=>p.id===x.id));
 const pickups=events.filter(x=>ids.has(x.student_id)&&x.event_type==='check_out'&&atToday(x.occurred_at,day));
 const confirmed=confirmations.filter(x=>pickups.some(p=>p.id===x.pickup_event_id));
 const todayCare=care.filter(x=>ids.has(x.student_id)&&atToday(x.occurred_at,day));
 const todayMedia=media.filter(x=>ids.has(x.student_id)&&x.status==='ready'&&atToday(x.created_at,day));
 const todayMilestones=milestones.filter(x=>ids.has(x.student_id)&&atToday(x.observed_at,day));
 const verified=evenings.filter(x=>ids.has(x.student_id));
 const roomOpts=rooms.filter(x=>allowedRooms.has(x.id)).map(x=>option(x.id,x.name)).join('');
 const preview=(child)=>{
  const a=byAttendance.get(child.id),logs=within(todayCare,child.id),pics=within(todayMedia,child.id),growth=within(todayMilestones,child.id);
  const picked=pickups.find(x=>x.student_id===child.id),isVerified=verified.some(x=>x.student_id===child.id);
  const hasUnacknowledgedConcern=priority.some(x=>x.student_id===child.id);
  const ready=Boolean(a)&&!hasUnacknowledgedConcern;
  return '<article class="cr-verify-child"><label class="cr-verify-child-check"><input type="checkbox" value="'+safe(child.id)+'" data-cr-verify-child="'+safe(child.id)+'" '+(ready?'checked':'disabled')+'><span>'+
   '<b>'+safe(child.full_name)+'</b><small>'+(a?'Attendance: '+safe(a.status):'Attendance not recorded')+
   ' · '+logs.length+' care · '+pics.length+' media · '+growth.length+' milestones'+
   (hasUnacknowledgedConcern?' · Acknowledge family concern above first':'')+'</small></span></label>'+
   pill(hasUnacknowledgedConcern?'Care follow-up first':isVerified?'Verified today':a?'Ready for review':'Needs attendance',hasUnacknowledgedConcern?'amber':isVerified?'green':a?'teal':'amber')+
   '<div class="cr-record-preview">'+(logs.length?logs.slice(0,3).map(x=>'<span>'+(icons[x.event_type]||'☀️')+' '+safe(String(x.details||x.event_value||'Care update recorded').slice(0,100))+'</span>').join(''):
   '<span>No additional care records</span>')+
   (picked?'<span>🎒 Pickup '+time(picked.occurred_at)+(confirmed.some(c=>c.pickup_event_id===picked.id)?' · contact and ID check confirmed':' · confirmation pending')+'</span>':'')+'</div></article>';
 };
 const html=heading('A CALMER CLASSROOM','Care Relay · school day','Only the exceptions need attention. Review existing records once before releasing family summaries.')+
 hero('LESS PAPERWORK, MORE PRESENCE','Help the children.<br><em>We’ll organize the handover.</em>',
 'See the few family notes needing attention, verify actual pickup, and publish factual day summaries together.','staff')+rail()+
 '<div class="mw-metrics">'+stat('Care notes needing attention',priority.length,'💛','amber')+stat('Attendance not recorded',missing.length,'📝','blue')+
 stat('Confirmed pickups',confirmed.length,'🎒','teal')+stat('Verified evening summaries',verified.length,'🌙','violet')+'</div>'+
 '<div class="cr-two-columns"><div class="cr-stack">'+
 box('💛 Morning exception inbox',
 '<p class="cr-field-intro">Only family notes flagged for follow-up require explicit acknowledgment. Routine notes remain available without another daily form.</p>'+
 (priority.length?'<div class="cr-morning-list">'+priority.map(x=>morningCard(x,{staff:true,name:byId.get(x.student_id)?.full_name||'Child'})).join('')+'</div>':
 empty('🌻','No unacknowledged priority notes','Your classroom can focus on the children.'))+
 (routine.length?'<details class="cr-routine-details"><summary>Routine notes and acknowledged messages ('+routine.length+')</summary><div class="cr-morning-list">'+routine.map(x=>morningCard(x,{name:byId.get(x.student_id)?.full_name||'Child'})).join('')+'</div></details>':'')+
 (missing.length?'<div class="cr-school-action"><span>📝</span><p><b>'+missing.length+' children need an attendance status.</b><small>Mark it in the register once, not another form.</small></p>'+button('Open attendance','cr-open-attendance','outline')+'</div>':''))+
 box('🎒 Safe pickup · one checked action',
 '<p class="cr-field-intro">Use this only when the adult is physically present. Check their identity against the school’s approved collector list.</p>'+
 '<form id="cr-staff-pickup" class="mw-form cr-pickup-form">'+
 field('Child',select('cr-pickup-child','<option value="">Choose a child</option>'+children.map(x=>option(x.id,x.full_name)).join(''),'required'))+
 field('Approved collector',select('cr-pickup-contact','<option value="">Choose an approved adult</option>','required'))+
 field('Optional note',textarea('cr-pickup-notes','Optional staff note about the completed handover.','maxlength="350"'))+
 '<label class="mw-check-label"><input type="checkbox" id="cr-identity-checked" required><span>I physically checked this adult’s identity and approved pickup authority for this child.</span></label>'+
 button('Record confirmed pickup','cr-record-pickup','primary','type="submit" '+(!children.length?'disabled':''))+'</form>'+
 '<div class="cr-pickup-extras">'+(pickups.filter(p=>p.identity_verified&&!confirmed.some(x=>x.pickup_event_id===p.id)).length?
 '<h4>Already recorded in school pickup history</h4>'+pickups.filter(p=>p.identity_verified&&!confirmed.some(x=>x.pickup_event_id===p.id)).slice(0,15).map(x=>
 '<div class="cr-checkout-existing"><span>🎒 '+safe(byId.get(x.student_id)?.full_name||'Child')+' · '+time(x.occurred_at)+'</span>'+
 button('Confirm existing','cr-existing-'+x.id,'outline','type="button" data-cr-existing="'+safe(x.id)+'"')+'</div>').join(''):'')+
 '<button type="button" class="cr-text-link" id="cr-open-pickup">View contacts and full pickup history ↗</button></div>')+
 '</div><div class="cr-stack">'+
 box('🌙 Verified evening handback',
 '<div class="cr-evening-intro"><span>✦</span><div><b>One review can cover a classroom.</b><p>Choose a room and review the recorded facts. Children whose attendance is missing cannot be verified. Families see only their own child.</p></div></div>'+
 field('Classroom',select('cr-room','<option value="all">All assigned rooms</option>'+roomOpts))+
 '<div id="cr-evening-review" class="cr-evening-review"></div>'+
 '<form class="mw-form cr-review-form" id="cr-evening-form"><label class="mw-check-label"><input type="checkbox" id="cr-summary-attested" required><span>I have reviewed the selected children’s recorded facts and authorize these summaries to be shared with their verified guardians.</span></label>'+
 button('Publish verified summaries','cr-verify-evenings','primary','type="submit"')+'</form>'+
 '<p class="cr-form-disclaimer">Verifying a record does not certify unrecorded care activities or make an unverified pickup safe.</p>'+
 '<div class="cr-relay-small-art">'+careRelayArt({small:true})+'<div><b>Less typing. More together time.</b><small>Little moments deserve a big place in the day.</small></div></div>')+
 '</div></div>';
 return{html,bind(){
  document.querySelectorAll('[data-cr-ack]').forEach(b=>b.onclick=async()=>{
   b.disabled=true;try{const out=await rpc(db,'bp_relay_ack_morning',{p_id:b.dataset.crAck});if(!out.ok)throw Error('Note was not acknowledged');
    notice('Important care note acknowledged');await reload();
   }catch(err){notice(err.message,'error');b.disabled=false}
  });
  const att=document.getElementById('cr-open-attendance');if(att)att.onclick=()=>go('attendance');
  document.getElementById('cr-open-pickup').onclick=()=>go('pickup');
  const chooser=document.getElementById('cr-pickup-child'),collector=document.getElementById('cr-pickup-contact');
  const refreshContacts=()=>{
   const id=chooser.value;
   collector.innerHTML='<option value="">Choose an approved collector</option>'+contacts.filter(x=>x.student_id===id&&x.status==='approved').map(x=>option(x.id,x.full_name+' · '+x.relationship)).join('');
   document.getElementById('cr-record-pickup').disabled=!id||pickups.some(x=>x.student_id===id)||!contacts.some(x=>x.student_id===id&&x.status==='approved');
  };
  chooser.onchange=refreshContacts;refreshContacts();
  form('cr-staff-pickup',async()=>{
   if(!checked('cr-identity-checked'))throw Error('Verify the collector in person first');
   const child=v('cr-pickup-child'),contact=v('cr-pickup-contact');
   if(!children.some(x=>x.id===child)||!contacts.some(x=>x.id===contact&&x.student_id===child&&x.status==='approved'))throw Error('Choose the approved collector for this child');
   const result=await rpc(db,'bp_relay_record_pickup',{p_school:sid,p_child:child,p_contact:contact,p_identity_checked:true,p_note:v('cr-pickup-notes')});
   if(!result.ok||!result.pickup_event_id)throw Error('Pickup was not confirmed; check school pickup history first');
   notice('Pickup and in-person identity check recorded');await reload();
  });
  document.querySelectorAll('[data-cr-existing]').forEach(b=>b.onclick=async()=>{
   if(!confirm('Confirm that this recorded checkout was completed after checking an approved contact and their identity in person?'))return;
   b.disabled=true;try{const out=await rpc(db,'bp_relay_confirm_existing_pickup',{p_event:b.dataset.crExisting});
    if(!out.ok)throw Error('Pickup confirmation failed');notice('Existing verified pickup confirmed');await reload();
   }catch(err){notice(err.message,'error');b.disabled=false}
  });
  const room=document.getElementById('cr-room'),review=document.getElementById('cr-evening-review');
  const draw=()=>{
   const selected=children.filter(x=>room.value==='all'||x.class_id===room.value);
   review.innerHTML=selected.length?selected.map(preview).join(''):
    empty('📔','No children assigned','Ask a school administrator to assign a classroom before verifying summaries.');
  };
  room.onchange=draw;draw();
  form('cr-evening-form',async()=>{
   if(!checked('cr-summary-attested'))throw Error('Review the records before publishing');
   const chosen=[...review.querySelectorAll('[data-cr-verify-child]')].filter(x=>x.checked&&!x.disabled).map(x=>x.value);
   if(!chosen.length)throw Error('Select children whose attendance is recorded');
   if(chosen.length>30)throw Error('Select no more than 30 children at once');
   if(!confirm('Publish reviewed daily summaries for '+chosen.length+' children? Each summary is visible only to authorized guardians.'))return;
   const out=await rpc(db,'bp_relay_verify_evenings',{p_school:sid,p_children:chosen,p_day:day});
   if(!out.ok||out.verified!==chosen.length)throw Error('Not all selected summaries were verified');
   notice('Verified '+out.verified+' private family summaries');await reload();
  });
 }};
}
export async function renderCareRelay(ctx){
 if(ctx.role==='parent')return parentRelay(ctx);
 if(['teacher','school_admin'].includes(ctx.role))return staffRelay(ctx);
 return {html:heading('CARE RELAY','Unavailable','Care Relay is only available to verified parents and assigned school staff.')};
}
