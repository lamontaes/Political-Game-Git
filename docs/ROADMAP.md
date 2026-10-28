# Roadmap to early access

Approved by the owner on October 10, 2026. This replaces the old-core engineering roadmap. Work is tracked in the pool (`docs/pool/`); the owner's new ideas become pool items.

## Now (owner, Oct 11, 2026)

- **Keep it simple** (see `AGENTS.md`): two-level population with people filled in on click, debug bookkeeping off in play, one run and one number, build only what the golden path needs, and a playable step at the end of every day.
- **Steam:** the store page goes up by Friday, October 16, with screenshots of real gameplay. The early-access date is set once the owner has played the golden path end to end and wants to keep going; his target is October 30.
- **How the work runs:** `AGENTS.md`, "How the work is organized": any agent takes pool items, big cross-system jobs run as an Opus lead with Sonnet helpers, and merger sessions merge.
- **Checks stay light:** builders test their own work. The client release gate (build, typecheck, declarations) and each PR's changed-file checks block; the golden-path suite, the speed guard and the money balance are the bench's guards. The owner plays the evening build.

## What early access means

Progress is measured on the golden path, with the world running around it.

1. Turn 18
2. Meet people
3. File for office where that place files (clerk, registrar or board of elections, from its records)
4. Campaign
5. Win or lose
6. Propose an ordinance
7. Negotiate
8. Pass or fail
9. The town visibly changes
10. People bring it up
11. The next election uses the record

**The world runs the whole time:** the national economy (growth, jobs, inflation, interest rates, the central bank), state and federal governments acting through the same engines as local government, and other places changing at a coarser level.

**Playable at early access:** local and state offices (council, mayor, county, state legislature, governor), including the executive role.

**Federal in every milestone:** federal law and federal money sit under most of what states and towns do, so federal government is built at the same time, on the same engines. Playing as president is a goal; early access doesn't wait for it. Courts come after early access.

Every test runs in a place drawn at random from all 56 (50 states, D.C. and five territories). No plan, package or test names a specific town.

## Who does what

Any agent with repository access takes pool items (`docs/pool/README.md`). Big cross-system jobs run as an Opus lead with Sonnet helpers; merger sessions merge, and nobody merges their own PR (`AGENTS.md`). A feature is done only when it works in a played world in a randomly drawn place.

## Milestones

### M0 · Foundation and the test bench

- Payday fix, then the judged money year (Codex builds, Opus finishes).
- The four core pieces: engine records, money accounts, institution calendar, voter groups (Codex builds, Opus reviews the design).
- People fixes: the time-budget day, shared past and real schools, look-ups and grief, proof (OPUS-PEOPLE).
- The test bench in a Codespace (OPUS-BENCH).
- Studio basics: these instruction files, the project board, a design document for the new core, stale PR cleanup, packages moved into `docs/packages/`, a feature list and progress file.

**Done when:** you can play any resident of a randomly drawn place in the bench and reach steps 1–2; the money year passes (under 10% of businesses close, sales pay most wages); the four core pieces are in the core.

### M1 · The world runs

Fifteen work orders, owner-approved Oct 10, 2026, in `docs/packages/M1-*.md` (every one follows `M1-common.md`):

- **Laws and the economy:** laws in force at every level (M1-laws); the national economy and central bank (M1-macro); state and metro economies (M1-regional); banks and credit (M1-credit); jobs (M1-jobs); housing (M1-housing).
- **Government money:** treasuries, taxes and budgets for federal, state and local government at once (M1-budgets-taxes), and federal and state money reaching named people and towns (M1-budgets-programs). Until M3, budgets are adopted by the old budget rules, as a registered placeholder.
- **Renewal:** businesses start, grow, add locations and close (M1-business); births, moves and new residents (M1-renewal).
- **People and politics:** political views on the owner's design (M1-views); every office and seat with fictional holders as full people (M1-officials, which builds M2-01 in M1 with M1-12); drives from job loss, eviction and closures (M1-drives-economy); other places at a coarser level (M1-other-places); the world opening on its start date with a coarse run of the years before it (M1-history).
- **Owner calls (Oct 10):** other councils legislating stays in M3-10 and news delivery in M2-09; elections' and lawmaking's history join M1-history with M2 and M3; each M1 work order may add at most 5% to a year's run time; while courts are parked, evictions follow each place's legal steps with no judge's discretion, as a registered placeholder.

**Done when:** a year in a random place shows the national and regional economy moving; federal, state and local budgets paying, with federal money reaching named residents; businesses opening and closing at real rates; births, moves and job changes; views drifting from causes; every official a full person in a real seat; and the world opening on its start date with a past. The bench's world panel is live.

### M2 · Running for office

- Ports: elections with the one ballot rule (offices and seats are built in M1, by M1-officials), for local, state and federal offices at once (real voters in the places in focus, voter groups everywhere else); filing with each place's own filing office and rules; campaigns, where meeting people changes what voters know and think, and other candidates file too.
- Screen design talks with the owner start here, opening sequence first.

**Done when:** in a random place you file for a local seat with that place's filing office, campaign and win or lose on real ballots; state legislative, governor, congressional and presidential races run in the world with real candidates.

### M3 · Governing, and laws that change things

- Ports: governing and executive offices (mayor, county, governor, president) on one engine; legislatures (council, state legislature, Congress) on one engine, with bills, votes, bargaining and favors; law effects and the outcome web, so laws reach named people.
- RULES-1 lifts each engine's keepable rules before its port starts.

**Done when:** from your seat you propose an ordinance and negotiate with members whose positions come from their lives; it passes or fails, and something in town visibly changes; state and federal laws pass in the world and reach the town.

### M4 · Stories and words

- The story director connected to every engine's events.
- The English engine on the new core: conversations, scenes and the journal, with graded batches for the owner.
- The next election reads the record.

**Done when:** the full golden path, steps 1–11, plays in the bench with the world running, and the owner has graded the text.

### M5 · State and federal careers, and the executive role

- Required for early access: playable state legislator and governor careers; executive play for mayor and governor (desk, staff, appointments, budgets, signing or vetoing).
- Built in parallel, not required for early access: playable member of Congress and president on the same engines.

**Done when:** in a random state you serve as state legislator and as governor, and as mayor or governor you sign or veto, appoint and adopt a budget.

### M6 · The real game screens

- Screens redesigned with the owner one at a time, in the owner's order, reading the new core.
- Art defects from the owner's October 8 playtest.

**Done when:** the golden path is playable in the real game, not the bench.

### M7 · Early-access ready

- Speed: a town's year under two minutes; memory fits a minimum PC spec.
- A versioned save format, so updates don't break saves.
- Every stopgap cleared or turned into a sourced or marked estimate.
- In-game bug reports and crash logs.
- Legal check: confirm no real politicians appear (officeholders are fictional, owner ruling Sept 26), plus real places, schools and institutions, data licenses, and photo and art licenses. Started Oct 10.
- Steam page, trailer, early-access FAQ, minimum specs, price.
- The old core deleted.

**Done when:** the release build passes with zero open stopgaps, and the owner signs off.

## Always running

- **Weekly with the owner:** a fresh playable build and a reschedule.
- **Every merge:** speed and memory checked against the budget (a year may get at most 20% slower per change; each M1 work order at most 5%).
- **Art in parallel:** modular people, poses, backgrounds.
- **Specialist roles:** speed, placeholder clearing, docs.

## Early-access scope calls (owner, Oct 10)

- **Press:** basic news in early access (local outlets report results, laws and big events, plus word of mouth); reporters, editors, owners and investigations right after.
- **Speeches** at any moment are in early access; **movements** come after.
- **Constituent cases:** in early access, simple.
- **Corruption:** basic in early access (bribes and favors from people's own traits and money, leaving records that surface later); investigations and prosecutions after.
- **At early access these run in the world only, and become playable after:** party posts, ballot measures and recalls, and school board seats.
- **Successors:** the basic handoff is in early access (a save can always continue); inheriting a movement comes after.
- **Courts** come after early access.
- **The legal check** started on Oct 10.

## Specs and packages

Exact specs for M0 and M1, each with its test, are in `docs/roadmap/features.json` (failing until proven). Draft specs for M2 to M7 are in `docs/roadmap/later-specs-draft.md`; builders take them from the pool under "No stopping" (owner, Oct 12) until the owner approves them. Build packages are in `docs/packages/`. The progress file is `docs/roadmap/PROGRESS.md`.
