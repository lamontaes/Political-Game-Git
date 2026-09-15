# RULES TO PLAY — nationwide rule data and capability resolution

Owner: RULES TO PLAY (Claude Code Desktop, Opus 5). Worktree
`/private/tmp/pg-rules-to-play`, branch `claude/rules-to-play`, based on
`20501132bddd893207aa8efa223f06ff88ca60e0` (codex/modular41-final-repair,
compiled d75abfcb), accepted by LAND b6. Authority: Drive packet
"CLAUDE COMPLETION PACKET", RULES TO PLAY section (nationwide revision).

This plan stays active: increment 1 is implemented; nationwide data batches
continue behind the same interface.

## Increment 1 — implemented

### Nevada: observation date is not operative date

- New locked artifact `nv-2025-chapter-323-ab491` (2025 Nev. Stat. ch. 323,
  §§ 12 and 78) in `state-office-qualifications`.
- `temporal.ts` dates NRS 218A.200 from 2025-10-01: § 78 applies the amended
  qualifications to every candidacy filed after October 1, 2025; the act has no
  other effective-date section; the Legislature's 83rd Session passed-bills list
  records "Effective October 1, 2025." Before that date the rule stays
  unestablished (the pre-2025 text was not acquired), with a reason naming the
  date instead of the retrieval date.
- Consumer proof: an ordinary Alamo, NV life on 2026-01-05 is refused only by
  its own recorded residence (0 years); after a real year on the shared clock it
  is eligible, files for the Assembly and survives reload.
- Still UNKNOWN: district voter registration (§ 12's new paragraph 4), elector
  status, Senate rows, filing deadlines, seat counts from an operative source.

### Charlottesville: one playable ordinance route

- New locked artifacts: `va-charlottesville-city-code-ch2` (Municode publication
  job 487467) and `va-code-15-2-1428`.
- Compiled cells: introduction recorded by the clerk (§§ 2-67, 2-124); one
  passage stage (§ 2-97); no committee referral between introduction and passage
  (§§ 2-97, 2-124); the mayor has no veto power (§ 2-39(a)); effective from
  passage (§ 2-99); at least three intervening days (§ 2-97).
- Engine seams (additive; state packs unchanged): `referral.floorWithoutReferral`
  and enrolled → awaiting-enactment where presentment is known false.
- `municipal-ordinance-procedure.ts`: agenda, timing, quorum (Charter § 12),
  recorded vote from supplied dispositions, enrollment and enactment effective
  on passage; `admitCouncilAction` (rules-municipal-authority/v1) for Va. Code
  § 15.2-1428 and City Code § 2-98 (text current from 2026-02-02).
- Ordinary controls in Local government: introduce, put on agenda, earliest
  valid date, own ballot, disclosed game-authored colleague ballots (owner
  decision 2026-09-14), record vote, enacted/effective outcome.
- Council seats in the browser proofs are a labeled review scenario, not
  ordinary election; that producer belongs to NATIONWIDE WORLD/ELECTION.
- Still UNKNOWN: who may move an ordinance beyond the Code (R-24-034 is a
  scanned PDF, not compiled), the basis of § 2-97's four-fifths same-day
  exception, § 2-98 before 2026-02-02, meeting cadence (§ 2-41 not compiled).

### Nationwide resolver and coverage

- `src/simulation/government-units.ts` + generated index: all 38,704 Census 2025
  general-purpose governments (3,031 counties, 19,489 municipalities, 16,184
  townships). Place GEOIDs only for municipalities verified against the places
  corpus; statistical places resolve to nothing.
- `src/simulation/rule-capability-resolver.ts` (rules-capability/v1): scoped,
  dated, per-field resolution; refusals name only the fields an action needs;
  Va. Code § 15.2-1428 admitted as a class statute for Virginia localities;
  § 15.2-1427 reported only as an inherited default.
- `node --import tsx scripts/source/nationwide-rule-coverage.ts` writes
  `docs/systems/nationwide-rule-coverage.{json,md}`; producer columns are
  reported as not measured by RULES. (A `coverage:nationwide-rules` npm script
  is an adapter request to LAND, which owns `package.json`.)

## Checks actually run (increment 1)

- Correction: the `npx tsc --noEmit -p tsconfig.json` runs reported here earlier
  checked no files (the root `tsconfig.json` holds only project references).
  The repository's `npm run typecheck`, run after NATIONWIDE WORLD/ELECTION
  (-03) reported it, found a missing `governmentUnitsForPlace` import in
  `rule-capability-resolver.ts`. `.gitignore`'s `coverage/` pattern had also
  silently excluded the coverage script and reports from every commit. Both are
  fixed in the correction commit; see "Correction commit" below.
- Focused vitest: office-qualification-rules, nevada-legislator-qualification,
  rule-capability-resolver, municipal-ordinance-procedure, municipal-public-work,
  municipal-governing, municipal-rule-registry, legislation, legislature
  rule-pack matrix, tests/source municipal-* and qualifications.
- `npm run source:replay` clean.
- Playwright `tests/e2e/rules-council-ordinance.spec.ts`: 1 passed (keyboard).
- Pointer journey in the composed dev app at 1024×768: creator → Charlottesville
  → Local government → introduce → agenda → too-early refusal → Day ×4 → vote →
  enacted and effective 2026-01-09 → save → reload.

Known pre-existing failure on the base: `legislation-origination-integrity`
Minnesota Senate expectation (LAND has an updated test in its receiver).

## Increment 2 — New Jersey batch and per-state legislator admission

- New locked artifact `nj-constitution-art-4-sec-1` (the Legislature's published
  constitution, one provision per artifact): Senate age 30 and four years'
  state residence, General Assembly age 21 and two years, each dated from
  1966-12-08 by the page's own literal "Article IV, Section I, paragraph 2
  amended effective December 8, 1966." verified from the retrieved bytes.
  Earlier text was not acquired and stays unestablished.
- The coverage report now probes each state's legislator qualifications through
  the resolver whether or not a playable office exists. Admitted for at least
  one chamber on 2026-01-05: 2 states (NV lower; NJ both chambers).
- Checks: tsc clean; office-qualification-rules, rule-capability-resolver,
  nevada-legislator-qualification, nationwide-rule-coverage and
  tests/source/qualifications (35 tests) pass; `source:replay` clean; eslint
  clean on changed files. Commit `9615a93f`.

### Correction commit

- Fixes: the missing `governmentUnitsForPlace` import; the coverage generator
  moved to `scripts/source/nationwide-rule-coverage.ts` and its reports to
  `docs/systems/nationwide-rule-coverage.{json,md}`, out of the ignored
  `coverage/` pattern, with no `.gitignore` edit.
- Checks after the fix: `npm run typecheck` clean; 40 focused tests pass
  (resolver, coverage, qualifications, ordinance procedure, municipal governing,
  Nevada, tests/source/qualifications); `source:replay` clean; eslint clean.
- Full unit suite, both worktrees: this branch 5096 tests / 103 failed, base
  `20501132` 5083 / 106 failed. Entries only in this branch were either taken
  mid-edit (qualification count, coverage freshness; both pass at the head) or
  load timeouts. Back-to-back reruns of the timing-out files gave the same class
  and count on the base (two 5 s / 30 s timeouts each, on different files per
  run), so they are not attributed to this branch.

### Agreed with NATIONWIDE WORLD/ELECTION (-03)

- `candidacy.ts` (their edit, with RULES' OK): "office-does-not-exist" only when
  an OFFICE_EXISTENCE assessment fails; an undated existence row blocks as an
  unproved qualification with its own sentence (MN and NE governors).
- New optional `priorTermsInOffice` on `QualificationAssessmentInput`: a known
  TERM_LIMIT row is met when the caller supplies 0 from canonical office
  records; absent keeps today's not-evaluated behavior (MO and OH governors).

### Dating findings, not implemented

- Minnesota (Art. IV § 6; Art. VII § 6): rows are dated only by the 2026-09-09
  observation. The locked Revisor page states "Generally Revised November 5,
  1974" and labels later changes per section ("[Amended, …]"); § 6 carries no
  label. Dating it from the header would treat the absence of a label as proof,
  which the temporal contract does not accept today. Proposed evidence rule for
  the control plane: admit a publisher general-revision date for a provision
  only when the same locked page labels amended sections and the provision's
  region is verified to carry no amendment label.
- Nebraska (Art. III § 8): the locked page says "Amended 1972, Laws 1971, LB
  126" with no day, and omits the 1992/1994 initiative changes per Duggan v.
  Beermann. A year-only label cannot fix a start date without invented
  precision; the gap stays open.
- Missouri legislator rows lack STATE_RESIDENCE and Ohio's lack MINIMUM_AGE in
  the research transport; those are research gaps, not dating defects.

### Publisher access limits met by the acquisition client

- Michigan Legislature constitution PDF: HTTP 403. New Hampshire General Court
  constitution URL from the research: HTTP 404. Alaska Legislature constitution
  pages: 403/404 (the Lieutenant Governor's page has the text but no amendment
  history). Mississippi and Montana research URLs are index pages, not the
  provisions. These states need an alternative first-party retrievable source
  before rows can be compiled; the pipeline's honest user agent is not changed.

## Increment 3 — place-to-county relation for NATIONWIDE (-03)

Branch `claude/rules-to-play-counties`, based on LAND's `542c7222`.

- The Geography Division publishes no 2020 place-to-county relationship file
  (rel2020 `place/` holds only place20–place10), and the Census API needs a key
  this project does not hold. Source used instead: the 2020 P.L. 94-171
  redistricting geoheaders, summary level 155 (State-Place-County).
- New domain `place-county-relations`: 51 state archives (50 states + DC; not
  PR) cached, not committed (1.2 GB), each with a committed derived QA slice of
  its 155 lines (8.9 MB total). The cut refuses to write a slice unless every
  level-160 place's land and water equal the sums over its 155 parts.
- 33,037 parts, 31,617 places, 1,294 in more than one county (at most 5).
  New Mexico's geoheader is Latin-1 ("Doña Ana" as a lone 0xF1), not the UTF-8
  the technical documentation states; declared per state.
- The part flag (W "Not a part" / P "Part") describes the county component,
  not a split: a Virginia independent city is W. Splits are read from part
  counts only.
- `countyGovernmentUnitsForPlace(placeGeoid)` in `government-units.ts`: county
  government units with the share of the place's 2020 land in each, largest
  first. County areas without a county government in the 2025 listing (Virginia
  independent cities, consolidated city-counties the listing files as
  municipalities, Connecticut's retired counties) contribute nothing, so shares
  can sum below one and the result can be empty.
- Export: `node --import tsx scripts/source/export-place-county-relations.ts`
  (npm script is a LAND adapter request). Geography is 2020-04-01, stated in
  `PLACE_COUNTY_RELATIONS_META`.

## Remaining, owned

- RULES data batches behind the resolver: state legislator and governor
  qualifications for the remaining states from primary text with publisher
  dating; Massachusetts next (retrievable, ratification dates stated in prose);
  governor term length/start and election cycle for -03; Alaska art. II dating
  (the existing rule set still gates on its 2026-09-06 observation; art. II was
  amended in 1976, 1984 and 2006 and no reached source says whether § 2 changed).
- Local body sizes and passage rules beyond the three compiled cities, by
  state class statute where one binds the class, otherwise by instrument.
- Councilor-decision producer (replaces authored colleague ballots):
  NATIONWIDE WORLD/ELECTION or its successor.
- Ordinary election to council and state executive candidacy producers:
  NATIONWIDE WORLD/ELECTION (-03).
- Player-facing prose anchors for the new Local government copy: minted by
  LAND on its ledger after rebase.
