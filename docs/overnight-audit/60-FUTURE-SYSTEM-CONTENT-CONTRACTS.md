# Future-System Content Contracts — Our Civic Duty

Overnight audit, 2026-09-05. Clearly labeled **future probes** — these systems are NOT implemented; do not read them as claims that they exist. Their purpose is to catch bad content contracts **before** anyone authors hundreds of lines: for each domain, state exactly what canonical facts a scene **receives**, what its prose **may** express, what it **must not** invent, and the choice schema. Each obeys the invariants already enforced today (`adaptive-life-and-setup.md` "What is forbidden here"): no outcome preview, no rendered stakes/meter/delta, choices respect age/role/context/knowledge, and prose realizes canonical truth without deciding it.

Reuse over new machinery: each contract names the **existing** records it should read (organization ids, eligibility provider, relationship interactions, work relationships, the future-due-item substrate) so the system extends the one World rather than forking a minigame.

Format for each contract:

- **Facts in** — the canonical inputs the scene is handed (WHAT is true).
- **Prose may** — what the realization layer is allowed to say / infer from those facts.
- **Prose must not** — the invention boundary.
- **Choices** — the option schema (labels are actions, descriptions say what the choice IS not how it turns out).
- **Consequence** — what a choice writes (canonical), surfaced later by existing readers.
- **Fixture sketch** — the smallest deterministic test world to author the bank against.

---

## C1 — College / education-at-~18 decision scene (Stage 5 substrate exists headless; Life-Mode content unbuilt)

**Facts in** (all from existing records; none invented by the scene):

- `age`, `homeJurisdictionId` → `{place}`; current `EducationEnrollment` (secondary, ending) and its stableKey.
- Household composition + `assessAffordability(...)` qualitative band (available | strained | blocked) — NOT a number.
- Any `WorkRelationship` (a job the character already holds) and `standingCommitmentsFor(person)` (e.g. care of a household member).
- Player-model salience is available to the SELECTOR only, never to the scene text.
- **Admissions/aid/cost are NOT yet canonical** — see "Needs new" below. Until they are, the scene may only pose the _decision to pursue_ a path, not a specific acceptance/aid figure.

**Prose may**: name the concrete choice a real 18-year-old faces (keep going in school / work / a training path / stay for family), reference the household's qualitative strain if a record supports it, name a real household member via `{who:}`.

**Prose must not**: state an admissions result, a tuition number, an aid award, or a debt figure until those are canonical records with provenance (Constitution 25). Must not imply the "right" answer or preview the outcome. Must not offer college as mandatory.

**Choices** (gray, age-true, no forecast): pursue further schooling · take work now · a vocational/apprenticeship path · a service route (where designed) · stay for a family obligation. Each description says what the option _is_ and its known cost ("It costs money you would notice" is allowed; "You will probably regret it" is not).

**Consequence** (writes only existing record kinds): a new/continued `EducationEnrollment` OR a `WorkRelationship`/apprenticeship composition OR a care `commitment`; a `memory`; a relationship interaction if a household member is bound. Surfaced later by `narrativeThreads` (a "school"/"work" thread) and `episodeFacts` (`school.enrolled`/`work.employed`).

**Needs new (before authoring the bank)**: canonical `Admissions`, `CostOfAttendance`, `AidAward`, `FamilyContribution` records (Stage 7B/9 data + a decision surface). **Author no college-outcome prose until these exist**, or the prose will invent world truth.

**Fixture sketch**: an 18-year-old in KY, `summarize-earlier-life`, `shares-a-home` with one guardian + one sibling, a secondary enrollment ending, `assessAffordability` = strained, no job. Deterministic from seed.

---

## C2 — Legislative conversation / bargaining turn (D-056 spine exists; bargaining is #79 / Stage 10, unbuilt)

**Facts in**: the `LegislativeMeasureRecord` (derived position by replaying actions vs the rule pack — never a stored bucket); the actor's own `LegislativeActionRecord`s; the addressee's role/membership from the rule pack; the relationship history between the two people (`relationship interactions`, `relationship-leverage` direction — derived, no stored score); any `standingCommitment` either has made; the jurisdiction's rule pack (KY bicameral / NE unicameral / AK bicameral) resolving known/unknown/not-applicable, fail-closed.

**Prose may**: state where the bill actually stands and whose step is next (the game already does this: "Where your bill stands", "Who decides next"); refer to a real prior action or a real prior commitment; express the addressee's stated position (public position ≠ private belief ≠ campaign promise ≠ behavior — keep them distinct, Constitution 7).

**Prose must not**: reveal the other actor's _true_ support or private belief (Constitution 28 — no omniscience); offer the player another actor's decision as their own choice (`legislation.md` — the only step is to wait, and what the actor did is revealed after); expose a whip count as a number or a "persuasion points" meter (Constitution 4, 10); state an amendment rewrote the bill text (not yet modeled — `legislation.md:169`).

**Choices**: make an ask · offer a targeted provision / trade (a real earmark grounded in the measure) · state a commitment (writes a `commitment` with firmness) · apply pressure via a real relationship leverage the records support · wait. Descriptions name the ask, not its probability of success.

**Consequence**: a `LegislativeActionRecord` and/or a `commitment` record and/or a relationship interaction; the bill position re-derives; the commitment's standing (outstanding/met/broken) later becomes visible through `standingCommitmentsFor`. Bargaining/whip attach at the relationship seam (`legislation.md:106`) — do not build a second commitment store (`commitment-seam.ts` already names the shared semantics).

**Needs new**: a whip/support-assessment model (fallible, non-omniscient) and provision-rewrite/text-diff for amendments. **Author member-decision dialogue as _authored_ today** (scenarios author votes, `legislation.md:105`), and label it so it is not mistaken for emergent behavior.

**Fixture sketch**: reuse the Run-C Transit Access Pilot working-document fixture + a KY rule pack; two members with a prior interaction history; one open measure at a known position.

---

## C3 — Meeting a new person / a relationship forms (composers exist; autonomous relationship dynamics unbuilt)

**Facts in**: the two `Person` records; the canonical context that put them in the same scene (a shared organization id — school/employer/campaign/civic org; a household; an event); each person's independent goals/beliefs (sparse — Constitution 8) and any prior `relationship interactions` (usually none for a stranger); `describePersonContext` returns `null` for relationship when no record establishes one.

**Prose may**: introduce the other person by what a record establishes (name-only when nothing else is known — never "your friend" before a record says so); express a _difference_ between them (a goal, a constraint) that a record supports; show a reason they are in the scene (the shared org/event).

**Prose must not**: assert a relationship label (friend/rival/partner) that no interaction has earned; invent a shared history; derive closeness from a single score (Constitution 29 — relationships are histories, not a friendship meter); make everyone the player meets become important.

**Choices**: engage / say little · find the common thing (the shared org/goal) · disagree openly · offer something · leave it. No option promises a durable relationship; the outcome is emergent from repeated interaction and compatibility/conflict.

**Consequence**: a `relationship interaction` record (with accuracy/confidence and the `witnessed` contract so the other person only knows what they saw); repetition + compatibility over time is what `narrativeThreads` later reads as a `companionship`/`kin`/`rivalry` thread. Possible outcomes span acquaintance → friend → mentor → contact → rival → romance → nothing durable — all derived, none declared up front.

**Needs new**: a meeting-new-people _generator_ (who the world puts in a scene, with their own motivations) and autonomous asymmetric trust/loyalty dynamics (`relationships.md:31`). Until then, relationships form only through authored interaction beats.

**Fixture sketch**: an adult in NE, `shares-a-home`, employed (a `WorkRelationship` → a colleague bindable via `episodeRoleBindings` role `colleague`), no prior interaction with that colleague. Deterministic from seed.

---

## How to use these

Before commissioning a bank for any of these domains, confirm the "Needs new" records exist and are provenanced; if they do not, the bank will be forced to invent world truth, which the whole architecture forbids. When the records exist, author against the **Fixture sketch** with `npm run corpus:narrative` extended to that domain, and review the strings in the packet by speakable id — the same loop this audit used for the shipped banks. These three are the highest-leverage probes; the same shape (Facts in / may / must not / choices / consequence / fixture) applies to campaigns, careers, staff, and crises when their turn comes.
