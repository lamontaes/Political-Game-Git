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
