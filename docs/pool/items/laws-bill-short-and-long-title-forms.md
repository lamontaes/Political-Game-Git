---
id: laws-bill-short-and-long-title-forms
title: "Bills carry a short title, a long title and a repeal clause in forms that read right locally"
area: laws
kind: wiring
priority: 2
size: M
status: in-pr
standard: 2
claimed-by: claude/pool-laws-bill-short-and-long-title-forms
pr: #8436
after:
blocked-on:
lead: laws
model: sonnet
effort: low
root: design-words-machine
source: story/restore-liked-lines, Nov 8 (a rewrite never deletes a line the owner graded good)
claimed-at: 2026-11-11T01:44:57.743Z
checked: fable 2026-11-10
branch: claude/pool-laws-bill-short-and-long-title-forms
---

**What.** Four lines the owner graded good sit in data/english/parts/legislation.json under the stopgap SG-WORDS-legislation-no-reader: "This Act may be cited as the {act}.", "This title may be cited as the {act}.", "To provide for {purpose}, and for other purposes." and "{provision} is repealed.". The bill text words a bill's title as "An ordinance to ..." or "A bill for an act to ..." and says never the federal short-title form for a local measure, so nothing reads them. Add a short-title, a long-title and a repeal-clause form to the bill-sections schema, taken from these pieces, so a federal bill reads them as written and a local bill reads the local form. Seen: the title and repeal lines on a bill's paper.

**Cause.** Found in code: `composeBill` in src/english/bill-sections.ts (line 241) words a bill's title only as 'An ordinance...' or 'A bill for an act to ...'; the stopgap SG-WORDS-legislation-no-reader is in src/director/data/stopgaps.json and the four pieces are in data/english/parts/legislation.json. Added Nov 8 by the Story session with the restore of the owner's liked lines (`scripts/dialogue-batch/liked-lines-kept.test.ts`). Wording is the Story role's under the Nov 10 split, so it needs a Words review.

**Fix.** Add a short-title, a long-title and a repeal-clause form to data/english/bill-sections.json and src/english/bill-sections.ts, from the four graded lines, local bills keeping the local form. Delete SG-WORDS-legislation-no-reader and keep the four graded keys in a bank or in forms the liked-lines test accepts.

**Time box.** 3 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** Wire to the world: the title and purpose come from the bill-names row of the bill's own policy (`billNameOf`), never typed. Replace, never layer: the new forms replace the matching form in bill-sections.json and the legislation bank piece is deleted once its words live there. No hand-written player text: the words come from the English engine's banks.

**Done when.** A second session, not the builder, plays a drawn place from all 56 (name and seed in the PR body). A federal bill's text opens with a short title and a long title in these words and a repeal bill carries the repeal clause, and a local bill reads the local form. src/english/bill-sections.test.ts names the bill record ids. The stopgap row SG-WORDS-legislation-no-reader is gone and the four graded keys stay accepted by the liked-lines test.

**Waits on.** Nothing.

**Files.** data/english/parts/legislation.json, data/english/bill-sections.json, src/english/bill-sections.ts, src/english/bill-sections.test.ts, src/director/data/stopgaps.json

**Notes.** Added Nov 8 by the Story session with the restore of the owner's liked lines (`scripts/dialogue-batch/liked-lines-kept.test.ts`). The graded keys stay in a bank until a scene reads them.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:42 UTC) on branch claude/pool-laws-bill-short-and-long-title-forms.

Released (2026-11-11): needs the Story session's lines under data/english/parts (delete of four bank pieces); see draft PR. Continue on branch claude/pool-laws-bill-short-and-long-title-forms.

Claimed by next for sonnet-cbfb (Claude Sonnet 5.5 in Claude Code (cloud session), tier mid) (2026-11-11 01:42 UTC) on branch claude/pool-laws-bill-short-and-long-title-forms.

Released (2026-11-11): re-offered after release; see draft PR 8436. Continue on branch claude/pool-laws-bill-short-and-long-title-forms.
