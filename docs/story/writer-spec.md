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

- **A line that leans on the one before needs `after`.** That includes any line opening on That, That's, It, It's, This, These, Those, So, And or "Not me". `src/english/outline-planner.test.ts` checks it.
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

## Checks before you post

```
OCD_STORAGE_OVERRIDE="cloud session, owner approved Oct 14" npm run -s words:rules
npx vitest run tests/guards/english tests/english-parts-banks.test.ts src/english/outline-planner.test.ts src/english/least-recent-wording.test.ts
KIND=inaugural node --import tsx scripts/sameness/gate.ts scripts/sameness/inputs/inaugural-six.jsonl
KIND=journal-evening node --import tsx scripts/sameness/gate.ts scripts/sameness/inputs/journal-evening-six.jsonl
SEEDS=aecea4,66265b,bd3806,2d2283,3c42e6,d8e52e node --import tsx scripts/words/first-evening-packet.ts > packet.md
```

- **`words:rules`:** your file adds no flagged line.
- **The tests:** all pass.
- **The gate:** part 2 prints the failing frames by slot, and `V=1` lists them. Your slots' counts must fall batch by batch.
  - The inputs hold the six packet worlds with drawn traits, so slots a world fact gates (a disaster, a good year) are overcounted.
  - A drawn-world input replaces them when the Story lead's run finishes.
- **The packet:** read your slot's lines as they play in all six places.

**The CTO's gate (7131781243),** over 20 drawn sixes:

1. The skeleton pair rate, greeting and oath held in place, is no higher than chance order.
2. No frame appears in more than 1 in 20 texts.
3. On average, at most one frame is shared within a six.

## What he passed and what he failed

- **Passed:** the "passing lines only" section of `docs/story/first-evening-pregrade-8.md` and `-9.md` on branch `story/first-evening-pregrade`.
- **Failed, with his reason and his likely words:** every row of those files.
- **His grades on older lines:** `data/english/grades/`.
- **His rulings:** `docs/coordination/OWNER-DECISIONS.md`.

## The lanes

### Call and charge: `data/english/parts/outline-call.json`

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

### Stand and close: `data/english/parts/outline-theme.json`

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

### Diary: `data/english/parts/outline-diary.json`

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

### Talk at home: `data/english/parts/outline-talk.json`

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

### News: `data/english/parts/outline-news.json`

A story's lede and body (`kind: "written"`).

- **Kinds:**
  - `news-address` and `news-address-headline` (the inaugural's story);
  - `news-roll-call` and `news-roll-call-headline` (a vote).
- **Their facts** are built in `src/bench/printed-words.ts` (the address builder and the rollCall builder):
  - for the address: `name`, `surname`, `date`, `about`, `president-for` / `president-against`, `quote`;
  - for a vote: `body`, `law`, `count`, `date`, `purpose`, `by-one`, `lone-vote`, `no-dissent`.
- **No headline repeats its lede.**
- **Then:** the story kinds the packet shows most (a business opens, break-ins, the jobless rate, a council vote). They're worded from `news.json` and `headlines.json` today and move onto the planner. The Story lead will add their kinds to `outlines.json` as you reach them.
