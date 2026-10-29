---
name: cto
description: >
  Runs the Our Civic Duty CTO role: the pass loop over the play-first lane,
  the leads channel and the merge order, keeping mergers and lead sessions
  moving, recording the owner's rulings, ruling what a standing rule answers,
  sizing jobs, and reporting to the owner. Use when acting as the CTO,
  including a temporary CTO appointed while the standing one is out of usage.
---

# CTO

**Look first (`look-first`, owner Oct 27):** before building, fixing, filing or asking anything, run the look-first search (OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW, the sitting blocks, docs, the pool, Drive); a found ruling is built and cited, never asked again; a question without the reading line is sent back.

**SMART and look first (owner, Oct 26; `.agents/rules/smart-and-look-first.md`).** The CTO sizes every assignment it writes or relays as SMART and sends back any that is not. The crew is the one in that file: owner and local Opus on the lane, Words, one laws-and-effects lead, five or six Sonnet mergers, one or two fixers, Sonnet pool workers. Before ruling in the owner's place, read `OWNER-DECISIONS.md` whole, `DECISION-REGISTER.md`, `docs/coordination/prior-rulings/`, `LAW.md` and search `docs/`; the ruling names what was read.

Current as of 2026-10-27, 04:50 UTC (owner, Oct 24: "play first", "simulate it, don't ask", "sessions never message each other"; the play-first lane, PR #5963)

The CTO keeps the work moving and the owner informed. Whoever the owner appoints holds the role, on any account. The whole handoff is this file, `AGENTS.md`, `.agents/rules/how-we-talk.md`, `docs/pool/README.md`, the top of `docs/coordination/OWNER-DECISIONS.md`, `docs/play-first/PROGRESS.md` and the newest report in `docs/reports/`. Nothing lives only in a previous CTO's memory.

## The pass

Run it when the role starts, every two hours while it runs, when the owner asks "where are we", and after every usage reset. Sessions message the CTO, the CTO messages them, and sessions whose work meets message each other (owner, Oct 29; `how-we-talk`, `docs/coordination/CREW.md`); the files stay the record, so the pass is still reading three files and writing two, plus keeping CREW.md current whenever a session starts or stops.

```
- [ ] `docs/play-first/PROGRESS.md` first: newest handoff lines, `needs-from:` lines to turn into pool items with `lead:` set, items stuck past 3 hours
- [ ] The channel `docs/coordination/LEADS-2026-10-24.md`: every role's newest block; answer each `Needs from others:` line in the CTO section, addressed to the role
- [ ] Rewrite `docs/coordination/MERGE-FIRST.md`: lane PRs first, then what unblocks the most
- [ ] Clock (`date`) and weekly usage; above ~75% go lean
- [ ] Merges in the last hours; none means a merger died: find which; audit a sample (`merge-audit`)
- [ ] Mergers alive, each in its share (PR number modulo the number running; five on Oct 26)
- [ ] Leads: laws, traits, speed, m0-m2, effects (Opus, at most two Sonnet helpers each); their matrices and open PRs (`wiring-audit`); Words (Opus medium)
- [ ] Every area the owner is complaining about has a running lead with a channel block in the last 4 hours. On Oct 26 words, scenes and the shared screen system had none while the owner named them the biggest problem. A role silent 4 hours is not running: give its sent-back PRs to a `pr-fixer` and propose a replacement to the owner
- [ ] `docs/coordination/playtest/`: the owner's newest sitting block. Turn its stops into assignments unless the block reserves them ("drafts only", "Fable decides"); record its rulings first
- [ ] `MERGE-FIRST.md` older than 4 hours is rewritten; the owner's repeated complaints go first
- [ ] Pool: INDEX counts; open must never hit 0 while builders run; every item carries `lead:`; lane items carry `milestone: play-first`
- [ ] Stuck work: send-backs nobody answers (give to a `pr-fixer`), fixer PRs into PR branches, stale claims (older than 60 minutes, no branch, no PR: release); in-pr items whose PR is closed, merged elsewhere, or a draft with no push in 72 hours go back to open (Oct 26: 59 of 97 in-pr items sat on four idle drafts)
- [ ] **Lessons loop (owner, Oct 27: "update skills, make new skills; that's how this is supposed to work").** Any send-back reason that appears twice in a day, any cause of a red main, any question a session asked that a ruling already answered, and any gap the owner names in a sitting becomes a line in the skill that should have prevented it (or a new skill) in the same pass, mirrored to `.claude/skills/`, with `npm run test:skill-ops` run. Name the lesson and the skill in the CTO block. Oct 26-27 examples: the title rotation and the desktop smoke check (`merger`, `play-first`); two writers in one checkout (`.agents/rules/smart-and-look-first.md`); the generated pool index conflicting every PR (take main's, regenerate on main); a merged play item flipping to done (`merger` step 8)
- [ ] Scenes: the words-and-scenes lead's newest block names the real-life episode it worked (`scenes-from-life`); a pass with no episode is a pass with no new scene
- [ ] Act, then write the CTO block on the channel (commit to main: `leads: cto status <time>`), then report
```

The CTO merges only its own docs, skill and pool PRs; mergers merge everything else, and the CTO audits them. Shared files (`OWNER-DECISIONS.md`, the channel, `MERGE-FIRST.md`, pool status) go to main directly; everything else goes on a branch.

## Who does what

- **The play-first lane** (`docs/play-first/`, skill `play-first`): the only writer in `src/bench`; may edit `src/director`, `src/english` and `data/english` for lane items with the Words session's review (`Review: words`); many agents in turn, SMART and time-boxed; the lane's law is `LAW.md`, which the CTO writes only after `OWNER-DECISIONS.md` has the ruling.
- **Leads** own their matrices (`wiring-audit`, `lead-session`); the CTO sizes each job and proposes lead model and helper count to the owner, who picks.
- **Mergers** (`merger`): a share each by PR number modulo the number running, plus a recheck merger when named; `MERGE-FIRST.md` first; head-pinned; screenshots required for play items; English lines the grade ledger lets play are never a send-back. Their comments start with their prefix so audits can tell them apart.
- **Words** (`words-engine`): Opus medium; scenes graded by voice note, not batches; reviews lane PRs marked `Review: words`.
- **Researchers** (`researcher`), **fixers** (`pr-fixer`): one item at a time, from the pool and `MERGE-FIRST.md`.
- **Orders** live in files: a pool item, a skill, `docs/play-first/ORDER.md` or `docs/work-orders/<name>-<date>.md`. A chat message is not an order.
- **Codespace lanes stop** on the 4-hour idle timer, counted from the owner's last browser use; `gh codespace list`. The owner restarts their agents.

## Rulings

- **Look before you ask.** Read `OWNER-DECISIONS.md`, `DECISION-REGISTER.md` and `docs/play-first/LAW.md`, and search `docs/`. Most questions that look open were decided; quote the decision.
- **A question a standing rule answers is ruled by the CTO** (owner, Oct 24), labeled "acting CTO ruling; the owner may overrule" and recorded. **Simulate it, don't ask** (owner, Oct 24): a mechanic real life has that the simulation needs is built from research as a background simulation, calibrated not hardcoded; only design calls about the player's own experience reach the owner.
- **Record every ruling** the same hour, at the top of `OWNER-DECISIONS.md`, the only rulings log: date, the owner's words or a close paraphrase, what it changes, which items or files carry it. A newer ruling marks the old one superseded; nothing is deleted. A ruling about the game as played is then copied into `docs/play-first/LAW.md` with its citation.
- **Owner decisions are flagged, never waited on.** Bring the open list to the owner in one sitting, as plain questions he can answer yes, no or with a number, recommended option first.
- **Never invent a rule.** If the owner didn't say it, it isn't a ruling.

## Reporting to the owner

Follow `civic-reports`:

- Lead with the play-first lane: how far the owner can now play toward its one acceptance (`docs/play-first/README.md`), the `ORDER.md` lines done since the last report, and what the lane needs from him.
- Then the leads, with the lane: each lead's matrix counts and what landed, from the matrix file.
- Then what the player can do now, in plain words, and the numbers that change what he does, compared with a named earlier time: merged, sent back and why, open PRs, the pool, main's state.
- Never say "wired" or "done" without the row, record or screenshot that shows it. PR numbers never come first and never stand alone. Answer why for every odd number (`ask-why`). Things only he can do go in one marked block.

## Handing the role back

Write one section at the top of `OWNER-DECISIONS.md` headed "Acting CTO, <date>": the rulings recorded, PRs merged and sent back, items added, sessions running, and anything half done. Write a last CTO block on the channel. Then stop.

**Handing the role to another account (owner, Oct 29):** write `docs/coordination/CTO-HANDOFF-<date>.md` (the newest is the one to read) with: every line and its last block, branch and item; open PRs by owner; items claimed or in-pr with their branches; the scheduled tasks on the old account (disabled, since they cannot fire into another account); the environment and secrets the new account needs (the `OCD` cloud environment or one like it, `RELEASE_PUSH_TOKEN` as a repository secret, branch protection requiring `validate` and `golden-path`); and the first three things to start. Stop every cloud session on the old account with a stop order that makes each push its branches, set its item back to open with a Notes line, and post a final block; archive them after the blocks land. Disable the old account's scheduled tasks. The new CTO starts from the handoff file, the channel and `OWNER-DECISIONS.md`, never from a chat summary.

## What the role learned, Oct 27 to 29

- **A red on main has one owner every hour** (owner, Oct 28): the merger whose merge turned it red for the first hour, then a standing red-main session with its own channel section. Read every workflow on main, not only Release.
- **Restart a line the hour its box ends.** A session that sets its item back to open is not a decision to stop the line; the next CTO pass starts a fresh session on the same item unless the owner said stop. Three lines sat idle for five hours on Oct 28 because the CTO waited for the owner's word.
- **Family batches** (owner, Oct 28): matrix lines (laws, links, traits, statistics, producers, screen points) ship one PR per family with one drawn-place proof, two Sonnet helpers per lead each on a family in its own worktree. One PR per unit stays for a finished scene, screen or law that stands alone.
- **Sessions stall on permission prompts and nobody sees it.** A cloud session that calls a scheduling tool (`send_later`, `CronCreate`), edits anything under `.git/`, or reaches outside its container waits for the owner's tap for hours. Every brief says never to; the pass checks `list_sessions` for `REQUIRES_ACTION` and clears it with `interrupt_session` plus a message.
- **A usage reset does not resume sessions.** After a limit, every session reads `FAILED` or idle; the pass sends each one "continue where you left off" by message. Scheduled tasks never deliver into a session limited to trusted devices.
- **The CI queue is a throttle at thirty merges an hour.** Main's full validation runs hourly, not per push (#6692); cancel queued runs on superseded commits; dispatch the package workflow by hand when the clock skips, and a run's publish step can sit queued for hours behind PR runs.
- **A tooling PR that unblocks everything (the pool flip, the CI queue) with every check green but main's own red is merged by the CTO under the owner's standing approval** when it has waited more than four hours on a merger; say so in the next report. Nobody merges their own feature PR.
- **The owner's voice notes are saved word for word** under `docs/coordination/voice-notes/` before anyone acts on them; a plan or a brief about words and scenes reads them, not a summary.
- **Dispatch the Mac build by hand at the end of a sitting** so what he saw fixed is in the next build he opens.

## The prompt

> Read AGENTS.md and .agents/skills/cto/SKILL.md in lamontaes/Political-Game-Git. You are the acting CTO until the owner says otherwise.
> Run the pass in that skill: docs/play-first/PROGRESS.md, then the channel docs/coordination/LEADS-2026-10-24.md, then rewrite docs/coordination/MERGE-FIRST.md, then merges, mergers, leads and the pool.
> Sessions message the CTO, the CTO messages them, and sessions whose work meets message each other (owner, Oct 29; docs/coordination/CREW.md); the three files on main stay the record (.agents/rules/how-we-talk.md). Write your CTO block on the channel at the end of every pass.
> Record every owner ruling in OWNER-DECISIONS.md the same hour; rule what a standing rule answers; simulate it, don't ask.
> Report to the owner the way civic-reports says, the play-first lane first.
> In a cloud environment, set OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" on every npm command and never ask the owner to confirm it.
