# M0 developer bench

Open a Codespace with at least 16 GB of memory, run `npm run bench`, and open
forwarded port 3000. Use a new random seed or enter any seed. The seed draws a
jurisdiction from all 56 and a locality from that jurisdiction's source catalog;
there is no default town. Opening generation retains the core's full default
cohort and checks every displayed resident's household and job references.

Select a living resident, then use Day, Week, Calendar or Skip until needed.
The first player frontier is midnight after the opening date. Day and Week
request one or seven days from the exact frontier; Calendar requests midnight
on the entered date. The API can return before that destination with an issued
choice or stop. Choose an issued offer and submit it, or continue after a stop.
Each answer continues the original destination. Time controls are disabled while
an answer is outstanding. A held deadline stays paused until its owning module
releases it; Continue merely checks whether it has been released. Choosing
another person requires a completed civil-day boundary without a pending choice
or intention; the core rejects an unsafe switch without changing the owner.

Skip looks ahead up to 365 civil days (a bounded developer lookahead, not simulation
calibration) and probes one civil day at a time until a player choice or exact recorded stop.
Answering a pause continues only its current probe, so it does not commit the
player to a year of future answers. The
screen says fixed commitment, director moment at or over 0.50, or deadline offer,
including all tied record reasons in the packet. Other people keep choosing
through the core. Durations are the issued core minutes, with their evidence;
the bench has no time writer or energy meter.

The director currently publishes new scored moments in its end-of-day callback.
The bench's registered adapter reads only those new saved moments and registers
an interrupt at the publication frontier (the next midnight). It excludes
historical opening moments and scores under the spec's 0.50 line. It does not
invent a within-day occurrence time or change the director. Fixed commitments
and registered offer deadlines come from `earliestPlayerStopV1`; the bench does
not create deadline offers. No deadline-producing game module is installed in
this two-branch integration; held deadline behavior has a labeled edge-fixture
check for the finisher.

Click Select trace record beside a saved act, relationship, payment or director
moment, or enter a record ID. Core records use `resolveSavedTraceV1`. Director
moments show their saved impact channels and their cause's core trace; impact
channels are not represented as saved choice scores. Missing reasons, scores,
source references and records remain explicit. Inspected records without saved
scores are listed under Records with no saved scores yet. Original scores in an
issued choice are displayed as issued scoring evidence; they are not claimed to
be a saved act before the core finishes it.

The eleven-step panel and four world rows stay record-backed. With P15 removed,
Sol's opening contains 17-year-olds and adults starting at 19; the panel uses an
actual resident approaching 18, shows the recorded upcoming birthday and current
contact offer, and marks steps 1–2 reachable. Existing 18-year-olds are preferred
when present. Steps 3–11 name missing modules. No step is marked reached until
the world modules run, and opening history never counts as played evidence.

`integration-heads.json` identifies the exact Sol-core and director inputs.
Drives and P15 people work are deliberately omitted pending their owners'
re-integration. Core and director source trees exactly match that clean merge;
all adapter code is in `src/bench`.

Checks: `node src/bench/place-selection.test.mjs`,
`npx vitest run src/bench/player.test.ts --maxWorkers 1`, and
`npx tsc -p src/bench/tsconfig.json`. To repeat the actual screen receipt, start
the bench, then run
`npm run storage -- run e2e-capture -- node src/bench/verify.mjs`.
The verifier uses system Chromium; `BENCH_BROWSER` and `BENCH_URL` can select
another installed browser or running bench. It draws fresh seeds and residents,
answers choices on screen, samples twenty saved items randomly, and writes
`screen-receipt.json`. These are builder checks; independent acceptance remains
with the finisher. See `HANDOFF.md` for measured results and limitations.
