# MUNI-FINISH4 checkpoint

Continuation of PR #149 from 93328bd76f6b191a35ec472bc0f6738f44e9c2c8.
This is implementation evidence, not independent or human acceptance.

## Source coverage

The existing 144-government inventory is retained without a jurisdiction ceiling.
The browser projection now carries 162 readings: four enacted readings, 143
existing research fixtures, and 15 dated meeting-reference observations. The
production corpus hash remains
92e0a61acb28f90a028b3d46bd797e9baae175232947c17b0d951af17b856388.

`data/source/municipal-governance/meeting-practice/declarations.json` identifies
23 series and their exact cached source bytes, retrieval dates, quoted conditions,
and optional PDF text derivatives. The generator verifies hashes and excerpts,
uses the existing parser and fixture compiler, and leaves legal rules empty.
Unknown reuse rights remain unknown; these are reference fixtures, not admitted
production legal artifacts. No new research fetch or recovery replay was needed.
The existing report expansion also retains Oakland's attributed meeting practice.
Cincinnati's mixed dated material leaves current applicability unknown; a single
Portland, Maine notice does not establish a recurring current series.

The only changed government identity is Honolulu's published government-unit
website binding. Its Census-place link remains null. No new home-place join is
inferred. Government, municipality, county and Census place retain distinct IDs.

## Consumer changes

Public series are selected independently within a government, with reference
scope retained in canonical scheduled history. Game-authored occurrence timing
never becomes a published agenda or legal commencement date. Completed sessions
can be followed by another authored session; an existing pending session is a
no-write result.

A current exact-government role can prepare and complete private meeting notes
through canonical Work, clock, events and save data. Ordinary citizens cannot
create or perform that role work. Refusals preserve the input World, including
conflicts, departed roles and duplicate completion. No shared calendar or second
municipal engine is added. Reported veto or appointment provisions cannot grant
enacted authority. Fargo and Morgantown's unestablished comment practice remains
UNKNOWN rather than a false prohibition.

Seventeen explicit venue bindings preserve exact source identity and require a
municipal history anchor. Chamber pictures are disclosed as generic atmosphere,
not verified layouts, dimensions, seats or rosters. ENV still decides whether
canonical completed current-instant attendance permits rendering. Private notes
never supply chamber presence; unresolved rooms remain unresolved.

## Proof and remaining gates

Source excerpt corruption, unknown comment practice, and report-only authority
have regression controls. Canonical tests cover citizen attendance in Carson City
and Charlottesville, member work completion, save/reload, duplicates, departure,
calendar conflict, repeated sessions and every explicit venue binding.

`tests/acceptance/municipal-member.browser.ts` is a separate normal-route test for
UI-core's composed candidate. It creates a real Carson City citizen save, authors
only an explicitly disclosed member fixture into that isolated save, then uses
normal controls for work and persistence. It must be run on the identified UI
candidate; it is not evidence merely because it typechecks. Screenshot paths use
per-run test output and preserve earlier evidence.

UI-core reported citizen normal-route proof on
92bf3819260112525b30a299fdb2fb56d635f334. That earlier identified result is not
relabeled as proof of these newer changes. Final full validation, current member
browser proof and the independent reviewer's exact findings remain pending at
this checkpoint. The old 3237-pass/one-failure run remains historical.

## Architecture and LEARN

Reviewed against canonical World/time/Work/history, data-driven authority,
source identity, pure simulation and feature-local UI boundaries. No root
navigation, shared time engine, election engine, procedure defaults or current
cash balances were introduced. UI-core owns combined integration and prose
regeneration; this branch's inventory is generated locally from its own tree.

Recurring source-scope errors now have executable negative controls: quote/hash
verification, unknown-versus-false comment handling and non-enacted power refusal.
The smallest durable repair is those controls, rather than a larger handoff prompt.

## Executed final gates

The corrected municipal source head is
`c23d8489f968675b482c0e3d485024211fc951fa`. Hosted run
[34316641782](https://github.com/lamontaes/Political-Game-Git/actions/runs/34316641782)
completed `Run repository validation` successfully. This is the actual full
`npm run validate` step. Its later workflow browser result is not claimed here.
Local art validation, inventory and QA generation also passed.

The composed normal-route proof ran on UI-core's authorized frozen
`8c18cd8efbf2325bedde31d63c53f0bf9adfbea2`, containing that municipal source,
plus exactly the test-only changes in `normal-route-tests.patch`. Both browser
tests passed in 16.6 seconds with one worker. Production source was unchanged.
The patch was supplied to the UI owner for its existing carrier.

The first failing control selected the county-equivalent result from the creator's
full-name query. The municipal adapter correctly refused that unverified place
join. The test now queries the shorter name and selects the visible Nevada
locality explicitly via the existing scope label. No government join was added.
A second member-test failure was exclusively `favicon.ico` returning 404; that
known optional asset defect is separately recorded while other application errors
remain fatal. Both work/save/reload flows had already passed their assertions.
Native Node also required the repository's TypeScript loader for generated JSON.

Command (port was verified unused; server stopped after the run):

```sh
NODE_OPTIONS='--import=tsx' PLAYWRIGHT_PORT=5396 PG_RUN_ID=muni-finish4-8c18cd8-final npx playwright test tests/e2e/municipal-member.spec.ts tests/e2e/ui-converge4.spec.ts --grep 'normal saved municipal member|normal Carson City citizen' --workers=1
```

Citizen proof: normal creator, pointer and keyboard activation, public attendance,
current released venue, save/reload, unchanged roles and duplicate/read purity.
Member proof: the normal creator's saved World receives only an explicitly
identified canonical member fixture before reload; subsequent normal controls
complete 20 authored minutes of private Work, persist the result, and refuse a
duplicate without writes. This fixture is not a production route into office.

Screenshots were inspected: `normal-municipal-current-room.png` and
`normal-municipal-member.png`. They show the current public room and completed
private notes respectively; they are engineering evidence, not human visual
acceptance. The unresolved favicon remains disclosed. Independent ACCEPT-CLOSE4
findings have not been supplied, so independent acceptance is still open.

The heavy/browser slot was explicitly released to FISCAL. No server, deployment,
merge or background monitor remains active from this proof.
