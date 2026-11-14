---
id: play-governor-chambers-are-named-plain-senate-and-house
title: "A governor's bill menu names the chambers just 'Senate' and 'House of Representatives', with no state, while the Calendar says 'State Senate' elsewhere"
area: play
kind: bug
priority: 3
size: S
status: open
standard: 2
after: play-bill-menu-for-mayors-and-governors
blocked-on:
lead: words
source: Second words reader's read of the #8341 carry (PR #9151), Nov 14, 2026
model: sonnet
effort: medium
root: rc7-player-cannot-drive
checked: carrier thread 2026-11-14
---

**What.** On a governor's Your office the body a bill goes to reads "Senate" or "House of Representatives" alone, the same plain title the bench shows a state senator for their own body, while other screens say "State Senate" or name the state. A reader cannot tell whose Senate it is. The class is every state and territory legislature title on every screen that reads the office title, not the governor menu only. Seen: Politics, Your office, Draft a bill, as governor, the body heading.

**Cause.** Found in code: `bodiesOf` (src/bench/legislature.ts) titles an executive's body with `body.bodyName ?? body.governmentName`, and `seatedBody` titles a member's with `office.title`; the state chambers' office rows carry the plain titles "Senate" and "House of Representatives" (office:US-AL:legislature-upper, probed in a Nov 14 world), with no government name beside them.

**Fix.** Title a chamber through the one place that names a body for the Calendar (area-names), with the state's own name where the title alone would be ambiguous, for both the member's and the executive's screens, and delete the second way of naming a body.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: the state's name comes from the place record, never typed. Replace, never layer. Words are the Words lead's; names come from the English engine.

**Done when.** A second session plays a governor and a state senator in two drawn places (names places and seeds) and both screens name the chamber with its state the way the Calendar does.

**Waits on.** PR #9151 (or #8341) folding into the train.

**Files.** src/bench/legislature.ts, src/english/screen-words.ts

**Notes.** Look-first, Nov 14: searched docs/pool/items for chamber names; none found. Pairs with the Words lead's body-name reads.
