---
id: words-street-stop-says-the-bill-twice-and-claims-a-vote-not-cast
title: "A resident who stops an official on the street says the same clause twice, names the bill by its number, and the official may answer 'I voted' without having voted"
area: words
kind: bug
priority: 1
size: M
status: open
standard: 2
claimed-by:
pr:
after:
blocked-on:
lead: words
model: opus
effort: high
root: rc4-hand-written-words
source: lead's play walk as a seated official on Nov 11, 2026 (Deep River, Washington, seed 253225ee-ffc1-449c-b180-ec52013de651, Advanced start as County Commissioner Holly McGee, the 24th day)
checked:
claimed-at:
---

**What.** On Feb 12 a resident crosses the street to the player, a county commissioner. His box reads "I read about Ordinance 2025-1." and, under it, "I keep reading about Ordinance 2025-1. I want to know what it means for us." The same clause twice, and a number where a person would say what the ordinance is: it was the county's budget. The first reply offered is "I voted the way I thought was right for Deep River. Here's why." The player never voted: the board passed it 2 to 0 on a day the game did not stop for her. The follow-up is the same for every reply of its kind ("That doesn't help us."). This is the one scene a new official met in 24 days, so it is the game's first word on what holding office is like. Seen: the street stop after a vote of the player's body, at 1440x900, where the resident says one thing once, says the measure by what it does, and every reply offered is true of what the player did.

**Cause.** Found in code: the scene is the type `constituent-stop` in src/director/data/situation-types.json (purpose `law-reaches`, cause `circumstance:vote-read-street`), and its lines are the 28 pieces in data/english/parts/scene-talk.json tagged purpose `law-reaches`, key `news-received`. The opening step's piece is "I read about {bill}." (`scene-talk.open-greet.i-read-about-bill`) and the statement step's is "I keep reading about {bill}. I want to know what it means for us." (`scene-talk.state-tell.i-keep-reading-about-bill-…`); both steps play in one box and nothing stops two steps from carrying the same insert in the same clause. `{bill}` is filled with the measure's number and short title as the record spells it. The arc `law-reaches` in src/director/data/purpose-arcs.json offers the reply move `tell` ("I voted the way I thought was right for {place}. Here's why.") whatever the player's own row on the roll call says, and the pieces "You voted for {bill}." and "You voted against {bill}." are picked without reading that row either.

**Fix.**

1. **The greeting greets.** The opening step for this scene hails the official by office and name from the records and says nothing about the measure ("Commissioner McGee. Do you have a minute?"), in many versions through the composer (`composeConversationLine`, src/english/bank-line.ts), with the speaker's bearing choosing the tone. The statement step alone carries the measure.
2. **The measure is said by what it does.** `{bill}` in this scene is filled from the reader the bill's own page uses for its title (`billTitleOf`), in running words ("the county budget", "the police oversight ordinance"), never the number. One reader, the one W6 used for the donor's ask.
3. **Replies are true.** A reply that says the player voted, or how, is offered only when the roll call holds the player's own row, and it says that vote ("I voted for it, and here's why."). When the player's seat has no row, the `tell` replies are the ones a member who was not in the vote can say ("I wasn't in that vote. Tell me what you read."). The resident's "You voted for {bill}." and "You voted against {bill}." read the same row.
4. **No clause twice in one box.** The composer refuses a line whose opening words, up to its first insert, match the line before it in the same box; a test holds that over this scene in ten drawn places.
5. **The follow-up answers the reply.** Each follow-up carries one thing from the reply it answers (the promise, the reason, the place) and has at least three versions.

**Time box.** 4 hours for one Opus session. When it runs out, push what passes, set the item's state honestly with a one-line note, and stop.

**Rules.** No hand-written player text in code: every line is a bank piece joined by the composer, and the measure's words come from the bill's own title reader. An effect is a read, not a record (owner, Oct 13): a reply about the player's vote reads the roll call's row, and with no row it is not offered. One rule, all 56 places: the checks draw their places and name them with their seeds. The words bar (CTO, Nov 11): the scene is shown on screen before and after in three drawn places, same seeds, under docs/seen/, with the lines as played.

**Done when.** A second session, in the running game on main at 1440x900, plays an Advanced start as a seated member of a local body in three drawn places it writes down with their seeds until a resident stops them about a measure (dev mode's scene list may bring the type `constituent-stop` about). In each: the resident's box holds no clause twice and no measure number; the measure is said by what it does; no reply says the player voted unless Politics shows their vote on that measure; each follow-up names something from the reply it answers. A test in src/director composes the scene in ten drawn places and checks the same, naming each place and seed it passed over.

**Waits on.** Nothing. Related: gov-own-body-votes-without-the-player (the cause finder's item on the meeting that did not stop; the id may differ when it is posted).

**Files.** data/english/parts/scene-talk.json, src/director/data/purpose-arcs.json, src/director/data/situation-types.json, src/director/purpose-scene.ts, src/english/bank-line.ts, src/director/constituent-stop-scene.test.ts (new)

**Notes.** Written by the lead (Fable B), Nov 11, 11:08 UTC, from the walk's picture and log and the bank. The picture is the walk's sixth (the street, Anthony Cabrera). The lines under data/english/parts/ are written by a Words builder under the Words ruling of Nov 11, with `Review: words` in the pull request.

**Notes (Fable B, Nov 11, 16:20 UTC: seen again).** Lino Lakes, Minnesota, seed 046d2235-27df-4daa-a680-423d6f24d0d7, stepping in as council member Astrid Shelton on main 382123f701. On January 24, four days in and before the player had been held at any meeting or cast any vote, Kristen Ortiz stopped them: "You didn't give us the vote on Ordinance 2025-3, Astrid. I only wanted you to know it was noticed." The first meeting that held the player was February 4. The builder checks whose vote that record is: one the seat's holder cast before the player stepped in, or one cast for the player without a stop.
