# BrightPath preschool workspace v2 — implementation & release record

## Scope implemented

- Organized sidebar navigation by role: overview, family/classroom, daily care, safety, and operations groups. Each group can be collapsed on desktop. Mobile navigation remains horizontally scrollable.
- Child-centred parent dashboard: today's care notes, real developmental milestones, child profile shortcuts, safe pickup history and daily-summary access.
- Teacher dashboard: quick actions for group care, individual care, media, child profiles, family messages and incidents.
- School Admin overview: setup entry, parent/teacher approvals, current care notes, and childcare quick actions.
- Private child profile records: date of birth, preferred name, verified emergency contacts, allergies, health notes and daily care instructions. Restricted to school administrators, assigned teachers and verified linked guardians. Only school administrators can edit.
- Health/incident reports: categories, severity, factual description, actions taken, guardian-contact status and school administrator review workflow. Urgent reports require separate emergency response; the website is not an emergency dispatch tool.
- Group care RPC: creates one individual daily-care record per selected child, at most 30 at once. Verifies active staff membership, school, guardian processing consent, and each teacher's assigned class on the server.
- In-app notifications: stored notifications from care logs, milestones, media, messages, pickup, incidents and approval requests/reviews. Restricted to recipient; a server function marks them read. Header unread badge refreshes approximately every 45 seconds while the page is visible. No email, SMS, or background push delivery is implied.
- Daily child summary: choose date and child; combines care, milestones, attendance, photo/video counts and pickup events into a printable page (browser Print / Save as PDF).
- Guided school setup checklist: classrooms, enrollment, teacher approvals and assignments, parent approvals and guardian links, care details, daily updates, pickup and private media.
- Consistent responsive form, sidebar, timeline, safety and profile components.

## Database and access control

Neon project `misty-firefly-89627281`, branch `br-billowing-hat-baft40ux`, database `neondb`. Additive schema for `public.bp_child_details`, `public.bp_incident_reports`, and `public.bp_notifications`, with RLS enabled. Parent visibility depends on verified `bp_parent_links` and active school membership; teacher visibility depends on their assigned room. New notifications are emitted by database triggers. No new tables grant anonymous select, and notifications cannot be inserted or edited by the client directly.

The separate **private** photo/video bucket and media gateway remain in place. Group care does not share photos to avoid crossing individual media permissions.

## Verification completed

- Vite build successful.
- 82 local browser checks across owner, school administrator, teacher and parent roles, covering all 61 current navigation sections, new forms, access scoping and mobile layouts.
- Local form simulations verified incident creation and follow-up, child profile updates, classroom batch care, notification read actions, daily summary, and onboarding navigation.
- Date-only rendering fixed to avoid shifting birthdays/summary dates backwards in negative UTC offsets.
- Verified RLS enabled, no anonymous read on new sensitive tables, no direct authenticated insert/update on notifications, and expected notification database triggers.
- Production database records were not populated with QA data.

## Tests required before rollout to real families

1. End-to-end with separate verified parent, teacher, and school administrator accounts, including session expiry and role-switch attempts.
2. Live upload and playback of photos/videos from the private storage gateway, including revoked consent and unauthorized cross-child access.
3. Real notifications from parent/teacher actions and approval decisions, including read acknowledgement across devices.
4. Multi-school and multi-guardian consent edge cases, incident correction/audit processes, child-data retention and deletion procedures, security and privacy review.
5. Safari and real mobile-device compatibility, performance and accessibility audits.
6. Actual payment collection, subscription enforcement and school payouts are **not active**. Email/SMS/push notifications are **not active**; only in-app inbox is implemented.

## Deployment

GitHub repository `gamelife-bot/brightpath-school-platform` serves GitHub Pages from `main` branch `/docs`. Build with `npm run build`, commit `src/`, `docs/`, and `ops/`, push `main`, then verify GitHub Pages build status and live JS/CSS fingerprints. Use `/home/` for the landing page; role routes `/owner/`, `/school-admin/`, `/teacher/`, and `/parent/`.
