# 92G Judicial Gameplay Current-Mechanics Wave

Status: **Active. Additive and headless; not player-visible; not merged.**

## Authorization and baseline

- Repository: `lamontaes/Political-Game-Git`.
- Workspace: `/Users/lamontae/Documents/Political-Game-92G`.
- Branch: `codex/92g-judicial-gameplay-compiler`.
- Initial accepted-main base: `48e217cce3929abc1f8c848c70743f5af2a53b0f`.
- Final reconciled accepted-main base: `850048dc06ac5a1ee4c08d8f41d286c377707bb5`
  after the required live fetch and clean rebase.
- The detached source workspace at `/Users/lamontae/Documents/Political Game`
  remains read-only; its two unrelated modified evidence images are untouched.
- Final publication requires a fresh fetch of `origin/main`, reconciliation,
  validation, and an exact clean-state report.

Research consumed from Google Drive on 2026-09-06:

- `92G_JUDICIAL_GAMEPLAY_WORKFLOW_COMPLETION.md`, Drive
  `1Z9YkjtS3nWlF0YL9asCHmhlgIb4HdmkA`, 53,020 bytes, Drive modified
  `2026-09-05T23:24:36.704Z`.
- `92G_JUDICIAL_GAMEPLAY_SEED_BANK.md`, Drive
  `1F0aE8h_TS7q2ELJM3Dz9Nry4RXrvLDj5`, 127,782 bytes, Drive modified
  `2026-09-05T23:23:44.469Z`.

The seed bank supplies sixty researched kernels but no current-repository
mechanic status. This wave therefore classifies them against accepted `main`;
the classification is an implementation finding, not a rewrite of the
research.

## Compiled subset

Compile the ten kernels whose central playable setup is administrative,
calendar, chambers-personnel, relationship, or response work that the existing
canonical primitives can carry without a court-rule or disposition engine:

- `SEED-04` — Tardy Public Defender & Morning Cattle-Call Docket Congestion
- `SEED-08` — Rule 16 Scheduling Dispute: Lead Counsel Pregnancy vs Expert Costs
- `SEED-41` — The Leaking Law Clerk and Sensitive Draft Opinion Breach
- `SEED-42` — The Impaired Colleague Judge Falling Months Behind on Dockets
- `SEED-43` — The Gatekeeping Judicial Assistant Feuding with Local Litigator
- `SEED-45` — Chief Judge Pressure on High-Stakes Municipal Budget Lawsuit
- `SEED-48` — Emergency Court Reporter Absence and Record Integrity Crisis
- `SEED-49` — Spouse Hosting Political Fundraiser in Shared Marital Home
- `SEED-50` — Leaked Bar Association Judicial Evaluation Survey Ratings
- `SEED-59` — Judicial Conduct Commission Inquiry into Courtroom Demeanor

Each compiled plan must use only inputs to existing canonical writers for:

- ordinary historical events;
- objective evidence artifacts;
- scheduled activities;
- office work items;
- relationship interactions.

The caller must bind existing people, a canonical court organization, and
active canonical work relationships for court-insider roles. The compiler may
not infer judicial authority from an organization name, a role label, a file,
or the 92L source corpus.

## Mechanic-gated remainder

Carry all fifty remaining rows with explicit blockers and no compiled
definition. The compiler must refuse them.

- `SEED-01`–`SEED-03`, `SEED-05`–`SEED-07`, `SEED-09`–`SEED-40`,
  `SEED-44`, `SEED-46`, and `SEED-47`: central action requires a canonical
  case/motion/proceeding/disposition record and effective jurisdiction rule.
- `SEED-51`–`SEED-58`: central action requires judicial office,
  selection/tenure, nomination/appointment, confirmation, election/campaign,
  or court-leadership authority not established on accepted main.
- `SEED-60`: central action requires sourced senior-status/pension eligibility,
  office vacancy, and post-judicial career-transition consequences.

The compiled operational kernels may preserve a downstream omission where a
conduct commission, employment discipline, case transfer, or legal order would
need a later owner. They may open the canonical work; they may not fabricate
that later result.

## Files and ownership

Add only:

- `src/simulation/judicial-gameplay-kernels.ts`
- `src/simulation/judicial-gameplay-kernel-bank.ts`
- `src/simulation/judicial-gameplay-kernels.test.ts`
- `tests/judicial-gameplay-ownership-boundary.test.ts`
- `docs/systems/judicial-gameplay-workflow-kernels.md`
- this active plan

Do not edit:

- `src/source/domains/state-elective-office-identity/**` or its manifests,
  compiler, locks, fixtures, tests, and system documentation (the 92L ownership
  surface);
- `src/simulation/types.ts`, `world.ts`, `future-transitions.ts`, or the shared
  simulation index;
- player, presentation, UI, art, CSS, or persistence surfaces.

## Verification and completion gate

1. Prove all sixty research rows are present once and coverage derives ten
   compiled plus fifty gated without a hard-coded count assertion.
2. Prove every compiled step is an input to one of the five accepted canonical
   writers and an applied plan round-trips exact JSON.
3. Prove role binding, active court work, world/moment binding, event-before-
   evidence ordering, schedule conflicts, and gated-kernel refusal fail closed.
4. Prove the compiler emits no ideology meter, moral slider, predicted-ruling
   score, probability, court disposition, judicial authority, or autonomous
   player choice.
5. Measure the 92L source-domain ownership surface against the reconciled base.
6. Run focused tests, `npm run validate`, all three required art commands,
   `git diff --check`, and final agent preflight.
7. Re-fetch `origin/main`, reconcile without weakening any gate, push the
   branch, and leave it draft/unmerged as
   `READY FOR INDEPENDENT JUDICIAL GAMEPLAY AUDIT`.

## Validation record

- Final reconciliation: clean rebase onto
  `850048dc06ac5a1ee4c08d8f41d286c377707bb5` after a second explicit live
  fetch; the first reconciliation was repeated because `main` advanced during
  validation.
- Focused compiler and ownership suite: 19/19 passing after final rebase.
- Repository suite with a 30-second per-test validation allowance for this slow
  host: 2,368/2,369 passing after final rebase. The sole failure is inherited
  from accepted `main`: the newly merged 92H ownership test measures from
  `982f613a9737e25e506dc430e4f6e121dd72b3ca` and therefore flags the later
  accepted `package.json` change. This branch does not edit either file and
  does not repair another owner's audit surface.
- Before that final `main` advance, the same complete suite passed 2,314/2,314.
- The default-timeout `npm run validate` reached 2,290 passing tests before
  three unrelated five-second host-load timeouts. The complete extended-timeout
  rerun passed, and the remaining validation stages were then run directly.
- Formatting, lint, typecheck, source validation, byte-identical source replay,
  production build, deterministic demo, and art validation passed.
- `validate:art`, `inventory:art`, and `qa:art` passed; inventory remained at
  322 items, and the generated QA outputs were byte-unchanged in git.
- Known inherited source gates and warnings are unchanged: four existing
  production-source acquisition gates, LAUS/FEC source warnings, Vite chunk-size
  advisory, Node SQLite experimental warnings, and one dependency audit alert.
