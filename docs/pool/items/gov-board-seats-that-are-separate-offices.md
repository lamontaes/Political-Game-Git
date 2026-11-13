---
id: gov-board-seats-that-are-separate-offices
title: "A township board whose seats are separate offices (supervisor, clerk, treasurer, trustees) is filed and counted as one pooled race of identical seats"
area: gov
kind: bug
priority: 2
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: rc10-screens-keep-own-facts
source: "Account lead T19, Nov 13, 2026, from elections-at-large-count-disagrees-with-per-seat-filing-and-ballot"
checked:
claimed-at:
---

**What.** In some states a township board is made of separate offices, each on its own ballot line: Kansas's township trustee, clerk and treasurer (K.S.A. 80-302), Michigan's supervisor, clerk, treasurer and two or four trustees (MCL 41.70, MCL 168.358), New York's supervisor beside the town council members (N.Y. Town Law § 24), Wisconsin's town board chairperson on its own line (Wis. Stat. § 60.30(1)(a)), and Connecticut's first selectman with a minority-representation limit on the other selectmen (Conn. Gen. Stat. §§ 9-188, 9-167a). The game makes each of these boards N identical seats with one title, and where they are up on one day the voting engine pools them into one "vote for N" race, so a candidate for treasurer can be seated as clerk, and every seat reads one title. Seen: the filing clerk, the Elections tab, the ballot paper and the seated members on Government in a drawn place in those states.

**Cause.** Found in code: `boardOffices` in src/core2/offices-local.ts makes one office of `board.seats` seats with `board.memberTitle` for a town or township, and `atLargeGroup` in src/core2/modules/elections.ts pools every seat of that office up on one day. The state rows in data/research/local-government/township-governing-bodies.json give one member title and a seat count, with no list of the board's separate offices.

**Fix.** Give a state row whose board is made of separate offices a list of those offices (title, how many, term, whether on the board), and have `boardOffices` make one office per title (the supervisor, clerk and treasurer as single-seat offices; the trustees as one office of their count), so each is its own race and only same-title seats pool. Connecticut's minority-representation limit is a rule on the count of the pooled selectmen (no party seats more than § 9-167a allows), read from the row. Delete the single-title board for those states.

**Time box.** 4 hours for one session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** One rule, all 56 places: offices come from the state row, never a state named in code. Research before building: quote each statute read. Replace, never layer: the pooled single-title board is removed where the row lists offices.

**Done when.** A second session plays a new life on main in drawn places whose state's board is made of separate offices (place and seed named), the offices on Government, the filing clerk, the ballot paper and the count each show the supervisor, clerk, treasurer or chair as its own race, trustees pooled only among themselves, and a played year seats each winner in the office they ran for.

**Waits on.** elections-at-large-count-disagrees-with-per-seat-filing-and-ballot (the term and stagger read from the same state rows).

**Files.** data/research/local-government/township-governing-bodies.json, src/core2/gov-rules/township-governing-body-rules.ts, src/core2/offices-local.ts

**Notes.** Filed by Account lead T19, Nov 13, 2026.
