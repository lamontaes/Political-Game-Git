# Story writers: the spec (Nov 24, 2026)

The owner asked for more Story writers (the CTO, 7132980795). Five Sonnet writers write lines under the Story lead. This file is their brief, and the Story lead keeps it current.

## How a batch moves

1. **Your branch:** cut `story/w-<lane>` from `story/first-evening`, then write only in your own bank file (below). Merge `story/first-evening` into your branch before each batch.
2. **A batch is about 20 lines.** Before posting, run every check under "Checks" and fix what fails.
3. **Post on #9750** a line starting `Writer <lane>:` with:
   - your branch head;
   - the number of lines;
   - the gate's part 2 count for your slots, before and after;
   - six lines as they play in the packet.
4. **The pre-grader grades it.** The Story lead signs a batch that passes the pre-grade and lowers your slots' gate counts, then merges your branch into `story/first-evening` (#10390).
5. **Nothing goes to the owner until he passes it.** His ear is the gate.

## The rules every line follows

These are his rulings. Each one has failed a line in today's pre-grades.

- **American English, plain words.** Before writing, read `data/english/line-rules.json` (`npm run words:rules` lists every rule and what it flags).
  - "Look after" is British; write "check on".
  - No stock political phrases.
- **Every line of four or more words carries at least one slot** (`{about}`, `{term-left}`, …) from the facts its use requires. A line that's the same in every world is a stock line, and he cuts those.
- **No figures in speeches or talk** except what a slot carries. No numbers typed into a line.
- **Say only what the record holds.** None of these exist in the record:
  - a Bible, family on stage, or a grandmother;
  - doors knocked, or a tour of the flood.

  Write around them.

- **A line that leans on the one before needs `after`.** That includes any line opening on That, That's, It, It's, This, These, Those, So, And or "Not me". the outline planner's test (on story/first-evening until it merges) checks it.
- **Sources set shape only.** Real speeches and real people show what kinds of moves exist. Quote no more than 15 words, and never use a real person's words or name.
- **Shapes he has rejected, word for word:**
  - "Hold me to it";
  - "Call your member of Congress…";
  - "Today the work starts…";
  - "…and I mean to keep it that way";
  - "Paychecks have been outrunning prices", or any paycheck-against-prices line;
  - a belief, then "So I'm going to ask Congress to…" (his Nov 23 "shitty simulated sentence");
  - "Good afternoon, everybody";
  - "We got there together".
- **A law in force is kept or undone, never "passed".** Gate on `law-in-force` and `law-not-in-force`.
- **Different lines, different grammar.** The CTO's gate (below) counts sentence frames: the line with its content words removed. Two lines that differ only in nouns share a frame and count as one. Vary how sentences are built, not just what they name.

## The line format

A line goes in your bank's `parts` array, in the same shape as the lines already there:

```json
{
  "key": "outline-<lane>.<move>.<kind>-<slug-of-the-text-without-slots>",
  "move": "<move>",
  "kind": "spoken",
  "text": "… {slot} …",
  "uses": [
    {
      "subject": "<kind>",
      "role": "<move>",
      "tie": "law",
      "requiresFacts": ["slot", "gate-fact"],
      "excludesFacts": []
    }
  ],
  "after": ["<move it may follow>", "start"],
  "lean": ["personality-v1:facet-<facet>", "personality-v1:facet-<facet>"],
  "origin": "authored",
  "author": "the <lane> writer",
  "date": "2026-11-24"
}
```

- **`kind`:** `spoken` for speech and talk; `written` for the diary and the news.
- **`lean`:** two or three facets that pull a speaker toward the line. Use the facets already in your bank's lines.
- **`requiresFacts`:** every slot the text names, plus any fact that gates the line (a stance, a law in force, `told-theme`).
- **`after`:** leave it out unless the line leans on the one before.

## Elements: what each line draws on (the CTO, Nov 24, 7133845630)

The shared element bank is `docs/story/elements/<kind>/<id>.json` (kinds: moment, move, voice, situation, detail, consequence). Read it before you write; the 179 scene patterns are in it as situations (`pattern-<id>-<title>`).

- **A line cites its elements** in its own field, the ids of the element files it draws on:
  `"elements": ["pattern-a01-brushed-off-by-the-body", "speaker-who-asks-often"]`
  The id is the file's name without `.json`, unique across kinds. A line with no real element behind it says so by having none, and that is a line to look at twice.
- **A tag is a claim that the element stands behind the line** (the owner: "a line nothing real can stand behind is deleted, not reworded"). A moment, detail, situation or consequence element must back what the line says: its `realLife` holds the same kind of event or fact. A move or voice element must describe the very move this line makes in its slot (a report line is not tagged "opens on the occasion"). A tag matched by the line's kind alone is not a tie: leave the line untagged and look at it twice, rather than tag it loosely.
- **Something real you find** goes into the bank first, in an `elements:` PR to main (docs only, 25 or more files, merged by the CTO), so every writer can use it the same hour. Search the bank for a match before adding one; add your evidence to a match instead of a twin.
- **`usedBy`** stays as the element's author left it; nobody hand-edits it to list lines.
- **Sources are the real thing** (the CTO, 7134833236): an element's `sources` name the real speech, paper, record or archive with its URL (presidency.ucsb.edu, a state archive, the paper's own page). Our own research notes may be one extra line, never the only one.
- **Format before you push:** `npx prettier --write docs/story/elements`. An element PR that fails Prettier waits.
- **The owner's words hold in elements too:** never "ward" in a summary or moment (the place's own word from its record, or "a council member").
- **Open element and issues PRs ready for review, never as drafts** (the Coordinator, Nov 24): the watcher merges them when green, and it skips drafts.

## Issues: the game's laws decide what gets made (the CTO, Nov 24, 7140057819)

- **Every element names its issues** in `issues`: a list of the bill catalog's policy ids (`src/core2/data/legislature/bill-catalog.json`, for example `budget:highways` or `question:us-policy-positions:housing-land-use.rent-stabilization`), or `["none"]` for a moment no policy touches (a funeral, a birthday). `tests/guards/english/element-issues.test.ts` holds every id to the catalog.
- **A line can require a live policy:** the planner adds `policy:<catalog id>` to the facts for every policy the text cites (`withPolicyFacts`, the outline planner (on story/first-evening until it merges)) (a budget line as `policy:budget:<line>`, the catalog's own id), so a line with `"requiresFacts": ["policy:question:…"]` plays only where the world has put that policy in the text, and beats a general line there. A line may also name its policies in its own `issues` field; it is about a policy through its own `issues`, a required `policy:` fact or an element it cites.
- **Pick by gap, issue first:** `node --import tsx scripts/story/coverage.ts` writes `docs/story/coverage.md`, each policy by kind of text, elements/lines per cell. Take a policy with thin cells, find real moments about it, write elements with turns for both directions, then the lines.

## Checks before you post

```
OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" npm run -s words:rules
npx vitest run tests/guards/english tests/english-parts-banks.test.ts src/english/least-recent-wording.test.ts
KIND=inaugural node --import tsx scripts/sameness/gate.ts scripts/sameness/inputs/inaugural-six.jsonl
SIXES=10 KIND=inaugural node --import tsx scripts/sameness/gate.ts scripts/sameness/inputs/inaugural-drawn.jsonl
BANK=data/english/parts/<your bank>.json KIND=<kind> node --import tsx scripts/sameness/draw-count.ts scripts/sameness/inputs/<kind>-drawn.jsonl
KIND=journal-evening node --import tsx scripts/sameness/gate.ts scripts/sameness/inputs/journal-evening-six.jsonl
SEEDS=aecea4,66265b,bd3806,2d2283,3c42e6,d8e52e node --import tsx scripts/words/first-evening-packet.ts > packet.md
```

- **`words:rules`:** your file adds no flagged line.
- **The tests:** all pass.
- **The gate:** part 2 prints the failing frames by slot, and `V=1` lists them. Your slots' counts must fall batch by batch.
  - The inputs hold the six packet worlds with drawn traits, so slots a world fact gates (a disaster, a good year) are overcounted.
  - `inaugural-drawn.jsonl` holds 60 drawn lives, one each; `SIXES=10` reads each once. That is the count the hourly report gives. The Journal's and the talk's drawn inputs follow as `<kind>-drawn.jsonl`.
- **The draw count** (the sameness draw count (on story/first-evening until it merges), W1's method, #9750 7134029654): lists, by move, every line of your bank that no telling picked over the inputs under 60 trait draws. A line gated on a fact no input world holds is not dead. A line whose facts the worlds hold and that never plays is: usually a slot the row's `budgets` let into one sentence only (`term-left`, `theme-name`, `theme-short`, `the-disaster` in an address), already said by the move before. Rewrite or delete it; a dead line is not depth. Give each fact set 20 or more live lines.
- **The packet:** read your slot's lines as they play in all six places.

**The CTO's gate (7131781243),** over 20 drawn sixes:

1. The skeleton pair rate, greeting and oath held in place, is no higher than chance order.
2. No frame appears in more than 1 in 20 texts.
3. On average, at most one frame is shared within a six.

## What he passed and what he failed

- **Passed:** the "passing lines only" section of the pre-grader's reads 8 and 9, kept on branch `story/first-evening-pregrade` (not on this branch).
- **Failed, with his reason and his likely words:** every row of those files.
- **His grades on older lines:** `data/english/grades/`.
- **His rulings:** `docs/coordination/OWNER-DECISIONS.md`.

## The lanes

### Call and charge: the outline-call bank (on story/first-evening until it merges)

- **`charge`:** the line after the oath or election opener that names what the speech is about (`after: ["oath", "hired"]`). It requires `theme-name` and `about`. Example of the slot: "what work pays".
- **`call`:** what the President asks of the people, in the call section (shapes `call-alone`, `address-run`).
  - Any call that names the stand (`{about}`) also requires `told-theme`, so it comes after the stand.
- **Facts:**
  - `term-left` ("four years");
  - `theme-name`, `theme-short` ("pay"; one mention per address);
  - `about` ("a higher federal minimum wage");
  - `the-vice-president` ("Vice President Lisa McKenzie");
  - `run-span`;
  - the run flags: `run-hard`, `run-good`, `run-jobs-lost`, `run-prices-ahead`, `run-pay-ahead`.
- **Target:** 40 calls and 30 charges, no two sharing a frame. Now: 25 calls, 18 charges.

### Stand and close: the outline-theme bank (on story/first-evening until it merges)

- **The stand's moves:**

  | Move           | Requires                                     | Follows                             |
  | -------------- | -------------------------------------------- | ----------------------------------- |
  | `creed`        | `belief`                                     |                                     |
  | `pledge`       | stance and law                               | creed                               |
  | `today`        | `{today}` / `{today-clause}`, passed through |                                     |
  | `stand`        | stance and law                               | today, contrast                     |
  | `contrast`     | `other-side`                                 |                                     |
  | `question`     | `to` or `law-name`                           |                                     |
  | `answer`       | belief and stance                            | question                            |
  | `stand-reason` | stance, belief and law                       |                                     |
  | `value`        | `theme-short`                                | pledge, stand, answer, stand-reason |

- **The close:** `send-off` (`term-left`) and `blessing` (short; no slot needed).
- **Gate facts:**
  - stance: `stance-for` / `stance-against`;
  - law: `law-in-force` / `law-not-in-force`.
- **Other facts:** `about`, `to`, `law-name`, `belief`, `belief-sentence`, `other-side`, `theme-short`, `term-left`.
- **The second point:** the address's `second` section says these same moves on a second point's facts, so write them to work for any subject.
- **Then:** the governor's and mayor's addresses. They aren't on the planner yet; the Story lead will add their spec.
- **Target:** 20 or more lines per move that's said in most addresses (`value`, `send-off`, `creed`, `pledge`, `stand`, `stand-reason`).

### Diary: the outline-diary bank (on story/first-evening until it merges)

The Journal's entry for the first evening, written in the first person and in the past tense (`kind: "written"`).

- **Moves:**

  | Move      | Requires                                                                                                        | Follows               |
  | --------- | --------------------------------------------------------------------------------------------------------------- | --------------------- |
  | `watched` | `we` / `us` / `watched-many` / `alone`, and `president-name`                                                    |                       |
  | `stance`  | `about` and `president-for` / `president-against` (with `law-in-force`: "means to keep", "wants to get rid of") | start, watched, said  |
  | `said`    | `theme-name`                                                                                                    | watched, said, stance |
  | `mine`    | `stand-with` / `stand-against` / `stand-unsure`, and `theme-short` or `about`                                   | said, stance          |
  | `ahead`   | `place`                                                                                                         |                       |

- **Your side:** the player's side is written only where they gave it at the table. The `mine` lines are the point of the entry.
- **Then:** a week as a paragraph. The Story lead will add its spec.
- **Target:** 20 or more per move, no two sharing a frame. Now: 2 to 7 per move.

### Talk at home: the outline-talk bank (on story/first-evening until it merges)

The housemate's word on the address, and the player's replies.

- **Moves** (kind `talk-address-point`): `lead`, `heard`, `verdict`, `verdict-cold`, `why`, `why-first`, `verdict-after`, `ask`.
- **Facts:**
  - `president`, `president-object`;
  - `about`, `said`, `to`, `against`, `decider`, `place`, `employer`;
  - `president-for` / `president-against`, `law-in-force`;
  - `stand-with` / `stand-against` / `stand-unsure`;
  - `point-heard`;
  - the reason facts `why-work`, `why-seeking`, `why-money`, `why-view` and `why-town-*`.
- **The reason follows the speaker's side:** `why-view` lines require `stand-with` or `stand-against`.
- **The player's replies** to the housemate's own view are in `data/english/parts/conversation.json` (`own-view-answer-*`).
  - Every reply set must hold two or more replies. The "changed my mind" pair landed in 76d4b89.
  - Write replies there in your branch; only you touch that file.
- **Target:** 20 or more per lead and verdict move. Every reply set has two or more replies.

### News: the outline-news bank (on story/first-evening until it merges)

A story's lede and body (`kind: "written"`).

- **Kinds:**
  - `news-address` and `news-address-headline` (the inaugural's story);
  - `news-roll-call` and `news-roll-call-headline` (a vote).
- **Their facts** are built in `src/bench/printed-words.ts` (the address builder and the rollCall builder):
  - for the address: `name`, `surname`, `date`, `about`, `president-for` / `president-against`, `quote`;
  - for a vote: `body`, `law`, `count`, `date`, `purpose`, `by-one`, `lone-vote`, `no-dissent`.
- **No headline repeats its lede.**
- **Then:** the story kinds the packet shows most (a business opens, break-ins, the jobless rate, a council vote). They're worded from `news.json` and `headlines.json` today and move onto the planner. The Story lead will add their kinds to `outlines.json` as you reach them.

## Scenes: one engine, depth in what plays (the CTO, Nov 24, 13:51Z: "Depth, not breadth")

The count of types that compose is dropped, and a type with no lines waits. Deepen the types that play now. Every scene type composes through the one scene engine (`src/director/scene-talk.ts`). Its dialogue lines are in `data/english/parts/scene-talk.json`, filed by `uses[].purpose`, which is not the type's name: a type's `purpose` is in `src/director/data/situation-types.json` (door-ask is `ask-support`, volunteer-offer is `offer-help`, first-day is `first-day-ropes`); the narration that opens a scene is in `data/english/parts/scene-words.json`. Each type follows its real-lives pattern (skill `scenes-from-life`, `docs/story/scene-patterns.md` and `scene-pattern-map.md`).

- **What each type lacks:** Fixer A's table (#9750, 7129729484) lists, for every type, whether it composed, skipped or was never reached, its narration / asks / replies counts, and what is missing. The baseline is 9 of 89 composing.
- **A part file per new writer.** The owner's grades and the judged files hold the existing lines by key, so `scene-talk.json` itself is not split. A writer starting a new area (the two Codex writers: `scene-talk-office.json` for holding office and the executives, `scene-talk-seats.json` for seats, the off year and industries) gets a part file of the same shape, read by the engine as one bank with it; the Story lead makes it with your first batch, so post that batch as a list of lines on your branch and ask. In `scene-talk.json`, keep to your own region. Insert each new line directly after the last existing line of the same purpose, never at the end of the file, and never reorder. Your types sit in their own regions, so branches merge cleanly. A line you delete: name its key in your batch post.
- **Narration lines** for a type go in `scene-words.json` the same way, after the existing lines of the same `subject`.
- **A type composes** when it has narration, an opening ask that its facts can word, and two or more replies that fit (`scene-talk.ts`). That is the hourly count.
- **Checks:** `npm run words:rules`, `npx vitest run tests/guards/english tests/english-parts-banks.test.ts src/english/reply-pairs.test.ts src/director/scene-talk.test.ts`, and the type forced in dev mode (`src/bench/dev-views/scene-force-map.json`) where it can be.

| Writer                                              | Scene types                                                                                                                                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Home and family                                     | `accusation`, `advice`, `apology`, `argument`, `arrival`, `becoming-friends`, `betrayal`, `breakup`, `care`, `celebration`, `date`, `diploma-home`, `family-absence`, `family-loss`, `funeral`, `gathering-missing`, `home-damaged`, `letter`, `move-in`, `moving-goodbye`, `new-baby`, `news-arrives`, `no-diploma-home`, `notice-home`, `prison-visit`, `proposal`, `reconciliation`, `rescue`, `return`, `warning` |
| Before and around (work, school, church, community) | `action-confront`, `cause-invite`, `first-day`, `first-meeting`, `job-offer`, `last-day`, `layoff`, `reach-out`                                                                                                                                                                                                                                                                                                       |
| Campaigning                                         | `debate-invite`, `debate-sitting`, `donor-ask`, `door-ask`, `door-signature`, `endorsement-ask`, `family-filing`, `filing`, `manager-offer`, `party-recruit`, `party-welcome`, `petition-short`, `polling-place`, `rally-opponent`, `rally-word`, `rival-word`, `serve-sought`, `town-hall-question`, `volunteer-offer`, `vote-sought`                                                                                |
| Office and government                               | `appointment`, `bill-carry`, `bill-held-chair`, `bill-sign-on`, `bribe-offer`, `bribe-pressed`, `budget-cut`, `constituent-stop`, `desk-visit`, `emergency-briefing`, `floor-debate`, `hearing-witness`, `hold-chair-sought`, `lobby-remembers`, `office-doubt`, `office-hours`, `recall`, `section-bargain`, `study-formed`, `study-reported`, `swearing-in`, `vote-asked`, `vote-confirmed`                         |
| The news and the press                              | `interview-invite`, `interview-sitting`, `press-interview`, `scandal`                                                                                                                                                                                                                                                                                                                                                 |
| Speeches, local and campaign                        | `address`, `race-lost`, `race-won`, `speech-afterward`                                                                                                                                                                                                                                                                                                                                                                |

The Journal writer and the national speeches writer have no scene types; their systems are the Journal and the outline kinds above.
