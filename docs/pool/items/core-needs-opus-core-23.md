---
id: core-needs-opus-core-23
title: "Needs from other sessions listed in OPUS-CORE.md (line 23): 4 lines"
area: core
kind: wiring
priority: 2
status: open
claimed-by:
pr:
blocked-on:
milestone:
source: 'docs/coordination/OPUS-CORE.md "Needs from other sessions" (line 23)'
---

**What.** Each line below was a request one session made of another. The asking sessions are gone, so each is a wiring job for whoever claims it. Verify against main first; skip what is already built and split off an item for any line that is large.

- **Press session:** a news-archive story kind (stopgap `SG-CORE-past-archive-kind`).
- **OPUS-GOV:** a pointer from each law row to `law-history:<row id>`, and dropping the opening-day `effectiveDate` on carried and policy-answer rows now that the history holds the enactment (`laws.ts`).
- **OPUS-PEOPLE (words):** renderings for `household:*` past facts, `public:*` knowledge and the `archive:*` story kinds.
- **OPUS-PLAY:** the dossier reading `publicKnowledgeOf` for a public figure the viewer has not met.

**Rules.** Wire to the world; an effect is a read; nothing waits on another session (build the smallest registered stand-in).

**Done when.** Each line either built and read by another engine in a played year (record ids), or noted done on main. Update the status file.

**Files.** varies

**Notes.** Overnight pool item 10: claim one list at a time. Verify.
