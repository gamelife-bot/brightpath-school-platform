export async function renderAccessPending(params,{confirmedSchool=null,confirmedStatus=null}={}){
 const {db,context,portal,root,shell,enterPortal}=params;
 const h=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"\'":'&#39;'}[ch]));
 const url=path=>root+path;
 const $=id=>document.getElementById(id);
 const msg=(value,type='notice')=>'<div class="notice '+(type==='err'?'err':'')+'">'+h(value)+'</div>';
 const errText=err=>err?.message||String(err)||'Unknown error';
 const check=result=>{if(result?.error)throw new Error(errText(result.error));return result?.data};
 const asDate=value=>new Date(value).toLocaleDateString(undefined,{day:'numeric',month:'short',year:'numeric'});
 const renderDenied=opts=>renderAccessPending(params,opts);
 const isOwner=context?.is_owner===true;
 const heading=isOwner?'Your owner account is active':portal==='owner'?'Owner access required':'School access pending';
 const detail=isOwner?'Use your platform-owner dashboard to register a school and appoint its school administrator.':portal==='owner'?'Sign in with your authorized platform-owner account.':portal==='school_admin'?'The BrightPath platform owner must approve your school administrator account.':portal==='teacher'?'Choose your school to request teacher access.':'Choose your daycare or preschool to request parent access.';
 const ownerButton=isOwner?'<a class="btn" href="'+url('owner/')+'">Open owner dashboard ↗</a>':'';
 let requestPanel='',schools=[],requests=[];
 if(!isOwner&&(portal==='teacher'||portal==='parent')){
  let directoryError=null,historyError=null;
  // A broken request-history lookup must never hide the application form.
  try{schools=check(await db.rpc('bp_school_directory'))||[];}catch(err){directoryError=errText(err)}
  try{requests=check(await db.rpc('bp_my_school_requests'))||[];}
  catch(err){
   try{requests=check(await db.from('bp_access_requests').select('id,school_id,status,requested_role,requested_at,reviewed_at').eq('requested_role',portal).order('requested_at',{ascending:false}))||[];}
   catch(fallbackErr){historyError=errText(fallbackErr)||errText(err)}
  }
  requests=requests.filter(r=>r.requested_role===portal);
  const priorRequests=requests.map(r=>'<div class="mw-request-item"><div><strong>'+h(r.school_name||schools.find(s=>s.id===r.school_id)?.name||'School')+'</strong><small>'+h(r.requested_at?asDate(r.requested_at):'')+'</small></div><span class="bp-request-state bp-request-'+h(r.status)+'">'+h(r.status==='approved'?'Approved':r.status==='rejected'?'Not approved':'Awaiting review')+'</span></div>').join('');
  const confirmed=confirmedSchool&&confirmedStatus==='pending'?
    '<div class="bp-application-success" role="status"><strong>✓ Request sent to the school administrator</strong><p>Your application has been recorded for '+h(schools.find(s=>s.id===confirmedSchool)?.name||'your selected school')+'. Your school can review it under '+(portal==='parent'?'Parent Approvals':'Teacher Approvals')+'.</p></div>':'';
  requestPanel='<section class="card bp-application-card" style="margin-top:18px"><h2>Request '+(portal==='teacher'?'teacher':'parent')+' approval</h2>'+confirmed+
   (schools.length?'<form id="bp-request-access"><label class="field">Select your '+(portal==='parent'?'child’s daycare or preschool':'school')+'<select class="form-control" id="bp-request-school" required><option value="">Choose your school</option>'+schools.map(s=>'<option value="'+h(s.id)+'" '+(s.id===confirmedSchool?'selected':'')+'>'+h(s.name)+'</option>').join('')+'</select></label><button class="btn" type="submit">'+(portal==='parent'?'Request parent approval':'Request teacher approval')+'</button><div id="bp-request-note" role="status" aria-live="polite"></div></form>':
    '<p class="muted">'+h(directoryError?'School choices are temporarily unavailable: '+directoryError:'Your school will appear here after it joins BrightPath.')+'</p>')+
   '<div class="bp-application-history"><div class="bp-application-title"><h3>Application status</h3><button class="btn ghost small" id="bp-requests-refresh" type="button">Refresh status</button></div>'+
   (priorRequests||'<p class="muted">No application submitted yet.</p>')+
   (historyError?'<p class="smallnote">Previous applications could not be loaded right now. You can still submit a new request.</p>':'')+'</div>'+
   '<p class="smallnote">Approval gives you school membership only. A parent can see a child’s records after the school verifies and links their guardianship. Teachers must be assigned to classrooms.</p></section>';
 }
 shell('<div class="card" style="max-width:680px"><h1>'+h(heading)+'</h1><p class="muted">'+h(detail)+'</p><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:20px">'+ownerButton+'<button class="btn ghost" id="refresh">Check access again</button></div></div>'+requestPanel);
 $('refresh').onclick=()=>enterPortal();
 if($('bp-requests-refresh'))$('bp-requests-refresh').onclick=()=>renderDenied();
 const application=$('bp-request-access');
 if(application)application.onsubmit=async ev=>{
  ev.preventDefault();const submit=application.querySelector('button[type=submit]');
  if(submit.disabled)return;
  submit.disabled=true;submit.textContent='Sending request…';
  try{
   const school=$('bp-request-school').value;
   if(!school)throw new Error('Please select your school');
   const response=check(await db.rpc('bp_request_school_access',{p_school:school,p_role:portal}));
   if(response?.ok!==true||response?.status!=='pending')throw new Error('The school did not confirm your request. Please try again.');
   await renderDenied({confirmedSchool:school,confirmedStatus:response.status});
  }catch(err){const note=$('bp-request-note');if(note)note.innerHTML=msg(errText(err),'err');if(submit?.isConnected){submit.disabled=false;submit.textContent=portal==='parent'?'Request parent approval':'Request teacher approval';}}
 };
}

