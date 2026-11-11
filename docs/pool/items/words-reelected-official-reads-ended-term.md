---
id: words-reelected-official-reads-ended-term
title: "An official who moved seats or left office is profiled with their first office; the press desk reads the minted term (latent until other chambers sit)"
area: words
kind: bug
priority: 2
size: S
status: in-pr
claimed-by: claude/pool-words-reelected-official-reads-ended-term
pr: #8500
blocked-on:
source: added with npm run pool -- add
after:
standard: 2
model: sonnet
effort: low
root: rc10-screens-keep-own-facts
lead: words
checked: fable 2026-11-10
claimed-at: 2026-11-11T02:50:34.690Z
---

**What.** press-desk.ts holdsHighOffice (about lines 585-595) and printed-words.ts officeOf (about 350-357) and termOf (about 1213) read the term named by the official's own id (official:<termId>). After a re-election that term has ended and a new serving term holds the seat, so holdsHighOffice returns false for a re-elected official and a profile reads the old term. recalls.ts:208-215 has the same flaw and is asked of the laws lead separately. Found by the speed lead's reader map of office terms on Nov 1 (main 24cebf2761).

**Cause.** Found in code: holdsHighOffice (src/core2/press-desk.ts, line 587) reads the term named by the official's own id (official:<termId>), which has ended after a re-election; servingTermsOf (src/core2/modules/offices.ts, line 324) answers an official's current term. It is latent until other legislatures sit (SG-GOV-other-legislatures-not-sitting, U3), because src/core2/press-topics.ts keeps full people out of officialIds; printed-words reads a re-election correctly, and its real case is an official who moved seats or left office, whose profile prints the first office.

**Fix.** Make holdsHighOffice and the printed profile's office read use servingTermsOf, and cover an official who moved seats.

**Time box.** 2 hours for one Sonnet session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** The simulation is the one layer that knows anything, and every story and profile is a view of the same records: a view must read the official's serving term, not the term their id was minted from. One rule, all 56 places: the reader finds the serving term by person or seat, never by a place named in code.

**Done when.** A second session, not the builder, runs the new test in a played world (buildBenchWorld) in a drawn place from all 56 (place and seed named): it re-elects an official who is not filled in, shows holdsHighOffice true for them and the printed profile naming the new term by record id, and fails when the old read is put back.

**Waits on.** Nothing. The case is latent until SG-GOV-other-legislatures-not-sitting U3 lands; the test builds it directly.

**Files.** src/core2/press-desk.ts, src/bench/printed-words.ts, src/core2/modules/offices.ts, src/core2/press-topics.ts

**Notes.** lead: words. Words asked for it on Nov 1, 23:54 UTC, to take after its current order. When the office-terms fold (core-long-run-election-and-term-rows) lands, these reads go through its termById resolver.

Nov 2, 00:05 UTC (speed lead, from the laws lead's read-only check of every reader on main): two of the claims above were too strong. holdsHighOffice (press-desk.ts) is latent until U3 of SG-GOV-other-legislatures-not-sitting, because press-topics.ts:144-149 keeps full people out of officialIds. printed-words reads a re-election correctly; its real case is an official who moved seats or left office, whose profile prints the first office (owner by family: Screens, Review: words). The live re-election flaw is in recalls.ts:208-215 and is filed for the governing lead as elections-recall-reads-ended-term. One helper should answer an official's current term: servingTermsOf (src/core2/modules/offices.ts:316-325), which the laws lead will widen for the unfilled alias when U3 needs it.
