# BrightPath signatures, family surveys and teacher-workload update

Date: 2026-11-08

## Features implemented

- School administrators create a document-specific signature request for an approved parent, optionally tied to a child the parent is verified to access. The parent reads the document and draws a signature with a mouse, finger or stylus, or uploads a PNG/JPG/WebP image. The app converts the image to bounded PNG before saving. The server validates PNG, signer's current access, attestation and the original document, then stores a signing time and SHA-256 fingerprint of the exact signed record. Signature disputes preserve the signed record. These signatures are basic e-acknowledgments, not certified advanced digital signatures; no automatic application to other consent forms.
- School administrators publish three-question parent surveys, see private per-question averages and parent comments, and close surveys. One approved parent can answer each survey once. Families see their own responses.
- Parents submit private 1–5 reviews in childcare, safety, communication, facilities, or overall experience. School administrators can respond privately and mark resolved. Reviews are deliberately not public testimonials or ratings.
- Teacher Quick classroom updates now offer reusable activity templates and a button to select children recorded as present that day, still requiring teacher confirmation of participation. If only one assigned classroom exists it is preselected. Each selected child's private diary receives its own record. Daily summaries are derived from actual recorded data, not separately composed.

## Roles and privacy

- Teacher portal does not offer signatures or parent reviews: they are handled by parents and school administrators.
- Child-specific signatures are restricted to the addressed, verified linked guardian and school administrators; survey responses and private reviews remain accessible only to the submitting parent and their school administrator.
- New tables use row-level security and disallow anonymous reads and direct writes; sensitive mutations use role-checked server procedures.
- A signature image is only stored for its document. No reusable signature gallery or open-ended external provider connections.

## Verification

- Signed a test document by drawing in a simulated browser parent session.
- Signed a second test document using an uploaded PNG in a simulated browser parent session.
- Tested survey creation, three question response, review creation and School Admin reply in a simulated browser session.
- Tested class-present selection and group routine template, with an explicit correct-child server request in simulation.
- 26 automated UI/workflow/mobile checks passed. No simulated child data was inserted into production.
- Builds were checked with Vite. Real authenticated end-to-end tests, identity verification and privacy/compliance review remain necessary before using with actual sensitive records.

## Positioning / teacher time

BrightPath is not the first African childcare communication app: WhitePenguin, Wobble and InstaKidz offer overlapping preschool daily update and parent-messaging features. Market-wide penetration claims should not be inferred from vendors' websites.

Recommended design target: teachers should record attendance once, optionally batch-log genuine group routines, post media only when meaningful/consented, and record individual milestones only when observed. Signatures, surveys and formal feedback are handled by parents and administration. A 2–5 minute routine daily app effort per classroom is a **target for pilot measurement**, not a measured result or service guarantee.

## Not active

Automated email/SMS and background device push, electronic signature certification by an external trust provider, live payments, and legal/child-data compliance certification are not active.
