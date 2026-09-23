---
id: money-reads-as-dollars
impact: patch
section: Fixed
title: Money reads as dollars on the campaign screen
---

The campaign screen used to say "The committee has USD 0.00" and then, a line
later, "Your committee has $0.00." Every campaign line now writes money one
way, the way a person says it: a dollar sign, whole dollars without cents
("$35,410"), and cents only when there are some ("$17.03"). The summary after a
routine week does the same ("Received $72"), and it gives the day your shift
pay is due as a date you would say out loud, not a code like 2026-05-09.
