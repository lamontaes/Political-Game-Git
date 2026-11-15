---
id: elections-no-seat-is-left-without-a-filer
title: "Every seat a new player can enter already has another filer, so the player is never alone on a ballot and the unopposed-win lines are never said"
area: elections
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: elections
model: opus
effort: medium
root: none
source: Account lead measurement, Nov 15, 2026 (journal player-race test)
---

**What.** In 12 fixed draws a new life that watches the filing counter week by week never meets a seat with no other filer. About 100 contests at 9 places were looked at, and the fewest other filers on any seat at the last look before it closed was 1 (5 at Washington, D.C.); three places had no race the player could enter in 104 weeks. So the ballot and the race list never show a seat with no candidate or with only the player, and a player cannot win a race nobody else ran in. Seen: the Journal's line for the player's own unopposed win (`journal-own-unopposed-win-silent`) can never be said, and the same holds for any race where the player is alone on the ballot.

**Cause.** Measured: seeds `jpr-pin:0` to `jpr-pin:11` (`drawPlace(seed, "journal-player-race:0")`) (places Greene ME, As Teo MP, Woodruff UT, Newry SC, Washington DC, Ashaway RI, Kappa IL, McKinney KY, Fenwick Island DE, New Llano LA, Kingston RI, Kalida OH), on the Train b22cd35098, a new life each, stepped one week at a time for up to 104 weeks, counting filings that were not withdrawn by anyone but the player on each open race the player was eligible for, keeping the last count before the race closed. Weekly looks, so a seat that stood empty for days and filled on the last day would also show 1, and 12 draws is a small set. Needs cause: why no seat is left empty (the incumbent standing again, an open-seat ask, or the candidacy weighing of the town's adults), and whether the earlier Oct 20 measurements of empty local seats (`elections-local-races-too-uncontested`) still hold; the seat-by-seat count of filers at the deadline in a played year at 12 places is the first read and belongs to whoever takes this item.

**Fix.** Needs cause. Read the seat-by-seat count first. Whatever it shows, do not add a rule that empties seats: a seat has no filer only when the people who weigh it all stay out on their own reasons (the stay-out weighing in `candidacy.ts`), so the first question is whether those reasons let any seat go unfilled today.

**Time box.** 4 hours for one Opus session for the read, then size the fix.

**Rules.** No dice (`no-dice`): whether a seat is filled follows the people's own reasons, never a typed share of empty seats. Estimate, never UNKNOWN (`estimate-not-unknown`): a share of empty seats, if one is used to check totals, is labeled from memory or sourced, and never decides one seat.

**Done when.** A second session plays a drawn place named with its seed on main to a filing deadline and reads the count of filers per seat from the Elections tab, and either sees a seat with only the player or no one on the ballot, or the item's Notes name why none can occur; the unopposed-win lines listed in Notes are seen said in a played world or deleted in the same pull request.

**Waits on.** Nothing.

**Files.** src/core2/modules/candidacy.ts, src/director/race-margin.ts, src/bench/election-night.ts, src/bench/results.ts, src/bench/printed-words.ts

**Notes.** The lines and code paths that say "alone" or "unopposed" today, composed and not seen said for the player: `src/director/race-margin.ts` ("alone" when the result has one name, used by the Journal's own-race line), `src/bench/election-night.ts` (`returns-unopposed`), `src/bench/results.ts` (`unopposed`, one name in `totals`) and `src/bench/printed-words.ts` (the paper's `unopposed`). They can be said for a race with one name that is not the player's (an incumbent alone), which my reads did not play to, so whether any played path says them today is unread; they are composed for the player and never said. Twins read: `elections-local-races-too-uncontested` (open, the share of uncontested local races, measured Oct 20 as too high) and `gov-open-mayor-seat-draws-nobody`; neither counts empty seats from a new player's side. Found while pinning the journal player-race test; see `journal-own-unopposed-win-silent`.
