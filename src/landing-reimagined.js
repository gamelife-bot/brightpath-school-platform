import {preschoolHeroArt} from './preschool-landing-art.js';
import {careRelayArt} from './care-relay-art.js';
import {welcomeArt,momentArt} from './playful-art.js';
import './landing-reimagined.css';
import './preschool-landing.css';
import './preschool-compact.css';

const features=[
 {icon:'🌤️',tone:'mint',label:'A calmer teacher day',title:'A classroom assistant that stays out of the way.',body:'See the next useful action, select children marked present, and turn existing records into factual, reviewable daily drafts.'},
 {icon:'📷',tone:'sun',label:'Small moments, privately shared',title:'Photos, voice-free records and milestones.',body:'Care notes, joyful moments and progress live in each child’s private family space—subject to school-managed permissions.'},
 {icon:'🛡️',tone:'blue',label:'Trust comes first',title:'Guardians, consent and safe pickup.',body:'Only authorized people can access sensitive records. Parents can request guardian changes and review school documents privately.'},
 {icon:'✍️',tone:'peach',label:'Administration, not teacher paperwork',title:'Parent signatures and school feedback.',body:'Families draw or upload a signature, answer short surveys, and message administration—without adding more teacher forms.'}
];
const faq=[
 ['Does BrightPath write daily reports for teachers?','It compiles what has already been recorded into an on-screen summary and a factual preview. It does not invent missing observations or force teachers to write a daily essay.'],
 ['Does the assistant secretly record children or use an external AI?','No. The currently available Quiet Classroom assistant is rules-based. It reads the teacher’s authorized school records. It does not listen to the classroom or send child information to an outside AI service.'],
 ['Must teachers upload photographs every day?','No. Photos and milestones are optional unless a school’s own policy requires specific records. Parents only see permitted media associated with their child.'],
 ['Can the school collect signatures and parent feedback?','Yes. Approved parents can sign a specific school document by drawing or uploading a signature, answer short private surveys, and send reviews directly to school administration.'],
 ['Can schools try it before changing their routine?','They can explore the existing portals and begin school setup. A full live rollout should be piloted with real staff and separately authenticated parents to validate usability, privacy and staffing time.'],
 ['Does it work without internet or automatically send SMS?','Not yet. These browser-based features require connectivity, and external SMS/email delivery is not active. BrightPath does not claim offline sync or external push delivery.']
];

const door=(root,path)=>root+path+'/';
export function renderLanding(app,root){
 const go=(route)=>door(root,route);
 const nav='<header class="ql-nav" id="top"><a class="ql-brand mark-logo" href="'+go('home')+'" aria-label="BrightPath home"><span class="ql-brand-star">✦</span><span>brightpath<span>.</span></span></a>'+
  '<nav class="ql-nav-links" id="ql-nav-links" aria-label="Main navigation"><a href="#relay">Care Relay</a><a href="#how">How it works</a><a href="#quiet">Quiet Classroom</a><a href="#experience">See the experience</a><a href="#questions">FAQs</a><a href="'+go('pricing')+'">Pricing</a></nav>'+
  '<div class="ql-nav-actions"><a class="ql-signin" href="'+go('parent')+'">Family sign in</a><a class="ql-btn ql-btn-dark" href="'+go('school-admin')+'">For schools <span>↗</span></a></div>'+
  '<button type="button" class="ql-menu" id="ql-menu" aria-label="Open navigation" aria-controls="ql-nav-links" aria-expanded="false"><span>☰</span></button></header>';
 const hero='<section class="ql-hero ql-kinder-hero"><div class="ql-hero-sprinkles" aria-hidden="true"><span>✳</span><span>✦</span><span>♥</span><span>✿</span></div>'+
  '<div class="ql-hero-content"><span class="ql-eyebrow">🌼 A HAPPY LITTLE WORLD FOR EARLY LEARNERS</span>'+
  '<h1>Little hands.<br><em>Big discoveries.</em><br><span>Happy families.</span></h1>'+
  '<p>Every day at preschool is full of tiny adventures. BrightPath helps parents feel close to those moments while teachers spend more time caring, playing and helping children grow.</p>'+
  '<div class="ql-hero-actions"><a class="ql-btn ql-btn-dark ql-btn-lg" href="'+go('school-admin')+'">🏫 I run a preschool <span>↗</span></a><a class="ql-btn ql-btn-outline" href="'+go('parent')+'">💛 I’m a parent <span>↗</span></a></div>'+
  '<div class="ql-hero-proof"><span><b>✓</b> Designed for toddlers & preschoolers</span><span><b>✓</b> Private family moments</span><span><b>✓</b> Less teacher paperwork</span></div>'+
  '<div class="ql-hero-handnote" aria-hidden="true"><span>✏️</span><span>Made for<br>little smiles!</span></div></div>'+
  '<div class="ql-kids-hero-visual"><div class="ql-kids-hero-scene">'+preschoolHeroArt()+'</div>'+
  '<div class="ql-kids-sun-sticker" aria-hidden="true">☀️</div><div class="ql-kids-rainbow-sticker" aria-hidden="true">🌈</div>'+
  '<div class="ql-kids-scene-badge"><span>🧸</span><div><b>Learning through play</b><small>Every little moment matters</small></div></div>'+
  '<div class="ql-kids-speech-sticker">Look what<br>I made! <span>✦</span></div></div></section>';
 const strip='<div class="ql-brightbar" aria-label="BrightPath principles"><span>☀️ PLAY FIRST</span><i>✳</i><span>🧸 PRESCHOOL HEART</span><i>✳</i><span>🔐 PRIVATE BY DESIGN</span><i>✳</i><span>🍎 TEACHER FRIENDLY</span></div>';
 const momentsList=[
  {type:'play',tag:'01 · PLAY',title:'Paint, play & discover',note:'Their imagination has no limits.',color:'peach'},
  {type:'meal',tag:'02 · CARE',title:'Little bites, big smiles',note:'The everyday moments matter.',color:'yellow'},
  {type:'nap',tag:'03 · REST',title:'Dream, rest & recharge',note:'Gentle care, right on time.',color:'lilac'},
  {type:'pickup',tag:'04 · HOME',title:'One more happy goodbye',note:'A safe return to their people.',color:'mint'}
 ];
 const momentsSection='<section class="ql-tiny-world" id="tiny-world"><div class="ql-tiny-world-wrap"><div class="ql-tiny-world-top">'+
  '<div><span class="ql-kicker">🎈 A DAY IN THEIR LITTLE WORLD</span><h2>Messy hands. Happy hearts.<br><em>Memories worth sharing.</em></h2></div>'+
  '<p>Finger painting, snack time, naps, new friends... every child’s day is a story. BrightPath helps schools share the real moments that matter, privately with families.</p></div>'+
  '<div class="ql-tiny-moment-grid">'+momentsList.map(x=>'<article class="ql-tiny-moment ql-tiny-'+x.color+'"><div class="ql-tiny-moment-art">'+momentArt(x.type)+'</div><div class="ql-tiny-moment-copy"><small>'+x.tag+'</small><h3>'+x.title+'</h3><p>'+x.note+'</p></div><span class="ql-tiny-moment-doodle" aria-hidden="true">✿</span></article>').join('')+'</div>'+
  '<div class="ql-tiny-world-legend"><span>💛 Every child is unique</span><span>🛡️ Private and consent-aware</span><span>🍎 Teachers choose what to share</span></div></div></section>';
 const how='<section class="ql-section ql-how" id="how"><div class="ql-section-head"><span class="ql-kicker">THE BRIGHTPATH DIFFERENCE</span><h2>One happy moment.<br><em>Shared with so much love.</em></h2><p>A teacher should be with children, not buried in forms. One genuine classroom update can help families feel connected without extra typing.</p></div>'+
 '<div class="ql-outcomes"><article><span class="ql-outcome-no">01</span><div class="ql-outcome-icon">🍎</div><h3>Teacher records once</h3><p>Mark attendance, log one group activity, or share a permitted photo. Review who actually participated.</p><span class="ql-outcome-bottom">A SMALL, INTENTIONAL ACTION</span></article>'+
 '<div class="ql-outcome-arrow" aria-hidden="true">↗</div><article><span class="ql-outcome-no">02</span><div class="ql-outcome-icon">✦</div><h3>Quiet Classroom organizes</h3><p>Existing facts become a daily summary and a reviewable draft. No extra typing, no invented data.</p><span class="ql-outcome-bottom">THE ASSISTANT DOES THE ORGANIZING</span></article>'+
 '<div class="ql-outcome-arrow" aria-hidden="true">↗</div><article><span class="ql-outcome-no">03</span><div class="ql-outcome-icon">💌</div><h3>Family sees their child</h3><p>Linked parents view private updates, milestones and authorized media—without a classroom WhatsApp group.</p><span class="ql-outcome-bottom">ONE FAMILY, THEIR OWN STORY</span></article></div></section>';
 const relaySection='<section class="ql-relay" id="relay"><div class="ql-relay-wrapper"><div class="ql-relay-left">'+
  '<span class="ql-kicker">🌈 THE HEART OF BRIGHTPATH</span><h2>One little day.<br><em>Two worlds connected.</em></h2>'+
  '<p>From that first sleepy goodbye to the final wave at the school gate, parents and teachers can care for a child together—without sharing everyone’s private information or filling endless forms.</p>'+
  '<div class="ql-relay-controls" role="tablist" aria-label="A day with Care Relay">'+
  '<button type="button" role="tab" id="ql-relay-tab-morning" aria-selected="true" aria-controls="ql-relay-story" data-ql-relay="morning">☀️ Morning</button>'+
  '<button type="button" role="tab" id="ql-relay-tab-school" aria-selected="false" aria-controls="ql-relay-story" data-ql-relay="school">🧸 Classroom</button>'+
  '<button type="button" role="tab" id="ql-relay-tab-pickup" aria-selected="false" aria-controls="ql-relay-story" data-ql-relay="pickup">🎒 Pickup</button>'+
  '<button type="button" role="tab" id="ql-relay-tab-evening" aria-selected="false" aria-controls="ql-relay-story" data-ql-relay="evening">🌙 Evening</button></div>'+
  '<div class="ql-relay-story" id="ql-relay-story" role="tabpanel" aria-labelledby="ql-relay-tab-morning"><span id="ql-relay-story-icon">☀️</span><div><b id="ql-relay-story-title">A gentle note from home</b><p id="ql-relay-story-copy">A parent shares a useful morning handover. Important care notes are flagged for an assigned teacher to acknowledge.</p></div></div>'+
  '<div class="ql-relay-actions"><a class="ql-btn ql-btn-dark" href="'+go('parent')+'?tab=relay">See the family side <span>↗</span></a><a class="ql-btn ql-btn-outline" href="'+go('teacher')+'?tab=relay">See the teacher side</a></div></div>'+
  '<div class="ql-relay-right"><div class="ql-relay-art-frame">'+careRelayArt()+'<div class="ql-relay-art-caption"><span>🏡</span><div><strong>Where home and school meet.</strong><small>Original BrightPath illustration · sample scene</small></div></div></div><div class="ql-relay-stars" aria-hidden="true">✦  ✳  🌼</div></div></div></section>';
 const quiet='<section class="ql-quiet" id="quiet"><div class="ql-quiet-inner"><div class="ql-quiet-illustration"><span class="ql-doodle ql-doodle-a">✳</span><span class="ql-doodle ql-doodle-b">🌼</span>'+
  '<div class="ql-quiet-board"><span class="ql-quiet-label">✦ QUIET CLASSROOM</span><h3>What needs my attention?</h3>'+
  '<div><span>✓</span><p><b>Attendance</b><small>See which children have a recorded status</small></p></div>'+
  '<div><span>☀</span><p><b>Group activity</b><small>Select today’s recorded attendees in a tap</small></p></div>'+
  '<div><span>📔</span><p><b>Family draft</b><small>Facts from school records, ready to review</small></p></div>'+
  '<div class="ql-quiet-note">No made-up updates. No hidden background posting.</div></div></div>'+
  '<div class="ql-quiet-copy"><span class="ql-kicker">MEET YOUR CALM CLASSROOM COMPANION</span>'+
  '<h2>Not another chatbot.<br><em>A quieter way to work.</em></h2>'+
  '<p>Instead of demanding long notes from busy teachers, Quiet Classroom points them toward the next useful task and builds evidence-based family previews from the records they already made.</p>'+
  '<div class="ql-quiet-checks"><p><span>✓</span> A quick checklist, not an extra daily report</p><p><span>✓</span> Class-wide activity templates and present-child selection</p><p><span>✓</span> Parent drafts that stay private until someone acts</p><p><span>✓</span> No external AI or always-on classroom listening</p></div>'+
  '<a class="ql-btn ql-btn-light" href="'+go('teacher')+'?tab=quiet">Explore the teacher assistant <span>↗</span></a>'+
  '<small>Quiet Classroom currently uses simple rules and existing school records. It is not a self-operating AI agent.</small></div></div></section>';
 const featureHtml='<section class="ql-section ql-features" id="features"><div class="ql-section-head"><span class="ql-kicker">THOUGHTFUL DETAILS, NOT MORE CLUTTER</span><h2>All the little things<br><em>that make a big difference.</em></h2><p>Thoughtfully made for the people who care for little learners: parents, teachers and the school family.</p></div>'+
 '<div class="ql-feature-grid">'+features.map(x=>'<article class="ql-feature ql-f-'+x.tone+'"><div class="ql-feature-top"><span>'+x.icon+'</span><small>'+x.label+'</small></div><h3>'+x.title+'</h3><p>'+x.body+'</p><span aria-hidden="true" class="ql-feature-decoration">✦</span></article>').join('')+'</div></section>';
 const preview='<section class="ql-section ql-experience" id="experience"><div class="ql-section-head"><span class="ql-kicker">STEP INSIDE BRIGHTPATH</span><h2>A special place for<br><em>everyone who cares.</em></h2><p>Choose a role to preview what BrightPath is designed to help them do. The examples below are illustrations, not live customer records.</p></div>'+
 '<div class="ql-role-tabs" role="tablist" aria-label="Choose a BrightPath role"><button type="button" role="tab" id="ql-tab-teacher" aria-selected="true" aria-controls="ql-role-output" data-role="teacher">🍎 Teacher</button><button type="button" role="tab" id="ql-tab-parent" aria-selected="false" aria-controls="ql-role-output" data-role="parent">💛 Parent</button><button type="button" role="tab" id="ql-tab-school" aria-selected="false" aria-controls="ql-role-output" data-role="school">🏫 School team</button></div>'+
 '<div class="ql-role-content" id="ql-role-output" role="tabpanel" aria-labelledby="ql-tab-teacher"><div class="ql-role-art"><div class="ql-role-scene" id="ql-role-scene"><div class="ql-role-kids-art" id="ql-role-kids-art">'+welcomeArt('teacher')+'</div><div class="ql-role-scene-paper"><span>✓ Attendance</span><span>☀️ Group updates</span><span>📔 Factual recaps</span></div></div></div>'+
 '<div class="ql-role-copy"><span id="ql-role-tag">TEACHER VIEW</span><h3 id="ql-role-title">The children come first.</h3><p id="ql-role-desc">One small group update can support daily family records. Quiet Classroom shows what’s missing without making optional moments mandatory.</p>'+
 '<div id="ql-role-points" class="ql-role-points"><span>✓ Real classroom facts</span><span>✓ No repetitive daily essays</span><span>✓ Fast mobile actions</span></div>'+
 '<a class="ql-btn ql-btn-dark" id="ql-role-link" href="'+go('teacher')+'">Explore teacher space <span>↗</span></a></div></div></section>';
 const time='<section class="ql-time" id="teacher-time"><div class="ql-time-inner"><div class="ql-time-copy"><span class="ql-kicker">THE TIME-BACK EXPERIMENT</span><h2>What could a calmer<br><em>classroom save?</em></h2><p>Try an illustrative comparison between typing the same group activity separately for every child and recording it once for the group.</p>'+
 '<label for="ql-kids">Children participating <strong id="ql-kids-label">15</strong></label><input id="ql-kids" type="range" min="3" max="30" step="1" value="15">'+
 '<label for="ql-routines">Shared activity updates per day <strong id="ql-routines-label">2</strong></label><input id="ql-routines" type="range" min="1" max="5" step="1" value="2">'+
 '<details class="ql-assumptions"><summary>See the calculation assumptions</summary><p>Illustration only: 45 seconds to type a note for one child versus 90 seconds per whole-group note. It assumes all participating children had the same factual group activity. Actual times and workload vary; individual care and consent cannot be batched away.</p></details></div>'+
 '<div class="ql-time-result"><div class="ql-time-small">ILLUSTRATIVE DAILY DIFFERENCE</div><div class="ql-time-big"><strong id="ql-minutes">19.5</strong><span>minutes</span></div><p>Potential routine writing time avoided using one verified group entry.</p>'+
 '<div class="ql-time-bar"><span class="ql-time-old" id="ql-time-old"></span><small>Separate entries</small></div>'+
 '<div class="ql-time-bar"><span class="ql-time-new" id="ql-time-new"></span><small>Group entries</small></div>'+
 '<div class="ql-time-math"><div><b id="ql-before">22.5 min</b><small>Individual-entry illustration</small></div><div><b id="ql-after">3 min</b><small>Shared-entry illustration</small></div></div>'+
 '<p class="ql-time-caution">Not a verified performance result. Confirm savings and any change in documentation quality with teachers during a real pilot.</p></div></div></section>';
 const trust='<section class="ql-section ql-trust" id="privacy"><div class="ql-trust-copy"><span class="ql-kicker">CARE IS PERSONAL</span><h2>A private window into<br><em>their little world.</em></h2><p>School access, approved guardian links, photo permission and private family communication are built into the experience. The product is not a public child-photo feed.</p>'+
 '<a class="ql-text-link" href="'+go('parent')+'">Explore the parent experience <span>↗</span></a></div>'+
 '<div class="ql-trust-tiles"><div><span>🔐</span><b>Linked families only</b><small>Parents access their own verified child’s records.</small></div>'+
 '<div><span>📷</span><b>Media consent checks</b><small>Photos and videos use the private media gallery.</small></div>'+
 '<div><span>✍️</span><b>Guardian acknowledgments</b><small>Sign school documents without giving staff a reusable signature.</small></div>'+
 '<div><span>👩‍🏫</span><b>Staff keep their judgment</b><small>Nothing claims a care moment happened unless someone recorded it.</small></div></div></section>';
 const questions='<section class="ql-section ql-faq" id="questions"><div class="ql-section-head"><span class="ql-kicker">GOOD QUESTIONS DESERVE CLEAR ANSWERS</span><h2>Questions we would<br><em>ask, too.</em></h2></div><div class="ql-faq-list">'+faq.map(([title,body],idx)=>'<details '+(idx===0?'open':'')+'><summary><span>'+String(idx+1).padStart(2,'0')+'</span>'+title+'<b aria-hidden="true">+</b></summary><p>'+body+'</p></details>').join('')+'</div></section>';
 const cta='<section class="ql-last"><div class="ql-last-inner"><div class="ql-last-friends">'+welcomeArt('parent')+'</div><h2>A little more wonder.<br><em>A lot more together.</em></h2><p>Bring families closer while keeping the teacher’s day simple. Start with a school portal and test the routines with your team.</p>'+
 '<div><a class="ql-btn ql-btn-dark ql-btn-lg" href="'+go('school-admin')+'">Open the school portal <span>↗</span></a><a class="ql-btn ql-btn-outline" href="'+go('pricing')+'">Explore pricing</a></div>'+
 '<small>Registration and private school access are controlled by account approvals. Payment collection is not active.</small></div></section>';
 const footer='<footer class="ql-footer"><div class="ql-footer-top"><div><a class="ql-brand mark-logo" href="'+go('home')+'"><span class="ql-brand-star">✦</span><span>brightpath<span>.</span></span></a><p>More time with little learners.<br>Closer connections with families.</p></div><div><b>Explore</b><a href="#how">How it works</a><a href="#quiet">Quiet Classroom</a><a href="#experience">Explore portals</a><a href="'+go('pricing')+'">Plans & pricing</a></div><div><b>Portals</b><a href="'+go('school-admin')+'">School admin</a><a href="'+go('teacher')+'">Teachers</a><a href="'+go('parent')+'">Parents</a></div><div><b>Important</b><a href="#privacy">Child privacy</a><a href="#questions">FAQ</a><a href="#teacher-time">Time calculator</a></div></div>'+
 '<div class="ql-footer-bottom"><span>© BrightPath · Built for everyday childhood.</span><span>✦ Little moments. Big futures.</span></div></footer>';
 app.innerHTML='<div class="ql-page">'+nav+'<main>'+hero+strip+momentsSection+how+relaySection+quiet+featureHtml+preview+time+trust+questions+cta+'</main>'+footer+'</div>';
 const menu=document.getElementById('ql-menu'),navLinks=document.getElementById('ql-nav-links');
 menu.onclick=()=>{const open=navLinks.classList.toggle('ql-nav-open');menu.setAttribute('aria-expanded',String(open));menu.querySelector('span').textContent=open?'✕':'☰'};
 navLinks.querySelectorAll('a').forEach(a=>a.onclick=()=>{navLinks.classList.remove('ql-nav-open');menu.setAttribute('aria-expanded','false');menu.querySelector('span').textContent='☰'});
 const relayStories={
  morning:['☀️','A gentle note from home','A parent shares an optional morning handover. Important care notes appear in an assigned teacher’s exception inbox.'],
  school:['🧸','Only the moments that really happened','Teachers use the records they already make; no compulsory extra report or ungrounded AI observations.'],
  pickup:['🎒','A verified hand at the school gate','Approved collectors and in-person identity checks are required; a parent note cannot authorize pickup.'],
  evening:['🌙','A small, verified story to take home','Assigned staff review real records and publish private, child-specific day summaries to verified guardians.']
 };
 const relayButtons=[...document.querySelectorAll('[data-ql-relay]')];
 const updateRelay=(key)=>{const d=relayStories[key];if(!d)return;relayButtons.forEach(b=>b.setAttribute('aria-selected',String(b.dataset.qlRelay===key)));
  document.getElementById('ql-relay-story').setAttribute('aria-labelledby','ql-relay-tab-'+key);
  document.getElementById('ql-relay-story-icon').textContent=d[0];document.getElementById('ql-relay-story-title').textContent=d[1];document.getElementById('ql-relay-story-copy').textContent=d[2];};
 relayButtons.forEach((b,i)=>{b.onclick=()=>updateRelay(b.dataset.qlRelay);b.onkeydown=event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const next=relayButtons[(i+(event.key==='ArrowRight'?1:relayButtons.length-1))%relayButtons.length];next.focus();updateRelay(next.dataset.qlRelay)}});
 const roles={
  teacher:{tag:'TEACHER VIEW',title:'The children come first.',desc:'One small group update can support the family diary and daily summary. The assistant points to real missing records without making optional moments compulsory.',icon:'🍎',sample:['✓ Attendance','☀️ Group updates','📔 Factual recaps'],points:['Real classroom facts','No repetitive daily essays','Fast mobile actions'],href:go('teacher'),link:'Explore teacher space'},
  parent:{tag:'PARENT VIEW',title:'Be close, even when apart.',desc:'See your verified child’s private photos, care moments, daily summaries and growth observations, plus school office messages and forms.',icon:'💛',sample:['🧸 Their daily care','📸 Consented photos','✍️ School forms'],points:['Only your linked child','Private school messages','Daily facts, not guesses'],href:go('parent'),link:'Explore family space'},
  school:{tag:'SCHOOL ADMIN VIEW',title:'A calmer school to run.',desc:'Keep teacher approvals, guardian permissions, parent surveys, schedules and safeguarding actions in the right place without handing every office task to staff.',icon:'🏫',sample:['✓ Approve accounts','💌 Parent inbox','📋 Guardian forms'],points:['School-managed permissions','Family office workflows','Room and staff overview'],href:go('school-admin'),link:'Explore school portal'}
 };
 const tabEls=[...document.querySelectorAll('[data-role]')],panel=document.getElementById('ql-role-output');
 const chooseRole=role=>{const r=roles[role];if(!r)return;
  tabEls.forEach(b=>b.setAttribute('aria-selected',String(b.dataset.role===role)));
  panel.setAttribute('aria-labelledby','ql-tab-'+role);
  document.getElementById('ql-role-tag').textContent=r.tag;document.getElementById('ql-role-title').textContent=r.title;
  document.getElementById('ql-role-desc').textContent=r.desc;
  const scene=document.getElementById('ql-role-scene');document.getElementById('ql-role-kids-art').innerHTML=welcomeArt(role==='school'?'school':role==='teacher'?'teacher':'parent');
  const rows=scene.querySelectorAll('.ql-role-scene-paper span');rows.forEach((x,i)=>x.textContent=r.sample[i]);
  document.getElementById('ql-role-points').innerHTML=r.points.map(s=>'<span>✓ '+s+'</span>').join('');
  const link=document.getElementById('ql-role-link');link.href=r.href;link.innerHTML=r.link+' <span aria-hidden="true">↗</span>';
 };
 tabEls.forEach((b,i)=>{b.onclick=()=>chooseRole(b.dataset.role);b.onkeydown=ev=>{if(!['ArrowLeft','ArrowRight'].includes(ev.key))return;ev.preventDefault();const next=tabEls[(i+(ev.key==='ArrowRight'?1:2))%3];next.focus();chooseRole(next.dataset.role)}});
 const kids=document.getElementById('ql-kids'),routines=document.getElementById('ql-routines');
 const calc=()=>{const k=Number(kids.value),r=Number(routines.value),before=k*r*45/60,after=r*90/60,saved=Math.max(0,before-after);
  document.getElementById('ql-kids-label').textContent=k;document.getElementById('ql-routines-label').textContent=r;
  document.getElementById('ql-minutes').textContent=saved.toFixed(1);
  document.getElementById('ql-before').textContent=before.toFixed(1)+' min';
  document.getElementById('ql-after').textContent=after.toFixed(1)+' min';
  document.getElementById('ql-time-old').style.width='100%';
  document.getElementById('ql-time-new').style.width=(before>0?Math.min(100,after/before*100):0)+'%';
 };
 kids.oninput=calc;routines.oninput=calc;calc();
}
