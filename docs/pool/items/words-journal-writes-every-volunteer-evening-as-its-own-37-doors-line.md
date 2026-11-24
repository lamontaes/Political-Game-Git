---
id: words-journal-writes-every-volunteer-evening-as-its-own-37-doors-line
title: "The Journal says 'My sister Sierra knocked on 37 doors for me' five times, and every volunteer always knocked 37"
area: words
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
root: rc6-scenes-repeat
source: "Account lead T25 playtest, Nov 13, 2026 (Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train c39bbb71)"
checked:
claimed-at:
---

**What.** After a council campaign the Journal reads, among other lines: 'Sierra knocked on 37 doors for me' five times, 'My grandmother walked 37 doors for me' twice, 'My sister Haley walked 37 doors for me', and 'Little did I know what my sister Sierra would do next.' A stepped-in incumbent's Journal says 'A volunteer knocked on 33 doors for me' three weeks running. Seen: the Journal, the toast and the Journal's campaign chapter.

**Cause.** Found in code: volunteerShifts in src/core2/modules/campaigns.ts (line 2956) emits one volunteer-shift record per volunteer evening, each of the same hours, so the doors are the same each time. The journal.office-line-volunteer-shift pieces (data/english/parts/journal.json, line 9147) write one line per record. Measured: Danville, Iowa, seed 4b0fc31d-ba59-4168-8b84-d7c0e3f826b6, train branch c39bbb71 (Account lead T25, Nov 13, 2026).

**Fix.** The Journal folds a volunteer's evenings into one line per volunteer per race, with the total doors, written when the race closes or the volunteer stops. The fold is in the journal composer; the words stay the bank's.

**Time box.** 3 hours for one Sonnet session at medium effort. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** The same thing again is a finding (play-walks). No hand-written player text in code.

**Done when.** A second session runs a campaign with two volunteers on main in a drawn place, named with its seed, and the Journal names each volunteer's doors once, with a total that differs between them.

**Waits on.** Nothing.

**Files.** src/director/journal.ts, src/core2/modules/campaigns.ts
