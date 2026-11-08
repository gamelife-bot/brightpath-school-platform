import {renderSignatures} from './signature-center.js';
import {renderFamilyFeedback} from './family-feedback.js';
import {renderGuardianChanges} from './guardian-requests.js';
import {renderPrivacyCenter} from './privacy-center.js';
import {renderMedicationSafety} from './medication-safety.js';
import {renderAdminInbox} from './family-office.js';
import {renderFamilyNotices} from './family-notices.js';
import {renderSchoolCalendar} from './school-calendar.js';
import {renderChildProfiles,renderIncidents} from './child-center.js';
import {renderNotifications,renderQuickCare,renderDailySummary} from './activity-hub.js';
import {welcomeArt} from './playful-art.js';
import {renderCareDiary,renderMilestones,renderChildMessages} from './daycare.js';
import {renderPickupDesk} from './daycare-pickup.js';
import {renderChildMoments} from './daycare-media.js';
import {escapeHtml as e,numberLabel as n,dateLabel,initial,stat,box,empty,pill,status,field,input,select,button,heading,table,tr,option,bar,read,result,click} from './workspace-core.js';

async function familyData(db,sid){
 const [links,students,activities,classes]=await Promise.all([
  read(db,'bp_parent_links',q=>q.eq('school_id',sid)),
  read(db,'bp_students',q=>q.eq('school_id',sid).order('full_name')),
  read(db,'bp_activities',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(150)),
  read(db,'bp_classes',q=>q.eq('school_id',sid))
 ]);
 const ids=new Set(links.map(l=>l.student_id));
 return {children:students.filter(s=>ids.has(s.id)),activities:activities.filter(a=>ids.has(a.student_id)),classes};
}
function subjectSummary(activities){
 const scores=new Map();
 for(const a of activities){
  const p=scores.get(a.subject)||[];
  p.push(Number(a.score));scores.set(a.subject,p);
 }
 return [...scores.entries()].map(([subject,list])=>({
  subject,count:list.length,average:Math.round(list.reduce((a,b)=>a+b,0)/list.length)
 })).sort((a,b)=>a.subject.localeCompare(b.subject));
}
function activityCard(a,children){
 const name=children.find(s=>s.id===a.student_id)?.full_name||'Student';
 return '<article class="mw-journal-entry"><div class="mw-line-between"><div><span class="mw-mini-meta">'+e(name)+' · '+dateLabel(a.created_at)+'</span><h3>'+e(a.title)+'</h3></div>'+pill(a.score+'%','green')+'</div>'+
  '<span class="mw-subject-label">'+e(a.subject)+'</span><p>'+e(a.notes)+'</p>'+
  ''+'</article>';
}
export async function renderParentPage(ctx,tab){
 const {db,schoolId:sid,user,go}=ctx;
 if(!sid)throw Error('Parent account is not linked to a school.');
 const {children,activities,classes}=await familyData(db,sid);
 const avg=activities.length?Math.round(activities.reduce((sum,a)=>sum+a.score,0)/activities.length):null;
 if(tab==='signatures')return renderSignatures(ctx);
 if(tab==='feedback')return renderFamilyFeedback(ctx);
 if(tab==='events')return renderSchoolCalendar(ctx);
 if(tab==='medications')return renderMedicationSafety(ctx);
 if(tab==='guardian_changes')return renderGuardianChanges(ctx);
 if(tab==='privacy')return renderPrivacyCenter(ctx);

 if(tab==='admin_inbox')return renderAdminInbox(ctx);
 if(tab==='family_notices')return renderFamilyNotices(ctx);
 if(tab==='notifications')return renderNotifications(ctx);
 if(tab==='profiles')return renderChildProfiles(ctx);
 if(tab==='incidents')return renderIncidents(ctx);
 if(tab==='daily_summary')return renderDailySummary(ctx);
 if(tab==='children')return renderChildProfiles(ctx);
 if(tab==='care')return renderCareDiary(ctx);
 if(tab==='milestones')return renderMilestones(ctx);
 if(tab==='messages')return renderChildMessages(ctx);
 if(tab==='pickup')return renderPickupDesk(ctx);
 if(tab==='moments')return renderChildMoments(ctx);
 if(tab==='overview'){
  const [careRecords,growthRecords,pickupRecords]=await Promise.all([read(db,'bp_care_logs',q=>q.eq('school_id',sid).order('occurred_at',{ascending:false}).limit(80)),read(db,'bp_milestones',q=>q.eq('school_id',sid).order('observed_at',{ascending:false}).limit(80)),read(db,'bp_pickup_events',q=>q.eq('school_id',sid).order('occurred_at',{ascending:false}).limit(30))]);
  const ids=new Set(children.map(c=>c.id));const care=careRecords.filter(x=>ids.has(x.student_id)),growth=growthRecords.filter(x=>ids.has(x.student_id)),pickup=pickupRecords.filter(x=>ids.has(x.student_id));
  const todayCare=care.filter(x=>new Date(x.occurred_at).toDateString()===new Date().toDateString());
  const latestGrowth=growth.slice(0,5);
  const html=heading('YOUR LITTLE ONE’S DAY','Welcome home','A calm, happy window into the little moments your child’s teachers are sharing.')+
   '<div class="mw-metrics">'+stat('My children',children.length,'💛','teal')+
   stat('Care updates today',todayCare.length,'☀','blue')+
   stat('Development moments',growth.length,'🌱','violet')+'</div>'+
   '<div class="mw-welcome mw-welcome-parent"><div><span class="mw-welcome-kicker">HELLO, FAMILY!</span><h2>Little moments. Big milestones.</h2><p>Celebrate every achievement and stay close to your child’s school day.</p>'+
   button('See today’s care diary →','mw-family-journal','light')+'</div><div class="mw-welcome-art">'+welcomeArt('parent')+'</div></div>'+
   '<div class="mw-section-title"><h2>Your child’s day</h2></div><div class="mw-actions-grid">'+[['Today’s care diary','care','☀'],['Daily summary','daily_summary','📔'],['Photos & videos','moments','📸'],['Message School Admin','admin_inbox','💌'],['Notify absence','family_notices','📮'],['Child profile','children','🧸'],['Medication plans','medications','💊'],['Guardian changes','guardian_changes','👨‍👩‍👧'],['Privacy & records','privacy','🛡️'],['Milestones','milestones','🌱'],['Classroom messages','messages','✉'],['School documents','signatures','✍️'],['Parent surveys & reviews','feedback','💛'],['School events','events','🗓️']].map(([label,tab,icon])=>'<button class="mw-action" type="button" data-family-quick="'+tab+'"><span>'+icon+'</span><b>'+label+'</b><small>Open updates ↗</small></button>').join('')+'</div>'+
   '<div class="bp-parent-office-banner"><span>💌</span><div><strong>Need to speak with School Administration?</strong><p>Ask about fees, family concerns, school policies or your child’s needs. Only school administrators can read the conversation.</p></div>'+button('Message the school office','bp-parent-admin-cta','outline')+'</div>'+
   '<div class="mw-two">'+box('My little ones',
    children.length?'<div class="mw-children-mini">'+children.map(k=>
     '<button class="bp-parent-child-quick" type="button" data-open-child="'+e(k.id)+'"><span class="mw-round-icon">'+initial(k.full_name)+'</span><span><b>'+e(k.full_name)+'</b><small>'+e(classes.find(c=>c.id===k.class_id)?.name||'Daycare room')+'</small></span><span aria-hidden="true">↗</span></button>').join('')+'</div>':
    empty('🧸','Your little one’s profile is waiting','Once the school has approved your account and verified guardianship, your child will appear here.'))+
   box('A peek at today',todayCare.length?'<div class="bp-home-care-list">'+todayCare.slice(0,6).map(log=>
     '<div><span class="bp-home-care-icon">'+({meal:'🥣',nap:'😴',mood:'😊',play:'🧸',diaper:'🧷',toilet:'🚽'}[log.event_type]||'☀️')+'</span><div><strong>'+e(children.find(x=>x.id===log.student_id)?.full_name||'Child')+'</strong><p>'+e(log.details)+'</p><small>'+new Date(log.occurred_at).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})+'</small></div></div>').join('')+'</div>':
    empty('☀️','No updates shared today','When your child’s teacher adds a meal, nap or playtime note, it will show up here.'))+'</div>'+
   '<div class="mw-two">'+box('Growing every day',latestGrowth.length?'<div class="mw-recent">'+latestGrowth.map(m=>
    '<div><b>🌱 '+e(m.title)+'</b><small>'+e(children.find(c=>c.id===m.student_id)?.full_name||'Child')+' · '+dateLabel(m.observed_at)+'</small><span>'+e(m.progress)+'</span></div>'
   ).join('')+'</div>':empty('🌱','Big milestones start small','New words, new friendships and little achievements will appear as teachers record them.'))+
   box('Safe arrivals and pickups',pickup.length?'<div class="mw-recent">'+pickup.slice(0,5).map(x=>
    '<div><b>'+(x.event_type==='check_in'?'🎒 Arrived safely':'💛 Picked up')+'</b><small>'+e(children.find(c=>c.id===x.student_id)?.full_name||'Child')+'</small><span>'+new Date(x.occurred_at).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit'})+'</span></div>'
   ).join('')+'</div>':empty('🎒','No arrivals recorded yet','School staff will record safe check-ins and pickups here.'))+'</div>';
  return{html,bind(){click('bp-parent-admin-cta',()=>go('admin_inbox'));click('mw-family-journal',()=>go('care'));document.querySelectorAll('[data-family-quick]').forEach(b=>b.onclick=()=>go(b.dataset.familyQuick));document.querySelectorAll('[data-open-child]').forEach(b=>b.onclick=()=>{const url=new URL(location.href);url.searchParams.set('child',b.dataset.openChild);history.replaceState(null,'',url.pathname+url.search);go('children')})}};
 }
 if(tab==='children'){
  const html=heading('MY FAMILY','My children','View each linked child’s profile and subject progress.')+
   (children.length?'<div class="mw-class-grid">'+children.map(s=>{
    const childActs=activities.filter(a=>a.student_id===s.id),mean=childActs.length?Math.round(childActs.reduce((v,a)=>v+a.score,0)/childActs.length):null;
    return '<article class="mw-class-card mw-child-card"><div class="mw-child-avatar">'+initial(s.full_name)+'</div><p>STUDENT PROFILE</p><h2>'+e(s.full_name)+'</h2><span>'+e(classes.find(c=>c.id===s.class_id)?.name||'Class')+'</span>'+
     '<div class="mw-child-metrics"><div><b>'+childActs.length+'</b><small>Activities</small></div><div><b>'+(mean===null?'—':mean+'%')+'</b><small>Average</small></div></div></article>';
   }).join('')+'</div>':empty('🎒','No child linked yet','Your school administrator can connect your account to your child.'))+
   box('Learning by subject',activities.length?'<div class="mw-subject-chart">'+subjectSummary(activities).map(x=>
    '<div><div class="mw-line-between"><b>'+e(x.subject)+'</b><span>'+x.average+'% · '+x.count+' updates</span></div>'+bar(x.average)+'</div>').join('')+'</div>':
    empty('📈','Subject progress will appear here','New teacher assessments will be summarized by subject.'));
  return{html};
 }
 if(tab==='journal'){
  const html=heading('LEARNING JOURNAL','Classroom moments','Your child’s latest activities, teacher notes and shared learning photos.')+
   (children.length>1?'<div class="mw-filter-row">'+field('Child',select('mw-child-filter','<option value="all">All my children</option>'+children.map(s=>option(s.id,s.full_name)).join('')))+'</div>':'')+
   '<div id="mw-parent-journal">'+(activities.length?'<div class="mw-journal-list">'+activities.map(a=>activityCard(a,children)).join('')+'</div>':
    empty('🎨','No classroom updates yet','Your child’s teacher will share activities here.'))+'</div>';
  return{html,bind(){
   const filter=document.getElementById('mw-child-filter');
   if(filter)filter.onchange=()=>document.getElementById('mw-parent-journal').innerHTML=
    '<div class="mw-journal-list">'+activities.filter(a=>filter.value==='all'||a.student_id===filter.value).map(a=>activityCard(a,children)).join('')+'</div>';
  }};
 }
 if(tab==='attendance'){
  const records=await read(db,'bp_attendance',q=>q.eq('school_id',sid).order('attendance_date',{ascending:false}).limit(300));
  const visible=records.filter(r=>children.some(s=>s.id===r.student_id));
  const html=heading('SCHOOL ATTENDANCE','Attendance','Follow your child’s school attendance and attendance history.')+
   '<div class="mw-metrics">'+stat('Present',visible.filter(a=>a.status==='present').length,'✓','teal')+
   stat('Late',visible.filter(a=>a.status==='late').length,'◷','blue')+
   stat('Absent',visible.filter(a=>a.status==='absent').length,'◉','amber')+'</div>'+
   box('Attendance history',visible.length?table(['Student','Date','Attendance'],visible.map(a=>tr([
    e(children.find(s=>s.id===a.student_id)?.full_name||'Student'),dateLabel(a.attendance_date),status(a.status)
   ]))):empty('📋','Attendance history will appear here','The school records each class day.'));
  return{html};
 }
 if(tab==='announcements'){
  const notices=await read(db,'bp_announcements',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(100));
  const visible=notices.filter(a=>a.is_published&&(a.audience==='all'||a.audience==='parents'));
  return{html:heading('SCHOOL COMMUNITY','Announcements','News, activities and important messages from your child’s school.')+
   box('School updates',visible.length?'<div class="mw-journal-list">'+visible.map(a=>
    '<article class="mw-notice-entry"><div class="mw-line-between"><div><strong>'+e(a.title)+'</strong><small>'+dateLabel(a.created_at)+'</small></div>'+
    pill(a.audience==='parents'?'For parents':'Schoolwide','green')+'</div><p>'+e(a.body)+'</p></article>').join('')+'</div>':
    empty('📣','All caught up','School announcements will appear here.'))};
 }
 if(tab==='membership'){
  return{html:heading('FAMILY MEMBERSHIP','Your membership','Everyday learning updates are included free, with optional family extras.')+
   '<div id="mw-billing-mount"></div>',async bind(){
    const {renderParentBilling}=await import('./billing.js');
    await renderParentBilling(db,sid,user);
   }};
 }
 return{html:heading('Parent portal','Page not found','Choose a section from the left sidebar.')};
}
