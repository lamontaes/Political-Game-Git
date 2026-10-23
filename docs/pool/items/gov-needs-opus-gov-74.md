---
id: gov-needs-opus-gov-74
title: "Needs from other sessions listed in OPUS-GOV.md (line 74): 3 lines"
area: gov
kind: wiring
priority: 2
status: done
claimed-by: claude/gov-needs-opus-gov-74
pr: #4520
blocked-on:
milestone:
source: 'docs/archive/2026-10-23/coordination/OPUS-GOV.md "Needs from other sessions" (line 74)'
claimed-at: 2026-10-15T23:32:25.562Z
---

**What.** Three requests from OPUS-GOV to other sessions: views and speech now move a listener by the speaker's standing (trust, closeness, party, record) and a repeated case wears out, which the views engine should read; PR #4193 restores `english-composition.ts`, `english-grades.ts` and `speech-registers.ts` that #4153 deleted (they now live in `src/english/`), so main's played world loads; and `leave(personId, organizationId)` was added to the core API. Verify each on main and close what is done. The player would notice that arguing the same case twice persuades less, and that group members who change sides actually leave.

**Rules.** An effect is a read, not a record: views read the speaker's standing at the moment a listener hears them, not lean nearness alone; No dice: persuasion follows trust, closeness and record, never a roll; Ask why: a changed stance keeps the source of what the person heard; Replace, never layer: any copy of the deleted modules is removed in favor of `src/english/`; Placeholders: SG-CORE-closeness-gov-raw-reads stays resolved only if candidacy and legislature read faded closeness; Speed: no new world scan for the repeat wear-out.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a candidate gives the same speech twice to a named listener and the second moves the listener less (record ids for both hearings and the stance change), the played world loads with the English modules present, and a group member who left via `leave` is gone from the group's votes. Tests beside `src/core2/speech.test.ts`. Strike the three lines in `docs/archive/2026-10-23/coordination/OPUS-GOV.md`. The owner plays it: gives one speech twice and sees the second land softer.

**Files.** src/core2/modules/views.ts, src/core2/modules/speech.ts, src/core2/campaign-views.ts, src/english/english-composition.ts, src/core2/state.ts

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
