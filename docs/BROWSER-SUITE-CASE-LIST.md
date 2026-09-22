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

**What this list cannot tell you.** At least two cases in this suite answer
differently depending on what runs alongside them, measured independently by
the nationwide lane. So a case absent from this list can still be real in
another run, and a case present here can pass in isolation. That weakens
same-tree attribution in both directions, including the nine-for-nine match
recorded in the floor document: matching titles across two runs is good
evidence and it is not proof that the two runs met the same defect. Treat a
match as a strong prior and a non-match as no information at all.

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

## Seven of the live assertions now pass, and they were one cause

Worked 2026-09-22 after this list was first written. Measured locally on main,
Chromium 141, `CI=1`, two workers.

    narrative-life.spec.ts:556           runs the questions and ends into the life
    p2r1-editorial.spec.ts:54            the old age-32 calibrated fixture
    pennywise-adaptive-life.spec.ts:143  asks the short path, answers it
    pennywise-adaptive-life.spec.ts:174  never tells the player what it concluded
    pennywise-adaptive-life.spec.ts:248  plays a run of adult situations
    pennywise-adaptive-life.spec.ts:324  writes no tier and no selection reason
    pennywise-adaptive-life.spec.ts:359  keeps a calibrated life and reloads it

**The creator gained an appearance step.** "How you look", with its own Begin,
now comes _after_ the questions, so answering the calibration returns the
player to the creator rather than dropping them in a room. Every one of these
asserted `play-screen` immediately and stopped on a creator with Begin sitting
unpressed in front of it. A stale walk in seven places, not seven defects, and
now one shared `beginAfterCalibration` helper.

Running `pennywise-adaptive-life.spec.ts` by itself surfaced **eight**
failures where the whole-suite run recorded five, which is a second instance of
the order-dependence this list warns about above. Three more stale references
came out of that file with them: quitting a life that has never been saved
opens a confirmation, so `goTo(page, "leave-game")` leaves the player where
they were; the replay case waited for an `opening-life-panel` that exists
nowhere in `src` any more; and it was reading behind the skippable world
introduction. That file is now 11 passed, 0 failed, from 8 failed.

**Worth carrying to other lanes: eight other specs call `leave-game` directly**
and will hang the same way on an unsaved life —
`front-door-readability.spec.ts`, `production-play.spec.ts` (six call sites),
`title-tableau.spec.ts` and `frontdoor44.spec.ts`. The shared `leaveGame`
helper answers the confirmation; they have not been switched to it.

**And a note on the timeout family.** Three of these four stale references
presented as two-minute timeouts rather than failed assertions, because a
missing element is waited for and a wrong one is not. So some of the 20 live
timeouts in the table below are stale references rather than slow walks, and
the two families are not as separate as they look.

## Totals

| Family                           | All 104 | Live 86 |
| -------------------------------- | ------- | ------- |
| Private artwork absent (a floor) | 35      | 23      |
| Assertion failure                | 43      | 42      |
| Timeout at the 120s budget       | 25      | 20      |
| Unknown                          | 1       | 1       |
| **Total**                        | **104** | **86**  |

## Two clusters worth naming

**Four cases were one cause. The other two are not — that earlier claim was
wrong.** All four in `pt3-scene-conversation.spec.ts` died in the same place,
`stepIntoTheScene` waiting on `opening-life-scene`. The two in
`pt3-school-scene.spec.ts:149` die somewhere else entirely, on
`data-scene-purpose` reading `home` where the walk wants `school`. They were
grouped together because CI names all six in one shard and they share a
prefix, which is not evidence. Opening them was.

_The four, resolved as a stale walk._ The moment does not sit on the room; it
**replaces** it. `OpeningLifeFlow` returns the moment surface alone while
`pendingOpen` is set, for a stated reason — a panel docked permanently over a
full room covers whoever is standing where it lands, and the people are how a
life is played. The helper opened the moment and then waited for the room, so
it asked for two surfaces the game deliberately never shows at once. The scene
panel for an ordinary start is reached through Personal → "Your day, choices
and pending favors", which is the route `playtest34-life.spec.ts` already uses
and which passes.

_What the repaired walk then exposed_, measured 2026-09-22 on main `8d0f0629`,
local, Chromium 141. These are new findings, not new breakage — the cases
never got far enough to report them before:

- `turning to a second classmate` fails `expectBounded`: the conversation box's
  `scrollHeight` is 432 against a smaller `clientHeight`, so the box overflows
  and needs a scrollbar. That is the PT3 Run B rule the file exists to hold,
  failing for real.
- `the owner's age-22 conversation` and `at the smaller 1280 x 720 window` both
  run out of the full 120-second budget inside the conversation, on
  `locator.innerText` and `locator.click` respectively.

So of the six, one is now a named layout defect, two are timeouts deep inside a
working walk, one is unmeasured, and two were never the same problem. The
lesson is the one this file keeps paying for: a shared prefix and a shared
shard are not a shared cause.

**Two are not this lane's.** `pt3-microfix-version.spec.ts:81` asserts the
version stamp, which the release machinery owns.

## The conversation box overflows by eighteen pixels

Measured 2026-09-22 on main, local, Chromium 141, at 1440 x 900, in the
school-project conversation with two addressees, after turning to the second:

    scrollHeight   432
    clientHeight   414
    max-height     416px  (26rem)

    pg-talk-head                129
    conversation-briefing        30
    conversation-addressees      30
    conversation-beat            96
    conversation-intents         34
    pg-talk-foot                 30
    pg-talk-hearing              15
    ---------------------------------
    children                    364
    six 0.5rem gaps              48
    padding                      20
    ---------------------------------
    total                       432

So the content is **16 pixels over the 26rem cap**, and `overflow: auto` turns
that into the scrollbar the Run B rule forbids. The head is the largest single
part at 129px; the briefing, the addressee row and the hearing line are the
three rows that only appear in a multi-addressee conversation, and together
they are 75px.

**This is not fixed and should not be fixed by picking a number.** The obvious
change — raise the cap to 27rem — is exactly 432px, the measured content of
this one conversation, with no headroom; the next added row breaks it again.
The next obvious change, 28rem, is 448px against a separate rule in the same
file that the box stay under half the viewport, which is 450px at this size.
Two pixels is not a margin.

What it actually needs is a decision about the box: whether it may be taller
when a conversation has more than one addressee, or whether something comes
out of the head. That is a look at the screen and an owner's call, not a
number chosen to make a measurement pass. Recorded here at full precision so
whoever takes it does not have to measure it again.
