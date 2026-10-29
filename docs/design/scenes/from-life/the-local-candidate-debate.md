# Episode: the local candidate debate or forum (a stage, a moderator, an opponent, a room)

Slug `the-local-candidate-debate`. Types: `campaign-stop` and `speech-afterward` are the nearest; no debate type exists. Season: campaign. Owner asks: "Debates are in early access" (Oct 14, OD:191); "No debate scene, no opponent answers, no audience" (Oct 24 playtest, `docs/reports/playtest-2026-10-24.md:141`, item `words-debate-answers-not-campaign-stops`). Calibration only: no real name or words go into player lines.

## Sources read (for calibration)

Fetched (the page text came back through a summarizer, not raw HTML):

1. Bainbridge Island Review, "Newspaper, others put on BI council forums", Oct 7, 2021, https://www.bainbridgereview.com/2021/10/07/newspaper-others-put-on-bi-council-forums/. Paper's editor moderates. "No questions will be taken from the audience." Four half-hour one-on-one debates: 1.5 minute opening, a 30-second quick round, then a question to one candidate (1.5 minutes), the opponent responds (1.5), the first rebuts (1 minute); each asks the other one question; 1.5 minute closing; recorded for the website. The same piece lists a League of Women Voters forum on submitted questions.
2. Inklink (Manchester, NH), mayoral forum, Greater Manchester Chamber of Commerce at a college, Oct 20, 2025, https://manchester.inklink.news/?p=266536. A TV news anchor moderated and asked topic questions (business growth, schools, homelessness, public safety). On working with the board, the incumbent pointed to few tie votes in two years; the challenger answered that the mayor's tie vote that delayed a new elementary school "was not something to be proud of." The page gives no audience reaction.
3. Shoreline Area News, Lake Forest Park council forum, Oct 7, 2025, https://www.shorelineareanews.com/2025/10/candidate-forum-in-lake-forest-park.html. League of Women Voters of Seattle-King County sponsored and moderated, in a town center; one-minute openings, pre-set questions then audience questions, one-minute answers. The page does not say whether cards were used, shows no candidate-to-candidate exchange and no audience reaction.

Search summaries only (not opened; the Santa Clara page returned 403):

4. Santa Clara League forum agenda, https://santaclaraca.gov/home/showpublisheddocument/7845/635713044859030000: audience writes questions on cards, a review committee may merge, reword or drop them; no open microphone; openings, questions, answers, rebuttals, closings.
5. Santa Monica forum notice, https://santamonicanext.org/2014/08/the-league-of-women-voters-of-santa-monica-to-co-sponsor-council-candidate-forum-with-santa-monica-next: questions vetted for relevance and duplication; personal attacks not read.
6. Newark Post, forum canceled, https://www.newarkpostonline.com/news/newark-council-candidates-forum-canceled-due-to-weather/article_9e7cd551-9ed4-5d8b-8e98-6c172840cc84.html: a League cannot hold a forum unless two or more candidates in the race attend.

Not found: a page with applause or laughter at a council debate and the paper's next-day story. No such claim is made below; audience and paper lines rest on the format sources only.

## Fact packet (what happens, in substance)

- **Who:** two or more candidates in one race, a moderator from the sponsor (League volunteer, paper editor or TV anchor), a timekeeper, a room of voters, a camera.
- **Trigger:** the race is set, about two weeks out; a sponsor (League, chamber, outlet) invites everyone on the ballot. A League will not hold it unless two attend.
- **Format:** opening statements, timed answers (one to one and a half minutes), a rebuttal turn, closing.
- **How questions come:** the moderator's prepared list, or audience cards that a committee screens, merges and rewords; personal attacks are not read.
- **The question:** one about the board's record (a tie vote, a delayed school), put to one candidate first.
- **The answer:** the incumbent points to their record and numbers.
- **The reply:** the challenger takes the same fact and turns it against them.
- **The player's turn:** the player is on that stage and answers a question or a rebuttal in one of four ways.
- **The room:** the audience hears every answer; some are with one candidate and show it, some are undecided and listening.
- **After:** the moderator thanks both; people talk to candidates; the recording is posted; the local paper reports the exchange that stood out the next day.
- **What changes:** voters who heard it hold a changed view of one candidate; the exchange is retold at home; the paper's story is read.

## Ask the engine

| Packet line                                           | State                                                                                                                                                      | Files                                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Sponsor invites; two or more on ballot; two weeks out | record exists, nothing fires: `debate-week:<date>` schedules; `debates` table row (`status: invited`), outlet is the widest-reach one only                 | `src/core2/modules/meetings.ts` (`debateWeek`, `debateOutlet`); no chamber or League sponsor exists |
| Moderator                                             | no record: no moderator person or role; questions are picked by code                                                                                       | `meetings.ts` `debateQuestions`                                                                     |
| Questions from the moderator, or from cards           | record exists, nothing fires: `row.questions`, from each candidate's own record, widest gap, most divisive                                                 | `meetings.ts` `debateQuestions`, `interviewQuestions`; no audience-card source                      |
| Format (opening, timed answers, rebuttal, closing)    | no record: one pass of answers per question                                                                                                                | `meetings.ts` `holdDebate`                                                                          |
| The question about the record                         | record exists, nothing fires: a question is a topic string                                                                                                 | `meetings.ts`                                                                                       |
| Incumbent's answer                                    | record exists, nothing fires: `answers[personId]` is a position in -1..1 per question                                                                      | `meetings.ts` `candidateAnswers`                                                                    |
| Challenger's reply to the other's answer              | no record: answers are not made in answer to one another                                                                                                   | `holdDebate`                                                                                        |
| Player's turn, four stances                           | record exists, nothing fires: `answerDebate` takes positions only; no screen or type is built on it                                                        | `meetings.ts` `answerDebate`                                                                        |
| Room hears every answer                               | record exists, nothing fires: `makeStatements(act: "debate")` reaches the outlet's followers as `speech.heard`; `audience` is a count; `faceToFace: false` | `campaigns.ts:1830`, `meetings.ts` `holdDebate`                                                     |
| Audience shows support or doubt in the room           | no record: no attendee list for the hall, no reaction                                                                                                      | none                                                                                                |
| People talk to candidates after                       | record exists, nothing fires on a debate: `speech-afterward` is for a speech heard in person and excludes a debate by note                                 | `situation-types.json:2753`                                                                         |
| Local paper reports it                                | record exists and prints: `debate:<id>` (`news: true`) has a headline and lede; it names office, outlet and number of candidates, not the exchange         | `meetings.ts`, `src/bench/printed-words.ts:771`, `src/english/english-newscast.ts:113`              |
| Voters' views move and retell at home                 | record exists and is read: `deliverSpeech` per statement moves listeners by standing with the speaker                                                      | `campaigns.ts:1830`                                                                                 |

## Gaps

1. **No debate situation type** (producer, lead director). The record `debate:<id>` is written, but no type stages it. A new type `candidate-debate` on `debate:<id>`, place kind hall, cast: the player and each opponent from `personIds`, plus listeners from the audience.
2. **No moderator or room** (engine: meetings). Add a moderator drawn from the sponsor (outlet staff, a civic group's member, a library or chamber officer) and a hall's attendee list as people, so a scene can cast them.
3. **Answers don't answer each other** (engine: meetings). Add a rebuttal turn: after an answer, the next candidate's `holdDebate` row cites the answer it responds to, with the opponent's position and the fact it rests on (a vote or record id). Without it there is no opponent reply to show.
4. **Sponsor and format are not data** (engine: meetings). A League or chamber sponsor with a format row (timed answers, rebuttal, closing, card questions with screening), and the "two must attend" rule, so the room's rules are read, not written into lines.
5. **Player stance is a position only** (producer plus lines). The four reply stances need a stance-to-position map and a record on `scene.reply`, read by the voter-view engine.
6. **The paper's story has no substance** (lines, words lead). The `debate` story names office and outlet only; it should name the question and which candidate's answer moved the most listeners.
7. **No audience reaction** (engine: speech). Listeners' moves (`speech.heard`) are the only reaction record. A per-listener reaction line can be read from that move, no new dice.

## Lines the bank needs

**Moderator** (by sponsor kind and the moderator's manner: brisk, gentle, firm on time):

- Opens: welcomes the room, says who sponsors, reads the order and the time limits, says personal attacks will not be read.
- Puts a question: names the topic as a fact from the record ("the board split twice on the school this year"), asks the first candidate.
- Holds the clock: "That is time" and a request to let the other answer.
- Closes: thanks both, says the recording will be posted.

**Opponent** (by top trait; answers what the player said, naming the record fact):

- Points to the record and numbers (steady, proud).
- Takes the same fact and turns it ("that is not something to be proud of") (combative).
- Agrees in part and moves to their own plan (collegial).
- Skips the point and speaks to the room (evasive).

**Audience** (by closeness to the speaker; shown only as the moves in `speech.heard`): a murmur when a named fact lands; applause for a local plain statement; a neighbor in the third row looking at a phone while a long answer runs; an undecided voter nodding at the question and not at either answer; a card read by the moderator that the player's town cares about.

**Four replies when the player answers a question or rebuttal:**

1. **Answer straight:** gives the position and the one fact behind it, no turns.
2. **Turn to your own record:** names what the player did in office, in a job or on a board and what it cost or saved.
3. **Hit the opponent:** names the opponent's vote or promise and what it did to people here.
4. **Deflect:** speaks about the larger worry under the question and does not answer it.

## Other lives the same scene covers

- A school board forum run by a parents' group, questions on cards screened by a committee (Santa Clara and Santa Monica League practice, sources 4 and 5): same type, sponsor kind civic group, questions from cards.
- A public-access TV debate for county commissioner, one-on-one, with each candidate asking the other one question (Bainbridge format, source 1): same type, sponsor kind outlet, rebuttal turn and candidate-asked question.
