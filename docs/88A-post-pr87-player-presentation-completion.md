# 88A — Post-#87 Player Presentation and Formative-Life Pass — Completion

Canonical completion report for the post-#87 player-presentation / new-game /
formative-life pork-barrel pass, on PR #91 (`claude/post87-player-presentation`).

A **new branch and a new PR**, cut from accepted `main`. PR #87 is left closed
and merged; nothing here reopens it. No human acceptance is claimed — §S says
what to retest.

---

## 0. Fourth human play — scene-first shell convergence

The fourth play failed on the play surface: a large white card over wallpaper,
no family in the room, People reduced to a button. This section is the
convergence answer, on the same PR #91, after merging current `main`
(`54ec313`, the #88 merge, tooling/evidence only).

**Focus (owner-directed): the scene-first shell and People rail.** The room is
now the surface, not a card on it:

- `src/presentation/life-scene-people.ts` places the people a moment actually
  contains on the scene registry's own anchors (seats then floor), resolved
  through #86's `composeSceneCharacter`. No second scene model or compositor is
  built; #89/#90 fit internals are untouched.
- `SceneBackdrop` gained a plate-space people layer. Because **no production
  body master is released** (the #88 despilled bodies are candidates, not
  released), every in-scene person fails closed to a named, floor-anchored
  placeholder — never a broken image, never another person's likeness. The day
  a body master is released the same placement carries the real sprite.
- `PlayingScreen` is rebuilt scene-first: the room fills the frame, the current
  moment is a compact civic-glass panel over it (not a page-sized card), the
  **generated household is a persistent People rail** on the right — the family
  the fourth play never saw — with open-a-person, pin/unpin and collapse, and
  where/when plus every secondary system live on a small corner HUD.
- The family introduction is a scene-establishing overlay, not a white box.
- One coherent civic control vocabulary (`ui-action`: primary / subtle / rail /
  choice, in ink, navy and gold) replaces the flat green web buttons across the
  shell.

Proofs: `tests/scene-people-placement.test.ts` (placement + fail-closed +
determinism) and `tests/e2e/scene-first-shell.spec.ts` (room fills the frame,
household on the rail with relationships, moment panel is a compact panel not a
page-sized card, open-a-person, collapse, a choice advances the life).

**Known limitation caused specifically by unreleased production person art:**
the people in the room are placeholders and the People rail carries names and
relationships only, because zero player-facing person master has cleared its
release gate. The shell is correct now and populates with real figures the
moment that art lands, with no further shell change.

**Deferred to a later pass on this PR (not in the owner-chosen focus):** the
residual title-transition stutter, the creator search-results reframe, the
Kentucky state-capability copy, the quick/detailed questionnaire split, the
policy-question content swap, the distinct character-creation moment, the global
button-system replacement, and driving the environment from the situation's
location (a school scene still paints the home plate). These are recorded here
rather than claimed.

---

## 0.1 Fifth human play — coherence repair

The fifth play called the core direction a win and asked for coherence: prose,
sequencing, viewport behaviour, People usability, and formative-life semantics.
Addressed on the same PR #91:

- **Narrative voice (§5):** narration is second person. The connective opener is
  now "You're 10, and you live in …"; the stiff third-person lines ("School
  carried on being…", "The house went on being … unremarkable", "has the same
  week you do") are rewritten in `life-narration.ts` / `life-introduction.ts` /
  `conversation-subjects.ts`. Identity is a deliberate name + age badge, not
  "Name, 10" repeated in prose.
- **Pronoun UI removed (§2, owner override):** Normal Start exposes gender only.
  The pronoun disclosure is gone; pronouns derive silently from gender.
- **Viewport lock (§3):** the creator is bounded to the viewport and a long
  place search (the Bloomington defect) scrolls internally instead of pushing
  Begin/Next below the fold. Proved at 1536×1024, 1440×900 and 1280×720.
- **People close (§4/§14):** secondary surfaces are framed panels over a dimmed
  room with an obvious way out — a close X, Escape and click-outside — and
  closing leaves the moment untouched. The HUD and People rail stay usable while
  a panel is open. The white full-page takeover is gone.
- **Age/role semantics (§7):** a dependent child is no longer handed the adult
  "who carries the week" household negotiation; `householdConversationRoom`
  refuses it when somebody still holds authority over the character.
- **Establishing frame (§6, partial):** the moment opens on a second-person
  connective ("You're 10. Most weeks were built around school. You spent most
  evenings at home with …") before the first dilemma.

Proofs: `tests/fifth-play-repair.test.ts` (second-person voice + the child
household-conversation gate) and `tests/e2e/fifth-play-repair.spec.ts` (viewport
place search, People close via X and Escape with the moment preserved).

**Deferred on this PR, with reasons:** driving the environment from a situation's
location (§9) needs a per-situation location tag and released school/civic art;
until school art exists the only honest alternative to the home plate is a
neutral background that would strip the room from most childhood content — a
worse trade than the current backdrop, so it awaits an owner call. Visible
choice-consequence over a childhood (§12), the adult-transition beat (§13), the
richer contextual situation construction (§8), the clicking-rhythm quality (§11)
and the global button-system replacement remain deferred.

---

## 1. Exact state

|              |                                                                                            |
| ------------ | ------------------------------------------------------------------------------------------ |
| Repository   | `lamontaes/Political-Game-Git`                                                             |
| Base at cut  | `68d7d48ee09aa7ea1a13a2d152f4f1129669ade5` (the merge of PR #87)                           |
| Current main | `0472d8eb7294f83bf8a151a800528cd063838064` (the merge of PR #77) — merged into this branch |
| Branch       | `claude/post87-player-presentation`                                                        |
| Prior pass   | 77A (on #87 itself) — this continues from the human's **third** play                       |

This is not another archaeology pass. The product direction is the human's
post-merge feedback; this implements it.

---

## 2. What the third play found, and where each finding is answered

| §   | Finding                                                                  | Answer                                                                                                                      |
| --- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| A   | The title narrated the empty room ("a hall … with nobody in it")         | The environment-description line is removed from the title and the creator; the room is the picture                         |
| A   | Hero slot                                                                | The community-meeting podium hero slot is preserved; missing person art still fails closed (empty, honest)                  |
| B   | The transition read as a white camera flash                              | A true image-to-image crossfade: the outgoing room holds opaque under the incoming one; opaque backing behind               |
| B   | Ambient motion                                                           | Ken-Burns scale/pan amplitudes up ~10%, cycle a little quicker; reduced-motion still disables it                            |
| C   | The creator was a web-app white card                                     | A restrained frosted panel on the LEFT, not a big opaque rounded rectangle; controls left-biased at desktop                 |
| D   | The creator clipped and required scrolling                               | Completed steps collapse to one-line editable breadcrumbs; only the active step is full — it fits the viewport              |
| E   | Normal Start asked biography (household/siblings/work/path/depth)        | Normal Start asks only who you are and where you're from; household/work/depth are generated after Begin                    |
| F   | "HOW THIS LIFE GETS MADE", "Everyday life only, for now", "the life"     | Removed; headings are natural sentence case; place copy is sourced context, not debug language                              |
| G   | Separate pronoun picker, "Leave unspecified", permanent name placeholder | Pronouns auto-derive with a compact optional override disclosure; three genders; a name hint, not a placeholder             |
| H   | "Kentucky · Everyday life only, for now" place debug string              | A capability-gated place-context panel built only from sourced facts (state, formal name, whether a legislature is modeled) |
| I   | Nationwide start-anywhere                                                | #77 merged mid-pass; the smallest reviewed one-way adapter is built — New Game searches the whole country (see §I)          |
| J   | "Calibration", dimensions, scores, "3 of 26"                             | Reframed as "Who are you?" with two actions: Answer a Few Questions / Discover Who I Am Through Play                        |
| K   | Begin = alternate-timeline boundary; circumstances generated after Begin | The household/family/background are generated by the world builder after Begin, from canonical records                      |
| L   | The family-introduction debug provenance prose                           | "The game wrote them…" removed; the introduction is exposition drawn from canonical records only                            |
| M   | Scene-first UI                                                           | Unchanged from #86/#87 — center scene, right People rail, elsewhere controls (not rebuilt; see §Q)                          |
| N   | A 10-year-old's _younger_ sister behaving like a mobile teen             | A `role-age-at-least` eligibility gate: the "coming in late" beat needs a peer ≥ 13, else it is refused                     |
| O   | Formative rhythm                                                         | Variable resolution preserved; the role-age gate makes situations selected by causal eligibility, not chance                |
| P   | Copy quality                                                             | Player-facing strings across title / creator / who-are-you / intro rewritten to concrete, non-slop prose                    |

---

## 3. The identity decision (Task G), reconciled

The brief stated the durable rule as "no separate pronoun picker; pronouns
derive automatically; no 'Leave unspecified' option." The repo's tested rule
(72A / `person-identity.ts`) was the opposite: pronouns are a deliberately
separate, overridable field so a character whose pronouns differ from their
gender default is expressible. This conflict was raised with the owner, who
directed following the brief.

The chosen resolution keeps both true: pronouns now **derive automatically** and
there is **no permanent pronoun row** (the brief's ask), but the override
survives in a compact `<details>` disclosure — one of the brief's own listed
control-vocabulary items — so a non-binary character who uses she/her, or a
female character who uses they/them, is still expressible without a form-like
row. Gender is Female / Male / Non-binary; "Leave unspecified" is gone from the
UI. An unstated gender is still the internal default when no gender is chosen,
so no identity is fabricated.

---

## 4. Generate-after-Begin (Task E), and why the blast radius is small

Normal Start no longer carries the household, work, or depth choices. In
`new-game.ts`:

- `resolvedHousehold` draws "who is at home" from `worldSeedFor` — the world's
  identity, not the calibration — so a normal life is sometimes an only child
  and sometimes has a sibling, decided by the seed, reproducibly. Custom Start
  honours the explicit answer.
- `resolvedDepth` derives play-vs-summarize from the starting age rather than a
  separate question.
- The starting role is left as the setup carries it: the normal creator offers
  no office, so a normal start is already `ordinary-life` and work is something
  a life reaches through play.

World **identity** did not move — `worldSeedFor` is unchanged, and the household
is resolved at build time — so replay addresses and the determinism proofs still
hold. What changed is the built household for normal starts, which is the point.

Consumer fixtures that pinned a shared household on a normal start were moved to
the custom route (one `startKind: "custom"` each; assertions unchanged) — see
§8.

---

## 5. The formative-eligibility gate (Task N)

The flagged scenario is `home.someone-is-not-all-right` / `noticing` in
`episode-bank.ts`: a household peer "comes in after everyone else … a different
place each time." It gated on the _player_ being under 18 but never on the
_peer's_ age, so a seven-year-old sibling was cast as independently mobile.

The fix is general, not a special-case:

- `EpisodeRoleBinding` now carries each bound person's `age`, read off their own
  birth record.
- A new requirement kind, `role-age-at-least`, is satisfied only when a binding
  of the role meets the age, and its exclusion says why in words.
- The scenario now requires a household peer at least 13. Where the only peer is
  a younger child the beat is refused and something the records can ground is
  offered instead; where an older sibling is at home, a ten-year-old noticing
  their teenage sibling's late nights is plausible and grounded.

`tests/formative-eligibility.test.ts` proves it: younger peer → refused (with an
"at least 13" exclusion), older peer → offered, and the decision is
deterministic across replays.

---

## I. Nationwide Start Anywhere adapter — implemented

PR #77 merged mid-pass (new `main` `0472d8e`), landing the accepted national
place identity — the 2025 Census Gazetteer, 32,350 places — under
`data/source/places/`, and `main` was merged into this branch normally. The
smallest reviewed adapter is built:

- **The one-way seam.** `scripts/source/export-life-places.ts` (Node) reads the
  compiled, accepted corpus and writes `src/simulation/national-places.generated.ts`,
  carrying only place identity (GEOID, resident-facing name, state) with its
  provenance (Gazetteer artifact, sha256, as-of, coverage). It invents no place
  facts and builds no second geography. `src/source` stays Node-only: the
  browser reaches the corpus only through this generated data, never by import.
  The boundary is enforced three ways — `tsconfig.app.json` excludes `src/source`,
  the eslint `no-restricted-imports` rule #77 added forbids the import, and
  `tests/nationwide-places.test.ts` asserts the browser modules carry no source
  import.
- **The consumer.** `life-places.ts` searches authored places plus the national
  corpus, resolves a chosen place by key, and synthesises a minimal, sourced
  jurisdiction context so an arbitrary town is playable as an ordinary life.
- **Missingness preserved.** A corpus town is granted no legislature — the
  accepted rule packs are state legislatures, and a town is not one — so office
  play stays only where a pack is sourced (Kentucky, Nebraska, Alaska). No
  unsupported place fact is fabricated; the state-name and timezone tables are
  standard postal/timezone reference used only to name a state and default the
  game clock, documented as such.
- New Game's place search consumes the seam; Lexington is de-duplicated against
  its corpus GEOID.

Ownership stayed clean, so this lives inside the post-#87 task rather than a
second writer.

---

## Validation

| Check                             | Result                                                                                                     |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `npm run validate` (post-merge)   | **passed** — 1,684 unit tests, source validate/replay, typecheck, lint, format, build, demo, art all clean |
| Typecheck / lint / format         | clean                                                                                                      |
| `npm run demo -- validation-seed` | clean                                                                                                      |
| `npm run report:life` × 2         | **byte-identical** — sha256 `0e3c06dc…a469d3`, 12,810 bytes both times                                     |
| Playwright                        | see §S / PR body for the run at the pushed head                                                            |
| Ownership boundaries              | pass; #77's merge froze the narrative-wave range to #87, and the eslint source boundary passes             |
| `git diff --check`                | clean                                                                                                      |

---

## 8. Ownership

When PR #77 merged, it **froze** `tests/narrative-wave-ownership-boundary.test.ts`
to the range PR #87 actually shipped (`5f735da..68d7d48`), so that check no
longer measures this branch's working tree at all — it is a closed claim about
#87. This branch therefore touches no active file-ownership boundary. Two
consumer test fixtures (`browser-world-repository.test.ts`,
`conversation-commit.test.ts`) were moved to the custom route after the
normal-start household change; only their fixtures moved, never their source.

The seam that _is_ live and enforced is the source boundary #77 added: the
eslint `no-restricted-imports` rule and `tsconfig.app.json`'s exclusion of
`src/source` both fail any browser import of the substrate, and this branch adds
none — the national corpus is reached only through the generated export.

#86's graphics runtime (scene registry, camera, raster tiers, asset resolver,
character compositor, garment fitting, art intake, production library) is
consumed, never rebuilt, and PR #89/#90 garment/arm internals are untouched.

---

## S. What to retest

| Route / screen                 | What to look at                                                                                                                                                                             |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `/` — title, desktop           | No line describing the room. Menu is a compact panel on the LEFT; the room is most of the frame. Wait ~15s: the room crossfades with no white flash, and drifts slightly more than before.  |
| `/` with OS "reduce motion" on | The room is there; it does not drift or crossfade.                                                                                                                                          |
| New Game → route               | "Start a life" / "Custom start". No "How this life gets made".                                                                                                                              |
| New Game → character           | Name (no permanent placeholder — a hint below), age, gender (three; no "Leave unspecified"), pronouns in a small disclosure.                                                                |
| New Game → place               | "Where you're from" search now reaches the whole country (try any town — "Ann Arbor", your own); a chosen place shows a short sourced context, and only sourced states offer a legislature. |
| New Game (normal)              | No household / work / depth questions. Completed steps collapse to breadcrumbs; nothing clips or scrolls.                                                                                   |
| New Game → who are you         | "Who are you?" with two actions; optional; no calibration / dimensions / scores / fractions.                                                                                                |
| Begin, normal, age 10          | Fade, then the generated household is introduced (each person from the record); no "The game wrote them…" line.                                                                             |
| First formative scene          | A situation grounded in who is actually there — a younger child is not cast as an independently mobile teen.                                                                                |
| Custom start                   | The background step (household / work / depth) is here, set by hand.                                                                                                                        |

---

## Not claimed

No human acceptance. The next gate is Lamontae's play, not this report.
