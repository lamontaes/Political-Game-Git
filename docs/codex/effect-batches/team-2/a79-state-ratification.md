# Actual state chambers record ratification votes

Before: A pooled state majority could stand in for the state's actual legislature.

After, partial: Explicitly sourced chamber requirements now govern saved member rollcalls in six states. Other rule forms remain unsupported by this initial adapter. This does not complete nationwide ratification or browser acceptance.

## Why-chain

Measured: Each actual member votes through the shared chamber decision using the existing term-limit considerations. Separate chamber totals govern the state action; no pooled majority supplies an approval ([executed receipt](https://github.com/lamontaes/Political-Game-Git/pull/1637#issuecomment-5940720082)).

## Research

Measured: The adapter consumes merged research batch 1670. Admission requires explicit ratification-specific rows without unimplemented conditions. It does not interpret inferred or unsourced defaults as permission ([executed receipt](https://github.com/lamontaes/Political-Game-Git/pull/1637#issuecomment-5940720082)).

## Revisions

Measured: Optional state-ratification fields retain actual jurisdiction, body organization, source IDs and canonical rollcalls. The validator rejects altered approval and fabricated body identity. Legacy authenticated records retain their existing shape ([executed receipt](https://github.com/lamontaes/Political-Game-Git/pull/1637#issuecomment-5940720082)).

## What gets built

Validate the saved federal proposal, resolve the actual state chambers, decide each recorded member, apply the sourced denominator and quorum, and save one state action with its separate chamber rollcalls. Missing admission leaves the action pending.

## Simulated, records, world pieces, checks

Measured: The supplied successful federal-proposal fixture records twelve chambers in Alaska, Arkansas, Colorado, Delaware, Maine and North Dakota. Three states approve and three decline. Repeated callbacks and Save/Continue preserve action records and IDs ([executed receipt](https://github.com/lamontaes/Political-Game-Git/pull/1637#issuecomment-5940720082)).

Measured: Preparation still covers fifty actual state rosters and excludes six ineligible jurisdictions. All 7,386 compared member ballots and reasons match the fixture baseline ([executed receipt](https://github.com/lamontaes/Political-Game-Git/pull/1637#issuecomment-5940720082)).

## Proof run

Measured: The complete changed file passes six tests with no failures or skips in 71.80 seconds. Seven scoped type roots have zero diagnostics. Changed-file lint/format pass; added production named-law hits are zero ([executed receipt](https://github.com/lamontaes/Political-Game-Git/pull/1637#issuecomment-5940720082)).

## Worked example

Measured: Colorado's House requires forty-four of sixty-five votes. Maria Fisher votes nay for member:other-party; the chamber's recorded total carries. The state approves only because both actual chambers carry ([executed receipt](https://github.com/lamontaes/Political-Game-Git/pull/1637#issuecomment-5940720082)).

## Method and handoff

Executed source: 2fd40176250860f1d1ffa379c38b5437da8e8eb4; main: 5ac5a4bd612ddce75a632ac378360fd73fa01637. Seed: A79-recorded-term-limit-chamber. Starting place: Ashaway, Rhode Island. Sole native session 97958 ended with exit zero. Stock limits remained unchanged.

Earlier receipts remain historical: the preparation passed five cases before research integration, and the first writer candidate passed six before one optional-field type correction. Old committed proof logs remain locally and at earlier durable heads; this renewed diff removes those logs without deleting their files.

Remaining: forty-four states need further adapter admission, including other researched rule forms and extra conditions. Vacancy semantics remain unsupported. The legacy ballot export remains only for parity tests. No full suite, unchanged LOAD, whole-app types, repository sweeps, natural ratification or browser acceptance. Exact-head CTO core review remains required.
