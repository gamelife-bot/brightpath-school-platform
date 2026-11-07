import {createHash,createHmac,randomUUID} from 'node:crypto';

/** Branch-scoped private media gateway. Credentials only exist inside Neon Functions.
 * All child access decisions are delegated to the Neon Data API with the caller's JWT.
 */
const API='https://ep-falling-frog-bao493od.apirest.c-8.eu-central-1.aws.neon.tech/neondb/rest/v1';
const BUCKET='brightpath-child-media';
const ORIGIN='https://gamelife-bot.github.io';
const MAX_PHOTO=8*1024*1024;
const MAX_VIDEO=25*1024*1024;
const ALLOWED=new Map([['image/jpeg','jpg'],['image/png','png'],['image/webp','webp'],['video/mp4','mp4'],['video/webm','webm'],['video/quicktime','mov']]);
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i;
const hash=v=>createHash('sha256').update(v).digest('hex');
const hmac=(k,v)=>createHmac('sha256',k).update(v).digest();
function cors(extra={}){
 return {'access-control-allow-origin':ORIGIN,'access-control-allow-methods':'POST,OPTIONS',
  'access-control-allow-headers':'authorization,content-type,x-bp-school,x-bp-student,x-bp-kind',
  'access-control-max-age':'600','vary':'Origin','cache-control':'no-store',...extra};
}
function json(value,status=200){return new Response(JSON.stringify(value),{status,headers:cors({'content-type':'application/json'})})}
function fail(status,message){return json({error:message},status)}
function authHeader(request){
 const value=request.headers.get('authorization')||'';
 if(!/^Bearer [A-Za-z0-9._-]{40,}$/.test(value))return null;
 return value;
}
async function validateWithDataApi(path,token,body=null){
 const response=await fetch(API+path,{method:body===null?'GET':'POST',headers:{
  authorization:token,accept:'application/json',...(body===null?{}:{'content-type':'application/json'})
 },...(body===null?{}:{body:JSON.stringify(body)}),signal:AbortSignal.timeout(15000)});
 const raw=await response.text();
 if(!response.ok)throw new Error(response.status===401?'Session expired':'Access verification failed');
 try{return JSON.parse(raw)}catch{return raw}
}
function s3Env(){
 const endpoint=process.env.AWS_ENDPOINT_URL_S3;
 const key=process.env.AWS_ACCESS_KEY_ID;
 const secret=process.env.AWS_SECRET_ACCESS_KEY;
 const region=process.env.AWS_REGION||'eu-central-1';
 if(!endpoint||!key||!secret)throw new Error('Storage service is not configured');
 return {endpoint:new URL(endpoint),key,secret,region};
}
function signS3(method,objectKey,body,contentType){
 const {endpoint,key,secret,region}=s3Env();
 const now=new Date(),stamp=now.toISOString().replace(/[:-]|\.\d{3}/g,'');
 const ymd=stamp.slice(0,8),scope=ymd+'/'+region+'/s3/aws4_request';
 const path='/'+BUCKET+'/'+objectKey.split('/').map(encodeURIComponent).join('/');
 const payloadHash=hash(body||Buffer.alloc(0));
 const headers={'host':endpoint.host,'x-amz-content-sha256':payloadHash,'x-amz-date':stamp};
 if(contentType)headers['content-type']=contentType;
 const names=Object.keys(headers).sort(),signed=names.join(';');
 const canonicalHeaders=names.map(name=>name+':'+headers[name].trim()+'\n').join('');
 const canonical=[method,path,'',canonicalHeaders,signed,payloadHash].join('\n');
 const toSign=['AWS4-HMAC-SHA256',stamp,scope,hash(canonical)].join('\n');
 const signingKey=hmac(hmac(hmac(hmac('AWS4'+secret,ymd),region),'s3'),'aws4_request');
 const signature=createHmac('sha256',signingKey).update(toSign).digest('hex');
 return {url:endpoint.origin+path,headers:{
  ...(contentType?{'content-type':contentType}:{}),
  'x-amz-date':stamp,
  'x-amz-content-sha256':payloadHash,
  'authorization':'AWS4-HMAC-SHA256 Credential='+key+'/'+scope+', SignedHeaders='+signed+', Signature='+signature
 }};
}
async function upload(request,token){
 const school=request.headers.get('x-bp-school')||'';
 const student=request.headers.get('x-bp-student')||'';
 const kind=request.headers.get('x-bp-kind')||'';
 const mime=(request.headers.get('content-type')||'').split(';')[0].trim().toLowerCase();
 if(!uuid.test(school)||!uuid.test(student)||!['photo','video'].includes(kind))return fail(400,'Select a valid child and media type');
 if(!ALLOWED.has(mime)||kind==='photo'&&!mime.startsWith('image/')||kind==='video'&&!mime.startsWith('video/'))return fail(400,'Unsupported file format');
 const raw=await request.arrayBuffer();
 const bytes=raw.byteLength,max=kind==='photo'?MAX_PHOTO:MAX_VIDEO;
 if(!bytes||bytes>max)return fail(413,'File exceeds the allowed size');
 const permission=await validateWithDataApi('/rpc/bp_media_upload_allowed',token,{p_school:school,p_student:student,p_kind:kind});
 if(permission!==true)return fail(403,'This child is not approved for media sharing');
 const objectKey='schools/'+school+'/children/'+student+'/'+randomUUID()+'.'+ALLOWED.get(mime);
 const signed=signS3('PUT',objectKey,Buffer.from(raw),mime);
 const put=await fetch(signed.url,{method:'PUT',headers:signed.headers,body:Buffer.from(raw),signal:AbortSignal.timeout(60000)});
 if(!put.ok)return fail(502,'The media storage service could not accept the file');
 return json({key:objectKey,bytes,mime,kind});
}
async function readMedia(request,token){
 const {id}=await request.json();
 if(!uuid.test(id||''))return fail(400,'Invalid media ID');
 // Neon validates bearer tokens and applies student-specific row-level access.
 const rows=await validateWithDataApi('/bp_child_media?id=eq.'+encodeURIComponent(id)+'&select=object_key,mime_type,bytes',token);
 if(!Array.isArray(rows)||rows.length!==1)return fail(403,'Media access denied');
 const item=rows[0];
 const signed=signS3('GET',item.object_key,null,null);
 const response=await fetch(signed.url,{method:'GET',headers:signed.headers,signal:AbortSignal.timeout(60000)});
 if(!response.ok)return fail(404,'Media unavailable');
 return new Response(response.body,{status:200,headers:cors({'content-type':item.mime_type,'content-length':String(item.bytes),
  'x-content-type-options':'nosniff','content-security-policy':"default-src 'none'; sandbox"})});
}
export default {
 async fetch(request){
  if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors()});
  if(request.method!=='POST')return fail(405,'Method not allowed');
  const origin=request.headers.get('origin');
  if(origin&&origin!==ORIGIN)return fail(403,'Invalid website origin');
  const token=authHeader(request);
  if(!token)return fail(401,'Sign in to continue');
  try{
   const route=new URL(request.url).pathname.replace(/\/+$/,'');
   if(route==='/upload')return await upload(request,token);
   if(route==='/read')return await readMedia(request,token);
   return fail(404,'Endpoint not found');
  }catch(err){
   const msg=String(err?.message||'Unable to complete request');
   return fail(/access|Session|permission|authorization|not approved/i.test(msg)?403:500,
    /access|Session|permission|authorization|not approved/i.test(msg)?msg:'Media service unavailable');
  }
 }
};
