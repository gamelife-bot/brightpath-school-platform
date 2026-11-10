# BrightPath — Kenya-first, Africa-ready regional rollout

Release: 10 November 2026
Repository: gamelife-bot/brightpath-school-platform
Current public build: GitHub Pages, `main` → `docs/`

## Engineering changes completed
- `bp_school_settings` holds `country_code` (default `KE`) and `time_zone` (default `Africa/Nairobi`) for each school.
- School Admin → School settings allows selecting among 54 African countries and valid IANA school timezones. Countries with multiple zones can select another IANA zone for their city. A live preview shows the current school date/time, and a timezone indicator appears in school workspaces.
- The server's morning handover, physical pickup, confirmation of older pickups, factual snapshot and evening verification SQL functions use `bright_private.school_time_zone(school_id)`. No user device timezone is trusted for these server decisions.
- The classroom attendance/day diary, teacher and parent dashboards, medication authorizations, family notices, child profiles, staff coverage, quiet classroom, calendars, incident timestamps and safe pickup UI now follow their **school timezone**.
- `datetime-local` form fields are converted to UTC using the school's timezone, rather than the teacher's Mac/phone timezone. Skipped daylight-saving wall times are rejected; ambiguous overlaps use the earlier valid occurrence.
- Region selection is administrator-controlled under existing school RLS policy; all signed-in school participants can read their own school settings. The database rejects unknown timezone names through a trigger.
- Existing and unconfigured schools stay on Nairobi time to preserve backwards compatibility. Existing records retain their original recorded UTC timestamps and calendar dates, not rewritten.
- School setup includes a region/timezone confirmation step; Owner Overview includes truthful pre-launch registration, privacy, domain, pilot and payment readiness tasks.
- No guardian access, photo consent, staff assignment or Care Relay safeguards were removed.

## Kenya-first / Africa rollout caveats
- Timezones are now regional. **Pricing is still in Kenyan shillings**; country-specific taxes, subscription prices, payment rails and payout providers have not been implemented and must be defined for each later market.
- Country/timezone selection does not confer any local accreditation, education authority approval or legal data-processing authorization. BrightPath does not issue school licenses. School operators must satisfy applicable country and county requirements.
- Registered company legal name, postal address, contact email, customer support escalation, verified complaints contact, privacy notice, data-processing terms, retention schedule, school contracts, consent wording and cross-border data transfer policies need owner-supplied information and legal review before real children are enrolled.
- Real signed-in account isolation with two different real guardians, a teacher and an administrator has not been independently exercised against production auth/JWTs. Synthetic browser tests and the backend authorization audit are not substitutes.
- Payment activation, automated subscription enforcement and SMS/email/push beyond documented existing application functionality were not turned on.

## Custom domain readiness (do NOT run until the domain is purchased)
The source supports GitHub Pages project path and a custom domain at its root. `vite.config.js` selects `process.env.BP_PUBLIC_BASE || '/brightpath-school-platform/'` and the app uses `import.meta.env.BASE_URL` for all navigation.
1. Purchase a domain; do not invent or guess ownership.
2. In GitHub, verify the domain and configure **Settings → Pages → Custom domain** BEFORE pointing public DNS to it.
3. Switch build to the domain root: `BP_PUBLIC_BASE=/ npm run build`. Keep `docs/CNAME` containing the exact purchased domain only after the domain is verified and GitHub Pages is configured. Changing the base **without** configuring DNS/Pages will break links on the existing project URL.
4. Configure the prescribed A/AAAA records for the apex or a CNAME for `www` using current official GitHub docs. A `www` CNAME points to `gamelife-bot.github.io`, never a repository path. Avoid wildcard records.
5. Commit and push the domain-ready `docs/` build, verify HTTPS is enforced, test /, /home/, /pricing/, /owner/, /school-admin/, /teacher/, /parent/ on the registered domain with and without signed-in roles.
6. Update identity, support email, legal policies and outbound domain origin/allowed hosts in any authentication/OTP services after the domain is live.

Official GitHub Pages instructions:
https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

## External compliance items for an initial Kenyan launch
- Business Registration Service: https://brs.go.ke/fee-schedule-companies-registry/
- Office of the Data Protection Commissioner FAQs: https://www.odpc.go.ke/faqs/
- ODPC registration portal: https://dataportal.odpc.go.ke/Account/Register

The ODPC's published FAQ identifies **education** as a category generally not covered by the small-controller/processor registration exemption. Determine BrightPath's correct controller/processor roles and registration obligations with competent counsel and the ODPC before processing real child information.

## Test plan and evidence
- `npm test`: in-memory synthetic accounts and records for parent, unrelated guardian, assigned teacher, admin and owner, plus timezone unit tests for multiple African zones and UTC.
- Additional mocked school settings save/load test confirms that changing country to Nigeria sets Africa/Lagos, reloads the indicator, and is visible after a linked parent signs in.
- School calendar and care timestamps entered with `datetime-local` in Nigeria are correctly stored as UTC even when the test browser runs in America/Los_Angeles.
- PostgreSQL migration was applied atomically; database function definitions and region validation trigger verified. A temporary synthetic authenticated-role test accepted Africa/Lagos and rejected an invalid timezone.
- Separate `BP_PUBLIC_BASE=/` build served locally at the root, with homepage and all four login routes tested on desktop/mobile without cross-page overflow.
- No real user accounts, real child records or fictional legal registration numbers were created for these tests.

## Operational release decision
**Software foundation is suitable for a supervised pilot and domain purchase/configuration. It is not yet a legal/operational general-public launch approval.**
The first supervised pilot should verify real signed-in roles, image and video consent, pickup ID controls, record retention and exports, notifications, accessibility, performance and incident handling, and the effect on teacher workload.
