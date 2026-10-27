# Episode: the envelope a developer leaves, and the official who says no

Helper E (scene builder), Oct 27, 2026. Calibration only: nothing here ships. No real name or quoted line appears in any player-facing file.

## Source

- ABC7 News Bay Area, "Antioch father, son charged with bribery for allegedly giving councilmember mug with $5K in cash" (2025), https://abc7news.com/post/father-son-developers-charged-antioch-bribery-case-accused-giving-councilmember-mug-5k-cash/16230745/ . A federal indictment says two homebuilders offered a city councilmember cash (a first $5,000 handed over in a mug, a larger sum promised) to put a stalled housing project on the council agenda and vote for it. The councilmember reported the offer and cooperated with the FBI; one meeting was recorded.
- Pattern check (other lives, same shape, used in step 5): a Dallas bribery sting of 2005 in which a businessman turned down an offer to pass money on to a council member (D Magazine, "It's a Wired World", 2005); the Chicago alderman who wore a wire for the FBI (reported by The Real Deal, Jan 2019).

## Fact packet (substance, not words)

1. **Who.** A local official (council member) and two builders, a father and son, who have a housing project stuck before the council. The official has dealt with them before at meetings (a professional tie, not a friendship).
2. **Trigger on the record.** The project is stalled: it sits unscheduled, and the builders have a large stake in its moving (their money is tied up in land and carrying costs).
3. **The moment.** The younger builder asks to meet, away from the dais, and brings a small gift. Inside is cash. He says the project needs to reach the agenda and needs a yes, and that the amount is "to show good faith"; more would follow.
4. **What the official knew.** Only the two of them were in the room. (Later a recording shows the room was not as private as the builder believed.)
5. **The choice.** Take it and keep quiet; hand it back and say nothing to anyone; refuse and tell the builder you must report it; stall and take it "to think about it"; take it and tell the authorities.
6. **What came after.** The official reported the offer. Charges followed months later, against the builders, on the strength of the recorded meetings. The project's fate and the official's standing in town both changed.
7. **What the moment taught the genre.** An offer is a record for both parties from the instant it is made, whether or not the money is taken; who else learns of it depends on who the two people are and what they do next.

## Ask the engine (a drawn place and seed: see the PR body for the run)

| Line of the packet                          | Record in the played world                                                                                                         | Fires?                                                                 |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| 1 official and offerer, a tie from dealings | `closeness()` in `corruption.ts`; people and ties in core                                                                          | exists, nothing fires                                                  |
| 2 a stake for the offerer in a favor        | `BribeAsk.stakeMinor` from contracts (`contracts.ts:150`) and interest groups (`interest-groups.ts:396`)                           | exists, nothing fires                                                  |
| 3 the offer itself                          | `considerBribe` writes a crime row in the corruption table and an `access: "self"` knowledge record for both parties, `crime:<id>` | exists, **no event the director can match**                            |
| 4 who else saw                              | `crimesKnownTo`, `crime.told` (falling out)                                                                                        | exists                                                                 |
| 5 the player's choice (take it or not)      | `decide(... "take" ...)` runs for **every** official, the player included, from traits and money                                   | **does not exist for the player**: the engine decides the player's yes |
| 6 the outcome                               | `scandal.reported`, `press.exposed`                                                                                                | exists; surfaces later from the engine's own rule                      |
| 7 both hold the act                         | `observe(... access: "self")`                                                                                                      | exists                                                                 |

## Gaps and where each goes

- **Engine, lead `effects`:** the offer is not an event (nothing for the director to hear), and when the official is the player the engine chooses "take" for them. Needs: a `corruption.bribe-offered` event with the offerer, official, favor kind, subject and amount; and, for an official the player plays, a pending offer the scene answers (take, refuse, report, stall) through a writer that records `bribe-taken`, `bribe-refused` or `bribe-reported` by the same rows as today. Filed as `corruption-bribe-offer-reaches-player-seat`.
- **Director, lead `words` (this PR):** a situation type `bribe-offer` (cast: the offerer from the corruption record, the player as the official), a purpose arc with four stances, bank lines. It waits on the producer above, registered as `awaitingProducer: "bribe-offer"`.
- **Director (general), lead `words`:** an ending's `keeps` is a label and nothing writes it in play (only `scene.reply` is written). Filed as `words-scene-ending-writes-its-record`; every scene benefits.

## Producer coverage (step 5)

The same `bribe-offer` producer covers: a lobbyist who leaves a campaign check "for the bill" and asks for a vote (interest-groups path, `favor: vote`); a bidder on a town contract who offers a "consulting fee" (contracts path, `favor: contract`); the Dallas shape (a go-between asks the player to carry money to another official) once the offer record names a middleman. All three differ in fact (`favor`), amount and tie; the lines vary on those.
