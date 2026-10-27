# Assignments are SMART, questions come after reading (owner, Oct 26, 2026)

Every role follows this file. Skills point here instead of repeating it.

## Every assignment is SMART

An assignment is anything one session hands another: a pool item, a work order, a helper brief, a merger's send-back, a fixer's task, a lane handoff line, a channel "Needs from others" line. Each one states, in this order:

- **Specific:** the one thing to change, by file, record or screen, and what must not change.
- **Measurable:** the done-when as a check someone else can run (a test name, a command and its expected result, a screenshot of a named screen, a record id read by a named engine).
- **Attainable:** the smallest registered stopgap it may build against, and what it does not wait for.
- **Realistic:** the model it was sized for and the helper count (default: none).
- **Time-bound:** a time box in hours. When the box runs out, push what passes, set the item's state honestly with a one-line note, and stop.

An assignment missing any of the five is sent back to its writer, not worked. The pool item template (`docs/pool/README.md`) carries these five as fields; `npm run pool -- --check` flags an open item without a time box or a done-when.

## Look before you ask, with proof

No session asks the owner, registers a stopgap of kind `owner-decision`, or writes **OWNER DECISIONS NEEDED** until it has read, in this order, and names what it read:

1. `docs/coordination/OWNER-DECISIONS.md`, the whole file, newest first.
2. `docs/coordination/DECISION-REGISTER.md`.
3. `docs/coordination/prior-rulings/` for its area.
4. `docs/play-first/LAW.md` for anything the player sees.
5. A search of `docs/` and `docs/pool/items/` for the subject's words.

The question's text, in the PR body and in the stopgap's `why`, ends with `Read: OWNER-DECISIONS (<date of newest ruling read>), DECISION-REGISTER, prior-rulings/<file>, LAW; searched: <terms>`. A question without that line is a defect, and a merger sends the PR back for it. If a ruling exists, the session quotes it and builds it; it never asks again.

## Research is allowed and expected

Any session may research before building or asking: fetch real pages, read `data/research/`, run the `researcher` skill, read the design record. Research calibrates; it never decides an actor's outcome. A mechanic real life has and the simulation needs is built from research as a background simulation, calibrated not hardcoded, with no question to the owner (owner, Oct 24). Only design calls about the player's own experience reach him, and only after the reading above.

## Review is by a different session, not a different program

"Adversarial review" means the session that checks a change is not the session that wrote it. Any model and any program qualify, on any account. What makes it real: a fresh context, the changed-file checks run on the merged result, the PR body read against the item's done-when, and one attempt to break the claim (another seed, another drawn place, the break-it run). Nobody merges their own PR. A merger that merges without running the checks is a defect found by `merge-audit`.

## The crew (owner, Oct 26)

- **The game:** the owner with a local Opus session on the play-first lane, and the Words session on scenes and people, graded against Wildermyth (`OWNER-DECISIONS.md`, Oct 26).
- **The engines underneath:** one Opus lead for laws and effects together (one checker, one matrix), with at most two Sonnet helpers. Speed is one Sonnet job at a time. Traits rows live in the effects matrix.
- **Checking:** five or six Sonnet mergers by PR number modulo the count, in `MERGE-FIRST.md` order, lane first; one or two Sonnet fixers on send-backs.
- **The pool:** Sonnet workers on open bug items, one at a time, SMART.
- **The CTO** records rulings, keeps the merge order, audits the mergers, and sizes every assignment above.

Everything runs without the owner in the loop. A stop for the owner is a design call about his own play, written as a flagged decision with the reading line above, and the work continues on the simplest version.
