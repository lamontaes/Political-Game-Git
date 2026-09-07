# Judicial office identity, selection, and tenure source domain

Status: **IMPLEMENTED HEADLESS SOURCE DOMAIN — INDEPENDENT SOURCE AUDIT PENDING**

## Boundary

`src/source/domains/judicial-office-selection/` compiles the completed 92L
research into real-world evidence records. It does not create courts in the
simulation, resolve law for a simulated date, adjudicate a case, evaluate a
judge, score ideology or quality, or expose player UI. There is no simulation
adapter.

The stable record key is `<jurisdictionId>:<officeFamily>`. Identity therefore
survives later evidence refreshes and also exists for a researched family that
is explicitly absent.

## Evidence topology

The received Drive document
`92L_NATIONAL_JUDICIAL_SELECTION_TENURE_COMPLETION` is committed byte-for-byte
under `data/source/judicial-office-selection/raw/` and protected by an artifact
lock containing its Drive identity, byte count, digest, retrieval time, and
bounded rights statement.

The packet identifies a companion machine-readable artifact. The checked-in
`research-transcription.json` is treated as a compiler-owned, packet-referenced
transcription; it is not represented as an independently retrieved Drive
artifact. The constitutional provisions, statutes, rules, and other sources
cited inside 92L are retained as reported authority strings. They are expressly
marked `CITATIONS_REPORTED_NOT_RETRIEVED` and are not promoted to first-party
artifacts.

The acquisition plan is intentionally empty. The authenticated Drive packet is
already committed and locked, and an unauthenticated command must not replace
it with a sign-in page or other response body.

## Coverage

The corpus declares a complete researched universe as of 2026-09-05:

- 51 jurisdictions: the federal system and all 50 states;
- 156 stable jurisdiction/office-family slots;
- 148 active office families; and
- eight intermediate-appellate slots whose office existence and dependent
  fields remain explicitly `NOT_APPLICABLE`.

The six office families are highest court, split civil and criminal apex
courts, intermediate appellate court, general trial court, and
chancery/equity court. A record can be present as an identity without falsely
claiming that the corresponding court exists.

## Selection and tenure representation

The domain retains 92L's reported mechanism taxonomy and ordered workflow
tokens, then derives only bounded atomic stages such as merit shortlist,
executive appointment, confirmation, legislative election, partisan or
nonpartisan ballot stages, retention, reappointment, and judicial assignment.
Alternative district or county paths remain separate ordered paths rather than
being collapsed into one label.

Initial selection, interim vacancy filling, and retention or renewal are
separate pipelines. Tenure distinguishes good behavior, a fixed term, and
assignment. Thresholds remain exact source tokens. A missing requirement,
unknown fact, and inapplicable fact remain different source states; absent
states never carry a value.

## Audit oracles

The domain validator and focused tests independently enforce:

- exact jurisdiction, slot, active-office, and absent-intermediate counts;
- stable, unique record IDs and binding to the locked Drive packet;
- contiguous order for every atomic path and retention of reported workflow
  order;
- recognized atomic mechanisms only;
- non-applicable dependent fields for absent courts;
- distinct good-behavior and fixed-term representation;
- exact retention thresholds and reported vacancy self-succession negatives;
- no promotion of reported citations into retrieved primary evidence;
- no value attached to `UNKNOWN`, `NOT_APPLICABLE`,
  `NO_REQUIREMENT_FOUND`, `CONFLICTING`, or `SUPPRESSED`; and
- absence of ideology, predicted-ruling, quality, and suitability fields.

`source:replay` recompiles the corpus and manifests in a scratch directory and
requires byte identity with the checked-in outputs.

## Refresh procedure

1. Retrieve the identified Drive document through an authenticated connector
   and compare it with the locked bytes.
2. If the packet changed, preserve the prior snapshot rather than silently
   overwriting its historical evidence identity.
3. Obtain and record the companion artifact's own retrievable identity when it
   becomes independently available; until then retain the current transcription
   status.
4. Update normalization only where the packet supports the change. Never infer
   a missing requirement, court, stage, actor, term, or threshold.
5. Recompile, rebuild the aggregate manifest, validate, and replay before
   review.
