# M1 work orders: rules every one follows

M1 is "the world runs" (`docs/ROADMAP.md`). Every M1 work order follows `AGENTS.md`, `docs/packages/README.md` and this page. Where a work order and this page disagree, the work order wins.

## Keep it simple first

The owner's Oct 11 rules in `AGENTS.md` ("Keep it simple") override anything heavier here or in a work order. Every M1 engine works on the two-level population: it acts on the modeled wider population as counts and groups, and on full people only where they exist or get filled in. Build the simplest version that follows the owner's rules and that he can play.

## Where the work goes

- **Branch.** Each work order has its own branch, stacked on the latest `pool/M0-core-pieces` (the four core pieces on top of SOL-1258's `pool/P8-part-1`), or on the M1 branch it names. Rebase on its base regularly. Once M0 merges to `main`, the base becomes `main`.
- **Module.** The engine is a core2 module: its entry in `src/core2/modules/<name>.ts`, its helpers in `src/core2/<name>-*.ts`, its data in `src/core2/data/<name>/`. Register it with `registerModule` and keep its records in its own tables (`api.moduleState`), with indexes. Put dated institutional work on the module calendar (`api.moduleCalendar`): fiscal years, rate meetings, rent day, effective dates. See `src/core2/core-pieces-v1.md` on `pool/M0-core-pieces`. Scheduling calendar work doesn't pause the player by itself: if the player must be stopped for it (a deadline, a meeting they must attend), the module also calls `registerStop`. Calendar and voter-group state isn't saved yet, which is fine while saves don't matter.
- **Rules.** Lifted pure rules live in `src/rules/<engine>/`, owned by the RULES sessions. Import them; don't edit them. If a rule you need is missing or listed as not liftable, lift its math into your own module, with a golden test against the old function, and note it in your PR for the RULES owner.
- **Shared core changes.** If the core's interface lacks something (for example, ending a job or a dated loan rate), add the smallest versioned addition in its own commit, for SOL-1258's review, as CORE-PIECES did. Never change another module's files.

## How the world behaves

- **Money** moves only through `postJournal` and the work writer. Every dollar balances, and a module that moves money has a test that it does.
- **Choices** are offers to people through the shared chooser, scored from traits, needs, goals, drives, money, law and conditions, with the reasons recorded. No seeded roll or fixed percentage decides what a person, business, official or body does (`no-dice`). Seeded generation of who exists is allowed.
- **Sliding scales.** Nothing flips at a threshold. Replace old threshold rules (bank capital lines, for example) with smooth responses, and register the shape you chose.
- **All 56 places.** No state, city or GEOID in logic. Place facts live in data. Tests draw a random place from all 56 and name the place and seed. A place with no real data gets an estimate from the nearest real average, marked as an estimate with its source and spread (`estimate-not-unknown`).
- **Officeholders are fictional.** No real person's name, portrait or identity fields in shipped data.
- **The start date.** The world opens on its start date, and starting law is that date's real law. Data from earlier years is calibration, labeled with its year.

## Research

- Research before building (`research-habit`). Federal and state facts are exact. Local facts come from a representative sample of real places of each kind, then an estimate with a spread for the rest.
- Use the agency that publishes the number (BLS, BEA, Census, HUD, FDIC, Federal Reserve, CDC, SSA, CMS, USDA, Treasury, state statutes and state agencies), not a mirror of it. FRED is a pointer to the agency's own file, not a source.
- **Check every source's terms before using it,** and record the terms beside the data. U.S. government data is free to use. Don't use sources that forbid commercial use or need permission (the Council of State Governments' Book of the States, Zillow research data, Eviction Lab, S&P Case-Shiller) unless the CTO confirms permission. If a source's terms are unclear, ask before building on it.
- Open research requests in `docs/research/requests/` that a work order names are part of that work order. Answer them in place.

## Placeholders

Register every shortcut as a stopgap: an ID, a marker in the code, the reason, the author and date, and what replaces it. Builders may leave registered stopgaps; finishers clear each one or keep it with a reason the CTO accepts.

## Speed and memory

- A town's game year must run in under two minutes. The core is currently over that (accepted speed debt, won back in M7), so **each M1 work order may add at most 5% to a measured year** in the paired guard run (M0-11), base against head, same machine, one process at a time. The guard still fails any change over 20%. (Owner, Oct 10.)
- Never scan the whole world, every person or the whole history on a schedule. Monthly and quarterly work reads indexes, or acts on the day something changed.
- Stay inside the opening size budget the core already enforces.

## Until the bench merges

The test bench is on `pool/M0-bench` (#3940), not `main`, so the startup bench check in `AGENTS.md` can't run yet. Note that in the PR and continue; it isn't a blocker. Finishers run the bench from that branch.

## Done

A spec passes only when its finisher has run its test in the test bench in a randomly drawn place, from a generated world, naming the head, seed, place and record ids. Every hand-off records the model and effort, the time taken, and each send-back and its reason. Log one line per event at the top of `docs/archive/2026-10-23/roadmap/PROGRESS.md` (via your PR) and in the PR body.
