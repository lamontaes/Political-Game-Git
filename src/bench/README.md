# M0 bench — WIP

Developer tool only. It reads the core's opening records and offers. It does not
advance time or invent choice outcomes, why scores, stories or world activity.

Open a Codespace with at least 16 GB of memory, run `npm run bench`, and open the
forwarded port. The devcontainer selects Node 22 and installs the existing
lockfile's dependencies through the storage guard on creation. No dependencies or
lockfile changes are introduced. The bench command uses the storage reservation.

The server is an opening/resident-inspection slice, not M0 acceptance. Local
integration of the core, drives, director and ready people work remains required.
Opening uses the core's default population size; it does not reduce the cohort
for convenience. Both the jurisdiction and locality are drawn from recorded
catalogs by the seed. Missing jurisdiction coverage rejects rather than choosing
a fallback town. Age, household, job and offered actions come from core records.

Focused infrastructure check: `node src/bench/place-selection.test.mjs`.
Synthetic identities here test catalog selection, not generated-world proof.

## Missing core capabilities requested in PR #3940

- A pause/resume choice boundary for the selected resident, including committed
  work. `advanceCore` advances the date and runs module work before calling the
  synchronous Controller. Undefined means autonomous selection, not waiting.
  Throwing is not a rollback. The bench must not partially advance to ask a
  question, or replay a cached offer against another date.
- A pre-advance earliest-stop query and advance-to-stop contract covering
  director interrupts, work commitments and deadline offers. Date-only progress
  does not establish exact within-day interruption or action duration.
- The director currently interrupts at `impact >= interruptImpact`; M0-03 says
  over 0.50. The exact-boundary discrepancy needs a CTO/core-owner resolution,
  not a changed spec or a bench override.
- A saved reason/source facade covering choices, director moments, relationship
  changes and payments, with the referenced record IDs resolvable. Computed
  previews are not labeled saved why evidence.

Time controls stay disabled until these APIs exist. Raw record inspection is not
the 20-item M0-04 score/source proof. Golden-path reachability is not certified;
no step is marked reached, and no feature pass flag is changed.

Technical values: 16 GB comes from M0-bench; port 3000 is the forwarded development
port; 100 is the browser's page size; 1024 test seeds exercise coverage. These
values do not calibrate simulation behavior.
