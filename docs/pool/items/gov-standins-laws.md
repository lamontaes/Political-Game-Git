---
id: gov-standins-laws
title: "Law-reach stand-ins (groups A and B) replaced or relabeled as sourced estimates"
area: laws
kind: stopgap
priority: 2
size: M
status: claimed
claimed-by: claude/pool-gov-standins-laws
pr:
blocked-on:
source: added with npm run pool -- add
claimed-at: 2026-10-19T21:32:38.046Z
---

**What.** The law-reach handlers in groups A and B still carry registered stand-ins: shares, dates and effects that are guesses, listed in src/core2/data/stopgaps.json. Each one is replaced by a real effect another engine reads, or relabeled as a sourced estimate with its spread. A handler whose mechanic is none or records is an unregistered placeholder.

**Rules.** An effect is a read, not a record: a law has an effect only when a different engine reads it at the moment it decides or pays. Look before you register: read the decision register and search docs for each subject first.

**Done when.** In a one-year run of the played world (buildBenchWorld) in a drawn place and seed the builder did not choose, each law-reach stopgap row is resolved with the engine that reads it named by record id, or kept with a source and spread the CTO accepts, and src/core2/law-reach-balance.test.ts passes.

**Files.** src/core2/data/stopgaps.json, src/core2/law-reach/group-a.ts, src/core2/law-reach/group-b-money.ts

**Notes.** Body written Oct 19 from the title when the pool check was red on main; the claiming or next session refines it.
