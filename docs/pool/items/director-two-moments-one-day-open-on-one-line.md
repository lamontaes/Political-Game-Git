---
id: director-two-moments-one-day-open-on-one-line
title: "Two moments on one day open on the same first line, word for word"
area: director
kind: bug
priority: 3
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: sonnet
effort: medium
root: none
source: "Second reader's read of #9585, relayed by the Account lead, Nov 15, 2026"
checked:
claimed-at:
---

**What.** On one morning the player gets two moments about the same bill, and both open on the identical first line. In Sheridan, Wyoming on March 5, 2025, the board's vote and the bill's failure both read "It's early on March 5. You stay in, thinking about the Health and Hospitals Funding Reduction Ordinance." The player reads the same sentence twice and cannot tell the two apart. Seen: the story and scene a moment opens, its first line.

**Cause.** Needs cause. Looked at: Sheridan, Wyoming (5669845), seed 7, the selectboard member person_0f713cf2e3e20027, played 120 days through the player's presses at 98f61441 (script /tmp/claude-0/arrival/hunt.mts in the election-results thread's container, /api/story narration[0] for each moment). The two moments are `...:2025-03-04:office.voted:bill:office:gus2025:212989:board...` and `...:2025-03-04:bill-failed:bill:office:gus2025:212989:board...`. Both are home-alone arrivals whose `happened` fact is the same bill, and the piece is drawn by a hash in src/english/grounded-english.ts. Not yet known: whether the director should stage both on one day at all, or fold them into one.

**Fix.** None until the cause is found.

**Time box.** 2 hours for a Sonnet session.

**Rules.** Scene standard: a scene exists only if it writes something back, and two that say the same thing on one day are one scene. No hand-written player text: any new opener comes from the Words lead's bank. One rule, all 56 places.

**Done when.** A second session plays a seated official in a drawn place, named with its seed, for three months on main. Through the stories and scenes the player reaches, it finds no two moments on one day whose first lines are the same sentence.

**Waits on.** Nothing.

**Files.** src/director/scene.ts, src/english/grounded-english.ts, data/english/parts/scene-words.json

**Notes.** None.
