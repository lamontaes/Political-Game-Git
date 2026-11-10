---
id: gov-treasury-diversion-part-3-the-yearly-audit
title: "A government's books are audited once a year by a named auditor, who learns of any quiet move and decides whether to report it"
area: gov
kind: feature
priority: 3
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: governing
model: opus
effort: medium
root: none
source: split from gov-treasury-diversion by Fable after the owner's Nov 10 ruling
checked: fable 2026-11-10
---

**What.** Nothing audits a government's books today. Add one yearly audit row per government after its fiscal year closes, made by a named auditor who learns of every diversion on that year's books and decides whether to publish a finding. This is part 3 of gov-treasury-diversion. Read docs/design/treasury-diversion.md first; this part builds "The audit". Seen: the paper's story of a yearly audit finding.

**Cause.** Design: docs/design/treasury-diversion.md, written from the owner's Nov 10, 2026 ruling in docs/coordination/OWNER-DECISIONS.md ("Yes, keep it": an official can move money from one budget line to another outside the law, found out the way bribery is, through audits, the press or complaints). In code today, no module keeps an audit: a search of src/core2 for "audit" finds only comments, and the officials roster (src/core2/modules/officials.ts, near line 654) seats a state's elected auditor who has nothing to do.

**Fix.** In src/core2/modules/corruption.ts (or a small file beside it that the module installs) write one audit row per fiscal year for each government in the player's own place's chain (its town, county and state; id audit:<government>:<fiscal year>), and none for any other place's governments, which the country tier keeps as results when the first month's close of the next fiscal year runs (`closeTreasuries`, src/core2/budgets-treasury.ts line 1122, with `fiscalYearOf` in src/core2/modules/budgets.ts line 788), naming the auditor, the year and the crime records found. The auditor is a person: the state's elected auditor from the officials roster where the place's audit rule gives them the job, otherwise the auditor of an outside firm filled in from the counted population the way the executive module fills in a clerk. Who audits each kind of government and how often comes from a per-state table read from data/research/gov/ (the item research-local-government-audit-rules fills it); until a state's row is read, use one ESTIMATED default row (a yearly audit by an outside firm) with its source and spread, under a registered stopgap in src/core2/data/stopgaps/gov.json. The auditor gets a knowledge record of each diversion on the audited year's books and makes the `tell` decision of part 2 once per audit, weighing their tie to the official and their temperament. A yes publishes the finding as a public record through the same report path, so it is the event `scandal.reported`. Whatever the auditor decides, the official learns the audit's outcome (a knowledge record citing the audit row): an audit that reported nothing on a year with a diversion is what part 1's perceived risk reads as "it went unnoticed".

**Time box.** 6 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** This is a game (owner, Nov 10: "it has to perform like a game"): detail only where the player can see it, so audits exist only for the governments the player lives under. No dice: an audit finds what is on the books it reads; it never samples by chance, and whether it is published is the auditor's decision. Speed: one row per government per year, written on the close that already runs, never a scan of history. One rule, all 56 places: who audits is data. Estimate, never UNKNOWN. An effect is a read: the scandal's readers and the Trace read the finding. Two-level population: an outside auditor is filled in only when an audit has something to decide.

**Done when.** A second session, on main in a drawn place (place and seed named), uses dev mode to have an official divert, plays past the end of that government's fiscal year, and sees the audit row by record id naming the auditor and the diversion, the auditor's decision with its reasons, and, where they report, the finding in News and on the official's record. It also sees a year with no diversion write an audit row that finds nothing and fills in no one. A test in src/core2 names the place, the seed and the record ids.

**Waits on.** gov-treasury-diversion-part-1-the-act-and-its-money and gov-treasury-diversion-part-2-the-shorted-line-and-the-complaint (the one report path).

**Files.** src/core2/modules/corruption.ts, src/core2/modules/officials.ts, src/core2/budgets-treasury.ts, src/core2/data/stopgaps/gov.json, data/research/gov/, src/core2/treasury-audit.test.ts (new)
