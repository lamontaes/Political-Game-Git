> **Owner, Oct 29 (second account):** "you're also your CTO and coordinator. So I know there's a rule where you can't message each other, but that was just for the other account because it kept asking me permission to message every time... you can message all the sessions, et cetera, and they can message you with questions for me." Sessions message the CTO and the CTO messages them; sessions never message one another. The files below stay the record: a message carries a question or a nudge, never a decision or a status that is not also written down. Supersedes the Oct 28 ban, which was about the first account.

# How we talk

Current as of 2026-10-29 (owner, Oct 29: sessions message the CTO and the CTO messages them; earlier: owner, Oct 24, the acting CTO's lane PR #5963)

A session sends the CTO its questions for the owner, its blockers and anything that needs a decision, and the CTO answers or relays. Sessions do not message one another. Three files on `main` stay the record: a status, a need, a ruling or a hand-off that is not in one of these files (or a PR body, a PR comment or a pool Notes line) was not said, whatever a message carried.

## The three files

| File                                    | What it is                                                                                                         | Who writes it                                                                                                  |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| `docs/coordination/LEADS-2026-10-24.md` | **The channel.** One section per role (Laws, Traits, Speed, M0–M2, Effects, Words, Play-first, Delete, CTO).       | Every role, its own section only, newest block at the top. Commit to main: `leads: <role> status <HH:MM UTC>`. |
| `docs/coordination/MERGE-FIRST.md`      | **The CTO's merge order.** Mergers read it before their share; the pr-fixer reads it to know what to finish first. | The CTO only.                                                                                                  |
| `docs/play-first/PROGRESS.md`           | **The lane's handoff log.** Where the last play-first agent stopped, `needs-from:` lines, newest first.            | Every play-first agent before it stops; the CTO reads it first at every pass.                                  |

## The rules

- **Shared files go to main directly**, never on a feature branch: `git checkout main`, `git pull`, edit your section, commit, push, back to your branch. If the push is rejected, pull with a plain merge and push again; never force-push. (Pool claims and status changes already work this way.)
- **Code goes on branches.** Nothing but these three files, pool item status changes and `OWNER-DECISIONS.md` (the CTO) is written to main outside a PR.
- **Edit only your own section** of the channel. Never touch another section, the header or the list of roles. Newest block at the top of your section; old blocks stay.
- **A need from another role is said twice:** a `Needs from others:` line in your channel section naming the role, the thing and the item or PR, **and** a pool item with `lead:` set to that role. One without the other is not a request. The lane's `needs-from:` line in `PROGRESS.md` is its handoff form of the same thing; the CTO turns it into the pool item if the agent did not.
- **Adopting someone's PR is said in both places:** your channel block names the PR and the branch, and the pool item's Notes carry the branch (claiming the item transfers the branch to you).
- **Every role reads the channel's CTO section at the start of each pass.** The CTO section is where rulings, reassignments, the freeze and the merge priorities are relayed; a role that did not read it is working from stale orders.
- **Every two hours** while you run, and whenever you need something, add a status block. The block's shape is at the top of the channel.
- **The CTO relays nothing by hand.** The pool item with `lead:` is what carries a need to its role. At each pass the CTO reads `PROGRESS.md`, then the channel, then rewrites `MERGE-FIRST.md`, and answers every `Needs from others:` line in its own section, addressed to the role that asked. A question a standing rule answers is ruled by the CTO and recorded in `docs/coordination/OWNER-DECISIONS.md`; only the owner's own calls go to him.
- **Rulings live in one place:** `docs/coordination/OWNER-DECISIONS.md` for the owner's and the CTO's rulings; `docs/play-first/LAW.md` for the game-as-played law the lane follows. The channel points at them; it never holds a ruling alone.

## What a block says

```
**Status (HH:MM UTC):** what changed since the last block, with counts from the matrix or the run.
**Needs from others:** <role>: what, and the item or PR; "none" if nothing.
**Decisions made:** what you decided under the standing rules, and the stopgap or item that carries it.
**PRs:** each open PR in your line, its item and its state (in review, sent back, merged).
```
