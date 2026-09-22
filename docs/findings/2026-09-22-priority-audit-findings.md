# What the priority audit measured

Written 2026-09-22 by the research-audit lane. Every claim below was measured
on `main` at `273fd2b8` unless another ref is named, by reading the modules and
their interface mount points rather than by reading earlier reports. Where a
finding came from another lane it says so and is not restated as ours.

Findings only. Nothing here is a task list, and nothing here changes code. The
exceptions are sections 0a and 0b, which are decisions nobody should make for
you, and 0c, which is our reading rather than a measurement.

**If you read three things, read sections 0, 0a and 0b.** The first retires a
number that has been quoted all night, including in our own notes. The other two
are yes-or-no decisions about how the game plays, and neither should be made for
you. Section 0c says what we think all of it adds up to, and is the one part of
this report that is opinion.

---

## 0. The realistic range was agreed and never built

Checked directly on `claude/congress-factions-cg1u98` at `055bc5ac`, by
searching for the instrument under every name it might carry rather than the
one expected, and by asking what provenance a generated rule actually records.

The project record says seven states were read and forty-three plus DC are
generated from the national range. **The second half of that sentence describes
an intention, not the game.** No module, constant or document in `src/`, in
`scripts/` or in `docs/` implements a range, and none names one.

What exists instead is `STATE_EXECUTIVE_GAME_PROFILE`
(`src/simulation/nationwide-world/state-executive-term-rules.ts:84-100`): a
single frozen constant — four-year terms, a November election every four years,
a term beginning the first Monday of January — applied identically to every
state whose real rule has not been compiled, and honestly labelled
`game-profile` wherever a player inspects the office. It is a disclosed default,
which is the right shape for a default. It is not a range: it does not vary
state to state, it is not drawn from the span the read states cover, and it is
the same value everywhere, which is the single national average the range rule
was written to rule out.

The legislature side has no default at all.
`LEGISLATIVE_RULE_PACKS` (`legislature-rule-packs.ts:2534`) is nine hand-written
states. Every other jurisdiction resolves through `unknownRule`
(`legislature-rules.ts:77`), which is a refusal carrying a note.

**The figure being retired.** "Seven states read, forty-three plus DC
generated from the national range" has been quoted all night and is written
into our own notes. It described an intention, not the game. The corrected
line is: **seven states read; the rest not generated but unhandled** — a uniform disclosed default for the governor's term
and clock, and a refusal for everything about a legislature. DC refuses
candidacy outright for a missing minimum age, and Puerto Rico is absent from the
coverage report entirely.

That makes the realistic-range rule a different conversation from the one it has
been having all night. It is not something built and being tuned. It was agreed
and never started, and the 719-claim ledger with 649 claims rejected for want of
a fetched authority is what stands in its place: a design that refuses rather
than generates, exactly the behaviour the rule was written to abolish.

---

## 0a. One decision for you, and it is the biggest decision in this report

**The game answers asks addressed to you, before you ever see them.**

`npcContactAnswer` (`src/simulation/people-contact.ts:589`) decides accept,
decline or counter for the person being asked, and nothing in that function
consults `world.control` — read line by line through the whole answer path on
`claude/congress-factions-cg1u98` at `05c9f44c`, and there is no check of any
kind for the controlled character. The people-and-life lane instrumented it
over several rounds of ordinary play and the count of asks still waiting on
your own answer was zero every round. Not rarely; never. An invitation
addressed to you is resolved by the simulation and you are never told it
existed.

This sits directly on the thing ranked first.

It was left unfixed on purpose, which was right, because fixing it changes what
playing the game is like rather than correcting a mistake.

**The question:** should an ask addressed to you wait for your answer?

- **Yes** — an ask addressed to you stops at the calendar as something waiting,
  and you answer it the way you answer anything else, including by letting it
  lapse, which is now recorded as a lapse rather than as a refusal. Asks between
  two other people keep deciding themselves exactly as they do today. The cost
  is that ignoring your messages accumulates unanswered asks, which is either
  realistic or annoying depending on taste.
- **No** — the current behaviour is intentional, and we stop treating it as a
  defect and close it.

**We recommend yes.** A life simulation answering your own invitations on your
behalf is hard to defend, and this is the area you ranked above everything
else. It is still your call, and nobody will make it for you.

The full working detail is in `docs/handoffs/people-and-life-2026-09-22.md`
section 0, on `main` at `d4dca882`.

---

## 0b. A second decision: the game ships with nothing to legislate about

Section 2 below measures this; this section is the decision it leads to, put to
you rather than left as a finding.

Re-measured by execution on `claude/congress-factions-cg1u98` at `3902b456`,
after the merges of tonight: `createProductionPolicyCatalog()` returns **zero
domains, zero issues, zero propositions, zero subjects and zero principles**. It
loads from the pack registry and no pack ships content. So the 2,742-line bill
lifecycle (`src/simulation/legislation.ts`) is finished and has nothing to be
about.

The legislation lane landed both halves of the join tonight — #300, policy
content as provenance-declaring packs, and #306, a bill naming its policy
question directly. Neither ships content on purpose, because authoring the first
domains and issues is a product call, not an engineering one. Their write-up is
`docs/handoffs/modular-legislation-2026-09-22.md` on `main` at `d12eb75f`.

**The question:** should we author a starting catalogue?

- **Yes** — somebody writes the first domains, issues and propositions, and
  bills in a new world are about schools, roads, policing and taxes out of the
  box. The cost is that whatever is authored becomes the default political
  vocabulary of every save, and a first draft of that is hard to walk back once
  people have played against it.
- **No** — the game ships with an empty catalogue and the content arrives as
  packs, ours or a modder's. That is the purest version of the
  content-as-data rule, and it means a fresh install has a legislature that can
  pass bills about nothing until somebody loads a pack.

**And the number to read beside it.** The whole living world — everything that
happens in the background of a life, outside the player's own actions — is
**twenty-two authored sentences**. Counted in
`src/simulation/living-world/developments.ts`: four local subjects across four
stages each, which is sixteen, plus two international storylines at three
stages each, which is six. That is the entire bank.

So the pair is this. The bill lifecycle is 2,742 lines, finished, and has
nothing to be about. The living world is twenty-two sentences. **Neither is
broken. Both are starving.** The structural breakdown matters more than the
total here, because it is what tells an authoring lane what shape the missing
content is: subjects and stages, not prose.

There is a third answer nobody has costed: generate the catalogue the way the
rest of the world is generated. We have not measured what that would take and
are not recommending it blind.

---

## 0c. Our reading, across the three findings above

This one is a judgement, not a measurement, and it is marked as such because you
may disagree with it.

Three of the largest things measured tonight turn out to be the same shape.

- **The realistic range** (section 0): agreed and never built. The machinery
  refuses in exactly the places it was meant to generate.
- **The policy catalogue** (section 0b): a finished bill lifecycle with no
  subject matter.
- **Traits** (section 4): the pack system works, and the one screen showing
  temperament walks five values written into the source.

In each case the engineering is done or nearly done, and what is missing is
content or a surface. **Our reading is that this project's gap is not depth.**

**They are the same shape and not the same fault, and the difference matters.**
The catalogue is a question genuinely open in both directions:
`assertProductionCatalogBoundary` enforces the emptiness on purpose, so it is a
designed state, and nobody has ever agreed what a first catalogue should hold.
The other two are decisions already made and not carried out — the rule for
unresearched jurisdictions was stated and never built, and the pack system was
built and the one screen that shows temperament was never updated to read it.
So one of the three is an open question and two are unfinished follow-through.
Flattening them would read as three failures, and that would be wrong about the
catalogue.

That is a different diagnosis from the one the work has been running on, and if
it is right it changes what the next stretch should be spent on. It is three
measured instances rather than a slogan, and it is still a reading: one of them
was claimed on a single instance earlier tonight and had to be retracted.

---

## 1. Four systems recorded as never started are built and reachable in play

The project record listed seven areas as never touched. Four of them ship today
and a player can reach all four.

| Recorded as never started              | What is actually there                                                                                                                                                                                                                                                                                  |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Party evolution and coalitions         | `src/simulation/living-world/party-evolution.ts`, 1969 lines. Foundings, splits, mergers, dissolutions, renames, dated platform drift, and a member leading a faction out of a party on their own recorded, repeated disagreement. Reachable through `PartyInitiativesPanel.tsx` from the Politics hub. |
| Choosing your successor at death       | `src/simulation/people-continuation.ts:248`. Children, grandchildren, siblings and a surviving partner, drawn only from people the world already records — "nobody is made up to fill the list". An underage heir waits with the elapsed years disclosed. Observer mode exists.                         |
| In-game encyclopedia and civics helper | `src/presentation/guide-terms.ts`, 28 searchable terms, reachable at `nav-guide`.                                                                                                                                                                                                                       |
| Newspaper-style news surface           | `src/presentation/news-front-page.ts`. Two front-page modes, per-outlet mastheads, corrections and retractions. Reachable at `nav-news`.                                                                                                                                                                |

Natural death is not scripted either: an all-cause quarterly hazard drawn from
the SSA 2023 period life table runs for every living person
(`src/simulation/crisis/mortality.ts`, table at `crisis/mortality-table.ts`).

**Genuinely untouched, confirmed:** fifty state-capital scenes (zero of fifty),
derived facial expressions, and a chamber view showing factions.

**Why it matters.** The defect in each of the four is a missing consumer or thin
content, not a missing system. Planning a build in any of these areas without
reading the module first spends a night rebuilding something that works. The
"never started" column of the ledger is not evidence.

**Closed the same night:** the faction view. `byCaucus` was computed for every
chamber on every read (`src/simulation/living-world/congress.ts:339-378`) and
read by no interface. It is now on the Government screen — PR #305, branch
`claude/congress-factions-cg1u98`.

---

**One of the four is bounded more tightly than "built".** The same playtest
walk found that the newspaper's per-outlet composition works for party stories
as designed, and every other story family still prints the record's own
sentence identically — five exact duplicates on a thirteen-story page. The
mechanism is proven and wired to one story family. That is a real distinction
between a system that exists and a system that is finished.

---

## 2. The largest empty vocabulary in the game

A new player world ships with **no policy domains, issues, propositions,
subjects or principles**. `createProductionPolicyCatalog()` returns five empty
arrays (`src/simulation/production-catalog.ts:101-111`), confirmed by executing
it rather than by reading it and
`assertProductionCatalogBoundary` (`:163` after tonight's merges) throws if anything unestablished
is added. World metrics, causal mechanisms, incidents and mortality tables are
empty and guarded the same way, with two named carve-outs at `:74-78`.

Against that, `src/simulation/legislation.ts` is **2704 lines of enforced bill
lifecycle** — filing, origination rules, referral to a named committee,
hearings, committee report, calendar placement, the multi-day floor rule,
crossing to the second chamber, concurrence, enrolment, presentment, veto,
override and enactment — every stage guarded rather than stubbed, and reachable
in play.

**So the deepest system in the repository is arguing over an empty set.**

**The emptiness was the right call and should not simply be reversed.** It
replaced a world that shipped players a "Synthetic certain-death fixture"
mortality table and a `synthetic-stage-3-v2` policy corpus. The guard exists to
stop exactly the reflex of filling it from general knowledge. Filed as research
instead: `policy-issue-taxonomy-state-and-local`, the queue's only P0.

**A consequence worth knowing.** The `vitalityCatalog` mortality path
(`src/simulation/vitality.ts:78-144`) is dead in a production save because its
table list is empty; it throws "Missing mortality table" if reached. Natural
death comes from the separate SSA-backed model instead. Two mortality systems
exist and one is unreachable in a player save.

---

## 3. Research already paid for, and not used by anything

This is the largest and cheapest body of work in the project, and none of it is
a question for anyone.

| Banked                                                            | Where                                                 | State                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------- | ----------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Legislative ethics procedure                                      | `research/ethics-routing-research.json`               | **24 of 51 jurisdictions answered with statutory authorities; every row `runtimeIntegrated: false`.** Its `researchId` is literally `state-legislative-ethics-procedure`, the questionId of a record that was still open and still asking for all fifty-one. The consumer holds one entry, Kentucky (`src/simulation/press/procedures.ts:197`), so a press matter about a legislator reads identically in fifty states. |
| Veto and override rules                                           | `research/veto-research-51.json`                      | 51 rows, every one `runtimeAdmitted: false`. Nine read from official constitutional or code text; 42 are comparative summary needing verification.                                                                                                                                                                                                                                                                      |
| Office qualifications                                             | `docs/research/qualification-source-ledger.md`        | 719 claims, 63 compiled, **649 refused for one reason only — nobody fetched the authority the claim itself cites.**                                                                                                                                                                                                                                                                                                     |
| Chief executive terms, government topology, education, population | `research/jurisdiction-baseline-51.json` and siblings | 51 rows, `notAPlayableCoverageClaim: true`.                                                                                                                                                                                                                                                                                                                                                                             |

**What was done about it.** The ethics record was narrowed to the 27 genuinely
unanswered jurisdictions, naming them, with the 24-jurisdiction answer cited as
its first checked source so it is visible as already in hand. The integration
work is engineering and belongs to the lanes that own each consumer.

**Since written, two rows have moved. Read them as current, not the table.**

- **Ethics is integrated.** PR #299 merged to `main` at 05:49:51Z. The 24
  researched jurisdictions are now a data table,
  `src/simulation/press/state-ethics-bodies.ts`, that the press routing reads,
  so a complaint reaches the state's own body rather than reading identically in
  fifty states. The table is deliberately narrower than it could be: it carries
  the body, the state's own term for the proceeding, the chamber arrangement and
  the citations, and it carries **no timeline**, because the research recorded
  none — a procedure built from it names the real body and declares its
  intervals as authored rather than borrowing Kentucky's statutory deadlines.
  Kentucky stays hand-written for exactly that reason. Fifteen of the 24 route a
  seated legislator but not a candidate, because those states have no
  legislative rule pack yet; that is a gap in the packs, not in the table. The
  27 unresearched jurisdictions remain the open question.
- **Veto and override rules are partly admitted.** PR #302 merged to `main`
  before that. That lane's measurement, including the thresholds it found wrong,
  is its own and is not restated here.

This is what section 3 is for: the gap was never the research, it was the
absence of a consumer. Two consumers appeared in one night.

---

## 4. Personality, relationships, goals and memory are thinner than the type definitions suggest

All four exist as append-only record stores with a hardcoded TypeScript
vocabulary. There is no data-authored row source for any of them, and the only
pack format authors scenes and durations.

- **Personality.** Five traits ship
  (`src/simulation/people-trait-definitions.ts:12-18`) and every generated
  person draws a value on all five from one seeded curve
  (`people-traits.ts:76`), so nobody is unmarked and nobody is distinctive.
  `recordTraitChange` (`people-traits.ts:205`) has **zero callers outside
  tests**, so in shipped play a temperament is drawn once and never moves.
- **Relationships.** There is no relationship record between two people, only a
  log of interactions. The single reading of it sums a hidden score and buckets
  it four ways (`src/simulation/queries.ts:221-263`), and nothing decays — the
  code says so deliberately at `people-contact.ts:46`. Two of the ten declared
  interaction namespaces, `care:` and `commitment:`, are never written.
  `recordRelationshipMoment` (`relationship-integration.ts:72`), the composed
  writer for one consequential social moment, has **zero callers outside
  tests**.
- **Private goals.** Every generated person is given one at world build
  (`life-personality.ts:170-174`) and **no simulated person ever acts on one**;
  the only readers vary what the player may say in a scene. The played
  character is the only character in the world with an agenda.
- **Long-life memory.** Memories are appended, never weighted by age, never
  revisited. Four strength levels exist and are set once at writing
  (`types.ts:555-569`), so a sixty-year life ends as an undifferentiated log.

**Filed as research, each as its own question:** trait prevalence across a
population, relationship dimensions and fading, private goal pursuit, long-life
memory consolidation.

### Where the personality work reaches a screen, and where it stops

Measured after the work landed, on `claude/congress-factions-cg1u98` at
`05dc90a0`. It is better news than it was first reported as, and the first
version of this paragraph was wrong in the pessimistic direction: a lane
reported that no player screen reads a trait at all, and it does not hold.

**Other people's temperament is on a player screen and works.**
`src/player/PersonCard.tsx:221` calls `personTraits` and renders the labels. So
the pack-driven traits, the resistance model and the dialogue path are not
sitting behind an empty surface.

Two narrow gaps remain, and both are small.

- **The one surface that shows temperament is hardwired to five traits.**
  `personTraits` (`src/simulation/people-traits.ts:145-150`) maps
  `PEOPLE_TRAITS`, the five-element `as const` at
  `people-trait-definitions.ts:12-18`, and never consults the loaded registry.
  A pack that adds a sixth trait is read by the decision layer and is invisible
  on the only screen that shows temperament. The modder-friendly work stops one
  call short of the surface. It is one function.
- **The played character's own temperament has no surface at all.**
  `PersonCard.tsx:218` excludes it on purpose — "Temperament is shown for other
  people only, never for the one played" — and that exclusion predates the
  player-temperament work, so there is no screen on which a player can see or
  say who they are. That one is a small screen, not a one-liner.

One constraint for whoever closes the first gap: the display must iterate the
loaded registry and render **per pole, not per trait**. Anything written per
trait is wrong the moment a pack adds one, which is the same modder-friendly
rule reaching the UI layer, and it costs nothing to honour now.

---

## 5. Exactly one jurisdiction is seated

**The number underneath it.** `docs/systems/nationwide-rule-coverage.json`
counts **38,704 general-purpose local governments**, and there are two
thresholds worth stating rather than one, because they give different numbers.

- **Three can introduce an ordinance.** Charlottesville and Richmond in
  Virginia, and Carson City in Nevada — the only three units with a compiled
  enacted instrument. So 38,701 have no admitted ordinance route at all.
- **One can pass one.** Charlottesville alone carries an admitted
  pass-ordinance rule. Two can pass an appropriation.
- Everything else is 38,381 units known by identity only and 320 carrying an
  inherited default.

The 38,701 figure and the "one in 38,704" figure are both correct and they
answer different questions. Quote the threshold with the number. The playtest walk of 2026-09-22 (`453b6893`,
`docs/playtest/walk-2026-09-22-0711.md`) reports the same thing from the other
end — that nobody is sitting on them — and puts it better than we did: **the
rules are further along than the world is.**

Those two measures are not the same measure, and the distinction is the point
of the process finding below about reading a generated document's own header.
Rule admission says a compiled rule exists for the resolver to apply. Seating
says somebody holds the office. A jurisdiction can fail either independently.

**And one small thing sitting on top of it.** The same walk found the
Government screen in Columbus reading "U.S. House District not recorded".
Congress is the only body in the game that is actually seated, and it is the
one body the player is shown no connection to. That is specific and fixable,
and it is a worse first impression than the seating gap it sits on.
The United States Congress is seated with 535 real generated people, 435 House
and 100 Senate, built at a new life's opening
(`src/simulation/living-world/opening.ts:160`).

**Every state chamber and every municipal body returns `holderName: null`** with
the note "No current record of this chamber's members is kept in this save"
(`src/presentation/politics-government.ts:347-354`). Three fixture
jurisdictions carry rosters whose members are mostly strings — "Member for
District 7" — with `personId: null`.

The seating generator is general. What a state needs from it is chamber size
and composition, and chamber sizes are `known` for six states, refused for
three, and absent for the other forty-two, which have no rule pack at all
(`src/simulation/legislature-rule-packs.ts`). That is jurisdiction rules and
belongs to the nationwide lane; it was flagged rather than commissioned, so it
is not researched twice.

---

## 6. Process findings, each paid for once

- **The concurrency group protects a run that is already running, and main's
  runs were never running.** `validate.yml` sets
  `cancel-in-progress: ${{ github.ref != 'refs/heads/main' }}`, so on `main` an
  in-progress run is shielded — which is what it was written for. But a group
  holds only one _waiting_ run, and with two concurrent job slots for the whole
  repository, main's fifteen-job run waits rather than runs. So each merge to
  `main` superseded the previous merge's run before it executed a single test.
  Three in a row tonight, including two report merges an hour apart. **That is
  why there was no verdict on main all night, and it was not capacity.** The
  merge freeze had been called to stop lanes racing each other; the actual
  mechanism was worse than the race it was called for, and nobody would have
  found it by reading the file, because the line is correct and the behaviour
  it produces at two slots is not what it looks like.
- **A cancelled run's aggregation job reports `failure`.** `validate.yml` ends
  in a sixteenth job that gates on the other fifteen, and when the concurrency
  group cancels a superseded run that job concludes failed rather than
  cancelled. So every superseded push leaves a red check asserting nothing, on
  a head nobody is looking at. A red check has to be opened and its run's
  conclusion read before it means anything.
- **A generated document usually tells you what it does not mean, and reading
  that takes thirty seconds.** The nationwide coverage report's fourth line
  says it outright: "Rule admission only. An admitted field is a compiled,
  dated rule the resolver will apply; it is not proof that a player can reach
  the action, that an office or contest exists in a save, or that every clause
  of local law was read." Three retractions this week came from claims built on
  top of that report by people who never read its header — the screen and the
  report had never disagreed with each other. Read the header before you build
  on the numbers.
- **A render replaces a published document wholesale, so it must come from a
  head that carries every record.** The open-questions queue is filed
  one-file-per-record across many branches. A sweep of every pushed branch, run
  immediately before each render, caught a record that would otherwise have been
  silently dropped on its first run, and two more twenty minutes later that had
  been pushed after the previous sweep. Run it before every render, never once.
- **Two live documents in one folder is worse than a stale one.** Before
  publishing was assigned to a single session, two lanes published into the same
  folder ten minutes apart and a reader had no way to tell which was current.
- **Superseding by deletion is not recoverable from here.** The Drive connector
  exposes `trash_file` and no untrash; after a trash, metadata returns not found
  and the id cannot be renamed or moved by any session. Only the owner can
  restore, from the browser. Superseded renders are retitled and moved to a
  sibling archive folder instead, which leaves the live folder holding exactly
  one document and destroys nothing — including any comment the director left on
  an older copy.
- **Every record filed through the research CLI carried a trailing blank line**
  that the repository format gate removes, because `toCanonicalJson` already
  terminates with a newline and the store added a second. Found by the modular
  legislation lane, which fixed the writer with a test verified to fail against
  the old one. Until that lands, a carried record needs the one-line repair.
- **CI capacity is two concurrent jobs for the whole repository**, and one
  validate run is fifteen jobs with eight browser shards. A queued check is not
  a red one, and a local run is not a CI verdict.
- **Neither heavy workflow declared a `concurrency:` group, so every push left
  its predecessor's fifteen jobs queued forever.** Measured by the CI lane at
  05:19Z: 100 queued runs, 79 of them on commits that were no longer their
  branch's head. Its fix is commit `64f09e33`, which had been correct since
  03:58 on a branch that does not reach `main`; cherry-picked as PR #303 and
  merged to `main` at 05:41:18Z, so a commit now cancels its own predecessor's
  run everywhere except on `main`, whose run is the base verdict other lanes
  read. That closes the leak but not the backlog already in front of it: at
  05:42 the queue still held 105 runs across 31 branch-and-workflow groups, 74
  of them superseded. Those were cancelled by hand. Until the queue is short,
  the sweep has to be repeated, because the group only governs runs created
  after it landed.
- **Every wrong claim made tonight would have survived a summary and died at a
  citation.** The people-and-life lane's words, after catching its own error
  while fetching `file:line` references to write it up. It is the cheapest rule
  on this list and the one that would have prevented most of the retractions
  this project has made in twenty-four hours: requiring a citation is not
  bookkeeping, it is the step that forces somebody to open the line. Three
  retractions tonight were caught exactly that way and no other.
- **A gate result is a fact about the tree it ran against, and an edit after it
  invalidates it.** A lane pushed a commit that failed lint having genuinely run
  lint — in the background, and then kept editing, so the clean result belonged
  to a head that was never pushed. The same lane had regenerated the prose
  report before its last edit rather than after it an hour earlier and did not
  recognise it as the same mistake. This lane did it too: lint was left running
  across a merge that changed 1,655 files underneath it, and the run had to be
  killed and repeated against the committed tree. Run the gates last, after the
  final edit, never alongside more editing. It is "name the branch in any claim
  about code" applied to time instead of to branches, and it caught two
  different gates and three lanes in one night.
- **Two line numbers for one function is how the wrong one gets quoted back.**
  The empty policy catalogue was measured twice in this document, in two
  sections written hours apart, and the two citations for
  `createProductionPolicyCatalog` had drifted apart across the night's merges —
  neither matched the file by the time anyone would read it. Measure a thing
  once, cite it once, and re-read the line rather than carrying a number
  forward. This document will be quoted back, which is exactly why it cannot
  carry two answers to the same question.
- **An enumerated pattern is the wrong instrument for proving absence**, because
  it only finds the names you already thought of. The claim that no player
  screen reads a trait came from a grep over a list of identifiers that did not
  include `observedTraitLabels`, which is the real consumer. The broad fallback
  grep then returned fourteen files and was read as a count rather than as
  fourteen things to open, nearly every hit being the substring inside
  `PersonPortrait`. That is the fourth form of a check whose failure mode is
  silence: a search that proves nothing and reads as proof.

---

## 7. What is open, and what is not

Questions the owner answered himself are not open questions and were not left in
the queue as though they were. On 2026-09-22 he settled that death and
succession will be explained in a tutorial yet to be made, and that general
party structure, mergers and the rest should be visible to a player with the
extent still to be decided. The first closes a filed question outright; the
second narrows one from a yes-or-no to a question of degree.

The live count of open questions is whatever the rendered document says at its
named head. It is not restated here, because a number written in prose goes
stale the moment the next record is filed.
