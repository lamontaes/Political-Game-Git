# The director as a board: cards, strings and a few picks

Design for the Story lead, Nov 16, 2026. Read only; no code was run. Line numbers are from the checkout of this date.

## What the owner asked, in one paragraph

Read the whole set of scenes that could happen to this player, cut it by who they are and what the records say, pick a few (Nov 15, 3:39 PM). Yes-or-no facts gate; amounts weight (rule 152). A no takes that scene out and may set up another, never announced (rule 149). A scene is eligible only through a full path of its wordings (rule 150). Dev mode traces and forces every scene (Nov 15, 11:21 PM). Each scene is a card on strings to its records (CTO, Nov 16). The play-first law already says: "the director reads the records, picks from everything the simulation supports the scenes that apply to this person now, and fires one" (docs/play-first/LAW.md line 46).

## What exists today, and where it falls short

The director already has most of the parts. It has no single place that sees them all at once.

- **Two entry paths, each deciding alone.** `scheduleMoment` (src/director/scheduling.ts:909) takes one moment and loops over every type and cause (line 936) to bind the types that match. It decides that moment's outcome alone (interrupts line 1248, `paceRank` line 373, season cap line 1131), once per moment (src/director/ledger.ts:1495). Separately, `produceCircumstances` (ledger.ts:1583) runs `circumstancePicks` (src/director/circumstance.ts:620) over the day's queued records and keeps one pick (ledger.ts:1696). Neither sees the other.
- **Two condition systems that cannot see office kind or level.** `ReceiveRule` with `seat: any | serving` (scheduling.ts:113, read by `receives` at 130 and `serving` at 150) and `playerHolds` (circumstance.ts:354, with `standingOf` at 206) on circumstance rows.
- **The one weighting grammar is in the right place.** `chooseVariant` (src/director/arc-variant.ts:750) does the owner's mix inside a family: `variantOpen` (line 715) gates on facts; variants score `base + weight x read` (`readOf`, line 438) times the asker's pull (`pullOf`, line 401). No roll.
- **A no is already a record.** `replyInScene` (src/director/purpose-scene.ts:3450) writes a `scene.reply` event (line 3538) with `typeKey`, `causeId`, `move`, `ending` and `keeps`. `passedBetween` (src/director/relation-facts.ts:62) reads it back as `refusedBefore`, but it scans every `scene.reply` in the log on each call (line 72). The legislature keeps its own `declinedAsks` (src/core2/modules/legislature.ts:4069). The candidacy engine reads a no to a party ask (`answerPartyAsk`, item `elections-party-asks-next-member-after-player-declines`, merged).
- **The wordings gate runs after the decision.** `speaks` (ledger.ts:1795) and `saysPastOpener` close a scene at registration (ledger.ts:1851, 1970), after its outcome was chosen and its slot taken.
- **A string index exists in miniature.** `rowsByKind` (circumstance.ts:136) maps record kind to circumstance rows; promises keep `promisesBySettle` (src/director/promises.ts:362). The board generalizes this pattern.

## 1. The smallest change: one pick per day over all candidates

Split `scheduleMoment` in two and add one function.

- **`bindMoment`** (the top of today's `scheduleMoment`, lines 909 to 980) returns a moment's bound cards (`found`, `staged`) with cause and cast, and decides no outcome.
- **`pickFromBoard(core, book, standing, candidates)`**, in a new `src/director/board.ts`, runs once per controlled person at the end of `onAfterDay` over today's bound cards, every circumstance pick (not only the first) and the scenes still waiting:
  1. **Gates.** Drop a card whose `holds` misses the standing, whose `requires` fact is missing or `excludes` fact present, or that a no took out (section 3). Each drop keeps its first failed gate.
  2. **Wordings.** Drop a card with no full path of wordings: `speaks` and `saysPastOpener` move here, before the pick.
  3. **Weights.** Score the rest with the arc-variant grammar (`base + weight x read`, times the asker's pull), with `readOf` and `pullOf` exported so scoring stays in one place.
  4. **Picks a few.** The record stop rules stay (own record, household, a tie met today, `stopsDay`) and stop the day whatever the score. The rest fill the life's room by score: `paceOf` (scheduling.ts:353) over the trailing year, counted in picks made. Ties break by type key, then cause id.
- **What it writes.** A new `board` field on the existing `ScheduleEntry`: candidates, each cut reason, reads, scores and picks, in the one ledger dev mode reads.

**Where "what the player is doing and can do" comes from.** `playerStanding` in a new `src/director/standing.ts` (as `director-scene-tags-from-player-standing` specifies) reads only records: terms serving with body level and branch (offices `terms.byPerson`, bodies.json, the executives list); filings in open contests (elections `filings.byPerson`); the campaign; the job (`person.jobId`); party and group memberships (interest-groups); household yes-or-no facts (`familyFactsOf`); open decisions owed (`openDecision` scenes, office-day's desk stops). It is recomputed only on the day one of those records changes (section 4) and kept on the ledger book.

**Deleted:** the season cap and `seasonCap` data (once `director-cap-on-scene-repeats`, PR #8424, lands its record rule); the interrupt and outcome block in `scheduleMoment` (lines 1131 to 1290, moved, not copied); the weekly spacing and single `picks.find` in `produceCircumstances` (ledger.ts:1650 to 1700); `standingOf`, `playerHolds`, `serving` and `ReceiveRule.seat`.

## 2. The card: one situation-type row, with four more fields

A card stays one row in src/director/data/situation-types.json. It keeps `causes` (its first strings) and every field it has now. It gains four fields:

- **`holds`** (any one passes): `"none"`, `"filed"`, `"working"`, `"office"`, `"office:lawmaking"`, `"office:executive"`, each with an optional level (`":local"`, `":state"` or `":federal"`). This replaces `receive.seat` and the circumstance `player` words. This is rule 145.
- **`requires` and `excludes`**: named yes-or-no facts. They come from the standing, the household, ties (`tie:friend`, `tie:mentor`), laws in force by series (`law:<series>`), and endings of earlier scenes (`ended:<typeKey>:<ending>`, with the same counterpart unless the fact says `any`). These are the only gates. A number never appears here. This is rule 152.
- **`weights`**: terms in the arc-variant grammar: `{read, weight, low?}`. The read names a read kind in arc-variants.json `reads` (a trait, money strain, closeness, a history count, a record number). This is where "a rich parent" and "a personality trait" go: they move the score, never the gate.
- **`endings`**: nothing new. A card's endings are its purpose's endings in purpose-arcs.json, each already classed resolved or refused by `close`. They are what later cards' `ended:` strings read.

Strings live only on the card that needs them; the board inverts them for dev mode, so nothing is stored twice.

**Worked example: coffee with a friend.** This builds on `director-catch-up-after-a-public-event` (open). That item already designs the type, the `news.read` circumstance and the three facts.

```json
{
  "key": "catch-up",
  "purpose": "catch-up",
  "holds": ["none", "filed", "working", "office"],
  "requires": ["tie:friend-apart"],
  "weights": [
    { "read": "closeness", "weight": 0.6 },
    { "read": "asker-sociability", "weight": 0.2 }
  ],
  "causes": [{ "match": { "label": "circumstance:catch-up" } }],
  "setting": ["public"],
  "timing": "next-together"
}
```

The family `catch-up` in arc-variants.json holds three variants. Each is gated by a fact, because a scene is eligible through its wordings (rule 150):

- **`weighing-a-run`**: requires `friend-run-decision-open`, the candidacy engine's open decision in a contest still open.
- **`rally-on-the-way`**: requires `public-action-here-today`.
- **`brings-you-to-the-party`**: requires `friend-party-local-member` and excludes `party-member`.

If none holds, the card has no full wordings path and is cut. That means no chit-chat (rule 147).

The strings out of it:

- **Aaron is weighing a run.** A yes (`ended:catch-up:backed-run`) joins the friend's run decision as a reason, which the item names. If Aaron files, the existing `volunteer-offer` and `manager-offer` cards gain `requires: ["ended:catch-up:backed-run"]` on an alternative cause, so the friend asks the player to help. A no (`ended:catch-up:talked-down`) weights his decision the other way. If he files anyway, a new `ran-anyway` row in the `family-filing` family plays ("You said I shouldn't").
- **A protest on the way.** The protest is a card already: `action-confront`, `rally-word` and `cause-invite`, caused by the public-action record. The coffee's setting placed the player downtown that day, so the board sees both cards live the same day and plays them in `before` order. That makes the protest a step inside the event under way (rule 131).
- **A committee person.** The `party-welcome` and `party-recruit` cards, cast with `partyMentorOf` (circumstance.ts:447). A no to the party (`ended:party-recruit:not-now`) excludes `party-recruit` from that party for the season. It also raises `cause-invite`'s weight through a `declined-party` read. That is the nudge: a different door, not the same ask.

**Worked example: swearing-in.**

```json
{
  "key": "swearing-in",
  "holds": ["office"],
  "stopsDay": true,
  "causes": [{ "match": { "label": "event:took-office", "selfNamed": true } }]
}
```

The card stays one row for every level. The office's own words come from swearing-in.json. Context ("Jose Salgado, the ranking member of the finance committee") is the narrator's job in `director-narrator-says-who-a-person-is` (PR #9581). The board does not add it.

The oath's ending writes the term. The term changes the standing, which pulls the strings of every card tagged by office:

- `office:lawmaking:state` cards: a caucus whip's first ask (`vote-asked`), the committee chair's hold (`hold-chair-sought`);
- `office:executive` cards: `desk-visit`, `emergency-briefing`, `appointment`;
- `office` cards at any level: `office-hours`, `press-interview`.

On the same day, cards tagged `none` leave the board, such as the neighbor's case for a law in `director-case-for-a-law-not-yet-written`, which re-tags to the player's level.

## 3. A no as a record, read as a string

**Where it is kept.** The `scene.reply` event (purpose-scene.ts:3538) is the record. Its `ending` and `move` say yes or no. Promises (promises.ts) keep what a yes owes. Engines keep their own nos where they decide: `declinedAsks` for sign-on, the party ask, press `refuse`. The board adds no table.

**How a later card reads it.** The ledger keeps one index, `repliesByPlayer: Map<personId, Map<"typeKey|ending", {counterpartId, recordId}[]>>`. It is filled in `onEvent` for `scene.reply` only, the same way `promisesBySettle` is filled. The standing's facts include `ended:<typeKey>:<ending>` from it. `passedBetween` reads the same index, and its scan of the log (relation-facts.ts:72) is deleted.

**A no takes that scene out.** The default excludes the card for the same counterpart and subject. For a repeat with something new on record, the rule is `director-cap-on-scene-repeats` (PR #8424). For the third ask after two noes, it is `director-two-noes-no-third-ask`. The board calls both rules and does not copy them.

**Nudge, never explicit.** The board never words a string: a no is said later only by a bank line that `requiresFacts` it, from someone who was there ("Ask why"). A no mostly moves weights. Nothing outside dev mode lists cards or strings, and the journal tells what happened, never what was avoided.

## 4. Strings: the index

**At load.** `cardsByString: Map<string, typeKey[]>` is built once from the library:

- each cause's `match.label`, `labelPrefix` and `causeKind`;
- each circumstance row's `recordKinds`, already done by `rowsByKind`, which this absorbs;
- each `holds` word;
- each `requires` and `excludes` fact family (`ended:`, `law:`, `tie:`, `party-member`).

**When it is checked: the day a record changes, for the controlled player only.**

`onEvent` notes the keys an event touches (its kind, a reply's `ended:` key, a law's series, a took-office, filing, hire or party join as a standing change); `onRelationshipChange` notes `tie:` keys. In `onAfterDay` the board takes the cards on today's touched strings plus those still waiting (bounded by `openUntil`), and recomputes the standing only if a standing string was touched.

**What it replaces.** `bindMoment` looks up cards by label and cause kind instead of looping over all 89 types (scheduling.ts:936), which matters at 400. Daily cost is strings touched times cards on each, never the bank or history (speed rule, OWNER-DECISIONS Oct 30 01:55).

## 5. Dev mode: the board view

The board view is built on src/bench/dev-views/scene-trace.ts and the ledger's `board` field, with no second tracer.

- **What `dev-mode-shows-the-directors-day` already covers** (open). One day's schedule entries for a person (cause record, outcome, held and closed reasons) via `GET dev/director/day` and the trace box. The board adds columns to that view: candidates, first failed gate, reads, scores, picks.
- **A new `board` section in scene-trace.** It shows three things for the current player:
  - **Live cards.** Each card with the strings that hold it now, each string a record id that opens in the trace box. Cut cards appear with their first failed gate.
  - **What a choice would pull.** For each ending of the scene open now, the `ended:` fact it writes and the cards that require or exclude it, from the inverted index.
  - **Why the lines were chosen.** The `chooseVariant` scores and read record ids.
- **Force.** `POST scene-trace/force` (line 210) and `DevMode.forceScene` stay the one way to make a scene play; "force past its gates" writes the existing `scene-forced` mark, so it never counts as played.

## 6. Build plan

The pool items named here already exist unless marked new.

1. **`dev-mode-shows-the-directors-day`** (Sonnet, 4 hours, waits on nothing). The day view of schedule entries. This is the first PR and lands in a day. Proof: dev mode at a drawn place shows a held scene and its reason.
2. **`offices-executives-one-list`**, then **`director-scene-tags-from-player-standing`** (Sonnet, 5 hours). Adds `standing.ts` and `holds`, and deletes `seat`, `standingOf`, `playerHolds` and `serving`. Leave its last sentence (the wordings-path check) to PR 4. Proof: a state legislator sees a `office:lawmaking:state` card and a council member does not, in the day view.
3. **New: `director-board-string-index`** (Sonnet, 4 hours). Adds `cardsByString` and the index lookup in `bindMoment`, absorbs `rowsByKind`, and adds the `repliesByPlayer` index with `passedBetween` reading it (its scan deleted). Behavior is unchanged: the same scenes with the same casts on one drawn place and seed, and `npm run speed:year` no slower.
4. **New: `director-board-picks-a-few`** (Opus, high, 8 hours). This is the "candidate-pick item" that `dev-mode-shows-the-directors-day` names but nobody filed. It adds `board.ts` and `pickFromBoard`, and splits `scheduleMoment`. It moves the wordings check before the pick. It merges the circumstance single pick into the board. It deletes the outcome block, the season cap (after #8424) and the weekly spacing. Proof: the day view shows candidates, cuts and scores, and a year of play stays under two minutes.
5. **New: `director-cards-require-and-weigh`** (Opus, medium, 6 hours). Adds `requires`, `excludes` and `weights` on rows, with `readOf` and `pullOf` exported and shared. Adds the `ended:` facts from the reply index. Folds in **`director-two-noes-no-third-ask`** as the board's default exclusion. Proof: dev mode forces a party ask, the player says no, and the board view shows `party-recruit` cut and `cause-invite` weighted up, by record id.
6. **`director-catch-up-after-a-public-event`** and **`director-case-for-a-law-not-yet-written`** (Sonnet each, after PR 5). These are the first content written for the board. Lines come from the Story session (data/english/parts). Proof: the coffee chain plays at a drawn place, and the board shows the strings it pulled.
7. **New: `dev-mode-board-view`** (Sonnet, 4 hours). Adds the board section in scene-trace: live cards, strings, what a choice would pull, variant scores, and force past gates. Proof: a screenshot of the board beside the owner's "Pepe Silvia" words.

Relied on, not duplicated: `director-cap-on-scene-repeats` (#8424), `director-no-scene-without-a-purpose`, `director-narrator-says-who-a-person-is` (#9581), `words-hostile-call-after-a-declined-interview`.

## 7. Open questions for the owner

None. Picking a few, the gate and weight mix, the no and the nudge, tags, dev mode and the board are decided (above). The pace is owner-adjustable calibration ("grounded pace", DECISION-REGISTER line 384), so the day's room is TUNABLE. The president's-child gate waits until after early access, in the owner's words.

Reading line: searched docs/coordination/OWNER-DECISIONS.md (director, nudge, conditional, tag, pick, said no, board), docs/coordination/DECISION-REGISTER.md (director, nudge, pace, staging rule), docs/coordination/prior-rulings/owner-words-2026-11-13-to-16.md (nudge, tag, conditional), docs/play-first/LAW.md (director, scene), docs/design/story-director.md and docs/design/director-on-core2.md, and docs/pool/items (director-*, scene tags, conditional, declined, nudge, candidate-pick, staging rule). The owner's Drive was not searched from this session.
