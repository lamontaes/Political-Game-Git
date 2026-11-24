---
id: world-department-head-vacancy-is-recorded
title: "A department head's death or move is recorded for the executive who appointed them, so a vacancy can be a scene"
area: world
kind: feature
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
blocked-on:
after:
model: sonnet
effort: medium
root: design-director-on-core2
source: words-and-scenes helper D, Oct 27; code read of the executive review
lead: m0-m2
claimed-at:
checked: fable 2026-11-10
---

**What.** When a department head dies or moves out of town, the executive's regular review fills the post silently for any executive but the player, and for the player the vacancy is only an offer on the office screen. No record names the executive and the departed head, so no scene can bring the deputy, or the person who wanted the job, to the executive who must choose. Record a vacancy when the review finds a head gone, naming the appointer and the departed head, and fill it only after the record is written. The director then holds a moment from it for the appointer. Seen: the scene where the executive meets the deputy or the person who wanted a department head's post, and the office screen's offer.

**Cause.** Found in code: the executive's review in src/core2/modules/executive.ts (the desk-review handler near line 1644, with the `vacant` set built at lines 1687-1705) fills a vacated head post with no vacancy record. Evidence is in docs/design/scenes/from-life/executive-record-gaps.md.

**Fix.** Write a vacancy record naming the appointer and the departed head when the review finds a head gone, fill the post only after the record is written, and add the director moment for the appointer in src/director/data/director.json.

**Time box.** 4 hours for one session of the Sonnet model. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the vacancy is read by the director and by the office screen's offer. No dice: a vacancy is the departed head's recorded death or move, nothing else. One rule, all 56 places: no place is named.

**Done when.** A second session (not the builder) plays a world (`buildBenchWorld`) in a drawn place and a seed the builder did not choose, sees a head who dies or moves away followed by a vacancy record naming the appointer before any replacement is appointed, and sees the director hold a moment from it for the appointer; a test fails when the replacement is appointed with no vacancy record.

**Waits on.** Nothing.

**Files.** src/core2/modules/executive.ts, src/director/data/director.json, docs/design/scenes/from-life/executive-record-gaps.md

**Notes.** Evidence in docs/design/scenes/from-life/executive-record-gaps.md. Lead m0-m2.
