---
id: lw12-election-state-landings
impact: minor
section: Added
title: A recorded term-limit bar now reaches the legislator it affects.
---

The state legislative term-limit path now has a person-level landing for an
incumbent whose saved candidacy-intent event records that the law barred them
from seeking another term. The landing uses the existing law-exposure history,
names the legislator and source event, records a nonmoney cost, and does not
create a new eligibility or candidacy decision. Replaying the writer is
idempotent.

Independent redistricting, automatic voter registration, and broadened local
authority still lack a saved individual exposure record that this batch can
consume. No aggregate turnout estimate is converted into an individual voter
decision.
