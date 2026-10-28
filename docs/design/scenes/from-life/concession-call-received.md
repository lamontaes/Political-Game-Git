# Episode: the winner takes the loser's call

Season: the campaign's ending (`docs/design/scenes/owner-scene-examples.md`, "Election day and night"; owner Oct 26: "conceding or celebrating"; Oct 27: "a victory speech obviously means there needs to be a concession speech... a contentious call with the other candidate"). Helper B, Oct 27. Calibration only: nothing here ships, no name or line is used in player text.

## Sources (read Oct 27)

1. A presidential election night, 2000: the trailing candidate phoned the leader to concede, was told by aides about thirty minutes later that the count in the deciding state had narrowed to a few hundred votes, and phoned back to withdraw the concession. The leader was reported stunned and unhappy and asked the caller to say again what he meant; the caller cut it short. Accounts differ on the clock times (about 2:16 to 2:40 a.m. for the first call, about 3:35 a.m. for the second) and on the exact words. https://www.history.com/this-day-in-history/al-gore-concedes-presidential-election ; https://edition.cnn.com/2000/ALLPOLITICS/stories/12/13/gore.ends.campaign/index.html ; https://thecrimson.com/article/2000/11/8/deadlock-recount-ordered-pthe-presidency-of ; https://content.time.com/time/subscriber/article/0,33009,998543-9,00.html
2. A city council race in Marin County, California: the trailing candidate phoned the apparent winner "last week" once later ballot counts left "zero chance", to congratulate and wish her well, and said they would not seek a recount. https://patch.com/california/sananselmofairfax/brockbank-cedes-san-rafael-city-council-race-to-bushey-lang
3. A runoff for a city council seat in Austin, Texas: the loser called the winner; she called it very gracious and offered to meet so he could raise the issues his supporters cared about. https://www.austinchronicle.com/news/meet-your-new-city-council-austin-12093566/
4. A mayoral race in Annapolis, Maryland: the incumbent winner announced that his opponent had conceded by phone before the opponent made any public statement; the news of the call came from the winner's side. https://patch.com/maryland/annapolis/annapolis-election-results-democrats-incumbents-lead-every-race
5. The custom itself: the loser phones the winner first, congratulates, offers support, then speaks publicly. https://www.startribune.com/the-phone-call-no-candidate-wants-to-make/271522331/ ; https://wikipedia.com/wiki/Concession_(politics)

## The packet (the moment: the call comes in after the count)

1. Who: the winner (the subject) and the person they beat (the opponent, named by the contest). They know each other from the campaign (tie: rival, or friend if the record has one).
2. Trigger on the record: the count is in and names the winner; the loser has not yet spoken in public.
3. The loser phones. The winner is at home or at the party, not on stage. This is the winner's side of the call; the loser's side is `concession-call` (exists).
4. In the ordinary version the loser congratulates, says what they will do next (support, not seek a recount, stay out of the way), and may ask for something (a meeting about the people who backed them).
5. In the hard version the loser calls to say they are not done: the count is close, they will wait for the full count or ask for a recount, or they say they conceded too early. The winner must answer a person who was just a rival and still is one.
6. What the winner can do: take the call warmly and promise a meeting; take it and hold the line on the result; ask about the count; say little and let the clerk's count answer.
7. What changes after: the tie between the two (warmer, or more strained); a promise recorded when the winner offers a meeting; a story the press may run when the loser's side says "not conceding"; a journal line for the winner.

## What the records give a played world (asked Oct 27, `buildBenchWorld`)

| Packet line                    | Record in the world                                                         | Fires today                                                  |
| ------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 2 the count names a winner     | `election-result:<contestId>` (voting.ts), `facts.winnerId`, `facts.totals` | yes, for `race-won`, `family-win`                            |
| 1 the opponent                 | the contest's filings (`opponent` fill)                                     | filled for `rally-opponent` only; never for a winner's scene |
| 3 a phone call between the two | setting `phone` exists                                                      | no type puts the loser on the phone to the winner            |
| 4/5 how close the count was    | `facts.totals` (JSON of votes by candidate)                                 | not read by any scene; the margin is derivable               |
| 6 the winner's replies         | purpose arcs: `concession-call` has the loser's replies                     | no purpose has the winner's side                             |
| 7 outcomes                     | `keeps` values (promise, relationship-strained)                             | exist; not attached to a winner's call                       |

## Gaps and work

- Missing situation type: the winner receives the loser's call. Built in this episode as `concession-received`, cause `election-result` with the subject as winner, cast the loser from the contest (`opponent`) and the call on the `phone`. Margin read from `totals`: a sliding scale, no threshold (the lines say "close" or "comfortable" from the share, and the hard branch is cast from the loser's own traits, not a roll).
- Missing lines: new bank pieces for the loser's side (versions by trait and tie) and the winner's four stances.
- Engine item (not built here): a recount or contested count record does not exist, so "I am not conceding yet" has no outcome record beyond the story tag. Filed as a pool item for the elections lead.

## Two other lives the same producer now covers

- A county commission race where the loser phones the winner the next morning after the canvass and asks for a seat on a board (source 3 shape: the loser raises the people who backed them).
- A mayoral race where the winner's side announces the call before the loser speaks publicly (source 4 shape): the producer's `keeps` writes a record the press can read.

## What shipped (Oct 27, Helper B, pool item `words-scene-concession-received`)

- Situation type `concession-received` (cause: `election-result`, subject the winner; caller: the runner-up on the result's `totals`, through the new `opponent` civic fill; setting: phone), purpose arc `concession-received`, 70 bank pieces in `data/english/parts/scene-talk.json`, `src/director/concession-received.test.ts`.
- The winner's four stances: take it warmly, offer a meeting, ask for a public statement tonight, wait for the county. The caller's answers are picked by the caller's traits through the shared decision table, so a caller who leans toward refusing can say "not until the county certifies" and one who leans toward accepting can say they will speak tonight (the two drawn callers both took the accepting branch).
- Played-world proof: Logan, West Virginia, seed `probe:3` (`election-result:contest:seat:gus2025:176993:council:0:2025-04-01`), and Cleveland, Ohio, seed `d30994e525aa385c:2` (`election-result:contest:seat:gus2025:172358:council:0:2025-11-04`).
- Not done, filed: the call plays in ordinary play only once a record's several scenes play in turn (`director-moment-plays-every-staged-scene-in-turn`); versions by tie (`words-scene-talk-lines-by-tie`); a recount record for the hard branch (`elections-contested-count-record`).

### The scene as the engine composed it (Cleveland, Ohio; first 34 lines)

```
Cleveland, Ohio (3916000), seed d30994e525aa385c:2: election-result:contest:seat:gus2025:172358:council:0:2025-11-04
NARRATOR: The phone rings while the room is still loud. It's Samantha Williams.
OPEN (Samantha Williams): It's Samantha Williams. Do you have a minute?
STATE (Samantha Williams): The count has you ahead by 16,560 votes. Congratulations.
  > [thank] Thank you. You ran a clean race.
    Samantha Williams: I'll ask it once, and then I'll let you get back to your night. The folks who backed me expect a hearing. Can I count on that?
    > [promise] They will be heard. You have my word on that.
      Samantha Williams: Thank you. That is all I needed to hear.
      = You promised their people a say (promise)
    > [offer] Bring me their top three concerns. I'll put them on the agenda myself.
      Samantha Williams: I'll bring them. Thank you for doing this.
      = A meeting on the calendar (promise)
    > [decline] I can't promise you outcomes. I can promise your people a hearing and nothing less.
      Samantha Williams: Then I will hold you to that hearing, and so will they. Don't make it a quiet one.
      > [offer] Come by the office Monday. I want to hear what your supporters care about.
        Samantha Williams: That's more than I expected tonight. Thank you.
        = A meeting on the calendar (promise)
      > [promise] I will make sure your people are in the room when it counts.
        Samantha Williams: Thank you. That is all I needed to hear.
        = You promised their people a say (promise)
      > [stall] Thank you. I'm going to let the county finish counting before I say anything about what's next.
        Samantha Williams: Do you think the count will move? Is there anything still out?
        > [answer] The last report I saw had me ahead by 16,560 votes. I wouldn't expect that to change.
          Samantha Williams: Then I'll plan on that. Thank you for telling me straight.
          = You told them where the count stood (none)
        > [press] That's the clerk's job to say, not mine. I'd rather you said what you'll do either way.
          Samantha Williams: I'll say it tonight, from the podium, before my people go home.
          = They'll say it in public tonight (none)
        > [stall] I don't know. Ask me when the clerk's office has finished.
          Samantha Williams: Fair enough. Call me when it's final.
          = You left it to the count (none)
        > [leave] I'll call you if I hear anything. Good night.
          = Left it there (none) / Samantha Williams: Take the night. Good night.
      > [leave] I should let you go. We both have people waiting.
```
