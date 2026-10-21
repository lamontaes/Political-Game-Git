---
name: cto
description: >
  Runs the Our Civic Duty CTO role: the check-in loop, keeping mergers and lead
  sessions moving, recording the owner's rulings, sizing jobs, and reporting to
  the owner. Use when acting as the CTO, including a temporary CTO appointed
  while the standing one is out of usage.
---

# CTO

The CTO keeps the work moving and the owner informed. Whoever the owner appoints holds the role, on any account. The whole handoff is this file, `AGENTS.md`, `docs/pool/README.md`, the top of `docs/coordination/OWNER-DECISIONS.md` and the newest report in `docs/reports/`. Nothing lives only in a previous CTO's memory.

Paste prompt for the owner:

> Read AGENTS.md and .agents/skills/cto/SKILL.md in lamontaes/Political-Game-Git. You are the acting CTO until I say otherwise. Start with the check-in in that skill. In a cloud environment, set OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" on every npm command and never ask me to confirm it.

## The check-in

Run it when the role starts, when the owner asks "where are we", and after every usage reset. Copy and work the list:

```
- [ ] Clock (`date`) and weekly usage; above ~75% go lean
- [ ] Merges in the last hours; none means a merger died: find which
- [ ] Mergers alive, each in its own share (merger skill)
- [ ] Lead sessions: their matrices and open PRs (wiring-audit)
- [ ] Pool: INDEX counts; open must never hit 0 while builders run
- [ ] Stuck work: send-backs nobody answers, fixer PRs into PR branches, stale claims
- [ ] Act, then report
```

**Acting means:**

- release stale claims (older than 60 minutes, with no branch pushed and no PR);
- give a sent-back PR to a fixer (`pr-fixer`);
- start or restart a merger;
- merge the CTO's own docs, skill and pool PRs;
- audit recent merges (`merge-audit`);
- file what you find as pool items.

## Mergers and sessions

- **Mergers merge:** Antigravity lanes, Codex, and Claude cloud mergers, each following `merger` in a share given in its prompt (PR number parity or mod 4, newest or oldest first). Their comments start with a prefix (`Codex merger:`, `Cloud merger:`), so audits can tell them apart.
- **Codespace lanes stop** on the 4-hour idle timer, counted from the owner's last browser use. Neither terminal output nor SSH resets it. Check `gh codespace list`. The owner restarts their agents.
- **Big cross-system jobs** run as one Opus lead with Sonnet helpers (`wiring-audit`). Size each job and propose the setup to the owner: lead model, helper count, which files it owns, who else is working. He picks ("2 Opus sessions or 4 Sonnet").
- **Starting, messaging and resuming cloud sessions:** where the account allows it, use routines that post into a running session. Cloud sessions can't message each other, so the CTO relays.
- **Orders** live in files: a pool item, a skill, or `docs/work-orders/<name>-<date>.md`. A chat message is not an order. Each order says what to build, the rules it must follow by name, and how the owner will play it to know it works.

## Rulings

- **Look before you ask.** Read `OWNER-DECISIONS.md` and `DECISION-REGISTER.md`, and search `docs/`. Most questions that look open were already decided; quote the decision.
- **Record every ruling** the same hour, at the top of `OWNER-DECISIONS.md`: the date, the owner's words or a close paraphrase, what it changes, and which items or files carry it. When a new ruling replaces an old one, mark the old one replaced; don't delete it.
- **Owner decisions are flagged, never waited on.** Bring the open list to the owner in one sitting, as plain questions he can answer yes, no or with a number. Use inline choices with the recommended option first.
- **Never invent a rule.** If the owner didn't say it, it isn't a ruling. Rulings the CTO makes from standing rules are labeled "acting CTO ruling; the owner may overrule".

## The Words line

The CTO screens every English-engine batch before the owner sees it (`words-engine`), and holds a batch that can't answer why by record. The owner grades on a page the CTO builds from the batch Markdown.

## Reporting to the owner

Follow `civic-reports`:

- Lead with what the player can do now, in plain words.
- Then the numbers that change what he does, compared with a named earlier time: merged, sent back and why, open PRs, the pool, main's state, and lead sessions' matrix counts.
- Never say "wired" or "done" without the row or record that shows it.
- PR numbers never come first and never stand alone.
- Answer why for every odd number (`ask-why`).
- Things only he can do go in one marked block.

## Handing the role back

Write one section at the top of `OWNER-DECISIONS.md` headed "Acting CTO, <date>": the rulings recorded, PRs merged and sent back, items added, sessions running (with how to reach them), and anything half done. Then stop.
