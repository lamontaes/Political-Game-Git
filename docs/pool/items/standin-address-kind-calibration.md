---
id: standin-address-kind-calibration
title: "A governor's or mayor's address names a collapsing term's crisis over a long agenda, for any speaker"
area: words
kind: research
priority: 4
size: S
status: open
claimed-by:
pr:
after:
blocked-on:
source: stand-in triage Nov 10
lead: words
standard: 2
model: opus
effort: medium
root: none
---

**What.** A work-centered governor with a full agenda gives the same policy address in a good term and in a collapsing one, because the trait pull is clamped and the policy base doubles at the cap. Closes stand-in SG-WORDS-address-kind-policy-pull.

**Cause.** Found in code: src/director/address-kind.ts `pullOf` (line 70) clamps the mean of a kind's facets to -1..1 though traits run past 1; `scoreKinds` then gives policy 0.5 x work share x (1 + pull), which reaches 1.0 against a collapsing term's crisis 0.656 (Greensboro, Maryland, seed f8fc37cc25201edc, official:term:seat:US-MD:governor:2025-01-20); weights live in src/director/data/address-kinds.json (`policyBase`).

**Fix.** Fetch and quote at least three real State of the State or State of the City addresses from terms that were going badly and three from good terms (sources named in data/research), read which kind each leads with, and write the finding as a short note in data/research. Then set `policyBase`, the pull scale and the crisis weight in address-kinds.json (tagged ESTIMATED with the sources and a spread) so that, for every speaker the trait data can produce, a term whose worst area slides far enough scores crisis above policy; keep the slide sliding (no threshold). Add a test over a spread of speakers.

**Time box.** 4 hours.

**Rules.** Research before building: real addresses calibrate the weights and never decide one speaker's address. No dice. Numbers live in the parameter table with tag and spread. Speed: scoring is per address, a handful a year.

**Done when.** A second session runs a played year of a generated world in a drawn place (place and seed named) with a governor or mayor who has a full agenda and work-centered traits, in a term that is going badly and in one going well, and sees the bad term's address lead with the crisis and the good one's with policy or a lap; the note in data/research names the real addresses.

**Waits on.** Nothing.

**Files.** src/director/address-kind.ts, src/director/data/address-kinds.json, src/director/address-kind.test.ts, src/director/data/stopgaps.json

**Notes.** Stand-in triage Nov 10 (chunk 2). The existing opening-address item (words-opening-address-reads-as-stock-paragraphs) covers the President's address, not this score.
