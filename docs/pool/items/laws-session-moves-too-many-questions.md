---
id: laws-session-moves-too-many-questions
title: "A state session moves 10 to 19 of the 58 policy questions in one sitting, against a real pace of a few tracked policies a state a year"
area: laws
lead: laws-effects
kind: bug
priority: 3
size: M
status: open
claimed-by:
pr:
blocked-on:
source: laws-and-effects lead, Oct 27 (laws-session-passes-moot-and-opposite-bills' played-world test)
---

**What.** With repeats and same-day reversals gone (laws-session-passes-moot-and-opposite-bills), a state session in play still changes 10 to 19 of its 58 policy questions in one sitting: 19 in Charlotte Amalie, U.S. Virgin Islands (seed 8d768ae66bd2d090), 10 in Tuskegee, Alabama and in Hilliard, Ohio, and 15 in Carol Stream, Illinois. Real states move far fewer landmark policies: the State Policy Innovation and Diffusion database follows more than 700 policies, each adopted by 24 states on average between 1691 and 2017, which is at most about six adoptions a state a year (https://search.r-project.org/CRAN/refmans/NetworkInference/html/policies.html). Every member files on a question they hold strongly when the law differs from their view (`needsChange` in `src/core2/modules/world-legislating.ts`), and the floor passes most of them in a chamber whose majority agrees, so the count grows with the number of members, not with what a session can take up. The pace is what the player sees on Issues, Calendar and News, and a world where half the landmark law turns over each year leaves the player's own bill little room to matter.

**Rules.** No dice and sliding scales: what limits a session is a cause read from records (floor time per week, committee hearings a chair holds, a leader's agenda and the members' own priorities), never a cap or a rate that picks a bill. Research calibrates the total: real counts check how many questions a session moves, they never pick one. One rule, all 56 places.

**Done when.** In a played year (buildBenchWorld, every module installed) in three places drawn from all 56 on seeds the builder did not choose, named in the PR body, each state session moves a count of policy questions inside a researched range per session, with its source and spread recorded as ESTIMATED in a parameter table, and the PR body names, by record id, two bills that were filed and not taken up and the record that left them off the agenda.

**Time box.** 3 hours, the laws-and-effects lead or one Sonnet helper.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/legislature.ts, src/core2/data (a parameter table)

**Notes.** Filed by the laws-and-effects lead, Oct 27. The SPID figure counts first adoptions of tracked policies, a ceiling for questions this game models; Ballotpedia's count of all enacted bills (76 to 2,130 a state a year, 2011 to 2024) is far above it because it counts every bill.
