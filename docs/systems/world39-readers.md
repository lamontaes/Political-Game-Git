# WORLD39 saved-world readers

WORLD39 adds presentation-only News orientation and chronological Journal
leaves above the accepted `7d53d9f1` receiver. No simulation writer, World
schema, persistence payload, random draw, clock, art or global style changes.

## Receiving consumer

In PlayerGame's News fragment mount `World39News` first, passing `world`,
`personId` and the existing `onOpenPerson` callback. Keep `PressWorkspace` and
`PublicInformationPanel` below it so search, follows, corrections and press
actions retain their actual consumers. Only the existing publication digest
supplies articles; a public event displayed here is not silently published.

Replace the root `JournalWorkspace` mount with `World39Journal`, passing the
same `world`, `personId`, `journal`, `onJournalChange` and `onOpenPerson` props.
It retains the existing `PrivateJournalEditor` and the exact
`projectLifeRecord` sentences behind Notes and Record disclosures. The
optional `record` ReactNode allows an existing custom Record renderer. The
ordinary person dossier/Record route remains separate and unchanged.

## Grounding and architecture check

- News uses the shared dated current-officeholder reader, current institution
  profiles, canonical publication digest and completed-public-event eligibility.
  Original publication/event IDs and dates remain available in details. Current
  holders are explicitly fictional save-world people; institutional source
  links are retained from the existing reader, not new legal claims.
- Public availability is distinct from this character's saved knowledge. No
  article, event, recollection or relationship is written by a read. Future and
  private events do not populate public recaps.
- Journal reads only this person's dated identity, established biography,
  enrollment/work states and accessible history. Involvement or being a
  discussion's subject alone does not admit private truth. Canonical summaries
  need agency/presence or accurate direct knowledge; other own accounts and
  memories remain expressly subjective. No private motive/context is read.
- Same-day chronology follows the existing history sequence. Expected study or
  work is described as expected, not personally promised or completed. An active
  role is described as active, not proof of performed work. Actual agreement
  and performance summaries stay distinct.
- Queries operate on the supplied immutable World on every render. Parent
  enrollment/work recordedAt and state effectiveAt are checked. Those state
  records have no recordedAt; profile queries use the current sequence frontier
  and the state's date. No new store, cache, authority, scheduler or identity.

The independent A grounding review corrected the active-work wording before
handoff. Source prose remains authoritative; no guessed incident is substituted
for a terse old generated summary.

## Focused evidence and limits

`src/presentation/world39-readers.test.ts`: six checks pass for actual opening
orientation before publication, canonical publication IDs/dates, private subject
refusal with fallible account, agreement/performance chronology, subjective
memory, sparse/changed saves and World serialization/read purity. Type checking,
scoped ESLint/Prettier, 23 grounding probes and 49-file holdout hygiene pass.
Art validation, inventory and QA contact generation all passed. The final
affected-app incremental typecheck and JSX lint passed as well. No art diff or
running WORLD39 process remains. The independent A review confirmed the bounded
new prose mappings after correction, distinct from inherited-summary quality or
human UI acceptance. Frozen runtime is
`2ad4cb7f8865fe48b0f70645968673c6e9e350cb`.
All logs and the actual populated example are local `/private/tmp/world39-*`.

A owns ordinary navigation, pointer/keyboard disclosure/person/notes checks,
save/reopen composition, final build and release declaration. No leaf-only
check is claimed as browser, human, nationwide or art acceptance.

Further breadth is separate: richer source summaries for old generated
formative incidents, additional supported current office/institution producers,
and publications when the save has no publication history. No absent article is
filled with an invented election, event or motive.

LEARN: an active employment state proves a relationship's status, not a performed
shift; expected enrollment does not establish a person's decision to enroll.
Keep those distinctions at the text mapping boundary.

## Editorial pass (WORLD39 Fable delta)

The readers say what a resident or the person could say; they never describe
the save. Player-facing text carries no "recorded", "in this save", raw ids,
reading guarantees or engine status reasons; those stay in comments, data
attributes and this document.

- News opens "Around {place}" with standing public facts: "{place} is governed
  by {government}" with its legislative body and a plain-words form (a form
  token with no plain mapping is omitted, never printed), and each public
  institution as "{name} is a school in {place}". An unlocated organization is
  never placed in the lived town, and an office's own organization is told
  through its holder. Officeholders read "{name} has served as {title} at
  {institution} since {month year}". Offices the authority packs support but
  the World has not filled are exposed as `unfilledOffices` for producers and
  are neither narrated as vacant nor given a holder; the office title is the
  shared identity across the opening's `us-president` and the packs'
  `us-federal-president` keys.
- Journal is one second-person account grouped by year ("2026, age 9"),
  including private beliefs ("Privately, you support ..."), public statements
  and campaign commitments, each from its own record. Event and memory
  summaries keep their scope; only the "You chose to" ledger voice and a
  first-person "I remember" are turned into the account's own voice, and a
  summary that names the save or an unsupported cause or feeling is omitted.
  Work states name the role ("You began working as Store assistant at
  Neighborhood Market."); the engine's status reason is not carried into the
  text.
- A secondhand account is narrated only when somebody told this person, or a
  record, outlet or rumor reached them, about something that has happened.
  Knowledge the opportunity producer writes about a standing offer (a
  proposed evening, an invitation, a favour asked, a confidence shared, a
  meeting notice) is the state of an offer; the record's open items carry it,
  the account does not.
- Generic tests use an explicit non-Kentucky locality; Lexington remains a
  named Kentucky regression for the consolidated-government sentence.
- The corpus anchor mint could not be run on the A41 base: pristine
  `c2c4686d` already fails `npm run corpus:prose -- check` with 80 unsettled
  sites in its own newer files, before this delta.
