import test from 'node:test';
import assert from 'node:assert/strict';
import {schoolDay,DEFAULT_SCHOOL_TIME_ZONE,getSchoolTimeZone,setSchoolTimeZone,isValidTimeZone,AFRICAN_COUNTRIES,AFRICAN_TIME_ZONES} from '../src/school-day.js';

test('BrightPath uses Africa/Nairobi as its school-day timezone',()=>{
 assert.equal(DEFAULT_SCHOOL_TIME_ZONE,'Africa/Nairobi');
});
test('Nairobi school-day key is ISO yyyy-mm-dd around UTC midnight',()=>{
 const cases=[
  ['2026-11-09T20:59:59Z','2026-11-09'],
  ['2026-11-09T21:00:00Z','2026-11-10'],
  ['2026-11-10T00:30:00Z','2026-11-10'],
  ['2026-11-10T20:59:59Z','2026-11-10'],
  ['2026-11-10T21:00:00Z','2026-11-11']
 ];
 for(const [instant,expected] of cases)assert.equal(schoolDay(instant),expected,instant);
});
test('Date inputs and strings produce the same Nairobi day',()=>{
 assert.equal(schoolDay(new Date('2026-11-10T00:01:00Z')),schoolDay('2026-11-10T00:01:00Z'));
});
test('Reject invalid date keys rather than silently attributing care to another day',()=>{
 assert.throws(()=>schoolDay('not-a-date'),RangeError);
});

test('Africa-first country selection includes 54 valid African countries with selectable local zones',()=>{
 assert.equal(AFRICAN_COUNTRIES.length,54);
 assert(AFRICAN_COUNTRIES.every(c=>isValidTimeZone(c[2])));
 assert(AFRICAN_TIME_ZONES.includes('Africa/Lagos'));
 assert(AFRICAN_TIME_ZONES.includes('Africa/Johannesburg'));
 assert(AFRICAN_TIME_ZONES.includes('Atlantic/Cape_Verde'));
});
test('One UTC instant yields the correct local date for different African schools',()=>{
 const t='2026-11-09T22:30:00.000Z';
 assert.equal(schoolDay(t,'Africa/Nairobi'),'2026-11-10');
 assert.equal(schoolDay(t,'Africa/Lagos'),'2026-11-09');
 assert.equal(schoolDay(t,'Africa/Accra'),'2026-11-09');
 assert.equal(schoolDay(t,'Africa/Johannesburg'),'2026-11-10');
 assert.equal(schoolDay(t,'Atlantic/Cape_Verde'),'2026-11-09');
});
test('School timezone setting survives repeated calls and can safely reset to Nairobi',()=>{
 try{
  setSchoolTimeZone('Africa/Lagos');assert.equal(getSchoolTimeZone(),'Africa/Lagos');
  assert.equal(schoolDay('2026-11-09T22:30:00Z'),'2026-11-09');
  setSchoolTimeZone('invalid/time-zone');assert.equal(getSchoolTimeZone(),'Africa/Nairobi');
 }finally{setSchoolTimeZone(null)}
});

test('school-local calendar entries create the same UTC timestamp from different African zones',async()=>{
 const {schoolLocalToUtc,schoolDateTimeInput}=await import('../src/school-clock-input.js');
 const cases=[
  ['Africa/Lagos','2026-11-09T23:30'],
  ['Africa/Nairobi','2026-11-10T01:30'],
  ['Africa/Johannesburg','2026-11-10T00:30'],
  ['Africa/Accra','2026-11-09T22:30']
 ];
 for(const [zone,wall] of cases){
  const date=schoolLocalToUtc(wall,zone);
  assert.equal(date.toISOString(),'2026-11-09T22:30:00.000Z');
  assert.equal(schoolDateTimeInput(date,zone),wall);
 }
});
test('calendar conversion rejects malformed and skipped wall times',async()=>{
 const {schoolLocalToUtc}=await import('../src/school-clock-input.js');
 assert.throws(()=>schoolLocalToUtc('2026-02-30T10:00','Africa/Nairobi'),RangeError);
 assert.throws(()=>schoolLocalToUtc('2026-11-09','Africa/Lagos'),RangeError);
 assert.throws(()=>schoolLocalToUtc('2026-11-10T10:00','Mars/Olympus'),RangeError);
});
test('calendar conversion uses school time even when the browser or process runs in America/Los_Angeles',async()=>{
 const {schoolLocalToUtc,schoolDateTimeInput}=await import('../src/school-clock-input.js');
 const at='2026-07-01T12:45';
 const date=schoolLocalToUtc(at,'Africa/Cairo');
 assert.equal(schoolDateTimeInput(date,'Africa/Cairo'),at);
 assert.equal(date.toISOString(),'2026-07-01T09:45:00.000Z');
});
