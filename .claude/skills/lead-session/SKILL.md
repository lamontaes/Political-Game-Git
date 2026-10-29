---
name: lead-session
description: >
  Runs one of Our Civic Duty's lead sessions (laws, traits, speed, m0-m2,
  effects): an Opus lead with at most two Sonnet helpers that owns one
  family's matrix, lands one PR per finished row (owner, Oct 27), writes its status to the leads
  channel every two hours, and never says "wired" without the row. Use when
  started with a lead prompt or given a work order under docs/work-orders/;
  not for one pool item (session-start) or the play-first lane (play-first).
---

# Lead session

**Look first (`look-first`, owner Oct 27):** before building, fixing, filing or asking anything, run the look-first search (OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW, the sitting blocks, docs, the pool, Drive); a found ruling is built and cited, never asked again; a question without the reading line is sent back.

**SMART and look first (owner, Oct 26; `.agents/rules/smart-and-look-first.md`).** One lead holds laws and effects together on one checker and one matrix; traits rows live in the effects matrix. Every helper brief and every `Needs from others` line is SMART with a time box in hours. Before any owner question, do the full reading (`OWNER-DECISIONS.md`, `DECISION-REGISTER.md`, `prior-rulings/`, `LAW.md`, a `docs/` search) and end it with the reading line. Research is allowed and expected. No new family PR opens until the last one is on main. The words-and-scenes lead works one real-life episode per pass (`scenes-from-life`) and names it in its status block.

Current as of 2026-10-24, 21:30 UTC (owner, Oct 20: Opus leads with Sonnet helpers; owner, Oct 24: play first, "simulate it, don't ask", "sessions never message each other")

A lead owns one cross-system family end to end: its checker, its matrix, its PRs. The five leads are **laws, traits, speed, m0-m2** and **effects**; each has a section in the channel whose first line names its work order (`docs/work-orders/lead-<name>-2026-10-24.md`, on main or on the CTO branch the channel names).

## Start

1. Read `AGENTS.md`, your work order, the CTO section of the channel `docs/coordination/LEADS-2026-10-24.md`, then your own section (`.agents/rules/how-we-talk.md`), then the top of `docs/coordination/OWNER-DECISIONS.md`.
2. Read your matrix (`docs/reports/<job>-<date>.md`; `wiring-audit` says how it is built). Counts come from the matrix file, never from memory.
3. Claim each item you take: `npm run pool -- claim <id> --branch <branch>`. Every item in your family carries `lead: <name>`.

## Work

- **Play first** (owner, Oct 24): a `play-stop-*` or `play-first-*` item with `lead: <name>` comes before anything you have open, unless the channel's CTO section says otherwise.
- **Helpers:** at most two Sonnet helpers, each with its own paths, branch and check, read-only unless its brief says otherwise. You review every diff before it becomes a PR (`wiring-audit`, "Fix by family").
- **One PR per finished unit (owner, Oct 27: "if one law gets finished, put it in the game. Then work on the next one")**: a law, a link, a decision or a row that passes its checks opens its own PR the same hour and the lead starts the next; a family batch only overnight or when the owner says so ("fine for the future or overnight, but just not now"). Body line 1 `Pool item: <id>`, `Lead: <name>` in the body, a Done-when table with the matrix row for each claim. One head per recheck: never push to a branch while a merger's check is running on it.
- **Family batches (owner, Oct 28: "go ahead and do family batches for the links reaching people and traits, etc.")**: matrix lines ship one PR per family, grouped by the engine that reads them, with one drawn-place proof per family naming the record ids and the matrix regenerated once per family PR; two Sonnet helpers each on one family in its own worktree. The hourly block carries the counts (rows of the total, families landed).
- **Shared files:** the channel's CTO section says whose PR lands first on a shared file (for example laws before traits on `jobs.ts`); merge main after it lands.
- **Simulate it, don't ask** (owner, Oct 24): a mechanic real life has is built from research as a background simulation, calibrated not hardcoded. A question a standing rule answers is ruled by the CTO; only a design call about the player's own experience goes under **OWNER DECISIONS NEEDED**.
- You do not write in `src/bench` (the play-first lane's), or `src/director`, `src/english`, `data/english` (the Words line's, and the lane's with Words review). A need there is a pool item with `lead:` set and a `Needs from others:` line in your section.

## Every two hours

Add a status block at the top of your channel section and commit it to main: `leads: <name> status <HH:MM UTC>`. Shape: Status with matrix counts, Needs from others (each also a pool item with `lead:` set), Decisions made, PRs. **Decisions made is status, not a ruling** (acting CTO, Oct 25): a decision you make under the standing rules is filed in `docs/coordination/OWNER-DECISIONS.md` as an acting-lead ruling (dated, attributed, naming the item or stopgap) or it isn't one; `OWNER-DECISIONS.md` is the only rulings log. If the push is rejected, pull with a plain merge and push again.

## Stop

Push everything, write a last block that says where each PR and helper stands, set unfinished items back to `open` with one Notes line, and stop. Never say "wired" without the matrix row.

## The prompt

> Read AGENTS.md and .agents/skills/lead-session/SKILL.md in lamontaes/Political-Game-Git, then the CTO and <name> sections of docs/coordination/LEADS-2026-10-24.md and the work order your section names.
> You are the <name> lead: an Opus session with at most two Sonnet helpers, owning that family's checker, matrix and PRs.
> Play-stop and play-first items with lead: <name> come first. One PR per finished unit, body line 1 the item id, "Lead: <name>" in the body, a Done-when table with the matrix row for each claim.
> Write your status block in your channel section every two hours (commit to main: `leads: <name> status <time>`); a need from another role is a Needs-from line there and a pool item with lead: set. Message the CTO with questions for the owner or blockers, and the session whose work meets yours (docs/coordination/CREW.md) before building in its area, so nothing is built twice (owner, Oct 29).
> Simulate it, don't ask. Never say "wired" without the row. Never merge your own PR, never force-push, never push to a branch while a merger is checking it.
> In a cloud environment, set OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" on every npm command and never ask the owner to confirm it.
