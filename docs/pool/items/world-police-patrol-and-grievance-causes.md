---
id: world-police-patrol-and-grievance-causes
title: "The causes the justice incident producer needs: a patrol-hours record from the police department, a crime-outcome measure, and a recorded grievance between two people"
area: world
kind: feature
priority: 3
size: L
status: blocked
standard: 2
claimed-by: claude/police-patrol-causes
pr:
after:
blocked-on: world-police-patrol-and-grievance-causes-part-1-patrol-hours, world-police-patrol-and-grievance-causes-part-2-grievance-record, world-police-patrol-and-grievance-causes-part-3-readers
lead: laws-effects
model: opus
effort: high
root: design-movements-and-unrest
source: added with npm run pool -- add
claimed-at: 2026-10-20T06:01:01.986Z
---

**What.** gov-justice-incident-producer asks incidents to arise from a town's patrol hours, its crime outcomes and two people's recorded grievance. The crime measure now exists (src/core2/modules/crime.ts keeps monthly victimization rows by place with the web's index), so what is missing is patrol hours and a grievance record. No module records patrol hours (the police department is staff and a budget line), and no engine writes a grievance between two people (only recalls reads the word). Build the two as records other engines write and read: patrol hours from the police department's staffing and the budget line, and a grievance record written by the engines that already create conflict (a dispute over a business, a rent, a bill), then give the incident producer one way to read all three. Household firearm ownership already exists in src/core2/firearm-ownership.ts.

**Cause.** Found in code: src/core2/modules/crime.ts writes monthly victimization rows but its header (line 22) says "No offender, police or court is modeled here" (SG-CORE-crime-offenders and SG-CORE-crime-arrests are open in src/core2/data/stopgaps/core.json), and no module under src/core2/modules keeps police patrol hours or a grievance between two people.

**Fix.** Record patrol hours from the police department's staffing and budget line, and a grievance record written by the engines that already create conflict, each read by another engine; the crime measure already exists. Built in three parts: patrol hours, grievance, and the one read the incident producer uses.

**Time box.** 8 hours for one Opus session. When it runs out, push what passes, set the state honestly with a one-line note, and stop.

**Rules.** No dice: a measure moves from the place's recorded conditions, never a roll. An effect is a read, not a record: each record must be read by another engine the day it decides. Estimate, never UNKNOWN: a town starts from the real average with a per-world spread. One model, two tiers: counted groups carry the same measure times their count. One rule, all 56 places.

**Done when.** A second session, on main in a place drawn from all 56 with a seed the builder did not choose, plays a year in dev mode and finds a town's patrol hours and at least one grievance as records with ids, sees the police budget line move the patrol hours, and sees the existing crime rows, the patrol hours and the grievance read together through the one read the incident producer item uses. A test in src/core2 names the place, the seed and the record ids. All three parts are merged.

**Waits on.** The three parts: world-police-patrol-and-grievance-causes-part-1-patrol-hours, world-police-patrol-and-grievance-causes-part-2-grievance-record, world-police-patrol-and-grievance-causes-part-3-readers. The owner's Oct 16 word that the crime engine comes later (OWNER-DECISIONS.md) is met: the crime measure exists.

**Files.** src/core2/modules/crime.ts, src/core2/modules/budgets.ts, src/core2/firearm-ownership.ts, src/core2/data/stopgaps/core.json

**Notes.** Found Oct 20 (claude/political-game-pool-yucp92-qq) while claiming gov-justice-incident-producer. Check docs/coordination/DECISION-REGISTER.md first; the owner may have ruled on crime.

Oct 20 (claude/police-patrol-grievance): not built. The crime measure is the crime engine, and docs/coordination/OWNER-DECISIONS.md line 271 (owner, Oct 16) says it comes later, "when it gets a little more fleshed out", priority 3 as `owner-crime-engine`. The patrol-hours and grievance records could be built alone; the CTO should say whether to split them from the crime measure.

Oct 25 audit: blocked-on rewritten as the owner's standing word; deferred to priority 3.
