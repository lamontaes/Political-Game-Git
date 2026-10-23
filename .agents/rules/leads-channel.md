# The leads' channel

Current as of 2026-10-24 (owner, Oct 24: the leads need one place to talk; sessions cannot message each other)

Lead sessions and the sessions working beside them (the Words line, the delete) share one file on main: `docs/coordination/LEADS-<date>.md`, today `docs/coordination/LEADS-2026-10-24.md`. It is a channel, not a backlog: work still lives in the pool, rulings in `OWNER-DECISIONS.md`, and status of a piece of work in its item's Notes and its PR body.

## The rule

- **Each lead edits only its own section.** Never another section, the header or the rule list. The CTO writes only the CTO section.
- **Newest at the top of the section.** Add a status block above the previous one; never rewrite or delete an old block.
- **Every two hours** while the session runs, at the start and at the end, and whenever it needs something from someone else.
- **The shape, every time:** `Status (time): …` / `Needs from others: …` / `Decisions made: …` / `PRs: …`.
- **Commit straight to main** with the message `leads: <lead> status <time>`, the way pool claims push. A one-file commit to this file needs no PR and no gate. If the push is rejected because main moved, pull with rebase and push again (or re-read the file's sha and PUT again through the contents API); never force-push.
- **The CTO reads the file at every check-in,** relays each "Needs from others" line to the session that can answer, and puts the PRs a lead asks for on `docs/coordination/MERGE-FIRST.md`.
- **Every lead PR names its lead** in its body: `Lead: laws` (or traits, speed, m0-m2, effects, words, delete).
- **Nothing in chat.** An order is a file; an owner question goes in the PR body and `OWNER-DECISIONS.md`, Open.
