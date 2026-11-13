---
id: laws-session-moves-too-many-questions
title: "A state session moves 10 to 19 of the 58 policy questions in one sitting, against a real pace of a few tracked policies a state a year"
area: laws
lead: laws-effects
kind: bug
priority: 3
size: M
status: in-pr
standard: 2
claimed-by: claude/project-thread-jmnnjg
pr: #8967
blocked-on:
source: laws-and-effects lead, Oct 27 (laws-session-passes-moot-and-opposite-bills' played-world test)
after:
model: opus
effort: medium
root: rc1-world-outside-town
checked: fable 2026-11-10
claimed-at: 2026-11-12T23:48:52.016Z
branch: pool/laws-session-moves-too-many-questions
---

**What.** With repeats and same-day reversals gone (laws-session-passes-moot-and-opposite-bills), a state session in play still changes 10 to 19 of its 58 policy questions in one sitting: 19 in Charlotte Amalie, U.S. Virgin Islands (seed 8d768ae66bd2d090), 10 in Tuskegee, Alabama and in Hilliard, Ohio, and 15 in Carol Stream, Illinois. Every member files on a question they hold strongly when the law differs from their view (`needsChange` in src/core2/modules/world-legislating.ts), and the floor passes most of them in a chamber whose majority agrees, so the count grows with the number of members, not with what a session can take up. The pace is what the player sees on Issues, Calendar and News, and a world where half the landmark law turns over each year leaves the player's own bill little room to matter. For context only, the State Policy Innovation and Diffusion database follows more than 700 policies, each adopted by 24 states on average between 1691 and 2017, at most about six adoptions a state a year; that figure is reported next to the game's count, not used as a pass line. Seen: Issues, Calendar and News: a state changing 10 to 19 of its questions in one sitting.

**Cause.** Found in code: `needsChange` (line 320) in src/core2/modules/world-legislating.ts lets every member file on any question whose law differs from their view, and the floor passes most of them; nothing limits a session by floor time, committee hearings, a leader's agenda or members' priorities.

**Fix.** Limit a session by causes read from records (floor time per week, committee hearings a chair holds, a leader's agenda, members' own priorities), and report the count of questions moved without asserting a range.

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice and sliding scales: what limits a session is a cause read from records (floor time per week, committee hearings a chair holds, a leader's agenda and the members' own priorities), never a cap or a rate that picks a bill. Research calibrates the total: real counts check how many questions a session moves, they never pick one. One rule, all 56 places. Ranges are not targets (owner, Nov 8): the researched session pace is reported beside the count and never fails a run.

**Done when.** A second session, not the builder, plays a year in three drawn places on seeds nobody chose and sees, for each state session, the count of policy questions it took up reported next to the researched pace, with its source; no check fails on the count. What limits the count is a record: the PR names, by record id, two bills that were filed and not taken up and the record (floor time, a committee hearing, the leader's agenda or a member's priority) that left them off the agenda.

**Waits on.** Nothing.

**Files.** src/core2/modules/world-legislating.ts, src/core2/modules/legislature.ts, src/core2/data/parameters.json

**Notes.** Filed by the laws-and-effects lead, Oct 27. The SPID figure counts first adoptions of tracked policies, a ceiling for questions this game models; Ballotpedia's count of all enacted bills (76 to 2,130 a state a year, 2011 to 2024) is far above it because it counts every bill.

Released (2026-11-12): Hydrogen stopped by the owner; Account lead T8 continues on claude/project-thread-jmnnjg. Continue on branch pool/laws-session-moves-too-many-questions.
