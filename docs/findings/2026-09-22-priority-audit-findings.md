# What the priority audit measured

Written 2026-09-22 by the research-audit lane. Every claim below was measured
on `main` at `273fd2b8` unless another ref is named, by reading the modules and
their interface mount points rather than by reading earlier reports. Where a
finding came from another lane it says so and is not restated as ours.

Findings only. Nothing here is a task list, and nothing here changes code.

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

## 2. The largest empty vocabulary in the game

A new player world ships with **no policy domains, issues, propositions,
subjects or principles**. `createProductionPolicyCatalog()` returns five empty
arrays (`src/simulation/production-catalog.ts:88-97`) and
`assertProductionCatalogBoundary` (`:146-190`) throws if anything unestablished
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

---

## 5. Exactly one jurisdiction is seated

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
