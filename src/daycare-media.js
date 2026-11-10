import {escapeHtml as h,dateLabel,initial,stat,box,empty,pill,field,input,select,textarea,button,heading,table,tr,option,read,write,rpc,form,click,notice,v} from './workspace-core.js';

const MEDIA='https://br-billowing-hat-baft40ux-brightmedia.compute.c-8.eu-central-1.aws.neon.tech/';
const AUTH='https://ep-falling-frog-bao493od.neonauth.c-8.eu-central-1.aws.neon.tech/neondb/auth';
const EXTS=new Set(['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime']);
const MAX_PHOTO=8*1024*1024,MAX_VIDEO=25*1024*1024;
async function authToken(db){
 let response;
 try{response=await db.auth.token()}catch{}
 let token=response?.data?.token||response?.token||(typeof response?.data==='string'?response.data:null);
 if(!token){
  const r=await fetch(AUTH.replace(/\/$/,'')+'/token',{credentials:'include',headers:{accept:'application/json'}});
  if(r.ok){const body=await r.json();token=body.token||body.data?.token}
 }
 if(typeof token!=='string'||token.split('.').length!==3)throw Error('Your session needs to be refreshed. Sign in again.');
 return token;
}
async function callMedia(url,token,opts={}){
 const response=await fetch(MEDIA+url,{method:'POST',headers:{authorization:'Bearer '+token,...opts.headers},body:opts.body,signal:AbortSignal.timeout(120000)});
 if(!response.ok){let msg='Media service unavailable';try{msg=(await response.json()).error||msg}catch{}throw Error(msg)}
 return response;
}
async function loadMedia(db,id){
 const token=await authToken(db);
 const r=await callMedia('read',token,{headers:{'content-type':'application/json'},body:JSON.stringify({id})});
 const content=await r.blob();
 return URL.createObjectURL(content);
}
async function verifyFileSignature(file){
 const bytes=new Uint8Array(await file.slice(0,24).arrayBuffer());
 const text=String.fromCharCode(...bytes);
 const jpg=bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff;
 const png=bytes.slice(0,8).join(',')==='137,80,78,71,13,10,26,10';
 const webp=text.startsWith('RIFF')&&text.slice(8,12)==='WEBP';
 const mp4=text.slice(4,8)==='ftyp';
 const webm=bytes.slice(0,4).join(',')==='26,69,223,163';
 return file.type==='image/jpeg'?jpg:file.type==='image/png'?png:file.type==='image/webp'?webp:
  ['video/mp4','video/quicktime'].includes(file.type)?mp4:file.type==='video/webm'?webm:false;
}
async function uploadChildMedia(db,schoolId,studentId,kind,file,caption,user){
 if(!EXTS.has(file.type)||kind==='photo'&&!file.type.startsWith('image/')||kind==='video'&&!file.type.startsWith('video/'))throw Error('Choose a JPG, PNG, WebP, MP4, WebM or MOV file.');
 const limit=kind==='photo'?MAX_PHOTO:MAX_VIDEO;
 if(!file.size||file.size>limit)throw Error(kind==='video'?'Choose a short video under 25 MB.':'Choose a photo under 8 MB.');
 if(!await verifyFileSignature(file))throw Error('The file content does not match the selected photo or video format.');
 const token=await authToken(db);
 const r=await callMedia('upload',token,{headers:{
   'content-type':file.type,'x-bp-school':schoolId,'x-bp-student':studentId,'x-bp-kind':kind
  },body:file});
 const data=await r.json();
 const record={school_id:schoolId,student_id:studentId,kind,caption,object_key:data.key,mime_type:data.mime,bytes:data.bytes,status:'ready',created_by:user.id};
 await write(db,'bp_child_media',record);
}
function mediaTile(m,students){
 const name=students.find(s=>s.id===m.student_id)?.full_name||'Child';
 return '<article class="bp-media-tile"><div class="bp-media-placeholder" id="bp-media-display-'+h(m.id)+'"><div class="bp-media-icon">'+(m.kind==='video'?'🎬':'📷')+'</div><button class="mw-btn mw-btn-outline" type="button" data-view-media="'+h(m.id)+'">'+(m.kind==='video'?'Play video':'View photo')+'</button></div>'+
 '<div class="bp-media-tile-caption"><strong>'+h(m.caption)+'</strong><small>'+h(name)+' · '+dateLabel(m.created_at)+'</small></div></article>';
}
const mediaUrls=new Set();
if(typeof window!=='undefined')window.__bpRevokeMediaUrls=()=>{for(const u of mediaUrls)URL.revokeObjectURL(u);mediaUrls.clear()};
export async function renderChildMoments(ctx){
 const {db,schoolId:sid,user,role,reload}=ctx;
 let children=await read(db,'bp_students',q=>q.eq('school_id',sid).order('full_name'));
 if(role==='teacher'){
  const classes=await read(db,'bp_teacher_classes',q=>q.eq('school_id',sid));
  const allowed=new Set(classes.map(x=>x.class_id));children=children.filter(c=>allowed.has(c.class_id));
 }else if(role==='parent'){
  const links=await read(db,'bp_parent_links',q=>q.eq('school_id',sid));
  const allowed=new Set(links.map(x=>x.student_id));children=children.filter(c=>allowed.has(c.id));
 }
 const allowed=new Set(children.map(x=>x.id));
 const media=await read(db,'bp_child_media',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(140));
 const visible=media.filter(x=>allowed.has(x.student_id));
 const photos=visible.filter(x=>x.kind==='photo'),videos=visible.filter(x=>x.kind==='video');
 const html=heading('CLASSROOM MEMORIES','Photos & videos')+
 '<div class="mw-metrics">'+stat('Photos shared',photos.length,'📸','teal')+
 stat('Videos shared',videos.length,'🎥','blue')+
 stat('Children in gallery',new Set(visible.map(x=>x.student_id)).size,'💛','amber')+'</div>'+
 (role!=='parent'?'<div class="mw-two mw-two-side">'+box('Share a moment',
  '<form id="bp-media-form" class="mw-form">'+field('Child',select('bp-media-child','<option value="">Choose a child</option>'+children.map(c=>option(c.id,c.full_name)).join(''),'required'))+
   field('Photo or video',select('bp-media-kind','<option value="photo">📸 Photo</option><option value="video">🎥 Short video</option>'))+
   field('Caption',textarea('bp-media-caption','Describe what the child was doing…','required minlength="2" maxlength="500"'))+
   field('Choose file','<input type="file" id="bp-media-file" accept="image/jpeg,image/png,image/webp" required>')+
   '<p class="mw-fine">Photos up to 8 MB • Videos up to 25 MB. Guardian consent is required before sharing.</p>'+
   '<div class="mw-form-actions">'+button('Share with family','bp-media-share','primary','type="submit" '+(!children.length?'disabled':''))+'</div></form>')+
  box('Media safety', '<div class="mw-guidance">'+
    '<div><span>🔐</span><p><b>Private sharing</b><small>Only approved school staff and linked guardians can view</small></p></div>'+
    '<div><span>💛</span><p><b>Guardian choice</b><small>Each child has separate photo and video permissions</small></p></div>'+
    '<div><span>🎥</span><p><b>Little moments</b><small>Short recordings rather than long classroom videos</small></p></div></div>')+'</div>':
  box('Your family’s photo & video permissions',
   '<div class="bp-consent-settings">'+children.map(c=>
    '<div class="bp-consent-row"><div><strong>'+h(c.full_name)+'</strong><small>Choose what this school may share with your account</small></div><div class="bp-consent-actions">'+
    button('📸 Photos: '+(c.photo_consent?'Allowed':'Off'),'bp-photo-'+c.id,c.photo_consent?'outline':'primary','data-consent-child="'+h(c.id)+'" data-consent-kind="photo" data-consent-next="'+(!c.photo_consent)+'"')+
    button('🎥 Videos: '+(c.video_consent?'Allowed':'Off'),'bp-video-'+c.id,c.video_consent?'outline':'primary','data-consent-child="'+h(c.id)+'" data-consent-kind="video" data-consent-next="'+(!c.video_consent)+'"')+
    '</div></div>').join('')+'</div>'+
   '<p class="mw-fine">You can withdraw permission at any time. Previously downloaded media cannot be recalled from someone’s device.</p>'))+
 box('Private media gallery',
 '<div class="mw-filter-row">'+select('bp-media-filter','<option value="all">All moments</option><option value="photo">Photos</option><option value="video">Videos</option>')+
 (children.length>1?select('bp-media-child-filter','<option value="all">All my children</option>'+children.map(c=>option(c.id,c.full_name)).join('')):'')+'</div>'+
 '<div id="bp-media-gallery">'+(visible.length?'<div class="bp-media-grid">'+visible.map(x=>mediaTile(x,children)).join('')+'</div>':
 empty('📸','Your gallery is ready','Photos and short videos will appear here after they’re shared.'))+'</div>');
 return{html,bind(){
  const paint=()=>{
   const type=v('bp-media-filter')||'all',child=v('bp-media-child-filter')||'all';
   const selection=visible.filter(x=>(type==='all'||x.kind===type)&&(child==='all'||x.student_id===child));
   document.getElementById('bp-media-gallery').innerHTML=selection.length?
    '<div class="bp-media-grid">'+selection.map(x=>mediaTile(x,children)).join('')+'</div>':
    empty('📸','No matching moments','Try another child or media filter.');
   activateMedia();
  };
  const activateMedia=()=>{
   document.querySelectorAll('[data-view-media]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.viewMedia,record=visible.find(x=>x.id===id);
    if(!record)return;
    b.disabled=true;b.textContent='Opening…';
    try{
     const blobUrl=await loadMedia(db,id);mediaUrls.add(blobUrl);
     const target=document.getElementById('bp-media-display-'+id);
     if(!target){URL.revokeObjectURL(blobUrl);mediaUrls.delete(blobUrl);return}
     target.innerHTML=record.kind==='photo'?
      '<img src="'+blobUrl+'" alt="'+h(record.caption)+'" loading="lazy">':
      '<video src="'+blobUrl+'" controls playsinline preload="metadata"></video>';
    }catch(err){notice(err.message||String(err),'error');b.disabled=false;b.textContent='Try again'}
   });
  };
  activateMedia();
  document.getElementById('bp-media-filter')?.addEventListener('change',paint);
  document.getElementById('bp-media-child-filter')?.addEventListener('change',paint);
  document.querySelectorAll('[data-consent-child]').forEach(b=>b.onclick=async()=>{
   const grant=b.dataset.consentNext==='true',kind=b.dataset.consentKind;
   if(!confirm(grant?'Allow the school to share '+kind+'s of this child with authorized family accounts?':'Withdraw '+kind+' sharing permission for this child?'))return;
   try{
    await rpc(db,'bp_guardian_confirm_media_consent',{p_school:sid,p_student:b.dataset.consentChild,p_kind:kind,p_grant:grant});
    notice('Your media permission was updated');await reload();
   }catch(err){notice(err.message||String(err),'error')}
  });
  const fileInput=document.getElementById('bp-media-file'),kindSelect=document.getElementById('bp-media-kind');
  if(kindSelect)kindSelect.onchange=()=>{
   fileInput.accept=kindSelect.value==='video'?'video/mp4,video/webm,video/quicktime':'image/jpeg,image/png,image/webp';
   fileInput.value='';
  };
  if(role!=='parent')form('bp-media-form',async()=>{
   const child=v('bp-media-child'),type=v('bp-media-kind'),file=fileInput.files?.[0];
   const record=children.find(c=>c.id===child);
   if(!record)throw Error('Choose a child');
   if(!(type==='photo'?record.photo_consent:record.video_consent))throw Error('Guardian permission for this media type must be recorded first');
   if(!file)throw Error('Choose a media file');
   await uploadChildMedia(db,sid,child,type,file,v('bp-media-caption'),user);
   await reload();
  });
 }};
}
