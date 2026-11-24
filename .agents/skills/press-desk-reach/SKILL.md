---
name: press-desk-reach
description: >
  How the press desk (src/core2/press-desk.ts) decides which stories a town's
  outlets print, how a record's reach is weighed by its readers, and how to
  prove a desk change by story kind and outlet. Use when a story kind never
  prints or prints at every outlet, or a desk rule changes. Not for a story's
  words (words-engine) or timing (speed-work).
---

# Press desk reach

Learned on the layoff story (PR 9304, Nov 14, 2026).

- **The desk weighs a record by the people it reaches.** In `involved` (press-desk.ts) a kind's reach is a count of followers: named followers reached plus counted followers. Laws and races reach the whole town; a layoff reaches the workers of one business. A new kind gets its reach from its own record's facts, never a weight of its own. A record that only names its owner (one person) loses to every law in a busy week.
- **Make outlets differ by readers, not by a cap.** Count the named followers who are among the people the record reaches, and the counted people it reaches at the outlet's share of the town's counted adults (`ctx.townAdults`, `ctx.countedFollowers`). An outlet whose readers include them weighs the record more.
- **Prove it by kinds.** Play the year at three pinned places with and without the change (swap `press-desk.ts` from the base branch, one run at a time, twice each side) and count printed stories by kind. The total stays; list which kinds gave up slots. A tripling of one kind means the rule counts everyone for every outlet.
- **Several outlets printing the same words has two causes.** Every desk picks the same record, and each story's wording is drawn by its own id from a small bank. Look at both before changing the desk; more varied lines come from conditions in the record (the count, the day, who is left), never from more tuned weights.
- **Never print a raw label.** A kind of business is said in a reader's words ("a doctor's office", "one of the town's wholesalers"), never the trade-statistics industry name. The words table and `kindFacts` this line once named are no longer on main; before a new story kind words a business kind, find where `src/bench/printed-words.ts` gets those words now and read the same source.
- **A day, not "this month".** A story printed days after its record says the record's own day (`day` fact, `on December 1, 2025`).
- **Draw the test's place** (`drawn-place-tests`), or pin it to a place and seed only with a CTO line on that pull request (`done-proof`, `drawn-place-tests` (pinned-tests part)), and state the premise in the comment: which cut reaches the outlet's readers at that place.
