# BrightPath compact landing-page layout

The user requested that the landing page avoid excessive white space and large gaps. This update maintains the mint, cream and warm preschool illustration style while tightening the hero, vertical section padding, card heights, section title margins, mobile spacing, FAQ rows, closing CTA and footer.

The illustrated role-preview markup had a missing closing `</div>` around its child art, which caused an oversized layout. Fixed the markup, preserving all children artwork and role-tab interactions.

Tested locally in headless Chrome using the actual home route at widths 320, 360, 390, 430, 768, 1024, 1280 and 1600 pixels. All eight passed: no horizontal overflow; role tabs, Care Relay tabs, time calculator, FAQ and responsive menu working; no browser JavaScript errors or role preview art overflow. Visual screenshots checked at 390px and 1280px.

Measured before and after: at 390px, main page height reduced from approximately 12,547px to 9,175px; at 1280px, approximately 9,428px to 6,818px. Values may vary slightly by browser and loaded fonts.

This is a marketing-only styling and markup fix, with no authentication, school, parent, teacher or database changes.
