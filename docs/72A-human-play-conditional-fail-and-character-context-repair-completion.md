# 72A — PR #87 Human Play CONDITIONAL FAIL and Character Context Repair — Completion

Canonical completion report for
`72_CLAUDE_PR87_HUMAN_PLAY_CONDITIONAL_FAIL_AND_CHARACTER_CONTEXT_REPAIR`.

A continuation of PR #87. No second PR was opened, and **#87 is left draft and
unmerged**. **No human acceptance is claimed and no retest is requested** — the
packet gates the next one on #86 merging first, and this report does not ask
for it.

Published to Drive as
[`72A_CLAUDE_PR87_HUMAN_PLAY_CONDITIONAL_FAIL_AND_CHARACTER_CONTEXT_REPAIR_COMPLETION`](https://docs.google.com/document/d/1TX_xv4xVB8T-2CC_P143pECYjrI4F3cxVXOoZ-RPdyQ/edit)
(`1TX_xv4xVB8T-2CC_P143pECYjrI4F3cxVXOoZ-RPdyQ`), beside 60A–60D and 70A.

---

## 1. Exact state

|                        |                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| Repository             | `lamontaes/Political-Game-Git`                                                           |
| Pull request           | [#87](https://github.com/lamontaes/Political-Game-Git/pull/87), draft, **left unmerged** |
| Branch                 | `claude/pr81-narrative-graphics-lifeflow-t8j8oe`                                         |
| Head the human tested  | `d241d543e1ec878880b621f75d41c475480c978c`                                               |
| Verified live          | Fetched before editing; #87 pointed at exactly that SHA, draft and unmerged              |
| Head after this packet | `385f229` (see §14 for the pushed SHA)                                                   |
| Diff                   | 27 files changed, 4,522 insertions, 132 deletions                                        |

### Commits

| SHA       | Subject                                                     |
| --------- | ----------------------------------------------------------- |
| `01da052` | Ask who the character is before writing their life          |
| `bd1a9ed` | Ask a ten-year-old a ten-year-old's questions               |
| `385f229` | Write down what a repair is, so it cannot quietly come back |

This report is committed on top of those three.

---

## 2. Every human finding, and what happened to it

| #      | Finding                                                      | Disposition                                                                                                                                                            |
| ------ | ------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1**  | Calibration reads as generic AI-generated moral dilemmas     | **Fixed.** 18 items withdrawn from the reachable bank; the three the human read repaired in place; 16 new authored items for the two younger bands. §5                 |
| **2**  | Adult-coded agency precedes a life that begins at 10         | **Fixed.** Every setup item declares its life stage and the standing it assumes; selection reads the start age the setup screen already had. §4                        |
| **3**  | The five-question path feels disconnected from the character | **Fixed, by saying what it is.** The screen now states that the questions are about the player and create nobody — which the architecture always enforced silently. §6 |
| **4**  | The player cannot choose gender                              | **Fixed.** An explicit gender control and a separate pronoun control, canonical, deterministic, replayed. §3                                                           |
| **5**  | Named NPCs appear with no relationship context               | **Fixed.** `person-context.ts` reads the relation off the record; the play surface introduces people with it. §7                                                       |
| **6**  | Pronoun and context presentation is unclear                  | **Fixed.** Canonical pronouns, six agreement slots, and a rule that a name and a pronoun in the same beat come from the same record. §7                                |
| **7**  | Ten-year-old agency and voice are implausibly adult          | **Fixed.** A `household-peer` role, a capability requirement, and the age-band voice contract. §4, §8                                                                  |
| **8**  | Vague and pseudo-literary constructions must go              | **Fixed.** Named constructions removed and rejected by a guard that fires on the exact text that shipped. §8                                                           |
| **9**  | Page hierarchy is hard to read without graphics              | **Partly fixed, deliberately.** Semantic and copy hierarchy only. Scene and person art stays #86's. §9                                                                 |
| **10** | Overall CONDITIONAL FAIL pending the graphics layer          | **Respected.** No acceptance claimed, no retest requested. §12                                                                                                         |

---

## 3. The character identity contract

The world had **no answer to gender at all** — not a default, a gap. `Person`
carried a name, a birth date, a home jurisdiction and an appearance seed, so
every sentence in the game said "they" about everybody including the character
the player had just named.

### What was added

```ts
type PronounSetKey = "she-her" | "he-him" | "they-them";
type GenderIdentityKey = "female" | "male" | "nonbinary" | "unstated";
interface PersonIdentity { gender: GenderIdentityKey; pronouns: PronounSetKey }
interface PersonCore { …; identity?: PersonIdentity }
```

**Gender and pronouns are separate fields**, because they usually agree and
sometimes do not, and one field cannot hold that. The setup screen offers both;
choosing a gender moves the pronouns and the player can move them back.

**Pronouns are a closed set, not three strings.** The game has to conjugate
around them — "he asks" and "they ask" are different sentences — so the set
carries verb agreement and the copy slots use it.

### Four rules, each of them load-bearing

1. **A name is never evidence.** The name corpus deliberately carries no
   demographic attribute (`names-data.ts`, a decision older than this packet),
   so nothing may read gender off a name. A test builds two characters both
   named Alex Reyes with opposite stated genders and asserts the only
   difference is what was stated.

2. **Absence is preserved.** "Rather not say" writes **no identity at all**,
   not a neutral one, because "the record does not say" and "this person is
   non-binary" are different facts. Presentation falls back to they/them and
   uses it for the whole sentence.

3. **Generated is not inferred.** The people this world invents — a guardian, a
   sibling, a classmate, a housemate — get pronouns from the same generator
   that already invents their names and birth dates. That is one act, not a new
   one. Drawn from a stream **forked on the person's own stable key**, so
   adding it shifted no existing name or date.

4. **An old world stays the world it was.** The setup encoding writes the
   gender field _only when it was stated_, so the default setup encodes byte
   for byte as before and every previously built life keeps its identity, its
   seed and its people. A test pins that.

### What could not be carried

**Generated first names are not gendered.** A character with `female` stated
can be handed the name "Charles", because the corpus carries no gender
association to draw on. Adding one would mean adding the demographic attribute
the corpus was built to exclude — a bigger and worse change than the defect.
The player can type any name, and pronouns are correct either way. Stated as a
limitation in §11 rather than quietly worked around.

---

## 4. Standing, and why a ten-year-old was handed a furnace

The playtest's second finding has a single root cause, and it is not the copy.

**Every dependent household the world builds holds exactly one other person: an
adult guardian.** The setup screen asks whether anybody else lives here, and
for a child it threw the answer away. Meanwhile `household-companion` — the
episode role meaning "somebody on the same household record" — binds everybody
under the roof. So a scene written for somebody your own age bound your own
parent, and a ten-year-old was asked whether to report their guardian's late
nights to somebody older, and offered "Answer for them" as one of five.

Three changes, in the order they matter:

**A role that can tell the difference.** `guardian` binds from the parental
authority record. `household-peer` binds a co-resident with **no authority
either way** between them. The childhood household family now requires a peer;
a test asserts no person is ever bound as both.

**A capability requirement.** `EpisodeCapabilityKey` — `answers-for-themselves`,
`paid-work`, `responsible-for-somebody`, `in-school` — each read off records
with the anchors that answered it, plus a `without-capability` mirror, because
a scene about being told what is happening rather than deciding it needs
somebody who does _not_ answer for the household.

**A sibling, where the player asked for one.** `shares-a-home` for a child now
generates a brother or sister with a `collateral:sibling` kinship, two to four
years either side. This is the setup screen's own question finally being
answered instead of discarded, and it is what gives the peer role somebody
truthful to bind.

### A defect this uncovered

`summarizeEarlierLife` created a childhood parental authority record at birth
and **never ended it**. Nothing noticed, because nothing asked. The moment a
stage could require that a character answers for themselves, the world reported
every thirty-four-year-old in the game as still somebody's dependent, and the
adult household family withheld itself from every adult. The authority now ends
at eighteen. A childhood that never ends is a false biography, not a
bookkeeping quirk.

---

## 5. The content audit

Not the three screenshots — the whole reachable bank, read item by item.

### Setup and calibration

| Measure                    | Before | After                                        |
| -------------------------- | ------ | -------------------------------------------- |
| Authored items             | 53     | **74** (56 reachable, 18 withdrawn)          |
| Reachable by an adult      | 53     | **37**                                       |
| Reachable by a 10-year-old | 53     | **10**, all written for middle childhood     |
| Reachable by a 15-year-old | 53     | **9**, all written for adolescence           |
| `policy-docket` register   | 15     | **0**                                        |
| Options in reachable bank  | —      | 208                                          |
| Items with no life stage   | 53     | **0** — an item without one does not compile |

**Withdrawn: 18.**

- **15 `policy-docket` items.** Six hundred words of "hydrogeologists warn that
  the plant's runoff, even within minimum statutory limits, poses a cumulative
  long-term risk", with four options each of which states a policy position and
  then argues for it. The register's own definition in the file calls it "a
  policy question with no place and no people in it". 60C flagged all fifteen;
  70A deferred them; the human called the class AI slop. They are a political
  science exam, and this is a game about a life.
- **3 former fixed openers.** Their options both take the action and explain the
  reasoning — "Attend the public debate; personal commitments must yield when
  professional and civic achievements reach a critical turning point" — which is
  the one thing the opening bank's own authoring rules forbid.

**Kept in the file with the verdict attached, and kept readable.** A save
written before today carries answers naming these keys, so lookup resolves
across everything ever authored while selection reads only the reachable bank.
Withdrawing a question must not recalibrate somebody's existing life, and a test
holds that shut.

**Two of them were carrying real work.** `administrative_whistleblower` and
`public_debt_infrastructure` were the items that could tell "the market should
decide" apart from "the state cannot be trusted to do it" — a distinction a
single mean cannot hold, and the reason the model keeps competing hypotheses at
all. That hypothesis structure is re-authored as two lived scenes,
`the_audit_on_your_desk` and `the_line_to_the_hospital`, and the acceptance test
that proved the capability now names them.

**Authored: 16 new items** — 10 for middle childhood, 6 for adolescence,
each band with its own three openers. Registers across both bands cover
personal, relational, moral, civic and policy.

### Classification of every reachable item

| Class                    | Count | Where                                                           |
| ------------------------ | ----- | --------------------------------------------------------------- |
| CHILD-VALID              | 10    | `setup-young-life-bank.ts`, middle-childhood band               |
| ADOLESCENT-VALID         | 9     | `setup-young-life-bank.ts`, adolescence band                    |
| ADULT-VALID              | 37    | `setup-opening-bank.ts` (29) + 8 inherited, all declared adult  |
| MULTI-STAGE WITH VARIANT | 0     | No item is written for two bands; a scene belongs to a standing |
| REJECT / WITHDRAWN       | 18    | Kept with the verdict, unreachable                              |

### Episodes, conversations and narration

- **9 families, 34 stages, 93 options** — every stage re-read against the age
  bands and the banned-construction list.
- `home.someone-is-not-all-right` rewritten: peer role, capability gate, both
  named constructions removed, and every option turned into something a child
  can carry out.
- `home.the-week-that-does-not-balance` gated on `answers-for-themselves` —
  dividing the housework with your own guardian is not the scene it is written
  for.
- Conversation copy, journal summaries, thread sentences, callback and aftermath
  copy all re-read; one construction found and removed
  (`"Nobody filled the gap"` → `"Nobody said anything"`).
- `school.the-thing-you-got-blamed-for` reviewed and left alone: "say who did
  it", "take the blame", "say only that it wasn't you" are exactly a child's
  three moves.

---

## 6. The five-question path

A short path is five questions, and it is now five questions **from one life at
the stage the player asked for**.

```
  start age 10 → child_kitchen_late, child_theo_took_it, child_the_note,
                 child_kenny_on_his_own, child_bea_took_the_blame
  start age 15 → teen_the_shift_and_the_test, teen_theo_driving,
                 teen_the_essay, teen_the_money_for_the_car, teen_the_till_short
  start age 34 → kitchen_late, marcus_and_the_trip_fund, priya_reference, …
```

The same handful of people run through each band — Dee, Bea, Theo, Kenny,
Ms. Ruiz — so five questions read as five moments rather than five unrelated
ethics cards. A test asserts at least two of them recur inside a single
five-question run, and that the child and adolescent runs share no item.

### The semantic mode, chosen and declared

The packet requires one truthful mode per item, and the architecture settles
which one. The calibration runs **before any world exists**, and the separation
between it and world generation is load-bearing: a political answer must never
manufacture a family, and a test builds the same world from two opposite sets of
answers to prove it does not.

So these scenes cannot bind to generated people, and pretending otherwise would
be the invention this project refuses everywhere. The honest fix for a player
who cannot tell is **to tell them**, once, plainly, above the first question:

> These are about you, not about the character. Nobody in them exists in the
> game, and nothing you answer here decides who your family is — only what the
> game asks you next, and what it offers you later.

And matching the life stage is not decoration on top of that. A calibration
that measures a player against decisions the game will never offer them is
measuring the wrong thing, whatever it concludes.

---

## 7. Who somebody is

`person-context.ts` answers "who is Maya?" from canonical records and from
nothing else.

Resolution order, most specific first, each returning the record that answered
it: **guardian** (parental authority) → **dependent** (authority or care held) →
**parent or child** (parent-child kinship, birth dates deciding which) →
**sibling** (with older or younger from birth dates) → **partner** →
**other kin** ("family", because the game has no honest word for a
`extended:` kind) → **household** → **school** → **work** → **shared
organization**. No match returns `null`, and the surface then shows the name and
nothing else.

Measured on a generated ten-year-old:

```
  Ella Spears    → your mom              A parental:primary authority record
  Aiden Spears   → your older brother    A collateral:sibling kinship record
  Paola Clay     → who is in your class  Both enrolled, overlapping period
```

**Gendered words need a gendered record.** `mom`, `sister`, `daughter` are only
reachable when the person's own identity says so; everybody else is a parent, a
sibling, a child. Accurate, and not a guess dressed up as warmth.

**A shared surname is never consulted.** The world gives a child the family name
of whoever is raising them as a _household convention it writes down as one_.
It is not evidence, and a test asserts every relationship claim traces to a
record rather than to a name.

### Pronouns that agree with the sentence beside them

Authored copy gained six new slots on top of `{role:}`:

```
  {who:household-peer}    Aiden Spears, your older brother
  {they:…} {them:…} {their:…} {theirs:…} {themselves:…}
  {s:…} {es:…} {is:…} {has:…} {was:…} {does:…}   verb agreement
```

The agreement slots are the point. `{they:x} ask{s:x} you` renders "he asks
you" or "they ask you" — a game that substitutes the pronoun without the verb
writes one of them wrong every time. `rolesUsedBy` counts every slot form, so a
stage whose only mention of somebody is `{they:…}` still binds the role rather
than throwing at substitution.

---

## 8. The age-band voice contract

`voice-bands.ts`, three bands, and it is about **standing first and register
second**.

| Band             | Ages  | What the character can actually do                                                                        |
| ---------------- | ----- | --------------------------------------------------------------------------------------------------------- |
| Middle childhood | ~8–12 | Ask, tell, hide, help, wait, join in, refuse, promise, lie, stick up for somebody, follow somebody, leave |
| Adolescence      | 13–17 | All of that, plus money they earned, somewhere nobody drove them to, and other people's opinions          |
| Adult            | 18+   | Answers for themselves                                                                                    |

**Not a vocabulary filter.** A child can follow "the furnace is worse than she
told you" perfectly well; what they cannot do is own the furnace. The narrator
may be more articulate than the child it describes. What it may not do is give
a child an adult's job, an adult's institutional standing, or an adult's way of
explaining their own feelings back to themselves.

**Not a euphemism filter either.** Money is short in these scenes, an adult is
up at midnight with a calculator, somebody lies and somebody steals. Children
live through all of it. What they do not do is settle it.

### The guards

`BANNED_CONSTRUCTIONS` — 11 patterns, deliberately narrow. `\bthe thing with
the\b` fires on "the thing with the furnace" and leaves "the thing she said"
alone, because the defect is the evasion of a concrete noun, not the word
"thing". A test asserts the guard fires on the four phrasings the playtest
actually printed, and does not fire on four ordinary sentences including "There
is a gap year between the two of them."

`ADULT_ONLY_AGENCY` — 7 patterns, applied **only to child-band options**,
because the defect is a child being the one who acts. A test asserts it catches
the three options the human was actually offered.

---

## 9. Page hierarchy, and where #86's work starts

The play surface opened straight into a paragraph. Nothing on the page said
whose life it was or what year it had reached, the descriptive subtext under
each option competed with the option, and the journal was a bare word.

Added, all of it semantic and textual:

- a scene header naming the character, their age, the date and the place;
- a "What do you do?" heading between the narration and the choices;
- people introduced with their relationship, or their name alone;
- a journal control that says what it opens, with `aria-expanded`;
- four CSS rules for the four classes this markup names — plus a test that
  **no class the player shell names goes unstyled**, which is the defect 60A
  found five instances of and fixed by hand.

**No scene layout, no person rendering, no plate, no camera.** Where a person or
a room goes is #86's, none of these rules assume a layout it has not shipped,
and the executable ownership boundary still fails this branch if it reaches for
one.

---

## 10. Ownership

`tests/narrative-wave-ownership-boundary.test.ts` was widened to
`person-identity`, `person-context`, `voice-bands`, `setup-young-life-bank` and
`people.ts`, with the reason written into the test: all of it is character and
copy, which is this wave's, and none of it is a body family, a plate, a pose or
a scene.

**No carved-out surface moved.** #83, #84, #85 and #86 are untouched.

---

## 11. Known limitations

1. **Generated first names carry no gender.** A stated-female character can be
   given a name that reads masculine. The corpus refuses demographic attributes
   by an older deliberate decision; the player can type a name, and pronouns are
   correct regardless. §3.
2. **The middle-childhood band covers ages under 8 as well.** The minimum start
   age is five and nothing is authored for a five-year-old, so a very young
   start gets the eight-to-twelve bank. Reporting a fourth band with nothing in
   it would claim coverage the bank does not have.
3. **Ten items for a childhood, nine for adolescence.** Enough for the
   five-question path with room to differ, not enough for a long deep run at
   those ages. The deep path stops when it stops learning, so it ends early
   rather than repeating; more authored supply is content work.
4. **The relationship vocabulary stops where the records do.** `extended:` and
   `custom:` kinship kinds render as "family" rather than as cousin, aunt or
   stepfather, because the record says none of those.
5. **Two cold starts still produce the same life shape.** Unchanged from 60A,
   still upstream in `generateQuickCharacterHistory`, still pinned by a
   failing-when-fixed test.
6. **Group address is still context-gated** and the office and legislative
   conversation subjects are still dev-only, both unchanged from 70A §15.

---

## 12. What stays gated on #86

The packet is explicit and this report does not argue with it. **No human
retest is requested.** The sequence is:

1. the graphics owner finishes the resumed #86 intake and integration;
2. an independent exact-head #86 audit and visual review;
3. accepted #86 merges into `main`;
4. #87 is reconciled onto that resulting `main`;
5. the real graphics and player-layout integration is resolved **using #86's own
   scene and person components**, not by copying them;
6. all validation, E2E and determinism re-run;
7. and only then is a local command handed over for a new play.

### Exact reconciliation steps for step 4

```
git fetch origin main
git checkout claude/pr81-narrative-graphics-lifeflow-t8j8oe
git merge origin/main          # merge, not rebase — the branch is published
```

Expected conflict points, all of them known:

| File                             | Why                                                                     |
| -------------------------------- | ----------------------------------------------------------------------- |
| `src/player/PlayerGame.tsx`      | #86 binds scene surfaces in the same component this packet restructured |
| `src/player/player.css`          | Both add rules; this packet's are appended and additive                 |
| `src/presentation/life-story.ts` | `ScenePerson` is new here and is exactly what #86's binding needs       |

`ScenePerson` carries `personId`, `name`, `relationship` and `introduction` for
everybody in a scene, which is the join #86 needs to put a face beside a name.
Nothing in this packet should be reimplemented on top of #86; the header, the
choices heading and the relationship line are content for whatever #86 draws
around them.

---

## 13. Evidence

| Check                                               | Result                                                                                                                  |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `npm run validate`                                  | **Passed** — format, lint, typecheck, **1,485 tests across 91 files**, build, deterministic demo replay, art validation |
| `tests/character-context.test.ts`                   | **34 passed** — every human finding, plus the guards                                                                    |
| `tests/e2e/character-context.spec.ts`               | **8 passed** in a real browser, on the production route                                                                 |
| Full Playwright suite, 19 spec files                | **149 passed**, 0 failed                                                                                                |
| `npm run report:life -- packet72-replay 0 5`, twice | **Byte-identical**, 12,339 bytes                                                                                        |
| `git diff --check`                                  | Clean                                                                                                                   |
| `tests/narrative-wave-ownership-boundary.test.ts`   | Passes; #83/#84/#85/#86 carve-outs intact                                                                               |

### Three existing tests this packet changed, and why

None was weakened to pass, and none was skipped.

1. **`narrative-life.test.ts` — the slot vocabulary.** It listed four legal
   slots; there are now fifteen, and it checks role declaration across every
   slot form rather than only `{role:}`. A stricter check than the one it
   replaced.

2. **`narrative-life.test.ts` — "asks the two runs different numbers of
   questions".** Answer patterns 0 and 2 both stop at fifteen now that the bank
   is smaller. The claim is that different answers get different interviews, not
   that those two patterns do, so the witness moved to pattern 1 and the comment
   records the measurement: across the four patterns the bank supports, the deep
   path runs 14, 15, 16 and 15.

3. **`narrative-life.test.ts` — "diverges structurally once the lives are
   actually played".** Eight steps became twelve. Ending the childhood authority
   record made the adult household family reachable for the first time, and for
   the first few beats both lives spend themselves in it; they separate once it
   is used up. The comment says exactly that, because "differ for causal
   reasons" needs enough of a life for something to have happened in.

4. **`pennywise-adaptive-life.test.ts` — the ambiguity separators.** The two
   items that carried the separation were withdrawn, so the same hypothesis
   structure was re-authored as two lived scenes and the test names them. The
   claim — that the bank a player can be asked contains something that tells the
   two explanations apart — is unchanged.

---

## 14. Acceptance state

**Not accepted. PR #87 remains a draft and remains unmerged.**

**No human acceptance is claimed, and no retest is requested.** The next play is
gated on #86 merging into `main` and #87 being reconciled onto it, exactly as
the packet requires.

Every gate the packet named has been run and is green: focused setup and
calibration tests, age-eligibility tests, identity and pronoun persistence
tests, relationship-label tests, content-quality guards, childhood life-flow
tests, the Packet 70 dialogue tests, `npm run validate`, the complete Playwright
suite, deterministic replay, and `git diff --check`.
