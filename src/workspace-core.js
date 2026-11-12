import {setSchoolTimeZone,getSchoolTimeZone} from './school-day.js';
import './workspace.css';
import './playful-workspace.css';
import './modern-v2.css';
import './modern-mobile-office.css';
import './operations-safety.css';
import './signatures-feedback.css';
import './quiet-classroom.css';
import './care-relay.css';
import './workspace-compact.css';
import './workspace-find.css';
import {renderOwnerPage} from './workspace-owner.js';
import {renderSchoolPage} from './workspace-school.js';
import {renderTeacherPage} from './workspace-teacher.js';
import {renderParentPage} from './workspace-parent.js';
import {renderDevices} from './workspace-devices.js';

export const escapeHtml = (input) => String(input ?? '').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export const dollar = (v) => 'KSh '+(Number(v||0)/100).toLocaleString('en-KE',{maximumFractionDigits:2});
export const dateLabel = (d) => d ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(String(d))?String(d)+'T12:00:00Z':d).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric',timeZone:getSchoolTimeZone()}) : '—';
export const numberLabel = (v) => Number(v||0).toLocaleString('en-KE');
export const initial = (s) => (String(s||'U').trim()[0]||'U').toUpperCase();
export const option = (value,label) => '<option value="'+escapeHtml(value)+'">'+escapeHtml(label)+'</option>';
export const stat = (label,value,icon='✦',tone='teal',description='') => '<article class="mw-stat mw-tone-'+tone+'"><div class="mw-stat-top"><span>'+escapeHtml(label)+'</span><span class="mw-stat-icon">'+icon+'</span></div><strong>'+escapeHtml(value)+'</strong>'+(description?'<small>'+escapeHtml(description)+'</small>':'')+'</article>';
export const box = (title,content,extra='')=>'<section class="mw-card '+extra+'"><div class="mw-card-head"><h2>'+title+'</h2></div>'+content+'</section>';
export const empty = (icon,title,description='',cta='')=>'<div class="mw-empty"><div class="bp-empty-scene" aria-hidden="true"><span class="bp-empty-cloud">☁</span><div class="mw-empty-icon">'+icon+'</div><span class="bp-empty-star">✦</span><span class="bp-empty-flower">✿</span></div><h3>'+escapeHtml(title)+'</h3>'+(description?'<p>'+escapeHtml(description)+'</p>':'')+cta+'</div>';
export const pill = (value,kind='neutral') => '<span class="mw-pill mw-pill-'+kind+'">'+escapeHtml(value)+'</span>';
export const field = (label,input)=>'<label class="mw-field"><span>'+escapeHtml(label)+'</span>'+input+'</label>';
export const input = (id,placeholder='',type='text',extra='')=>'<input id="'+id+'" name="'+id+'" placeholder="'+escapeHtml(placeholder)+'" type="'+type+'" '+extra+'>';
export const select = (id,options,extra='')=>'<select id="'+id+'" '+extra+'>'+options+'</select>';
export const textarea=(id,placeholder='',extra='')=>'<textarea id="'+id+'" placeholder="'+escapeHtml(placeholder)+'" '+extra+'></textarea>';
export const button=(label,id,kind='primary',extra='')=>'<button class="mw-btn mw-btn-'+kind+'" id="'+id+'" '+extra+'>'+label+'</button>';
export const heading=(eyebrow,title,description='',actions='')=>'<div class="mw-page-head"><div class="bp-heading-content"><p class="mw-eyebrow">'+escapeHtml(eyebrow)+'</p><h1>'+escapeHtml(title)+'</h1>'+(description?'<p class="mw-page-sub">'+escapeHtml(description)+'</p>':'')+'</div><div class="bp-heading-deco" aria-hidden="true"><span>✿</span><span>✦</span><span>☁</span></div>'+actions+'</div>';
export const table=(headers,rows,emptyHtml='')=>rows.length?'<div class="mw-table-scroll"><table class="mw-table"><thead><tr>'+headers.map(x=>'<th scope="col">'+escapeHtml(x)+'</th>').join('')+'</tr></thead><tbody>'+rows.join('')+'</tbody></table></div>':emptyHtml;
export const td=(content)=>'<td>'+content+'</td>';
export const tr=(cells)=>'<tr>'+cells.map(td).join('')+'</tr>';
export const bar=(percent)=>'<div class="mw-progress"><span style="width:'+Math.max(0,Math.min(100,Number(percent)||0))+'%"></span></div>';
export const banners=(type,message)=>'<div class="mw-inline mw-inline-'+type+'">'+escapeHtml(message)+'</div>';
export const myId=(v)=>escapeHtml(v);
export const status=(s)=>pill(s||'pending',['active','present','resolved','approved'].includes(s)?'green':['suspended','absent','past_due'].includes(s)?'red':'amber');

export function result(r){
 if(r?.error)throw new Error(r.error.message||r.error.details||String(r.error));
 return r?.data??[];
}
export async function read(db,table,mutator){
 const q=db.from(table).select('*');
 return result(await (mutator?mutator(q):q));
}
export async function write(db,table,data){return result(await db.from(table).insert(data))}
export async function update(db,table,data,filters){
 let q=db.from(table).update(data);
 for (const [col,val] of Object.entries(filters)) q=q.eq(col,val);
 return result(await q);
}
export async function rpc(db,name,params){return result(await db.rpc(name,params))}
export function form(id,callback){
 const f=document.getElementById(id);
 if(!f)return;
 f.addEventListener('submit',async(ev)=>{
  ev.preventDefault();
  const submit=f.querySelector('button[type="submit"]');
  if(submit?.disabled)return;
  if(submit)submit.disabled=true;
  try{await callback(f);notice('Saved successfully','success')}catch(err){notice(err.message||String(err),'error')}
  finally{if(submit?.isConnected)submit.disabled=false}
 });
}
export function click(id,handler){
 const el=document.getElementById(id);
 if(el)el.addEventListener('click',handler);
}
export function notice(message,type='success'){
 const root=document.getElementById('mw-notice');
 if(!root)return;
 root.textContent=String(message);
 root.className='mw-toast '+(type==='error'?'mw-toast-error':'mw-toast-success');
 root.hidden=false;
 window.clearTimeout(notice._timer);
 notice._timer=window.setTimeout(()=>{root.hidden=true},5000);
}
export const v=(id)=>document.getElementById(id)?.value?.trim()||'';
export const checked=(id)=>document.getElementById(id)?.checked===true;

const pages={
 owner:[['overview','Overview','⌂'],['schools','Schools','▦'],['people','Accounts & access','♙'],['analytics','Activity monitor','▥'],['revenue','Revenue & plans','◈'],['support','Support inbox','✉']],
 school_admin:[['overview','Dashboard','⌂'],['relay','Care Relay','🌈'],['setup','School setup','🌻'],['notifications','Notifications','🔔'],['classes','Classes & rooms','▦'],['students','Enrollment','♧'],['profiles','Child profiles','🧸'],['guardian_changes','Guardian change requests','👨‍👩‍👧'],['families','Guardian links','↗'],['parents','Parent approvals','♡'],['teachers','Teacher approvals','✓'],['people','Staff directory','♙'],['care','Daily care diary','☀'],['quickcare','Quick group updates','🧩'],['milestones','Development','🌱'],['moments','Photos & videos','▣'],['daily_summary','Daily summaries','📔'],['medications','Medication safety','💊'],['messages','Classroom messages','✉'],['admin_inbox','Parent–admin inbox','💌'],['family_notices','Parent day notices','📮'],['signatures','Parent signatures','✍️'],['feedback','Surveys & reviews','💛'],['events','School calendar','🗓️'],['incidents','Health & incidents','🩹'],['staffing','Staff shifts & ratios','🍎'],['privacy','Privacy & records','🛡️'],['pickup','Safe pickup','✓'],['attendance','Attendance','▤'],['activities','Learning reports','▥'],['announcements','Announcements','✉'],['billing','Subscription & earnings','◈'],['settings','School settings','⚙'],['support','Support','?']],
 teacher:[['overview','Today','⌂'],['relay','Care Relay','🌈'],['quiet','Quiet Classroom','✦'],['notifications','Notifications','🔔'],['classes','My rooms','▦'],['students','My classroom','♧'],['profiles','Child profiles','🧸'],['care','Daily care','☀'],['quickcare','Quick group updates','🧩'],['staffing','My shifts','🍎'],['milestones','Milestones','🌱'],['moments','Photos & videos','▣'],['daily_summary','Daily summaries','📔'],['medications','Medication safety','💊'],['messages','Parent messages','✉'],['events','School calendar','🗓️'],['incidents','Health & incidents','🩹'],['pickup','Check-in & pickup','✓'],['publish','Learning notes','✎'],['gradebook','Assessments','▥'],['attendance','Attendance','▤'],['announcements','Announcements','✉']],
 parent:[['overview','Today at daycare','⌂'],['relay','Home ↔ School Relay','🌈'],['notifications','Notifications','🔔'],['children','My little ones','♡'],['guardian_changes','Guardian changes','👨‍👩‍👧'],['daily_summary','Daily summary','📔'],['care','Daily diary','☀'],['medications','Medication plans','💊'],['moments','Photos & videos','▣'],['milestones','Development','🌱'],['messages','Teacher messages','✉'],['admin_inbox','School Administration','💌'],['family_notices','Absence & day notices','📮'],['signatures','Documents to sign','✍️'],['feedback','Surveys & reviews','💛'],['events','School calendar','🗓️'],['incidents','Health & incidents','🩹'],['pickup','Safe pickup','✓'],['journal','Learning journal','▥'],['privacy','Privacy & records','🛡️'],['attendance','Attendance','▤'],['announcements','Announcements','✉'],['membership','My membership','◈']]
};
const navGroups={
 owner:[['PLATFORM',['overview','schools','people']],['BUSINESS',['analytics','revenue']],['HELP',['support']]],
 school_admin:[['AT A GLANCE',['overview','relay','setup','notifications']],['CHILDREN & FAMILIES',['classes','students','profiles','guardian_changes','families','parents']],['YOUR TEAM',['teachers','people','staffing']],['EVERYDAY CARE',['care','quickcare','milestones','moments','daily_summary','medications','messages','admin_inbox','family_notices','signatures','incidents','pickup','attendance']],['SCHOOL OPERATIONS',['events','feedback','activities','announcements','privacy','billing','settings','support']]],
 teacher:[['MY DAY',['overview','relay','quiet','notifications']],['CLASSROOM',['classes','students','profiles']],['DAILY ROUTINES',['care','quickcare','staffing','milestones','moments','daily_summary','medications','messages','incidents','pickup']],['LEARNING & SCHOOL',['publish','gradebook','attendance','events','announcements']]],
 parent:[['MY FAMILY',['overview','relay','notifications','children','daily_summary','guardian_changes']],['LITTLE MOMENTS',['care','medications','moments','milestones','messages','admin_inbox','family_notices','signatures','feedback']],['SAFETY & SCHOOL',['incidents','pickup','journal','attendance','privacy','events','announcements','membership']]]
};

const roleTitle={owner:'Platform owner',school_admin:'School administrator',teacher:'Teacher',parent:'Parent'};
const renderer={owner:renderOwnerPage,school_admin:renderSchoolPage,teacher:renderTeacherPage,parent:renderParentPage};

export async function launchWorkspace({db,user,role,context,root,logout,photoData,devicesPreview}){
 const showDevices=role==='parent';
 const nav=showDevices?[...pages.parent,['devices','Devices','🎒']]:pages[role];
 const groups=showDevices?[...navGroups.parent,[devicesPreview?'PROTOTYPE':'TRACKERS',['devices']]]:navGroups[role];
 if(!nav)throw new Error('Unsupported account workspace');
 let school=(context?.memberships||[]).find(m=>m.role===role&&m.active)?.school_id||null;
 let current=new URLSearchParams(window.location.search).get('tab')||'overview';
 if(!nav.some(([id])=>id===current))current='overview';
 let request=0,previousUnread=null;
 async function loadSchoolTimeZone(){
  setSchoolTimeZone(null);
  if(!school)return;
  const settings=await read(db,'bp_school_settings',q=>q.eq('school_id',school));
  setSchoolTimeZone(settings[0]?.time_zone);
  const indicator=document.getElementById('mw-region-clock');
  if(indicator)indicator.textContent='🕒 '+getSchoolTimeZone().replace(/_/g,' ');
 }
 const memberships=(context?.memberships||[]).filter(m=>m.role===role&&m.active);
 const schoolPicker=memberships.length>1?'<select id="mw-school" aria-label="Select school">'+memberships.map(m=>option(m.school_id,m.school_name)).join('')+'</select>':(memberships[0]?'<span class="mw-school-name">'+escapeHtml(memberships[0].school_name)+'</span>':'');
 const logo='<a class="logo brand-home mw-brand" href="'+root+'home/" aria-label="BrightPath homepage">✦ <strong>brightpath<span>.</span></strong></a>';
 const playfulIcons={relay:'🌈',overview:'🏡',setup:'🌻',notifications:'🔔',schools:'🏫',classes:'🧩',students:'🧒',children:'🧒',profiles:'🧸',people:'👥',teachers:'🍎',parents:'💛',families:'👨‍👩‍👧',care:'☀️',quickcare:'✨',admin_inbox:'💌',family_notices:'📮',signatures:'✍️',feedback:'💛',events:'🗓️',quiet:'🌿',staffing:'🍎',guardian_changes:'👨‍👩‍👧',medications:'💊',privacy:'🛡️',milestones:'🌱',moments:'📸',daily_summary:'📔',messages:'💌',incidents:'🩹',pickup:'🎒',attendance:'📝',activities:'🎨',announcements:'📣',billing:'💳',settings:'⚙️',support:'💬',publish:'✏️',gradebook:'🌟',journal:'📔',membership:'💛'};
 const navEntry=(id,name,ico)=>'<button type="button" data-mw-page="'+id+'" class="mw-navitem" aria-current="false"><span class="mw-navico" aria-hidden="true">'+(role==='owner'?ico:(playfulIcons[id]||ico))+'</span><span>'+escapeHtml(name)+'</span>'+(id==='notifications'?'<span id="mw-nav-notifications" class="bp-notification-dot" hidden></span>':'')+'</button>';
 const navMap=new Map(nav.map(([id,name,ico])=>[id,[name,ico]]));
 const mobileTabIds={owner:['overview','schools','revenue','support'],school_admin:['overview','relay','admin_inbox','family_notices'],teacher:['overview','relay','quickcare','messages'],parent:['overview','relay','admin_inbox','family_notices']};
 const mobileMain=(mobileTabIds[role]||[]).filter(id=>navMap.has(id));
 const mobileFooter='<nav class="bp-mobile-tabs" aria-label="Mobile quick navigation">'+mobileMain.map(id=>{
  const [name,ico]=navMap.get(id);
  return '<button type="button" class="bp-mobile-tab" data-bp-mobile-tab="'+id+'"><span aria-hidden="true">'+(role==='owner'?ico:(playfulIcons[id]||ico))+'</span><small>'+escapeHtml(role==='parent'&&id==='admin_inbox'?'School office':role==='school_admin'&&id==='admin_inbox'?'Parent inbox':role==='school_admin'&&id==='family_notices'?'Notices':role==='parent'&&id==='family_notices'?'Absences':name)+'</small></button>'
 }).join('')+'<button type="button" id="bp-mobile-more" class="bp-mobile-tab" aria-label="Open full menu" aria-expanded="false"><span>☷</span><small>More</small></button></nav>';
 const mobileFind='<div class="bp-mobile-find"><label for="bp-mobile-section-search">🔎 Find a section</label>'+
  '<input id="bp-mobile-section-search" type="search" placeholder="Search pickup, photos, approvals…" autocomplete="off" aria-controls="bp-mobile-menu-list">'+
  '<p id="bp-mobile-find-count" role="status" aria-live="polite"></p></div>';
 const desktopFind='<div class="bp-nav-find"><label for="bp-section-search">🔎 Find a section</label>'+
  '<input id="bp-section-search" type="search" placeholder="Search pages…" autocomplete="off" aria-controls="mw-navigation-list">'+
  '<p id="bp-nav-find-count" role="status" aria-live="polite"></p></div>';
 const mobileMenu='<div class="bp-mobile-overlay" id="bp-mobile-overlay" hidden></div><div class="bp-mobile-sheet" id="bp-mobile-sheet" role="dialog" aria-modal="true" aria-label="All BrightPath sections" hidden>'+ 
  '<div class="bp-mobile-sheet-head"><div><b>✦ BrightPath menu</b><small>Find every daycare feature</small></div><button id="bp-mobile-close" type="button" aria-label="Close menu">✕</button></div>'+mobileFind+'<div class="bp-mobile-sheet-scroll" id="bp-mobile-menu-list">'+
  (groups||[]).map(([group,ids])=>'<section class="bp-mobile-menu-section"><h3>'+escapeHtml(group)+'</h3>'+ids.filter(id=>navMap.has(id)).map(id=>{
   const [name,ico]=navMap.get(id);return '<button type="button" data-bp-mobile-menu="'+id+'"><span>'+(role==='owner'?ico:(playfulIcons[id]||ico))+'</span>'+escapeHtml(name)+'<span class="bp-mobile-menu-arrow">›</span></button>'
  }).join('')+'</section>').join('')+'</div></div>';
 const navHtml=(groups||[]).map(([title,ids],idx)=>'<section class="mw-nav-group"><button type="button" class="mw-nav-group-label" data-nav-toggle="'+idx+'" aria-expanded="true"><span>'+escapeHtml(title)+'</span><span class="mw-nav-chevron">⌄</span></button><div class="mw-nav-group-items" id="mw-nav-group-'+idx+'">'+ids.filter(id=>navMap.has(id)).map(id=>navEntry(id,...navMap.get(id))).join('')+'</div></section>').join('');
 document.getElementById('app').innerHTML='<div class="mw-app mw-role-'+role+'"><aside class="mw-sidebar">'+
  '<div class="mw-brandzone">'+logo+'<p>'+escapeHtml(role==='owner'?'Platform administration':role==='school_admin'?'Little learners. Big care.':role==='teacher'?'Care · Play · Grow':'Every little moment matters')+'</p><div class="bp-side-tiles" aria-hidden="true"><span>A</span><span>B</span><span>C</span><span>★</span></div></div>'+
  '<div class="mw-side-caption">WORKSPACE</div>'+desktopFind+'<nav class="mw-navigation" id="mw-navigation-list" aria-label="Workspace sections">'+navHtml+'</nav>'+
  '<div class="mw-side-footer"><div class="mw-avatar">'+initial(user.name||user.email)+'</div><div><b>'+escapeHtml(user.name||'My account')+'</b><span>'+escapeHtml(roleTitle[role])+'</span></div></div></aside>'+
  '<div class="mw-main"><header class="mw-topbar"><div class="mw-location"><span class="mw-location-dot"></span> '+escapeHtml(roleTitle[role])+' workspace <span class="bp-top-doodle" aria-hidden="true">✦</span></div>'+
  '<div class="mw-top-actions">'+(role!=='owner'?'<button class="bp-top-notice" id="mw-open-notifications" aria-label="Open notifications" title="Notifications">🔔 <span id="mw-notification-count" hidden></span></button>':'')+schoolPicker+'<span class="mw-region-clock" id="mw-region-clock" aria-label="School timezone"></span><span class="mw-user-email">'+escapeHtml(user.email||'')+'</span><button id="mw-logout" class="mw-btn mw-btn-outline mw-logout">Sign out</button></div></header>'+
  '<main class="mw-content" id="workspace"><div id="panel-content"></div></main><footer class="mw-bottom"><span>© BrightPath</span><a href="'+root+'home/">Back to website</a></footer></div>'+
  mobileFooter+mobileMenu+'<div id="mw-notice" class="mw-toast" hidden role="status" aria-live="polite"></div></div>';
 const contextObj={
  db,user,role,root,context,photoData,
  get schoolId(){return school},
  get memberships(){return memberships},
  get tab(){return current},
  get timeZone(){return getSchoolTimeZone()},
  setTimeZone:(zone)=>{setSchoolTimeZone(zone);const indicator=document.getElementById('mw-region-clock');if(indicator)indicator.textContent='🕒 '+getSchoolTimeZone().replace(/_/g,' ');},
  reload:()=>show(current),
  go:(tab)=>show(tab),
  refreshNotifications:()=>refreshNotificationCount()
 };
 async function refreshNotificationCount(){
  if(role==='owner')return;
  try{
   const notes=await read(db,'bp_notifications',q=>q.eq('recipient_user_id',user.id).eq('school_id',school).order('created_at',{ascending:false}).limit(200));
   const unread=notes.filter(x=>!x.read_at).length;
   if(previousUnread!==null&&unread>previousUnread&&document.visibilityState==='hidden'&&
       typeof Notification!=='undefined'&&Notification.permission==='granted'&&
       window.localStorage?.getItem('bp-notice-browser-'+user.id+'-'+school)==='yes'){
     try{const popup=new Notification('New BrightPath update',{body:'Open BrightPath to read your private school message.',tag:'bp-update-'+school});popup.onclick=()=>window.focus()}catch{}
   }
   previousUnread=unread;
   const badge=document.getElementById('mw-notification-count');
   const navBadge=document.getElementById('mw-nav-notifications');
   if(badge){badge.hidden=unread===0;badge.textContent=unread>99?'99+':String(unread)}
   if(navBadge)navBadge.hidden=unread===0;
  }catch{ /* A notification service error must not block the workspace. */ }
 }
 async function show(tab){
  if(!nav.some(([id])=>id===tab))tab='overview';
  current=tab;
  if(typeof clearFind==='function')clearFind();
  document.querySelectorAll('.mw-nav-group').forEach(group=>{
   const button=group.querySelector('.mw-nav-group-label'),items=group.querySelector('.mw-nav-group-items');
   if(group.querySelector('[data-mw-page="'+tab+'"]')&&items?.hidden){items.hidden=false;if(button)button.setAttribute('aria-expanded','true')}
  });
  const q=new URLSearchParams(window.location.search);
  if(tab==='overview')q.delete('tab');else q.set('tab',tab);
  window.history.replaceState(null,'',window.location.pathname+(q.toString()?'?'+q:''));
  document.querySelectorAll('[data-bp-mobile-tab]').forEach(el=>{const active=el.dataset.bpMobileTab===tab;el.classList.toggle('active',active);el.setAttribute('aria-current',active?'page':'false')});
  document.querySelectorAll('[data-mw-page]').forEach(el=>{
   const active=el.dataset.mwPage===tab;
   el.classList.toggle('mw-nav-active',active);
   el.setAttribute('aria-current',active?'page':'false');
  });
  if(typeof window.__bpRevokeMediaUrls==='function')window.__bpRevokeMediaUrls();
  const dest=document.getElementById('panel-content');dest.innerHTML='<div class="mw-loader"><div class="mw-spinner"></div>Opening workspace…</div>';
  const id=++request;
  try{
   const view=await (tab==='devices'&&showDevices?(devicesPreview||renderDevices)(contextObj):renderer[role](contextObj,tab));
   if(id!==request)return;
   dest.innerHTML=view?.html||view||'';
   if(view?.bind)await view.bind();
   if(role!=='owner')void refreshNotificationCount();
  }catch(err){
   if(id!==request)return;
   dest.innerHTML=heading('Workspace','Couldn’t load this section','Please try refreshing or open another section.')+banners('error',err.message||String(err))+button('Retry','mw-retry','outline');
   click('mw-retry',()=>show(tab));
  }
 }
 const more=document.getElementById('bp-mobile-more'),sheet=document.getElementById('bp-mobile-sheet'),overlay=document.getElementById('bp-mobile-overlay');

 const alias={
  overview:'home today dashboard',relay:'home handover evening morning pickup',students:'enroll enrolment register children',
  parents:'parent approval access requests',teachers:'teacher approval access requests',
  guardian_changes:'guardianship custody change links',families:'link parents guardians verification',
  pickup:'check-in check-out collectors safe arrival departure handover',
  moments:'gallery pictures photo video',daily_summary:'report end of day diary',
  medications:'medicines medication dose',admin_inbox:'school office principal director contact',
  family_notices:'absence late arrival early pickup',staffing:'shifts ratio staff coverage',
  quickcare:'group update bulk care teacher shortcuts',quiet:'teacher assistant automation time saving',
  signatures:'sign document draw signature',feedback:'survey review feedback',
  gradebook:'scores marks grades reports',activities:'learning reports progress',
  support:'help support ticket',privacy:'consent information export',
  care:'meal nap routine diary',milestones:'development achievement learning',
  notifications:'updates alert inbox',setup:'onboarding checklist'
 };
 const lower=value=>String(value||'').trim().toLocaleLowerCase();
 const matchSection=(query,title,id,group)=>!query||
  lower(title+' '+id+' '+id.replace(/_/g,' ')+' '+(alias[id]||'')+' '+group).includes(query);
 const hideWhen=(el,hidden)=>el.classList.toggle('bp-nav-filter-hidden',hidden);
 const sidebarFind=document.getElementById('bp-section-search');
 const mobileFindInput=document.getElementById('bp-mobile-section-search');
 let desktopExpandedBeforeFind=null;
 const desktopGroups=[...document.querySelectorAll('.mw-navigation .mw-nav-group')];
 const applyDesktopFind=()=>{
  const query=lower(sidebarFind.value);
  if(query&&!desktopExpandedBeforeFind){
   desktopExpandedBeforeFind=new Map(desktopGroups.map(g=>[g,g.querySelector('.mw-nav-group-items')?.hidden]));
  }
  let visible=0;
  for(const group of desktopGroups){
   const label=group.querySelector('.mw-nav-group-label'),list=group.querySelector('.mw-nav-group-items');
   const groupName=label?.textContent||'';
   const groupMatch=query&&lower(groupName).includes(query);
   let inGroup=0;
   group.querySelectorAll('[data-mw-page]').forEach(btn=>{
    const found=!query||groupMatch||matchSection(query,btn.textContent,btn.dataset.mwPage,'');
    hideWhen(btn,!found);if(found){visible++;inGroup++;}
   });
   hideWhen(group,!!query&&inGroup===0);
   if(query&&inGroup){list.hidden=false;label?.setAttribute('aria-expanded','true');}
   else if(!query&&desktopExpandedBeforeFind){
    list.hidden=!!desktopExpandedBeforeFind.get(group);
    label?.setAttribute('aria-expanded',String(!list.hidden));
   }
  }
  if(!query)desktopExpandedBeforeFind=null;
  const count=document.getElementById('bp-nav-find-count');
  count.textContent=query?(visible?visible+' matching section'+(visible===1?'':'s'):'No matching sections'):'';
 };
 const applyMobileFind=()=>{
  const query=lower(mobileFindInput.value);
  let visible=0;
  document.querySelectorAll('.bp-mobile-menu-section').forEach(section=>{
   const title=section.querySelector('h3')?.textContent||'';
   const groupMatch=query&&lower(title).includes(query);
   let foundInGroup=0;
   section.querySelectorAll('[data-bp-mobile-menu]').forEach(btn=>{
    const found=!query||groupMatch||matchSection(query,btn.textContent,btn.dataset.bpMobileMenu,'');
    hideWhen(btn,!found);if(found){visible++;foundInGroup++;}
   });
   hideWhen(section,!!query&&!foundInGroup);
  });
  document.getElementById('bp-mobile-find-count').textContent=query?
   (visible?visible+' matching section'+(visible===1?'':'s'):'No matching sections'):'';
 };
 const clearFind=()=>{
  sidebarFind.value='';applyDesktopFind();
  mobileFindInput.value='';applyMobileFind();
 };
 sidebarFind.addEventListener('input',applyDesktopFind);
 mobileFindInput.addEventListener('input',applyMobileFind);
 sidebarFind.addEventListener('keydown',event=>{
  if(event.key==='Escape'){sidebarFind.value='';applyDesktopFind();}
  if(event.key==='Enter'&&lower(sidebarFind.value)){
   const first=document.querySelector('.mw-navigation [data-mw-page]:not(.bp-nav-filter-hidden)');
   if(first){event.preventDefault();first.click();}
  }
 });
 mobileFindInput.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&mobileFindInput.value){event.preventDefault();event.stopPropagation();mobileFindInput.value='';applyMobileFind();}
  if(event.key==='Enter'&&lower(mobileFindInput.value)){
   const first=document.querySelector('.bp-mobile-sheet [data-bp-mobile-menu]:not(.bp-nav-filter-hidden)');
   if(first){event.preventDefault();first.click();}
  }
 });
 if(window.__bpNavFindKeydown)document.removeEventListener('keydown',window.__bpNavFindKeydown);
 window.__bpNavFindKeydown=event=>{
  const target=event.target;
  if(event.key==='/'&&!event.metaKey&&!event.ctrlKey&&!event.altKey&&window.innerWidth>850&&
      !(target?.matches?.('input,textarea,select,[contenteditable="true"]'))&&sheet.hidden){
   event.preventDefault();sidebarFind.focus();sidebarFind.select();
  }
 };
 document.addEventListener('keydown',window.__bpNavFindKeydown);

 let previousFocus=null;
 function closeMobileMenu(){if(sheet.hidden)return;sheet.hidden=true;overlay.hidden=true;more.setAttribute('aria-expanded','false');document.body.classList.remove('bp-menu-open');mobileFindInput.value='';applyMobileFind();if(previousFocus?.isConnected)previousFocus.focus();}
 function openMobileMenu(){previousFocus=document.activeElement;sheet.hidden=false;overlay.hidden=false;more.setAttribute('aria-expanded','true');document.body.classList.add('bp-menu-open');mobileFindInput.focus();}
 more.onclick=()=>sheet.hidden?openMobileMenu():closeMobileMenu();
 document.getElementById('bp-mobile-close').onclick=closeMobileMenu;
 overlay.onclick=closeMobileMenu;
 sheet.addEventListener('keydown',event=>{if(event.key==='Escape'){event.preventDefault();closeMobileMenu()}if(event.key==='Tab'){
  const els=[...sheet.querySelectorAll('button:not([disabled]),input:not([disabled])')].filter(b=>b.offsetParent!==null);const first=els[0],last=els[els.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
 }});
 document.querySelectorAll('[data-bp-mobile-tab]').forEach(el=>el.onclick=()=>show(el.dataset.bpMobileTab));
 document.querySelectorAll('[data-bp-mobile-menu]').forEach(el=>el.onclick=()=>{closeMobileMenu();show(el.dataset.bpMobileMenu)});
 document.querySelectorAll('[data-mw-page]').forEach(el=>el.onclick=()=>show(el.dataset.mwPage));
 document.querySelectorAll('[data-nav-toggle]').forEach(el=>el.onclick=()=>{
  const items=document.getElementById('mw-nav-group-'+el.dataset.navToggle);
  if(!items)return;items.hidden=!items.hidden;el.setAttribute('aria-expanded',String(!items.hidden));
 });
 if(role!=='owner')document.getElementById('mw-open-notifications').onclick=()=>show('notifications');
 document.getElementById('mw-logout').onclick=logout;
 if(window.__bpNoticeTimer)window.clearInterval(window.__bpNoticeTimer);
 if(role!=='owner')window.__bpNoticeTimer=window.setInterval(()=>void refreshNotificationCount(),45000);
 const picker=document.getElementById('mw-school');
 if(picker){picker.value=school;picker.onchange=async()=>{
  school=picker.value;
  try{await loadSchoolTimeZone();await show(current)}catch(err){notice('School timezone could not be loaded: '+err.message,'error')}
 }}
 await loadSchoolTimeZone();
 await show(current);
}
