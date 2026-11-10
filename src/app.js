import './style.css';
import { renderMarketing } from './marketing.js';
import { enableBrandShortcut } from './logo-shortcut.js';
import {renderAccessPending} from './access-request.js';
import { createClient, BetterAuthVanillaAdapter } from '@neondatabase/neon-js';

const ROOT='/brightpath-school-platform/';
enableBrandShortcut({homeUrl:ROOT+'home/',ownerUrl:ROOT+'owner/'});
const AUTH_URL='https://ep-falling-frog-bao493od.neonauth.c-8.eu-central-1.aws.neon.tech/neondb/auth';
const DATA_URL='https://ep-falling-frog-bao493od.apirest.c-8.eu-central-1.aws.neon.tech/neondb/rest/v1';
const db=createClient({auth:{url:AUTH_URL,adapter:BetterAuthVanillaAdapter()},dataApi:{url:DATA_URL}});
const app=document.getElementById('app');
const portal=document.body.dataset.portal||'landing';
const portalLabel={owner:'Platform Owner',school_admin:'School Administration',teacher:'Teacher Workspace',parent:'Parent Portal'};
let currentUser=null,context=null,currentSchool='',busy=false;
const h=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const $=id=>document.getElementById(id);
const url=path=>ROOT+path;
const itemOpt=(id,name)=>'<option value="'+h(id)+'">'+h(name)+'</option>';
const asDate=x=>new Date(x).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
const empty=(t='Updates will appear here.')=>'<div class="empty">'+h(t)+'</div>';
const msg=(txt,type='notice')=>'<div class="notice '+(type==='err'?'err':type==='warn'?'warn':'')+'">'+h(txt)+'</div>';
const brand=()=>'<a class="logo brand-home" href="'+url('home/')+'" aria-label="BrightPath — back to homepage">✦ brightpath<b>.</b></a>';
function errText(err){return err?.message||err?.details||String(err)||'Something went wrong'}
function check(result){if(result?.error)throw new Error(errText(result.error));return result?.data}
function renderLanding(){renderMarketing(app,ROOT,'home')}
function renderPricing(){renderMarketing(app,ROOT,'pricing')}
function shell(body,title=portalLabel[portal]){
 app.innerHTML='<div class="portal"><header class="portal-header"><div>'+brand()+'<div class="portal-name">'+h(title)+'</div></div><div id="user-actions"></div></header><main class="portal-main" id="workspace">'+body+'</main><footer class="foot">© BrightPath · Learning together, every day.</footer></div>';
 if(currentUser){
  $('user-actions').innerHTML='<span style="font-size:13px;color:#c5dedf;margin-right:12px">'+h(currentUser.email||'')+'</span><button class="btn small" id="logout">Sign out</button>';
  $('logout').onclick=logout;
 }
}
function renderAuth(mode='signin',note=''){
 currentUser=null;
 const title=mode==='signup'?'Create your account':'Sign in to continue';
 const verification=mode==='verify';
 shell('<div class="login-shell"><div class="card"><h1 style="font-size:25px;margin:0 0 8px">'+(verification?'Verify your email':title)+'</h1><p class="muted" style="font-size:14px">Continue to '+h(portalLabel[portal])+'.</p><div class="auth-switch"><button class="btn '+(mode==='signin'?'':'ghost')+'" id="switch-in">Sign in</button><button class="btn '+(mode==='signup'?'':'ghost')+'" id="switch-up">Register</button></div>'+
 (verification?'<form id="verify-form"><label class="field">Email<input id="email" type="email" autocomplete="email" required></label><label class="field">Verification code from email<input id="otp" inputmode="numeric" autocomplete="one-time-code" required></label><button class="btn full" type="submit">Verify email</button></form>':
 '<form id="auth-form">'+(mode==='signup'?'<label class="field">Full name<input id="full-name" autocomplete="name" minlength="2" required></label>':'')+'<label class="field">Email<input id="email" type="email" autocomplete="email" required></label><label class="field">Password<input id="password" type="password" minlength="8" autocomplete="'+(mode==='signup'?'new-password':'current-password')+'" required></label><button class="btn full" type="submit">'+(mode==='signup'?'Register account':'Sign in')+'</button></form>')+
 '<div id="auth-note">'+(note?msg(note):'')+'</div></div></div>');
 $('switch-in').onclick=()=>renderAuth('signin');$('switch-up').onclick=()=>renderAuth('signup');
 if(verification){$('verify-form').onsubmit=async e=>{e.preventDefault();try{const email=$('email').value.trim();const otp=$('otp').value.trim();check(await db.auth.emailOtp.verifyEmail({email,otp}));renderAuth('signin','Email verified. Sign in to open your workspace.')}catch(err){$('auth-note').innerHTML=msg(errText(err),'err')}};return}
 $('auth-form').onsubmit=async e=>{e.preventDefault();if(busy)return;busy=true;const button=e.currentTarget.querySelector('button[type=submit]');button.disabled=true;
 try{const email=$('email').value.trim();const password=$('password').value;if(mode==='signup'){const name=$('full-name').value.trim();check(await db.auth.signUp.email({email,password,name}));renderAuth('verify','A verification code may have been sent to your email. Enter it to activate your account.');const inp=$('email');if(inp)inp.value=email}else{check(await db.auth.signIn.email({email,password}));await enterPortal()}}
 catch(err){$('auth-note').innerHTML=msg(errText(err),'err');button.disabled=false}finally{busy=false}};
}
async function logout(){try{await db.auth.signOut()}catch{}currentUser=null;context=null;renderAuth('signin','Signed out.')}
async function sessionUser(){const result=await db.auth.getSession();if(result.error)throw new Error(errText(result.error));const s=result.data||result;return s?.user||s?.session?.user||null}
async function enterPortal(){
 shell('<div class="card"><h2>Checking your account…</h2><p class="muted">Verifying your school permissions.</p></div>');
 try{
 currentUser=await sessionUser();
 if(!currentUser){renderAuth('signin');return}
 check(await db.rpc('bp_register_profile'));
 context=check(await db.rpc('bp_context'));
 if(typeof context==='string')context=JSON.parse(context);
 const memberships=(context?.memberships||[]).filter(m=>m.role===portal&&m.active);
 if(portal==='owner'&&!context?.is_owner){await renderDenied();return}
 if(portal!=='owner'&&!memberships.length){await renderDenied();return}
 currentSchool=memberships[0]?.school_id||'';
 const {launchWorkspace}=await import('./workspace-core.js');
 await launchWorkspace({ db, user: currentUser, role: portal, context, root: ROOT, logout, photoData });
 }catch(err){shell('<div class="card"><h2>Unable to open this account</h2>'+msg(errText(err),'err')+'<p class="muted">Verify your email and sign in again if needed.</p><button class="btn" id="relogin">Back to sign in</button></div>');$('relogin').onclick=()=>renderAuth('signin')}
}
async function renderDenied(options={}){return renderAccessPending({db,context,portal,root:ROOT,shell,enterPortal},options)}

async function photoData(file){
 if(!file)return null;
 if(!file.type.startsWith('image/'))throw new Error('Choose an image file.');
 if(file.size>12*1024*1024)throw new Error('Photo must be under 12 MB before resizing.');
 const source=URL.createObjectURL(file);
 try{
  const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>reject(new Error('The selected image could not be opened.'));i.src=source});
  const ratio=Math.min(1,900/Math.max(img.width,img.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(img.width*ratio));canvas.height=Math.max(1,Math.round(img.height*ratio));
  canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
  const data=canvas.toDataURL('image/jpeg',.67);
  if(data.length>440000)throw new Error('Photo is too large after compression. Choose a smaller photo.');
  return data;
 }finally{URL.revokeObjectURL(source)}
}

if(portal==='landing'){renderLanding()}else if(portal==='pricing'){renderPricing()}else{enterPortal()}
