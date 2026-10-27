# Episode: "We'll talk more later" comes due (home, the evening the promise was for)

Slug `owed-talk-comes-due`. Season: home and family. Researcher packet (Scene researcher A, Oct 27): a packet, a gap list and a SMART item for the director; no code. Calibration only: no real name or quoted line ships.

## Build sheet (for the director engineer)

1. **Trigger:** an owed-talk record, which no engine writes yet: engine item `people-owed-talk-record`, lead effects. No real record id exists; the nearest written record is the `scene.reply` event of the put-off reply, for example `scene-reply:person_01a319696aec9436:...:candidate-filed:filing:contest:seat:gus2025:164887:council:0:2025-11-04:person_01a319696aec9436:2` in Selden, Kansas, seed `scene-a2-1` (the deflect path in `family-stake-scene.test.ts`), which carries the line and move but no due day.
2. **Place kind:** home.
3. **Cast rule:** the person the talk was promised to, named on the owed-talk record; present only if they live in the household and the two have no recorded time together since the reply.
4. **Outcome record:** the owed record closed (they talked: time together written by the relationship writer) or moved (a new day, marked once-moved) or dropped with a quarrel on the tie; read by the relationship engine and by the next filing or campaign talk.
5. **Lines:** to the words lead, drafted in the packet below.

## Why this episode

At the Oct 26 sitting the owner heard home talks end on "I'll see you later", "We'll talk more later" and "Come to bed. It'll still be true in the morning" (`docs/design/scenes/owner-scene-examples.md`, Home and family). They are closing lines of a talk. The first two are generic farewells in the conversation bank (`conversation.farewell-leave-bye.*`, `conversation.farewell-leave-home.we-ll-talk-more-later`); nothing is written when they are said, so nothing can come of them. Scene standard rule 1: no consequence, no scene. A promise to talk later is worth saying only if the later arrives.

## Sources read (for calibration)

The searches for one named episode that includes a farewell at home found none; local-candidate accounts support the pattern, not a single scene:

1. A Toledo, Ohio council candidate on deciding to run with three small children: he and his wife had several deliberate talks about what the commitment would be; the time away from the children is the main cost (Toledo Parent, https://toledoparent.com/?p=31092). The talks are scheduled and kept, not left as "later".
2. A Winston-Salem, N.C. council member: his wife's support was essential and open talk about time came first, with the household discussing the run together (Winston-Salem Chronicle, https://wschronicle.com/?p=65828).
3. An Asheville, N.C. report on first-time council candidates: running for local office involves investments in time, effort and money (Mountain Xpress, https://mountainx.com/?p=842846). The evenings a campaign takes are the usual thing that makes "later" slip.

## Fact packet (what happens, in substance)

- **Who:** the household member the candidate told "we'll talk about it" (a relative with a stake; see `spouse-stake-after-filing`).
- **Trigger on the record:** two records. First, the player's reply in the filing talk that puts the matter off to a time ("Give me tonight. Sunday we sit down with the bills and count it all.") writes an owed talk: who, what it is about (money or evenings), and the day it is for. Second, that day arrives and the two have not talked since (no recorded time together).
- **What the relative wants:** the promise kept, or a new day named. They say what was promised and what is still open, in their own manner.
- **What each says (substance):** the relative opens on the promise and the day ("It's Sunday. You said we'd count the bills."); the player answers: sit down now, give a new day and a reason, say it can't be done, or turn it on them. The relative's answer follows their nature and the tie.
- **What changes after:** if they sit down, the owed talk is closed and the stake is on the table (the household's money counted, or the nights set); if a new day is given, the owed talk moves and is marked once-moved; if refused, the tie takes a quarrel and the owed talk is dropped, with the relative's stance recorded for the next filing talk and the next campaign decision.

## What the engine has (read from the code, main at 05:00 UTC Oct 27)

| Line of the packet                        | Record exists?                                                                                               | Situation type that fires                                                                                                             |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| A talk ends with "we'll talk more later"  | No: the closing line is a bank piece; no record is written                                                   | none                                                                                                                                  |
| A reply that puts a talk off to a day     | The reply is a `scene.reply` event with the line and move, but no due day                                    | none                                                                                                                                  |
| The day arrives with no talk since        | Time together is recorded (`relationship` contact hours), so "no talk since" is readable; the due day is not | none                                                                                                                                  |
| A relative speaks about what was promised | No scene reads a promise                                                                                     | `family-absence` exists but awaits a producer (`awaitingProducer: away-from-home`) and is about absence from home, not an unkept talk |

## Gaps

1. **Engine item (a record that does not exist):** an owed-talk record: who owes whom, about what, due day, written by a reply that defers to a day. Filed as `people-owed-talk-record`, lead effects (the relationships writer). The director builds the scene against it.
2. **Producer (director):** a circumstance row "a promised talk is due and has not happened": cause the due day reached with no contact since; cast the person owed; place home; outcome write closes or moves the owed talk. Filed as `scene-owed-talk-comes-due`, lead director.
3. **Lines:** drafted below; the words lead finishes them.

## Lines drafted to scene-standard rule 4 (versions by bearing, four stances; for the words lead and the director)

Relative's opener (needs the owed talk's topic): money, tender "It's the day you gave me. Shall we count it, you and I?"; money, hurt "You said {when}. It's {when}, and the bills are still in the drawer."; money, guarded "{when}. We were going to count it. Are we?"; evenings, anxious "You said we'd work out the nights by {when}. It's {when}."; evenings, hurt "Another night out, and the talk you promised still hasn't happened."

Player's four stances: sit down now ("All right. Put the bills on the table, I'm here."); give a new day and a reason ("Not tonight, the meeting ran over. Thursday, and I'll bring the numbers."); say it cannot be done ("I can't give you what you asked for, and I'd rather tell you now than put it off again."); turn it on them ("You knew what the campaign would take. Don't make tonight the night we fight about it.").

The relative's answers (by their nature): to sit down: tender "Thank you. Start with what the account says."; to a new day: guarded "Thursday. I'll hold you to Thursday."; to a refusal: hurt "Then tell me what we're doing instead."; to the turn: hurt "That isn't what I asked, and you know it."

Lines the scene replaces: the generic `farewell-leave-home` "We'll talk more later." where the talk has a stake, and "I'll see you later." where the leaving has no reason; delete when the scene lands.

## Played-world check still owed

Filed in the item: in a drawn place (`buildBenchWorld`, named seed) file for office, answer the stake talk with the put-off reply, advance to the due day, and check which record a scene could read. Today only the first two steps run; the third needs the owed-talk record.
