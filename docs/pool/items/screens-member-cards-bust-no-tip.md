---
id: screens-member-cards-bust-no-tip
title: "Government's member cards show a bust to the upper chest with a soft fade and carry no hover tip over the name"
area: play
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: screens
model: sonnet
effort: medium
root: none
source: added with npm run pool -- add
---

**What.** The owner, Nov 23 (P21), said: look at the tiny headshots. Their bodies are cut off. The CTO caught (C8) that the hover name tip covers the member name. The council list draws each member as a 46 px face crop with no shoulders, and the card repeats name, party and office in a hover tip that lands on the name.
Seen: Politics, Government, Members at 1440 by 900. Seen: Government, Members, bust with fade, after. Guards: member-cards-look.browser.mjs

**Cause.** Measured: `node src/bench/member-cards-look.browser.mjs` against `npm run bench` on main 2b7b3b28 fails "a member card carries a hover tip" (Garibaldi, Oregon). memberLayout in src/bench/ui/person-card.mjs calls drawFace with the default round crop (head only, face share 0.56) at 46 px, and sets title to name, party and line on the button.

**Fix.** Add a bust-small crop to src/bench/ui/face.mjs (head and shoulders, share 0.4), use it in memberLayout at 56 px with a bottom fade in play.css, and drop the title; add member-cards-look.browser.mjs.

**Time box.** 1 hours

**Rules.** Screen to mock: MENU-LOOK, a bust runs head to upper chest and ends in a soft fade. No hand-written player text; no label added.

**Done when.** A second session, in a drawn place and seed it names, opens Politics, Government and sees each member as a bust with shoulders and a soft fade, and no hover tip over a name; member-cards-look.browser.mjs passes.

**Waits on.** Nothing

**Files.** src/bench/ui/person-card.mjs,src/bench/ui/face.mjs,src/bench/play.css,src/bench/member-cards-look.browser.mjs
