---
id: play-new-game-and-creator-open-without-busts
title: "New game is two bare words in a box and the creator opens with no figure, where the approved front screens show busts (audit's New Hampshire life)"
area: play
kind: bug
priority: 2
size: M
status: in-pr
standard: 2
claimed-by:
pr: #8526
after:
blocked-on:
lead: screens
source: Fable audit, Nov 9, 2026 (docs/audits/fable-vision-2026-11-09.md on branch audit/fable-vision, Pillar 6, "Not fixed (measured)")
model: sonnet
effort: medium
root: rc10-screens-keep-own-facts
checked: fable 2026-11-10
---

**What.** Measured by the Nov 9 audit: "New game is two bare words in a box with no busts. The creator opens as one large Start a life box with no figure in it until a gender is picked." The audit's browser life was in Blodgett Landing, New Hampshire (no seed); these are the screens before a world exists. The owner said the same on Nov 8 (v0.94.0): "why aren't the busts in?" Fix the class: every front screen that shows a person shows a bust from the one face part, from the first moment the screen opens, and New game shows its two choices as the approved render draws them. If the bust art for men is still not in the pack, build with the round pack headshots the menus already crop, registered as a stopgap, never a full figure.

**Cause.** Found in code: `#front-new` in src/bench/play.html (line 123) is two text buttons, Start a life and Advanced, with no picture; the creator `#cr-screen` (line 222) draws full-length `#cr-portrait` and `#cr-portrait-work` (lines 226 and 232), filled by `showLook` in src/bench/play.mjs (line 5851) and empty until a look exists. Seen by the Nov 9 audit and by the owner on Nov 8.

**Fix.** Show a bust from the one face part from the first frame on New game and the creator, matching the approved front mocks (docs/mocks/2026-11-08-front, fr-new and fr-creator); delete the full-length pictures and their styles; use the round pack headshots as a registered stopgap if the men's busts are not ready. Leave the creator's color arrows as they are (arrows on single-value steppers stay).

**Time box.** 8 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Replace, never layer: the two full-length creator pictures and their styles are deleted in the same change that puts the bust in, and the PR body counts what was removed. Owner, Nov 7, about 4:50 p.m. (docs/mocks/2026-11-07-approved/RULINGS-nov5.md, item 50): "No, remember, we're going to keep the busts because that's easiest to do... The full body, we keep coming with problems with that." Owner, Nov 8, about 1:35 a.m.: the front mocks are conditionally approved (docs/mocks/2026-11-08-front, `fr-new` and `fr-creator`: "One screen, a bust only"). The screen-to-mock skill applies: the approved render and the after screenshot go side by side in the PR body.

**Done when.** A second session starts the bench (`npm run bench`), opens the title, clicks New game and takes a screenshot at 1440×900; then clicks Start a life and takes a second screenshot before touching any control. The New game screenshot must match `docs/mocks/2026-11-08-front/renders/fr-new.jpg` in what it holds (the two choices with their busts, no empty box around two words). The creator screenshot must show a bust in the figure column from the first frame, and must not show a full-length figure or an empty figure column. The session then picks each gender in turn and confirms the bust changes and no second figure appears, and starts the life in a drawn place (place and seed named in the proof) to confirm the creator still begins a game. The same two screenshots are taken once more on the way into Blodgett Landing, New Hampshire, the audit's place (the audit gives no seed), as the named repro. The owner plays it: he clicks New game and sees faces on both choices, and the creator shows his character's bust the moment it opens.

**Waits on.** The owner's decision on how busts are shown (docs/coordination/OWNER-DECISIONS.md, Nov 10, "Staging waits for busts": "I haven't decided how they're going to display yet"). The approved front mocks (docs/mocks/2026-11-08-front, fr-new and fr-creator) show where a bust goes; build once he has said how it is drawn. Men's bust art may force a registered stopgap.

**Files.** src/bench/play.html, src/bench/play.mjs, src/bench/play.css, src/bench/ui/strips.mjs, src/bench/ui/face.mjs

**Notes.** From the audit's Pillar 6, re-checked in the game. Playtest points P3, P4, P5 and C1 of docs/coordination/playtest/2026-11-08-1.md; the check file says the front ports (the Fixer's Nov 8 PRs) "left out the busts, the creator's arrows, Play as with busts, the world settings as figures and the loading story", and that "no session owns putting busts in the game" (women's busts accepted Nov 7; the men's three-quarter heads unfinished on Nov 8). So the art may be the blocker: if the bust art for men is still not in the pack, say so in a one-line note and build with the round pack headshots the menus already crop, registered as a stopgap, never a full figure. Related: play-one-person-shows-two-faces (one face part for every screen, filed Nov 10), play-your-life-draws-a-full-body-figure (filed Nov 10). The creator's color rows now step with arrows (`src/bench/ui/look-row.mjs`, line 48), which waits on the open question "Arrows on single-value steppers" (OWNER-DECISIONS, Open, Nov 9); leave them as they are. Not verified by the audit: whether Advanced, Play as shows busts.

**Notes (Nov 11, 2026, built).** Built in #8526 on the bust bank (art/busts/v1), after the owner ruled on Nov 10 how people are shown (busts; full bodies after early access). The creator offers what the bank paints (skin, hair, facial hair), registered as SG-PLAY-creator-bust-choices; the color arrows this item said to leave are gone with the colors, because a bust shows none. The two screens come before a place is chosen, so the Blodgett Landing shots are the same screens; the second session takes them.
