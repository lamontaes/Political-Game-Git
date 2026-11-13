---
name: merge-audit
description: >
  Audits pull requests already merged into Our Civic Duty's main: fans the
  diffs out to read-only reviewers with a fixed checklist, verifies the bad
  findings, files the fixes and folds the lessons into the merger skill. Use
  after a merger runs unattended, after any merger or skill change, or when
  the owner asks whether merges are any good.
---

# Merge audit

**Look first (`look-first`, owner Oct 27):** before building, fixing, filing or asking anything, run the look-first search (OWNER-DECISIONS, DECISION-REGISTER, prior-rulings, LAW, the sitting blocks, docs, the pool, Drive); a found ruling is built and cited, never asked again; a question without the reading line is sent back.

**SMART and look first (owner, Oct 26; `.agents/rules/smart-and-look-first.md`).** Add to the checklist: a merged PR whose owner question lacks the reading line, a stopgap without its code marker, or a send-back that was not SMART is a merger defect. Each reviewer brief is SMART with a time box.

Who merges and who checks is in `docs/coordination/CREW.md` (mergers split by PR number; checkers run the gate first, owner Oct 29). Read it for the current counts; a merged PR's comment prefix tells the merger apart.

1. **List the window:** every PR merged since a time T, with base branch, head branch and size (`gh api graphql` search `is:pr is:merged merged:>=T`, or your tool's GitHub pull request functions). Leave out the CTO's own docs PRs.
2. **Fan out:** give three or four read-only reviewers (Sonnet is enough) 7 or 8 PRs each, and one brief with the checklist below. They read only: the pull request and its file list with each file's patch (for example `gh api repos/lamontaes/Political-Game-Git/pulls/N` and its `/files` page). Ask for a table of PR, verdict (good, concerns, bad), reason and red flags with `file:line`, then the exact fix for every concerns or bad verdict.
3. **Checklist:**
   - Does the diff do what the title, body and release note claim? Check one count, date or list against the data.
   - Is it wired into play, or does nothing call it?
   - Tests narrowed, skipped, returning early, `>= 0`, looping over a set that can be empty, or pinned to one convenient seed.
   - Timeouts raised without a measured reason.
   - Done-when proof missing (the pool item names it).
   - Hand-written player text in code, or a bank part that carries a play flag of its own (owner, Oct 24: bank parts play unless a rule or the grade ledger rejects them).
   - Any change to a line under `data/english/parts/` by anyone but the Story session (owner, Nov 10, "Split by role"); a builder lists the lines it needs instead. Director or English code edits by a session that is neither Words nor a play-first lane PR (`Review: words`); `src/bench` edits by anyone but the lane.
   - A pool item built that lacks `checked: fable`, says `Needs cause.`, or has no `standard: 2` fields (owner, Nov 10; `.agents/rules/pool-item-standard.md`); an item moved to `done` without `npm run pool -- seen` by a second session (owner, Nov 3).
   - A rule, check or skill PR that did not merge ahead of the PRs it judges, or a PR its rule should have caught (owner, Nov 10).
   - A play item merged without its before and after screenshots, or a changed look merged without the owner's yes.
   - Any import or path under `src/simulation` (the old core was deleted Oct 28, #6659; the `old-imports` guard refuses it).
   - Owner or date notes in code or data.
   - Pool sections pasted twice.
   - Places hard-coded in logic.
   - Stopgap rows deleted.
   - Dice in the core.
   - Research values without a quoted source, or with misleading tags.
   - A guard allowlist, ceiling or skip list changed to clear a red guard.
   - Deleted entries something still points at.
   - Player controls removed without saying where they went.
4. **Verify one claim per bad PR yourself** before acting. Reviewers can be wrong.
5. **File:**
   - Fixes owned by a running lead session go to that session: a pool item with `lead:` set and a line in the CTO section of the channel (`how-we-talk`); a message to that session may follow but never replaces the record (owner, Oct 29).
   - Everything else goes into one pool item, `release-merge-audit-<date>-fixes`: area release, kind bug, priority 1, numbered fixes, and every field the item standard asks for (`standard: 2`, a Cause beginning `Found in code:` with file and line, a Fix, a time box, model and effort, Rules, and a Done when a second session can see), so it can be built from the item alone. Set `checked: fable` only if Fable's review has checked it; otherwise say it waits for the check.
   - A defect on main that blocks others (a red test) is priority 1 on its own.
6. **Fix the cause:** add each new class of slip to "What went wrong before" in `merger`, in both `.agents/skills/merger/` and `.claude/skills/merger/`.
7. **Report:** counts of good, concerns and bad, per merger (their comment prefixes tell them apart); the bad ones in plain words; and where each fix went.
