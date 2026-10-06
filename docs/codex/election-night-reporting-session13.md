# Election-night beats reveal saved precinct returns

Before: the saved precinct count had no reporting sequence.

After: a pure reader orders those returns from fewest ballots to most and groups them into at most six beats. Running counts end at the exact saved candidate totals and winner. The final beat is exposed as the Skip target. The played scene and its controls are still unfinished.

## Record and checks

Inspected: electionNightReports(world, contestId, beatCount) in src/presentation/election-night-reporting.ts reads the canonical contest and saved result. Each beat carries its precinct rows, batch and running totals, result and map references, and a final marker. Only the final beat includes the saved winner. Reads never create speech, presence, knowledge or a result.

Measured: six focused checks pass, including saved count sums, reload, dated maps, national result isolation, reporting order and final totals. The receipt is docs/codex/evidence/session13-election-night-reporting/tests.txt. These are source checks on the unresampled Tyrone, New Mexico, fixture, not ordinary-player election-night proof.

Early/mail reporting remains absent because this count does not record ballot method. A state's permission to count early cannot establish how these particular ballots were cast. Room presence is also null until an actual room record establishes it. These boundaries prevent invented batches and attendance.

## Next integration

This reader depends on #2372 saved returns. Session 4's shared blocks own English and central turn/knowledge writes. Current main's interface document lists those APIs as unmerged; the published source has been fetched into the existing repository for composition. TV reporting, actual reactions, speech, Skip and return still need the played route. No scene-side merge is requested before the owner proof gate.

Method: the source fixture uses the canonical resolver and serialization. Six is presentation pacing, not a counting rule. No annual run, new clone, deletion or global storage policy change was used.
