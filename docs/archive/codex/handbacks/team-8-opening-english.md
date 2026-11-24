# The opening tells your school years in a paragraph

Your life so far now connects the saved school starts in one natural sentence,
followed by recorded work. The preceding family card and person cards carry
kinship detail. This overview creates no biography, diploma or new school.

## 1. Why-chain

The old paragraph joined the introduction's grounding rows verbatim, so three
school starts became three repetitive log sentences. Those rows came from
educationEnrollmentHistoryForPerson and organization profiles. The new reader
uses the same saved starts, excludes future/expected enrollments, and orders
them by their recorded dates. The English engine renders a reviewed tell bank
whose slots carry enrollment and organization IDs and the viewer's own basis.
Bedrock is recorded enrollment/name/date bookkeeping and authored wording;
neither enrollment completion nor graduation is inferred. Missing name or
program label produces no invented school. This is read-only.

## 2. Research

The school-name source explicitly says its recent education directory does not
establish historical attendance: school-names.ts names institutionDateReason.
Existing generated biographies call generateSchoolNames with the resident town
name, state and versioned naming corpus; current new-game setup uses v2.
These are generated institutions, not verified real local schools. The three
tested high schools are Quantico High School, Rockland High School and Tab High
School, all saved generated names fitting their town stems. No directory record
is substituted for an adult's childhood. Historical real-school identity remains
a research gap; no universal effect size, new draw or actor outcome is added.

## 3. Revisions

CTO6:04 item4 only, stacked on item1 branch codex/team-8-opening-legislature.
New life-so-far-english.ts and test plus only the your-life summary call in
WorldOrientationPanel; no school producer, English engine, record or nameplate
edit. Expanded kinship log rows are omitted from this short overview while
their canonical records and person/family readers remain available. Actual
current-household introduction and work facts are retained. Names are not
rewritten at render time. English output is stable across JSON save/reload.

## 4. What gets built, in numbered parts

1. Connect up to three recorded school starts per reviewed English sentence.
2. Preserve school names, stage labels, years and source IDs; never say graduated.
3. Show a short introduction, school years and work instead of a kinship log.
4. Keep the separate county/family opening fixes and Team5 day wiring out of this PR.

## 5. Simulated, records, world pieces, checks

SIMULATED: no actor decision, time or money advance. RECORDS: saved enrollment,
organization, household and work grounding. WORLD PIECES: existing English
composition boundary and existing generated school names; missing/historical
real-school identity is not filled in. CHECKS: sole changed test passes 3/3 in the
three logged random part1 places and verifies exact names/years/provenance,
purity, save/reload stability, missing-person and missing-school behavior.
Strict checking of the changed source, test and panel plus their dependencies
reports zero diagnostics. Scoped ESLint, formatting, whitespace and this
seven-heading report check pass. Final standard type/browser receipts belong
in the PR; no unfinished run is marked passed.

## 6. Proof run

Reuse the saved random draw cases QuanticoMD2464475, RocklandID1669130 and
unincorporated TabIN1874780, seeds team8-opening-1-a/b/c. Test-generated saved
fixtures mount the actual WorldOrientationPanel and navigate to your-life in
Chromium desktop1280x800/phone390x844. This checks component output, not a
creator-to-day walkthrough, original portable-world replay or owner acceptance.
Full suite, year-speed and independent helper NOT RUN. Inherited release header
failure remains separately disclosed.

## 7. Worked example

Quantico's records start elementary school in1995, middle school in2001 and high
school in2004. The paragraph reads: You began elementary school at Quantico
Elementary School in1995, followed by middle school at Shields Middle School
in2001 and high school at Quantico High School in2004. Each name/year comes from
its saved enrollment/organization; no completion, grade or real-school claim is
added. Later work facts retain their own records. Next bounded work is the
assigned county/family illustration using saved government and upbringing roles.
