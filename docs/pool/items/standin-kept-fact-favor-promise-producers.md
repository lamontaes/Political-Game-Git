---
id: standin-kept-fact-favor-promise-producers
title: "The director records favors and promises as kept facts from the events the new endings write"
area: director
kind: wiring
priority: 3
size: S
status: open
claimed-by:
pr:
after: words-scene-ending-writes-its-record-part-1-favor-and-promise
blocked-on:
source: stand-in triage Nov 10
lead: director
standard: 2
model: sonnet
effort: medium
root: design-story-director
---

**What.** The director keeps three kinds of remembered fact between people: lies, favors and promises. Lies are recorded; favors and promises never are, because nothing produces them. Seen: in later scenes that recall the favor or promise.

**Cause.** Found in code: src/director/data/director.json keptFactKinds (around line 940 to 957) lists "lie" with producedBy conversation.lie, but "favor" and "promise" with an empty producedBy (stand-in SG-P13-kept-fact-producers); produceKeptFacts in src/director/ledger.ts (line 1808) records a fact only when an event's kind is in that list.

**Fix.** Once words-scene-ending-writes-its-record-part-1-favor-and-promise lands and its favor and promise events exist in the core, list their event kinds in producedBy for favor and promise, so produceKeptFacts records them with the people and day and the existing end rules (world-event) close them. Add no new writer. Resolve the stand-in in src/director/data/stopgaps.json. Cost: a lookup per event already visited, no new scan.

**Time box.** 2 hours for one Sonnet session.

**Rules.** An effect is a read, not a record: the kept fact must be read by a scene, journal line or talk. No dice. One rule, all 56 places.

**Done when.** A second session plays a year in a drawn place (place and seed named), ends a scene on a favor owed and one on a promise, and finds each as a kept fact on the watched person's ledger citing the source event id, then sees a later talk or journal line read it; the stand-in is resolved.

**Waits on.** words-scene-ending-writes-its-record-part-1-favor-and-promise.

**Files.** src/director/data/director.json, src/director/ledger.ts, src/director/data/stopgaps.json
