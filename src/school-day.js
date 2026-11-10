/** One Nairobi-local school-day key for attendance, care and parent notices.
 * Use formatToParts instead of a locale-dependent en-CA date string.
 * This deliberately follows the same Nairobi timezone as Care Relay RPCs.
 */
export const SCHOOL_TIME_ZONE='Africa/Nairobi';
const dateParts=new Intl.DateTimeFormat('en-GB',{
 timeZone:SCHOOL_TIME_ZONE,year:'numeric',month:'2-digit',day:'2-digit'
});
export function schoolDay(value=new Date()){
 const date=value instanceof Date?value:new Date(value);
 if(Number.isNaN(date.getTime()))throw new RangeError('Invalid school date');
 const parts=Object.fromEntries(dateParts.formatToParts(date)
   .filter(x=>x.type==='year'||x.type==='month'||x.type==='day')
   .map(x=>[x.type,x.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
