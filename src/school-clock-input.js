import {getSchoolTimeZone,isValidTimeZone} from './school-day.js';

/**
 * Convert a school-wall-clock datetime-local value to an unambiguous UTC
 * timestamp. No browser timezone is used. A DST overlap uses the first
 * occurrence; a skipped local time is rejected.
 */
const localFields=(date,timeZone)=>{
 const fmt=new Intl.DateTimeFormat('en-GB',{
  timeZone,year:'numeric',month:'2-digit',day:'2-digit',
  hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'
 });
 return Object.fromEntries(fmt.formatToParts(date)
  .filter(x=>['year','month','day','hour','minute','second'].includes(x.type))
  .map(x=>[x.type,x.value]));
};
export function schoolDateTimeInput(value=new Date(),timeZone=getSchoolTimeZone()){
 if(!isValidTimeZone(timeZone))throw new RangeError('Invalid school timezone');
 const date=value instanceof Date?value:new Date(value);
 if(Number.isNaN(date.getTime()))throw new RangeError('Invalid date');
 const f=localFields(date,timeZone);
 return f.year+'-'+f.month+'-'+f.day+'T'+f.hour+':'+f.minute;
}
export function schoolLocalToUtc(input,timeZone=getSchoolTimeZone()) {
 if(!isValidTimeZone(timeZone))throw new RangeError('Invalid school timezone');
 const match=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(input));
 if(!match)throw new RangeError('Choose a valid school-local date and time');
 const [year,month,day,hour,minute]=match.slice(1).map(Number);
 const naive=Date.UTC(year,month-1,day,hour,minute,0);
 if(year<1900||month<1||month>12||day<1||day>31||hour>23||minute>59||
    new Date(naive).toISOString().slice(0,16)!==match[1]+'-'+match[2]+'-'+match[3]+'T'+match[4]+':'+match[5])
   throw new RangeError('Invalid school-local calendar date');
 const offsets=new Set();
 for(const t of [naive-86400000,naive-3600000,naive,naive+3600000,naive+86400000]){
  const f=localFields(new Date(t),timeZone);
  offsets.add(Date.UTC(Number(f.year),Number(f.month)-1,Number(f.day),Number(f.hour),Number(f.minute),Number(f.second))-Math.floor(t/1000)*1000);
 }
 const matches=[...offsets].map(offset=>new Date(naive-offset))
  .filter(date=>schoolDateTimeInput(date,timeZone)===input).sort((a,b)=>a-b);
 if(!matches.length)throw new RangeError('This local time does not exist because the school clock changed. Choose another time.');
 return matches[0];
}
