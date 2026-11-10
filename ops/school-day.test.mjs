import test from 'node:test';
import assert from 'node:assert/strict';
import {schoolDay,SCHOOL_TIME_ZONE} from '../src/school-day.js';

test('BrightPath uses Africa/Nairobi as its school-day timezone',()=>{
 assert.equal(SCHOOL_TIME_ZONE,'Africa/Nairobi');
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
