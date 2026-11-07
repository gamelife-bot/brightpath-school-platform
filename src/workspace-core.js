import './workspace.css';
import {renderOwnerPage} from './workspace-owner.js';
import {renderSchoolPage} from './workspace-school.js';
import {renderTeacherPage} from './workspace-teacher.js';
import {renderParentPage} from './workspace-parent.js';

export const escapeHtml = (input) => String(input ?? '').replace(/[&<>"']/g,(c)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
export const dollar = (v) => 'KSh '+(Number(v||0)/100).toLocaleString('en-KE',{maximumFractionDigits:2});
export const dateLabel = (d) => d ? new Date(d).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'}) : '—';
export const numberLabel = (v) => Number(v||0).toLocaleString('en-KE');
export const initial = (s) => (String(s||'U').trim()[0]||'U').toUpperCase();
export const option = (value,label) => '<option value="'+escapeHtml(value)+'">'+escapeHtml(label)+'</option>';
export const stat = (label,value,icon='✦',tone='teal',description='') => '<article class="mw-stat mw-tone-'+tone+'"><div class="mw-stat-top"><span>'+escapeHtml(label)+'</span><span class="mw-stat-icon">'+icon+'</span></div><strong>'+escapeHtml(value)+'</strong>'+(description?'<small>'+escapeHtml(description)+'</small>':'')+'</article>';
export const box = (title,content,extra='')=>'<section class="mw-card '+extra+'"><div class="mw-card-head"><h2>'+title+'</h2></div>'+content+'</section>';
export const empty = (icon,title,description,cta='')=>'<div class="mw-empty"><div class="mw-empty-icon">'+icon+'</div><h3>'+escapeHtml(title)+'</h3><p>'+escapeHtml(description)+'</p>'+cta+'</div>';
export const pill = (value,kind='neutral') => '<span class="mw-pill mw-pill-'+kind+'">'+escapeHtml(value)+'</span>';
export const field = (label,input)=>'<label class="mw-field"><span>'+escapeHtml(label)+'</span>'+input+'</label>';
export const input = (id,placeholder='',type='text',extra='')=>'<input id="'+id+'" name="'+id+'" placeholder="'+escapeHtml(placeholder)+'" type="'+type+'" '+extra+'>';
export const select = (id,options,extra='')=>'<select id="'+id+'" '+extra+'>'+options+'</select>';
export const textarea=(id,placeholder='',extra='')=>'<textarea id="'+id+'" placeholder="'+escapeHtml(placeholder)+'" '+extra+'></textarea>';
export const button=(label,id,kind='primary',extra='')=>'<button class="mw-btn mw-btn-'+kind+'" id="'+id+'" '+extra+'>'+label+'</button>';
export const heading=(eyebrow,title,description,actions='')=>'<div class="mw-page-head"><div><p class="mw-eyebrow">'+escapeHtml(eyebrow)+'</p><h1>'+escapeHtml(title)+'</h1><p class="mw-page-sub">'+escapeHtml(description)+'</p></div>'+actions+'</div>';
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
 school_admin:[['overview','Overview','⌂'],['classes','Classes','▦'],['students','Students','♧'],['people','Staff directory','♙'],['teachers','Teacher approvals','✓'],['parents','Parent approvals','♡'],['families','Guardian links','↗'],['attendance','Attendance','▤'],['activities','Learning reports','▥'],['announcements','Announcements','✉'],['billing','Subscription & earnings','◈'],['settings','School settings','⚙'],['support','Support','?']],
 teacher:[['overview','Overview','⌂'],['classes','My classes','▦'],['students','Students','♧'],['publish','Post activity','✎'],['gradebook','Gradebook','▥'],['attendance','Attendance','▤'],['announcements','Announcements','✉']],
 parent:[['overview','Overview','⌂'],['children','My children','♡'],['journal','Learning journal','▥'],['attendance','Attendance','▤'],['announcements','Announcements','✉'],['membership','My membership','◈']]
};
const roleTitle={owner:'Platform owner',school_admin:'School administrator',teacher:'Teacher',parent:'Parent'};
const renderer={owner:renderOwnerPage,school_admin:renderSchoolPage,teacher:renderTeacherPage,parent:renderParentPage};

export async function launchWorkspace({db,user,role,context,root,logout,photoData}){
 const nav=pages[role];
 if(!nav)throw new Error('Unsupported account workspace');
 let school=(context?.memberships||[]).find(m=>m.role===role&&m.active)?.school_id||null;
 let current=new URLSearchParams(window.location.search).get('tab')||'overview';
 if(!nav.some(([id])=>id===current))current='overview';
 let request=0;
 const memberships=(context?.memberships||[]).filter(m=>m.role===role&&m.active);
 const schoolPicker=memberships.length>1?'<select id="mw-school" aria-label="Select school">'+memberships.map(m=>option(m.school_id,m.school_name)).join('')+'</select>':(memberships[0]?'<span class="mw-school-name">'+escapeHtml(memberships[0].school_name)+'</span>':'');
 const logo='<a class="logo brand-home mw-brand" href="'+root+'home/" aria-label="BrightPath homepage">✦ <strong>brightpath<span>.</span></strong></a>';
 const navHtml=nav.map(([id,name,ico])=>'<button type="button" data-mw-page="'+id+'" class="mw-navitem" aria-current="false"><span class="mw-navico">'+ico+'</span><span>'+escapeHtml(name)+'</span></button>').join('');
 document.getElementById('app').innerHTML='<div class="mw-app"><aside class="mw-sidebar">'+
  '<div class="mw-brandzone">'+logo+'<p>School & home connected</p></div>'+
  '<div class="mw-side-caption">WORKSPACE</div><nav class="mw-navigation" aria-label="Workspace sections">'+navHtml+'</nav>'+
  '<div class="mw-side-footer"><div class="mw-avatar">'+initial(user.name||user.email)+'</div><div><b>'+escapeHtml(user.name||'My account')+'</b><span>'+escapeHtml(roleTitle[role])+'</span></div></div></aside>'+
  '<div class="mw-main"><header class="mw-topbar"><div class="mw-location"><span class="mw-location-dot"></span> '+escapeHtml(roleTitle[role])+' workspace</div>'+
  '<div class="mw-top-actions">'+schoolPicker+'<span class="mw-user-email">'+escapeHtml(user.email||'')+'</span><button id="mw-logout" class="mw-btn mw-btn-outline mw-logout">Sign out</button></div></header>'+
  '<main class="mw-content" id="workspace"><div id="panel-content"></div></main><footer class="mw-bottom"><span>© BrightPath</span><a href="'+root+'home/">Back to website</a></footer></div>'+
  '<div id="mw-notice" class="mw-toast" hidden role="status" aria-live="polite"></div></div>';
 const contextObj={
  db,user,role,root,context,photoData,
  get schoolId(){return school},
  get memberships(){return memberships},
  get tab(){return current},
  reload:()=>show(current),
  go:(tab)=>show(tab)
 };
 async function show(tab){
  if(!nav.some(([id])=>id===tab))tab='overview';
  current=tab;
  const q=new URLSearchParams(window.location.search);
  if(tab==='overview')q.delete('tab');else q.set('tab',tab);
  window.history.replaceState(null,'',window.location.pathname+(q.toString()?'?'+q:''));
  document.querySelectorAll('[data-mw-page]').forEach(el=>{
   const active=el.dataset.mwPage===tab;
   el.classList.toggle('mw-nav-active',active);
   el.setAttribute('aria-current',active?'page':'false');
  });
  const dest=document.getElementById('panel-content');dest.innerHTML='<div class="mw-loader"><div class="mw-spinner"></div>Opening workspace…</div>';
  const id=++request;
  try{
   const view=await renderer[role](contextObj,tab);
   if(id!==request)return;
   dest.innerHTML=view?.html||view||'';
   if(view?.bind)await view.bind();
  }catch(err){
   if(id!==request)return;
   dest.innerHTML=heading('Workspace','Couldn’t load this section','Please try refreshing or open another section.')+banners('error',err.message||String(err))+button('Retry','mw-retry','outline');
   click('mw-retry',()=>show(tab));
  }
 }
 document.querySelectorAll('[data-mw-page]').forEach(el=>el.onclick=()=>show(el.dataset.mwPage));
 document.getElementById('mw-logout').onclick=logout;
 const picker=document.getElementById('mw-school');
 if(picker){picker.value=school;picker.onchange=()=>{school=picker.value;show(current)}}
 await show(current);
}
