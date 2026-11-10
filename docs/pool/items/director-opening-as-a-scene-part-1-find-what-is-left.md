---
id: director-opening-as-a-scene-part-1-find-what-is-left
title: "List what is left of the opening's own path"
area: director
kind: research
priority: 1
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: director
model: sonnet
effort: medium
root: design-director-on-core2
source: split from director-opening-as-a-scene in the pool redo, Nov 10, 2026
---

**What.** The opening still runs on its own path in `src/director/opening-story.ts`, but nobody has listed which of its stages, casts and pictures are private and which the director already serves. This item makes that list, with file and function for each, so the two build parts can be written against it. It builds nothing.

**Cause.** Design: docs/reports/opening-root-cause-2026-10-27.md. Found in code: `src/director/opening-story.ts` is 1,228 lines with its own staging and a cutaway comment near line 870, while `src/bench/data/opening-pictures.json` and `castOf` are already deleted.

**Fix.** Read the opening end to end and write down, with file and function, each place the opening still stages, casts or picks a picture on its own path instead of the director's. Write the list into this item's Notes. Rewrite parts 2 and 3 from the list, or mark one dropped if nothing remains for it.

**Time box.** 3 hours for one Sonnet session.

**Rules.** Look before you ask: the root-cause report and the pool item play-opening-pictures-from-records are read first. One engine per mechanic: the list names where the opening duplicates the director's scene path.

**Done when.** A second session reads this item's Notes and finds the list: each remaining private path of the opening against the director's, with file and function, and the cutaways checked in a drawn place (name and seed) for which name an organization record id. Parts 2 and 3 are rewritten from the list, and a record id is named for every cutaway checked.

**Waits on.** Nothing.

**Files.** src/director/opening-story.ts, src/director/data/opening-story.json, src/bench/opening.ts
