import {escapeHtml as e,dateLabel,stat,box,empty,pill,field,input,select,textarea,button,heading,option,read,rpc,form,notice,v,checked} from './workspace-core.js';

const purposes={school_policy:'School policy',trip_permission:'School trip or outing',general_acknowledgement:'General acknowledgment',other:'Other school document'};
const clock=dt=>dt?new Date(dt).toLocaleString('en-KE',{dateStyle:'medium',timeStyle:'short'}):'—';
function signaturePad(id){
 const canvas=document.getElementById('bp-sign-pad-'+id);
 const ctx=canvas.getContext('2d',{willReadFrequently:false});
 ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
 ctx.strokeStyle='#164f51';ctx.lineWidth=4.6;ctx.lineCap='round';ctx.lineJoin='round';
 let drawing=false,marked=false,uploaded=false,method='draw',last=null;
 const xy=ev=>{const rect=canvas.getBoundingClientRect();return{x:(ev.clientX-rect.left)*canvas.width/rect.width,y:(ev.clientY-rect.top)*canvas.height/rect.height}};
 canvas.style.touchAction='none';
 canvas.addEventListener('pointerdown',ev=>{if(method!=='draw')return;ev.preventDefault();drawing=true;last=xy(ev);canvas.setPointerCapture(ev.pointerId);ctx.beginPath();ctx.moveTo(last.x,last.y);});
 canvas.addEventListener('pointermove',ev=>{if(!drawing)return;ev.preventDefault();const p=xy(ev);ctx.lineTo(p.x,p.y);ctx.stroke();last=p;marked=true});
 const done=()=>{drawing=false;last=null};
 canvas.addEventListener('pointerup',done);canvas.addEventListener('pointercancel',done);
 const status=document.getElementById('bp-sign-status-'+id);
 const original=document.getElementById('bp-sign-file-'+id);
 const clear=()=>{ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#164f51';marked=false;uploaded=false;method='draw';original.value='';status.textContent='Draw your signature using your finger, mouse or stylus.';};
 document.getElementById('bp-sign-clear-'+id).onclick=clear;
 original.addEventListener('change',async()=>{
  const file=original.files?.[0];if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2_000_000||!file.size){notice('Choose a PNG, JPG or WebP image smaller than 2 MB.','error');original.value='';return;}
  const url=URL.createObjectURL(file),image=new Image();
  try{
   await new Promise((resolve,reject)=>{image.onload=resolve;image.onerror=()=>reject(Error('Image could not be opened'));image.src=url});
   if(image.naturalWidth<24||image.naturalHeight<10)throw Error('Image is too small to contain a signature');
   ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
   const margin=12,ratio=Math.min((canvas.width-margin*2)/image.naturalWidth,(canvas.height-margin*2)/image.naturalHeight);
   const w=image.naturalWidth*ratio,h=image.naturalHeight*ratio;
   ctx.drawImage(image,(canvas.width-w)/2,(canvas.height-h)/2,w,h);
   method='upload';marked=true;uploaded=true;status.textContent='Signature image uploaded and fitted to the signing area.';
  }catch(err){notice(err.message,'error');clear();}
  finally{URL.revokeObjectURL(url);}
 });
 return{
  get(){if(!marked)throw Error('Draw a signature or upload an image first');
   const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   let ink=0;for(let i=0;i<pixels.length;i+=40){if(pixels[i]+pixels[i+1]+pixels[i+2]<640)ink++;if(ink>35)break;}
   if(ink<35)throw Error('The signature appears blank. Draw or upload a visible handwritten signature.');
   const data=canvas.toDataURL('image/png');
   if(data.length>150000)throw Error('Signature image is too large. Please use a simpler signature image.');
   return{data,method:uploaded?'upload':'draw'};
  },clear
 };
}
function signPanel(doc){
 return '<div class="bp-sign-editor" id="bp-sign-editor-'+e(doc.id)+'" hidden>'+
 '<p class="bp-sign-instruction">Please read the complete statement above. Your signature will apply only to this document, not other forms.</p>'+
 '<div class="bp-sign-toolbar"><span>✍️ Draw with your finger or stylus</span><button type="button" class="mw-btn mw-btn-outline" id="bp-sign-clear-'+e(doc.id)+'">Clear</button></div>'+
 '<canvas class="bp-sign-canvas" id="bp-sign-pad-'+e(doc.id)+'" width="720" height="210" role="img" aria-label="Drawing area for your signature"></canvas>'+
 '<p class="bp-sign-alt">Or upload a cropped image of your own handwritten signature (PNG, JPG or WebP, up to 2 MB). Do not upload an ID document:</p>'+
 '<input type="file" accept="image/png,image/jpeg,image/webp" id="bp-sign-file-'+e(doc.id)+'" aria-label="Upload handwritten signature image">'+
 '<p class="bp-sign-status" id="bp-sign-status-'+e(doc.id)+'">Draw your signature using your finger, mouse or stylus.</p>'+
 '<form class="mw-form" id="bp-sign-form-'+e(doc.id)+'">'+
 field('Your full name',input('bp-sign-name-'+doc.id,'Enter your full name','text','required minlength="3" maxlength="140"'))+
 '<label class="mw-check-label"><input type="checkbox" id="bp-sign-attest-'+e(doc.id)+'" required><span>I have read the document displayed above and intend to sign this specific statement using the drawing or image I provided.</span></label>'+
 '<p class="bp-private-hint">BrightPath records who signed and when. This is a basic electronic acknowledgment—not a certified advanced digital signature. It does not replace independent identity verification or separate parental consent where required.</p>'+
 button('Sign this document','bp-sign-submit-'+doc.id,'primary','type="submit"')+'</form></div>';
}
export async function renderSignatures(ctx){
 const {db,schoolId:sid,user,role,reload}=ctx,admin=role==='school_admin';
 const [docs,kids,members,profiles,links]=await Promise.all([
  read(db,'bp_signature_requests',q=>q.eq('school_id',sid).order('created_at',{ascending:false}).limit(200)),
  read(db,'bp_students',q=>q.eq('school_id',sid)),
  admin?read(db,'bp_memberships',q=>q.eq('school_id',sid).eq('role','parent').eq('active',true)):Promise.resolve([]),
  admin?read(db,'bp_profiles'):Promise.resolve([]),
  admin?read(db,'bp_parent_links',q=>q.eq('school_id',sid)):Promise.resolve([])
 ]);
 const people=new Map(profiles.map(p=>[p.user_id,p.full_name||p.email]));
 const childName=id=>kids.find(c=>c.id===id)?.full_name;
 const list=docs.map(doc=>{
  const signed=['signed','disputed'].includes(doc.status);
  return '<article class="bp-sign-doc"><header class="bp-sign-doc-head"><span>✍️</span><div><h3>'+e(doc.title)+'</h3>'+
   '<small>'+e(purposes[doc.purpose]||'School document')+' · '+dateLabel(doc.created_at)+
   (admin?' · '+e(people.get(doc.signer_user_id)||'Parent'):'')+
   (doc.student_id?' · '+e(childName(doc.student_id)||'Linked child'):'')+'</small></div>'+
   pill(doc.status,signed?'green':doc.status==='pending'?'amber':'red')+'</header>'+
   '<div class="bp-sign-document"><strong>Document to review</strong><p>'+e(doc.document_body)+'</p></div>'+
   (signed?'<section class="bp-sign-completed"><div><strong>Signed by '+e(doc.signed_name||'Parent')+'</strong><small>Recorded '+e(clock(doc.signed_at))+' · '+e(doc.signature_method==='upload'?'Uploaded handwritten signature':'Drawn signature')+'</small></div>'+
     '<img alt="Signature supplied by the parent for this exact document" src="'+e(doc.signature_png||'')+'">'+
     '<small>Document record fingerprint: <code>'+e(doc.record_hash||'')+'</code></small>'+
     (doc.status==='disputed'?'<p class="bp-sign-disputed">This signed record has been disputed. School Administration must investigate the concern.</p>':'')+
     '</section>':'')+
   (!admin&&doc.status==='pending'?button('Review & sign','bp-sign-open-'+doc.id,'primary','type="button" data-open-sign="'+e(doc.id)+'"')+
     signPanel(doc):'')+
   (admin&&doc.status==='pending'?button('Cancel request','bp-sign-cancel-'+doc.id,'outline','type="button" data-cancel-sign="'+e(doc.id)+'"'):'')+
   (!admin&&doc.status==='signed'?button('Dispute this signature','bp-sign-dispute-'+doc.id,'outline','type="button" data-dispute-sign="'+e(doc.id)+'"'):'')+
   '</article>';
 }).join('');
 const parentOptions=members.map(m=>({id:m.user_id,name:people.get(m.user_id)||'Approved parent'}));
 const html=heading('DOCUMENTS & APPROVALS','School signatures',
  admin?'Send a specific school document to a verified guardian for review and signing.':'Review school documents and sign by drawing or uploading your own handwritten signature.')+
 '<div class="bp-sign-note">🔐 A signature is stored for one specific document only, alongside the signed time and a record fingerprint. Signatures are not reusable by school staff or automatically copied onto other forms.</div>'+
 '<div class="mw-metrics">'+stat('Documents',docs.length,'📄','teal')+
 stat(admin?'Awaiting signatures':'To sign',docs.filter(x=>x.status==='pending').length,'✍️','amber')+
 stat('Signed',docs.filter(x=>x.status==='signed').length,'✅','blue')+'</div>'+
 (admin?box('Create a document for a guardian to sign',
  '<form class="mw-form" id="bp-sign-request">'+
  field('Approved parent / guardian',select('bp-sign-target','<option value="">Choose parent</option>'+parentOptions.map(m=>option(m.id,m.name)).join(''),'required'))+
  field('Child (optional)',select('bp-sign-child','<option value="">General school document</option>'+kids.map(k=>option(k.id,k.full_name)).join('')))+
  field('Purpose',select('bp-sign-purpose',Object.entries(purposes).map(([id,label])=>option(id,label)).join('')))+
  field('Document title',input('bp-sign-title','e.g. Parent handbook 2026 acknowledgement','text','required minlength="5" maxlength="180"'))+
  field('Exact document statement',textarea('bp-sign-body','Include the complete statement you want this parent to review. Changes require a new request.','required minlength="20" maxlength="5000"'))+
  '<p class="bp-private-hint">Only an approved parent with a verified link to the selected child may sign. Do not use this acknowledgment to bypass separate child-photo consent, medical authorization, or legal requirements.</p>'+
  button('Send signature request','bp-sign-send','primary','type="submit" '+(!members.length?'disabled':''))+'</form>'):'')+
 box(admin?'Guardian signature requests':'My school documents',docs.length?'<div class="bp-sign-list">'+list+'</div>':
 empty('✍️','No documents yet',admin?'Create your first school signature request above.':'Your school will send documents here for you to review and sign.'))+
 box('Signature safety','<div class="bp-care-safety-guide"><div>✍️ <b>Draw or upload</b><p>Parents can sign from a phone, tablet or computer using a fingertip, stylus, mouse or an image upload.</p></div>'+
 '<div>🔒 <b>Private and document-specific</b><p>Only the addressed guardian and school administrators can read the signature record.</p></div>'+
 '<div>🛡️ <b>Dispute and audit</b><p>A parent can flag a completed signature for review without deleting its original timestamp and fingerprint.</p></div></div>');
 return {html,bind(){
  if(admin){
   const parentSelect=document.getElementById('bp-sign-target'),childSelect=document.getElementById('bp-sign-child');
   const childOpt='<option value="">General school document</option>';
   function filterChild(){const chosen=parentSelect.value,ids=new Set(links.filter(l=>l.parent_user_id===chosen).map(l=>l.student_id));
    childSelect.innerHTML=childOpt+kids.filter(c=>ids.has(c.id)).map(c=>option(c.id,c.full_name)).join('');}
   parentSelect.onchange=filterChild;filterChild();
   form('bp-sign-request',async()=>{
    const target=v('bp-sign-target');if(!members.some(m=>m.user_id===target))throw Error('Choose an approved parent');
    const result=await rpc(db,'bp_create_signature_request',{p_school:sid,p_student:v('bp-sign-child')||null,
      p_signer:target,p_title:v('bp-sign-title'),p_body:v('bp-sign-body'),p_purpose:v('bp-sign-purpose')});
    if(!result.ok||!result.id)throw Error('Signature request could not be confirmed');await reload();
   });
   document.querySelectorAll('[data-cancel-sign]').forEach(b=>b.onclick=async()=>{if(!confirm('Cancel this outstanding request?'))return;
    b.disabled=true;try{const result=await rpc(db,'bp_update_signature_request',{p_id:b.dataset.cancelSign,p_action:'cancel'});
      if(!result.ok)throw Error('Cancellation not confirmed');await reload();}catch(err){notice(err.message,'error');b.disabled=false}
   });
  }else{
   const pads=new Map();for(const doc of docs.filter(x=>x.status==='pending')){
    const editor=document.getElementById('bp-sign-editor-'+doc.id);const pad=signaturePad(doc.id);pads.set(doc.id,pad);
    document.getElementById('bp-sign-open-'+doc.id).onclick=()=>{
      const visible=editor.hidden;editor.hidden=!visible;
      if(visible)editor.scrollIntoView({behavior:'smooth',block:'center'});
    };
    form('bp-sign-form-'+doc.id,async()=>{
     if(!checked('bp-sign-attest-'+doc.id))throw Error('You must confirm your intention to sign');
     const {data,method}=pad.get();
     const res=await rpc(db,'bp_sign_school_document',{p_request:doc.id,p_name:v('bp-sign-name-'+doc.id),
       p_method:method,p_png:data,p_accept:true});
     if(!res.ok||!res.record_hash)throw Error('School did not confirm the signature record');
     notice('Document signed');await reload();
    });
   }
   document.querySelectorAll('[data-dispute-sign]').forEach(b=>b.onclick=async()=>{
    if(!confirm('Mark this signature as disputed and notify School Administration?'))return;
    b.disabled=true;try{const res=await rpc(db,'bp_update_signature_request',{p_id:b.dataset.disputeSign,p_action:'dispute'});
      if(!res.ok)throw Error('Dispute could not be confirmed');await reload();}
    catch(err){notice(err.message,'error');b.disabled=false}
   });
  }
 }};
}
