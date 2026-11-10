import './src/style.css';
import {launchWorkspace} from './src/workspace-core.js';

const now=new Date();
const parts=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Africa/Nairobi',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(x=>[x.type,x.value]));
const day=parts.year+'-'+parts.month+'-'+parts.day;
const I={
 school:'11111111-1111-4111-8111-111111111111',
 roomA:'22222222-2222-4222-8222-222222222221',roomB:'22222222-2222-4222-8222-222222222222',
 childA:'33333333-3333-4333-8333-333333333331',childB:'33333333-3333-4333-8333-333333333332',
 childC:'33333333-3333-4333-8333-333333333333',
 collector:'44444444-4444-4444-8444-444444444441',
 collectorB:'44444444-4444-4444-8444-444444444442'
};
const profiles=[
 {user_id:'family-a',full_name:'Example Parent A',email:'a@example.invalid'},
 {user_id:'family-b',full_name:'Example Parent B',email:'b@example.invalid'},
 {user_id:'staff-a',full_name:'Example Teacher',email:'teacher@example.invalid'},
 {user_id:'admin-a',full_name:'Example Administrator',email:'admin@example.invalid'}
];
const tables={
 bp_schools:[{id:I.school,name:'Rainbow Steps Daycare',status:'active'}],
 bp_classes:[{id:I.roomA,school_id:I.school,name:'Sunflower Room'},{id:I.roomB,school_id:I.school,name:'Cloud Room'}],
 bp_students:[
  {id:I.childA,school_id:I.school,class_id:I.roomA,full_name:'Example Child A',photo_consent:false,video_consent:false,guardian_processing_consent_confirmed:true},
  {id:I.childB,school_id:I.school,class_id:I.roomA,full_name:'Example Child B',photo_consent:false,video_consent:false,guardian_processing_consent_confirmed:true},
  {id:I.childC,school_id:I.school,class_id:I.roomB,full_name:'Other Classroom Child',photo_consent:false,video_consent:false,guardian_processing_consent_confirmed:true}
 ],
 bp_memberships:[
  {school_id:I.school,user_id:'staff-a',active:true,role:'teacher'},
  {school_id:I.school,user_id:'family-a',active:true,role:'parent'},
  {school_id:I.school,user_id:'family-b',active:true,role:'parent'},
  {school_id:I.school,user_id:'admin-a',active:true,role:'school_admin'}
 ],
 bp_profiles:profiles,
 bp_teacher_classes:[{school_id:I.school,teacher_user_id:'staff-a',class_id:I.roomA}],
 bp_parent_links:[{school_id:I.school,parent_user_id:'family-a',student_id:I.childA},{school_id:I.school,parent_user_id:'family-b',student_id:I.childB},{school_id:I.school,parent_user_id:'family-b',student_id:I.childC}],
 bp_attendance:[
  {id:crypto.randomUUID(),school_id:I.school,student_id:I.childA,attendance_date:day,status:'present',marked_by:'staff-a'},
  {id:crypto.randomUUID(),school_id:I.school,student_id:I.childB,attendance_date:day,status:'present',marked_by:'staff-a'}
 ],
 bp_care_logs:[{id:crypto.randomUUID(),school_id:I.school,student_id:I.childA,event_type:'play',details:'Made a paper rainbow with friends',event_value:'Participation recorded',occurred_at:now.toISOString(),created_by:'staff-a'}],
 bp_pickup_contacts:[
  {id:I.collector,school_id:I.school,student_id:I.childA,full_name:'Example Grandma',relationship:'Grandparent',phone:'000',status:'approved',created_by:'family-a',created_at:now.toISOString()},
  {id:I.collectorB,school_id:I.school,student_id:I.childB,full_name:'Example Guardian B',relationship:'Guardian',phone:'111',status:'approved',created_by:'family-b',created_at:now.toISOString()}
 ],
 bp_care_relay_mornings:[{
  id:crypto.randomUUID(),school_id:I.school,student_id:I.childA,parent_user_id:'family-a',relay_day:day,sleep_status:'less',morning_mood:'tired',
  note:'Needed extra comfort in the morning',needs_attention:true,pickup_note:'',created_at:now.toISOString(),acknowledged_at:null
 }],
 bp_pickup_events:[],bp_care_relay_pickups:[],bp_care_relay_evenings:[],
 bp_child_media:[],bp_milestones:[],bp_activities:[],bp_notifications:[],bp_school_settings:[],bp_support_tickets:[],bp_access_requests:[],
 bp_school_plan_requests:[],bp_parent_plan_requests:[],bp_school_subscriptions:[],bp_parent_subscriptions:[],bp_pricing_plans:[],bp_payment_ledger:[],bp_school_commission_ledger:[]
};
let role='school_admin',uid='admin-a';const calls=[];

function visible(name,row){
 const ownChild=id=>tables.bp_parent_links.some(x=>x.student_id===id&&x.parent_user_id===uid);
 const teachChild=id=>tables.bp_students.some(x=>x.id===id&&x.class_id===I.roomA);
 if(role==='owner'||role==='school_admin')return true;
 if(name==='bp_students')return role==='parent'?ownChild(row.id):teachChild(row.id);
 if(name==='bp_parent_links')return role==='parent'&&row.parent_user_id===uid;
 if(name==='bp_teacher_classes')return role==='teacher'&&row.teacher_user_id===uid;
 if(name==='bp_profiles')return true;
 if(['bp_pickup_contacts','bp_pickup_events','bp_care_relay_pickups','bp_care_relay_evenings','bp_attendance','bp_care_logs','bp_child_media','bp_milestones','bp_care_relay_mornings','bp_activities'].includes(name)){
  if(role==='parent')return name==='bp_care_relay_mornings'?row.parent_user_id===uid&&ownChild(row.student_id):ownChild(row.student_id);
  if(role==='teacher')return teachChild(row.student_id);
 }
 return true;
}
const fresh=()=>new Date().toISOString();
const db={
 from(name){
  let filters=[],orderBy=null,descending=false,limit=1e4,patch=null,mut='select';
  const api={
   select(){return api},eq(k,v){filters.push([k,v]);return api},in(k,items){filters.push([k,items]);return api},order(k,opts={}){orderBy=k;descending=opts.ascending===false;return api},
   limit(k){limit=k;return api},update(data){mut='update';patch=data;return api},
   insert(data){const list=Array.isArray(data)?data:[data];if(name==='bp_pickup_events'&&list.some(x=>x.event_type==='check_out'))return Promise.resolve({error:{message:'Direct checkout insert blocked'}});const rows=list.map(x=>({id:crypto.randomUUID(),created_at:fresh(),occurred_at:fresh(),...x}));(tables[name]||(tables[name]=[])).push(...rows);calls.push({type:'insert',name,data:list});return Promise.resolve({data:rows})},
   upsert(data){return Promise.resolve({data:[data]})},
   then(resolve,reject){let rows=(tables[name]||[]).filter(r=>filters.every(([k,v])=>Array.isArray(v)?v.includes(r[k]):r[k]===v)&&visible(name,r));
    if(orderBy)rows=rows.slice().sort((a,b)=>descending?String(b[orderBy]??'').localeCompare(String(a[orderBy]??'')):String(a[orderBy]??'').localeCompare(String(b[orderBy]??'')));
    rows=rows.slice(0,limit);
    if(mut==='update'){rows.forEach(r=>Object.assign(r,patch));calls.push({type:'update',name,patch})}
    return Promise.resolve({data:rows}).then(resolve,reject)
   }
  };return api;
 },
 rpc(name,args={}){
  calls.push({type:'rpc',name,args,user:uid,role});
  const ok=data=>Promise.resolve({data}),fail=message=>Promise.resolve({error:{message}});
  const isStaff=role==='teacher'||role==='school_admin';
  const assigned=id=>role==='school_admin'||(role==='teacher'&&tables.bp_students.some(s=>s.id===id&&s.class_id===I.roomA));
  if(name==='bp_school_request_queue'||name==='bp_my_school_requests'||name==='bp_school_directory')return ok([]);
  if(name==='bp_relay_record_pickup'){
   if(!isStaff||!assigned(args.p_child))return fail('Assigned staff required');
   if(!args.p_identity_checked)return fail('Physical identity check required');
   if(!tables.bp_pickup_contacts.some(c=>c.id===args.p_contact&&c.student_id===args.p_child&&c.status==='approved'))return fail('Unapproved contact');
   if(tables.bp_pickup_events.some(x=>x.student_id===args.p_child&&x.event_type==='check_out'))return fail('Checkout already recorded');
   const eventId=crypto.randomUUID(),confId=crypto.randomUUID();
   tables.bp_pickup_events.push({id:eventId,school_id:I.school,student_id:args.p_child,event_type:'check_out',contact_id:args.p_contact,identity_verified:true,notes:args.p_note||'',recorded_by:uid,occurred_at:fresh()});
   tables.bp_care_relay_pickups.push({id:confId,school_id:I.school,student_id:args.p_child,pickup_event_id:eventId,contact_id:args.p_contact,confirmed_by:uid,confirmed_at:fresh()});
   return ok({ok:true,pickup_event_id:eventId,confirmation_id:confId});
  }
  if(name==='bp_relay_ack_morning'){
   const m=tables.bp_care_relay_mornings.find(x=>x.id===args.p_id);
   if(!m||!isStaff||!assigned(m.student_id))return fail('Cannot acknowledge');
   m.acknowledged_at=fresh();m.acknowledged_by=uid;return ok({ok:true});
  }
  if(name==='bp_relay_verify_evenings'){
   if(!isStaff)return fail('Staff only');
   for(const id of args.p_children){if(!assigned(id))return fail('Not assigned');
    if(!tables.bp_attendance.some(a=>a.student_id===id&&a.attendance_date===day))return fail('Attendance missing');
    if(tables.bp_care_relay_mornings.some(m=>m.student_id===id&&m.needs_attention&&!m.acknowledged_at))return fail('Acknowledge family note first')}
   for(const id of args.p_children){
    const child=tables.bp_students.find(x=>x.id===id),care=tables.bp_care_logs.filter(x=>x.student_id===id);
    tables.bp_care_relay_evenings.push({id:crypto.randomUUID(),school_id:I.school,student_id:id,relay_day:day,verified_at:fresh(),revision:1,snapshot:{
     child_name:child.full_name,relay_day:day,attendance:'present',care:care.map(x=>({event_type:x.event_type,details:x.details,occurred_at:x.occurred_at})),media_count:0,milestones:[],
     pickup:tables.bp_pickup_events.some(x=>x.student_id===id&&x.event_type==='check_out')?{relay_confirmed:tables.bp_care_relay_pickups.some(x=>x.student_id===id)}:null
    }});
   }
   return ok({ok:true,verified:args.p_children.length});
  }
  if(name==='bp_guardian_confirm_media_consent'){
   if(role!=='parent'||!tables.bp_parent_links.some(x=>x.parent_user_id===uid&&x.student_id===args.p_student))return fail('Verified guardian required');
   const s=tables.bp_students.find(x=>x.id===args.p_student);
   s[args.p_kind+'_consent']=args.p_grant;return ok({ok:true});
  }
  if(name==='bp_relay_submit_morning'){
   if(role!=='parent'||!tables.bp_parent_links.some(x=>x.parent_user_id===uid&&x.student_id===args.p_child))return fail('Guardian required');
   if(tables.bp_care_relay_mornings.some(x=>x.student_id===args.p_child&&x.relay_day===args.p_day&&x.parent_user_id===uid))return fail('Already submitted');
   if(args.p_attention&&(args.p_note||'').trim().length<8)return fail('Add context');
   const id=crypto.randomUUID();tables.bp_care_relay_mornings.push({id,school_id:I.school,student_id:args.p_child,parent_user_id:uid,relay_day:args.p_day,note:args.p_note||'',needs_attention:args.p_attention,created_at:fresh()});return ok({ok:true,id});
  }
  return ok({ok:true});
 }
};
window.confirm=()=>true;
window.qa={I,tables,calls,day,async open(target='school_admin'){
 role=target;uid=target==='owner'?'owner-a':target==='teacher'?'staff-a':target==='parent'?'family-a':target==='parent_b'?'family-b':'admin-a';
 const displayRole=target==='parent_b'?'parent':target;role=displayRole;
 await launchWorkspace({db,user:{id:uid,name:profiles.find(x=>x.user_id===uid)?.full_name||'BrightPath Owner',email:profiles.find(x=>x.user_id===uid)?.email||'owner@example.invalid'},
  role:displayRole,context:{is_owner:displayRole==='owner',memberships:[{school_id:I.school,school_name:'Rainbow Steps Daycare',role:displayRole,active:true}]},
  root:'/brightpath-school-platform/',logout(){},photoData:async()=>null});
}};
await window.qa.open(new URLSearchParams(location.search).get('role')||'school_admin');
