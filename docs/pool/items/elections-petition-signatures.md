---
id: elections-petition-signatures
title: "A candidate's petition: requestSignature and circulatePetition"
area: elections
kind: feature
priority: 2
size: M
status: done
claimed-by:
pr: #4720
blocked-on:
source: added with npm run pool -- add
claimed-at:
---

**What.** Filing for an office that requires a petition has no signature step in core2: `requestSignature(api, filingId, signerId)` and `circulatePetition(api, { filingId, circulatorId, hours })` do not exist (only the old engine had one). Build them in the elections module: each signer answers from their own reasons, the hours spend the circulator's time, and filing checks the count the office requires. Prove it in a one-year run of the played world in a drawn place and a seed the builder did not choose, naming the records the change touched. File anything found along the way as its own pool item.

**Rules.** No dice; an effect is a read (another engine must read what is written); one rule, all 56 places; one model, two tiers; the chain is the acceptance.

**Done when.** In a drawn place whose office requires signatures, a candidate collects them over days, each answer with its reason, and the filing office accepts or turns away the filing on the count, by filing and signer record ids.

**Files.** src/core2/modules/elections.ts, src/bench/filing.ts

**Notes.** Split out of gov-needs-gov-69 (the "Needs from other sessions" section of docs/coordination/gov.md), checked against main on Oct 16, 2026.

Checked Oct 16 by a Claude session: this contradicts an owner ruling. `docs/coordination/OWNER-DECISIONS.md` ("Filing", Oct 14) says there is no fee or petition mechanic and filing happens where the place's records say, and `AGENTS.md` ("This is a game, not a spreadsheet") bars building a fee, petition or form because real life has one. A petition by a candidate is not the movements ruling's petition either. The CTO should drop this item unless the owner overrules the ruling.

Sent back 2026-10-16 from PR #4720 (branch claude/petition-item-note): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4743 (branch claude/pool-notes-oct16): The top of the PR body lacks a gate line naming the in-session checks on changed files and their results. Add the named checks and results at the top (a pool id may precede it); "Local checks pass" alone does not name the checks; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4720 (branch claude/petition-item-note): Local changed-file checks pass, but GitHub refused the merge: {"message":"Pull Request is still a draft","documentation_url":"https://docs.github.com/rest/pulls/pulls#merge-a-pull-request","status":"405"}gh: Pull Request is still a draft (HTTP 405). The prescribed REST ready-for-review endpoint did not clear this blocker; finish on that branch, merge main into it first.

Sent back 2026-10-16 from PR #4743 (branch claude/pool-notes-oct16): Merging current main into claude/pool-notes-oct16 conflicts in docs/pool/items/elections-petition-signatures.md, docs/pool/items/words-bill-name-of-bill.md. Resolve and push these conflicts on this branch before local checks can run; finish on that branch, merge main into it first.
