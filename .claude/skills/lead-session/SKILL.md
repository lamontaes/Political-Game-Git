---
name: lead-session
description: >
  Runs an Our Civic Duty lead session: one Opus session that owns a line or a
  matrix (laws, traits, speed, the effect web, a milestone), lands its fixes
  through at most two Sonnet helpers, fixes its own send-backs, writes the
  leads' channel every two hours, and is accepted only by an end-to-end proof
  in a played year. Use when started from a lead order in docs/work-orders/;
  not for a single pool item (session-start) or a pure audit (wiring-audit).
---

# Lead session

Current as of 2026-10-24 (written for the weekend leads; the owner's Oct 20 ruling on leads and helpers, and his Oct 24 rulings)

A lead is one Opus session that owns one line of work end to end: its matrix or measurements, its pool items, its open PRs and its proof. It builds through helpers and lands every fix through the mergers. Its order is a file, `docs/work-orders/lead-<line>-<date>.md`; a chat message is never an order.

## What a lead does

- **Reads its order first,** then `AGENTS.md`, this skill, its section of the leads' channel and the top of `docs/coordination/OWNER-DECISIONS.md`. Runs the golden-path suite once before changing anything.
- **Owns one matrix or line** and keeps it true: rebuilds it on main after every merge in its line (`wiring-audit` for the checker and matrix) and posts the new counts. Never says "wired", "fast" or "done" without the row, the run or the record id.
- **Lands open PRs first.** Claims each item with the PR's branch, merges main in, fixes every send-back itself (`pr-fixer` rules: on its own branch, never a second PR), and rewrites the body so line 1 is exactly `Pool item: <the bounded item>`. Never the umbrella, and never a bare id as the first word: the done-on-merge workflow closes whatever line 1 names.
- **Splits before it builds.** An L item becomes S or M items, each with its own done-when, and the L item is set blocked on them.
- **Runs helpers** (below) and reviews every diff before it is pushed for review: narrowed or skipped tests, `>= 0` checks, dice, hand-written player text, imports from `src/simulation`, claims the diff doesn't make.
- **Never merges its own PRs.** Mergers merge. To jump the queue, it writes "Needs from others: CTO, add #N to MERGE-FIRST" in the channel.
- **Files an item for anything it finds,** the same hour, in the pool.
- **Asks nothing in chat.** An owner question goes in the PR body and OWNER-DECISIONS.md, Open, behind a registered `owner-decision` stopgap; the lead builds the simplest version and never waits.
- **Writes the channel every two hours** (`.agents/rules/leads-channel.md`).
- **Stays in its lane.** It never edits files another lead's open PR is changing; it asks through the channel.

## Helpers: the 3-2-1 rule

At most **three Haiku, two Sonnet or one Opus** helper at a time (owner, Oct 14 and Oct 20). Builders are Sonnet. Each helper gets:

- one bounded item and its done-when;
- its own branch and files, which no other helper touches; shared files (a registry, a stopgap list, a reach table) have one writer at a time;
- its check (the test or command that proves it) and its output: a pushed branch and a filled Done-when table;
- no recursive delegation.

## The proof

A lead's acceptance is its end-to-end proof item, never a matrix count. The shape:

- **A played year:** `buildBenchWorld` with every module installed, bookkeeping off, one process.
- **A drawn place:** drawn from all 56, with a seed the lead did not choose, both named.
- **Record ids at every step:** the cause, each engine's read, the money or price, the named person reached, the news or event that told them, the view or choice that moved citing it, and the scene or journal line.
- **A test** that fails when the chain is cut, and a screenshot of what the player sees.

## The end of a lead

Every item in its order done, its matrix or measurements on main with before and after in two drawn places, its proof item done, and a last channel status saying what the owner can now play. Then it stops.

## Paste prompt

> Read AGENTS.md and .agents/skills/lead-session/SKILL.md in lamontaes/Political-Game-Git, then your order, docs/work-orders/<order file> (on branch cto/leads-2026-10-24 until it merges). You are the <line> lead (Opus, <effort> effort), with at most two Sonnet helpers at a time, each in its own files. Write your status to your section of docs/coordination/LEADS-2026-10-24.md on main every two hours, following .agents/rules/leads-channel.md, and put "Lead: <line>" in every PR body. Never ask in chat; file items and flag owner questions in OWNER-DECISIONS.md. Your acceptance is <proof item>. In a cloud environment, set OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" on every npm command and never ask the owner to confirm it.
