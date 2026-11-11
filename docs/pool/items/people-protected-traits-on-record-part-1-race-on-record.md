---
id: people-protected-traits-on-record-part-1-race-on-record
title: "Every full person has a recorded race from the place's shares, and counted groups carry the shares"
area: people
kind: wiring
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: laws
model: opus
effort: high
root: design-one-model-two-tiers
source: split from people-protected-traits-on-record in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at:
branch: claude/pool-people-protected-traits-on-record-part-1-race-on-record
---

**What.** The owner ruled on Oct 24 that sex and race go on each person's record (OWNER-DECISIONS.md, "Sex and race on the record"). Sex is recorded today; race is not. Give each full person a race drawn from the place's Census shares when the world generates who exists, consistent within a household by the data, and give counted groups the same shares times their count. Feeds: people-protected-traits-on-record.

**Cause.** Needs cause. The earlier cause (PersonInput carries no race) misses the writer that exists, found by opus-5234 on main f294c255cb: src/core2/opening-origin.ts draws one origin per household at the opening from the state's adults by race and Hispanic origin (Census CPS Nov 2024, table 4b; ORIGINS white, hispanic, black, asian, other), keeps it on the person's `looks.origin`, gives kin a resident relative's and a child born in play a parent's (`childOrigin`, births-people.ts line 142); counted members carry it too (src/core2/counted-groups.ts line 228, `originIx`, restored on fill-in at line 693). Only the faces read it (bench/whole-figures.ts, bench/scene.ts), and its header says no outcome depends on it. Building the Fix as written would be a second race writer beside it (one engine per mechanic). What is missing is narrower: the shares are the state's adults rather than the place's own Census shares (stopgap SG-LIVES-origin-state-shares), and the value sits under looks rather than as a record field a decision reads. A finder rewrites the Fix as promoting `looks.origin` to the record, from the place's shares, and names the reader the ruling needs.

**Fix.** None until the cause is found.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: seeded generation of who exists may assign race from shares, but a pass-over comes only from the decision-maker's recorded traits and views, never a roll. One model, two tiers: counted groups carry the same shares and the same decision rule times their count. One rule, all 56 places: shares come from each place's Census data, estimated with a labeled median where a place has none. Ask why: a refused decision records the law and the reason it cited.

**Done when.** A second session starts a life in a drawn place (buildBenchWorld, place and seed named) and sees every full person have a race on the record, household members consistent with the place's data, and the counted groups carry the place's shares, listed by person and group record ids. A new test, src/core2/person-race.test.ts, covers it.

**Waits on.** Nothing.

**Files.** src/core2/types.ts, src/core2/population.ts, src/core2/opening-origin.ts, src/core2/counted-groups.ts, src/core2/person-race.test.ts (new)

**Notes.** Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 03:13 UTC) on branch claude/pool-people-protected-traits-on-record-part-1-race-on-record.

Released (2026-11-11): Cause differs from code: each household already has a race-and-origin drawn from Census shares (opening-origin.ts, looks.origin) and counted members carry it (counted-groups.ts originIx); the Fix would add a second writer. Continue on branch claude/pool-people-protected-traits-on-record-part-1-race-on-record.
