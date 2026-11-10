import {schoolDateTime,schoolDay,getSchoolTimeZone} from './school-day.js';
import {schoolDateTimeInput,schoolLocalToUtc} from './school-clock-input.js';
import {escapeHtml as e,dateLabel,stat,box,empty,pill,field,input,select,textarea,button,heading,option,read,write,update,form,notice,v,checked} from './workspace-core.js';

const toLocal=iso=>schoolDateTime(iso);
const timeInput=offset=>schoolDateTimeInput(new Date(Date.now()+offset));
export async function renderSchoolCalendar(ctx){
 const {db,role,schoolId:sid,user,reload}=ctx;
 const admin=role==='school_admin';
 const rows=await read(db,'bp_school_events',q=>q.eq('school_id',sid).order('starts_at',{ascending:true}).limit(300));
 const now=Date.now();
 const upcoming=rows.filter(r=>new Date(r.ends_at).getTime()>=now&&(!(!admin&&!r.is_published)));
 const past=rows.filter(r=>new Date(r.ends_at).getTime()<now);
 const card=event=>'<article class="bp-calendar-event '+(!event.is_published?'bp-calendar-draft':'')+'">'+
  '<div class="bp-calendar-day"><span>'+new Date(event.starts_at).toLocaleDateString('en-KE',{day:'2-digit',timeZone:getSchoolTimeZone()})+'</span><small>'+
   new Date(event.starts_at).toLocaleDateString('en-KE',{month:'short',timeZone:getSchoolTimeZone()}).toUpperCase()+'</small></div>'+
  '<div class="bp-calendar-event-copy"><div><strong>'+e(event.title)+'</strong>'+pill(event.audience==='all'?'All families & staff':event.audience==='parents'?'Families':'Teachers','green')+
  (admin?pill(event.is_published?'Published':'Draft',event.is_published?'green':'amber'):'')+'</div>'+
  '<small>🕒 '+e(toLocal(event.starts_at))+' – '+e(toLocal(event.ends_at))+'</small>'+
  (event.description?'<p>'+e(event.description)+'</p>':'')+'</div>'+
  (admin?'<button type="button" class="mw-btn mw-btn-outline" data-event-toggle="'+e(event.id)+'">'+
  (event.is_published?'Unpublish':'Publish')+'</button>':'')+
  '</article>';
 const html=heading('OUR SCHOOL COMMUNITY','Calendar & events',
  admin?'Plan preschool events, parent meetings, school closures and celebrations.':'See upcoming celebrations, school activities and family events.')+
 '<div class="mw-metrics">'+stat('Upcoming',upcoming.length,'🗓️','teal')+
  stat(admin?'Published events':'Past events',admin?rows.filter(r=>r.is_published).length:past.length,'🎈','amber')+'</div>'+
 (admin?box('Add a school event',
  '<form class="mw-form" id="bp-event-form">'+
  field('Event name',input('bp-event-title','e.g. Parent-teacher morning, Sports Day','text','required minlength="3" maxlength="150"'))+
  '<div class="bp-calendar-form-dates">'+
  field('Starts','<input id="bp-event-start" type="datetime-local" value="'+timeInput(86400000)+'" required>')+
  field('Ends','<input id="bp-event-end" type="datetime-local" value="'+timeInput(90000000)+'" required>')+'</div>'+
  field('Who should see it?',select('bp-event-audience','<option value="all">Parents and teachers</option><option value="parents">Parents only</option><option value="teachers">Teachers only</option>'))+
  field('Description',textarea('bp-event-description','Bring a hat, arrive by 9 AM, or other helpful details…','maxlength="1500"'))+
  '<label class="mw-check-label"><input type="checkbox" id="bp-event-publish"><span>Publish immediately and notify school families / staff who can view this event.</span></label>'+
  button('Save school event','bp-event-save','primary','type="submit"')+'</form>'):'')+
 box('Upcoming school events',upcoming.length?'<div class="bp-calendar-events">'+upcoming.map(card).join('')+'</div>':
 empty('🎈','A happy calendar starts here',admin?'Add your first preschool event or parent meeting above.':'Your school will share upcoming events here.'))+
 (admin&&rows.some(x=>!x.is_published)?box('Unpublished drafts','<div class="bp-calendar-events">'+rows.filter(x=>!x.is_published&&new Date(x.ends_at).getTime()<now).map(card).join('')+'</div>'):'')+
 (past.length?box('Past events','<div class="bp-calendar-events">'+past.slice(-12).reverse().map(card).join('')+'</div>'):'');
 return{html,bind(){
  if(!admin)return;
  form('bp-event-form',async()=>{
   const start=schoolLocalToUtc(v('bp-event-start')),end=schoolLocalToUtc(v('bp-event-end'));
   if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<=start)throw Error('The event must end after it starts');
   if(end.getTime()-start.getTime()>30*86400000)throw Error('Maximum duration is 30 days');
   await write(db,'bp_school_events',{school_id:sid,title:v('bp-event-title'),description:v('bp-event-description'),
    starts_at:start.toISOString(),ends_at:end.toISOString(),audience:v('bp-event-audience'),is_published:checked('bp-event-publish'),created_by:user.id});
   await reload();
  });
  document.querySelectorAll('[data-event-toggle]').forEach(b=>b.onclick=async()=>{
   const event=rows.find(r=>r.id===b.dataset.eventToggle);if(!event)return;
   b.disabled=true;
   try{
    await update(db,'bp_school_events',{is_published:!event.is_published},{id:event.id,school_id:sid});
    notice(event.is_published?'Event unpublished':'Event published');await reload();
   }catch(err){notice(err.message,'error');b.disabled=false;}
  });
 }};
}
