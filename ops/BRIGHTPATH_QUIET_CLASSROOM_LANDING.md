# BrightPath — Quiet Classroom and teacher-first landing release

**Scope:** Reposition BrightPath around trusted, low-effort preschool-family communication rather than a generic school portal or ungrounded AI promises.

## Shipped site features

- Redesigned landing page with responsive navigation, modern vector/illustrated teacher-first hero, clear school/parent/teacher entry points and consistent product story.
- Interactive role preview for teachers, families and school administrators. Illustrations clearly labelled non-real sample content.
- Three-outcome workflow explanation (record once → assistant organizes → own-family visibility), feature sections, permission explanations, accessible native-HTML FAQ, and final school CTA.
- Transparent illustrative classroom paperwork calculator with adjustable participating-child count and group-activity count; explicitly labelled an *assumption-based estimate, not measured product performance*.
- New **Quiet Classroom** page in the teacher portal and bottom mobile nav. Dashboard has an entry point, too.
- Teacher assistant gives a simple task checklist, reports attendance completion, summarizes only recorded events, and answers four common questions from authorized assigned-class data.
- Teachers can preview and copy a factual, **unsent** child-specific daily note based on school records. Records without an attendance status say 'not yet recorded'; no invented meals, naps, progress, or photos.
- Existing Quick Classroom page remains the authorized place to make one verified group entry for participating children. Existing Daily Summary derives from actual records. No extra daily teacher essay required.

## Privacy boundaries

- Quiet Classroom is **not a generative AI model**, autonomous agent, voice recorder, or image identifier. The first version uses transparent, deterministic, local browser logic applied to records already returned under existing database role policies.
- Assistant has **no write or send path**, so it cannot silently post, approve, email, or alter student records. Its navigation buttons link to existing permission-checked pages. Copying an on-screen draft requires an explicit click.
- Teacher dataset is scoped to assigned classrooms. Sensitive records are not exported to an external AI API.
- The landing product demo is fictional and explicitly labelled as an illustration. No fabricated customer testimonials, staff-time results, or privacy certifications.

## Testing

- Home UI tested via Playwright at 320, 360, 390, 430, 760, 970, 1280 and 1600 pixels. Role switch, tab semantics, FAQ expansion, mobile navigation, and calculator all passed; no page horizontal overflow or JavaScript page errors.
- Existing pricing page functionality tested, including price calculator.
- Teacher assistant tested at 320, 390, 760 and 1280 pixels with an isolated simulated roster: one enrolled child recorded present with a genuine care entry, one child without attendance, and an unassigned child whose data must never appear. Facts and privacy boundary assertions passed.
- Screenshots of mobile and desktop landing/teacher assistant visually inspected.
- Browser tests use simulated data only. Signed-in production accounts and real database row-level permissions require a live cross-account security and usability pilot before launching with real children.

## Competitive observations and next meaningful differentiators

Brightwheel already offers an operational AI helper; South African EarlyTrack offers group classroom reports and AI report comments; Wobble advertises offline-first care logging and plans an AI daily log assistant; Neni advertises voice transcription and AI summaries. Therefore generic AI branding or auto-summary is **not a unique, defensible differentiation**. Evidence-based approval control and measured reduced teacher input should be the promise.

Recommended pilot research: measure daily minutes of paperwork per classroom before/after; privacy incidents and parent satisfaction; phones and low-bandwidth usage; comprehension across languages; staff adoption. **Future, not shipped:** teacher-approved local speech-to-note capture, robust offline-first sync, opt-in bilingual family recaps and secure school-level workload reporting. Each needs separate security, safeguarding and consent review.
