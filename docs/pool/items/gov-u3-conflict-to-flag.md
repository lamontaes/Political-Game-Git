---
id: gov-u3-conflict-to-flag
title: "U3 (conflict to flag):"
area: gov
kind: feature
priority: 2
status: done
claimed-by: claude/gov-u3-scandal-knowledge
pr: #4495
blocked-on:
milestone:
source: "docs/archive/2026-10-23/coordination/OPUS-GOV.md line 202 (unchecked checklist line)"
claimed-at: 2026-10-15T22:47:58.068Z
---

**What.** A conviction now feeds the candidacy inputs' on/off scandal flag, but the owner's October 5 ruling deleted the flat scandal penalty and wants each voter's own knowledge of it. Replace the flag: a voter's view of a convicted official changes only if that voter learned of the conviction (news received, a conversation, a notice), and the stance cites that source. The player would notice that a scandal hurts a candidate with the people who heard of it and not with those who did not.

**Rules.** Ask why: a voter who changed their vote cites the source they learned of it from; Sliding scales and causes: the effect grows with how much the voter heard and how much they care, never an on/off flag; No dice: no roll decides who learned; the news they received and their relationships do; An effect is a read, not a record: campaign tallies read each voter's own knowledge at the moment they decide; Replace, never layer: the on/off scandal flag in the candidacy inputs is deleted in the same change; One model, two tiers: counted voter groups learn through the same news-reach rule as a full voter times their count; The chain is the acceptance: follow one conviction to the story, the voters who read it, their changed views and the vote count.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): a convicted candidate loses votes only among named voters whose record shows they received the news, with the source cited, and a voter who never heard keeps their view; tests in `src/core2/candidacy.test.ts` assert no flag remains. The owner plays it: runs against a convicted incumbent and sees the scandal matter to those who heard.

**Files.** src/core2/modules/candidacy.ts, src/core2/campaign-views.ts, src/core2/modules/views.ts, src/core2/modules/justice.ts

**Notes.** Checklist line from OPUS-GOV.md; verify against main before starting.

**Verified built on main, Oct 15 (claude/gov-u3-scandal-knowledge).** No on/off scandal flag feeds the candidacy inputs. `candidateInputs` (`electorate-inputs.ts`) takes none: the comment there says a scandal is read by each voter from the news that reached them. In `voting.ts`, `appealFor` gives a candidate a scandal term only for a voter who `knows` one of that candidate's scandal stories (`heardScandal`, via `api.knows(personId, newsKey(story))`), weighed by the voter's trust in the press; counted voters get the same term from the town's share who heard (`scandalAppeal`). `justice-chain.ts` `scandalRead` only reports that the conviction's story is among the scandal stories. The flat penalty is gone. What is not shown here is a played-year run with a convicted candidate on a ballot; none was found in a drawn year, so it is filed as `gov-scandal-knowledge-played-proof`.
