import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';

const base='http://127.0.0.1:4407/brightpath-school-platform/';
const browser=await chromium.launch({headless:true,executablePath:process.env.BP_CHROME_PATH||'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',args:['--no-sandbox']});
let passed=0;const failures=[];
async function inTab(page,id){
 const link=page.locator('[data-mw-page="'+id+'"]');await link.click();
 await page.waitForTimeout(80);
 await page.locator('#panel-content .mw-page-head').waitFor({timeout:14000});
 const text=await page.locator('#panel-content').innerText();
 assert(!text.includes('Couldn’t load this section'),id+': '+text.slice(-300));
}
async function onRole(page,role){
 await page.evaluate(role=>window.qa.open(role),role);
 await page.locator('#panel-content .mw-page-head').waitFor();
}
try{
 const page=await browser.newPage({viewport:{width:1300,height:900},timezoneId:'America/Los_Angeles'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base+'qa-activity.html?role=teacher',{waitUntil:'networkidle'});
 await inTab(page,'pickup');
 const childOpts=await page.locator('#bp-event-child option').allTextContents();
 assert(childOpts.includes('Example Child A')&&childOpts.includes('Example Child B'));
 assert(!childOpts.includes('Other Classroom Child'));passed++;console.log('PASS teacher pickup list restricted to assigned class');
 await page.locator('#bp-event-child').selectOption(await page.evaluate(()=>window.qa.I.childA));
 await page.locator('#bp-event-action').selectOption('check_out');
 await page.locator('#bp-event-contact').selectOption(await page.evaluate(()=>window.qa.I.collector));
 await page.locator('#bp-pickup-verified').check();
 assert.equal(await page.locator('#bp-event-submit').isEnabled(),true);
 await page.locator('#bp-event-submit').click();
 await page.waitForFunction(()=>window.qa.tables.bp_care_relay_pickups.length===1);
 const result=await page.evaluate(()=>({events:window.qa.tables.bp_pickup_events,confirmations:window.qa.tables.bp_care_relay_pickups,calls:window.qa.calls}));
 assert.equal(result.events.length,1);assert.equal(result.confirmations.length,1);
 assert(result.calls.some(x=>x.name==='bp_relay_record_pickup'&&x.type==='rpc'));
 assert(!result.calls.some(x=>x.type==='insert'&&x.name==='bp_pickup_events'&&x.data.some(y=>y.event_type==='check_out')));
 await page.getByText('Care Relay confirmed').waitFor();
 passed++;console.log('PASS existing pickup desk records atomic Care Relay verification');

 await onRole(page,'parent');await inTab(page,'pickup');
 assert((await page.locator('#panel-content').innerText()).includes('Care Relay confirmed'));
 await inTab(page,'relay');
 assert((await page.locator('#panel-content').innerText()).includes('Verified school handover'));
 const p1names=await page.locator('#cr-parent-child option').allTextContents();
 assert.deepEqual(p1names,['Example Child A']);
 passed++;console.log('PASS linked parent sees their own confirmed pickup');

 await onRole(page,'parent_b');await inTab(page,'pickup');
 const bText=await page.locator('#panel-content').innerText();
 assert(!bText.includes('Example Child A')&&!bText.includes('Example Grandma')&&!bText.includes('Care Relay confirmed'));
 await inTab(page,'relay');
 const p2names=await page.locator('#cr-parent-child option').allTextContents();
 assert(p2names.includes('Example Child B')&&p2names.includes('Other Classroom Child'));
 assert(!p2names.includes('Example Child A'));
 assert(!(await page.locator('#panel-content').innerText()).includes('Made a paper rainbow'));
 passed++;console.log('PASS unrelated guardian cannot see another family in relay/pickup');

 await onRole(page,'teacher');await inTab(page,'relay');
 const firstId=await page.evaluate(()=>window.qa.I.childA),otherId=await page.evaluate(()=>window.qa.I.childC);
 assert.equal(await page.locator('[data-cr-verify-child="'+firstId+'"]').isDisabled(),true);
 assert.equal(await page.locator('[data-cr-verify-child="'+otherId+'"]').count(),0);
 assert((await page.locator('#cr-evening-review').innerText()).includes('Care follow-up first'));
 assert.equal(await page.locator('[data-cr-ack]').count(),1);
 passed++;console.log('PASS unacknowledged priority handover blocks evening verification');
 await page.locator('[data-cr-ack]').click();
 await page.waitForFunction(()=>window.qa.tables.bp_care_relay_mornings[0].acknowledged_at!==null);
 await page.locator('[data-cr-verify-child="'+firstId+'"]').waitFor();
 assert.equal(await page.locator('[data-cr-verify-child="'+firstId+'"]').isEnabled(),true);
 passed++;console.log('PASS teacher acknowledges priority and unlocks verified review');
 const bId=await page.evaluate(()=>window.qa.I.childB);
 await page.locator('[data-cr-verify-child="'+bId+'"]').uncheck();
 await page.locator('#cr-summary-attested').check();
 await page.locator('#cr-verify-evenings').click();
 await page.waitForFunction(()=>window.qa.tables.bp_care_relay_evenings.some(x=>x.student_id===window.qa.I.childA));
 assert.equal(await page.evaluate(()=>window.qa.tables.bp_care_relay_evenings.length),1);
 passed++;console.log('PASS batch review publishes one factual summary after attention resolved');
 await onRole(page,'parent');await inTab(page,'relay');
 const factText=await page.locator('.cr-summary-facts').innerText();
 assert(factText.includes('Made a paper rainbow with friends'));
 assert(factText.includes('School pickup contact and identity check recorded'));
 passed++;console.log('PASS verified summary uses recorded facts, not invented events');
 await onRole(page,'parent_b');await inTab(page,'relay');
 assert(!(await page.locator('#panel-content').innerText()).includes('Made a paper rainbow'));
 passed++;console.log('PASS published summary still scoped to verified guardian');

 await onRole(page,'school_admin');await inTab(page,'students');
 const adminText=await page.locator('#panel-content').innerText();
 assert(adminText.includes('Guardian-controlled media permissions'));
 assert(adminText.includes('Managed by verified guardians'));
 assert.equal(await page.locator('[data-photo-student]').count(),0);
 assert.equal(await page.locator('[data-video-student]').count(),0);
 await page.locator('#mw-consent-parents').click();
 assert((await page.locator('#panel-content').innerText()).includes('Parent approvals'));
 passed++;console.log('PASS enrollment cannot grant media consent on guardian’s behalf');

 await onRole(page,'parent');await inTab(page,'moments');
 assert((await page.locator('#panel-content').innerText()).includes('Photos: Off'));
 await page.locator('[data-consent-kind="photo"]').click();
 await page.waitForFunction(()=>window.qa.tables.bp_students.find(x=>x.id===window.qa.I.childA).photo_consent===true);
 const mediaCall=await page.evaluate(()=>window.qa.calls.filter(x=>x.name==='bp_guardian_confirm_media_consent'));
 assert.equal(mediaCall.length,1);assert(mediaCall[0].role==='parent');
 await onRole(page,'school_admin');await inTab(page,'students');
 assert((await page.locator('#mw-kid-table').innerText()).includes('approved'));
 assert.equal(await page.locator('[data-photo-student]').count(),0);
 passed++;console.log('PASS verified guardian owns media toggle; school sees read-only status');

 await onRole(page,'teacher');await inTab(page,'pickup');
 await page.locator('#bp-event-child').selectOption(firstId);
 await page.locator('#bp-event-action').selectOption('check_out');
 assert.equal(await page.locator('#bp-event-submit').isDisabled(),true);
 assert((await page.locator('#bp-pickup-helper').innerText()).includes('already recorded'));
 passed++;console.log('PASS duplicate physical checkout is blocked in UI');
 await page.locator('#bp-event-child').selectOption(bId);
 await page.locator('#bp-event-action').selectOption('check_in');
 await page.locator('#bp-event-submit').click();
 await page.waitForFunction(()=>window.qa.tables.bp_pickup_events.some(x=>x.student_id===window.qa.I.childB&&x.event_type==='check_in'));
 assert((await page.evaluate(()=>window.qa.calls)).some(x=>x.type==='insert'&&x.name==='bp_pickup_events'&&x.data.some(y=>y.event_type==='check_in')));
 passed++;console.log('PASS legacy morning check-in remains functional');

 const bannerError=await page.locator('#panel-content').innerText();assert(!bannerError.includes('Couldn’t load this section'));
 assert.deepEqual(errors,[]);
 console.log('PASS interactive synthetic flow',passed,'checks');
 await page.close();

 // School-by-school region: changing country and timezone changes every connected role's clock.
 const region=await browser.newPage({viewport:{width:1280,height:900},timezoneId:'America/Los_Angeles'}),regionErrors=[];
 region.on('pageerror',e=>regionErrors.push(e.message));
 await region.goto(base+'qa-activity.html?role=school_admin',{waitUntil:'networkidle'});
 await inTab(region,'settings');
 assert.equal(await region.locator('#mw-school-country option').count(),54);
 assert.equal(await region.locator('#mw-school-country').inputValue(),'KE');
 assert.equal(await region.locator('#mw-school-timezone').inputValue(),'Africa/Nairobi');
 await region.locator('#mw-school-country').selectOption('NG');
 assert.equal(await region.locator('#mw-school-timezone').inputValue(),'Africa/Lagos');
 assert((await region.locator('#mw-local-clock-preview').innerText()).includes('Africa/Lagos'));
 await region.locator('#mw-settings-submit').click();
 await region.waitForFunction(()=>window.qa.tables.bp_school_settings.find(x=>x.time_zone==='Africa/Lagos'));
 assert((await region.locator('#mw-region-clock').innerText()).includes('Africa/Lagos'));
 await inTab(region,'events');
 await region.locator('#bp-event-title').fill('Regional time integration event');
 await region.locator('#bp-event-start').fill('2026-11-09T23:30');
 await region.locator('#bp-event-end').fill('2026-11-10T00:30');
 await region.locator('#bp-event-save').click();
 await region.waitForFunction(()=>window.qa.tables.bp_school_events?.some(x=>x.title==='Regional time integration event'));
 assert.equal(await region.evaluate(()=>window.qa.tables.bp_school_events.find(x=>x.title==='Regional time integration event').starts_at),'2026-11-09T22:30:00.000Z');
 passed++;console.log('PASS Nigerian school calendar time converted to UTC regardless of laptop timezone');
 await inTab(region,'care');
 await region.locator('#bp-care-child').selectOption(await region.evaluate(()=>window.qa.I.childA));
 await region.locator('#bp-care-description').fill('Fictional local-time care note');
 await region.locator('#bp-care-when').fill('2026-11-09T23:30');
 await region.locator('#bp-care-save').click();
 await region.waitForFunction(()=>window.qa.tables.bp_care_logs.some(x=>x.details==='Fictional local-time care note'));
 assert.equal(await region.evaluate(()=>window.qa.tables.bp_care_logs.find(x=>x.details==='Fictional local-time care note').occurred_at),'2026-11-09T22:30:00.000Z');
 passed++;console.log('PASS Nigerian school care diary time converted independently of laptop timezone');
 await onRole(region,'parent');
 assert((await region.locator('#mw-region-clock').innerText()).includes('Africa/Lagos'));
 const dates=await region.evaluate(async()=>{
  const m=await import('./src/school-day.js');
  return {nigeria:m.schoolDay('2026-11-09T22:30:00Z'),kenya:m.schoolDay('2026-11-09T22:30:00Z','Africa/Nairobi')};
 });
 assert.deepEqual(dates,{nigeria:'2026-11-09',kenya:'2026-11-10'});
 await onRole(region,'school_admin');await inTab(region,'settings');
 await region.locator('#mw-school-country').selectOption('KE');
 await region.locator('#mw-settings-submit').click();
 await region.waitForFunction(()=>window.qa.tables.bp_school_settings.find(x=>x.time_zone==='Africa/Nairobi'));
 assert.deepEqual(regionErrors,[]);await region.close();
 passed+=7;console.log('PASS per-school timezone settings, country mapping and cross-role visibility');

 const roles=['owner','school_admin','teacher','parent'];
 for(const role of roles){
  for(const width of [390,1280]){
   const p=await browser.newPage({viewport:{width,height:900},isMobile:width===390,hasTouch:width===390,timezoneId:'Africa/Nairobi'}),js=[];
   p.on('pageerror',e=>js.push(e.message));
   await p.goto(base+'qa-activity.html?role='+role,{waitUntil:'networkidle'});
   const tabNames=await p.locator('[data-mw-page]').evaluateAll(items=>items.map(x=>x.dataset.mwPage));
   // Discoverability: the mobile menu and desktop sidebar must find every feature quickly.
   const findTab=role==='owner'?'revenue':'pickup',findTerm=role==='owner'?'revenue':'pickup';
   if(width===390){
    await p.locator('#bp-mobile-more').click();
    const input=p.locator('#bp-mobile-section-search');
    assert(await input.evaluate(el=>document.activeElement===el),'Mobile menu should focus its section search');
    await input.fill('not a real section anywhere');
    assert((await p.locator('#bp-mobile-find-count').innerText()).includes('No matching sections'));
    await input.fill(findTerm);
    assert(await p.locator('[data-bp-mobile-menu="'+findTab+'"]').isVisible());
    await p.locator('[data-bp-mobile-menu="'+findTab+'"]').click();
    assert.equal(await p.locator('#bp-mobile-more').getAttribute('aria-expanded'),'false');
    assert.equal(await input.inputValue(),'');
   }else{
    const input=p.locator('#bp-section-search');
    await input.fill('not a real section anywhere');
    assert((await p.locator('#bp-nav-find-count').innerText()).includes('No matching sections'));
    assert.equal(await p.locator('.mw-navigation [data-mw-page]:not(.bp-nav-filter-hidden)').count(),0);
    await input.fill(findTerm);
    assert(await p.locator('[data-mw-page="'+findTab+'"]').isVisible());
    await p.locator('[data-mw-page="'+findTab+'"]').click();
    assert.equal(await input.inputValue(),'');
    await p.locator('.mw-page-head h1').click();
    await p.keyboard.press('/');
    assert(await input.evaluate(el=>document.activeElement===el),'Slash shortcut must focus navigation search');
    await input.press('Escape');
   }
   if(role==='teacher'&&width===1280){
    const finder=p.locator('#bp-section-search');
    await finder.fill('quickcare');
    assert(await p.locator('[data-mw-page="quickcare"]').isVisible(),'Internal section names should be searchable');
    await finder.press('Escape');
    assert.equal(await finder.inputValue(),'');
    passed++;
   }
   await p.locator('#panel-content .mw-page-head').waitFor({timeout:13000});
   passed+=2;
   console.log('PASS find-a-section',role,width,findTerm);
   for(const tab of tabNames){
    if(width===390){await p.locator('#bp-mobile-more').click();await p.locator('[data-bp-mobile-menu="'+tab+'"]').click();}
    else await p.locator('[data-mw-page="'+tab+'"]').click();
    await p.locator('#panel-content .mw-page-head').waitFor({timeout:13000});
    const state=await p.evaluate(()=>({error:document.querySelector('#panel-content').innerText.includes('Couldn’t load this section'),
      w:innerWidth,scroll:document.documentElement.scrollWidth}));
    if(state.error||state.scroll>state.w+4)failures.push({role,width,tab,...state});
    passed++;
   }
   assert.deepEqual(js,[],role+' '+width+' page errors');
   if(role==='school_admin'&&width===390)await p.screenshot({path:'/tmp/brightpath-school-admin-mobile-qa.png',fullPage:true});
   console.log('PASS navigation',role,width,tabNames.length,'tabs');
   await p.close();
  }
 }
 for(const width of [320,390,768,1280]){
  const p=await browser.newPage({viewport:{width,height:900},isMobile:width<=768,hasTouch:width<=768});
  await p.goto(base+'qa-home.html',{waitUntil:'networkidle'});
  assert.equal(await p.locator('.ql-kids-main-svg').count(),1);
  assert.equal(await p.locator('.ql-tiny-moment').count(),4);
  const portalAccess=p.locator('.ql-kinder-hero #sign-in');
  const accessBounds=await portalAccess.boundingBox();
  assert(accessBounds&&accessBounds.y>=0&&accessBounds.y+accessBounds.height<=900,'Portal access must fit in the opening viewport at '+width);
  for(const [route,role] of [['parent','Parent Portal'],['teacher','Teacher Portal'],['school-admin','School Administration']]){
   assert.equal(await p.getByRole('link',{name:'Sign in to '+role,exact:true}).evaluate(link=>link.href),base+route+'/');
   assert.equal(await p.getByRole('link',{name:'Sign up for '+role,exact:true}).evaluate(link=>link.href),base+route+'/?auth=signup');
  }
  await p.getByRole('tab',{name:'Pickup'}).click();
  assert((await p.locator('#ql-relay-story-title').innerText()).includes('verified hand'));
  const sizes=await p.evaluate(()=>({w:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert(sizes.scroll<=sizes.w+4,'Homepage overflow '+width);
  console.log('PASS preschool homepage interaction/mobile',width);
  passed++;await p.close();
 }
 console.log('FINAL',passed,'checks, responsive failures',failures.length);
 if(failures.length){failures.slice(0,20).forEach(x=>console.log('FAIL',JSON.stringify(x)));process.exitCode=1}
}finally{await browser.close()}
