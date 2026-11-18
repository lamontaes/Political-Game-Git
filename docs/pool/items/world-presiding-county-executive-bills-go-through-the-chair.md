---
id: world-presiding-county-executive-bills-go-through-the-chair
title: "In the background world a presiding county executive (a commission county's probate judge) still brings bills by asking a member, though the played one now drafts as the board's chair"
area: world
kind: bug
priority: 3
size: S
status: open
standard: 2
after: play-county-executive-who-presides-over-the-board-sends-bills-through-a-member
blocked-on:
lead: laws
source: Carry follow-up, Nov 14, 2026 (the played side was fixed in the item named in `after`)
model: opus
effort: medium
root: rc7-player-cannot-drive
checked: carrier thread 2026-11-14
---

**What.** A simulated county executive who presides over the board brings a bill by asking the member most inclined to carry it, as an outside executive would, although the county's data says they chair the body. The class is every unattended executive whose office row says it presides, so the background and the played office read the same data. This changes what simulated counties pass, so the proof is a year-1 run. Feeds: play-county-executive-who-presides-over-the-board-sends-bills-through-a-member.

**Cause.** Found in code: `proposeAsExecutive` (src/core2/modules/legislature.ts, line 3614) reads only `proposalRight(api, office.kind)`, one national row per kind, and never the office row's `presidesOverBody` (src/core2/offices-local.ts, set from the county's own data); its caller is src/core2/modules/world-legislating.ts, line 594.

**Fix.** Where the office row presides, draft the executive's bill in their own name as the body's chair through `draftBill`, the way a member's is, and leave `proposeAsExecutive` for executives outside the body. Prove with year 1 and time per record at three pinned places, with and without.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the office row decides, never a named county. Replace, never layer. No dice. No new stopgap.

**Done when.** A second session runs year 1 at three pinned places with and without the change, names the drawn place and the county where a presiding executive's bill is drafted in their name and what the board did with it by record id, and shows the year's time per record unchanged.

**Waits on.** The item named in `after`.

**Files.** src/core2/modules/legislature.ts, src/core2/modules/world-legislating.ts

**Notes.** Look-first, Nov 14: searched docs/pool/items for presiding executive and chair; only the played-side item above.
