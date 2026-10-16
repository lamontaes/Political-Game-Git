---
id: gov-filing-fee-and-file-line
title: "A filing with no fee or signatures, and a choice line that says I understand"
area: gov
kind: bug
priority: 3
status: claimed
claimed-by: claude/filing-fee-line
pr:
blocked-on:
milestone:
source: 'docs/coordination/play.md "Needs from other sessions" (line 147); triage in play-needs-play-147'
claimed-at: 2026-10-16T11:19:48.709Z
---

**What.** In a Mississippi county, a Commissioner filing went on the ballot with no fee and no signatures, which may differ from the state's qualifying fee. Separately, when a seat needs no fee or signatures the filing choice reads I understand, the same as accepting a refusal, so the player cannot tell they are filing. Check the place's filing record against the state's own qualifying rule in the data, and give the filing choice its own control name.

**Rules.** One rule, all 56 places: fees and signatures are data per office. Research before building: cite the state's qualifying rule. Estimate, never UNKNOWN. No hand-written player text: the control name comes from the English bank.

**Done when.** In the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body), a county office's filing record lists its fee and signatures from data with a citation, and a test checks the filing choice is distinct from the refusal choice. The owner plays it: files for a seat that needs no fee and sees a filing line.

**Files.** src/core2/modules/candidacy.ts, src/core2/data/elections, src/bench/

**Notes.** Found while triaging play-needs-play-147.

Claude (claude/filing-fee-line, Oct 16): the fee and signatures half is answered by the owner's ruling, "Filing: no fee or petition mechanic; filing happens where the place's records say" (OWNER-DECISIONS.md line 85, DECISION-REGISTER.md line 119; also AGENTS.md "a game, not a spreadsheet"), so no fee or signature data is built and the filing record stays as it is. The file line is built: the filing choice is its own control (`choices[].control`), named "File for this office" by `controls.filing.file`.
