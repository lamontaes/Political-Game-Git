# Narrative Style & Quality Authority — Our Civic Duty

Status: **DRAFT AUTHORITY** (overnight audit, 2026-09-05). Derived from evidence, not opinion: the deterministic corpus in `docs/overnight-audit/corpus/`, the owner's real human-play feedback, the accepted good copy already shipping in the game, and the enforced canon↔realization architecture. Human owner review remains final for writing quality; this document exists so a future content pass has a project-specific target instead of "write well."

This is not generic prose advice. Every rule below is anchored to a real string in the current build (by its speakable id `S-`/`C-`/`N-`/`T-####` from `prose-inventory.json`, or by `file:line`) and, where it is a rejection, to a concrete rewrite direction.

---

## 0. The one division everything rests on

**Simulation decides WHAT is true. Realization decides HOW a true thing is said. Prose may never decide truth.**

This is already enforced structurally, and the audit confirmed it holds (corpus lint: **0 unbacked-connective, 0 unintroduced-person** across 260 beats):

- Every connective sentence carries the canonical records it came from (`life-narration.ts` `sources[]`); a sentence with nothing behind it is visible as one.
- `substituteSlots` (`life-episodes.ts`) fills only record-derived slots (`{self}`,`{age}`,`{place}`,`{role:X}`,`{who:X}`, pronouns) and **throws** on an unknown slot or an unbound role — so copy that names a person always has a real person behind it.
- `person-context.ts` composes relationship labels ("your mom", "who you live with") by _reading_ records, never inferring; it returns `null` when no record establishes a relation.
- The one place prose can still smuggle in world truth is **inside an authored bank string** — a hand-written line that asserts a relationship instead of using `{who:}`, or a `memory` that claims an outcome the records don't carry. `substituteSlots` guarantees slots resolve; it cannot police the fixed text around them. **A prose pass must read the banks for this.**

Keep this division sacred. Everything below is about the HOW.

---

## 1. Voice: natural second person, concrete human observation

Default to "you". Prefer what a person would actually notice — a specific action, tension, place, person — over a description of world state.

**This is already the house voice and it is good.** Keep it. Accepted examples (mark these GOOD in the packet to bank them):

- `S-0002` — _"Something got broken in the corridor at your school and your name is the one that came up. You were there. You did not do it. The person who did is standing four feet away saying nothing."_ Concrete, present, gray, no meter.
- Adult banks: _"Somebody wants what is owed, on a schedule that is not the one you had in mind."_ (`adult-situations.ts:553`); _"You spent the whole day outside for no reason at all, and remembered it longer than several more important ones."_

---

## 2. Do NOT narrate database persistence ("state did not change" is not an event)

This is the **single largest quality defect in the current build.** 93% of all lint findings (387 of 418) are machine-cadence + repetition, and they come from a _small set_ (47 distinct strings) of steady-state "nothing changed" lines that fire on nearly every beat.

The banned construction is _"X carried on / went on being / kept happening"_ used because a state field did not change:

| id              | offending line                                                                | count | why it fails                         |
| --------------- | ----------------------------------------------------------------------------- | ----: | ------------------------------------ |
| `N-0216`        | "School carried on being the thing the week was built around."                |   ×50 | narrates a record not changing       |
| `N-0217`-family | "The house went on being {names}, and most evenings in it were unremarkable." | ×many | narrates the household record        |
| `N-0279`        | "The meetings kept happening, roughly monthly, mostly dull."                  |   ×38 | narrates an org-participation record |
| place floor     | "{place} went on as it does, and so did {name}."                              | ×many | narrates nothing at all              |

Source: `life-narration.ts` `steadyState()` (lines ~391, 411, 445, 470, 511). The _design intent_ is sound ("a quiet stretch is not an empty one") — the _execution_ reads as machine filler because the same fixed line is emitted whenever nothing moved.

**Rules:**

1. **Steady-state narration is rare, not per-beat.** Say what stayed the same only when a genuinely long stretch passed (raise the threshold well above the current 25 days) AND nothing else is worth saying.
2. **Never emit the identical steady line in two adjacent beats** (91 adjacent repeats in the corpus) or 3+ times in one life (76 runs). The rotation guard rotates on dates, not on "what did I just say" — it must also avoid the last-shown line.
3. **When you do describe a quiet stretch, make it a concrete observation, not a status report.** Not "School carried on being the thing the week was built around" but a specific small true detail the record supports (the walk, the one teacher, the seat by the window). If the record cannot support a concrete detail, say _less_, not a generic line.
4. **A quiet stretch may be summarized by time alone.** "By the spring." is often the whole of what needs saying; don't append a household recital after it.

---

## 3. Don't fill dead time; vary the time-passage vocabulary; omit irrelevant true facts

- The elapsed-time vocabulary is tiny and repeats hard: `N-0218` _"A month later."_ appears **×97**; _"A couple of weeks on."_ ×42. `elapsedPhrase()` in `life-narration.ts` needs a wider, varied vocabulary (and should lean on the season/age it already computes).
- Narration may **omit** true facts that don't matter. Not every enrollment/household/meeting needs a sentence every time.
- A statement like "nothing this year that anyone would tell a story about" is acceptable _occasional_ compression. It must not become the loop.

---

## 4. Age governs agency, vocabulary, what is noticed, and what is plausible

Two real, reproducible problems:

**(a) Episodes are not scaled to young ages.** The corpus shows the "sibling coming home late" and "corridor blame" episodes firing **identically at age 5 and age 10** (`S-0001`, `S-0003` at age 5). A five-year-old should not be handed a ten-year-old's social-surveillance dilemma. The engine bands correctly (early-childhood ≤7 / middle-childhood 8–12 / adolescence 13–17), but authored content leans on middle-childhood; **ages 5–7 have essentially no age-true content** (`voice-bands.ts` comment). _Author early-childhood scenes, or gate the middle-childhood ones to 8+._

**(b) The calibration serves adult civic scenes to children — BY DESIGN.** `itemAdmissible` (`setup-questionnaire.ts:257`) gates only the 3 fixed band-openers; every other calibration item is admissible to any age, so a 10-year-old's "Who Are You?" draws ward-budget / liquor-licence / surveillance-camera policy scenes from the adult bank. This is the Packet-77 decision that the questionnaire is a survey of the _player_, not the _character_ (the UI even says so). **It directly conflicts with the audit's child-safety rule and is an OWNER DECISION, not a bug to silently fix** — see the action board. If the rule wins, band-gate non-fixed items; if the design wins, make the framing unmistakable and choose items that don't read as concrete adult lived scenes.

Rule: a child's choices, vocabulary, and what they're asked to decide must be a child's. No adult errands, appointments, procurement, or civic obligations at the routing level (the engine already forbids this for _situations_; the gap is the _calibration_ and the _thin young-age content_).

---

## 5. People must be introduced before they are leaned on, and named as real

- The present-people system works (0 unintroduced-person in the corpus): scenes carry `presentPeople` with an `introduction` ("Maya Pittman, your mom") derived from records.
- **Gender-neutral name dissonance is real and player-visible.** `S-0001`: _"Ibrahim Rocha, your older sister … she asks you for money."_ The name corpus deliberately carries no gender so nothing can be inferred from it — but to a reader "Ibrahim … your older sister … she" reads as a bug. **Owner decision:** either associate first names with the character's stated/derived gender for display, or accept the dissonance as a deliberate anti-inference stance. Flagged on the action board.
- **Vocative-binding smell** (13 in the corpus): scenes that open _"{Bound Person}, your …"_ — e.g. `S-0001` opens by addressing the sibling by full name then says "your". Read as: the scene is addressed to the player but leads with the bound peer's name. Rework these openers so the addressee is unambiguous.

---

## 6. Choices should be genuinely gray, not virtue buttons

Good news: the audit found **no virtue-button choices** in the episode or adult banks — the closest (`adult.small-windfall` give-it vs spend-it) is balanced, and civic/political branches carry real cost. Keep this bar. The owner's lunch-table/bullying example is the target: competing plausible incentives, no obviously-correct option, and the description says what the choice _is_, never how it will _turn out_ (the opacity test already enforces no outcome preview).

---

## 7. Scenarios must be concrete, not "the thing that was planned"

18 vague-referent findings, all from the **formative bank** (only ~20 situations, `AUTHORED_SITUATIONS`, `character-history.ts` — the one authored bank not yet in the review packet, since it is a private const; the episode/adult/calibration banks are fully covered, 720 templates). Examples: _"The thing that was planned for this month is not happening any more."_ and _"The house needs you on the same afternoons the thing you signed up for does."_ Compare the concrete episode families ("the corridor", "the little brother's late nights"). A scenario that names its stakes only as "the thing"/"the plan" gives the player nothing to picture. **Rewrite the formative bank to episode-family concreteness, and expand it — it is the weakest, thinnest, vaguest bank.**

---

## 8. Consequence must become visible and carry forward

This works and is the game's best feature — protect it. The corpus shows a choice at 10 ("say who did it" in the corridor) surfacing months later ("the person you named has not spoken to you since, and has told other people their own version"). This is the "holy shit, the game remembered that" objective (Constitution 24) actually landing. Lint found **0 no-consequence** beats. Keep every authored option tied to a real `memory`/`aftermath` and let later beats surface it.

---

## 9. Alternate-history richness comes from different lives, not interchangeable sentence fragments

Prefer a **bounded bank of strong, coherent realizations** to infinite combinatorial slop. Variety should come from different people, families, conditions, opportunities, events, decisions, and causal chains — not from grammatically interchangeable clauses. (Known engine gap to be honest about: two _cold-start_ generated lives currently share the same life _shape_ and differ only in names until played — `adaptive-life-and-setup.md:239`. Expanding structural variation of quick-generated lives is a real content/research item, not a prose fix.)

---

## 10. No implementation vocabulary; no authorial voice in the fiction

- No dev vocabulary in player text (the opacity test enforces `fixture`/`placeholder`/`stakes`/`cross-pressure`/etc.). Two live leaks to fix (bank-owner lane): the `"score check"` phrase written into a canonical conversation record (`conversation-subjects.ts:836`) and the `"Synthetic …"` incident labels (`incident-catalog.ts`) if ever rendered.
- No **meta / authorial-voice** clauses: `"…and the record is allowed to say so."` (`adult-life.ts:139`) and similar in `formative-play.ts` are the designer's rationale spoken inside the player line. Trim them.
- Pick one spelling convention: the banks mix British (`neighbour`, `NEIGHBOURHOOD`) and American (`neighborhood`, `neighbor`).

---

## How this authority grows

The review packet (`prose-review-packet.html`, published as a private artifact) lets the owner mark every distinct line GOOD / AWKWARD / BAD / WRONG CONTEXT / REPETITIVE with notes, and copy the marks out. Ingest those marks back into `prose-inventory.csv` (the `mark`/`notes` columns are already there): GOOD lines become the positive house-style corpus a future pass writes toward; BAD/WRONG-CONTEXT lines become the rejection set with reasons. This is durable editorial evidence, not model fine-tuning.

**Re-run `npm run corpus:narrative` after any narrative change** and diff `lint-summary.md`: the machine-cadence/repetition counts are the fastest signal that Rule 2 and Rule 3 are being honored.
