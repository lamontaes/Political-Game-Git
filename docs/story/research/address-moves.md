# How real addresses move, point by point

Research for the Story lead, Nov 24, 2026, by the Elections lane, for step 3 of the CTO's first-evening plan (#10377, comment 7122893350): "Count how real inaugurals and State of the State addresses move: how a point opens, whether it ends in an ask, how points join." It sets shape and rhythm only. No sentence below goes into a bank; each quote is the first words of a point, at most 15 words, so a reader can find the place in the source.

It tests the claim in `docs/research/speech-structure-2026-11-12.md` that "a point moves context → stand → ask", which `src/director/speech-outline.ts` built as "each point is context, stand, ask". Coded point by point, real addresses do not move that way.

## What was read

Twelve full texts, each read whole from the page linked under its table below:

- **Six presidential inaugurals:** Lincoln 1865, Franklin Roosevelt 1933, Kennedy 1961, Reagan 1981, George W. Bush 2001, Obama 2009 (three of each party).
- **Six 2024 State of the State addresses:** DeSantis (Florida), Kemp (Georgia), Cox (Utah), Hobbs (Arizona), Lujan Grisham (New Mexico), Lamont (Connecticut) (three of each party).

Four first picks failed to fetch or came back cut short and were replaced, never guessed: Moore (Maryland), Reeves (Mississippi), Polis (Colorado, truncated), and Roosevelt's text on Project Gutenberg (read instead from the American Presidency Project).

**Method.** A point is a run of paragraphs on one subject; the salutation and the closing blessing are not points. Each point is coded for:

- how it opens: claim, callback, contrast, fact, address to a group, thanks, story, question or quotation;
- how it ends: belief, image, pledge, ask of listeners, ask of lawmakers, fact, question, or none;
- how it joins the next: hard cut, callback, turn word, list, signpost or question;
- whether it states a figure.

One reader coded each speech, so where a point starts and ends is that reader's judgment. Counts are of 175 points: 76 from inaugurals and 99 from State of the State addresses.

## What the count says

**1. Few points end in an ask.**

| How a point ends                        | Inaugurals (76) | State of the State (99) | All (175) |
| --------------------------------------- | --------------- | ----------------------- | --------- |
| belief (a conviction or value)          | 42%             | 35%                     | 38%       |
| image (a picture or a line to remember) | 22%             | 14%                     | 18%       |
| pledge ("we will")                      | 18%             | 12%                     | 15%       |
| ask of the listeners                    | 11%             | 4%                      | 7%        |
| ask of the lawmakers                    | 1%              | 13%                     | 8%        |
| none (the subject just changes)         | 1%              | 12%                     | 7%        |
| fact                                    | 1%              | 7%                      | 5%        |
| question                                | 3%              | 2%                      | 2%        |

- 26 of 175 points (15%) end in an ask.
- Only 2 of 175 open on context (a fact or a contrast) and end in an ask, which is the shape the planner forces on every point.
- Asks per speech run from 0 (Lincoln, Lujan Grisham) to 8 (Hobbs), so how many asks a speech makes is a trait of the speaker and the kind of speech. It is not a per-point rule.
- Asks are spread through a speech (by quarter of the speech: 4, 7, 9, 6) and are not stacked at the end of each point.
- Lujan Grisham puts an ask in the middle of 10 points ("I am calling for", "I am asking the legislature for") and closes each of those points on a belief or an image. That is how an ask can live in a point without ending it.

**2. Most points open on a claim, not on context.**

| How a point opens                                  | Inaugurals | State | All |
| -------------------------------------------------- | ---------- | ----- | --- |
| claim                                              | 47%        | 41%   | 44% |
| callback (to something already said in the speech) | 14%        | 24%   | 20% |
| contrast (then and now, them and us)               | 12%        | 10%   | 11% |
| fact                                               | 5%         | 12%   | 9%  |
| address to a group ("To those who...")             | 13%        | 2%    | 7%  |
| thanks                                             | 3%         | 5%    | 4%  |
| story                                              | 3%         | 3%    | 3%  |
| question, quotation                                | 3%         | 2%    | 2%  |

- One point in five opens by calling back to the speech's own earlier words.
- The pieces need to know what came before: the owner's "It. What is it?"

**3. Points join in several ways, and inaugurals often just cut.**

| Join to the next point                    | Inaugurals | State | All |
| ----------------------------------------- | ---------- | ----- | --- |
| hard cut (no bridge)                      | 45%        | 19%   | 30% |
| callback                                  | 21%        | 29%   | 26% |
| turn word ("But", "Now", "And so", "For") | 16%        | 30%   | 24% |
| list ("Finally", "Another")               | 13%        | 11%   | 12% |
| signpost ("Let me turn to")               | 4%         | 5%    | 5%  |
| question                                  | 1%         | 2%    | 2%  |

A signpost is the rarest join; one in twenty points uses it.

**4. Speech-level shapes, the part the outline should choose between.** Each speech has one or two of these. None has all of them.

- **A refrain** carries the speech, and the policies hang off it: Bush's "America, at its best...", Cox's "weird", Lujan Grisham's "made to lead", Hobbs's "supporting Arizona families also means". That is 4 of 12.
- **A parallel run of addresses:** a string of points that each open "To those..." to a different group. Kennedy has six in a row; Reagan and Obama have shorter runs. That is 3 of 12.
- **One story late in the speech that reframes it:** Reagan's soldier, Cox's great-uncle, Bush's letter from John Page. That is 3 of 12. The other speeches put named people inside a point as proof and never open on them. DeSantis and Kemp both bring people in the room into the middle of a point.
- **A close that returns to the opening, or to the speech's own earlier line:** Bush, Cox, Lujan Grisham, Lamont. That is 4 of 12.
- **An inventory:** a run of "our budget provides..." points joined by "Speaking of" (Lamont), or a closing list of wins (DeSantis). That is 2 of 12, all State of the State.
- **A diagnosis first:** several points name the trouble with no ask, then the acts come late (Roosevelt, Reagan, Obama). That is 3 of 12.

**5. How a speech opens and closes.**

- **Openings:** occasion in 7 of 12 ("This is a day of national consecration", "What a year it has been"), thanks in 2, a claim in 2, humor in 1.
- **Closings:** a blessing in 9 of 12, usually right after a pledge, an image or a call.

**6. Figures.** 13% of inaugural points state a figure and 71% of State of the State points do. The game's standing rule (no figures in speeches) overrides this. The count is here only so that the context sentence the planner adds to every point is seen for what it is: a State-of-the-State budget habit applied to the President.

## What this suggests for the outline (for the Story lead to decide)

1. **Stop forcing a point's shape.** A point's ending is chosen from belief, image, pledge, ask or none, with weights by kind of speech: an inaugural leans on belief, image and pledge, and a State of the State adds asks of lawmakers and plain stops. An ask may sit mid-point, followed by a belief.
2. **Set asks per speech, not per point.** The speaker's traits and the kind of speech give how many asks the speech carries, from 0 up. Most inaugural points carry none.
3. **Choose one or two speech-level shapes per speech** from section 4, by the speaker's traits and the world: refrain, parallel addresses, late story, a close that returns to the opening, diagnosis first. That gives two speeches different skeletons even on the same subject.
4. **Mix the joins:** hard cuts, callbacks and turn words in roughly equal measure, with signposts rare. A callback join needs the pieces to know what was said before.
5. **Drop the context sentence as a point opener.** Openers are mostly claims, callbacks and contrasts; a fact opens fewer than one point in ten.
6. `docs/research/speech-structure-2026-11-12.md` makes the opposite claim ("a point moves context → stand → ask"). If the outline is rebuilt on this count, that file's claim goes in the same change.

## The twelve speeches, coded

## Abraham Lincoln, Second Inaugural Address, March 4, 1865

https://avalon.law.yale.edu/19th_century/lincoln2.asp
Read whole: 4 paragraphs after "Fellow-Countrymen"; paragraph 4 is the close.

| n   | subject                          | opens with | ends with | join     | figures | quote                                                                                       |
| --- | -------------------------------- | ---------- | --------- | -------- | ------- | ------------------------------------------------------------------------------------------- |
| 1   | Little need for a long address   | claim      | belief    | callback | no      | "At this second appearing to take the oath of the Presidential office"                      |
| 2   | Four years ago, war coming       | callback   | image     | hard-cut | no      | "On the occasion corresponding to this four years ago all thoughts were anxiously directed" |
| 3   | Slavery as cause, God's judgment | fact       | belief    | hard-cut | yes     | "One-eighth of the whole population were colored slaves"                                    |

- Opening: occasion. "At this second appearing to take the oath of the Presidential office"
- Closing: pledge and call. "With malice toward none, with charity for all, with firmness in the right"
- 3 points; ~700 words; 0 points end in an ask; 1 with figures.
- Shape: no policy asks, no point cycle; occasion, narrated cause, theological verdict; the only call is in the close.

## Franklin D. Roosevelt, First Inaugural Address, March 4, 1933

https://www.presidency.ucsb.edu/documents/inaugural-address-8
Read whole (as-delivered transcript): 25 paragraphs after "President Hoover, Mr. Chief Justice, My Friends"; last is the blessing; 12 points.

| n   | subject                           | opens with | ends with     | join      | figures | quote                                                                                   |
| --- | --------------------------------- | ---------- | ------------- | --------- | ------- | --------------------------------------------------------------------------------------- |
| 1   | Consecration, truth, fear itself  | claim      | belief        | callback  | no      | "This is a day of national consecration."                                               |
| 2   | Material woes, unemployment       | callback   | belief        | turn-word | no      | "In such a spirit on my part and on yours we face our common difficulties."             |
| 3   | Money changers' failure           | contrast   | image         | callback  | no      | "And yet, our distress comes from no failure of substance."                             |
| 4   | Restoring values, then action     | callback   | belief        | callback  | no      | "Yes, the money changers have fled from their high seats in the temple"                 |
| 5   | Put people to work                | claim      | ask-listeners | list      | no      | "Our greatest primary task is to put people to work."                                   |
| 6   | Banking safeguards, plan          | claim      | pledge        | callback  | yes     | "Finally, in our progress toward a resumption of work we require two safeguards"        |
| 7   | Home economy first                | callback   | belief        | signpost  | no      | "Through this program of action we address ourselves to putting our own"                |
| 8   | Good neighbor policy              | claim      | image         | hard-cut  | no      | "In the field of world policy I would dedicate this Nation to the policy"               |
| 9   | Disciplined army, leadership      | claim      | pledge        | callback  | no      | "If I read the temper of our people correctly, we now realize"                          |
| 10  | Constitution can meet emergency   | callback   | fact          | turn-word | no      | "Action in this image, action to this end is feasible under the form of government"     |
| 11  | Executive power if Congress fails | claim      | ask-lawmakers | hard-cut  | no      | "And, it is to be hoped that the normal balance of Executive and legislative authority" |
| 12  | Trust, unity, mandate             | thanks     | pledge        | hard-cut  | no      | "For the trust reposed in me I will return the courage and the devotion"                |

- Opening: occasion. "This is a day of national consecration."
- Closing: blessing. "In this dedication of a Nation we humbly ask the blessing of God."
- 12 points; ~1,880 words; 2 end in an ask (3 if "asking for action, and action now" counts); 1 with figures.
- Shape: four points of diagnosis with no ask; asks come late and escalate; ends on a pledge and blessing, not a call.

## John F. Kennedy, Inaugural Address, January 20, 1961

https://www.presidency.ucsb.edu/documents/inaugural-address-2
Read whole: 27 paragraphs after the salutation; last is the close; 13 points.

| n   | subject                         | opens with | ends with     | join      | figures | quote                                                                                      |
| --- | ------------------------------- | ---------- | ------------- | --------- | ------- | ------------------------------------------------------------------------------------------ |
| 1   | Oath, renewal, old beliefs      | claim      | belief        | callback  | no      | "We observe today not a victory of party but a celebration of freedom"                     |
| 2   | Torch passed, price for liberty | callback   | pledge        | signpost  | no      | "We dare not forget today that we are the heirs of that first revolution."                 |
| 3   | Pledge to old allies            | address    | belief        | list      | no      | "To those old allies whose cultural and spiritual origins we share"                        |
| 4   | Pledge to new states            | address    | image         | list      | no      | "To those new states whom we welcome to the ranks of the free"                             |
| 5   | Help for the world's poor       | address    | belief        | list      | no      | "To those peoples in the huts and villages of half the globe"                              |
| 6   | Alliance with Latin America     | address    | pledge        | list      | no      | "To our sister republics south of our border, we offer a special pledge"                   |
| 7   | Support for the United Nations  | address    | pledge        | list      | no      | "To that world assembly of sovereign states, the United Nations, our last best hope"       |
| 8   | Adversaries, arms               | address    | image         | turn-word | no      | "Finally, to those nations who would make themselves our adversary, we offer not a pledge" |
| 9   | Begin anew: joint proposals     | callback   | image         | callback  | no      | "So let us begin anew--remembering on both sides that civility is not a sign"              |
| 10  | Work will outlast this term     | callback   | ask-listeners | hard-cut  | yes     | "All this will not be finished in the first one hundred days."                             |
| 11  | Citizens' hands, long struggle  | claim      | question      | hard-cut  | no      | "In your hands, my fellow citizens, more than mine, will rest the final success"           |
| 12  | This generation's role          | claim      | image         | turn-word | no      | "In the long history of the world, only a few generations have been granted"               |
| 13  | "Ask not"                       | address    | ask-listeners | list      | no      | "And so, my fellow Americans: ask not what your country can do for you"                    |

- Opening: occasion. "We observe today not a victory of party but a celebration of freedom"
- Closing: blessing with a call. "let us go forth to lead the land we love, asking His blessing"
- 13 points; ~1,360 words; 2 end in an ask (4 counting a question and a "let both sides" image); 1 with figures.
- Shape: a parallel run of "To those..." address-and-pledge units; asks only at the end, aimed at citizens.

## Ronald Reagan, Inaugural Address, January 20, 1981

https://www.presidency.ucsb.edu/documents/inaugural-address-11
Read in full.

| n   | subject                                    | opens with | ends with     | join      | figures | quote                                                                                       |
| --- | ------------------------------------------ | ---------- | ------------- | --------- | ------- | ------------------------------------------------------------------------------------------- |
| 1   | Orderly transfer; thanks to Carter         | contrast   | belief        | hard-cut  | yes     | "To a few of us here today this is a solemn and most momentous occasion"                    |
| 2   | Inflation, deficits, must act              | claim      | belief        | callback  | no      | "The business of our nation goes forward."                                                  |
| 3   | Government is the problem                  | claim      | belief        | hard-cut  | no      | "In this present crisis, government is not the solution to our problem"                     |
| 4   | Ordinary Americans as the special interest | contrast   | image         | turn-word | no      | "We hear much of special interest groups."                                                  |
| 5   | Goal: growth and equal opportunity         | claim      | belief        | turn-word | no      | "Well, this administration's objective will be a healthy, vigorous, growing economy"        |
| 6   | Curbing federal power                      | claim      | belief        | hard-cut  | no      | "So, as we begin, let us take inventory."                                                   |
| 7   | Freedom's past; renewal                    | claim      | ask-listeners | hard-cut  | no      | "If we look to the answer as to why for so many years we achieved"                          |
| 8   | Everyday heroes                            | claim      | pledge        | hard-cut  | no      | "We have every right to dream heroic dreams."                                               |
| 9   | Compassion                                 | claim      | question      | question  | no      | "We shall reflect the compassion that is so much a part of your makeup."                    |
| 10  | Yes we can; first priorities               | question   | pledge        | hard-cut  | no      | "Can we solve the problems confronting us?"                                                 |
| 11  | Joseph Warren quote                        | quotation  | image         | hard-cut  | no      | "On the eve of our struggle for independence a man who might"                               |
| 12  | Allies and adversaries                     | address    | belief        | hard-cut  | no      | "To those neighbors and allies who share our freedom, we will strengthen our historic ties" |
| 13  | Day of prayer                              | fact       | ask-listeners | hard-cut  | yes     | "I'm told that tens of thousands of prayer meetings are being held on this day"             |
| 14  | West Front vista, memorials                | fact       | image         | callback  | yes     | "This is the first time in our history that this ceremony has been held"                    |
| 15  | Martin Treptow's diary                     | story      | image         | callback  | yes     | "Under one such marker lies a young man, Martin Treptow, who left his job"                  |
| 16  | Today needs belief, not that sacrifice     | callback   | belief        | hard-cut  | no      | "The crisis we are facing today does not require of us the kind of sacrifice"               |

- Opening: occasion. "To a few of us here today this is a solemn and most momentous occasion"
- Closing: a question as image, then blessing. "And after all, why shouldn't we believe that? We are Americans."
- 16 points; ~2,400 words; 2 end in an ask (listeners); 4 with figures.
- Shape: argument that builds to one named soldier's story, which reframes the whole speech; almost no point ends in a request.

## George W. Bush, First Inaugural Address, January 20, 2001

https://teachingamericanhistory.org/document/first-inaugural-address-gwbush/
Read in full (reproduces the American Presidency Project transcript).

| n   | subject                           | opens with | ends with     | join      | figures | quote                                                                                          |
| --- | --------------------------------- | ---------- | ------------- | --------- | ------- | ---------------------------------------------------------------------------------------------- |
| 1   | Peaceful transfer; thanks         | claim      | none          | hard-cut  | no      | "the peaceful transfer of authority is rare in history, yet common in our country."            |
| 2   | The American story                | claim      | belief        | hard-cut  | no      | "I am honored and humbled to stand here"                                                       |
| 3   | Freedom's faith then and now      | contrast   | belief        | turn-word | yes     | "Through much of the last century, America's faith in freedom and democracy was a rock"        |
| 4   | Divided nation                    | contrast   | belief        | callback  | no      | "While many of our citizens prosper, others doubt the promise, even the justice, of our"       |
| 5   | Ideals unite, not blood           | claim      | belief        | hard-cut  | no      | "America has never been united by blood or birth or soil."                                     |
| 6   | Civility                          | claim      | belief        | list      | no      | "Today, we affirm a new commitment to live out our nation's promise through civility, courage" |
| 7   | Courage                           | claim      | ask-listeners | hard-cut  | no      | "America, at its best, is also courageous."                                                    |
| 8   | Schools, Social Security, taxes   | claim      | pledge        | hard-cut  | no      | "Together, we will reclaim America's schools"                                                  |
| 9   | Defense                           | claim      | pledge        | list      | no      | "We will build our defenses beyond challenge, lest weakness invite challenge."                 |
| 10  | Compassion                        | claim      | belief        | hard-cut  | no      | "America, at its best, is compassionate."                                                      |
| 11  | Government's limits; faith groups | claim      | pledge        | list      | no      | "Government has great responsibilities for public safety and public health"                    |
| 12  | Personal responsibility           | claim      | belief        | hard-cut  | no      | "America, at its best, is a place where personal responsibility is valued and expected."       |
| 13  | Small things with great love      | contrast   | belief        | hard-cut  | no      | "Sometimes in life we are called to do great things."                                          |
| 14  | Personal pledge                   | claim      | pledge        | hard-cut  | no      | "I will live and lead by these principles"                                                     |
| 15  | Citizens asked to serve           | claim      | belief        | hard-cut  | no      | "What you do is as important as anything government does."                                     |
| 16  | John Page letter                  | story      | image         | hard-cut  | no      | "After the Declaration of Independence was signed, Virginia statesman John Page wrote"         |

- Opening: occasion. "the peaceful transfer of authority is rare in history, yet common in our country."
- Closing: callback to the story, then blessing. "This work continues. This story goes on."
- 16 points; ~1,600 words; 1 ends in an ask (an "I ask you" sits mid-point in 15); 1 with figures.
- Shape: a refrain ("America, at its best...") with four virtues as its parts; agenda items sit inside the virtues.

## Barack Obama, Inaugural Address, January 20, 2009

https://www.presidency.ucsb.edu/documents/inaugural-address-5
Read in full.

| n   | subject                      | opens with | ends with     | join      | figures | quote                                                                                        |
| --- | ---------------------------- | ---------- | ------------- | --------- | ------- | -------------------------------------------------------------------------------------------- |
| 1   | Oath's history; storms       | fact       | belief        | hard-cut  | yes     | "Forty-four Americans have now taken the Presidential oath."                                 |
| 2   | Crisis list                  | claim      | belief        | hard-cut  | no      | "That we are in the midst of crisis is now well understood."                                 |
| 3   | Hope over fear               | claim      | belief        | callback  | no      | "On this day, we gather because we have chosen hope over fear"                               |
| 4   | Ancestors who built it       | claim      | image         | callback  | no      | "In reaffirming the greatness of our Nation, we understand that greatness is never a given." |
| 5   | Capacity intact; begin again | callback   | ask-listeners | turn-word | no      | "This is the journey we continue today."                                                     |
| 6   | Agenda                       | claim      | pledge        | turn-word | no      | "For everywhere we look, there is work to be done."                                          |
| 7   | Critics of big plans         | contrast   | belief        | callback  | no      | "Now, there are some who question the scale of our ambitions"                                |
| 8   | The market                   | callback   | belief        | signpost  | no      | "Nor is the question before us whether the market is a force"                                |
| 9   | Safety and ideals            | claim      | pledge        | turn-word | no      | "As for our common defense, we reject as false the choice between our safety and"            |
| 10  | Patchwork heritage           | claim      | belief        | hard-cut  | no      | "For we know that our patchwork heritage is a strength, not a weakness."                     |
| 11  | Muslim world, other nations  | address    | belief        | hard-cut  | no      | "To the Muslim world, we seek a new way forward"                                             |
| 12  | Troops; spirit of service    | thanks     | ask-listeners | turn-word | no      | "As we consider the road that unfolds before us, we remember with humble gratitude"          |
| 13  | Ordinary Americans' faith    | contrast   | image         | hard-cut  | no      | "For as much as Government can do and must do, it is ultimately the faith"                   |
| 14  | Old values, new era          | contrast   | image         | turn-word | yes     | "Our challenges may be new."                                                                 |
| 15  | Valley Forge                 | claim      | image         | callback  | no      | "So let us mark this day with remembrance of who we are"                                     |
| 16  | Winter of hardship           | address    | image         | hard-cut  | no      | "America, in the face of our common dangers, in this winter of our hardship"                 |

- Opening: thanks. "I stand here today humbled by the task before us, grateful for the trust"
- Closing: call and image, then blessing. "Let it be said by our children's children that when we were tested"
- 16 points; ~2,400 words; 2 end in an ask (listeners); 2 with figures.
- Shape: crisis, history, agenda, world, duty; half the points end on belief or image; "For / Nor / Now" and echoed words carry the joins.

## Gov. Ron DeSantis (R), Florida, State of the State, January 9, 2024

https://www.flgov.com/eog/news/press/2024/governor-ron-desantis-delivers-state-state-address
Read in full.

| n   | subject                              | opens with | ends with            | join      | figures | quote                                                                                                        |
| --- | ------------------------------------ | ---------- | -------------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | National upheaval, Florida's choices | claim      | belief               | callback  | yes     | "We are in the midst of a great upheaval throughout the nation:"                                             |
| 2   | Rankings, stay the course            | callback   | ask-lawmakers (soft) | hard-cut  | yes     | "Our choices have produced results that are second to none:"                                                 |
| 3   | School choice (a named student)      | claim      | image                | callback  | yes     | "We lead the nation in school choice."                                                                       |
| 4   | Parents' rights                      | callback   | image                | callback  | no      | "We also lead the nation in protecting the rights of parents."                                               |
| 5   | Teacher pay (a named teacher)        | callback   | fact                 | hard-cut  | yes     | "As we deliver win after win for parents, we have also provided historic support"                            |
| 6   | Oct. 7, Jewish students              | story      | none                 | callback  | no      | "On October 7th, Israel suffered one of the worst terrorist attacks in modern history."                      |
| 7   | Campus reform, tuition               | callback   | fact                 | turn-word | yes     | "The pro-Hamas activities and rampant antisemitism on college campuses exposed the intellectual rot"         |
| 8   | Workforce education                  | contrast   | belief               | hard-cut  | yes     | "While higher education is important, a degree from a four-year brick-and-ivy university is not"             |
| 9   | Debt paydown, budget                 | fact       | fact                 | callback  | yes     | "The recklessness of spending, borrowing and printing of money over the past four years"                     |
| 10  | Tax and toll relief (a named man)    | thanks     | ask-lawmakers        | callback  | yes     | "Last year I asked the Legislature to reduce taxes on families as a way"                                     |
| 11  | Police recruitment                   | callback   | none                 | turn-word | yes     | "Our low tax burden, AAA credit rating and great business environment have attracted families, businesses"   |
| 12  | Border, victims present              | contrast   | image                | hard-cut  | yes     | "Still, with all our successful efforts to provide law and order, the"                                       |
| 13  | Hurricane response                   | story      | none                 | hard-cut  | yes     | "Last year, hundreds of Floridians had their homes destroyed or rendered uninhabitable by Hurricane Idalia." |
| 14  | Everglades, conservation             | thanks     | pledge               | signpost  | yes     | "With your support, we have made good on our promise to leave Florida to God"                                |
| 15  | List of accomplishments              | claim      | image                | hard-cut  | no      | "Before I close, it is worth pointing out some more accomplishments that"                                    |
| 16  | Liberty Bell, closing charge         | fact       | pledge               | end       | no      | "Just outside of this capitol building there sits a replica of the Liberty Bell"                             |

- Opening: claim. "We are in the midst of a great upheaval throughout the nation:"
- Closing: pledge and image, no blessing. "Together, we will keep Florida free and provide hope for a revival"
- 16 points; ~3,400 words; 2 end in an ask (both lawmakers, one soft); 12 with figures; 0 open on a named-person story; named people (seven in the room) are set inside points as proof.
- Shape: named people dropped mid-point as proof; ends on a long list of wins; asks rare and late.

## Gov. Brian Kemp (R), Georgia, State of the State, January 11, 2024

https://www.wsbtv.com/news/local/read-gov-brian-kemps-2024-state-state-address/ODQCKR5IUVEA3MLPWQCKFPVC6A/?outputType=amp
Read in full. (Stands in for Gov. Wes Moore, whose page failed.)

| n   | subject                              | opens with | ends with     | join      | figures | quote                                                                                                              |
| --- | ------------------------------------ | ---------- | ------------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------ |
| 1   | Election stakes, Washington's burden | claim      | belief        | turn-word | yes     | "Later this year, the people of this state will once again fulfill their civic duty"                               |
| 2   | Georgia's different path             | contrast   | belief        | callback  | no      | "But here in Georgia, we've chosen a different path."                                                              |
| 3   | Families met campaigning, tax cut    | callback   | ask-lawmakers | callback  | yes     | "Those were the hardworking Georgians we heard from on the campaign trail."                                        |
| 4   | State of the state is strong         | callback   | belief        | turn-word | yes     | "The path Georgia has taken over the last five years has led"                                                      |
| 5   | Don't coast; workforce               | claim      | pledge        | signpost  | yes     | "But I believe the worst thing we could do is call it a day"                                                       |
| 6   | K-12 budget                          | fact       | none          | callback  | yes     | "Speaking of education, my amended 2024 budget and fiscal year 2025 budget proposals double down"                  |
| 7   | School choice                        | claim      | ask-lawmakers | list      | yes     | "It's also important for us to remember that increased funding does not"                                           |
| 8   | School security                      | claim      | ask-lawmakers | hard-cut  | yes     | "Finally, our students and teachers deserve to have a safe learning environment,"                                  |
| 9   | Public safety, a trooper's story     | claim      | belief        | hard-cut  | no      | "Since being sworn in as your 83rd governor, a top priority of"                                                    |
| 10  | Police pay                           | quotation  | belief        | list      | yes     | "Article I, Section I, Paragraph II of the Georgia Constitution states:"                                           |
| 11  | Human trafficking                    | claim      | pledge        | hard-cut  | yes     | "This year we will also be continuing our efforts to combat human"                                                 |
| 12  | Healthcare costs                     | claim      | belief        | turn-word | yes     | "Five years into my administration, when it comes to healthcare, we have made enormous strides"                    |
| 13  | Mental health                        | callback   | belief        | callback  | yes     | "And because we have made sound policy choices, budgeted conservatively, and prioritize innovation and efficiency" |
| 14  | State employee pay                   | claim      | belief        | hard-cut  | yes     | "As we speak, all across Georgia, there are men and women working hard to keep"                                    |
| 15  | Crossroads, states as laboratories   | claim      | belief        | hard-cut  | no      | "As we look across America, there is no doubt we are at a crossroads."                                             |
| 16  | Election-year plea                   | address    | ask-lawmakers | end       | yes     | "In an election year, I don't expect us all to agree on every issue."                                              |

- Opening: occasion. "Later this year, the people of this state will once again fulfill their civic duty"
- Closing: call to act, then blessing. "Let's use this session to keep it that way!"
- 16 points; ~4,100 words; 4 end in an ask (all lawmakers); 13 with figures; 0 open on a named-person story (a trooper and his wife in the room, inside point 9).
- Shape: most points open on a claim and close on belief, not an ask; a running contrast with Washington binds them; asks cluster in education and safety and the final plea.

## Gov. Spencer Cox (R), Utah, State of the State, January 18, 2024

https://sltrib.com/news/politics/2024/01/18/read-gov-spencer-cox-discusses
Read in full (text from the governor's office).

| n   | subject                  | opens with | ends with     | join      | figures | quote                                                                                     |
| --- | ------------------------ | ---------- | ------------- | --------- | ------- | ----------------------------------------------------------------------------------------- |
| 1   | Utah's peculiar people   | story      | image         | turn-word | no      | "In 1847, a group of peculiar people arrived in Utah"                                     |
| 2   | Rankings                 | contrast   | none          | list      | yes     | "But there is another way in which Utah is different, and even a little weird."           |
| 3   | Social mobility study    | fact       | belief        | list      | no      | "The first comes from a research study on the American dream"                             |
| 4   | Zero-sum study           | fact       | image         | callback  | no      | "The second study is even more fascinating to me."                                        |
| 5   | Tax cut, teacher pay     | callback   | fact          | list      | yes     | "Our prosperity and abundance mindset was on display in last year's legislative session." |
| 6   | Water, Great Salt Lake   | contrast   | pledge        | hard-cut  | yes     | "We were also faced with drought and water insecurity, and rejected the scarcity mindset" |
| 7   | Social media and youth   | claim      | belief        | turn-word | no      | "Utah's ability to solve hard problems received national attention"                       |
| 8   | When politics is binary  | claim      | belief        | callback  | yes     | "Sometimes, though, politics is binary. It's not always possible to find a win-win."      |
| 9   | Disagree Better          | callback   | belief        | turn-word | no      | "Oh, and speaking of how weird Utah can be"                                               |
| 10  | Growth                   | claim      | ask-listeners | turn-word | yes     | "And so we find ourselves at the beginning of another 45-day legislative session."        |
| 11  | Housing                  | claim      | belief        | turn-word | yes     | "To that end, I believe the single largest threat to our future"                          |
| 12  | Homelessness             | claim      | pledge        | turn-word | no      | "Now, there is another troubling trend happening across our country"                      |
| 13  | Spending accountability  | callback   | belief        | signpost  | no      | "Now when I talk about accountability, I'm also referring to us as public servants"       |
| 14  | Other issues             | claim      | none          | list      | no      | "Of course, there are many other issues that need 'Utah weird' solutions."                |
| 15  | Service initiatives      | claim      | belief        | callback  | no      | "And finally, I ask you to support the service initiatives I've proposed this session"    |
| 16  | His great-uncle's story  | callback   | image         | callback  | yes     | "On that note, I started this speech talking about how weird we are."                     |
| 17  | Lesson: change your town | address    | belief        | turn-word | no      | "Ladies and gentlemen, I think we need more of this kind of weird today."                 |
| 18  | The legislators as heirs | thanks     | belief        | hard-cut  | yes     | "Fortunately, we are in a room full of them tonight."                                     |

- Opening: humor. "please hold any applause until the end of the speech"
- Closing: callback to the opening theme, then blessing. "So, stay weird, Utah. And may God bless each of you."
- 18 points; ~4,200 words; 1 ends in an ask; 8 with figures; 1 opens on a named-person story (a dead relative, point 16).
- Shape: one thesis runs the whole way and the policies are evidence for it; climaxes in a long story about one man; ends on the theme, not an ask.

## Gov. Katie Hobbs (D), Arizona, State of the State, January 8, 2024

https://ktar.com/arizona-news/read-full-transcript-of-arizona-gov-katie-hobbs-2024-state-of-the-state-address-2/5556443/
Read in full.

| n   | subject                      | opens with | ends with     | join      | figures | quote                                                                                                       |
| --- | ---------------------------- | ---------- | ------------- | --------- | ------- | ----------------------------------------------------------------------------------------------------------- |
| 1   | Why we serve                 | thanks     | belief        | turn-word | no      | "We have worked together, debated each other, pushed one another, and"                                      |
| 2   | Border security              | claim      | ask-listeners | turn-word | yes     | "That's why we cannot go forward without first addressing Washington's ongoing failure to secure"           |
| 3   | Budget shortfall             | fact       | pledge        | turn-word | yes     | "We face an approximately eight hundred and fifty million dollar shortfall"                                 |
| 4   | Jobs, investment             | claim      | ask-lawmakers | callback  | yes     | "Despite our budget issues, we have much to be proud of in our amazing state."                              |
| 5   | Bipartisan record; workforce | callback   | belief        | callback  | no      | "As I said, we're just getting started, so now is not the time to rest."                                    |
| 6   | Rural and tribal broadband   | claim      | belief        | turn-word | yes     | "We will continue this success by building the infrastructure"                                              |
| 7   | Housing                      | contrast   | pledge        | signpost  | yes     | "As you can see, our state's economy is strong and its opportunities are abundant."                         |
| 8   | Water                        | claim      | pledge        | hard-cut  | yes     | "Of course, to discuss Arizona's future, we must also talk about water"                                     |
| 9   | Public schools, teacher pay  | claim      | ask-lawmakers | list      | yes     | "I was born and raised in Arizona, and I chose to raise my family here."                                    |
| 10  | Voucher accountability       | claim      | ask-listeners | signpost  | yes     | "In this upcoming session, we must also address the long-term health of our K-12 schools"                   |
| 11  | Higher education             | claim      | ask-lawmakers | list      | yes     | "Turning our attention to higher education, our state universities continue to lead the way"                |
| 12  | Long-term care               | claim      | ask-lawmakers | turn-word | yes     | "Supporting Arizona families also means protecting our loved ones"                                          |
| 13  | Children's healthcare        | claim      | ask-lawmakers | list      | no      | "Now, supporting Arizona families also means ensuring our children have access to high-quality healthcare." |
| 14  | Prescription prices          | claim      | image         | callback  | no      | "Another area where we can provide relief and make a huge difference in the lives"                          |
| 15  | Reproductive freedom         | claim      | ask-lawmakers | hard-cut  | no      | "I believe that fighting for Arizona families is the foundation of what we do"                              |

- Opening: occasion. "What a year it has been."
- Closing: blessing and call. "God bless Arizona and let's get to work."
- 15 points; ~5,300 words; 8 end in an ask (2 listeners, 6 lawmakers); 10 with figures; 0 open on a named-person story.
- Shape: the closest of the twelve to topic-then-ask, but held together by a "families" thread and "supporting Arizona families also means" links; no story at its center.

## Gov. Michelle Lujan Grisham (D), New Mexico, State of the State, January 16, 2024

https://governor.state.nm.us/2024/01/16/new-mexico-is-made-to-lead-governor-delivers-second-state-of-the-state-address-announces-legislative-agenda
Read in full (as prepared). Stands in for Gov. Tate Reeves, whose page failed.

| n   | subject                   | opens with | ends with | join      | figures | quote                                                                                                 |
| --- | ------------------------- | ---------- | --------- | --------- | ------- | ----------------------------------------------------------------------------------------------------- |
| 1   | Jobs and wages            | claim      | fact      | turn-word | yes     | "When I became governor in 2019, I promised to lay a strong foundation"                               |
| 2   | Clean energy              | claim      | belief    | turn-word | yes     | "At the same time, we are ensuring that our young people inherit a state"                             |
| 3   | Record revenues           | fact       | image     | question  | yes     | "And with record state revenues, we are growing our financial strength"                               |
| 4   | What's next?              | question   | belief    | turn-word | yes     | "The question we need to ask is, 'What's next?'"                                                      |
| 5   | Water supply, energy fund | callback   | pledge    | callback  | yes     | "Now, let's capitalize on this momentum."                                                             |
| 6   | Infrastructure            | callback   | belief    | callback  | yes     | "Delivering on the promise of a clean energy future requires modern, efficient infrastructure"        |
| 7   | Housing                   | callback   | belief    | hard-cut  | yes     | "We need to take the same forward-looking approach to housing"                                        |
| 8   | Health care               | claim      | image     | hard-cut  | yes     | "The health of our communities – and of our families – remains"                                       |
| 9   | Literacy                  | claim      | belief    | turn-word | yes     | "As we look towards the future, we are also looking towards our young people"                         |
| 10  | 180-day school year       | callback   | none      | turn-word | yes     | "That's why I am calling for an expansion of the school year to 180 days"                             |
| 11  | School accountability     | contrast   | belief    | callback  | yes     | "At the same time, we need to ensure our school districts are accountable"                            |
| 12  | Gun violence              | callback   | belief    | callback  | yes     | "We're demanding better and delivering better in areas from education, to healthcare"                 |
| 13  | Repeat offenders          | claim      | belief    | callback  | no      | "We know that the violence in our communities is frequently committed by career criminals"            |
| 14  | Roots of public safety    | contrast   | belief    | turn-word | no      | "It's important to recognize that public safety challenges don't begin with violent crimes."          |
| 15  | Clean-up initiative       | callback   | belief    | callback  | yes     | "That's why, today, I am calling for an aggressive 43 million dollars statewide clean-up initiative." |
| 16  | Recap and vision          | callback   | image     | end       | no      | "Through all of these actions – in our economy and our infrastructure, housing and healthcare"        |

- Opening: thanks. "I am grateful to all our lawmakers and tribal leaders here today"
- Closing: callback to her own earlier line, then blessing. "This is New Mexico – and we are made to lead."
- 16 points; ~3,900 words; 0 end in an ask, though 10 carry an ask mid-point ("I am asking the legislature for"), always followed by a closing sentence of belief or image; 13 with figures.
- Shape: asks buried mid-point; each point closes on a value or image; a "what's next / made to lead" refrain links them.

## Gov. Ned Lamont (D), Connecticut, State of the State, February 7, 2024

https://www.nbcconnecticut.com/news/local/read-the-governors-2024-state-of-the-state-address/3213365/
Read in full (as prepared). Stands in for Gov. Jared Polis, whose page came back truncated.

| n   | subject                      | opens with | ends with     | join      | figures | quote                                                                                        |
| --- | ---------------------------- | ---------- | ------------- | --------- | ------- | -------------------------------------------------------------------------------------------- |
| 1   | Budget recap; growth         | fact       | fact          | turn-word | yes     | "Eight months ago, we passed – on a strongly bipartisan basis – a two-year budget"           |
| 2   | Housing model towns          | claim      | image         | callback  | yes     | "One warning sign: we have too many people who cannot find a place to live"                  |
| 3   | Infrastructure, rail         | fact       | belief        | callback  | yes     | "The federal infrastructure law is especially important to Connecticut"                      |
| 4   | Housing costs, homelessness  | thanks     | question      | hard-cut  | yes     | "Seila Mosquera-Bruno, commissioner of Housing, knows that the biggest driver of high costs" |
| 5   | Density, open space          | fact       | none          | turn-word | yes     | "We are one of the densest states in the country"                                            |
| 6   | Weather, grid                | contrast   | ask-lawmakers | callback  | no      | "But you better check the weather."                                                          |
| 7   | Extreme behavior; hope       | callback   | question      | question  | no      | "Sadly, it is not just the weather that is becoming more extreme."                           |
| 8   | Service centers, sick days   | fact       | pledge        | hard-cut  | no      | "The DSS Service Centers, where you can get your SNAP benefits or Medicaid renewals"         |
| 9   | Childcare                    | fact       | none          | callback  | yes     | "Our budget provides the biggest commitment to childcare in our history"                     |
| 10  | Teachers, absenteeism, meals | callback   | image         | list      | yes     | "Our expanded childcare feeds into our nation's best K-12 education system"                  |
| 11  | Phones in school             | claim      | ask-listeners | list      | yes     | "There is one more distraction in the elementary school classroom: social media."            |
| 12  | College, research            | claim      | pledge        | turn-word | yes     | "We are trying to make the path to college easier as well."                                  |
| 13  | Healthcare                   | claim      | none          | turn-word | yes     | "Of course, healthcare only makes a difference if it is accessible and affordable."          |
| 14  | Tax cuts                     | callback   | fact          | callback  | yes     | "Speaking of affordability, our tax credit for working families"                             |
| 15  | Local government             | callback   | none          | turn-word | yes     | "Our budget is doing more, but we must also focus on doing better."                          |
| 16  | Pensions                     | contrast   | image         | callback  | yes     | "Like too many of our citizens, Connecticut in years past was living paycheck to paycheck"   |
| 17  | Building wealth              | claim      | none          | turn-word | yes     | "Our budget is trying to provide the same security for our citizens"                         |
| 18  | Ask: vote                    | claim      | belief        | turn-word | no      | "One thing I ask in return: vote. It makes a difference."                                    |

- Opening: claim. "Eight months ago, we passed – on a strongly bipartisan basis – a two-year budget"
- Closing: callback to an earlier joke; no blessing. "Maybe in D.C., partisans should be required to check their smartphones"
- 18 points; ~3,600 words; 2 end in an ask; 14 with figures; 0 open on a named-person story.
- Shape: a rolling budget inventory; officials named as connective tissue; "Speaking of" hops; ends on a joke.
