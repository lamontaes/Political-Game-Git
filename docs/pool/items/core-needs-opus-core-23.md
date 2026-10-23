---
id: core-needs-opus-core-23
title: "Needs from other sessions listed in OPUS-CORE.md (line 23): 4 lines"
area: core
kind: wiring
priority: 2
status: done
claimed-by: claude/core-past-pointers
pr: #4493
blocked-on:
milestone:
source: 'docs/archive/2026-10-23/coordination/OPUS-CORE.md "Needs from other sessions" (line 23)'
claimed-at: 2026-10-15T22:40:00.688Z
---

**What.** Four requests from the core to other sessions remain on the core's list. The news-archive story kind (stopgap SG-CORE-past-archive-kind) is not yet written by the press engine, laws carry no pointer to their law-history rows so the opening-day effective date stays, words has no renderings for household, public and archive past facts, and the dossier does not read publicKnowledgeOf for a public figure the viewer has not met. A player sees none of this: an old law or a public figure shows no history when clicked.

Lines (as of 2026-10-15, from the status file):

- **Press session:** a news-archive story kind (stopgap `SG-CORE-past-archive-kind`).
- **OPUS-GOV:** a pointer from each law row to `law-history:<row id>`, and dropping the opening-day `effectiveDate` on carried and policy-answer rows now that the history holds the enactment (`laws.ts`).
- **OPUS-PEOPLE (words):** renderings for `household:*` past facts, `public:*` knowledge and the `archive:*` story kinds.
- **OPUS-PLAY:** the dossier reading `publicKnowledgeOf` for a public figure the viewer has not met.

**Rules.** An effect is a read, not a record: each past fact or archive story counts only once the dossier, news or English engine reads it. No hand-written player text: the wording comes from the English engine renderings, never a string in a screen. Replace, never layer: dropping the opening-day effectiveDate happens in the same change as the law-history pointer.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, seed named) a law row's pointer resolves to its law-history record id, the dossier of a public figure the viewer has not met shows knowledge read by publicKnowledgeOf, and an archive story is rendered by the English engine, each named by record id. The test in src/core2/modules/laws.test.ts or the dossier test covers it and the SG-CORE-past-archive-kind row closes. The owner plays it: click a public official and read what the town knows about them.

**Files.** src/core2/modules/laws.ts, src/core2/modules/press.ts, src/core2/data/stopgaps.json, docs/archive/2026-10-23/coordination/OPUS-CORE.md

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
