# The general trait system — exact build spec (CTO, Oct 7 2026)

Owner: traits go through the engine, never pre-written per decision. One general system. This file is the whole spec. Follow it literally. Where it names a file, a field or a number, use exactly that.

## 1. How decisions work today (read this first, do not change it)

- Every choice a person makes goes through `evaluateDecision(world, context)` in `src/simulation/decisions.ts`.
- `context.options` is a list of `{ key, label, description }` (`DecisionOption`, `src/simulation/types.ts` ~3618).
- `context.considerations` is a list of reasons. Each reason is `{ stableKey, optionKey, sourceType, direction: "supports" | "opposes", importance: "slight" | "moderate" | "strong" | "decisive", confidence, explanation, sourceRefs }`. The scorer adds them up per option and picks the best (`decision-scores.ts`). No dice.
- Traits reach decisions today through TWO hand-picked paths. Both name one decision and one option per trait:
  1. `registeredTraitConsiderations(world, registry, actorId, keyPrefix, decisionId, subjectId)` in `src/simulation/trait-readings.ts`. It reads the lean rows in `src/simulation/traits/effects/*.ts` (77 files, e.g. `facet-brooding.ts`: decision `contact.answer`, option `decline`, pole `high`). 13 call sites (press desk, campaign outreach, relationship contact…).
  2. The older `traitConsiderations(world, actorId, keyPrefix, leans)` in `src/simulation/people-traits.ts` (~629). Leans are written inline at each of its 26 call sites (family plan, favors, callbacks, life paths…).
- That is why every trait needs a new PR per decision. The new system replaces the hand-picking with two tables.

## 2. The new system in one paragraph

Every option of every decision is labeled with the KINDS OF ACT it is (confront, concede, take a risk…). Every trait says which kinds of act each of its poles pulls TOWARD and pushes AWAY from. One function, called once inside `evaluateDecision`, reads the deciding person's recorded traits and adds a "supports" reason to each option whose act kinds the trait pulls toward, and an "opposes" reason to each option it pushes away from. Any decision whose options carry act kinds is shaped by all 97 traits automatically; a new decision only needs its options labeled; a new trait only needs one row.

## 3. Files to create (exact names and shapes)

### 3a. `data/content/act-kinds.json` — the closed list of act kinds
```json
{
  "version": 1,
  "kinds": [
    { "id": "engage", "note": "move toward people or the matter" },
    { "id": "withdraw", "note": "step back, avoid, leave" },
    { "id": "confront", "note": "challenge, push back, attack" },
    { "id": "concede", "note": "give in, apologize, accept the other side" },
    { "id": "cooperate", "note": "work with others, join, help a shared effort" },
    { "id": "refuse", "note": "say no to a request or offer" },
    { "id": "take-risk", "note": "uncertain upside, real downside" },
    { "id": "play-safe", "note": "keep what is known and secure" },
    { "id": "self-interest", "note": "benefits the actor first" },
    { "id": "help-others", "note": "costs the actor, benefits someone else" },
    { "id": "follow-rules", "note": "by the book, keep a commitment" },
    { "id": "bend-rules", "note": "shortcut, break a norm or promise" },
    { "id": "speak-out", "note": "say it in public or out loud" },
    { "id": "stay-quiet", "note": "decline to comment, keep it private" },
    { "id": "commit", "note": "bind yourself to something for a long time" },
    { "id": "delay", "note": "put off, ask for time" },
    { "id": "trust", "note": "rely on the other person" },
    { "id": "distrust", "note": "check, doubt, protect against them" },
    { "id": "change", "note": "do something new or different" },
    { "id": "keep-same", "note": "continue as before" }
  ]
}
```
Exactly these 20. `note` is for developers only, never shown to a player. Adding a kind later needs a CTO line in Drive.

### 3b. `data/content/decision-option-acts.json` — act kinds on every option
```json
{
  "version": 1,
  "decisions": {
    "press.subject-response": {
      "dispute": ["confront", "speak-out"],
      "decline": ["stay-quiet", "withdraw"],
      "confirm": ["concede", "speak-out"]
    }
  }
}
```
- Key = the exact `decisionType` string the producer passes; inner key = the exact option `key`. Find them by searching `decisionType: "` in `src/simulation` and reading each producer's options list.
- 1 to 3 act kinds per option. Every option of a covered decision must be listed (a test checks it).
- Decisions whose option keys are not fixed (they are person ids, bill ids, candidate ids: e.g. `election.vote`, `appointment.choose-appointee`) are listed under `"unlabeled": ["election.vote", …]` with no options. Don't label them.
- Coverage order: FIRST the decisions that run in live play: `press.subject-response`, `press.reporter-request-response`, `career.consider-another-term`, the `election.consider-*` run/another-term decisions, `campaign.organizer-outreach`, `campaign.support-request`, `campaign.helper-request`, `people.contact-answer`, `people.couple-stage`, `people.couple-answer`, `people.date-answer`, `people.reach-out`, `people.job-offer-answer`, `people.ask-favor-back`, `labor.worker-quit`, `migration.leave-town`, `legislation.member-vote`, `justice.plea`, `justice.jury-vote`, `crime.report-to-police`, `party.consider-leaving`, `office.consider-resigning`. THEN every other decision type (104 total today), except `fixture*`, `item12:*` and test-only types.

### 3c. `data/content/trait-act-pulls.json` — what each trait pole pulls toward
```json
{
  "version": 1,
  "pulls": {
    "personality-v1:facet-hot-headed": {
      "high": { "toward": ["confront", "speak-out"], "away": ["concede", "delay"] },
      "low":  { "toward": ["delay", "stay-quiet"], "away": ["confront"] }
    }
  }
}
```
- One entry for EVERY trait in the personality registry (`src/simulation/personality-trait-registry.ts` and the trait pack); 97 today. A test checks none is missing.
- 1 to 3 kinds in `toward`, 0 to 2 in `away`, per pole. A one-sided trait (only a high pole in its definition) gets only `high`.
- Choose the kinds from the trait's own definition (its pole labels and meanings in the trait pack). Where a trait already has a lean file or a held PR, its pulls must reproduce that choice: the option that file supports must carry at least one `toward` kind of that trait and pole. Example: `facet-brooding.ts` supports `contact.answer → decline` at high, so brooding-high pulls toward `withdraw` or `refuse` and `decline` is labeled with it.

## 4. The engine (exact code)

### 4a. New file `src/simulation/traits/act-pulls.ts`
```ts
export function traitActConsiderations(
  world: World,
  registry: TraitRegistry,           // the same registry registeredTraitConsiderations uses
  actorPersonId: EntityId,
  keyPrefix: string,                 // pass context.stableKey
  decisionType: string,
  options: readonly DecisionOption[],
  skipTraits: ReadonlySet<string>,   // traits this decision already got from the old paths
): readonly DecisionConsideration[]
```
Steps, in order:
1. Look up `decisionType` in `decision-option-acts.json`. Not there or listed as unlabeled → return `[]`.
2. For each trait id in `trait-act-pulls.json`, sorted by id (stable order): skip it if it is in `skipTraits` or missing from `registry.traits`. Read the person's value with `readTrait(world, actorPersonId, trait)` from `trait-readings.ts`. `unrecorded` or value 0 → skip (no record means no reason, never a default).
3. Pole = `high` if value > 0, `low` if value < 0. No entry for that pole → skip.
4. For each option, in option-key order: if the option's act kinds share any kind with `toward`, add ONE consideration with `direction: "supports"`. If they share any kind with `away`, add ONE with `direction: "opposes"`. Never more than one of each per trait and option.
5. Each consideration:
   - `stableKey`: `${keyPrefix}:act:${traitId}:${option.key}:${direction}`
   - `optionKey`: `option.key`
   - `sourceType`: `"mind:personality"`
   - `importance`: copy `importanceOf` from `trait-readings.ts` (export it; don't duplicate it): top magnitude → `"moderate"`, else `"slight"`
   - `confidence`: `"medium"`
   - `explanation`: the reason KEY `${traitId}|${decisionType}|${option.key}|${pole}`, exactly the key format of #2968. The English engine composes the words from it. Never write a sentence here.
   - `sourceRefs`: `[{ kind: "personality-tendency", tendencyRecordId: reading.recordId }]`
6. Load both JSON files once at module load into `Map`s. No per-call file reads.

### 4b. One call inside `evaluateDecision` (decisions.ts), right after `let context = canonicalDecisionContext(contextInput);`
- Build `skipTraits` from `context.considerations`: every consideration whose `stableKey` contains `:trait:` gives the trait id between `:trait:` and the next `:`. This stops double counting while the old per-decision files still exist.
- If `context.traitActs !== "off"`, append `traitActConsiderations(…)` to `context.considerations`, then re-sort the same way `canonicalDecisionContext` sorts them.
- Add the optional field `traitActs?: "on" | "off"` to `DecisionContext` in `types.ts`, defaulting to `"on"`. Only tests and fixtures may pass `"off"`.
- The registry: use the same loaded registry the existing producers pass to `registeredTraitConsiderations` (find how press-interview-producers.ts gets it). Don't build a second registry.

## 5. Tests (all required, in `src/simulation/traits/act-pulls.test.ts`)
1. Schema: every kind in both tables exists in `act-kinds.json`; every trait in the registry has a pulls entry; every decision key in `decision-option-acts.json` lists every option its producer offers (build each covered producer's options in the test, or read them from a fixture world); no option has 0 or more than 3 kinds.
2. Reproduces the old files: for every lean row in `src/simulation/traits/effects/*.ts` and every inline `traitConsiderations` lean, the supported option carries a `toward` kind of that trait and pole. Print the misses; the test fails on any miss.
3. Proof: one seeded person in a random place (seeded generator, not one hard-coded state), trait value +2 vs −2 on the same person, three decision types (`press.subject-response`, `career.consider-another-term`, `campaign.organizer-outreach`): the selected option differs for at least one trait in each type, and the trace lists the act consideration.
4. No double count: a decision that already carries an old `:trait:X:` consideration gets no act consideration for X.
5. Over all 56 places: one seeded person per place, one live decision each, no throw, at least one act consideration when the person has any recorded trait.

## 6. Who does what (in this order)

1. PR 1, the engine (CTO helper, now): sections 3a, 3b for the live decisions listed first, 3c for all 97 traits, 4a, 4b, tests 1, 3, 4, 5. Test 2 runs with today's misses printed. It doesn't fail until step 3.
2. Session 13: label EVERY remaining decision type in `decision-option-acts.json` (section 3b, second half). One PR per 15 decisions, alphabetical.
3. Session 15: finish #2968 (reason keys; split its 28 clauses into an ENGLISH PR). Then convert the 26 inline `traitConsiderations` call sites: delete each inline lean array once test 2 shows its choice reproduced; delete `traitConsiderations` from people-traits.ts when the last caller is gone.
4. Session 16: delete covered per-decision lean files. For each file in `traits/effects/`: if test 2 shows every row reproduced, delete the file, regenerate the index (`npm run generate:trait-effects`), remove the trait from `NOT_YET_CONNECTED_TRAITS`. When test 2 has zero misses, make it fail on any miss.
5. The 15 held KEEP trait PRs (#2671 #3099 #3223 #3087 #3078 #3135 #3130 #3253 #3292 #3088 #3086 #2833 #2665 #2974 #2978): after PR 1 merges, the author (or Session 16) deletes the PR's effect-file and registry changes, keeps ONLY its seeded proof test, points the test at the table (the same person, the same decision, high vs low pole must differ), and fixes that trait's row in `trait-act-pulls.json` or the option's kinds if the proof fails. One PR per trait. Then gate, ready, READY in Drive.
6. Session 14: stop the local `session-14-trait-act-pulls` branch; PR 1 replaces it. If you already have pulls rows written, put them in a PATCH file in Drive 00k so the CTO can compare. Then take the next POOL row.

## 7. Rules that apply to every step
- No hand-written player text: `explanation` is a key, `note` is developer-only.
- No dice: a trait only adds reasons; the scorer picks.
- Data, not code: a new trait or decision is a JSON row, never a new .ts file.
- Every fix covers all 56 places through one path.
- Gate: prettier and eslint on changed files, vitest on the changed tests. Typecheck doesn't block.
