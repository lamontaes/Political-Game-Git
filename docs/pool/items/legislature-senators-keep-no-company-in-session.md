---
id: legislature-senators-keep-no-company-in-session
title: "Most state senators spend no free time with anyone during a session"
area: people
kind: bug
priority: 2
size: S
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: people
model: opus
effort: medium
root: none
source: Found by the lying thread, Nov 15 2026, measuring people-free-company-goes-to-one-tie on rooms and attendance (the Account lead asked for it as its own item)
---

**What.** At 4846968 (Texas) seed 8647-mason, with the state senate filled in and the player at seat 016, 28 of the 31 senators made no `contact-known-person` act with anyone from Feb 1 to Mar 31, 2025, during the session. The three who did (016, 022 and 024) made 22 between them, all with each other. A legislator in session still has evenings, and spends them with somebody: colleagues, the people they lodge near in the capital, the family they call. Seen: a senator's Journal and person card show no evenings with anyone for two months of session, and colleagues never grow closer outside the floor.

**Cause.** Found in code: officials outside the played town are tier `calendar` (src/core2/data/officials/officials.json, read by src/core2/modules/officials.ts `OFFICIALS_DATA.tier`), and a `calendar` person chooses only on the world's calendar dates (src/core2/calendar.ts, the `calendar` cadence reads `core.calendarDates`). Senators 001, 009, 015 and 023 last acted on Jan 20, 2025 and made no act of any kind in February. Only those in the player's focus choose daily (calendar.ts `hasDailyFocus`): 024 and 022, whose ties with the player 016 are fresh. So the session day's hours are not the cause. Counted from every relationship change notice (the lying thread's count script on ee4c3740), Feb 1 to Mar 31: senators made 22 visits, all among 016, 022 and 024.

**Fix.** A member of a body the player sits on chooses daily while the player sits there: in `hasDailyFocus`, read the legislature's own member index for the player's seat (no new list, no new parameter). Everyone else outside the town keeps the calendar cadence, as the two-level population rule says. Check the speed bar with the 30 more daily choosers at three places.

**Time box.** 2 hours for one Opus session at medium effort. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice, no cap. Wire to the world: proven in a played session with record ids.

**Done when.** At the named place 4846968, a pinned test with seed 8647-mason (about a minute, seen red on today's code) shows most senators keeping some company during the 2025 session, with the people named. A second session sees in dev mode on main a sitting senator's Journal with evenings spent with someone.

**Waits on.** Nothing.

**Files.** src/core2/calendar.ts, src/core2/modules/legislature.ts
