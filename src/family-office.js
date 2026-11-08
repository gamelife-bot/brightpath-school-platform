import {escapeHtml as e,dateLabel,stat,box,empty,pill,field,input,select,textarea,button,heading,option,read,rpc,form,notice,v} from './workspace-core.js';

const TOPICS={general:['💬','General question'],childcare:['🧸','Childcare and routines'],billing:['💳','Fees and billing'],complaint:['📝','Concern or feedback'],documents:['📄','School paperwork'],other:['🌻','Other request']};
const stamp=value=>new Date(value).toLocaleString('en-KE',{dateStyle:'medium',timeStyle:'short'});
function setThreadQuery(id){
 const url=new URL(location.href);
 if(id)url.searchParams.set('thread',id);else url.searchParams.delete('thread');
 history.replaceState(null,'',url.pathname+url.search);
}
export async function renderAdminInbox(ctx){
 const {db,schoolId:sid,user,role,reload,go}=ctx;
 const isAdmin=role==='school_admin';
 if(!['parent','school_admin'].includes(role))return {html:heading('Private inbox','Unavailable','Contact School Administration from your parent portal.')};
 const [threads,messages,children,profiles]=await Promise.all([
  read(db,'bp_admin_conversations',q=>q.eq('school_id',sid).order('updated_at',{ascending:false}).limit(200)),
  read(db,'bp_admin_thread_messages',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(700)),
  read(db,'bp_students',q=>q.eq('school_id',sid).order('full_name')),
  isAdmin?read(db,'bp_profiles'):Promise.resolve([])
 ]);
 const names=new Map(profiles.map(p=>[p.user_id,p.full_name||p.email]));
 let current=new URLSearchParams(location.search).get('thread')||threads[0]?.id||'';
 if(!threads.some(t=>t.id===current))current=threads[0]?.id||'';
 const categories=Object.entries(TOPICS).map(([key,parts])=>option(key,parts[0]+' '+parts[1])).join('');
 const count=threads.filter(t=>t.status==='open').length;
 const listItem=(t)=>'<button type="button" class="bp-office-thread '+(t.id===current?'active':'')+'" data-office-thread="'+e(t.id)+'">'+
  '<span class="bp-office-thread-icon">'+(TOPICS[t.category]?.[0]||'💬')+'</span><span class="bp-office-thread-main"><strong>'+e(t.subject)+'</strong>'+
  '<small>'+(isAdmin?e(names.get(t.parent_user_id)||'Parent account')+' · ':'')+e(TOPICS[t.category]?.[1]||'Message')+'</small><small>'+stamp(t.updated_at)+'</small></span>'+
  pill(t.status==='open'?'Open':'Resolved',t.status==='open'?'amber':'green')+'</button>';
 const threadPanel=(id)=>{
  const t=threads.find(x=>x.id===id);
  if(!t)return empty('💌','Choose a conversation',isAdmin?'Parent messages will appear here.':'Start a new message to reach the school office directly.');
  const lines=messages.filter(m=>m.conversation_id===id).sort((a,b)=>new Date(a.created_at)-new Date(b.created_at));
  const child=children.find(x=>x.id===t.student_id);
  const mine=t.parent_user_id===user.id;
  return '<div class="bp-office-conversation-head"><div><span class="bp-office-eyebrow">PRIVATE SCHOOL OFFICE</span><h2>'+e(t.subject)+'</h2><p>'+
   (isAdmin?e(names.get(t.parent_user_id)||'Parent account')+' · ':'')+(child?'Regarding '+e(child.full_name)+' · ':'')+e(TOPICS[t.category]?.[1]||'General')+'</p></div>'+
   (isAdmin?button(t.status==='resolved'?'Reopen conversation':'Mark resolved','bp-office-status','outline','type="button"'):'')+'</div>'+
   '<div class="bp-office-conversation-note">🔒 Visible only to this parent and authorized school administrators. Teachers cannot access this conversation.</div>'+
   '<div class="bp-office-message-feed" id="bp-office-feed">'+(lines.length?lines.map(m=>
    '<article class="bp-office-msg '+(m.sender_user_id===user.id?'bp-office-mine':'')+'"><small>'+
    (m.sender_user_id===user.id?'You':m.sender_user_id===t.parent_user_id?'Parent':'School Administration')+
    ' · '+stamp(m.created_at)+'</small><p>'+e(m.body)+'</p></article>').join(''):
    empty('💌','No messages yet','Start this private conversation.'))+'</div>'+
   '<form class="bp-office-reply" id="bp-office-reply-form">'+field('Your reply',textarea('bp-office-reply','Write a respectful message about this request…','required minlength="2" maxlength="2000"'))+
   button('Send private reply','bp-office-reply-submit','primary','type="submit"')+'</form>'+
   (t.status==='resolved'?'<p class="bp-private-hint">Replying reopens this conversation.</p>':'');
 };
 const html=heading('CONFIDENTIAL SCHOOL COMMUNICATION',isAdmin?'Parent & family inbox':'Message School Administration',
  isAdmin?'Respond directly to parents, track concerns and resolve conversations.':'Write directly to your school administrator about fees, schedules, concerns or your child.')+
 '<div class="mw-metrics">'+stat('Conversations',threads.length,'💌','teal')+stat('Open requests',count,'📬','amber')+'</div>'+
 (!isAdmin?box('Start a private message to the school office',
  '<form class="mw-form" id="bp-office-create">'+
  field('What is this about?',select('bp-office-category',categories))+
  field('Subject',input('bp-office-subject','e.g. Question about pick-up arrangement','text','required minlength="4" maxlength="160"'))+
  field('Child (optional)',select('bp-office-child','<option value="">General school matter</option>'+children.map(k=>option(k.id,k.full_name)).join('')))+
  field('Message',textarea('bp-office-body','Tell the school office what you need help with…','required minlength="2" maxlength="2000"'))+
  '<p class="bp-private-hint">This goes to School Administration, not the classroom teacher. For urgent safeguarding or medical issues, call the school directly.</p>'+
  button('Send to School Administration','bp-office-start','primary','type="submit"')+'</form>'):'')+
 '<div class="bp-office-layout '+(!threads.length?'bp-office-empty':'')+'"><section class="bp-office-sidebar"><div class="bp-office-listhead"><strong>'+
 (isAdmin?'Parent conversations':'My school-office conversations')+'</strong><span>'+threads.length+'</span></div>'+
 (threads.length?threads.map(listItem).join(''):empty('💌',isAdmin?'No parent messages yet':'No conversations yet',
  isAdmin?'New private parent messages will arrive here.':'Start a private message above.'))+'</section>'+
 (threads.length?'<section class="bp-office-conversation" id="bp-office-conversation">'+threadPanel(current)+'</section>':'')+'</div>';
 return{html,bind(){
  let selected=current;
  const bindDetail=()=>{
   if(!selected)return;
   const t=threads.find(x=>x.id===selected);
   if(!t)return;
   if(isAdmin){
    const status=document.getElementById('bp-office-status');
    if(status)status.onclick=async()=>{
     status.disabled=true;
     try{
      const response=await rpc(db,'bp_set_admin_conversation_status',{p_conversation:selected,p_status:t.status==='resolved'?'open':'resolved'});
      if(!response.ok)throw Error('Could not confirm the status change');
      notice('Conversation updated');await reload();
     }catch(err){notice(err.message,'error');status.disabled=false}
    };
   }
   form('bp-office-reply-form',async()=>{
    const response=await rpc(db,'bp_reply_admin_conversation',{p_conversation:selected,p_body:v('bp-office-reply')});
    if(!response.ok)throw Error('School inbox did not confirm the reply');
    await reload();
   });
   const feed=document.getElementById('bp-office-feed');if(feed)feed.scrollTop=feed.scrollHeight;
  };
  document.querySelectorAll('[data-office-thread]').forEach(b=>b.onclick=()=>{
   selected=b.dataset.officeThread;setThreadQuery(selected);
   document.querySelectorAll('[data-office-thread]').forEach(x=>x.classList.toggle('active',x.dataset.officeThread===selected));
   document.getElementById('bp-office-conversation').innerHTML=threadPanel(selected);
   bindDetail();
  });
  if(!isAdmin)form('bp-office-create',async()=>{
   const response=await rpc(db,'bp_open_admin_conversation',{p_school:sid,p_subject:v('bp-office-subject'),
    p_category:v('bp-office-category'),p_body:v('bp-office-body'),p_student:v('bp-office-child')||null});
   if(!response.ok||!response.conversation_id)throw Error('School Administration did not confirm receipt. Please check before trying again.');
   setThreadQuery(response.conversation_id);notice('Your message reached School Administration');await reload();
  });
  bindDetail();
 }};
}
