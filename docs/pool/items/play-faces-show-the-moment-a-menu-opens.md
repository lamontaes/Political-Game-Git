---
id: play-faces-show-the-moment-a-menu-opens
title: "Faces in menus appear the moment the menu opens, not five seconds later"
area: play
lead: play-first
kind: bug
priority: 1
size: S
status: done
claimed-by: claude/people-faces-instant
pr: #6918
after: people-pack-v4
blocked-on:
milestone: play-first
source: owner, Oct 29 playtest of v0.64.0 (to the CTO)
claimed-at: 2026-10-30T06:59:26.631Z
---

**What.** The initials in circles are replaced by faces, but the owner found the faces "take forever to load. It shouldn't take 5 seconds after you open a menu for it to load. It should be there instantly." Politics, People and person cards draw each face after the sheet opens, one request at a time. The new people pack (`people-pack-v4`, which replaced v3 on Oct 29) changes how faces are made (each face is cropped from the person's own figure), so this item starts once v4 lands, and makes the crop ready before the menu opens: cached per person and look, sent with the sheet or loaded ahead, never drawn on demand per face.

**Time box.** 3 hours, Sonnet.

**You will see.** Faces are already on screen when Politics, People or a person card opens.

**Screenshot.** Before and after, from a drawn place, in the PR body.

**Rules.** Speed: never do per-open work that can be done once; the year's speed limit still holds. Replace, never layer: the slow per-face route is deleted, not kept beside the cache. Every figure is drawn from the person's own appearance record (people rulings), so the cache is keyed by the person and their look.

**Done when.** In a drawn place (place and seed named) in the bench at 1440×900, a browser check opens Politics → Government and People and fails if any face on screen is missing 300 milliseconds after the sheet opens; it passes, the measured times are in the PR body, and a screenshot taken at that moment lands in `docs/play-first/shots`. The owner plays it: faces are there when the menu opens.

**Files.** src/bench/ui/headshot.mjs, src/bench/handler.ts, src/bench/government.ts, src/bench/card.ts, src/bench/play.mjs

**Notes.** Filed by the CTO, Oct 29. Waits on `people-pack-v4` so the speed work is done on the faces that ship. Read: OWNER-DECISIONS (Oct 29; Oct 28 sitting point 12, "no initials in circles"); searched: headshot, bust, initials, load.
