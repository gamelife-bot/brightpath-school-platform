# BrightPath preschool-first homepage refresh — November 8, 2026

## Design objective

Make it visually obvious, within the first screen, that BrightPath serves toddlers, nurseries, daycares and early years preschools — not a generic corporate SaaS application.

## Shipped visual changes

- Kept the established mint, cream and warm-yellow BrightPath palette; increased the visual warmth with peach/coral, soft lilac, sky blue and playful childlike doodles.
- Replaced the initial software dashboard mockup with a large, original SVG illustration of preschool children creating art, using building blocks and learning together in a bright classroom. Illustration fills the main hero at desktop and mobile sizes.
- Rewrote the hero: "Little hands. Big discoveries. Happy families." with distinct school-owner and parent entry actions. No fabricated children, success metrics or testimonials.
- Added a prominent "A day in their little world" sequence of four fully illustrated preschool moments: painting/play, snack time, nap/rest and pickup. Existing BrightPath-owned character art is used, with different soft-colour cards and short human-friendly copy.
- Reworked the education workflow, benefit headings and role preview to use parent/teacher-preschool language rather than platform jargon.
- Added expressive original child illustrations to the role preview and closing invitation, not just decorative badges.
- Preserved working Care Relay tabs, calculator, role preview, FAQs, navigation, and user portal links. The redesign is marketing-only and does not alter student databases, roles or teacher processes.
- Updated landing HTML title and description to explicitly name preschool, nursery and daycare.

## Accessibility and testing

- Original inline SVG artwork (no photos of children, externally loaded stock photos, or third-party child image assets).
- Mobile visual screenshots checked at 390 px; desktop visual screenshot checked at 1280 px. Illustration is visible in the first screen on both.
- Playwright runs at 320, 360, 390, 430, 768, 1024, 1280, 1500 and 1920 pixels. All nine suites passed; tests verify no horizontal overflow, child artwork, 4 illustrated moments, CTA artwork, role tabs, Care Relay tabs, functioning calculator, FAQs and responsive menu.
- Existing school/parent/teacher backend functions, consent rules and login requirements were not modified in this release.

## Next practical design review

Observe preschool owners and parents opening the live site on their real phones. Ask whether, in five seconds, they can identify: preschool/daycare use, family privacy, parent vs school portal, and real staff benefit. Prioritize usability corrections from actual feedback before adding more animation.
