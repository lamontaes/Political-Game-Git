---
id: gov-chamber-vacancy-fills-what-the-leaver-held
title: "A chamber whose seat changes hands mid-term fills only the posts and committee seats the leaver held"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
blocked-on:
source: "the Account lead and the Skills thread, Nov 15: the played year at Vilas, SD (place 4667340) spends 1.6 s organizing Congress, nine times, and prints a 'chamber organized' story each time"
claimed-at:
after:
lead: speed
model: opus
effort: medium
root: rc5-full-detail-every-day
---

**What.** Whenever one seat in a chamber changes hands, the whole chamber organizes again: every leadership post is elected anew, every committee is seated anew and the paper prints that the chamber chose its leaders. The player sees a speaker, a majority leader or a committee chair change when only a back-bencher left, and Congress prints that story about nine times a year. Seen: the played year at Vilas, South Dakota (place 4667340), where the two federal chambers organized 9 times and the House's leaders and committees were reshuffled at each.

**Cause.** Measured: in the played year at Vilas (place 4667340, seed c200623d61b817cdbdbb9e459ce67a3c381f9d7893848b5e1a43ce0ef2ac9716), `organize` in `leadership.ts` keys its work on the chamber's member list alone, so any change empties the posts and committees and runs `organizeNow` over every member (1.65 s over 9 organizings at Vilas; 1.58 s over 6 at Edmore, North Dakota, place 3822340). Owner's ruling of Oct 14 on replacement (OWNER-DECISIONS.md, "Replacement means every role"): a seat follows its vacancy rule and no role stays empty; spec b10 holds the races on the organizing day. Nothing in the record says a vacancy re-elects the leadership.

**Fix.** `organizeNow` keeps the posts and committee seats whose holders still sit and fills the rest through the same `elect` and `appoint` calls: a post whose holder left is elected again among the members, a committee seat the leaver held goes first to a member who arrived since, then to the best rated, under the same party ratio and cap. A new term (the nearest term end among the members moved), a majority that changed hands, or the player's own stand or vote organizes the body in full. The paper's `chamber-organized` event names the posts that changed hands only.

**Time box.** 4 hours for one Opus session at medium effort. When it runs out, write what was read in this item and stop.

**Rules.** Serves the Oct 14 replacement ruling. No dice: the same ratings decide each fill. The same rule for every chamber, from data; nothing named by place or level.

**Done when.** At Vilas (place 4667340, seed c200623d) a test removes the holder of the South Dakota House's presiding post in the middle of a term and shows that post changed hands, every other post and every committee the leaver was not on kept its holder and day, the arrival sits where the leaver sat and the paper got one `chamber-organized` event for that one post; a body whose majority changed hands organizes in full; and a second session on main, in a drawn place and seed it names, times the played year lower and sees the paper print a changed post once.

**Waits on.** The Words lead's ruling on the printed line "The {body} organized and chose {name} to lead it." for a one-post refill (drawn for a speaker or presiding fill, 11 of 60 outlet ids). The player sees the change in the paper's chamber story and in a speaker, leader or committee list that no longer reshuffles when a back-bencher leaves. No played flip of a majority was reached at Vilas, so that case is a check of the vacancy writer only.

**Files.** src/core2/modules/leadership.ts; src/core2/leadership-vacancy-fill.test.ts (new)
