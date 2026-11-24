# Independent audit: owner roadmap

Audited commit: `ab4ac1b8839456a8d662b0e3c2da84288798bb47`.
Written September 30, 2026, 6:35 p.m. Eastern, after checking the system clock.
Status: verified findings and proposed migration order; the full audit remains in progress. No code changed, no tests run, no runtime outcome claimed. Reporting only to Lamontae.

## The engines the game should have

1. **Government:** one lawmaking process, one executive process and one court process. Each reads the actual institution's rules. Different authorities require different powers and procedures, not separate copies of the same accounting or decision logic.
2. **Elections:** one office lifecycle covering eligibility, filing, campaigns, voting, results, terms and vacancies. The office and its legal rules are inputs.
3. **Financial:** one authoritative account and transaction system for every person, business and government. Pay, purchases, taxes, loans and budgets create or settle obligations through it.
4. **Social:** people's relationships, health, experiences, beliefs and choices. Its decisions must come from records; an exact tie can remain undecided.
5. **Narrative:** reads recorded events and what a person actually knows. It must not create a reporter, employer, payment, vote or historical event just to supply a scene or story.

The shared law-effect system connects these engines. It does not invent separate outcome levels. Time, identity and persistence also need shared infrastructure, but they do not need a sixth engine that independently decides political or financial outcomes. Economic prices and resource capacity belong inside Financial and the mechanisms they constrain; their consequences should not be another unrelated conditions generator.

## Fix order

### 1. Make the money books agree

The strongest verified accounting problem is two kinds of government cash records: budget balances and the account balances that actual payments spend. Federal budget settlement is also separate from the settlement already shared by states and local governments. Business books are not a third government treasury.

Keep the common transaction system. Reconcile opening cash and existing obligations first, then make budget cash a view of that system. Preserve the difference between authorization, commitment, liability and money actually paid. Fix the payment reader's omission of partial payments and later payments on older flows before switching consumers.

**Verified reach:** federal, state and local government accounting; paid-leave payouts; existing law-cost and tax consumers. A total law count unlocked is not established.

### 2. Put every law through the same terms and effect path

A common enacted-law entry point already exists, but its dispatch is limited and special-cases transit. Other readers independently generate wage floors, tax terms, benefit rates and aggregate effects. Some only read laws passed during play, leaving opening law outside that enforcement path.

Keep saved law authority and effective dates. Convert one consequence kind at a time into terms applied to actual people, accounts, eligibility or services. Route opening laws and new laws through that same kind. Compare the resulting records before retiring the replaced reader. Research can check whether totals look plausible; it cannot select a person's pay or a law's effect.

**Verified reach:** the inspected tax, appropriation, duty and eligibility dispatches, plus documented wage, leave, tuition, privacy and federal-spending readers. No claim that every catalog law is implemented or repaired by this step.

### 3. Unify governing choices before deleting filing paths

Several routes independently choose a bill, sponsor or executive outcome. One follow-up can label a budget passed from skill and party alignment instead of a legislative result. Another chooses a prewritten bill and randomly supplies its sponsor.

Keep the shared introduction, vote, enactment and history writers. Require one actual proposal, one authorized sponsor and one recorded decision for each step. Transfer callers individually. Delete duplicate choice producers only after their consumers use those records. Wording families can remain data or rendering helpers where they do not independently decide outcomes.

**Verified reach:** the traced state intake, governor follow-ups, committee report votes and federal/state/local callers. Eight matching wording-family filenames are not eight lawmaking engines.

### 4. Remove dice and arbitrary tie decisions together

The shared decision engine already handles reasons and constraints, but its exact ties resolve alphabetically. Simply disabling random close choices is insufficient. Committee seats, recall results, private party opinions, campaign purchases and several life events also have their own draws.

Keep the shared decision records. Let insufficient reasons remain unresolved; let obligations and physical mechanisms determine amounts. Replace each caller's fallback, not only the random-number helper. Keep private-note IDs and save-slot identifiers out of the violation count.

**Verified reach:** 38 literal close-choice settings plus one default setting in the indexed source, alongside separately traced direct draws. This is a configuration count, not an execution count or an exhaustive total of random outcomes.

### 5. Consolidate office transitions and time advancement safely

The inspected code has six named turnover adapters and duplicates the main after-advance chain in two time routes. File count alone does not show which operations can be deleted. Shared vacancy, tenure and due-item records should survive.

Extract one clock orchestration, preserve dates and stable IDs, then transfer each office lifecycle to shared operations under its legal profile. Prove that each crossed date acts once before removing its prior adapter. Do not combine different legal rules into one fictional national default.

**Verified reach:** presidential, gubernatorial, congressional, state-legislative, House-delegate and statehood adapters; both inspected world-advance routes. No measured claim that a normal action currently executes all work twice.

### 6. Stop presentation and missing data from inventing events

The inspected paths can create a paid teacher for a formative scene, create a newsroom when seeking press contact, and declare Senate confirmation when no vote exists. Fixed conditions and generated histories then supply reasons to other systems.

Preserve actual history and existing people. Move creation to explicit world initialization or recorded institutional decisions. Missing authority or evidence must not become success, calm, coverage or a completed payment. Repair downstream readers before retiring the source of those invented records.

**Verified reach:** the named scene, press-contact, appointment and pressure paths. Ordinary-player frequency remains unmeasured.

## Evidence appendix

Detailed excerpts, qualifications and additional findings are in `codex-verification-supplement.md` in this folder. Existing reports from other writers have been preserved.

- Financial common settlement and federal split: `src/simulation/public-budgets/index.ts:144–175`, including `federal: settleFederalTreasuryMonth(...)`.
- Separate budget arithmetic and payment-reader defects: `src/simulation/public-budgets/month.ts:161–189`, `src/simulation/public-budgets/month.ts:701–720`; excerpt: `outcome.status !== "completed"`.
- Shared financial writers to retain: `src/simulation/resources.ts:275`, `src/simulation/resources.ts:442`, `src/simulation/resources.ts:729` (`createResourceFlow`, `recordResourceTransferOutcome`, `createResourceObligation`).
- Current enacted dispatch: `src/simulation/enacted-law-effects.ts:245–272`; excerpt: `if (!isPinnedTransitMeasure(next, measureId))`.
- Bill/sponsor draws: `src/simulation/governing/legislative-clock.ts:1615`, `src/simulation/governing/legislative-clock.ts:1647`; excerpts: `rng.pick(authored)` and `.integer(0, members.length)`.
- Shared vote entry: `src/simulation/governing/chamber-votes.ts:196` (`decideChamberVote`). This recommendation retains its boundary, not every current scoring constant.
- Arbitrary tie: `src/simulation/decisions.ts:199–203`; excerpt: `left.option.key.localeCompare(right.option.key)`.
- Duplicated orchestration: `src/simulation/world.ts:1425–1461` and `src/simulation/time-work.ts:1987–2029`; both chain the same named post-advance operations.
- Missing vote becomes tenure: `src/simulation/governing/chief-justice-vacancy.ts:395–438`; the `if (vote)` block is followed by an unconditional tenure event.

## Coverage limits

The numeric and randomness inventories are search candidates, not automatically proven violations. All 31,146 numeric candidate lines have not been individually adjudicated. External studies have not been independently revalidated. Counts of repaired or unlocked laws require an explicit mapping and are not invented here. This roadmap is a prioritized source audit result, not a completed full-game acceptance report.
