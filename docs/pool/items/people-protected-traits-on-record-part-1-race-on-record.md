---
id: people-protected-traits-on-record-part-1-race-on-record
title: "Every full person has a recorded race from the place's shares, and counted groups carry the shares"
area: people
kind: wiring
priority: 1
size: M
status: claimed
standard: 2
claimed-by: claude/pool-people-protected-traits-on-record-part-1-race-on-record
pr:
after:
blocked-on:
lead: laws
model: opus
effort: high
root: design-one-model-two-tiers
source: split from people-protected-traits-on-record in the pool redo, Nov 10, 2026
checked: fable 2026-11-10
claimed-at: 2026-11-11T03:14:09.094Z
branch: claude/pool-people-protected-traits-on-record-part-1-race-on-record
---

**What.** The owner ruled on Oct 24 that sex and race go on each person's record (OWNER-DECISIONS.md, "Sex and race on the record"). Sex is recorded today; race is not. Give each full person a race drawn from the place's Census shares when the world generates who exists, consistent within a household by the data, and give counted groups the same shares times their count. Feeds: people-protected-traits-on-record.

**Cause.** Design: owner ruling Oct 24, 2026, "Sex and race on the record" (docs/coordination/OWNER-DECISIONS.md); PersonInput in src/core2/types.ts carries no race.

**Fix.** Add a race field to the person input and the opening generator, drawn from the place's Census shares and consistent in a household, and give counted groups the shares.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: seeded generation of who exists may assign race from shares, but a pass-over comes only from the decision-maker's recorded traits and views, never a roll. One model, two tiers: counted groups carry the same shares and the same decision rule times their count. One rule, all 56 places: shares come from each place's Census data, estimated with a labeled median where a place has none. Ask why: a refused decision records the law and the reason it cited.

**Done when.** A second session starts a life in a drawn place (buildBenchWorld, place and seed named) and sees every full person have a race on the record, household members consistent with the place's data, and the counted groups carry the place's shares, listed by person and group record ids. A new test, src/core2/person-race.test.ts, covers it.

**Waits on.** Nothing.

**Files.** src/core2/types.ts, src/core2/population.ts, src/core2/opening-origin.ts, src/core2/counted-groups.ts, src/core2/person-race.test.ts (new)

**Notes.** Claimed by next for opus-5234 (Claude Opus 5.5 in Claude Code (cloud session), tier top) (2026-11-11 03:13 UTC) on branch claude/pool-people-protected-traits-on-record-part-1-race-on-record.
