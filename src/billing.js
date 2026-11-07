const moneyMinor=minor=>'KSh '+(Number(minor||0)/100).toLocaleString('en-KE',{maximumFractionDigits:2});
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const ensure=r=>{if(r?.error)throw new Error(r.error.message||String(r.error));return r?.data||[]};
const place=(html)=>{let x=document.createElement('section');x.className='billing-panel';x.innerHTML=html;document.getElementById('workspace')?.append(x);return x};
const summary=(label,value)=>'<div class="card"><div class="stat">'+esc(value)+'</div><div class="stat-label">'+esc(label)+'</div></div>';
const list=(items,draw,none)=>items.length?'<ul class="list">'+items.map(draw).join('')+'</ul>':'<div class="empty">'+esc(none)+'</div>';
const note=()=>'<p class="billing-footnote">Billing is not connected to a payment processor yet. These are real subscription requests and verified-ledger records, not automatic charges. Commissions become payable only after verified parent payments, applicable deductions, and reconciliation.</p>';
const fail=(err)=>'<div class="notice err">'+esc(err?.message||String(err))+'</div>';
const date=s=>s?new Date(s).toLocaleDateString('en-KE',{day:'numeric',month:'short',year:'numeric'}):'—';

export async function renderOwnerBilling(db){
const [sReq,pReq,ssubs,psubs,commissions,payments,schools,profiles]=await Promise.all([
 db.from('bp_school_plan_requests').select('id,school_id,plan_code,requested_by,status,requested_at').order('requested_at',{ascending:false}).limit(60),
 db.from('bp_parent_plan_requests').select('id,school_id,parent_user_id,plan_code,status,requested_at').order('requested_at',{ascending:false}).limit(60),
 db.from('bp_school_subscriptions').select('status,plan_code,school_id,period_end'),
 db.from('bp_parent_subscriptions').select('status,school_id,parent_user_id,period_end'),
 db.from('bp_school_commission_ledger').select('school_id,commission_minor,status,created_at'),
 db.from('bp_payment_ledger').select('school_id,amount_gross_minor,status'),
 db.from('bp_schools').select('id,name'),
 db.from('bp_profiles').select('user_id,email')
]);
const reqs=ensure(sReq),preqs=ensure(pReq),schoolSubs=ensure(ssubs),parentSubs=ensure(psubs),comm=ensure(commissions),paid=ensure(payments),sMap=new Map(ensure(schools).map(x=>[x.id,x.name])),uMap=new Map(ensure(profiles).map(x=>[x.user_id,x.email]));
const totalRevenue=paid.filter(p=>p.status==='verified_paid').reduce((s,p)=>s+p.amount_gross_minor,0),totalComm=comm.filter(c=>c.status==='pending'||c.status==='approved').reduce((s,c)=>s+c.commission_minor,0);
place('<div class="page-head"><div><h1>Revenue & school partnerships</h1><p class="muted">Billing operations for the platform owner only — separate from school administration.</p></div></div>'+
'<div class="cards">'+summary('Active school subscriptions',schoolSubs.filter(x=>x.status==='active').length)+summary('Active Parent Plus memberships',parentSubs.filter(x=>x.status==='active').length)+summary('Verified collected gross',moneyMinor(totalRevenue))+'</div>'+
'<div class="cards two">'+summary('Unpaid commission ledger',moneyMinor(totalComm))+summary('Open plan requests',reqs.filter(x=>x.status==='pending').length+preqs.filter(x=>x.status==='pending').length)+'</div>'+
'<div class="grid"><div class="card"><h2>🏫 School plan requests</h2>'+list(reqs,r=>'<li><div class="list-name">'+esc(sMap.get(r.school_id)||'School')+' · '+esc(r.plan_code.replace('school_',''))+'</div><div class="list-meta">'+esc(uMap.get(r.requested_by)||'Registered school admin')+' · '+date(r.requested_at)+' · '+esc(r.status)+'</div></li>','No schools have requested a paid plan yet.')+'</div>'+
'<div class="card"><h2>👨‍👩‍👧 Parent Plus requests</h2>'+list(preqs,r=>'<li><div class="list-name">'+esc(sMap.get(r.school_id)||'School')+' · Parent Plus</div><div class="list-meta">'+esc(uMap.get(r.parent_user_id)||'Registered parent')+' · '+date(r.requested_at)+' · '+esc(r.status)+'</div></li>','No families have requested Parent Plus yet.')+'</div></div>'+
'<div class="card" style="margin-top:17px"><h2>🏦 Revenue-sharing ledger</h2>'+list(comm,c=>'<li><div class="list-row"><div><div class="list-name">'+esc(sMap.get(c.school_id)||'School')+'</div><div class="list-meta">'+date(c.created_at)+' · '+esc(c.status)+'</div></div><strong>'+moneyMinor(c.commission_minor)+'</strong></div></li>','No verified parent-payment commissions yet.')+note()+'</div>');
}

export async function renderSchoolBilling(db,schoolId,user){
const [subs,reqs,comm]=await Promise.all([
 db.from('bp_school_subscriptions').select('status,plan_code,period_start,period_end').eq('school_id',schoolId).order('updated_at',{ascending:false}).limit(2),
 db.from('bp_school_plan_requests').select('status,plan_code,requested_at').eq('school_id',schoolId).order('requested_at',{ascending:false}).limit(8),
 db.from('bp_school_commission_ledger').select('commission_minor,status,created_at').eq('school_id',schoolId)
]);
const active=ensure(subs).find(s=>['active','trialing'].includes(s.status)),requests=ensure(reqs),commission=ensure(comm),due=commission.filter(c=>c.status==='pending'||c.status==='approved').reduce((sum,c)=>sum+c.commission_minor,0),paid=commission.filter(c=>c.status==='paid').reduce((sum,c)=>sum+c.commission_minor,0);
const pending=requests.some(r=>r.status==='pending');
const block=place('<div class="page-head"><div><h1>School billing & partner earnings</h1><p class="muted">School subscription requests and your school’s share of verified Parent Plus payments.</p></div></div>'+
'<div class="cards">'+summary('Current school plan',active?(active.plan_code.replace('school_','').toUpperCase()):'Not active')+summary('Commissions pending',moneyMinor(due))+summary('School share paid',moneyMinor(paid))+'</div>'+
'<div class="grid"><section class="card"><h2>📘 Request a school plan</h2><p class="muted">Subscriptions are priced monthly. Billing activation requires payment verification, so a request alone does not charge your school.</p><form id="school-plan-form"><label class="field">Select your plan<select id="school-plan-select"><option value="school_starter">Starter — KSh 2,900 / month · 100 students</option><option value="school_growth">Growth — KSh 6,900 / month · 400 students</option><option value="school_campus">Campus — KSh 14,900 / month · 1,000 students</option></select></label><button class="btn" type="submit" '+(pending?'disabled':'')+'>'+(pending?'Request already pending':'Request school plan')+'</button><div id="school-plan-msg"></div></form><div class="billing-note" style="margin-top:17px">📌 Schools pay for the professional platform. Students’ parents retain free access to core child updates.</div></section>'+
'<section class="card"><h2>💛 School rewards from Parent Plus</h2><div class="stat">25%</div><p class="muted">Your share of eligible net Parent Plus revenue from families linked to your school.</p><h3>Recent plan requests</h3>'+list(requests,r=>'<li><strong>'+esc(r.plan_code.replace('school_','').toUpperCase())+'</strong><div class="list-meta">'+date(r.requested_at)+' · '+esc(r.status)+'</div></li>','No requests made yet.')+'</section></div>'+
'<div class="card" style="margin-top:16px"><h2>Commission history</h2>'+list(commission,c=>'<li><div class="list-row"><span>'+esc(c.status)+' · '+date(c.created_at)+'</span><strong>'+moneyMinor(c.commission_minor)+'</strong></div></li>','No verified parent premium payments have generated commissions yet.')+note()+'</div>');
const f=block.querySelector('#school-plan-form');
f.addEventListener('submit',async e=>{e.preventDefault();const b=f.querySelector('button');b.disabled=true;try{ensure(await db.from('bp_school_plan_requests').insert({school_id:schoolId,plan_code:block.querySelector('#school-plan-select').value,requested_by:user.id}));await renderSchoolBillingReplace(db,schoolId,user,block)}catch(err){block.querySelector('#school-plan-msg').innerHTML=fail(err);b.disabled=false}});
}
async function renderSchoolBillingReplace(db,sid,u,old){old.remove();await renderSchoolBilling(db,sid,u)}

export async function renderParentBilling(db,schoolId,user){
const [subs,requests]=await Promise.all([
 db.from('bp_parent_subscriptions').select('status,plan_code,period_end').eq('school_id',schoolId).eq('parent_user_id',user.id).order('updated_at',{ascending:false}).limit(3),
 db.from('bp_parent_plan_requests').select('status,requested_at').eq('school_id',schoolId).eq('parent_user_id',user.id).order('requested_at',{ascending:false}).limit(4)
]);
const membership=ensure(subs).find(s=>s.status==='active'||s.status==='trialing'),reqs=ensure(requests),pending=reqs.some(r=>r.status==='pending');
const block=place('<div class="page-head"><div><h1>🌻 Family membership</h1><p class="muted">Core school information stays available with your free Essential access.</p></div></div>'+
'<div class="grid"><div class="card"><h2>💚 Essential — free</h2><div class="stat">KSh 0</div><p>Continue viewing your own child’s school updates, feedback, scores and approved pictures.</p><span class="billing-status">Included for parents</span></div>'+
'<div class="card"><h2>✨ Parent Plus — optional</h2><div class="stat">KSh 199 <span style="font-size:13px;color:#82979e;font-weight:500">/ month</span></div><p>Planned add-ons: deeper progress summaries and downloadable learning portfolios. These extra features are not available yet.</p>'+
 '<form id="parent-plan-form"><button class="btn ghost" type="submit" '+(pending||!!membership?'disabled':'')+'>'+(membership?'Already active':pending?'Interest already registered':'Register interest in Parent Plus')+'</button><div id="parent-plan-msg"></div></form><p class="billing-footnote">Registering interest does not charge you. BrightPath shares 25% of eligible net Parent Plus revenue with your school.</p></div></div>'+
 (reqs.length?'<div class="card" style="margin-top:17px"><h2>Membership requests</h2>'+list(reqs,r=>'<li><strong>'+esc(r.status)+'</strong><div class="list-meta">'+date(r.requested_at)+'</div></li>','')+'</div>':''));
const f=block.querySelector('#parent-plan-form');
f.addEventListener('submit',async e=>{e.preventDefault();const b=f.querySelector('button');b.disabled=true;try{ensure(await db.from('bp_parent_plan_requests').insert({school_id:schoolId,parent_user_id:user.id,plan_code:'parent_plus'}));await renderParentBillingReplace(db,schoolId,user,block)}catch(err){block.querySelector('#parent-plan-msg').innerHTML=fail(err);b.disabled=false}});
}
async function renderParentBillingReplace(db,sid,u,old){old.remove();await renderParentBilling(db,sid,u)}
