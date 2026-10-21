---
name: trace-audit
description: >
  Runs the 56-place trace audit of Our Civic Duty: views each place for a
  year, reads it, verifies every why against code, writes the graded report
  and files the defects. Use when the owner or CTO asks what the places
  actually did.
---

# Trace audit

The audit shows the owner what each of the 56 places actually did in a year, and why. It views the game and changes nothing.

## Steps

1. Set `OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14"`. Run `npm install`.
2. Run the viewer, three worlds at a time (a world takes 1.5 to 4 GB; more is killed):
   `STATE="Ohio" YEARS=1 OUT=audit/ohio.txt node --max-old-space-size=4096 --import tsx scripts/trace/viewer.ts`
   For a territory, `STATE` is its name as the places data spells it. `SEED` fixes the seed; the file header records it.
3. Reader helpers (one per file or a few files each) write `docs/reports/trace-audit-<date>/<state>.md`: the story of the year in plain words (only what the engine did), then every why with the record id (use `ask-why`).
4. One verifier helper ties every why to a function and line, or "not found". No claim stands without one.
5. The lead session writes `docs/reports/trace-audit-<date>/README-<session>.md` and files each ranked defect as a pool item.

## Layout

- `docs/reports/trace-audit-<date>/<state>.md` per place.
- `docs/reports/trace-audit-<date>/raw-<session>/` raw viewer files.
- `docs/reports/trace-audit-<date>/verification-<session>.md` the Sonnet pass.
- `docs/reports/trace-audit-<date>/README-<session>.md` the report.

## The report

- Lead: what works for the owner's play, in plain words.
- Grades by level (local, state, federal): works, works with the gap named, doesn't.
- Defects ranked by how much they break the owner's play. Each has place, seed, record ids, and the cause as `file:line`.
- The five things to fix first.
- Run `npm run report:check -- <file>` before sending.

## Rules

The PR body is the channel; its top says which places are done. Every claim names place, seed and record id.
