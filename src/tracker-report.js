export function validateTrackerReport(payload,device,now=Date.now()){
 if(payload?.deviceId!==device.id)throw Error('The report must match this device ID.');
 const {reportedAt,batteryPercent,latitude,longitude}=payload;
 const timestamp=Date.parse(reportedAt);
 if(typeof reportedAt!=='string'||!/(Z|[+-][0-9]{2}:[0-9]{2})$/.test(reportedAt)||!Number.isFinite(timestamp)||timestamp>now){
  throw Error('Use a report timestamp with a time zone that is at or before the current time.');
 }
 if(device.report&&timestamp<=device.report.reportedAt)throw Error('The report must be newer than the last accepted report.');
 if(!Number.isInteger(batteryPercent)||batteryPercent<0||batteryPercent>100)throw Error('Battery must be a whole number from 0 to 100.');
 const place=typeof payload.place==='string'?payload.place.trim():'';
 const hasCoordinates=latitude!==undefined||longitude!==undefined;
 if(hasCoordinates&&(!Number.isFinite(latitude)||Math.abs(latitude)>90||!Number.isFinite(longitude)||Math.abs(longitude)>180)){
  throw Error('Enter a valid latitude and longitude together.');
 }
 if(place.length>120)throw Error('Use a location label of up to 120 characters.');
 if(!hasCoordinates&&!place)throw Error('Include a location label or both coordinates.');
 const report={place:place||latitude.toFixed(5)+', '+longitude.toFixed(5),reportedAt:timestamp,battery:batteryPercent};
 if(hasCoordinates)Object.assign(report,{latitude,longitude});
 return report;
}
