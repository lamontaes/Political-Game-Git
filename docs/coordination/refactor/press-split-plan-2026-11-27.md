# The press split, drawn from the code (World, Nov 27, 2026)

World item 4 (WO1): `src/core2/modules/press.ts` is 5,295 lines. The CTO's map drew the split by file and function names and said to read the press before planning it. This is that read. **Nothing is moved here**; the move waits for the Story split's engine half (press.ts is touched there) and for #10701 and People's #10700 (press-desk.ts).

**Re-run:** `node --import tsx scripts/world/file-clusters.ts src/core2/modules/press.ts --roots <roots.json>` (read-only; the roots file is below). The script parses the file with the TypeScript compiler, takes each top-level declaration and the other top-level declarations it names, and prints the groups that depend on each other, the state kept at module level and what runs when the file loads.

## What the read found

- **187 top-level declarations, and no group of declarations depends on each other in a ring.** The call graph inside press.ts is a DAG, so a split by concern can be made with no import cycle if each file only imports downward.
- **A split drawn by line ranges from names has cycles** (module and open, audience and market, briefs and market and desk, interviews and speakers and stories, and more: 11 two-way pairs). A pure move by the map's names would have made them. The split below is drawn from entry points instead.
- **State kept at module level:** six caches (`followCache`, `habitScores`, `adultsCache`, `countsCache`, `countedCache`, and the `ENDORSING_KINDS` set), no module-level `let`. A cache must move with its readers and stay one instance: `followCache` is read by `openPress`, `followersOf`, `setFollow` and `attackOutlet`, so it belongs in the shared base.
- **What runs when the file loads:** `ALL_KINDS` and `PRESS_MODULE` only. `PRESS_MODULE` names the handlers, so it stays in press.ts, which re-exports the others and stays the one door (`import ... from "./modules/press"`).
- **press-desk.ts, press-money.ts, press-topics.ts, press-staff.ts and press-conflict.ts do not import press.ts**; press.ts hands them what they read (`deskContext`, `outletMoneyDeps`). New parts keep that direction: parts import the base, never press.ts.
- **Long functions (named steps, WO1's second half):** `openPress` 270 lines, `pressWeek` 188, `publish` 171, `interviewQuestions` 154, `letters` 131, `milestones` 114, `weighTip` 113.

## The split the code gives

Roots (entry points each part starts from), in `scripts/world/press-roots.json`. A declaration only one part reaches goes to that part; one two parts reach goes to the base; another part's root that a part calls is an edge, not a member.

| Part                  | Declarations | Lines | What it holds                                                                                                                                             |
| --------------------- | -----------: | ----: | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| base                  |           89 | 1,324 | types and tables, parameters, the market and money readers, audience and followers, speakers and who is newsworthy                                        |
| briefs                |           18 |   503 | milestones, letters, the police log, school results                                                                                                       |
| open                  |            5 |   482 | `openPress` and enrolling its employers                                                                                                                   |
| exposure              |           11 |   414 | tips, weighing them, conflict beats, leaks, profiles                                                                                                      |
| week                  |           13 |   367 | `pressWeek` and what only it uses                                                                                                                         |
| interviews            |           20 |   365 | requests, answers, invitations, comments                                                                                                                  |
| stories               |            6 |   304 | `publish`, claim checks, the archive story                                                                                                                |
| staff                 |            7 |   154 | staff refresh, shared markets, outlet revenue                                                                                                             |
| desk                  |            6 |   120 | `deskContext`                                                                                                                                             |
| unreached by any root |           12 |   216 | exported readers (`outletTelling`, `closedNewspapers`, `setFollow`, `standsOnRecord`, `exposedFinding` and others): each goes to the part whose job it is |

**Edges between parts** (all one way, no two-way pair): week to briefs, desk, exposure, interviews, staff and stories; open to briefs, exposure, interviews, stories and week; exposure to desk and stories; briefs to desk and stories; interviews to stories; stories to desk. So the files import in the order desk, stories, interviews, then briefs and exposure, then staff, week and open, with the base under all of them.

**The base is the next job.** 1,324 lines is still large. A second pass of the same script over the base (types and tables, the market and money readers, audience and followers, speakers) gives its own files; the same rule applies.

## How the move is made and checked (for item 4, when it opens)

1. A re-runnable script moves each declaration to its part's file with the imports it needs and leaves press.ts exporting the same names. Structure only: no body changes.
2. Acceptance, both from the speed-work skill and the CTO's rules: `npm run typecheck` clean; the records proof digest at one drawn place and seed, one year, on the train head and on the branch, equal (`npm run speed:year -- --place <key> --years 1 --proof-out`, then `compareProofs`); `tests/guards/families.test.ts`; the press tests (`press*.test.ts`, `news*.test.ts`). The cycle guard Reach-ins cited is not on train/nov27-a; if #10701 brings it, it runs too.
3. Each new file is added to the news family in `tests/guards/families.json` and to CODEOWNERS (`node --import tsx scripts/guards/codeowners.ts`).
4. The press-desk.ts file stays out until #10701 and #10700 are in the train.

## Roots file

```json
{
  "week": ["pressWeek"],
  "open": ["openPress", "enrollPressEmployers"],
  "exposure": [
    "runExposure",
    "tipOff",
    "conflictBeat",
    "leakToReporter",
    "weighTip",
    "writeProfile"
  ],
  "briefs": [
    "milestones",
    "letters",
    "policeLog",
    "schoolResults",
    "policeLogComparison",
    "policeLogWhy"
  ],
  "interviews": [
    "requestInterview",
    "answerInterview",
    "interviewsFor",
    "declineInterview",
    "attackOutlet",
    "inviteDay",
    "invitation",
    "answerInvitation",
    "keepComment",
    "reportConcession",
    "accepted",
    "refuse",
    "snubbed"
  ],
  "stories": [
    "publish",
    "checkClaim",
    "writeArchiveStory",
    "printedStoryOf",
    "storiesPrinted"
  ],
  "staff": [
    "refreshPressStaff",
    "reassessSharedMarkets",
    "reviewOutletRevenue",
    "pressPeopleLive"
  ],
  "desk": ["deskContext"]
}
```
