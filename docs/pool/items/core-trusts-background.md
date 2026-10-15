---
id: core-trusts-background
title: "Trusts simulated in the background for estate and inheritance taxes"
area: core
kind: feature
priority: 2
status: claimed
claimed-by: claude/core-trusts-background
pr:
blocked-on:
milestone:
source: "owner rulings, Oct 15 afternoon (docs/coordination/OWNER-DECISIONS.md)"
claimed-at: 2026-10-15T23:09:12.976Z
---

**What.** A trust holds assets and passes them outside probate, and the estate and inheritance taxes in force must read it. Today estates settle by will or intestacy only, so a wealthy person's trust never reduces or shifts what the estate tax collects. This is a background mechanic with no player-facing screen, per the owner's Oct 15 afternoon ruling. The player would notice only that an heir receives the trust's assets without waiting for probate, and the tax bill matches the law of that place.

**Rules.** No dice: what a trust holds and who gets it comes from the grantor's records and the trust's terms, never a roll. One rule, all 56 places: estate and inheritance tax treatment comes from each place's law data. An effect is a read, not a record: the tax engine must read the trust at settlement. The chain is the acceptance: follow one trust's dollar to its heir.

**Done when.** In a one-year played world (buildBenchWorld, a drawn place from all 56, a seed that produces a death with a trust) the trust's asset transfer record id shows assets passing outside probate and the estate or inheritance tax record id reads the trust. The test in src/core2/estates.test.ts covers it. The owner plays it: the heir of a wealthy neighbor is paid from the trust and the tax appears on the books.

**Files.** src/core2/estates.ts, src/core2/data/estates.json, src/core2/estates.test.ts

**Notes.** Ruling: OWNER-DECISIONS.md, Oct 15 afternoon. Replaces SG-CORE-owner-decision-trusts.
