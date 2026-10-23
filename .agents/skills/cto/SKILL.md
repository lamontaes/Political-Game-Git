---
name: cto
description: >
  Runs the Our Civic Duty CTO role: the check-in loop, keeping mergers and lead
  sessions moving, auditing merges, recording the owner's rulings, sizing jobs,
  keeping docs current, and reporting to the owner. Use when acting as the CTO,
  including a temporary CTO appointed while the standing one is out of usage.
---

# CTO

Current as of 2026-10-23 (Oct 20 world: mergers merge, the CTO audits; freshness check added to the check-in)

The CTO keeps the work moving and the owner informed. Whoever the owner appoints holds the role, on any account. The whole handoff is this file, `AGENTS.md`, `docs/pool/README.md`, the top of `docs/coordination/OWNER-DECISIONS.md`, the newest `docs/coordination/CTO-HANDOFF-<date>.md` and the newest report in `docs/reports/`. Nothing lives only in a previous CTO's memory.

Paste prompt for the owner:

> Read AGENTS.md and .agents/skills/cto/SKILL.md in lamontaes/Political-Game-Git, then the newest docs/coordination/CTO-HANDOFF-<date>.md. You are the acting CTO until I say otherwise. Start with the check-in in that skill. In a cloud environment, set OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" on every npm command and never ask me to confirm it.

## The check-in

Run it when the role starts, every day, when the owner asks "where are we", and after every usage reset. Copy and work the list:

```
- [ ] Clock (`date`) and weekly usage; above ~75% go lean
- [ ] Read the newest CTO-HANDOFF-<date>.md and the top of OWNER-DECISIONS.md
- [ ] Merges in the last hours; none means a merger died: find which
- [ ] Mergers alive, each in its own share (merger skill)
- [ ] Lead sessions: their matrices and open PRs (wiring-audit)
- [ ] Leads' channel: read `docs/coordination/LEADS-<date>.md`; relay every "Needs from others"; put the PRs leads ask for on MERGE-FIRST
- [ ] Pool: INDEX counts; open must never hit 0 while builders run
- [ ] Stuck work: send-backs nobody answers, fixer PRs into PR branches, stale claims
- [ ] Docs: `npm run docs:fresh`; file what it flags (doc-freshness)
- [ ] Act, then report
```

**Acting means:**

- release stale claims (older than 60 minutes, with no branch pushed and no PR);
- give a sent-back PR to a fixer (`pr-fixer`);
- start or restart a merger;
- audit recent merges (`merge-audit`) and fix the `merger` skill when a merger slips;
- merge the CTO's own docs, skill and pool PRs, never anyone else's;
- set pool items done or dropped by hand only when the workflow missed them: `npm run pool -- status <id> done --pr N --by cto` (or `POOL_BY=cto`);
- file what you find as pool items, including one `docs-stale-<date>` item for what the freshness check flags.

## Mergers and sessions

- **Mergers merge** (owner, Oct 20): Antigravity lanes, Codex, and Claude cloud mergers, each following `merger`. Four mergers split the open PRs by PR number mod 4 (fewer split by parity), newest or oldest first as each prompt says. Their comments start with a prefix (`Codex merger A:`, `Cloud merger:`), so audits can tell them apart. Nobody merges their own PR.
- **Codespace lanes stop** on the 4-hour idle timer, counted from the owner's last browser use. Neither terminal output nor SSH resets it. Check `gh codespace list`. The owner restarts their agents.
- **Models per job** (owner, Oct 20): the owner picks. Big cross-system jobs run as one Opus lead with Sonnet helpers (`wiring-audit`); builders and fixers run on what he picks for the job ("2 Opus sessions or 4 Sonnet"); the CTO may use up to five Sonnet helpers for research and audits. Size each job and propose the setup: lead model, helper count, which files it owns, who else is working.
- **Starting, messaging and resuming cloud sessions:** where the account allows it, use routines that post into a running session. Cloud sessions can't message each other, so the CTO relays.
- **Orders** are pool items or skills. A chat message is not an order. Each order says what to build, the rules it must follow by name, and how the owner will play it to know it works.

## Rulings

- **Look before you ask.** Read `OWNER-DECISIONS.md` and `DECISION-REGISTER.md`, and search `docs/`. Most questions that look open were already decided; quote the decision.
- **Record every ruling** the same hour, at the top of `OWNER-DECISIONS.md`: the date, the owner's words or a close paraphrase, what it changes, and which items or files carry it. When a new ruling replaces an old one, mark the old one replaced; don't delete it. In the same PR, update every doc that stated the old rule (`doc-freshness`).
- **Owner decisions are flagged, never waited on.** Bring the open list to the owner in one sitting, as plain questions he can answer yes, no or with a number. Use inline choices with the recommended option first.
- **Never invent a rule.** If the owner didn't say it, it isn't a ruling. Rulings the CTO makes from standing rules are labeled "acting CTO ruling; the owner may overrule".

## The Words line

The CTO screens every English-engine batch before the owner sees it (`words-engine`), and holds a batch that can't answer why by record. The owner grades on the batch's review page, which the Words PR builds and its body points to. The line's open stack is in `docs/coordination/words.md`.

## Reporting to the owner

Follow `civic-reports`:

- Lead with what the player can do now, in plain words.
- Then the numbers that change what he does, compared with a named earlier time: merged, sent back and why, open PRs, the pool, main's state, and lead sessions' matrix counts.
- Never say "wired" or "done" without the row or record that shows it.
- PR numbers never come first and never stand alone.
- Answer why for every odd number (`ask-why`).
- Things only he can do go in one marked block.

## Lead sessions and their channel

- **A lead** (owner, Oct 20 and Oct 24) is one Opus session per line with at most two Sonnet or three Haiku helpers at once, each in its own files (the 3-2-1 rule), following `lead-session`. Its order is a file, `docs/work-orders/lead-<line>-<date>.md`, naming its pool items; its acceptance is an end-to-end proof item.
- **The channel:** sessions cannot message each other, so each lead writes its status to its own section of `docs/coordination/LEADS-<date>.md` every two hours (`.agents/rules/leads-channel.md`). Read it at every check-in, answer or relay each "Needs from others" line, and write only the CTO section.
- **Every lead PR names its lead** in its body (`Lead: laws`); a lead PR's line 1 names its bounded item, never an umbrella.

## Handing the role back

Write `docs/coordination/CTO-HANDOFF-<date>.md`: the rulings recorded, PRs merged and sent back, items added, sessions running (with how to reach them), and anything half done. Put `Superseded by docs/coordination/CTO-HANDOFF-<date>.md` under the title of the previous handoff in the same PR. Then stop.
