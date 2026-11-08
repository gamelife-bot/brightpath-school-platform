import {renderCareRelay} from './care-relay.js';
import {renderQuietClassroom} from './quiet-classroom.js';
import {renderStaffCoverage} from './staff-coverage.js';
import {renderMedicationSafety} from './medication-safety.js';
import {renderSchoolCalendar} from './school-calendar.js';
import {renderChildProfiles,renderIncidents} from './child-center.js';
import {renderNotifications,renderQuickCare,renderDailySummary} from './activity-hub.js';
import {welcomeArt} from './playful-art.js';
import {renderCareDiary,renderMilestones,renderChildMessages} from './daycare.js';
import {renderPickupDesk} from './daycare-pickup.js';
import {renderChildMoments} from './daycare-media.js';
import {escapeHtml as e,numberLabel as n,dateLabel,initial,stat,box,empty,pill,status,field,input,select,textarea,button,heading,table,tr,option,bar,read,write,result,form,click,notice,v} from './workspace-core.js';

const today=()=>new Date().toLocaleDateString('en-CA');
const SUBJECTS=['Mathematics','English','Reading','Science','Art & Creativity','Physical Education','Social Skills','Other'];
const kidLabel=(s,classes)=>s.full_name+' · '+(classes.find(c=>c.id===s.class_id)?.name||'Class');
async function teacherData(db,sid){
 const [assignments,classes,students,activities]=await Promise.all([
  read(db,'bp_teacher_classes',q=>q.eq('school_id',sid)),
  read(db,'bp_classes',q=>q.eq('school_id',sid).order('name')),
  read(db,'bp_students',q=>q.eq('school_id',sid).order('full_name')),
  read(db,'bp_activities',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(100))
 ]);
 const allowed=new Set(assignments.map(a=>a.class_id));
 return {classes:classes.filter(c=>allowed.has(c.id)),students:students.filter(s=>allowed.has(s.class_id)),
  activities:activities.filter(a=>students.some(s=>s.id===a.student_id&&allowed.has(s.class_id)))};
}
function teachingActivity(a,students){
 const s=students.find(x=>x.id===a.student_id);
 return '<article class="mw-journal-entry"><div class="mw-line-between"><div><span class="mw-mini-meta">'+e(s?.full_name||'Student')+' · '+dateLabel(a.created_at)+'</span><h3>'+e(a.title)+'</h3></div>'+pill(a.score+'%','green')+'</div>'+
  '<span class="mw-subject-label">'+e(a.subject)+'</span><p>'+e(a.notes)+'</p>'+
  ''+'</article>';
}
export async function renderTeacherPage(ctx,tab){
 const {db,schoolId:sid,user,go,reload,photoData}=ctx;
 if(!sid)throw Error('Teacher account has not been assigned to a school.');
 const {classes,students,activities}=await teacherData(db,sid);
 if(tab==='quiet')return renderQuietClassroom(ctx);
 if(tab==='relay')return renderCareRelay(ctx);
 if(tab==='events')return renderSchoolCalendar(ctx);
 if(tab==='medications')return renderMedicationSafety(ctx);
 if(tab==='staffing')return renderStaffCoverage(ctx);

 if(tab==='notifications')return renderNotifications(ctx);
 if(tab==='profiles')return renderChildProfiles(ctx);
 if(tab==='incidents')return renderIncidents(ctx);
 if(tab==='daily_summary')return renderDailySummary(ctx);
 if(tab==='quickcare')return renderQuickCare(ctx);
 if(tab==='care')return renderCareDiary(ctx);
 if(tab==='milestones')return renderMilestones(ctx);
 if(tab==='messages')return renderChildMessages(ctx);
 if(tab==='pickup')return renderPickupDesk(ctx);
 if(tab==='moments')return renderChildMoments(ctx);
 if(tab==='overview'){
  const attendance=await read(db,'bp_attendance',q=>q.eq('school_id',sid).eq('attendance_date',today()));
  const [careLogs,milestones]=await Promise.all([read(db,'bp_care_logs',q=>q.eq('school_id',sid).order('occurred_at',{ascending:false}).limit(80)),read(db,'bp_milestones',q=>q.eq('school_id',sid).order('observed_at',{ascending:false}).limit(80))]);
  const childIds=new Set(students.map(s=>s.id));const careToday=careLogs.filter(x=>childIds.has(x.student_id)&&new Date(x.occurred_at).toDateString()===new Date().toDateString());const recentMilestones=milestones.filter(x=>childIds.has(x.student_id));
  const recorded=attendance.filter(a=>students.some(s=>s.id===a.student_id));
  const html=heading('WELCOME TO YOUR CLASSROOM','Good morning, '+(user.name?.split(' ')[0]||'Teacher'),'Everything you need for a caring, happy day with your little learners.')+
   '<div class="mw-metrics">'+stat('My classes',classes.length,'📚','teal')+stat('My students',students.length,'🎒','blue')+
   stat('Daily care updates',careToday.length,'☀','violet')+stat('Milestones',recentMilestones.length,'🌱','amber')+'</div>'+
   '<div class="mw-welcome mw-welcome-teacher"><div><span class="mw-welcome-kicker">TEACHER WORKSPACE</span><h2>Every little moment counts</h2><p>Share nap times, meals, playtime, photo updates and growing milestones with families.</p>'+
   button('Log a care moment →','mw-new-post','light')+'</div><div class="mw-welcome-art">'+welcomeArt('teacher')+'</div></div>'+
   '<div class="mw-section-title"><h2>Your daily tools</h2></div>'+
   '<div class="mw-actions-grid">'+[
    ['Care Relay · family handovers','relay','🌈'],['Quiet Classroom assistant','quiet','🌿'],['Log daily care','care','☀'],['Share photos & videos','moments','📸'],['Record a milestone','milestones','🌱'],['Parent messages','messages','💌']
   ].map(([label,p,ico])=>'<button class="mw-action" data-goto="'+p+'"><span>'+ico+'</span><b>'+label+'</b><small>Open workspace</small><i>↗</i></button>').join('')+'</div>'+
   '<div class="cr-home-banner"><span>🌈</span><div><b>Know what needs your attention today.</b><p>Important morning notes, safely recorded pickups and reviewed daily summaries—without an extra report for every child.</p></div>'+button('Care Relay →','cr-teacher-home','outline')+'</div>'+
   '<div class="bp-teacher-callout"><span>🌿</span><div><b>Less paperwork, more presence.</b><p>Quiet Classroom shows today’s actual records and prepares private drafts. No compulsory extra report.</p></div>'+button('Open my assistant →','bp-open-quiet','outline')+'</div>'+
   '<div class="bp-teacher-callout"><span>✨</span><div><b>Group storytime, snacks or rest?</b><p>Post the same routine to every child who participated, with one quick update.</p></div>'+button('Quick classroom update →','bp-quick-start','outline')+'</div>'+
   '<div class="mw-two">'+box('My classes',classes.length?'<div class="mw-class-mini">'+classes.map(c=>'<div><b>'+e(c.name)+'</b><span>'+students.filter(s=>s.class_id===c.id).length+' students</span></div>').join('')+'</div>':
    empty('📗','Awaiting class assignment','Your school administrator will assign your classrooms.'))+
   box('Recent activities',activities.length?'<div class="mw-recent">'+activities.slice(0,5).map(a=>'<div><b>'+e(a.title)+'</b><small>'+e(students.find(s=>s.id===a.student_id)?.full_name||'Student')+' · '+dateLabel(a.created_at)+'</small><span>'+a.score+'%</span></div>').join('')+'</div>':
    empty('✎','Your activity journal is ready','Publish your first lesson update.'))+'</div>';
  return {html,bind(){click('mw-new-post',()=>go('care'));click('bp-quick-start',()=>go('quickcare'));click('bp-open-quiet',()=>go('quiet'));click('cr-teacher-home',()=>go('relay'));document.querySelectorAll('[data-goto]').forEach(b=>b.onclick=()=>go(b.dataset.goto))}};
 }
 if(tab==='classes'){
  const html=heading('MY CLASSROOMS','Assigned classes','View your classroom assignments and student groups.')+
   '<div class="mw-metrics">'+stat('Teaching classes',classes.length,'📚','teal')+stat('Enrolled students',students.length,'🎒','blue')+'</div>'+
   (classes.length?'<div class="mw-class-grid">'+classes.map(c=>'<article class="mw-class-card"><div class="mw-class-icon">📚</div><p>YOUR CLASS</p><h2>'+e(c.name)+'</h2><strong>'+students.filter(s=>s.class_id===c.id).length+'</strong><span>students</span><button data-class-students="1" class="mw-btn mw-btn-outline">View students ↗</button></article>').join('')+'</div>':
   empty('📚','Your classes will appear here','Ask the school administrator to assign your teaching classes.'));
  return{html,bind(){document.querySelectorAll('[data-class-students]').forEach(b=>b.onclick=()=>go('students'))}};
 }
 if(tab==='students'){
  const scores=new Map(students.map(s=>[s.id,activities.filter(a=>a.student_id===s.id)]));
  const html=heading('CLASS ROSTER','My students','Students assigned to your classrooms and their recent progress.')+
   '<div class="mw-metrics">'+stat('Students',students.length,'🎒','teal')+stat('Classes',classes.length,'📗','blue')+'</div>'+
   box('Class roster',students.length?'<div class="mw-filter-row">'+input('mw-students-search','Search students')+'</div><div id="mw-students-table">'+
   table(['Student','Class','Activities','Average score','Photo permission'],students.map(s=>{
    const records=scores.get(s.id)||[];
    const mean=records.length?Math.round(records.reduce((v,a)=>v+a.score,0)/records.length):null;
    return tr(['<span class="mw-identity"><span class="mw-round-icon">'+initial(s.full_name)+'</span><b>'+e(s.full_name)+'</b></span>',
      e(classes.find(c=>c.id===s.class_id)?.name||'Class'),records.length,
      mean===null?'—':pill(mean+'%','green'),status(s.photo_consent?'approved':'not recorded')]);
   }))+'</div>':empty('🎒','No students assigned','Your school administrator will manage enrollment and class assignments.'));
  return{html,bind(){
   const f=document.getElementById('mw-students-search');
   if(f)f.oninput=()=>document.querySelectorAll('#mw-students-table tbody tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(f.value.toLowerCase()));
  }};
 }
 if(tab==='publish'){
  const html=heading('LEARNING JOURNAL','Post a classroom activity','Record a student’s achievement, assessment and observation.')+
   '<div class="mw-two mw-two-side">'+box('New activity',
    '<form id="mw-publish-form" class="mw-form">'+field('Student',select('mw-post-student','<option value="">Select student</option>'+students.map(s=>option(s.id,kidLabel(s,classes))).join(''),'required'))+
     field('Subject',select('mw-post-subject',SUBJECTS.map(s=>option(s,s)).join('')))+
     field('Activity title',input('mw-post-title','What did they learn?','text','required minlength="2" maxlength="120"'))+
     field('Teacher observation',textarea('mw-post-notes','Describe participation, progress and achievement…','required minlength="2" maxlength="2000"'))+
     field('Score (0–100)',input('mw-post-score','85','number','min="0" max="100" required value="85"'))+
     '<div class="mw-form-tip">Share photos and short videos in the dedicated Photos & videos workspace.</div>'+
     '<div class="mw-form-actions">'+button('Publish activity','mw-publish-submit','primary','type="submit" '+(!students.length?'disabled':''))+'</div></form>')+
    box('Publishing guide', '<div class="mw-guidance">'+
     '<div><span>1</span><p><b>Choose the student</b><small>Only your assigned class roster is available</small></p></div>'+
     '<div><span>2</span><p><b>Write an observation</b><small>Record real progress, not just a score</small></p></div>'+
     '<div><span>3</span><p><b>Share securely</b><small>Linked families can read approved learning updates</small></p></div></div>')+'</div>'+
   box('Recent posts',activities.length?'<div class="mw-journal-list">'+activities.slice(0,6).map(a=>teachingActivity(a,students)).join('')+'</div>':
    empty('✎','Your class journal is ready','Post the first learning activity above.'));
  return{html,bind(){
   form('mw-publish-form',async()=>{
    const student=students.find(s=>s.id===v('mw-post-student'));
    if(!student)throw Error('Choose a student from your class');
     await write(db,'bp_activities',{
     school_id:sid,student_id:student.id,teacher_user_id:user.id,
     subject:v('mw-post-subject'),title:v('mw-post-title'),notes:v('mw-post-notes'),
     score:Number(v('mw-post-score'))
    });
    await reload();
   });
  }};
 }
 if(tab==='gradebook'){
  const scoreAvg=activities.length?Math.round(activities.reduce((v,a)=>v+Number(a.score),0)/activities.length):null;
  const html=heading('STUDENT PROGRESS','Gradebook','Explore recorded learning scores across your assigned classrooms.')+
   '<div class="mw-metrics">'+stat('Recorded assessments',activities.length,'✎','teal')+
   stat('Average score',scoreAvg===null?'—':scoreAvg+'%','📈','blue')+
   stat('Students assessed',new Set(activities.map(a=>a.student_id)).size,'🎓','violet')+'</div>'+
   box('Assessment records',activities.length?'<div class="mw-filter-row">'+input('mw-grade-search','Filter students, subjects or activities')+'</div><div id="mw-grade-table">'+
   table(['Student','Subject','Activity','Score','Date'],activities.map(a=>tr([
    e(students.find(s=>s.id===a.student_id)?.full_name||'Student'),e(a.subject),'<b>'+e(a.title)+'</b>',
    pill(a.score+'%','green'),dateLabel(a.created_at)
   ])))+'</div>':empty('📊','No scores recorded','Publish classroom activities to build your gradebook.'));
  return{html,bind(){
   const el=document.getElementById('mw-grade-search');if(el)el.oninput=()=>{
    document.querySelectorAll('#mw-grade-table tbody tr').forEach(row=>row.hidden=!row.textContent.toLowerCase().includes(el.value.toLowerCase()));
   };
  }};
 }
 if(tab==='attendance'){
  const records=await read(db,'bp_attendance',q=>q.eq('school_id',sid).order('attendance_date',{ascending:false}).limit(500));
  const todayRecords=records.filter(a=>a.attendance_date===today()&&students.some(s=>s.id===a.student_id));
  const html=heading('CLASSROOM ATTENDANCE','Attendance register','Mark attendance for students assigned to your classes.')+
   '<div class="mw-metrics">'+stat('Recorded today',todayRecords.length,'▤','teal')+
   stat('Present',todayRecords.filter(r=>r.status==='present').length,'✓','blue')+
   stat('Absent',todayRecords.filter(r=>r.status==='absent').length,'◷','amber')+'</div>'+
   box('Class register','<div class="mw-filter-row">'+field('Attendance date','<input id="mw-att-date" type="date" value="'+today()+'">')+
    field('Class',select('mw-att-class','<option value="all">All my classes</option>'+classes.map(c=>option(c.id,c.name)).join('')))+'</div><div id="mw-att-roster"></div>')+
   box('Recent records',records.length?table(['Student','Date','Status'],records.filter(a=>students.some(s=>s.id===a.student_id)).slice(0,25).map(a=>tr([
    e(students.find(s=>s.id===a.student_id)?.full_name||'Student'),dateLabel(a.attendance_date),status(a.status)
   ]))):empty('✓','Attendance register is ready','Select a day and mark your students.'));
  return{html,bind(){
   const render=()=>{
    const day=v('mw-att-date')||today(),cls=v('mw-att-class')||'all';
    const kids=students.filter(s=>cls==='all'||s.class_id===cls);
    document.getElementById('mw-att-roster').innerHTML=kids.length?table(['Student','Status','Action'],kids.map(s=>{
     const rec=records.find(a=>a.student_id===s.id&&a.attendance_date===day);
     return tr([e(s.full_name),select('mw-att-'+s.id,
      '<option value="">Choose status</option>'+['present','late','absent','excused'].map(p=>'<option value="'+p+'" '+(rec?.status===p?'selected':'')+'>'+p+'</option>').join('')),
      button('Save','mw-save-'+s.id,'outline','data-save-att="'+e(s.id)+'"')]);
    })):empty('🎒','No students assigned','Your school administrator assigns your student roster.');
    document.querySelectorAll('[data-save-att]').forEach(b=>b.onclick=async()=>{
     const chosen=v('mw-att-'+b.dataset.saveAtt);
     if(!chosen){notice('Select a status first','error');return}
     try{
      result(await db.from('bp_attendance').upsert({school_id:sid,student_id:b.dataset.saveAtt,attendance_date:day,status:chosen,marked_by:user.id,marked_at:new Date().toISOString()},{onConflict:'school_id,student_id,attendance_date'}));
      notice('Attendance saved');await reload();
     }catch(err){notice(err.message,'error')}
    });
   };
   document.getElementById('mw-att-date').onchange=render;
   document.getElementById('mw-att-class').onchange=render;
   render();
  }};
 }
 if(tab==='announcements'){
  const announcements=await read(db,'bp_announcements',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(100));
  const visible=announcements.filter(a=>a.is_published&&(a.audience==='all'||a.audience==='teachers'));
  return{html:heading('SCHOOL UPDATES','Announcements','Important school messages shared with your teaching team.')+
   box('Latest announcements',visible.length?'<div class="mw-journal-list">'+visible.map(a=>
    '<article class="mw-notice-entry"><div class="mw-line-between"><div><strong>'+e(a.title)+'</strong><small>'+dateLabel(a.created_at)+'</small></div>'+pill(a.audience==='all'?'Schoolwide':'Teachers','green')+'</div><p>'+e(a.body)+'</p></article>'
   ).join('')+'</div>':empty('📣','You are all caught up','New school announcements will appear here.'))};
 }
 return{html:heading('Teacher portal','Page unavailable','Choose a workspace section.')};
}
