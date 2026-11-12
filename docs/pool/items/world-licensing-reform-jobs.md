---
id: world-licensing-reform-jobs
title: A repealed occupational license opens licensed jobs to job seekers
area: world
kind: wiring
priority: 3
size: M
status: open
standard: 2
after:
blocked-on:
lead: laws-effects
model: opus
effort: medium
root: rc8-law-judged-by-paperwork
source: effect-web-poverty; stopgap SG-WEB-poverty-licensing-no-engine
claimed-by:
claimed-at:
checked: fable 2026-11-10
---

**What.** The jobs engine matches seekers to jobs without any licensing requirement, so the law "reduce occupational licensing" reaches no one's pay. Give licensed occupations a requirement row in the jobs data, and let the match read the law row in force: where the license is repealed, seekers without it are matched to those jobs and their pay enters household income. The poverty measure (povertyShare in world-metrics) then moves from incomes with no web link.

**Cause.** Found in code: the seeker match in `runWeek` (src/core2/modules/jobs.ts) reads no license requirement, and no person record carries a license, so SG-WEB-poverty-licensing-no-engine (src/core2/data/stopgaps/web.json) stays open and the licensing-reform-to-poverty link runs on no ledger.

**Fix.** Give licensed occupations a requirement row, and let the match read the repeal row in force so seekers without the license are matched and the pay reaches household income and the poverty measure. Resolve the stopgap row.

**Time box.** 5 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop. Seen: the bill card's line for who a licensing repeal reached, and the household income and poverty share after it.

**Rules.** An effect is a read, not a record: the jobs engine must read the law row at the moment it matches a seeker. Wire to the world: it applies to every licensed occupation, not one example. No dice: who is matched follows from skills, pay and the law in force.

**Done when.** A second session, on main in a drawn place (place and seed named), plays a year with a repeal row in dev mode and sees seekers hold licensed jobs they could not before, named by job record id, and the household's income rise in the poverty record. A test proves it, and SG-WEB-poverty-licensing-no-engine is resolved.

**Waits on.** world-license-held-on-worker.

**Files.** src/core2/modules/jobs.ts, src/core2/data/jobs/, src/core2/modules/world-metrics.ts, src/core2/data/stopgaps/web.json

**Notes.** From the poverty family of the effect web. The link licensing-reform-to-poverty no longer runs on the ledger.

Looked at Oct 21 (claude): not built. `src/core2/modules/jobs.ts` and `src/core2/data/jobs/` hold no licensing field at all, and no person record carries a license (nobody "has" or "lacks" one), so a repeal has nothing to change in a match today: "seekers without it are matched" needs a held-license fact first. The order is (1) a sourced per-occupation licensing table (share of workers licensed by occupation and by state, from the BLS/CareerOneStop licensing data and Kleiner and Soltas), as a research item; (2) a license held or not on each worker, derived from their schooling and job history so it is one model for both tiers; (3) the match reading the law row in force. Filing (1) and (2) as their own items would let this one follow. Claim released.
