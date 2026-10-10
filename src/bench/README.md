# M0 bench — WIP

Developer tool only. It reads the core's opening records and offers. It does not
advance time or invent choice outcomes, why scores, stories or world activity.

Open a Codespace with at least 16 GB of memory, run `npm run bench`, and open the
forwarded port. The devcontainer selects Node 22 and installs the existing
lockfile's dependencies through the storage guard on creation. No dependencies or
lockfile changes are introduced. The bench command uses the storage reservation.

The server is an opening/resident-inspection slice, not M0 acceptance. Integrated
source heads are recorded in `integration-heads.json`. People parts 1–3 are
included; part 4 still has an owner decision pending. The opening uses the public
population, deep-past, civic-input and finance builders. Health, drives and the
director are installed through the public module interface, alongside life,
people, work and finance. Selecting a resident starts director observation and
shows its saved opening moments; inspection advances no core time.
Opening uses the core's default population size; it does not reduce the cohort
for convenience. Both the jurisdiction and locality are drawn from recorded
catalogs by the seed. Missing jurisdiction coverage rejects rather than choosing
a fallback town. The resident list includes only people whose recorded place ID
matches the drawn town, rather than relatives living elsewhere. Age, household,
job and offered actions come from core records. Every listed household membership
and job owner is checked against the same core before the opening is returned.

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
- CTO resolved the director interrupt boundary to **at or over 0.50** in
  [PR #3940](https://github.com/lamontaes/Political-Game-Git/pull/3940#issuecomment-6102574333).
- A saved reason/source facade covering choices, director moments, relationship
  changes and payments, with the referenced record IDs resolvable. Computed
  previews are not labeled saved why evidence.

SOL-1258 posted the `core2-part1b-v1` contract on
[PR #3918](https://github.com/lamontaes/Political-Game-Git/pull/3918):
`advancePlayerV1`, `resumePlayerV1`, `earliestPlayerStopV1` and
`resolveSavedTraceV1`. Its body labels implementation pending. The integrated
source still has the synchronous Controller and date-only advancement, so the
bench does not emulate the proposed hooks.

The golden-path/world panel projects opening records with `benchProgress`.
Steps 1–2 identify an actual 18-year-old in the selected town, that person's
household and birth record, a current contact offer and its recorded target.
The panel's route buttons inspect those records; they do not play an act.
Steps 3–11 name their missing modules. All four M1 world pieces remain
"not in the new core yet," even if opening data contains government offices or
relatives in other places. No step is reached without played records and the
world running. M0-01 and M0-05 are ready for the independent finisher's check;
no feature pass flag is changed.

Prepared controls show current offered action/target IDs and the core's duration,
without treating previews as pending choices. Time and submission controls remain
disabled. Relationship snapshots, saved payments and director moments can select
a trace record for later resolution. `/api/capabilities` reports the proposed
contract and installed exports. Advance, resume and trace requests return 409
without invoking the engine while the adapter is absent. This is not the M0-02
seven-day proof, M0-03 stop proof or M0-04 twenty-item trace proof.

Technical values: 16 GB comes from M0-bench; port 3000 is the forwarded development
port; 100 is the browser's page size; 1024 test seeds exercise coverage. These
values do not calibrate simulation behavior.
