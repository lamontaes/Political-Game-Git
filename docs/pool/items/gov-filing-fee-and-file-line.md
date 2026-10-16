---
id: gov-filing-fee-and-file-line
title: "A filing with no fee or signatures, and a choice line that says I understand"
area: gov
kind: bug
priority: 3
status: done
claimed-by:
pr: #4721
blocked-on:
milestone:
source: 'docs/coordination/play.md "Needs from other sessions" (line 147); triage in play-needs-play-147'
claimed-at:
---

**What.** In a Mississippi county, a Commissioner filing went on the ballot with no fee and no signatures, which may differ from the state's qualifying fee. Separately, when a seat needs no fee or signatures the filing choice reads I understand, the same as accepting a refusal, so the player cannot tell they are filing. Check the place's filing record against the state's own qualifying rule in the data, and give the filing choice its own control name.

**Rules.** One rule, all 56 places: fees and signatures are data per office. Research before building: cite the state's qualifying rule. Estimate, never UNKNOWN. No hand-written player text: the control name comes from the English bank.

**Done when.** In the played world (buildBenchWorld, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body), a county office's filing record lists its fee and signatures from data with a citation, and a test checks the filing choice is distinct from the refusal choice. The owner plays it: files for a seat that needs no fee and sees a filing line.

**Files.** src/core2/modules/candidacy.ts, src/core2/data/elections, src/bench/

**Notes.** Found while triaging play-needs-play-147.

Checked Oct 16 by a Claude session: this contradicts an owner ruling. `docs/coordination/OWNER-DECISIONS.md` ("Filing", Oct 14) says there is no fee or petition mechanic and filing happens where the place's records say, and `AGENTS.md` ("This is a game, not a spreadsheet") bars building a fee, petition or form because real life has one. A petition by a candidate is not the movements ruling's petition either. The CTO should drop this item unless the owner overrules the ruling.

Sent back 2026-10-16 from PR #4721 (branch claude/filing-fee-line): GitHub refuses to merge a draft pull request (HTTP 405: "Pull Request is still a draft"). The merger skill's prescribed REST ready-for-review endpoint returns HTTP 404. Mark this PR ready for review, retain the named changed-file checks at the top, and push any needed corrections; finish on that branch, merge main into it first.
