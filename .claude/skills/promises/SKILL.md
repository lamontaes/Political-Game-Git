---
name: promises
description: >
  A promise made in a scene is kept, settled and said: the kind as a row in
  src/director/data/promise-kinds.json, the record that settles it, the tie it
  moves and the next talk that says it; promises are moving into an engine
  module (owner, Nov 15). Use when a scene ending should hold someone to their
  word, or a promise never settles or is said wrong. Not for the scene's own
  lines (civic-prose) or bargaining reads of a broken promise (promiseToHold).
---

# Promises

**Promises move into the engine (owner, Nov 15, `docs/coordination/OWNER-DECISIONS.md`).** The promise record, its settlement and the tie it moves go from the director (`src/director/promises.ts`, `src/director/promise-talk.ts`) into an engine module as the first follow-up (item `core-promises-kept-and-settled-by-the-engine`). No new promise kind is added in the director until then; the traps below still hold for the kinds that exist.

A promise is a kept fact the director holds for the one who promised, owed to
the other. It ends kept or broken on the day the record that decides it lands,
or when its window closes. The tie moves once, and the next talk between the
two says it, once.

## Adding a kind

1. **The kind.** Add a row to `kinds` in `src/director/data/promise-kinds.json`
   with these fields:
   - `tie`: the cause facts it carries, for example `billId`, `meetingId`.
   - `settle`: an operation and the `eventKind` or `relationshipCause` that
     settles it.
   - `windowDays`: a TUNABLE parameter row with its citation and spread.
   - `windowEnds`: `kept`, `broken` or `lapsed`.
   - `countedOn` and `renewable`.

   A kind nothing can settle is cut, and a `Design:` pool item is filed for
   the act it waits on. Never add a stopgap for it.

2. **The ending.** Add a row to `endings` naming the purpose and the ending id.
   `promiseReplyFacts` reads the tie from the cause's facts. If the cause does
   not carry it, it reads the first record id of the scene fact with that key,
   which is how a friend's meeting gets in.
3. **The settle key.** Add the operation to `settleKeys` in `promises.ts` and
   a branch in `settlePromisesOnEvent` (or `settlePromisesOnTie`). Each event
   costs one set test and one map lookup; never scan.
4. **The lines.** The Words lead writes the `promise-kept` and
   `promise-broken` raises in `data/english/parts/conversation.json`, gated by
   `requiresFacts: ["promise-<kind>", ...]`. The facts are added in
   `promiseSubject`. A slot name already used in that bank with another
   meaning (for example `held` or `body`) gets a new name such as
   `meeting-held`.
5. **The test.** Pin it in `src/director/promises.test.ts` with `world(draw,
label)`: one place kept and one broken, the next talk played with every
   answer branch (`talkOf`), and every place passed over named.

## Traps

- **The core counts every tie move as contact.** `api.relationship` sets
  `lastContactDate`, so a promise broken while the two were apart made the
  friend say "I saw you just yesterday". Settle apart with `together =
false`; `tieOwed` holds the hours, and `payTieOwed` moves the tie when the
  promise is said in a talk.
- **Same day.** A talk on the day a promise is made or answered does not
  keep it (`settlePromisesOnTie` skips `since === today`).
- **The bank's filter.** The conversation bank drops a raise or ask that has
  no slot and says "it", "that" or "there"
  (`src/english/mined/conversation-bank.ts`). Such a line never plays, so cut
  it.
- **Telling order.** A talk opens on one main topic. `promise-kept` and
  `promise-broken` are in `NEWS_SUBJECTS`, so they lead until said.
  Otherwise topics rank by moment impact; never use a tuned weight.
- **Advancing time.** `play(core, id, 1)` may not move the date; use 2.
- **Meetings.** A player marked to attend a meeting is held at its hour, and
  resuming the stop holds them again forever. Call `leaveMeeting`, which
  records office-day's `attend` act, then resume. That act is what says the
  player came.
- **Branching talks.** Branch with `snapshotWorld`/`restoreWorld` plus an
  in-place restore of the ledger maps, because the director keeps its own
  reference.
- **A friend's ask.** It is staged only when there is a town meeting ahead
  that the player may come to. Otherwise the scheduler holds it back as
  `nothing-to-ask`, rather than dropping it at its request. A yes before the
  agenda is posted is held in office-day's `pledges` table and merged into the
  meeting row when the meeting is posted.

- **Who is in control.** office-day offers a meeting to a resident only
  while the player is the one in control (`meetingToAttend` reads
  `snapshotExplicitControlV1`). A test that builds a world and only calls
  `advanceCore` never sees a posted meeting; take one day on the player's
  clock first (`advancePlayerV1`), and from then on use the player's clock,
  since `advanceCore` throws while a person is controlled.
- **Module tables.** A module state table is removed from with `.remove(id)`,
  not `.delete(id)`; `.delete` is not a function and fails only at run time.
- **A day said in a line.** Put the day in one slot filled from the record
  (`{meeting-when}` from `dayAheadSaid`: tonight, today, tomorrow night,
  tomorrow, on Tuesday, on February 4th), never one copy of a line per day
  form; the friend-ask bank caps its pieces and the copies blow it. Check
  that no line puts "a" before a filled name ("a Arab City Council"): lead
  with the name instead.
- **Ten words.** A conversation raise is at most ten words outside its slots
  (`maxWords` in the bank, `tests/english-parts-banks.test.ts`). A line over
  it goes back to the Words lead to reword; the builder does not trim it.
- **A question the ask already answers.** When a request names its day, a
  reply that asks "when" asks for something already said; the Words lead
  deletes it and any answer that only it reached.
- **A real loan, never a written one (Account lead, Nov 15).** A played file
  for a promise about money shows a loan the credit engine wrote and a
  payment it billed, never an `applyCoreEvent` missed payment. The engine
  lends only to a household's oldest member whose cash is short, so a new
  18-year-old at home never borrows (item
  credit-young-adult-at-home-never-borrows). Play the pinned borrower in
  `tests/support/real-borrower.ts` (`BANK_BORROWER`, picked with the New
  game creator's birthday) to its first quarrel with `playToQuarrel`. The
  flow from there to the talk is `playPayOnTime` in
  `tests/support/promise-play.ts`, shared by the test and
  `scripts/words/pay-on-time-played.ts`, which writes the played file at its
  head; a borrower the test does not carry goes in the script's list, never
  in a reader's copy of the test.
- **No played borrower keeps a pay-on-time promise (Account lead, Nov 16).**
  Since #9532 a personal loan is two months of living costs billed on the
  1st, and the first paycheck from new work comes later or smaller, so
  taking work does not pay the next bill (item
  world-loan-bill-before-first-payday-no-borrower-keeps). The pay test plays
  the broken case only, and the kept raise is out of the bank; both come back
  with that item. A one-hour hunt over draws and birthdays found none, so do
  not hunt again before it lands.
- **Drawn is not said.** A raise listed under "also drawn on other days" was
  never said in a talk. The second reader stamps only lines said; a line that
  no played talk says is deleted, or played until a talk says it.
- **Every name that fills a slot is seen said (Account lead, Nov 15).** A
  name in `data/english/payment-words.json` ships only once a played talk
  says it; an unseen kind comes out of the file, and `paymentNamed`
  (promise-talk.ts) keeps its talk from firing at all, never a fallback name.
  Before hunting a kind, read whether the engine can bill it: medical debt is
  written closed and never billed, a business loan's borrower is the firm
  (no `credit.payment-missed` for a person), and an opening mortgage lives in
  the housing module's own table. Hunt town-wide first (count every missed
  payment by kind in a played year), then hunt players in the towns that
  have them, since a bought home's mortgage is the household head's.
- **Hunt scripts run as scratch tests, moved out after.** A background
  `sh -c` with `rm` in it is refused by the safety check; move the scratch
  file out of `src/` with `mv` once its run ends, before the guards run, or
  zero-dice and the guards read it.
