/**
 * One school-specific local clock for all BrightPath roles and modules.
 * School settings, not the viewer's browser timezone, decide the school day.
 * The currently active school in this browser tab controls the clock.
 */
export const DEFAULT_SCHOOL_TIME_ZONE = 'Africa/Nairobi';
let activeSchoolTimeZone = DEFAULT_SCHOOL_TIME_ZONE;
const formatters = new Map();

export function isValidTimeZone(timeZone) {
 if(typeof timeZone!=='string'||!timeZone||timeZone.length>100)return false;
 try{new Intl.DateTimeFormat('en-GB',{timeZone});return true;}catch{return false;}
}
export function setSchoolTimeZone(timeZone) {
 activeSchoolTimeZone=isValidTimeZone(timeZone)?timeZone:DEFAULT_SCHOOL_TIME_ZONE;
 return activeSchoolTimeZone;
}
export function getSchoolTimeZone() { return activeSchoolTimeZone; }
export function schoolDay(value=new Date(),timeZone=activeSchoolTimeZone) {
 const date=value instanceof Date?value:new Date(value);
 if(Number.isNaN(date.getTime()))throw new RangeError('Invalid school date');
 if(!isValidTimeZone(timeZone))throw new RangeError('Invalid school timezone');
 let dtf=formatters.get(timeZone);
 if(!dtf){
  dtf=new Intl.DateTimeFormat('en-GB',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'});
  formatters.set(timeZone,dtf);
 }
 const parts=Object.fromEntries(dtf.formatToParts(date)
   .filter(x=>x.type==='year'||x.type==='month'||x.type==='day')
   .map(x=>[x.type,x.value]));
 return parts.year+'-'+parts.month+'-'+parts.day;
}
export function schoolTime(value,opts={},timeZone=activeSchoolTimeZone) {
 if(!isValidTimeZone(timeZone))throw new RangeError('Invalid school timezone');
 return new Date(value).toLocaleTimeString('en-KE',{hour:'2-digit',minute:'2-digit',...opts,timeZone});
}
export function schoolDateTime(value,opts={},timeZone=activeSchoolTimeZone) {
 if(!isValidTimeZone(timeZone))throw new RangeError('Invalid school timezone');
 return new Date(value).toLocaleString('en-KE',{dateStyle:'medium',timeStyle:'short',...opts,timeZone});
}

/* Africa-first defaults; each school's city and zone can vary inside a country.
 * A recognized IANA zone may also be selected independently when needed.
 */
export const AFRICAN_COUNTRIES = [
 ['DZ','Algeria','Africa/Algiers'],['AO','Angola','Africa/Luanda'],['BJ','Benin','Africa/Porto-Novo'],
 ['BW','Botswana','Africa/Gaborone'],['BF','Burkina Faso','Africa/Ouagadougou'],['BI','Burundi','Africa/Bujumbura'],
 ['CV','Cabo Verde','Atlantic/Cape_Verde'],['CM','Cameroon','Africa/Douala'],['CF','Central African Republic','Africa/Bangui'],
 ['TD','Chad','Africa/Ndjamena'],['KM','Comoros','Indian/Comoro'],['CG','Congo (Republic)','Africa/Brazzaville'],
 ['CD','Congo (DRC)','Africa/Kinshasa'],['CI','Côte d’Ivoire','Africa/Abidjan'],['DJ','Djibouti','Africa/Djibouti'],
 ['EG','Egypt','Africa/Cairo'],['GQ','Equatorial Guinea','Africa/Malabo'],['ER','Eritrea','Africa/Asmara'],
 ['SZ','Eswatini','Africa/Mbabane'],['ET','Ethiopia','Africa/Addis_Ababa'],['GA','Gabon','Africa/Libreville'],
 ['GM','Gambia','Africa/Banjul'],['GH','Ghana','Africa/Accra'],['GN','Guinea','Africa/Conakry'],
 ['GW','Guinea-Bissau','Africa/Bissau'],['KE','Kenya','Africa/Nairobi'],['LS','Lesotho','Africa/Maseru'],
 ['LR','Liberia','Africa/Monrovia'],['LY','Libya','Africa/Tripoli'],['MG','Madagascar','Indian/Antananarivo'],
 ['MW','Malawi','Africa/Blantyre'],['ML','Mali','Africa/Bamako'],['MR','Mauritania','Africa/Nouakchott'],
 ['MU','Mauritius','Indian/Mauritius'],['MA','Morocco','Africa/Casablanca'],['MZ','Mozambique','Africa/Maputo'],
 ['NA','Namibia','Africa/Windhoek'],['NE','Niger','Africa/Lagos'],['NG','Nigeria','Africa/Lagos'],
 ['RW','Rwanda','Africa/Kigali'],['ST','São Tomé and Príncipe','Africa/Sao_Tome'],['SN','Senegal','Africa/Dakar'],
 ['SC','Seychelles','Indian/Mahe'],['SL','Sierra Leone','Africa/Freetown'],['SO','Somalia','Africa/Mogadishu'],
 ['ZA','South Africa','Africa/Johannesburg'],['SS','South Sudan','Africa/Juba'],['SD','Sudan','Africa/Khartoum'],
 ['TZ','Tanzania','Africa/Dar_es_Salaam'],['TG','Togo','Africa/Lome'],['TN','Tunisia','Africa/Tunis'],
 ['UG','Uganda','Africa/Kampala'],['ZM','Zambia','Africa/Lusaka'],['ZW','Zimbabwe','Africa/Harare']
];
const extras=[
 'Africa/Lubumbashi','Africa/Ceuta','Africa/El_Aaiun',
 'Indian/Reunion','Indian/Mayotte','Atlantic/Canary'
];
export const AFRICAN_TIME_ZONES = [...new Set([
 ...AFRICAN_COUNTRIES.map(x=>x[2]),
 ...(typeof Intl.supportedValuesOf==='function'
    ? Intl.supportedValuesOf('timeZone').filter(z=>z.startsWith('Africa/')||z.startsWith('Indian/')||z.startsWith('Atlantic/'))
    : []),
 ...extras
])].filter(isValidTimeZone).sort((a,b)=>a.localeCompare(b));
