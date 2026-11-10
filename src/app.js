import './style.css';
import { renderMarketing } from './marketing.js';
import { enableBrandShortcut } from './logo-shortcut.js';
import {renderAccessPending} from './access-request.js';
import { createClient, BetterAuthVanillaAdapter } from '@neondatabase/neon-js';

const ROOT=import.meta.env.BASE_URL;
enableBrandShortcut({homeUrl:ROOT+'home/',ownerUrl:ROOT+'owner/'});
const AUTH_URL='https://ep-falling-frog-bao493od.neonauth.c-8.eu-central-1.aws.neon.tech/neondb/auth';
const DATA_URL='https://ep-falling-frog-bao493od.apirest.c-8.eu-central-1.aws.neon.tech/neondb/rest/v1';
const db=createClient({auth:{url:AUTH_URL,adapter:BetterAuthVanillaAdapter()},dataApi:{url:DATA_URL}});
const app=document.getElementById('app');
const portal=document.body.dataset.portal||'landing';
const portalLabel={owner:'Platform Owner',school_admin:'School Administration',teacher:'Teacher Workspace',parent:'Parent Portal'};
let currentUser=null,context=null,busy=false;
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
 app.innerHTML='<div class="portal"><header class="portal-header"><div>'+brand()+'<div class="portal-name">'+h(title)+'</div></div><div id="user-actions"></div></header><main class="portal-main" id="workspace"><div id="logout-status" role="alert"></div>'+body+'</main><footer class="foot">© BrightPath</footer></div>';
 if(currentUser){
  $('user-actions').innerHTML='<span style="font-size:13px;color:#c5dedf;margin-right:12px">'+h(currentUser.email||'')+'</span><button class="btn small" id="logout">Sign out</button>';
  $('logout').onclick=logout;
 }
}
function renderAuth(mode='signin',note='',email=''){
 currentUser=null;
 context=null;
 const signup=mode==='signup',verification=mode==='verify';
 const title=verification?'Verify your email':signup?'Create your account':'Sign in to continue';
 const emailField='<label class="field">Email<input id="email" name="email" type="email" autocomplete="'+(verification?'email':'username')+'" value="'+h(email)+'" required></label>';
 shell('<div class="login-shell"><div class="card"><h1 style="font-size:25px;margin:0 0 8px">'+title+'</h1><p class="muted" style="font-size:14px">'+h(portalLabel[portal])+'.</p><div class="auth-switch"><button type="button" class="btn '+(mode==='signin'?'':'ghost')+'" id="switch-in">Sign in</button><button type="button" class="btn '+(signup?'':'ghost')+'" id="switch-up">Sign up</button></div>'+
 (verification?'<form id="verify-form">'+emailField+'<label class="field">Verification code from email<input id="otp" name="otp" inputmode="numeric" autocomplete="one-time-code" required></label><button class="btn full" type="submit">Verify email</button><button class="btn ghost full" type="button" id="resend-code">Send a new code</button></form>':
 '<form id="auth-form">'+(signup?'<label class="field">Full name<input id="full-name" name="name" autocomplete="name" minlength="2" required></label>':'')+emailField+'<label class="field">Password<input id="password" name="password" type="password" '+(signup?'minlength="8" ':'')+'autocomplete="'+(signup?'new-password':'current-password')+'" required></label>'+
 (signup?'<p class="smallnote">Portal access requires approval.</p>':'<label class="mw-check-label"><input id="remember-me" name="rememberMe" type="checkbox" checked> Keep me signed in on this device</label>')+
 '<button class="btn full" type="submit">'+(signup?'Create account':'Sign in')+'</button></form>')+
 '<div id="auth-note" role="status">'+(note?msg(note):'')+'</div></div></div>');

 const emailValue=()=>$('email').value.trim();
 $('switch-in').onclick=()=>{if(!busy)renderAuth('signin','',emailValue())};
 $('switch-up').onclick=()=>{if(!busy)renderAuth('signup','',emailValue())};
 const runAuth=async (button,action)=>{
  if(busy)return;
  busy=true;button.disabled=true;
  try{await action()}catch(err){$('auth-note').innerHTML=msg(errText(err),'err')}
  finally{busy=false;button.disabled=false}
 };
 if(verification){
  $('verify-form').onsubmit=event=>{
   event.preventDefault();
   return runAuth(event.submitter,async()=>{
    const email=emailValue();
    check(await db.auth.emailOtp.verifyEmail({email,otp:$('otp').value.trim()}));
    await enterPortal({note:'Email verified. Please sign in.',email});
   });
  };
  $('resend-code').onclick=event=>{
   if(!$('email').reportValidity())return;
   return runAuth(event.currentTarget,async()=>{
    check(await db.auth.emailOtp.sendVerificationOtp({email:emailValue(),type:'email-verification'}));
    $('auth-note').innerHTML=msg('Verification code sent.');
   });
  };
  return;
 }
 $('auth-form').onsubmit=event=>{
  event.preventDefault();
  return runAuth(event.submitter,async()=>{
   const email=emailValue(),password=$('password').value;
   if(signup){
    const data=check(await db.auth.signUp.email({email,password,name:$('full-name').value.trim()}));
    if(!data?.token&&!data?.user?.emailVerified){
     renderAuth('verify','Enter the verification code from your email.',email);
     return;
    }
    await enterPortal({note:'Account created. Please sign in.',email});
   }else{
    try{
     const result=await db.auth.signIn.email({email,password,rememberMe:$('remember-me').checked});
     if(result.error)throw result.error;
    }catch(err){
     if(!['email_not_confirmed','EMAIL_NOT_VERIFIED'].includes(err?.code))throw err;
     renderAuth('verify','Verify your email before signing in. You can request a new code below.',email);
     return;
    }
    await enterPortal({note:'Your browser did not keep the session. Check whether it allows cookies for BrightPath and try again.',email});
   }
  });
 };
}
async function logout(event){
 const button=event.currentTarget;
 if(button.disabled)return;
 button.disabled=true;
 try{check(await db.auth.signOut())}catch{
  button.disabled=false;
  const message='Couldn’t sign out. Try again.';
  if($('logout-status'))$('logout-status').innerHTML=msg(message,'err');
  else (await import('./workspace-core.js')).notice(message,'error');
  return;
 }
 window.clearInterval(window.__bpNoticeTimer);
 document.removeEventListener('keydown',window.__bpNavFindKeydown);
 renderAuth('signin','Signed out.');
}
async function sessionUser(){
 const session=check(await db.auth.getSession());
 return session?.user||session?.session?.user||null;
}
async function enterPortal({mode='signin',note='',email=''}={}){
 shell('<div class="card"><h2>Checking your account…</h2></div>');
 try{
  currentUser=await sessionUser();
  if(!currentUser){renderAuth(mode,note,email);return}
  const pageUrl=new URL(location.href);
  if(pageUrl.searchParams.has('auth')){
   pageUrl.searchParams.delete('auth');
   history.replaceState(history.state,'',pageUrl);
  }
  check(await db.rpc('bp_register_profile'));
  context=check(await db.rpc('bp_context'));
  if(typeof context==='string')context=JSON.parse(context);
  const memberships=(context?.memberships||[]).filter(m=>m.role===portal&&m.active);
  if(portal==='owner'?!context?.is_owner:!memberships.length){await renderDenied();return}
  const {launchWorkspace}=await import('./workspace-core.js');
  await launchWorkspace({db,user:currentUser,role:portal,context,root:ROOT,logout,photoData});
 }catch(err){
  shell('<div class="card"><h2>Unable to open this account</h2>'+msg(errText(err),'err')+'<button class="btn" id="retry-account">Try again</button></div>');
  $('retry-account').onclick=()=>enterPortal({mode,note,email});
 }
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

if(portal==='landing'){renderLanding()}else if(portal==='pricing'){renderPricing()}else{
 const mode=new URLSearchParams(location.search).get('auth')==='signup'?'signup':'signin';
 window.addEventListener('pageshow',event=>{if(event.persisted)location.reload()});
 enterPortal({mode});
}
