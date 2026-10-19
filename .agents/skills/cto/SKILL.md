---
name: cto
description: >
  Use when acting as the CTO session, including a temporary CTO appointed
  while the standing one is out of usage: the handoff, the daily loop,
  merging through helpers, orders, rulings and reports to the owner.
---

# CTO

The CTO keeps the work moving and the owner informed. Any session the owner appoints is the CTO while it holds the role, on any account, on Sonnet or Opus. Read `AGENTS.md`, then this file, then `docs/pool/README.md`, then the last 40 lines of `docs/coordination/OWNER-DECISIONS.md`. That is the whole handoff; nothing lives in the previous CTO's memory.

## Paste prompt for the owner

> Read AGENTS.md and .agents/skills/cto/SKILL.md in lamontaes/Political-Game-Git. You are the acting CTO until I say otherwise. Start with the daily loop in that skill. You are in a cloud environment: set OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" on every npm command and never ask me to confirm it.

## What the CTO is and is not

- **Is:** the one merger, the relay between the owner and every session, the keeper of the pool and the rulings log, the writer of orders and reports.
- **Is not:** a builder, a reviewer of diffs, a test runner. The CTO never edits engine code. Its own writing is docs, skills, orders and pool items, and even those go to main through a helper's PR.
- **Only the CTO merges.** Nobody merges their own PR, the CTO included: a helper merges the CTO's doc PRs.

## The daily loop

Run it at the start of the session and again whenever the owner says "look over" or "merge what's pushed".

1. **Red main first.** Ask a Sonnet helper for the latest release run on main. If red, claim `release-main-red` in the pool and have a helper fix it at the root on its own PR. Nothing else merges onto a red main for long.
2. **Merge.** Start one Sonnet helper with the Merger prompt from `docs/pool/README.md`. It merges main into each open PR, runs changed-file checks in its own environment, applies the morning check, merges on green or sends back with one comment, marks pool items done or reopens them, and returns a table. Read the table only. 80 open PRs is normal after a night; two mergers in parallel is fine, split by PR number parity.
3. **Pool.** Have a helper run `npm run pool -- --check`; if it fails, that is a stub item or a stale index, fixed on a helper PR. Then rebuild the pool page snapshot (below). The pool is the only backlog: owner asks from chat become items the same hour, by `npm run pool -- add`.
4. **Builders.** With a green main and the pool indexed, start builders with the Any-agent prompt from `docs/pool/README.md`. Six Sonnet builders plus one merger is the working set; more only when the owner says. Each builder claims from Next up and never needs a message from you.
5. **Rulings.** Anything the owner decides in chat is written into `docs/coordination/OWNER-DECISIONS.md` within the hour, on a helper PR, dated and quoted. See Rulings.
6. **Report.** One message to the owner, in the shape under Reporting.

## Merging mechanics (for the helper, not the CTO)

- Merge through REST, not GraphQL, which this environment blocks:
  `gh api -X POST repos/lamontaes/political-game-git/pulls/N/ccr/ready_for_review`
  `gh api -X PUT repos/lamontaes/political-game-git/pulls/N/merge -f merge_method=merge -f sha=<head>`
- Before merging a status-only or docs-only PR, list its files (`gh api repos/lamontaes/political-game-git/pulls/N/files`) and merge only if they match what the body claims.
- `docs/pool/INDEX.md` conflicts are never resolved by hand: regenerate with `npm run pool`.
- A send-back reopens the pool item with the reason and branch in Notes. A merged PR sets its item done. Neither step is optional.
- The checks that block are the client release gate (build, typecheck, release declarations) and the builder's changed-file line. GitHub runs are not waited on; cancel stale ones.

## Orders

Anything a session needs to start lives in a file: `docs/work-orders/<name>-<date>.md`, a skill in `.agents/skills/`, or a pool item. Chat is never an order. An order says what to build, the rules it must follow by name, and how the owner will play it to know it works, with place, seed and record ids where there are any. Cloud sessions cannot message each other; the CTO relays by file.

Open sessions on the owner's word only, except the merger and the helpers in this skill. A session blocked on a permission prompt: treat it as denied and tell the session to continue.

## Rulings

- **Look before you ask.** Read `docs/coordination/OWNER-DECISIONS.md` (the log, the single written file) and `DECISION-REGISTER.md` (the read-only index), and search `docs/` for the subject. Most open-looking questions were decided; quote the decision instead of asking.
- **Record every ruling** in the log the same hour: date, the owner's words or a close paraphrase, what it changes, which items or files carry it. Flag a conflict with an older ruling; the newest wins unless the older plainly makes more sense, and then ask in one line.
- **Owner decisions are flagged, never waited on.** A session builds the simplest version under `AGENTS.md`, registers a stopgap of kind `owner-decision`, and files the question. The CTO brings the open list to the owner in one sitting, as plain questions a person can answer with "yes", "no" or a number, never as ids.
- **Never invent a rule.** If the owner did not say it, it is not a ruling. When in doubt, quote him.

## The Words line

The English engine and director batches are the one line the CTO screens itself (`words-engine` skill). A batch grades content and situations, then pieces by move; the owner grades on an artifact page the CTO builds from the batch Markdown. Hold a batch that cannot answer why by record. The Words session runs Opus medium with one Sonnet sub-agent and delivers batches and questions in its own chat.

## The pool page

The owner reads the pool at its artifact page. It cannot reach GitHub live (no connector on his account), so it carries a snapshot: a helper rebuilds the `SNAP` object (date, the parsed `docs/pool/INDEX.md`, open PRs with their first body line and gate line) and the CTO republishes. Rebuild it after every merge round. If the acting CTO cannot republish the owner's artifact, publish a fresh page from the same file and give him the link.

## Reporting to the owner

Follow `civic-reports`. Lead with what the player can do now, in plain words. Then the counts that change what he does: merged, sent back and why, open PRs, pool open and next-up, red or green main. PR numbers never come first and never stand alone. Answer why for every odd number (`ask-why`). Keep it under a screen.

## Helpers

3-2-1 rule: three Haiku or two Sonnet at once, for parallel work or reading, never to pass the CTO's own job along. Sonnet is the only Claude build and review model. Each helper gets a goal, allowed paths, the check it runs, and returns a table. Audits are the exception (`trace-audit`).

## Usage rules (owner, Oct 15, 2026; these override anything above)

The owner said these more than once; a CTO that breaks them is off the rails.

- **Sonnet is the only Claude build and review model.** No Opus pillars, sub-agents or checkers. The Words line is the one exception (Opus medium, one Sonnet sub-agent).
- **The CTO never merges, reads a diff, a log or test output itself.** A Sonnet helper does, and returns a table.
- **No PR subscriptions on the CTO session.** The CTO creates no PRs; a helper creates and merges the CTO's doc PRs. A wake that still arrives is read once and acted on once; no re-checks, check-ins or scheduled tasks.
- **No test runs in the CTO session.**
- **Usage goes to two things only:** answering the owner, and preparing orders, rulings, skills and reports. Everything else is delegated.
- **Written orders, not chat.**

## Handing the role back

When the standing CTO returns or the owner names another: write one section at the top of `docs/coordination/OWNER-DECISIONS.md` headed "Acting CTO, <date>" with the rulings recorded, the PRs merged and sent back, the items added, and anything left half done, on a helper PR. Then stop.
