---
id: elections-contested-count-record
title: "A close count can be contested: the elections engine keeps a recount or challenge record the loser's side can cite"
area: elections
kind: feature
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
model: opus
effort: medium
root: rc9-place-facts-one-default
source: "Helper B, Oct 27, episode docs/design/scenes/from-life/concession-call-received.md"
lead: laws
claimed-at:
checked: fable 2026-11-10
---

**What.** A loser's real choice after a close count is to concede, wait for certification, or ask for a recount, but the elections engine keeps no record of a recount or a contested count. A scene where the loser says they will not concede yet has no outcome beyond a tag. Real cases show this branch: a trailing candidate withdrew a concession half an hour after making it when the count narrowed, and others say they will speak when the county certifies. Add a contested-count record opened from the loser's own decision, the place's recount law and the margin, and let certification close it.

**Cause.** Design: docs/design/scenes/from-life/concession-call-received.md (the episode) and the AGENTS.md rule "One rule, all 56 places". `src/core2/modules/elections.ts` and `src/core2/modules/voting.ts` keep no recount or contested-count record, and data/research/elections has no recount-law file.

**Fix.** Research each place's recount law into data (the researcher skill), add a contested-count record opened from the loser's decision, the margin and that law, and have certification close it and cite it.

**Time box.** 8 hours for one Opus session, after the recount-law data exists.

**Rules.** No dice: opening it follows the loser's traits, the margin and the law in force, never a percentage. One rule, all 56 places: the recount law is data per place. Wire to the world: the result engine reads the record when it certifies. Research before building: the recount law comes from fetched pages with a quote.

**Done when.** A second session plays a world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose (names written down) and finds a counted race with a margin under the place's recount threshold gets a contested-count record the loser's decision opened. The certified result cites it by record id, and a test fails when the record is absent. On election night in the running game the loser's scene reads that record.

**Waits on.** A per-place recount-law data file in data/research/elections (a research step, researcher skill); this item's first step builds it if no other item has.

**Files.** src/core2/modules/elections.ts, src/core2/modules/voting.ts, data/research/elections

**Notes.** Found while building words-scene-concession-received; the not-yet-conceding replies end in the strained-tie label only.
