---
id: gov-u13
title: "U13:"
area: gov
kind: feature
priority: 2
status: done
claimed-by: claude/gov-audit-body
pr: #4576
blocked-on:
milestone:
source: "docs/archive/2026-10-23/coordination/OPUS-GOV.md line 201 (unchecked checklist line)"
claimed-at: 2026-10-16T03:28:57.755Z
---

**What.** There is no auditor, inspector general or ethics body, so a government's books are never checked and nothing produces a public report. Add the body as a second door into the complaint record: it reads a government's books from the budgets and treasury engines, finds what does not match its authorized lines, and publishes a report the press and the voters can read. The player would notice an audit report appearing in the news after an official misspends, and could file or follow a complaint through it.

**Rules.** An effect is a read, not a record: the auditor reads the treasury's journal and the budget lines in force, and the press and voters read the report; No dice: what the auditor finds comes from the books, never a roll; Ask why: each finding keeps the lines and entries it came from by record id; The chain is the acceptance: follow one misspent dollar from the books to the finding, the report, the news and a voter's changed view; One rule, all 56 places: whether and how a place has an auditor is data for all 56 places; This is a game, not a spreadsheet: no paperwork for the player; the report arrives as news; No hand-written player text: the report headline and body are worded by the English engine; Speed: audits run on the budget cycle, not daily.

**Done when.** In a one-year run of the played world (`buildBenchWorld`, every module installed) in a place drawn from all 56 with a seed the builder did not choose (name both in the PR body): an audit in the year produces a report with its finding rows traced to named treasury entries, the press carries it, and a named voter's view moves because they read it. Tests in a new `src/core2/audit.test.ts`. The owner plays it: reads a news story about an audit of his town.

**Files.** src/core2/modules/budgets.ts, src/core2/modules/corruption.ts, src/core2/modules/press.ts, src/core2/data/corruption/parameters.json

**Notes.** Checklist line from OPUS-GOV.md; verify against main before starting.

Finding (Oct 16, the claiming session, not built): an auditor reads the treasury months (`treasuryMonths` in the budgets module: for each line, what was due, what was paid in town, as aid, to providers and to the outside, and what fell short) against the budget in force. In a 400-day run of the played world in Marion, Wisconsin (seed au1) the federal, state, county and city treasuries each showed no line paid beyond its authorization and no unauthorized line, so an audit today would find nothing to report: the books cannot mismatch because nothing in the world misspends. The audit has two missing pieces. First, a cause of misspending in the books (an official diverting a line's money, which the corruption engine does not do; its bribes move one person's cash to another's, not a treasury's). Second, the press has no story kind for an audit: `wireItem` in press-topics.ts and `STORY_KINDS` in english-newscast.ts name the kinds, and the headline and lede pieces would be authored. Split before building: `gov-treasury-diversion` (an official takes from a line, recorded on the treasury's journal and the case record) then this item (the auditor reads it and the press carries it).
