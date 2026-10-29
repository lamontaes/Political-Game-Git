---
id: elections-contested-count-record
title: "A close count can be contested: the elections engine keeps a recount or challenge record the loser's side can cite"
area: elections
kind: feature
priority: 1
size: M
status: open
claimed-by:
pr:
blocked-on:
source: "Helper B, Oct 27, episode docs/design/scenes/from-life/concession-call-received.md"
lead: laws
claimed-at:
---

**What.** A loser's real choice after a close count is to concede, wait for certification, or ask for a recount, but the elections engine keeps no record of a recount or a contested count, so a scene where the loser says they will not concede yet has no outcome beyond a tag. Real cases show this branch: a trailing candidate withdrew a concession half an hour after making it when the count narrowed, and others say they will speak when the county certifies. Add a contested-count record opened from the caller's own decision, the place's recount law and the margin, and let certification close it.

**Rules.** No dice: opening it follows the loser's traits, the margin and the law in force, never a percentage. One rule, all 56 places: the recount law is data per place. Wire to the world: the result engine reads the record when it certifies.

**Done when.** In a played world (buildBenchWorld) in a place drawn from all 56 with a seed the builder did not choose, a counted race with a margin under the place's recount threshold gets a contested-count record the loser's decision opened, the certified result cites it by record id, and a test fails when the record is absent.

**Files.** src/core2/modules/elections.ts, src/core2/modules/voting.ts, src/core2/data

**Notes.** Found while building words-scene-concession-received; the not-yet-conceding replies end in the strained-tie label only.
