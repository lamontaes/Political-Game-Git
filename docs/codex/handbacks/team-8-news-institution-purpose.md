# 1. Why-chain

News said “is a public institution” because an organization's classification
missed the renderer's noun map. Private schools missed it because the map had
only public schools. The fallback accepted any service classification because
the standing reader used a broad public-service filter. That filter did not
establish a purpose. Bedrock: the active saved organization profile establishes
its classification and location, not its current attendance or operations.

# 2. Research

The existing town-employment producer records private schools as
`service:private-school`. Organization profiles have no mission field. The
reader reuses the existing profile-at-cutoff query; this correction needs no
numerical research, new population or new organizational facts.

# 3. Revisions

Specific service classifications support purpose wording. Broad public-sector,
government and civic classifications cannot establish a specific purpose, so
those entries are omitted. No hours, staffing, attendance or currently delivered
services are inferred. Government and officeholder entries retain their paths.

# 4. What gets built

1. Replace the noun map and generic institution fallback with supported service
   purposes, including private schooling.
2. Omit institutions whose profiles do not establish a supported purpose.
3. Preserve the actual saved location and active-profile cutoff.
4. Add focused saved-world and ordinary player-route regression tests.

# 5. Simulated, records, world pieces, checks

No decisions or records are written by the reader. Tests use the existing
organization/profile writers and canonical serialization. Missing purpose means
no standing entry; missing location means no invented place. New exports: none.
Replaces: `INSTITUTION_NOUNS`, the “a public institution” fallback and its noun
sentence, within the existing `projectWorld39News` reader only.

# 6. Proof run

Parent's changed native file passed 15/15 in 14.16 seconds. Seeds
`news-institution-purpose:0` through `:4` drew Gibraltar, Michigan; Mill Plain,
Connecticut; Holbrook, Massachusetts; Pilot Station, Alaska; and McGrath,
Minnesota from the all-56 sampler. Controlled saved profiles prove supported
purposes, generic/unknown omission, active-profile/location selection, reload
and read immutability. These are renderer fixtures, not natural school activity.

Changed browser test passed 1/1 in 45.5 seconds. The browser seed
`news-institution-purpose:browser` drew Washington, District of Columbia. It
saved the controlled world through the existing store, then used Continue →
News → Around and captured the standing section. Screenshot inspected:
`test-results/runs/6155e987-1162-422b-b640-b94d7bee509a/results/news-institution-purpose-A-7a074-t-public-institution-filler-chromium/institution-purpose.png`.

The first browser attempt failed with “Target crashed” before Continue; a
formatting change during that run also invalidated its source-identity check.
That failure is preserved. The successful retry froze source and built its
fixture in Node before loading the canonical world into the browser.
Helper checks on the four changed TypeScript files: ESLint 0, Prettier 0.
Official Claude gate and current-main composition acceptance remain pending.

# 7. Worked example

The controlled saved profile names “Purpose fixture academy,” classifies it as
a private school and locates it in the sampled place. Around renders “Purpose
fixture academy is a place for private schooling in Washington, District of
Columbia.” The separate unknown-purpose fixture is absent. No person enrolls,
works or pays because this reader runs; none of those facts is claimed.
