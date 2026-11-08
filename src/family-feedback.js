import {escapeHtml as e,dateLabel,stat,box,empty,pill,field,input,select,textarea,button,heading,option,read,rpc,form,notice,v,checked} from './workspace-core.js';

const cats={communication:['💬','Communication'],childcare:['🧸','Daily care'],safety:['🛡️','Safety & trust'],facilities:['🏡','School environment'],overall:['🌟','Overall experience']};
const stars=n=>'★'.repeat(Math.max(0,Math.min(5,n)))+'☆'.repeat(Math.max(0,5-n));
const avg=x=>x.length?(x.reduce((sum,n)=>sum+Number(n||0),0)/x.length).toFixed(1):'—';
function ratingInput(id,title,selected){
 return '<fieldset class="bp-feedback-rating"><legend>'+e(title)+'</legend><div>'+
 Array.from({length:5},(_,i)=>{const n=i+1;return '<label title="'+n+' stars"><input type="radio" name="'+e(id)+'" value="'+n+'" '+(n===selected?'checked':'')+' required><span>'+n+' ★</span></label>'}).join('')+'</div></fieldset>';
}
function selectedScore(name){const node=document.querySelector('input[name="'+name+'"]:checked');return node?Number(node.value):0}
export async function renderFamilyFeedback(ctx){
 const {db,schoolId:sid,role,user,reload}=ctx,admin=role==='school_admin';
 const [surveys,responses,reviews,profiles]=await Promise.all([
  read(db,'bp_family_surveys',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(100)),
  read(db,'bp_family_survey_responses',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(600)),
  read(db,'bp_parent_reviews',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(200)),
  admin?read(db,'bp_profiles'):Promise.resolve([])
 ]);
 const people=new Map(profiles.map(p=>[p.user_id,p.full_name||p.email]));
 const active=surveys.filter(x=>x.status==='published'),unfinished=surveys.filter(s=>s.status==='published'&&!responses.some(r=>r.survey_id===s.id&&r.parent_user_id===user.id));
 const surveyCard=s=>{
  const answers=responses.filter(r=>r.survey_id===s.id),mine=answers.find(a=>a.parent_user_id===user.id);
  return '<article class="bp-feedback-survey"><header class="bp-survey-head"><div><span>📋 FAMILY SURVEY</span><h3>'+e(s.title)+'</h3><small>'+dateLabel(s.created_at)+' · '+answers.length+' response'+(answers.length===1?'':'s')+'</small></div>'+
    pill(s.status,s.status==='published'?'green':'neutral')+'</header>'+
    (s.description?'<p class="bp-survey-description">'+e(s.description)+'</p>':'')+
    (admin?'<div class="bp-survey-results">'+[1,2,3].map(n=>{
      const vals=answers.map(a=>a['answer'+n]);return '<div><span>'+e(s['question'+n])+'</span><b>'+avg(vals)+'/5</b>'+
       '<small>'+answers.length+' parents responded</small></div>';
     }).join('')+'</div>'+
     (answers.length?'<div class="bp-feedback-comments"><strong>Parent comments (private)</strong>'+
       answers.filter(a=>a.comment).slice(0,20).map(a=>'<blockquote><p>'+e(a.comment)+'</p><small>'+e(people.get(a.parent_user_id)||'Approved parent')+' · '+dateLabel(a.created_at)+'</small></blockquote>').join('')+'</div>':'')+
     (s.status==='published'?button('Close survey','bp-survey-close-'+s.id,'outline','type="button" data-close-survey="'+e(s.id)+'"'):''):'')+
    (!admin&&mine?'<div class="bp-survey-thanks">✅ You completed this survey on '+dateLabel(mine.created_at)+'. Thank you for helping your school improve.</div>':'')+
    (!admin&&!mine&&s.status==='published'?'<form class="mw-form bp-survey-answer" id="bp-survey-answer-'+e(s.id)+'">'+
      [1,2,3].map(n=>ratingInput('bp-survey-'+s.id+'-'+n,s['question'+n])).join('')+
      field('Optional suggestion or comment',textarea('bp-survey-comment-'+s.id,'What could your school do better?','maxlength="800"'))+
      '<p class="bp-private-hint">This is a private survey. School administrators can review your ratings, comment and parent account. Other parents cannot see your response.</p>'+
      button('Send survey response','bp-survey-submit-'+s.id,'primary','type="submit"')+'</form>':'')+
    '</article>';
 };
 const reviewCard=review=>{
  const canAnswer=admin,own=review.parent_user_id===user.id;
  return '<article class="bp-family-review"><header class="bp-review-head"><span>'+e(cats[review.category]?.[0]||'🌟')+'</span><div><h3>'+e(cats[review.category]?.[1]||review.category)+'</h3>'+
   '<small>'+dateLabel(review.created_at)+(admin?' · '+e(people.get(review.parent_user_id)||'Parent'):'')+'</small></div>'+
   pill(review.status,review.status==='resolved'?'green':'amber')+'</header>'+
   '<strong class="bp-review-stars" aria-label="'+review.rating+' out of 5 stars">'+stars(review.rating)+'</strong>'+
   '<p>'+e(review.body)+'</p>'+
   (review.admin_reply?'<div class="bp-family-response"><strong>School Administration replied:</strong><p>'+e(review.admin_reply)+'</p></div>':'')+
   (canAnswer?'<form class="mw-form bp-review-response" id="bp-review-response-'+e(review.id)+'">'+
     field('Private reply to this parent',textarea('bp-review-reply-'+review.id,'Thank the parent, explain the follow-up and describe actions taken.','required minlength="5" maxlength="1200"'))+
     '<label class="mw-check-label"><input type="checkbox" id="bp-review-resolve-'+e(review.id)+'"><span>Mark the feedback resolved after responding.</span></label>'+
     button('Send private reply','bp-review-reply-send-'+review.id,'primary','type="submit"')+'</form>':'')+'</article>';
 };
 const html=heading('HEAR EVERY FAMILY','Parent surveys & reviews',
 admin?'Create quick surveys, monitor parent satisfaction and reply to private school reviews.':'Tell your school what is working, what worries you, and how the experience can improve.')+
 '<div class="bp-feedback-intro"><span>💛</span><div><strong>Every family deserves to be heard.</strong><p>Feedback stays within this school. Your survey answers and reviews are not published on the public website or shown to other families.</p></div></div>'+
 '<div class="mw-metrics">'+stat(admin?'Parent surveys':'Surveys to answer',admin?surveys.length:unfinished.length,'📋','teal')+
   stat('Private reviews',reviews.length,'⭐','amber')+
   stat(admin?'Average parent rating':'My completed surveys',admin?avg(reviews.map(r=>r.rating))+'/5':responses.filter(r=>r.parent_user_id===user.id).length,'💛','blue')+'</div>'+
 (admin?box('Create a quick parent survey',
  '<form class="mw-form" id="bp-create-survey">'+
    field('Survey title',input('bp-survey-title','e.g. How was your family’s first month?','text','required minlength="5" maxlength="150"'))+
    field('Short introduction',textarea('bp-survey-desc','Tell parents why their answers matter.','maxlength="1200"'))+
    field('Rating question 1',input('bp-survey-q1','How satisfied are you with daily updates?','text','required minlength="5" maxlength="220" value="How satisfied are you with daily school updates?"'))+
    field('Rating question 2',input('bp-survey-q2','How safe do you feel your child is?','text','required minlength="5" maxlength="220" value="How satisfied are you with your child’s care and safety?"'))+
    field('Rating question 3',input('bp-survey-q3','How helpful is school communication?','text','required minlength="5" maxlength="220" value="How responsive is the school to parent communication?"'))+
    '<p class="bp-private-hint">Surveys ask three 1–5 rating questions and allow an optional written comment. They are sent to approved parents at this school through in-app notifications.</p>'+
    button('Publish survey','bp-create-survey-submit','primary','type="submit"')+'</form>'):'')+
 box(admin?'Parent survey results':'Surveys from my school',surveys.length?'<div class="bp-survey-list">'+surveys.map(surveyCard).join('')+'</div>':
  empty('📋','No parent surveys yet',admin?'Create your first three-question parent survey above.':'When your school publishes a survey, it will appear here.'))+
 (!admin?box('Review your school privately',
  '<form class="mw-form" id="bp-create-review">'+
   field('Review category',select('bp-review-category',Object.entries(cats).map(([key,parts])=>option(key,parts[0]+' '+parts[1])).join('')))+
   ratingInput('bp-review-rating','How would you rate this aspect of your school?')+
   field('Your experience',textarea('bp-review-body','What did the school do well? What should it improve?','required minlength="15" maxlength="1200"'))+
   '<p class="bp-private-hint">School Administration receives this review directly. It is not posted publicly, and teachers or other parents cannot view it.</p>'+
   button('Submit private review','bp-review-submit','primary','type="submit"')+'</form>'):'')+
 box(admin?'Parents’ private reviews':'My reviews & school responses',reviews.length?'<div class="bp-review-list">'+reviews.map(reviewCard).join('')+'</div>':
  empty('🌟','No parent reviews yet',admin?'Family reviews and ratings will appear here.':'You can write a private review above. School Administration may respond.'));
 return{html,bind(){
  if(admin){
   form('bp-create-survey',async()=>{
    const r=await rpc(db,'bp_create_family_survey',{p_school:sid,p_title:v('bp-survey-title'),p_description:v('bp-survey-desc'),
      p_q1:v('bp-survey-q1'),p_q2:v('bp-survey-q2'),p_q3:v('bp-survey-q3')});
    if(!r.ok||!r.id)throw Error('Survey was not confirmed');await reload();
   });
   document.querySelectorAll('[data-close-survey]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Close this survey to new responses? Existing answers will remain visible.'))return;
    b.disabled=true;try{const r=await rpc(db,'bp_close_family_survey',{p_survey:b.dataset.closeSurvey});
      if(!r.ok)throw Error('Survey was not closed');await reload();}
    catch(err){notice(err.message,'error');b.disabled=false}
   });
   reviews.forEach(r=>form('bp-review-response-'+r.id,async()=>{
    const result=await rpc(db,'bp_reply_parent_review',{p_review:r.id,p_message:v('bp-review-reply-'+r.id),
      p_resolved:checked('bp-review-resolve-'+r.id)});
    if(!result.ok)throw Error('School reply was not confirmed');await reload();
   }));
  }else{
   for(const survey of surveys.filter(s=>s.status==='published'&&!responses.some(r=>r.survey_id===s.id&&r.parent_user_id===user.id))){
    form('bp-survey-answer-'+survey.id,async()=>{
     const scores=[1,2,3].map(n=>selectedScore('bp-survey-'+survey.id+'-'+n));
     if(scores.some(x=>!x))throw Error('Choose a rating for all three questions');
     const r=await rpc(db,'bp_answer_family_survey',{p_survey:survey.id,p_a1:scores[0],p_a2:scores[1],p_a3:scores[2],
      p_comment:v('bp-survey-comment-'+survey.id)});
     if(!r.ok||!r.id)throw Error('Survey response was not confirmed');await reload();
    });
   }
   form('bp-create-review',async()=>{
    const score=selectedScore('bp-review-rating');if(score<1||score>5)throw Error('Choose a rating between 1 and 5');
    const r=await rpc(db,'bp_submit_parent_review',{p_school:sid,p_category:v('bp-review-category'),
      p_rating:score,p_body:v('bp-review-body')});
    if(!r.ok||!r.id)throw Error('Review submission was not confirmed');await reload();
   });
  }
 }};
}
