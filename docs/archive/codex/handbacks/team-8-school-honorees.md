# New school honorees use historical naming patterns

New lives no longer name a school after a random generated person or surname.
The versioned producer uses the existing historical-figure corpus for person
honorees, while explicit older replay versions keep their original name streams.

## 1. Why-chain

The Dexter playtest reported Jade Cruz Elementary School. The v2 measured
naming shape selected person, then independently drew given and family names
from NAMES_STARTER_V1. Its family branch also drew a random surname, creating an
unsupported local honoree. New v3 keeps the measured shape selection but routes
those two branches through the existing region-weighted historical-figure
corpus. New Game stamps v3; replay encoding and decoding retain the exact version.
Bedrock is seeded authored naming within an existing historical corpus, not a
person's decision or evidence that a real school existed at the attendance date.

## 2. Research

The school-name source lists public historical figures already in wide use as
school names and the existing directory-derived naming shapes and regional
figure counts. The directory establishes naming patterns, not the historical
existence of any particular childhood school. Mapping a person/family naming
shape to that corpus is the CTO7:38 authored restriction; it is not a newly
measured historical-honoree rate. No local figure, biography or real institution
is invented. Generated organization provenance remains generated.

## 3. Revisions

Exclusive declared source: school-names.ts measured naming/version registry;
new-game.ts school-version import/type/default only; new-game-identity.ts
school-version validation/deserialization only; new school-honoree-names.test.ts;
this handback and release note. No school-name-pattern data, world-effect size,
identity/person generator, record writer, school facility or Team5 schedule hunk
changes. Explicit v1/v2 compatibility is deliberate; saved worlds are untouched.

## 4. What gets built, in numbered parts

1. Add school-names-v3 with historical person/family honorees.
2. Select it for new lives across every supported state, using existing regional weights.
3. Preserve the version through canonical replay sharing and decoding.
4. Keep captured v1/v2 generated name streams unchanged.

## 5. Simulated, records, world pieces, checks

SIMULATED: future generated school names only, no present actor or time changes.
RECORDS: new childhood school organizations carry the generated names through
the existing producer. WORLD PIECES: measured naming shapes, historical corpus,
setup identity and replay boundary. Changed test5/5PASS27.82s includes every
supported state over100 seeded draws, legacy SHA256 name-stream comparisons,
new v3 setup/replay and actual generated childhood records in the original
three random places. Strict four roots plus all dependencies0diagnostics.
Final lint/format/standard-type/report receipts are in the pinned PR.

## 6. Proof run

QuanticoMD2464475, RocklandID1669130 and unincorporated TabIN1874780 use original
random seeds team8-opening-1-a/b/c. The test builds actual canonical new lives
and reads saved enrollment organizations; v3 survives replay encode/decode.
Legacy100draw receipts captured before edits are v1SHAe8a2950a36b53ddd4b6fa6b471becf0ca3524d096d1c0e3b07448b1c59ae906f
and v2SHA8f4abdebacf7c0a5e10ae764e2aba701d2499f44d93b4b929dc7546a72837fb4.
Browser/fullsuite/year-speed/original portable-world replay/independent helper
NOT RUN. This producer fix is not a certification of real historical attendance.

## 7. Worked example

A v2 person-shape school could draw Jade and Cruz from the generic name corpus.
For a new v3 life, that shape instead selects a name from the existing historical
corpus, such as Harriet Tubman, under the established region-weighted selector.
The school remains a generated institution, not a claimed real Harriet Tubman
school in Dexter. Explicit v2 replay links still reconstruct their old names.
