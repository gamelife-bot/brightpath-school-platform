# BrightPath — Safety, Staffing and Family Privacy Upgrade

Release date: 2026-11-08

Implemented in app:
- School Admin schedules teachers, assigns room coverage targets, reviews recorded attendance and actual teacher check-ins. Teachers can check in/out for their own shifts. Targets are school-managed estimates, not legal staffing certification.
- Parents can request verified guardian changes; School Administration must independently verify and document evidence before granting/removing access. Existing family linking/unlinking was upgraded to verified server procedures. The last linked guardian cannot be removed automatically. Link changes are audited.
- Parents can authorize written medication plans. Admin verifies the submitted plan and prescriber order; staff can record actual medication administration only against an approved, valid plan with an exact-dose match; a separate authorized staff account checks the log. This is recordkeeping, not medical advice or dispensing.
- Parent privacy center includes child record export and access/correction/deletion/consent requests. School Admin reviews requests. Deletion and retention requests are NOT automatic; manual review is required. Child profile field changes and guardian link changes are auditable.
- Browser notifications can be enabled by the user when supported. Alerts are generic to protect private content. External push delivery after the site closes, SMS, and email are NOT enabled.
- Private media upload client checks file signatures and cleans up temporary viewing URLs. The media service rejects missing and invalid tokens (HTTP 401). Gallery access remains consent-controlled. Deprecated inline activity photo storage is blocked by a database constraint; the previous system had zero inline media records.
- New features added to the Parent, Teacher and School Admin sidebars, and school onboarding adds staff scheduling and ratio setup.

Security boundaries:
- New private health, medication, guardian and privacy tables have row-level security; anonymous reads are disabled.
- Sensitive changes and medication logs are written through restricted server procedures rather than direct client table writes.
- Legacy unverified guardian link/unlink procedures are no longer executable by authenticated users.
- Test children, medication details and fake guardian records were kept in a local simulated browser dataset; none were inserted into the production database.

Verification:
- 86 local workflow/responsive checks across school admin, parent, teacher and owner roles, including medication authorization/review/recording/second check, guardian change and unlink, staff shifts/check-ins, and child export.
- 157 full navigation and responsive checks across desktop and mobile widths, including 320, 360, 390, 430 and 760 pixels.
- Private media gateway missing/malformed token access rejected with 401 for upload and read.
- Vite production build and GitHub Pages deployment must be checked after pushing.

Before onboarding real families:
- Complete live end-to-end testing using independent authenticated parent, teacher and school-admin accounts, including cross-school/child attacks and permission revocations. Local simulations alone do not prove end-to-end security.
- Test private media upload/view/revoke using real separate accounts, with actual device and Safari/Android accessibility checks.
- Have privacy and child safeguarding procedures reviewed by qualified local specialists. Define data retention, corrections, deletion and incident handling policies.
- Confirm production email/SMS sender services and payment integrations before enabling external delivery or billing.
