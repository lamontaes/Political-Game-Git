---
id: play-journal-pop-up-appears-over-a-scene
title: "A journal pop-up appeared over the President's address; pop-ups are meant to wait until a scene ends (Blodgett Landing, New Hampshire)"
area: play
kind: bug
priority: 2
size: S
status: in-pr
standard: 2
claimed-by: claude/pool-play-journal-pop-up-appears-over-a-scene
pr: #8504
after:
blocked-on:
lead: play-first
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, "Reported done that is not done", item 12, and Pillar 4)
model: sonnet
effort: low
root: rc10-screens-keep-own-facts
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:57:01.485Z
---

**What.** Measured by the Nov 9 audit in Blodgett Landing, New Hampshire (a random world, no seed): "'Pop-ups wait until a scene ends.' A journal pop-up appeared over the President's address." It was the journal's third paragraph, which popped up during the address. The news pop-up was fixed for the opening (`showNewsSurface` now runs after `showStory` returns in `startLife`), but the journal's pop-up was not. Fix the cause in the one toast part, for every pop-up and every scene: when a scene opens, every pop-up on screen is taken down and waits, and shows again when the scene ends.

**Cause.** Found in code: `showToast` in src/bench/ui/toast.mjs (`sceneOpen` at line 16, early return at line 23, `showToast` at line 44) defers only pop-ups started while a scene panel is already open; `refresh` in src/bench/play.mjs (line 572) calls `renderJournalNote` (line 554), which shows the journal note as a toast, just before `startLife` opens the address, so a pop-up already up when a scene opens stays up for its eight seconds. Measured by the Nov 9 audit in Blodgett Landing, New Hampshire (no seed).

**Fix.** In the one toast part, take every pop-up down when a scene opens and show the waiting ones again when it ends; fold in the `startLife` ordering fix that covered only the news.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the fix goes into the one toast part that every pop-up uses, and the ordering fix in `startLife` that only covered the news is folded into it, not kept beside it. Owner, Nov 7, about 2:40 p.m. (docs/mocks/2026-11-07-approved/RULINGS-nov5.md, item 35): in a scene "the player card and the menu buttons are gone, not dimmed... News pop-ups wait until the scene ends", from his words "i think instead of dim during scenes it should be completed removed and have the dialogue take center stage." The approved pop-up mock is `docs/mocks/2026-11-08-front/renders/fr-notify_f.scene.1.jpg` ("small, gone in one click, held until a scene ends").

**Done when.** A second session starts the bench (`npm run bench`), starts a new game in a drawn place (place and seed named in the proof) and takes a screenshot at 1440×900 on every Continue of the President's address, then one more two seconds after it ends. No screenshot taken during the address may show the journal note, the news pop-up or any other pop-up; the screenshot after it must show the ones that were waiting. With dev mode it then forces one scene while a pop-up is on screen (the proof says which control) and screenshots the scene's first line: the pop-up must be gone, and back after the scene. A browser test opens a scene while a toast is showing and fails if the toast is still visible. The same check is then run in Blodgett Landing, New Hampshire, the audit's place (the audit gives no seed), as the named repro. The owner plays it: he watches the address with nothing popping up over it, and the journal line shows once he is home.

**Waits on.** Nothing.

**Files.** src/bench/ui/toast.mjs, src/bench/play.mjs, src/bench/ui/panel.mjs

**Notes.** From the audit's "Reported done" item 12 ("I checked each line below myself, in the game or in the code") and Pillar 4. Playtest point C5 of docs/coordination/playtest/2026-11-08-1.md ("News and journal pop-ups appear during the President's address. They should wait until the scene ends"); the check file's cause for it was the same on Nov 8: "ui/toast.mjs:43-49 holds only pop-ups started during a scene", and it noted that the earlier fix covered "the desk, meetings and election screens, not the opening". The scene panels the toast watches are the talk box plus `SCENE_PANELS` in `src/bench/ui/panel.mjs` (line 12). Related, filed Nov 10: play-opening-lands-at-830-pm (the same lines of `startLife`), play-journal-says-one-thing-three-times (what the pop-up said). Not verified by the audit: whether a news pop-up can still show over a scene other than the address; the code reading above says any pop-up raised just before any scene can.
