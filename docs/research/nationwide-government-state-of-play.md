# Nationwide government — what changed, and what was measured

Written 2026-09-22. Everything below is a measurement with the tree it was
taken on named, not a conclusion. Where something is still open it says so.

## Every state has a legislature now

**Before.** Nine states had a legislature compiled from their own
constitutions. The other forty-one and Puerto Rico had none at all.
`resolvePlayGeography` searched the compiled packs — which answers _"has this
state been researched"_ — and returned null for everyone else. A life lived in
Texas or California could reach a legislative seat with no chamber under it, no
bill to carry, and no office to stand for. The absence of research had become
the absence of government.

**After.** A state with no compiled pack gets a playable bicameral legislature:
two chambers, real seat counts, a quorum, a passage vote, a governor with a
veto, and a threshold to override it. Measured on `claude/nationwide-government-mqcw7p`:

- A Texan discovers two legislative offices, qualifies for one (House asks 21
  and a year in the state; Senate 30, five years, a four-year term) and can
  file a bill in it. The bill was actually filed and resolved in a test, not
  merely inspected.
- Kentucky is untouched and keeps its own compiled rules.
- All fifty-one jurisdictions pass `assertRulePackIntegrity`.
- Across the uncompiled states the drawn shapes differ in more than twenty
  distinct house/senate pairs, so crossing a state line changes what a chamber
  looks like.

**Two drawing rules, deliberately different.** A seat count falls anywhere in
the researched spread, because a chamber genuinely can be any size — real
houses run from forty members to four hundred. A veto window or override
threshold only ever takes a value a state actually enacted, because those are
discrete institutional choices: the researched spread runs from three days to
sixty, and drawing uniformly across it would hand most of the country a
forty-day veto window no legislature has ever written.

**A senate is never drawn independently of its house.** Every researched state
seats between a fifth and a half as many senators as representatives, and a
senate larger than its house is the one shape American bicameralism never
takes.

**The District of Columbia gets none, on purpose.** It is legislated for by one
thirteen-member Council, not a House and a Senate. A generated bicameral
legislature there would not be a provisional reading of its law, it would be a
shape the District has never had, and "resembles real life" argues against
generating rather than for it.

**Nothing tells the player any of this.** The requirement says what it is. All
provenance lives in the record.

## Real law overrides the draw

Four constitutions the veto lane read disagreed with the generator, each in a
way a player feels at the moment a vote is counted:

| State          | The draw gave                     | The constitution says                                                      |
| -------------- | --------------------------------- | -------------------------------------------------------------------------- |
| Tennessee      | two thirds of the elected members | a simple majority of the full membership                                   |
| North Carolina | two thirds of the elected members | three fifths of those **present and voting**                               |
| Virginia       | three fifths                      | two thirds of those present **and** a majority of the elected members      |
| West Virginia  | two thirds                        | a simple majority for an ordinary bill, two thirds only for appropriations |

Tennessee is the sharpest: the draw turned one of the easiest override bars in
the country into one of the hardest.

The readings are now consulted first and the draw only fills a silence. Two
things it deliberately does not do:

- **It does not invent a denominator.** "Members present and voting" and
  Tennessee's "membership entitled under the constitution" are not the same set
  as anything the schema names, and the reading declines to map them. The read
  fraction is kept — a half and two thirds are the difference between a live
  override and a dead one — the instrument's own words travel in the label, and
  the pack states that the denominator is the game's nearest rather than the
  instrument's.
- **It does not flatten a rule the schema cannot hold.** An each-chamber forum
  carries one fraction against one denominator, so Virginia's second condition
  and West Virginia's separate appropriations bar are recorded in the pack's
  unresolved gaps in the instrument's own terms. This is the thing most likely
  to be found later and read as a bug, so it is stated here rather than only in
  the pack: **for Virginia and West Virginia the override is easier in play
  than the instrument allows.** Virginia's second condition and West Virginia's
  two-thirds appropriations bar are both real and neither is enforced, because
  the schema cannot hold them and approximating them would have been a quiet
  invention. The gap is recorded, not closed.

**Two schema limits worth a decision.** `OverrideForum` in its each-chamber
form carries one threshold, so it cannot express a rule with two simultaneous
conditions (Virginia) or a different bar per measure class (West Virginia —
`appropriationsThreshold` exists only on the joint-session form). Both are
recorded rather than approximated, and both would need a schema change to
model properly.

## A compile gap is not a research gap

The full suite caught a real defect. The generated qualification rule was
firing for Kentucky, whose constitution **has** been read — that is why
Kentucky has a compiled legislature at all. Ky. Const. § 32 states an age and a
residence; the reason those are not in the qualification corpus is that the
corpus has not caught up, not that nobody knows.

Handing Kentucky a drawn number would have put a figure in front of a player
that Kentucky's own instrument contradicts, and made a missing compile step
look like an answered question. The drawn rule now fires only where a state has
no compiled legislature at all. Two tests pin the distinction in both
directions.

## Nebraska and Minnesota, dated from their own amendment history

Measured on both trees, because two other lanes measured the opposite and both
numbers were right — of different trees.

- **main `445441a5`**: 69 rows, 50 `EXACT_INTERVAL`, 19 `CURRENT_OBSERVATION`,
  Nebraska all 13. Nebraska's rows read `UNKNOWN` on an ordinary 2026-01-05
  start, so the seat refuses.
- **`claude/nationwide-government-mqcw7p`**: 69 rows, 69 `EXACT_INTERVAL`, 0
  `CURRENT_OBSERVATION`. Nebraska's 13 carry real `validFrom` dates (1967-01-01
  for age and residence, 2001-01-01 for office existence). At 2026-01-05 all
  six assessed rows read `SUPPORTED`.

The change is in the compiled corpus, not in an assertion about it:
`corpusSha256` is `1b0f25b0…` on main and `68f8fea9…` on the branch. Commit
`b55c0564`.

**Why the dating is sound.** Both publishers carry each section's own amendment
history in the locked artifact, which is primary material. So the current words
are dated to the year they were last amended — all before 2000 — instead of
staying a bare September 2026 observation that an ordinary January 2026 life
falls before. That "observed later than the life began" gap is the whole reason
these rows refused.

**The 1970 guard, and why it exists.** At 1970-01-05 all six rows still read
`UNKNOWN`. The earliest amendment among those sections is 1988, so a life
reaching the seat before any dated version does not silently get the modern
rule. Dating a provision from its amendment history gives the interval a floor
as well as a start, and without the guard this change would have back-dated
present-day law across a century.

The general rule this is an instance of: **a `CURRENT_OBSERVATION` is a floor on
what was read, never a statement that the provision began the day somebody
looked at it.** Where the publisher dates its own sections, read the date.

## The basis contract

`LegislativeRulePack` now declares `basis: "researched" | "game-profile"`, and
`assertRulePackIntegrity` walks the whole pack — at any depth, because a source
ref can sit on a threshold, inside a floor stage or under a committee — refusing
a **researched** pack that carries a generated rule.

The refusal runs one way only, and that asymmetry was corrected during this
work. A generated pack carrying read law is the goal, not a blend to refuse: a
game profile exists because nothing has been read, and the moment something IS
read the read value belongs there. A check that refused a constitution inside a
generated pack made "real law overrides the draw" impossible to honour.

A generated pack is also kept out of `LEGISLATIVE_RULE_PACKS`, which still
answers the research question and would otherwise list a generated legislature
beside Ohio's as though it had been checked.

## Seats are corrected on the read path

Kentucky, Nebraska and Nevada all delegate their seat counts to instruments
nobody read, so their packs carry `seats: unknown` — and that stays true.
`seatsForChamber` answers _"how many people sit here"_ without touching what the
record says is known: a compiled count comes back as it stands, an unresolved
one draws from the spread.

This is the same discipline as the district-residence clock: correct when you
read, never when you write. Writing the correction into the record changed
serialized bytes and the legacy opening gate caught an existing save
reserializing to a different hash than the one it was written with. Reading
instead records nothing new, so old saves keep their bytes _and_ get the
corrected answer.

Every chamber in the country now has a seat count, which is what a seated world
needs.

## Alaska opens — measured, and a correction to how it was attributed

Measured on `claude/district-residence-clock` at `9c3cefab`, by running
`src/presentation/playtest-candidacy-residence.test.ts`: 16 of 16 pass,
including the day-one case. A forty-year-old created at Sitka
(`placeKey 0200650`, `startAge: 40`, `startKind: "normal"`) with **no months
let pass** gets an empty block list and `eligible: true` for
`us-ak-legislature-v1:house`.

Two things that were muddled when this was first reported, both stated plainly
here because a report will repeat them:

**Which path decides Alaska.** Not the sourced qualification corpus. That
corpus is 69 rows and none of them are Alaska, which is true and is not the
mechanism. Alaska is decided by `CANDIDATE_QUALIFICATION_RULE_SETS` in
`src/simulation/candidate-qualification.ts` — rule set
`us-ak-house-qualifications-v1`, cited to Alaska Const. art. II, §§ 2–3, and
gated on the date by `ruleSetApplicableOn`. Two lanes measuring different
paths is why the same state looked both open and shut.

**Where the dating fix came from.** Not #284. It is commits `d140776e` ("Let a
rule's own commencement date outrank the day we read it") and `b53f137d`
("Date Alaska's legislator qualifications from the constitution's own
commencement"), both already on `main`. The reasoning in `b53f137d` is the
Nebraska shape again: the publisher's edition marks an amended section with a
bracketed year, Article II carries three such markers and §§ 2 and 3 carry
none, so the present words are the original ones and take the constitution's
own 1959 commencement rather than the September 2026 retrieval date. #284 is
only the branch #292 happens to sit on top of.

**What was measured and what was not.** The eligibility verdict was measured.
The screen was not. A browser measurement of the filing screen on this head
has not been run, so "Alaska opens" is a claim about
`candidacyEligibility`, not about every surface a player passes through.
