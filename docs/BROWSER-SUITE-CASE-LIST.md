# The browser suite's 104, named

Every case not passing in the measured run behind
`BROWSER-SUITE-FLOOR.md`, named by spec file and test title so another lane can
match its own failures against this list instead of against a count.

Written because a lane with nine browser failures could match exactly one of
them to the family table, and correctly refused to call a shape a match. A
count cannot be checked against; a list can.

**The run.** All 588 cases at `445441a5` — main plus the measured timeout
budget, taken before the merge train of the 21st into the 22nd began. Local, in
this container, **Chromium 141** (the container's build 1194 aliased over the
pinned 1234; see section 3 of the floor document), 2 workers, `CI=1`, 3 hours
6 minutes. 93 failed, 11 flaky, 474 passed, 10 skipped.

**How to use it.** Match on spec file plus test title. Shard numbers are not
stable across runs and matching on them will lie to you. A case here that your
run also fails was already failing at `445441a5`, which means nothing merged
after that head caused it. A case your run fails that is _not_ here is new, and
is worth reading closely.

**What the columns mean.**

- `artwork` — the spec opens the game with `?art-preview=candidate` and the
  private manifests are not in any checkout a machine can make. A floor, not a
  backlog. See the floor document, section 1.
- `timeout` — the case ran out of the 120-second budget. That budget was sized
  from measured walks, so these are no longer explainable as slow walks.
- `assertion` — the case reached its assertion and the assertion failed.
  **This is not the same as "a bug".** Splitting these into product defect,
  harness defect and stale expectation needs each case opened; that work is
  not done and this file does not pretend it is.
- `unknown` — the case died before reporting anything usable.
- `flaky` — passed on its retry. Counted here because a case that needs a
  retry is not passing, but it is the weakest kind of entry on this list.
- `gone` — the spec file has since been deleted from main. Eighteen cases
  carry this. **Do not spend on them.**

## The list

### `a-fresh-candidate-lineage.spec.ts`

- `a-fresh-candidate-lineage.spec.ts:50:1` — fresh candidate draft pins before replay encoding; replay and saved life retain that identity _(artwork)_

### `a41-pose-composed.spec.ts`

- `a41-pose-composed.spec.ts:37:3` — A41 age 34 generation 10: actual room Talk and saved appearance at 1200x720 _(artwork)_
- `a41-pose-composed.spec.ts:37:3` — A41 age 34 generation 9: actual room Talk and saved appearance at 1280x860 _(artwork)_
- `a41-pose-composed.spec.ts:37:3` — A41 age 6 generation 10: actual room Talk and saved appearance at 1200x720 _(artwork)_
- `a41-pose-composed.spec.ts:37:3` — A41 age 6 generation 10: actual room Talk and saved appearance at 1280x860 _(artwork)_

### `art-desk-human.spec.ts`

- `art-desk-human.spec.ts:63:1` — the human Art Desk: named cards, lineage, small filters, brief copy and download _(assertion)_

### `art-desk.spec.ts`

- `art-desk.spec.ts:173:1` — an existing raster round-trips upload → reload → same candidate → full-size preview _(assertion)_

### `artbench.spec.ts`

- `artbench.spec.ts:134:1` — the owner journey: brief → batch → restart → filter → approve → tags → revision → download → edit → reimport → approve → integration _(assertion)_
- `artbench.spec.ts:549:1` — source-switch persistence: the data root outlives the worktree and a second store sees the same events _(unknown)_

### `campaign-first-election.spec.ts`

- `campaign-first-election.spec.ts:491:3` — P85D integration through ordinary player controls › a Lexington winner can activate Kentucky Work before and after reload _(timeout)_

### `campaign-party-life.spec.ts`

- `campaign-party-life.spec.ts:367:3` — a scheduled phone shift is attended and recorded from the Calendar by keyboard _(assertion)_
- `campaign-party-life.spec.ts:367:3` — a scheduled phone shift is attended and recorded from the Calendar by pointer _(assertion)_

### `character-context.spec.ts`

- `character-context.spec.ts:241:3` — The page says whose life this is › keeps the chosen character through a reload _(assertion)_

### `civic-funded-service.spec.ts`

- `civic-funded-service.spec.ts:121:1` — an Alaska member funds added transit service from a collected tax and sees what it delivered after reopening _(timeout, flaky)_

### `civil-work7-normal-route.spec.ts`

- `civil-work7-normal-route.spec.ts:18:1` — ordinary Day and Work expose private personnel preparation _(assertion, flaky)_

### `dev-lab2.spec.ts`

- `dev-lab2.spec.ts:22:1` — review clone, mutations, navigation, reset and exit preserve the complete normal save _(assertion, flaky)_

### `docket-screenshots.spec.ts`

- `docket-screenshots.spec.ts:47:1` — captures the five-minute click path ─ _(assertion)_

### `edu-path7-normal.spec.ts`

- `edu-path7-normal.spec.ts:15:1` — normal dated education offer, period progression, interruption and repeated saving _(timeout, flaky)_

### `front-door-readability.spec.ts`

- `front-door-readability.spec.ts:152:3` — The front door stays compact and readable over the room › keeps creator headings and fields on the same compact slot _(timeout)_

### `g-location-compositions.spec.ts`

- `g-location-compositions.spec.ts:10:3` — candidate compositions activate by pointer and keyboard at 1200 _(artwork)_
- `g-location-compositions.spec.ts:10:3` — candidate compositions activate by pointer and keyboard at 1440 _(artwork)_
- `g-location-compositions.spec.ts:59:1` — ordinary campaign action paints the storefront only in isolated candidate mode _(artwork)_

### `governing-office.spec.ts`

- `governing-office.spec.ts:102:1` — a Colorado life wins the governorship, takes office and governs _(assertion, flaky)_

### `modular41-combined.spec.ts`

- `modular41-combined.spec.ts:36:3` — MODULAR41 age 34 generation 9: actual room Talk and saved appearance at 1280x860 _(artwork)_
- `modular41-combined.spec.ts:36:3` — MODULAR41 age 42 generation 12: actual room Talk and saved appearance at 1200x720 _(artwork)_
- `modular41-combined.spec.ts:36:3` — MODULAR41 age 6 generation 12: actual room Talk and saved appearance at 1280x860 _(artwork)_

### `morning23-b.spec.ts` — **deleted from main; do not spend on these**

- `morning23-b.spec.ts:27:3` — MORNING23 candidate people through actual play morning23-b-life2 _(artwork)_
- `morning23-b.spec.ts:27:3` — MORNING23 candidate people through actual play morning23-b-life3 _(artwork)_
- `morning23-b.spec.ts:27:3` — MORNING23 candidate people through actual play morning23-b-play _(artwork)_

### `municipal-member.spec.ts`

- `municipal-member.spec.ts:57:1` — normal saved municipal member completes work once and reloads without acquiring further authority _(timeout)_

### `narrative-life.spec.ts`

- `narrative-life.spec.ts:408:3` — A life is told continuously › keeps a quiet stretch honest: grounded sentences or silence _(assertion)_
- `narrative-life.spec.ts:556:3` — The calibration opens a life › runs the questions and ends into the life without a length up front _(assertion)_

### `news-search1-normal.spec.ts`

- `news-search1-normal.spec.ts:151:1` — normal News search stays usable on a narrow viewport after a second publication _(timeout)_
- `news-search1-normal.spec.ts:25:1` — normal legislative publication supports search, clear, help, person, Back, and save/reload without mutating World _(assertion, flaky)_

### `p29-g-apartment.spec.ts`

- `p29-g-apartment.spec.ts:25:5` — apartment residence-apartment-living-canonical-03 on ordinary controls at 1200 _(artwork)_
- `p29-g-apartment.spec.ts:25:5` — apartment residence-apartment-living-canonical-03 on ordinary controls at 1440 _(artwork)_
- `p29-g-apartment.spec.ts:25:5` — apartment residence-apartment-living-ordinary-02 on ordinary controls at 1200 _(artwork)_
- `p29-g-apartment.spec.ts:25:5` — apartment residence-apartment-living-ordinary-02 on ordinary controls at 1440 _(artwork)_

### `p2r1-editorial.spec.ts`

- `p2r1-editorial.spec.ts:54:1` — P2R1 preserves and reloads the old age-32 calibrated fixture when its next beat is quiet _(assertion)_

### `packet77-presentation.spec.ts`

- `packet77-presentation.spec.ts:157:3` — The title is a room with a menu on it › crossfades one room into the next without a white wash _(assertion, flaky)_

### `pennywise-adaptive-life.spec.ts`

- `pennywise-adaptive-life.spec.ts:143:3` — The calibration is a set of situations, not a quiz › asks the short path, answers it, and starts the life _(assertion)_
- `pennywise-adaptive-life.spec.ts:174:3` — The calibration is a set of situations, not a quiz › never tells the player what it concluded about them _(assertion)_
- `pennywise-adaptive-life.spec.ts:194:3` — The calibration is a set of situations, not a quiz › lets a player decline the whole thing, and lets them stop part way _(timeout)_
- `pennywise-adaptive-life.spec.ts:248:3` — An adult has something to do, and it follows from their life › plays a run of adult situations and remembers every one _(assertion)_
- `pennywise-adaptive-life.spec.ts:307:3` — Nothing on screen says how much a choice will matter › shows no tier, no meter and no forecast anywhere in a played run _(timeout)_
- `pennywise-adaptive-life.spec.ts:324:3` — Nothing on screen says how much a choice will matter › writes no tier and no selection reason to disk _(assertion)_
- `pennywise-adaptive-life.spec.ts:359:3` — A life is kept, and comes back adapting the same way › keeps a calibrated life, reloads it, and continues the same sequence _(assertion)_
- `pennywise-adaptive-life.spec.ts:390:3` — A life is kept, and comes back adapting the same way › rebuilds exactly the life its replay address was taken from _(timeout)_

### `people-coherence-b.spec.ts` — **deleted from main; do not spend on these**

- `people-coherence-b.spec.ts:109:3` — controlled wardrobe average-man: identity preserved through real swaps _(artwork)_
- `people-coherence-b.spec.ts:109:3` — controlled wardrobe skinny-man: identity preserved through real swaps _(artwork)_
- `people-coherence-b.spec.ts:44:1` — same Haley room composition after neckline repair _(artwork)_

### `people-fresh-candidate.spec.ts` — **deleted from main; do not spend on these**

- `people-fresh-candidate.spec.ts:113:3` — replay bypass preserves 2 actual shirt _(artwork)_
- `people-fresh-candidate.spec.ts:113:3` — replay bypass preserves 3 actual shirt _(artwork)_
- `people-fresh-candidate.spec.ts:113:3` — replay bypass preserves 4 actual shirt _(artwork)_
- `people-fresh-candidate.spec.ts:113:3` — replay bypass preserves unpinned v2 actual shirt _(artwork)_
- `people-fresh-candidate.spec.ts:37:1` — fresh candidate creates two independent lives, swaps and reopens actual matched parts _(artwork)_

### `people-snapshot6.spec.ts` — **deleted from main; do not spend on these**

- `people-snapshot6.spec.ts:132:1` — saved outfit A/B/A keeps captions and decoded layers aligned under delayed loading _(timeout)_
- `people-snapshot6.spec.ts:262:1` — person A/B/A and rapid reload use the correct canonical portrait and scene during delayed loading _(timeout)_

### `people-visual4.spec.ts` — **deleted from main; do not spend on these**

- `people-visual4.spec.ts:151:1` — every available body can be selected and framed without changing its geometry _(assertion)_
- `people-visual4.spec.ts:15:1` — selected canonical candidate keeps identity across wardrobe, portrait, scene and keyboard reload _(timeout)_

### `people-web.spec.ts`

- `people-web.spec.ts:172:3` — real People web route works at desktop width _(assertion)_
- `people-web.spec.ts:172:3` — real People web route works at narrow width _(assertion)_

### `people1-r1.spec.ts` — **deleted from main; do not spend on these**

- `people1-r1.spec.ts:16:3` — saved dev world keeps identity across actual wardrobe changes, pointer and keyboard _(timeout)_
- `people1-r1.spec.ts:16:3` — saved real world keeps identity across actual wardrobe changes, pointer and keyboard _(timeout)_

### `places11.spec.ts`

- `places11.spec.ts:47:1` — capture Places evidence screenshots ─────────── _(timeout)_
- `places11.spec.ts:70:1` — Places reads preserve World across save and reload _(timeout)_
- `places11.spec.ts:9:1` — child sees already-home refusal, walks nearby, and reports arrival _(assertion)_

### `playable29-material.spec.ts`

- `playable29-material.spec.ts:130:1` — prepared room action menu Escape and Talk restore its real invoker _(artwork)_
- `playable29-material.spec.ts:162:1` — all six bodies swap real clothing; cancellation retains the saved person _(artwork)_
- `playable29-material.spec.ts:247:1` — native material pass preserves alpha and protected drawing; variants release _(artwork)_
- `playable29-material.spec.ts:51:1` — normal prepared person changes materials/features and real clothes, then reopens _(artwork)_

### `playable29-outfit.spec.ts` — **deleted from main; do not spend on these**

- `playable29-outfit.spec.ts:29:1` — normal candidate complete defaults, actual edits and separate saved lives _(artwork)_

### `player-seed-replay.spec.ts`

- `player-seed-replay.spec.ts:339:1` — normal player route preserves default prose and exactly replays generated role text A → B → A _(timeout, flaky)_
- `player-seed-replay.spec.ts:351:1` — explicit legacy-named seed matches person-v5/names-v1 on player and developer routes _(timeout, flaky)_

### `playtest34-c.spec.ts`

- `playtest34-c.spec.ts:89:3` — PLAYTEST34 C quiet rest and primary controls › People, Calendar, and Personal stay reachable at a short content height _(assertion)_

### `playtest34-life.spec.ts`

- `playtest34-life.spec.ts:162:3` — ordinary child talks to canonically labelled mom: lines/browsing zero 1200 _(timeout)_
- `playtest34-life.spec.ts:162:3` — ordinary child talks to canonically labelled mom: lines/browsing zero 1440 _(timeout)_

### `playtest34-ordinary-people.spec.ts`

- `playtest34-ordinary-people.spec.ts:307:1` — ordinary child household preserves each generated parent's canonical figure and portrait _(artwork)_
- `playtest34-ordinary-people.spec.ts:77:3` — ordinary Lexington female body preview, Cancel, Apply, save and portrait coherence _(artwork)_
- `playtest34-ordinary-people.spec.ts:77:3` — ordinary Louisville male body preview, Cancel, Apply, save and portrait coherence _(artwork)_

### `production-play.spec.ts`

- `production-play.spec.ts:418:3` — What is written to disk is a player's world › keeps the newest revision when the player leaves straight after acting _(timeout)_

### `pt3-microfix-version.spec.ts`

- `pt3-microfix-version.spec.ts:81:3` — keeps one canonical version stamp in the viewport at desktop _(assertion)_
- `pt3-microfix-version.spec.ts:81:3` — keeps one canonical version stamp in the viewport at narrow _(assertion)_

### `pt3-scene-conversation.spec.ts`

- `pt3-scene-conversation.spec.ts:191:1` — turning to a second classmate keeps the last exchange and says who heard it _(assertion)_
- `pt3-scene-conversation.spec.ts:231:1` — at the smaller 1280 x 720 window the box still needs no scrollbar _(assertion)_
- `pt3-scene-conversation.spec.ts:254:1` — at 1200 x 720 the conversation stays bottom-centre without a scrollbar _(assertion)_
- `pt3-scene-conversation.spec.ts:92:1` — the owner's age-22 conversation is one bounded box with paged history and Back _(assertion)_

### `pt3-school-scene.spec.ts`

- `pt3-school-scene.spec.ts:149:5` — PT3 — the corridor scene on the screen › child route names the incident and peer through reload and continuation _(assertion)_
- `pt3-school-scene.spec.ts:149:5` — PT3 — the corridor scene on the screen › teen route names the incident and peer through reload and continuation _(assertion)_

### `raster-readiness.spec.ts`

- `raster-readiness.spec.ts:340:1` — decoded title A stays visible while resized B response is held _(assertion)_

### `run-a.spec.ts`

- `run-a.spec.ts:296:1` — reproduces every named Run A fixture state by URL _(timeout)_

### `transit-current-source.spec.ts`

- `transit-current-source.spec.ts:8:1` — current-source transit component enacts two choices and preserves unpaid cancellation/publication across reopen _(assertion)_

### `ui-converge4.spec.ts`

- `ui-converge4.spec.ts:77:1` — normal Carson City citizen attends a public session and retains the real venue and World on reload _(timeout)_

### `ui-core-feature-adapters.spec.ts`

- `ui-core-feature-adapters.spec.ts:125:1` — mixed person, session and measure pins preserve identity and clear workspace controls _(timeout)_
- `ui-core-feature-adapters.spec.ts:16:1` — normal Day exposes the frozen study/work adapter and scheduled sessions reach Calendar _(timeout)_
- `ui-core-feature-adapters.spec.ts:242:1` — normal activity completion replaces household presence without a second clock _(assertion)_

### `ui-core.spec.ts`

- `ui-core.spec.ts:147:3` — people, and who was chosen › A then B then A: the record always follows the selection _(assertion)_
- `ui-core.spec.ts:252:3` — people, and who was chosen › a dossier reveals nothing the record does not establish _(assertion)_
- `ui-core.spec.ts:584:3` — the click, back and escape contract › Escape closes one layer at a time and never leaves the life _(assertion)_

### `ui-save5-review.spec.ts`

- `ui-save5-review.spec.ts:23:1` — current normal scene and saved-person dossier remain available for owner review _(assertion)_

### `ui36-successor.spec.ts`

- `ui36-successor.spec.ts:21:1` — UI36 non-Kentucky journey: quiet room, one card, conversation, News and return _(artwork)_

### `ui9-owner-corrections.spec.ts`

- `ui9-owner-corrections.spec.ts:92:1` — UI9-06, UI9-07: a child is told why a walk is refused, and what a walk cost _(assertion)_

### `visual-integration.spec.ts`

- `visual-integration.spec.ts:379:3` — keeps the shared scene camera locked at 2560x1440 (qhd) _(assertion, flaky)_

### `world39-news-journal.spec.ts`

- `world39-news-journal.spec.ts:24:1` — News speaks about the place and the Journal tells the life through save (Aurora, Colorado) _(assertion, flaky)_

## Totals

| Family                           | All 104 | Live 86 |
| -------------------------------- | ------- | ------- |
| Private artwork absent (a floor) | 35      | 23      |
| Assertion failure                | 43      | 42      |
| Timeout at the 120s budget       | 25      | 20      |
| Unknown                          | 1       | 1       |
| **Total**                        | **104** | **86**  |

## Two clusters worth naming

**Six cases are one cause.** The four in `pt3-scene-conversation.spec.ts` and
the two in `pt3-school-scene.spec.ts:149` are the same PT3 scene surface met
from six directions across two spec files and four viewport sizes. CI names the
same six on its own browser, on main at `7fc33c85`. Re-measured directly on
2026-09-22 at main `0e0cebe8`: all four conversation cases fail in the same
place, `stepIntoTheScene` waiting on `opening-life-scene`, which is never
found. That is one missing scene, counted six times.

**Two are not this lane's.** `pt3-microfix-version.spec.ts:81` asserts the
version stamp, which the release machinery owns.
