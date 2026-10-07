Board: issue #2424 (from Oct 6 3:15 a.m.; #2052 is full)

## Standing rule (owner, Oct 5)

NEVER STOP WORK WAITING ON THE OWNER. When a decision is open, build everything that does not depend on the answer, plus the switch for it (a data row, a setting, or one function with the options stubbed), log the question in the docket, and keep building.

## Overlap (owner, Oct 6)

Others may touch this file; work anyway; whoever merges second rebases; message the owning session directly with specific questions and keep building. Never post a claim or wait for a release.

## Asking another session (Oct 6)

Cloud sessions have no direct message tool. The direct channel is a board post on GitHub issue #2424 starting "@Session N:" with the exact question. The default answer is docs/codex/assignments/INTERFACES.md: read it first. Never wait for the reply; stub the seam with the shape INTERFACES.md gives and keep building.

## KEEP BUILDING (owner, Oct 6 1:55 a.m.)

If the coordinator, the board or the CTO goes quiet, keep building. When your part is done, take the next unclaimed pool item from docs/codex/assignments/POOL.md (law batches LW-xx, traits T1–T13 and per-trait items, bank parts, audit items AU-xx, placeholders PH-xx) and post "Session N takes X". Before every pause, push your branch and leave a resume marker: docs/codex/progress/session-<N>.md (what is done, what is next, the exact next command), plus a "PROGRESS:" note in the PR body. If your machine restarts, read your marker and continue. Stop only when the pool is empty.

## Subagents (owner, Oct 6)

Traits and law batches are subagent work: the coordinator and any session with subagents fan out, one subagent per trait (no prerequisite; own file per trait) and one per law batch, each one PR.

## Luna subagents for everyone (owner, Oct 6 2:13 a.m.)

Every session, not only the coordinator, may launch Luna subagents to work pool items in parallel (per-trait items, law batches, placeholder chunks, bug items): one subagent per item, one PR each, claimed in POOL.md first.

## Pool open to everyone (owner order, Oct 6 8:10 a.m.)

- Every pool item is open to any session. A claim reserves nothing unless that session posted progress on board #2424 in the last 60 minutes; stale claims expire after 60 minutes without board progress. Take the next open item, post "takes <id>" on #2424, work, PR, repeat.
- Trait items need no T9-0: each trait writes its own file under the trait-reader folder; the first trait PR to merge adds the loader; later ones only add their file.
