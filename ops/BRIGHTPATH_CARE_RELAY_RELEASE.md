# BrightPath Care Relay — first release

Release prepared: 2026-11-08

## Intent

BrightPath connects a child's morning at home and the verified events of the preschool day while protecting teacher attention. Care Relay does not invent care activities, listen to classrooms or autonomously send child information. The new screens use the existing light mint, warm cream, peach and golden brand colors, plus original vector artwork depicting a family arriving at school.

## Built and integrated

- **Parent morning handover:** Optional sleep/mood choices, care note, non-authorizing pickup information, and a flag for an important concern. One note per child per parent per day. Parents can read their own notes; school staff access requires active School Admin membership or an assignment to that child. Important notes create in-app notifications for authorized assigned staff.
- **Teacher exception inbox:** Only unacknowledged, parent-marked concerns demand an explicit acknowledgment. Routine notes stay in a collapsed panel, with no mandatory extra forms. Attendance is reused instead of collected again.
- **Actual physical pickup confirmation:** Assigned school staff must choose a currently approved collector and attest to an in-person identity/authorization check. A server procedure atomically writes the existing school pickup record and a Care Relay confirmation. Existing independently verified pickup records can also be confirmed within the same local day. A parent-written pickup note never approves a collector. Concurrent duplicate checkout requests are serialized at the server level.
- **Evening handback:** Assigned staff can verify up to 30 children in one action after reviewing the recorded facts. A school-side server procedure assembles snapshots from actual attendance, care logs, milestones, consent-checked private media counts, and recorded pickup facts. Children without attendance cannot be verified. An unacknowledged priority handover blocks publication for that child. Each parent sees only their linked child's verified snapshot, with the actual revision and verification time.
- **Visual design:** Responsive illustrated parent and staff hero panels, four-stage Care Relay journey, warm content cards, private notes and safety state chips. The public landing page now features an original school-and-family illustration and interactive morning-to-evening story tabs. No child photos or customer testimonials were invented.
- **Navigation:** Parent, Teacher and School Admin menus include Care Relay; mobile bottom navigation prioritizes it. Parent and Teacher overview pages link directly to the new workflow.

## Privacy/security

New Neon tables: `bp_care_relay_mornings`, `bp_care_relay_pickups`, `bp_care_relay_evenings`. All have row-level security enabled. Unauthenticated accounts cannot read them. Authenticated clients cannot insert or update them directly; trusted server RPCs enforce linked-family membership, assigned classroom access, approved pickup contacts and summary integrity. Family-specific morning notes are not broadly exposed to unrelated guardians.

**No fabricated QA children or care records were inserted into production.** Actual human identity checking is still necessary at the gate; software attestation cannot independently prove it happened. The app is not an emergency channel.

## Test evidence

- 30 simulated end-to-end and responsive assertions: parent morning note, teacher attention follow-up, physically verified pickup record, verified evening summary from the actual mock care log, separate guardian access scoping, and responsive layouts at 320, 360, 390, 430, 760, and 1280 px.
- 158 portal regression checks across Parent, Teacher, and School Administration, desktop and phone widths. No page-level overflow or browser errors in those tests.
- Screenshot visual review of new landing, parent and teacher pages. Original custom vector art renders properly on mobile.
- Confirmed RLS on all three new tables; anonymous reads and direct client writes disabled. New client operations use authenticated server RPCs.
- Production build passes Vite syntax/build validation.

## Real-world launch limitations

Live signed-in tests with independently authenticated parent, teacher and school admin accounts are still required; the browser workflow suite uses **isolated simulated records**, not a real production login. Particularly test revoked guardianship, classroom reassignment, cross-school access, pickup contact revocation, offline/retry behavior, and actual caregiver ID checks. Confirm the private media permissions and school safeguarding/data-retention procedures before enrolling actual children. External email/SMS/background push delivery is not enabled. No automatic message sending, unattended agent actions, or government/privacy certification is claimed.

Deployment: `gamelife-bot/brightpath-school-platform`, GitHub Pages from `main` branch `/docs`. Verify live asset fingerprint and Pages build after push.
