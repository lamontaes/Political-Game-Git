# The first evening's research (Nov 24, 2026)

Research for the Story lead's first-evening stretch (the brief of Nov 24, plan step 3: "Count how real inaugurals and State of the State addresses move"), done by two research helpers on Sonnet and read by the Story lead. It sets the rows of `data/english/outlines.json` (the one outline planner, `src/english/outline-planner.ts`): which shapes a section offers, how a point ends, how pieces lean on the sentence before them, how a news story and a diary entry are built. It calibrates shape and rhythm only; it never picks what one speaker says, and no sentence from any source is copied into a bank (quotes here are 15 words or fewer).

What it changed, in one paragraph: the Nov 12 research read three speeches and concluded "a point moves context, stand, ask". Coded point by point over 148 points, that order fits 2 of 88 inaugural points, and 4 of 88 end in an ask of a body. Inaugural points end in a pledge (31%), a value line (24%) or a call to the people (20%); "To those who..." runs are an inaugural shape; "That is why" is a State of the State habit (18 of 19). The inaugural's outline row offers those shapes and asks Congress at most once.

### How real speeches move, point by point (research for the speech planner)

Research helper for the Story lead, Nov 24, 2026. Counts, not rules: it calibrates which shapes a planner may offer; it never writes a game line. No passage is copied; quotes are under 15 words. Read-only on the repository. The prior pass is `docs/research/speech-structure-2026-11-12.md`, which said "a point moves context, stand, ask". This pass counts and finds that claim true of about a third of State of the State points and almost never of an inaugural point.

### Pages read (all fetched Nov 24, 2026; text pulled from each page and read in full)

1. FDR first inaugural (Mar 4, 1933): https://www.presidency.ucsb.edu/documents/inaugural-address-8
2. JFK inaugural (Jan 20, 1961): https://www.presidency.ucsb.edu/documents/inaugural-address-2
3. Reagan first inaugural (Jan 20, 1981): https://www.presidency.ucsb.edu/documents/inaugural-address-11
4. Clinton first inaugural (Jan 20, 1993): https://www.presidency.ucsb.edu/documents/inaugural-address-51
5. George W. Bush first inaugural (Jan 20, 2001): https://www.presidency.ucsb.edu/documents/inaugural-address-52
6. Obama first inaugural (Jan 20, 2009): https://www.presidency.ucsb.edu/documents/inaugural-address-5
7. Biden inaugural (Jan 20, 2021): https://www.presidency.ucsb.edu/documents/inaugural-address-53
8. Whitmer (D, Michigan) 2023 State of the State, as prepared: https://www.michigan.gov/whitmer/news/press-releases/2023/01/25/governor-whitmers-2023-state-of-the-state-address-as-prepared-for-delivery
9. Kemp (R, Georgia) 2023 State of the State, as prepared (AP text on News4Jax): https://www.news4jax.com/news/local/2023/01/25/read-georgia-gov-brian-kemps-full-state-of-the-state-speech/
10. Cox (R, Utah) 2024 State of the State, as prepared (KUER): https://www.kuer.org/politics-government/2024-01-18/video-transcript-gov-spencer-cox-2024-utah-state-of-the-state-address
11. Hochul (D, New York) 2023 State of the State, as prepared: https://www.governor.ny.gov/news/remarks-prepared-governor-hochul-delivers-2023-state-state
12. Ivey (R, Alabama) 2023 State of the State, as prepared (Alabama Political Reporter): https://www.alreporter.com/2023/03/07/governor-kay-iveys-2023-state-of-the-state-address-full-text/
13. Fetched but not coded (time): Polis 2024, https://www.denver7.com/news/politics/read-gov-jared-polis-full-2024-state-of-the-state-address (the prior pass already used it).
14. Failed: Wes Moore 2023 on governor.maryland.gov (404); a Michigan.gov alternate URL for Whitmer (403) and flgov.com for DeSantis 2023 (404). Replaced by items 8 to 12.
15. Prior pass read for the brief: `/home/user/Political-Game-Git/docs/research/speech-structure-2026-11-12.md`.

Limits to know before using any number below:

- One coder (me). A "point" is my judgment of a unit carrying one idea; I split long runs where the topic turned. State of the State points came out longer (mean about 15 sentences) than inaugural points (mean about 7), partly because those speeches are policy lists; compare shares, not lengths, across the two kinds.
- All five State of the State speeches are from 2023 to 2024 (Michigan, Georgia, New York, Alabama, Utah; two Democrats, three Republicans). I did not reach 2019, 2020, 2021, 2022 or 2025. Treat their shares as a sample of five, not of fifty.
- "CLAIM" (a plain claim about how things are, or a statement of the speaker's stand) is my catch-all and is inflated: many CLAIM points begin with "we" or "I" and a stand. Split it before relying on it.
- Sentence counts per point were machine-counted then adjusted by eye; they run about 10 percent off where titles like "Sen." appear.
- Opens/ends/joins codes: opens CLAIM, ADDR (direct address "To those who"), CONTR (contrast or rebuttal), SIGN (signpost), HIST (historical reference), CREED (value statement), QUES, SCENE, STORY (person), FIG (a figure first), CALLBACK (to an earlier line), OPENCALL ("let us ..."), PLEDGE. Ends ASK (of a body), CALL (to the people or to others), PLEDGE ("we will/I will"), MORAL (value line), IMAGE, QUES, TURN (hands to the next point), PUNCH (short callback or joke line), GUEST (a guest asked to stand), NONE. Joins PRON (word or pronoun carried over, "That is why"), ANAPH (repeated opening words), CONTR ("But", "Yet"), SIGN (First, Now let's, Finally, Look), TIME ("Today", "Now"), COLD (no tie). c-s-a: CSA = context, then stand, then an ask of a body, in that order inside the point; CSx = context, stand, then a pledge, call or moral instead of an ask of a body; SA = stand then ask without context; "-" none.

### Per-speech tables

### Franklin D. Roosevelt, First Inaugural, Mar 4, 1933

https://www.presidency.ucsb.edu/documents/inaugural-address-8

Greeting: 1 line, 7 words ("President Hoover, Mr. Chief Justice, My Friends"). No separate occasion beat: the first point opens at once on the day and the call for candor. Close: 3 sentences, a blessing, after a pledge point. Sample stretch (sentences 35-54 of 89): 2 short, 7 long, mean 20.8 words.

| #   | opens    | ends   | joins | figure? | sentences | person? | c-s-a |
| --- | -------- | ------ | ----- | ------- | --------- | ------- | ----- |
| 1   | CLAIM    | CALL   | COLD  | N       | 8         | N       | -     |
| 2   | CLAIM    | NONE   | PRON  | N       | 5         | N       | -     |
| 3   | CONTR    | MORAL  | CONTR | N       | 12        | N       | -     |
| 4   | CALLBACK | TURN   | ANAPH | N       | 11        | N       | -     |
| 5   | CLAIM    | CALL   | SIGN  | N       | 12        | N       | -     |
| 6   | SIGN     | ASK    | SIGN  | N       | 4         | N       | SA    |
| 7   | CLAIM    | NONE   | PRON  | N       | 9         | N       | -     |
| 8   | CREED    | MORAL  | SIGN  | N       | 1         | N       | -     |
| 9   | CLAIM    | PLEDGE | COLD  | N       | 4         | N       | -     |
| 10  | CLAIM    | ASK    | ANAPH | N       | 8         | N       | CSA   |
| 11  | CONTR    | ASK    | CONTR | N       | 2         | N       | SA    |
| 12  | CLAIM    | PLEDGE | COLD  | N       | 2         | N       | -     |
| 13  | CLAIM    | PLEDGE | COLD  | N       | 8         | N       | -     |

### John F. Kennedy, Inaugural, Jan 20, 1961

https://www.presidency.ucsb.edu/documents/inaugural-address-2

Greeting: 1 sentence, a list of 7 officeholders (about 20 words). Occasion: 2 sentences (a celebration of freedom, the oath). Close: 3 paragraphs, 4 sentences, the "ask not" pair, then "Finally" and a turn to God. Sample (sentences 17-36 of 52): 3 short, 7 long, mean 25.3.

| #   | opens    | ends   | joins | figure? | sentences | person? | c-s-a |
| --- | -------- | ------ | ----- | ------- | --------- | ------- | ----- |
| 1   | CLAIM    | IMAGE  | TIME  | N       | 5         | N       | CSx   |
| 2   | ADDR     | PLEDGE | ANAPH | N       | 2         | N       | -     |
| 3   | ADDR     | MORAL  | PRON  | N       | 3         | N       | -     |
| 4   | ADDR     | IMAGE  | ANAPH | N       | 3         | N       | -     |
| 5   | ADDR     | MORAL  | ANAPH | N       | 2         | N       | -     |
| 6   | ADDR     | PLEDGE | ANAPH | N       | 4         | N       | -     |
| 7   | ADDR     | PLEDGE | ANAPH | N       | 1         | N       | -     |
| 8   | ADDR     | CALL   | SIGN  | N       | 1         | N       | -     |
| 9   | CLAIM    | IMAGE  | PRON  | N       | 3         | N       | -     |
| 10  | OPENCALL | IMAGE  | PRON  | N       | 9         | N       | -     |
| 11  | CLAIM    | CALL   | PRON  | Y       | 3         | N       | -     |
| 12  | ADDR     | CALL   | TIME  | N       | 4         | N       | -     |
| 13  | QUES     | QUES   | PRON  | N       | 2         | N       | -     |
| 14  | HIST     | IMAGE  | COLD  | N       | 4         | N       | -     |

### Ronald Reagan, First Inaugural, Jan 20, 1981

https://www.presidency.ucsb.edu/documents/inaugural-address-11

Greeting: 1 sentence, 9 names. Occasion plus thanks to the predecessor: 6 sentences. Close: 3 sentences ("why shouldn't we believe that? We are Americans." then a blessing), after a story point and a one-paragraph application of the story. Sample (sentences 55-74 of 128): 3 short, 1 long, mean 15.5.

| #   | opens | ends   | joins | figure? | sentences | person? | c-s-a |
| --- | ----- | ------ | ----- | ------- | --------- | ------- | ----- |
| 1   | CLAIM | NONE   | COLD  | N       | 7         | N       | -     |
| 2   | CONTR | PLEDGE | CONTR | N       | 10        | N       | CSx   |
| 3   | CLAIM | MORAL  | TIME  | N       | 5         | N       | -     |
| 4   | CONTR | PLEDGE | COLD  | N       | 10        | N       | -     |
| 5   | SIGN  | MORAL  | PRON  | N       | 11        | N       | -     |
| 6   | QUES  | CALL   | COLD  | N       | 11        | N       | CSx   |
| 7   | CLAIM | QUES   | ANAPH | N       | 14        | N       | -     |
| 8   | QUES  | PLEDGE | COLD  | N       | 8         | N       | -     |
| 9   | HIST  | CALL   | COLD  | N       | 11        | Y       | CSx   |
| 10  | ADDR  | PLEDGE | COLD  | N       | 4         | N       | -     |
| 11  | ADDR  | CALL   | SIGN  | N       | 10        | N       | -     |
| 12  | CLAIM | CALL   | COLD  | Y       | 3         | N       | -     |
| 13  | SCENE | IMAGE  | COLD  | N       | 19        | Y       | -     |
| 14  | CLAIM | CALL   | PRON  | N       | 2         | Y       | -     |

### William J. Clinton, First Inaugural, Jan 20, 1993

https://www.presidency.ucsb.edu/documents/inaugural-address-51

Greeting: none beyond "My fellow citizens". Occasion/theme ("renewal"): 5 sentences, then thanks to the predecessor, 2 sentences. Close: 3 paragraphs, 10 sentences, a rededication, a Scripture line and "let us begin anew". Sample (sentences 37-56 of 92): 3 short, 3 long, mean 16.9.

| #   | opens | ends   | joins | figure? | sentences | person? | c-s-a |
| --- | ----- | ------ | ----- | ------- | --------- | ------- | ----- |
| 1   | CLAIM | NONE   | TIME  | Y       | 13        | N       | -     |
| 2   | CLAIM | PLEDGE | PRON  | N       | 12        | N       | CSx   |
| 3   | SIGN  | IMAGE  | PRON  | N       | 7         | N       | -     |
| 4   | HIST  | CALL   | COLD  | N       | 7         | N       | -     |
| 5   | SIGN  | ASK    | ANAPH | N       | 9         | N       | -     |
| 6   | SIGN  | MORAL  | ANAPH | N       | 14        | N       | -     |
| 7   | CLAIM | TURN   | COLD  | N       | 9         | N       | CSA   |
| 8   | ADDR  | CALL   | PRON  | N       | 4         | N       | -     |

### George W. Bush, First Inaugural, Jan 20, 2001

https://www.presidency.ucsb.edu/documents/inaugural-address-52

Greeting: 1 sentence, 5 names plus "distinguished guests". Occasion: 2 sentences; thanks to the predecessor and the rival, 1. Close: 4 paragraphs, about 10 sentences, a letter between two founders, a callback phrase to it, blessing. Sample (sentences 37-56 of 93): 3 short, 1 long, mean 15.2.

| #   | opens  | ends   | joins | figure? | sentences | person? | c-s-a |
| --- | ------ | ------ | ----- | ------- | --------- | ------- | ----- |
| 1   | HIST   | MORAL  | COLD  | N       | 7         | N       | -     |
| 2   | HIST   | TURN   | PRON  | Y       | 5         | N       | -     |
| 3   | CONTR  | PLEDGE | PRON  | N       | 7         | N       | CSx   |
| 4   | CLAIM  | MORAL  | PRON  | N       | 5         | N       | -     |
| 5   | SIGN   | MORAL  | TIME  | N       | 11        | N       | -     |
| 6   | CREED  | CALL   | ANAPH | N       | 4         | N       | -     |
| 7   | PLEDGE | PLEDGE | PRON  | N       | 10        | N       | -     |
| 8   | CREED  | PLEDGE | ANAPH | N       | 15        | N       | -     |
| 9   | CREED  | MORAL  | ANAPH | N       | 9         | N       | -     |
| 10  | CLAIM  | PLEDGE | PRON  | N       | 2         | N       | -     |
| 11  | ADDR   | MORAL  | COLD  | N       | 6         | N       | -     |

### Barack Obama, First Inaugural, Jan 20, 2009

https://www.presidency.ucsb.edu/documents/inaugural-address-5

Greeting: none beyond "My fellow citizens". Opening: thanks to predecessor 1 sentence, then the oath and the storms image, 5 sentences, a one-line hinge ("So it has been; so it must be..."). Close: a Revolutionary War scene with a quoted order, then a charge and blessing, about 12 sentences. Sample (sentences 48-67 of 114): 1 short, 7 long, mean 23.4.

| #   | opens | ends   | joins | figure? | sentences | person? | c-s-a |
| --- | ----- | ------ | ----- | ------- | --------- | ------- | ----- |
| 1   | CLAIM | PLEDGE | PRON  | N       | 13        | N       | CSx   |
| 2   | CONTR | MORAL  | TIME  | N       | 4         | N       | -     |
| 3   | CLAIM | MORAL  | PRON  | N       | 10        | N       | -     |
| 4   | CLAIM | CALL   | PRON  | N       | 8         | N       | -     |
| 5   | CLAIM | PLEDGE | SIGN  | N       | 8         | N       | CSx   |
| 6   | CONTR | MORAL  | TIME  | N       | 12        | N       | -     |
| 7   | SIGN  | PLEDGE | SIGN  | N       | 15        | Y       | -     |
| 8   | CLAIM | MORAL  | PRON  | N       | 4         | N       | -     |
| 9   | ADDR  | PLEDGE | ANAPH | N       | 5         | N       | -     |
| 10  | SCENE | MORAL  | SIGN  | N       | 7         | N       | -     |
| 11  | CONTR | IMAGE  | COLD  | Y       | 11        | Y       | -     |

### Joseph R. Biden, Jr., Inaugural, Jan 20, 2021

https://www.presidency.ucsb.edu/documents/inaugural-address-53

Greeting: 1 sentence, 7 names. Opening before the first point: 14 sentences (the day, the transfer of power, thanks to predecessors, the oath). Close: song lyric, a vision of what children will say, and a "closing where I began" oath of 4 pledges, about 12 sentences. Sample (sentences 76-95 of 170): 4 short, 3 long, mean 14.5.

| #   | opens    | ends   | joins | figure? | sentences | person? | c-s-a |
| --- | -------- | ------ | ----- | ------- | --------- | ------- | ----- |
| 1   | CLAIM    | TURN   | COLD  | N       | 4         | N       | -     |
| 2   | CLAIM    | PLEDGE | PRON  | Y       | 7         | N       | CSx   |
| 3   | CLAIM    | MORAL  | PRON  | N       | 3         | N       | -     |
| 4   | STORY    | CALL   | SIGN  | Y       | 5         | Y       | -     |
| 5   | CLAIM    | PLEDGE | ANAPH | N       | 7         | N       | -     |
| 6   | CONTR    | MORAL  | PRON  | N       | 10        | N       | -     |
| 7   | CLAIM    | PLEDGE | ANAPH | N       | 10        | N       | -     |
| 8   | OPENCALL | MORAL  | PRON  | N       | 8         | N       | -     |
| 9   | SCENE    | PLEDGE | COLD  | Y       | 12        | Y       | -     |
| 10  | ADDR     | PLEDGE | COLD  | N       | 10        | N       | -     |
| 11  | HIST     | CALL   | COLD  | N       | 7         | Y       | -     |
| 12  | CLAIM    | CALL   | SIGN  | N       | 10        | Y       | -     |
| 13  | CLAIM    | MORAL  | PRON  | N       | 7         | N       | -     |
| 14  | ADDR     | PLEDGE | COLD  | N       | 7         | N       | -     |
| 15  | ADDR     | PLEDGE | COLD  | N       | 6         | N       | -     |
| 16  | CLAIM    | CALL   | SIGN  | Y       | 4         | N       | -     |
| 17  | CLAIM    | PLEDGE | COLD  | N       | 14        | N       | -     |

### Gov. Gretchen Whitmer (D-MI), State of the State, Jan 25, 2023 (as prepared)

https://www.michigan.gov/whitmer/news/press-releases/2023/01/25/governor-whitmers-2023-state-of-the-state-address-as-prepared-for-delivery

Greeting 2 sentences; acknowledgments 6 short paragraphs (about 16 sentences) naming 14 people; frame 20 sentences (voice of November, the pinch, "state of our state is strong", "not a list: 3 groups"). About 38 sentences, 14 percent, before the first point. Close: about 25 sentences on "belief", a quoted Roosevelt, callbacks to grit and sports. Sample (sentences 126-145 of 270): 1 short, 6 long, mean 20.1.

| #   | opens | ends   | joins | figure? | sentences | person? | c-s-a |
| --- | ----- | ------ | ----- | ------- | --------- | ------- | ----- |
| 1   | CLAIM | ASK    | SIGN  | Y       | 12        | N       | CSA   |
| 2   | SIGN  | ASK    | SIGN  | Y       | 10        | Y       | CSA   |
| 3   | FIG   | ASK    | SIGN  | Y       | 13        | N       | CSA   |
| 4   | FIG   | ASK    | SIGN  | Y       | 21        | Y       | CSA   |
| 5   | SIGN  | PLEDGE | SIGN  | N       | 5         | N       | -     |
| 6   | SIGN  | MORAL  | SIGN  | Y       | 27        | N       | CSx   |
| 7   | CLAIM | ASK    | COLD  | Y       | 19        | N       | CSA   |
| 8   | SIGN  | MORAL  | SIGN  | N       | 14        | N       | SA    |
| 9   | CLAIM | ASK    | COLD  | N       | 12        | Y       | SA    |
| 10  | SIGN  | IMAGE  | SIGN  | N       | 12        | N       | -     |
| 11  | CLAIM | ASK    | PRON  | Y       | 21        | Y       | CSA   |
| 12  | SIGN  | PLEDGE | SIGN  | Y       | 27        | Y       | CSA   |
| 13  | SIGN  | NONE   | SIGN  | Y       | 10        | N       | -     |
| 14  | SIGN  | ASK    | SIGN  | N       | 4         | N       | SA    |

### Gov. Brian Kemp (R-GA), State of the State, Jan 25, 2023 (as prepared)

https://www.news4jax.com/news/local/2023/01/25/read-georgia-gov-brian-kemps-full-state-of-the-state-speech/

Greeting 1 sentence (a 10-name list); frame 9 sentences (four years ago, challenges overcome, new leaders, "state of our state has never been stronger"). About 10 sentences before the first point. Close: 11 sentences, a callback to the prior year's Bible figure, then "let's get it done". One-sentence paragraphs throughout. Sample (sentences 66-85 of 151): 0 short, 6 long, mean 21.8.

| #   | opens | ends   | joins | figure? | sentences | person? | c-s-a |
| --- | ----- | ------ | ----- | ------- | --------- | ------- | ----- |
| 1   | CLAIM | TURN   | COLD  | Y       | 18        | Y       | -     |
| 2   | CLAIM | NONE   | PRON  | Y       | 20        | Y       | CSx   |
| 3   | CONTR | PLEDGE | CONTR | Y       | 14        | Y       | -     |
| 4   | QUES  | ASK    | ANAPH | N       | 6         | N       | SA    |
| 5   | CLAIM | ASK    | ANAPH | N       | 10        | Y       | CSA   |
| 6   | CLAIM | PLEDGE | ANAPH | Y       | 17        | Y       | CSx   |
| 7   | CLAIM | ASK    | ANAPH | Y       | 22        | Y       | CSA   |
| 8   | CLAIM | PLEDGE | SIGN  | Y       | 6         | N       | CSx   |
| 9   | CLAIM | ASK    | COLD  | Y       | 12        | N       | CSA   |
| 10  | FIG   | MORAL  | COLD  | Y       | 15        | N       | CSx   |

### Gov. Spencer Cox (R-UT), State of the State, Jan 18, 2024 (as prepared)

https://www.kuer.org/politics-government/2024-01-18/video-transcript-gov-spencer-cox-2024-utah-state-of-the-state-address

Greeting 1 sentence plus thanks 2 paragraphs and a housekeeping joke (about 11 sentences); then a 15-sentence humor-and-landscape frame on one word ("weird") that returns at the close. Close: 10 sentences, ends on the frame word. About 26 sentences before the first point. Sample (sentences 112-131 of 242): 3 short, 1 long, mean 14.2.

| #   | opens    | ends   | joins | figure? | sentences | person? | c-s-a |
| --- | -------- | ------ | ----- | ------- | --------- | ------- | ----- |
| 1   | CLAIM    | TURN   | CONTR | Y       | 14        | N       | -     |
| 2   | SIGN     | MORAL  | SIGN  | N       | 8         | N       | -     |
| 3   | SIGN     | PUNCH  | SIGN  | N       | 21        | N       | -     |
| 4   | CLAIM    | PLEDGE | PRON  | Y       | 17        | N       | CSx   |
| 5   | CLAIM    | MORAL  | COLD  | N       | 18        | N       | -     |
| 6   | CLAIM    | CALL   | TIME  | N       | 14        | N       | -     |
| 7   | CLAIM    | CALL   | SIGN  | Y       | 21        | N       | CSx   |
| 8   | SIGN     | PLEDGE | SIGN  | N       | 14        | N       | CSx   |
| 9   | SIGN     | NONE   | SIGN  | N       | 3         | N       | -     |
| 10  | SIGN     | ASK    | SIGN  | N       | 9         | N       | SA    |
| 11  | CALLBACK | MORAL  | SIGN  | Y       | 81        | Y       | -     |

### Gov. Kathy Hochul (D-NY), State of the State, Jan 10, 2023 (as prepared)

https://www.governor.ny.gov/news/remarks-prepared-governor-hochul-delivers-2023-state-state

Greeting and thanks: 3 paragraphs, about 21 sentences (one paragraph is a list of 11 titles); then a frame of about 38 sentences (strong state, a 2022 record in a run of accomplishments, a family-immigrant "dream" line, "what I will discuss today"). About 59 sentences, 20 percent, before the first point. Close: about 20 sentences, a recap of three goals, a quoted Roosevelt, a promise. Sample (sentences 139-158 of 297): 1 short, 2 long, mean 14.8.

| #   | opens    | ends   | joins    | figure? | sentences | person? | c-s-a |
| --- | -------- | ------ | -------- | ------- | --------- | ------- | ----- |
| 1   | CLAIM    | NONE   | SIGN     | Y       | 16        | N       | -     |
| 2   | CONTR    | MORAL  | PRON     | N       | 12        | N       | CSA   |
| 3   | CLAIM    | PLEDGE | ANAPH    | Y       | 7         | N       | -     |
| 4   | CLAIM    | PLEDGE | SIGN     | Y       | 19        | N       | CSx   |
| 5   | FIG      | ASK    | PRON     | Y       | 17        | N       | CSA   |
| 6   | SIGN     | PLEDGE | SIGN     | Y       | 13        | N       | CSx   |
| 7   | CALLBACK | MORAL  | CALLBACK | N       | 16        | Y       | -     |
| 8   | FIG      | NONE   | PRON     | Y       | 19        | N       | -     |
| 9   | CLAIM    | TURN   | PRON     | Y       | 8         | N       | -     |
| 10  | CLAIM    | CALL   | TIME     | Y       | 38        | N       | CSA   |
| 11  | CLAIM    | PLEDGE | PRON     | Y       | 21        | N       | CSx   |
| 12  | HIST     | NONE   | PRON     | Y       | 9         | N       | -     |
| 13  | CLAIM    | PLEDGE | PRON     | Y       | 14        | Y       | CSx   |
| 14  | SIGN     | MORAL  | SIGN     | Y       | 9         | N       | CSx   |

### Gov. Kay Ivey (R-AL), State of the State, Mar 7, 2023 (as prepared)

https://www.alreporter.com/2023/03/07/governor-kay-iveys-2023-state-of-the-state-address-full-text/

Salutation 1 sentence; frame of 14 sentences (students in the gallery, five "we must" lines, "I am confident... best days are in front of us", "I am proud to offer a report"). Close: 10 sentences, a pledge, "let's work together and let's go to work", blessing. Text is one block, so paragraph breaks were set by me. Sample (sentences 66-85 of 151): 2 short, 4 long, mean 19.7.

| #   | opens    | ends   | joins | figure? | sentences | person? | c-s-a |
| --- | -------- | ------ | ----- | ------- | --------- | ------- | ----- |
| 1   | CLAIM    | ASK    | PRON  | N       | 19        | N       | CSA   |
| 2   | SCENE    | MORAL  | COLD  | Y       | 5         | N       | CSA   |
| 3   | CLAIM    | PUNCH  | CONTR | Y       | 10        | N       | -     |
| 4   | FIG      | ASK    | COLD  | Y       | 13        | N       | CSA   |
| 5   | CLAIM    | NONE   | PRON  | Y       | 19        | N       | CSA   |
| 6   | HIST     | PLEDGE | COLD  | Y       | 14        | N       | CSx   |
| 7   | CALLBACK | NONE   | SIGN  | N       | 14        | N       | -     |
| 8   | CLAIM    | GUEST  | COLD  | N       | 13        | Y       | -     |
| 9   | SIGN     | ASK    | CONTR | Y       | 12        | N       | CSA   |
| 10  | CLAIM    | ASK    | ANAPH | N       | 2         | N       | SA    |
| 11  | SCENE    | MORAL  | COLD  | N       | 6         | N       | -     |

### Totals

Inaugurals: 7 speeches, 88 points. State of the State: 5 speeches, 60 points.

### Opens with

| Opening                                               | Inaugural | State of the State |
| ----------------------------------------------------- | --------- | ------------------ |
| plain claim or stand                                  | 35 (40%)  | 28 (47%)           |
| direct address ("To those...", "My fellow...")        | 16 (18%)  | 0                  |
| contrast or rebuttal                                  | 9 (10%)   | 2 (3%)             |
| signpost ("First", "Now let's talk about", "Finally") | 7 (8%)    | 16 (27%)           |
| historical reference                                  | 6 (7%)    | 2 (3%)             |
| figure first                                          | 0         | 6 (10%)            |
| value or creed                                        | 4 (5%)    | 0                  |
| rhetorical question                                   | 3 (3%)    | 1 (2%)             |
| scene or image                                        | 3 (3%)    | 2 (3%)             |
| call ("let us...", "let both sides")                  | 2 (2%)    | 0                  |
| callback to earlier line                              | 1 (1%)    | 3 (5%)             |
| story about a person                                  | 1 (1%)    | 0                  |
| pledge                                                | 1 (1%)    | 0                  |

### Ends with

| Ending                                               | Inaugural | State of the State |
| ---------------------------------------------------- | --------- | ------------------ |
| pledge ("we will", "I will")                         | 27 (31%)  | 13 (22%)           |
| value line / moral                                   | 21 (24%)  | 11 (18%)           |
| call to the people or to others                      | 18 (20%)  | 3 (5%)             |
| image                                                | 8 (9%)    | 1 (2%)             |
| turn to the next point                               | 4 (5%)    | 3 (5%)             |
| ask of a body (legislature, Congress, officeholders) | 4 (5%)    | 18 (30%)           |
| question                                             | 2 (2%)    | 0                  |
| punchline or callback line                           | 0         | 2 (3%)             |
| guest asked to stand                                 | 0         | 1 (2%)             |
| nothing in particular                                | 4 (5%)    | 8 (13%)            |

Share of points that end in an ask of a body: inaugurals 4 of 88 (4.5%); State of the State 18 of 60 (30%); without Whitmer, whose ask-heavy speech sets the high end, 10 of 46 (22%). By speech: Whitmer 8 of 14, Ivey 4 of 11, Kemp 4 of 10, Hochul 1 of 14, Cox 1 of 11; FDR 3 of 13, Clinton 1 of 8, the other five inaugurals 0. If a pledge, a call or a guest-stand also counts as an ask, the shares are inaugural 49 of 88 (56%) and State of the State 35 of 60 (58%): the two kinds end alike in wanting something, and differ in who is asked.

### Joins the previous point by

| Join                                      | Inaugural | State of the State | Both |
| ----------------------------------------- | --------- | ------------------ | ---- |
| word or pronoun carried over              | 26 (30%)  | 12 (20%)           | 38   |
| no tie, cold start                        | 25 (28%)  | 11 (18%)           | 36   |
| signpost                                  | 11 (12%)  | 24 (40%)           | 35   |
| repeated opening words                    | 16 (18%)  | 6 (10%)            | 22   |
| time word ("Today", "Now", "On this day") | 7 (8%)    | 2 (3%)             | 9    |
| contrast word ("But", "Yet", "And yet")   | 3 (3%)    | 4 (7%)             | 7    |
| callback                                  | 0         | 1 (2%)             | 1    |

### Figures, people, length

- Points containing a figure (any count, dollar or year): inaugural 9 of 88 (10%); State of the State 39 of 60 (65%). By speech, Hochul 12 of 14, Whitmer 9 of 14, Kemp 8 of 10, Ivey 6 of 11, Cox 4 of 11. In the inaugurals the figure is usually a time count ("nearly 225 years", "hundred days") or a death toll, not a statistic about the present.
- Points naming a person (guest, hero, constituent): inaugural 9 of 88 (10%), mostly historic figures (Washington, Lincoln, Warren, Treptow); State of the State 15 of 60 (25%), mostly guests and constituents (Kemp 6 of 10 points, Whitmer 5 of 14). Only Reagan (Treptow) and Cox (his great-uncle) let a person carry a whole point; Biden's Lincoln anecdote is the other.
- Points per speech: inaugurals 8 to 17 (median 11); State of the State 10 to 14.
- Sentences per point: inaugural mean 7, median 7; State of the State mean 15, median 14.
- Sentence-length mix in a 20-sentence middle stretch (short = under 8 words, long = over 25): FDR 2/7, JFK 3/7, Reagan 3/1, Clinton 3/3, Bush 3/1, Obama 1/7, Biden 4/3; Whitmer 1/6, Kemp 0/6, Cox 3/1, Hochul 1/2, Ivey 2/4. Whole-speech counts (short/long): Biden 42/22, Cox 50/36, Hochul 62/41, Whitmer 42/35, Reagan 12/24, Obama 16/32, Kemp 2/43 (Kemp writes one long sentence per paragraph; his speech has almost no short sentences). Mean sentence: Biden 15, Whitmer 15, Hochul 16, Cox 16, Bush 17, Clinton 17, Reagan 19, Ivey 19, Obama 21, FDR 21, Kemp 22, JFK 25. The stretch counts vary a lot by where you sample, so use the whole-speech means.

### Does "context then stand then ask" happen?

|                                                      | Inaugural (88 points)                                                      | State of the State (60 points)                    |
| ---------------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------- |
| context, stand, ask of a body, in that order         | 2 (2%) (FDR on the Constitution and Congress; Clinton turning to Congress) | 18 (30%); 13 (22%) with the ask closing the point |
| context, stand, then a pledge, call or moral instead | 9 (10%)                                                                    | 14 (23%)                                          |
| stand then ask, no context                           | 2 (2%)                                                                     | 6 (10%)                                           |
| none of these                                        | 75 (85%)                                                                   | 22 (37%)                                          |

So the prior pass's frame fits roughly one State of the State point in four to three, mostly Whitmer (7 of 14 points), Ivey (5 of 11) and Kemp (3 of 10), and it fits almost no inaugural point. Even in a State of the State, the other 70 percent of points end on a pledge, a value line, a call, a turn or nothing, and 37 percent have no context-stand-ask content at all. An inaugural point is mostly a stand that ends in a pledge, a call or a value line, with its context compressed into one sentence or none.

### Shapes observed

Counts are of my coded points in the 148 (88 inaugural, 60 State of the State). "Voice" is the speaker's manner in that speech.

1. **Stand then pledge.** Moves: a plain claim about where things are, then "we will" or "I will". Seen 18 (inaugural 11, State 7): Reagan on deficits, Obama's work-to-be-done list, Bush on the divided country. Inaugural and formal State speeches. Voice: blunt, formal.
2. **Stand then call to the people.** Moves: claim, then "let us" or "we must" to the whole country. 11 (8 inaugural, 3 State): Reagan's national renewal, FDR on putting people to work, Obama's "starting today". Voice: warm, dramatic.
3. **Stand then value line.** Moves: claim, ends on a short moral. 7 (6 inaugural, 1 State): Reagan on government, Bush on what binds the country. Voice: formal, folksy.
4. **The address run.** Moves: "To those who..." then one pledge each, one point per audience, in a row of 4 to 7. 15 points, all inaugural (JFK allies, new states, the poor, the Americas, the UN, adversaries; Obama to the Muslim world and the poor; Reagan to allies and enemies). Ends pledge 8, call 4, moral 3. Voice: dramatic, formal.
5. **Rebuttal.** Moves: name what some say or the pressure ("some question the scale", "we hear much of special interests", "the zero-sum thinkers"), then answer. 11 opens by contrast (9 inaugural, 2 State); ends moral 5, pledge 4, ask 1, image 1. Voice: blunt.
6. **Figure, stand, ask.** Moves: a figure or a record, the governor's stand, then an ask by name ("pass House Bill One", "fund it before spring break"). 18 State points end in an ask (17 of them open on a claim, signpost or figure), 4 inaugural. Whitmer, Ivey, Kemp most. Voice: businesslike, blunt.
7. **Signpost, then claim.** Moves: "First", "Finally", "Now let's talk about", "Look," then the content. 23 signposted opens (7 inaugural, 16 State); ends moral 7, ask 6, pledge 5. Voice: plain, folksy, warm.
8. **Story, scene or history, then a turn to the people.** Moves: a person or scene or past moment, then a call, a moral or an image. 14 points (10 inaugural, 4 State): Reagan's soldier-diarist, Biden's Lincoln and his "here we stand" run, Obama's soldiers in far deserts, Ivey's students. Ends call 4, moral 4, image 2, pledge 2. Voice: dramatic, warm.
9. **Person-led point.** Moves: a named guest or constituent, a one-line credit, then the ask or the pledge ("we will get this done so you can learn"). Person in 15 State points (25%); 6 of Kemp's 10 stand a guest up; Whitmer uses four named constituents. Seen only as the middle of a point, never alone except Cox's long great-uncle story and Reagan's. Voice: warm, folksy.
10. **Anaphora run.** Moves: a short repeated opening ("America at its best...", "To renew America, we must...", "Let both sides...", "Here we stand...", "We can..."), one beat each, then a pledge or a call. 22 points are joined by repetition (16 inaugural, 6 State). Voice: dramatic, formal.
11. **Question, then answer.** Moves: a rhetorical question (Reagan "Can we solve the problems?" then "yes"; Kemp "where will they live?" then a fund; JFK's two questions then a charge). Opens or ends on a question in 5 points (4 inaugural, 1 State). Voice: folksy, dramatic.
12. **Good news, then the risk.** Moves: a record of success, then "But despite all this, there's a growing risk", leaving the next point to meet it. Ends on a turn in 7 points (4 inaugural, 3 State): Kemp's economy to workers and housing, Cox's rankings to "how we keep it", Bush's faith to "far to travel". Voice: measured, formal.
13. **Callback open.** Moves: "At the outset I said...", "I started this speech talking about..."; ties the point to a line from earlier. 4 points (1 inaugural, 3 State), always late. Voice: warm, folksy.
14. **Short punchline end.** Moves: a point ends on a very short callback or joke ("Utah, it turns out, is weird", "Roll Tide!"). 3 State points. Voice: folksy.
15. **Record then ask.** Moves: "last year we did X", a thanks, then "this year, pass Y". About 7 State points (Whitmer education, Kemp insurance, Ivey budgets and game plan, Hochul housing record). Voice: businesslike.

### How points actually join (5 most common devices across all 148 points)

1. Pronoun or word carried from the last sentence, 38 (26%): "That is why...", "These challenges...", "In this spirit...". Commonest in inaugurals (30% of points).
2. No tie (cold start), 36 (24%): a new topic opens on its own subject; the topic names itself ("The business of our nation goes forward", "In 1847...").
3. Signpost, 35 (24%): "Now let's talk about", "Finally", "Look,", "Second", "Part 3". 40% of State points, 12% of inaugural points.
4. Repeated opening words, 22 (15%): "To renew America", "America at its best", "Let both sides", "Here we stand".
5. Time word, 9 (6%): "Today", "Now", "On this day". Contrast words open only 7 points (5%), but sentences starting with "And" are 9 percent of all sentences (164 of 1,849) and with "But" 4 percent (67), so joins inside a point lean on "And".

Combinations seen most: carried word then claim (23 points), signpost then signpost (17, the numbered-list rhythm of State speeches), cold start then claim (15).

### How real speeches refer back ("this", "that", "it")

Counted over all 12 speeches (1,849 sentences): 179 sentences (9.7%) open with It, This, That, These, Those or Such, and 19 open with "That is why / That's why": 18 of them in the State speeches (Kemp 5, Hochul 5, Ivey 4, Whitmer 3, Cox 1) and 1 in FDR. I read 25 of these against the sentence before:

- 12 of 25: "That" or "This" points at the whole previous sentence's claim, not at a noun ("That is why...", "That's democracy", "That includes care for those suffering from addiction", "This will positively impact thousands of small businesses"). The antecedent is the statement just made, so a game's piece that opens "That is why" needs the previous piece to end on a complete claim or reason.
- 4 of 25: "It" or "Those X" points at the last noun the previous sentence named ("homeownership... It is the key to...", "the will and moral courage... It is a weapon", "investments... Those investments must continue"). The previous sentence must put that noun at its end.
- 2 of 25: "These" sums up a run of items before it ("These are the indicators of crisis", "These initiatives and policies...").
- 3 of 25: not backward at all: "This ceremony", "This evening", "This year" are time or place, so a game must not treat every "this" as a pointer.
- 2 of 25: "It" or "This" opens a parallel run (Biden: "This is America's day. This is democracy's day..."; Obama: "This is the price... This is the source...").
- 2 of 25: "It's too often moms..." and "It's schools like these..." are cleft sentences; "it" points at nothing.

So: "That" almost always takes the previous whole thought; "it" takes the previous noun; "these" takes a list or a set just given; and "this" before a time word is time. "That's why" is the State speeches' plain link from a reason to a proposal ("That's why I'm proposing..."); inaugurals almost never use it. A game's pieces carry, for what comes next, a field naming the previous sentence's last noun and its whole claim, so a following "it", "that" or "these" can resolve without guessing.

### Notes for the planner (observations, not rules)

- The same speaker uses 4 or 5 different shapes in one speech: Obama has stand-pledge, rebuttal, address-pledge, scene and a long values run; Whitmer has figure-stand-ask, person-led, signpost runs and a belief close. A planner that draws one shape per point from a small table by speech kind and voice will not repeat a frame.
- Inaugurals use addresses, runs, stories and values, and almost never ask a body for anything; State speeches use signposts, figures, guests and asks, with a short run of pledges at the end of a policy block.
- A long frame before the first point is real in State speeches: 10 sentences (Kemp, Ivey 14), 26 (Cox), 38 (Whitmer), 59 (Hochul); inaugurals open with 0 to 14.
- Closes: inaugurals end in 3 to 12 sentences, usually a callback to a framing image or a quoted older voice, then a blessing; State speeches end in 10 to 25 sentences on a values point or a recap, a callback to the opening theme, a short exhortation and a thanks.

## Research: short news stories and diary/memoir weeks

Fetch date for all pages: Nov 24, 2026. Research only. No game lines written, no repository edits.

How the counts were made (read this first):

- News stories (Part A): the fetch tool returns a summary by a small model, not raw text. Lede word counts, paragraph numbers and body lengths are that reading of each page. I did not hand-verify each one, so treat them as +/- a few words and +/- one paragraph. Categories (lede type, ending type) are mine, from its descriptions.
- Diaries (Part B): Pepys, Welles and John Quincy Adams were downloaded as raw text and read by me. Pepys joiner counts were made by a script over the raw text. Welles and JQA are coded by hand and not counted by script.
- Nothing is invented. Where I could not fetch, it says so.

---

## Pages read

### Part A: news stories (16 stories, all fetched)

| #   | Story                                                                                   | Kind                    | URL                                                                                                                                      | Fetch                              |
| --- | --------------------------------------------------------------------------------------- | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| S1  | Mikie Sherrill sworn in as NJ governor (WHYY)                                           | governor takes office   | https://whyy.org/articles/mikie-sherrill-new-jersey-governor-sworn/                                                                      | ok                                 |
| S2  | Gavin Newsom sworn in as California's 40th governor (ABC7, wire-style)                  | governor takes office   | https://abc7.com/politics/gavin-newsom-sworn-in-as-californias-40th-governor/5030179/                                                    | ok                                 |
| S3  | Youngkin sworn in as Virginia governor (AP text, abc17news)                             | governor takes office   | https://abc17news.com/?p=756783                                                                                                          | ok (page showed body as one block) |
| S4  | Georgia lawmakers return for 2026 session (AJC)                                         | legislature opens       | https://www.ajc.com/politics/2026/01/georgia-lawmakers-return-to-atlanta-for-2026-legislative-session                                    | ok                                 |
| S5  | Georgia session starts today (WSB-TV)                                                   | legislature opens       | https://www.wsbtv.com/news/local/new-georgia-legislative-session-starts-today-which-issues-will-be-focus-2026/INGA3S4RXVBJFLTYJJLSVYQEDU | ok                                 |
| S6  | 5 things to know as Oregon's session begins (OPB)                                       | legislature opens       | https://www.opb.org/article/2024/02/05/oregon-legislative-session-things-to-know/                                                        | ok                                 |
| S7  | City council approves new sign ordinance in 4-1 vote (Times-Enterprise, Thomasville GA) | council vote            | https://timesenterprise.com/2021/04/13/city-council-approves-new-sign-ordinance-in-4-1-vote                                              | ok                                 |
| S8  | City Council votes to allow natural gas at industrial park (Oberlin Review)             | council vote            | https://oberlinreview.org/37812/news/city-council-votes-to-allow-natural-gas-at-industrial-park/                                         | ok                                 |
| S9  | Council approves updated solar-energy ordinance (Sartell News Leader)                   | council vote            | https://thenewsleaders.com/council-approves-updated-solar-energy-ordinance/                                                              | ok                                 |
| S10 | Chelsea City Council adopts non-discrimination ordinance (Chelsea Update)               | council vote            | https://chelseaupdate.com/chelsea-city-council-adopts-non-discrimination-ordinance/                                                      | ok                                 |
| S11 | Downtown business closing after 27 years (Marietta Times)                               | business closes         | https://www.mariettatimes.com/news/local-news/2022/06/downtown-business-closing-after-27-years/                                          | ok                                 |
| S12 | Beloved Downtown Home and Garden store closing (CBS Detroit)                            | business closes         | https://www.cbsnews.com/detroit/news/downtown-home-and-garden-store-closing-its-doors                                                    | ok                                 |
| S13 | The Gift Niche closing after 43 years (WDBJ7)                                           | business closes         | https://www.wdbj7.com/2026/01/06/its-going-be-hole-my-heart-gift-niche-closing-after-43-years/                                           | ok                                 |
| S14 | Community celebrates Juicy Guru with ribbon cutting (Meridian Star)                     | business opens          | https://meridianstar.com/?p=383384                                                                                                       | ok                                 |
| S15 | South Dakota sales tax cut bill takes effect (SDPB)                                     | tax change takes effect | https://sdpb.org/business-economics/2023-07-02/south-dakota-sales-tax-cut-bill-takes-effect                                              | ok                                 |
| S16 | New Maryland laws, tax changes take effect July 1 (CBS Baltimore)                       | laws/tax take effect    | https://www.cbsnews.com/baltimore/news/new-laws-july-1-2025-clean-energy-cannabis                                                        | ok                                 |

Gaps: no story on a new US president taking office; no wire copy fetched straight from apnews.com. S3 is AP text on a station site. Failed fetches (not used): washingtontimes.com (two AP stories, 403), wabe.org (403), cpr.org (403), stgeorgeutah.com (429), whyy Shapiro guess (404), kesq/others not tried.

### Part A: journalism teaching pages (fetched or searched)

1. https://owl.purdue.edu/owl/subject_specific_writing/journalism_and_journalistic_writing/the_inverted_pyramid.html (ok). Inverted pyramid: key facts first, rest in falling importance. Lead gives who, what, when, where, why. Nothing on attribution.
2. https://pressbooks.palomar.edu/introtojournalism/chapter/chapter-7-basics-of-writing/ (ok). Start the lead with the newest information, not the date or attribution. Short one-idea sentences. Nut graf is one to two sentences after the lead saying why the story matters. Attribute all but the most obvious facts. Best quote first, second-best saved for the ending; each quote gets its own paragraph.
3. https://niemanstoryboard.org/nut-grafs-getting-to-the-heart-of-the-story/ (ok). Nut graf follows an anecdotal lede and states the core meaning (theme). Nothing on attribution.
4. Search summaries only (page bodies not fetched): Poynter, "The Nut Graf" (Scanlan, 2003) https://www.poynter.org/archive/2003/the-nut-graf-part-i/ says a nut graf promises what the story delivers, and a nut graf often needs no attribution because evidence follows. NPR Training https://www.npr.org/sections/npr-training/2025/05/29/g-s1-64764/nut-graf-and-lead-duos-that-point-readers-in-the-right-direction (fetch failed, 503) says in breaking news the lead often does the nut graf's job.
5. Headline rules: https://olemiss.edu/marcomm/news-and-media/copy-style-guide/headlines-cutlines-bylines/ (ok): main headline at most 70 characters, ideally under 60; no rule on verbs or articles. Search summary of several style handouts (not fetched): drop a/an/the and forms of "to be", use present tense for recent events, infinitive for the future ("Governor to sign bill"), sentence-style capitalization.
6. Failed: https://pressbooks.pub/introjournalism/chapter/chapter-7-basics-of-writing/ (403).

### Part B: diaries and memoir

1. Samuel Pepys, Jan 1 to Jan 14, 1660, Wheatley text on Wikisource, raw HTML read and scripted: https://en.wikisource.org/wiki/Diary_of_Samuel_Pepys/1660/January (ok). Project Gutenberg was down for every Pepys and Chesnut URL (503 "temporarily down"), so Gutenberg was not used.
2. Diary of Gideon Welles, Lincoln's Navy Secretary, Mar 17 to Apr 2, 1863, full text on archive.org: https://archive.org/stream/diaryofgideonwelv1well/diaryofgideonwelv1well_djvu.txt (ok).
3. Memoirs of John Quincy Adams (his diary, edited, 1874), Oct 26 to Oct 29, 1794, full text on archive.org: https://archive.org/stream/memoirsofjohnqui01adam/memoirsofjohnqui01adam_djvu.txt (ok). The MHS site https://www.masshist.org/jqadiaries/php/ says there is no transcription of the manuscript, so it gave no text.
4. Memoir writing guidance: search result summary only (no page body fetched; the fiveable page 404'd): scene versus summary; summary compresses time, scene is for moments that matter; too much summary stalls a memoir; a good span is one scene, a jump forward, another scene. Sources named in the results: Creative Penn, Scribophile, Making Memoir Magic. Treat as general craft advice.
5. Not obtained: Anne Lister (no open text found), Tony Benn, Chips Channon (copyrighted, no excerpts fetched), Mary Chesnut (archive.org text was an excerpt with no dated entries; Gutenberg down), Charles Wills Civil War diary (downloaded, date format did not parse, not coded).

---

## A. News: coding table (16 stories)

Lede type: S = summary/hard (who did what, when, where), D = delayed or scene lede. Quote P = paragraph number of the first direct quote (none = no direct quote). Ending: Q quote, N next step or service or call to action, L list of facts, W wrap-up or official's view.

| #   | Lede type         | Lede sentences / words | What paragraph 2 does                               | First quote P                        | First mention of main person                      | Later mention                  | Background                         | Ending                                | Body words |
| --- | ----------------- | ---------------------- | --------------------------------------------------- | ------------------------------------ | ------------------------------------------------- | ------------------------------ | ---------------------------------- | ------------------------------------- | ---------- |
| S1  | S                 | 1 / 33                 | background (precedent: second woman governor)       | 4                                    | full name with long credential string             | surname, "she", "the governor" | woven in                           | N (inaugural ball venue)              | ~850       |
| S2  | S + conflict hook | 1 / 34                 | quote plus stakes, age, setting                     | 2                                    | "California Gov. Gavin Newsom", then "Newsom, 51" | surname                        | woven in                           | Q (kicker tied to lede)               | ~650       |
| S3  | S (theme)         | 1 / 17                 | second sentence gives the event and date            | none                                 | full name plus title                              | pronoun, "The Republican"      | brief, last sentence               | W                                     | ~100       |
| S4  | S                 | 1 / 18                 | nut graf (why session matters, carryover bills)     | none                                 | title, party, home city                           | not reported                   | woven in                           | N (how to contact lawmakers)          | ~500-550   |
| S5  | S                 | 1 / 18                 | nut graf (stakes)                                   | 6                                    | full name plus title                              | surname                        | brief                              | N (40-day length, reporter's updates) | ~350-400   |
| S6  | S                 | 2 / 55                 | nut graf (governor and her main priority)           | 3                                    | title, party, full name                           | surname                        | woven in                           | Q                                     | ~950       |
| S7  | S                 | 1 / 15                 | vote detail, names dissenter and movers             | 3 (one word); first full sentence P7 | title plus full name                              | surname                        | late block, chronological (P13-16) | L                                     | ~500       |
| S8  | S                 | 2 / 38                 | nut graf (what the ordinance does, who disputes it) | 7                                    | title plus full name plus class year              | surname                        | woven in                           | N then Q                              | ~850       |
| S9  | S                 | 1 / 25                 | context (survey, public hearing)                    | 5                                    | title plus full name                              | surname                        | woven in                           | Q (kicker)                            | ~750-800   |
| S10 | S                 | 1 / 25                 | substance of the ordinance                          | none                                 | office and name once                              | not reported                   | brief                              | N (links)                             | ~140-150   |
| S11 | S                 | 1 / 19                 | owner's reason, as a five-word quote                | 2                                    | "owner Shane Danford" in P2                       | surname                        | one paraphrase paragraph (P3)      | N (practical: orders, stock, pickup)  | ~300       |
| S12 | D (scene-setting) | 1 / 13                 | the hard news plus the store's standing             | 4                                    | store full name P2; owner named at first quote    | "the owner"                    | woven in                           | Q                                     | ~330-350   |
| S13 | S                 | 1 / 18                 | background (founders, closing date)                 | 3                                    | "co-owner" plus full name                         | surname or first name          | scattered short blocks             | N (call to action to shop)            | ~450       |
| S14 | S (event)         | 1 / 25                 | first official source and background                | 3                                    | full name plus role                               | pronoun, name                  | woven in                           | Q (anecdotal)                         | ~390       |
| S15 | S                 | 1 / 19                 | why the date matters (200-plus laws)                | none (one quoted word)               | bill number; governor full name plus title        | "the governor"                 | P3-P6 numbers and history          | W (governor's view)                   | ~130       |
| S16 | S                 | 1 / 32                 | nut graf (budget context, $1.8B)                    | 6                                    | "the governor", then "Gov. Moore"                 | "Gov. Moore"                   | links and context                  | L                                     | ~600       |

### Totals (n = 16 unless noted)

- Lede type: summary 15, delayed or scene 1 (S12).
- Lede length: 14 of 16 are one sentence, 2 are two sentences (S6, S8). Words per lede: 13, 15, 17, 18, 18, 18, 19, 19, 25, 25, 25, 32, 33, 34, 38, 55. Mean 25, median 22, range 13-55. The six that give a quick event with nothing added run 13-19 words.
- Paragraph 2 job: context, nut graf or why it matters 7 (S4, S5, S6, S8, S9, S15, S16); details of the action itself 3 (S7, S10, S12); background or precedent 2 (S1, S13); a quote 2 (S2, S11); first source plus background 1 (S14); the event's second sentence 1 (S3).
- First direct quote lands in: P2 two stories, P3 four, P4 two, P5 one, P6 two, P7 one, none four. Of the 12 with a quote, 8 land in P2-P4. Four stories (S3, S4, S10, S15) have no real quote, and they are the short or service-style ones.
- Naming: every story names a person or body with title or role plus full name on first mention (16 of 16). Later reference is surname only in 10, a role label ("the governor", "the owner") in 3 (S12, S15, S16), pronoun or not reported in 3 (S3, S4, S10).
- Background: woven through the body in 12, one late chronological block in 2 (S7, S3), brief or links only in 2 (S5, S10). In no story did background come before the lede's news.
- Endings: quote 6 (S2, S6, S8, S9, S12, S14), next step, service line or call to action 6 (S1, S4, S5, S10, S11, S13), list of facts 2 (S7, S16), wrap-up or official's view 2 (S3, S15). Only S1 and S8 point to a dated or timed next event (a ball venue, "coming months").
- Length: 6 of 16 are under 400 words, 8 are 300-600. The game story is much shorter (3-6 sentences, perhaps 60-120 words); the nearest real models are S3 (~100 words), S15 (~130) and S10 (~145).

### Headlines versus ledes

Headline text known exactly for 13 stories (S1, S3, S4, S6, S7, S8, S9, S10, S11, S12, S14, S15, S16).

- Length: 6-16 words for the 13 (S1 is the longest, ~16; most are 6-10). Ledes are 13-55 words.
- No "a", "an" or "the" in any of the 13. Forms of "to be" are dropped: "sworn in as...", "closing after 27 years".
- Verb: simple present in 7 (approves, adopts, votes, takes effect, celebrates, return, begins); a participle with "is" dropped in 6 (sworn in, closing). None uses past tense.
- Headlines carry no date, no "said", and only the single most countable fact (a vote count in S7, a number of years in S11 and S13, the ordinal "40th" in S2). The lede then adds who, where and when ("Monday", "Oct. 23").
- One headline (S13) leads with a short quote, and S6 uses a numbered promise ("5 things"). Teaching pages say headlines are present tense and drop articles; one style guide caps a main headline at 70 characters.

### Recommended outline: a 3-6 sentence game news story

Frequencies are out of the 16 stories read.

| Slot                                | What it holds                                                                                                                        | Seen in sample                                                                                         |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| Headline                            | present-tense verb, one fact, no a/an/the, no date, under 10 words                                                                   | 13 of 13 known headlines                                                                               |
| 1. Lede (one sentence, 15-25 words) | who did what; title plus full name on first mention; the stage or number (vote 4-1); when and where; newest fact first, not the date | 16 of 16 start with a who-did-what; 15 are hard ledes; 14 are one sentence                             |
| 2. Impact                           | what it does and who it reaches, in plain terms (people, dollars, a place); the vote count or what changes                           | 10 of 16 have a paragraph 2 that gives the action's detail or why it matters (7 context plus 3 detail) |
| 3. Voice                            | a named person's words or reaction, "title name said", then surname; one quote per sentence                                          | 12 of 16 have a direct quote, 8 of those by P4                                                         |
| 4. Background                       | what came before: earlier vote, the rule it replaces, the date it was passed, a number it changes                                    | 14 of 16 give background; 12 spread through the story                                                  |
| 5. Next                             | what happens next, with the date or place, or where to find out more                                                                 | 6 of 16 end on a next step or service line; 6 end on a quote                                           |

Fit by length (the planner rule, from how the real stories drop slots as they shorten):

- 3 sentences: Lede, Impact, Next. (S3 and S15 and S10 are this shape or shorter; S15 uses lede, why the date matters, numbers.)
- 4 sentences: add Voice or Background, whichever the records have. A quote is only used when a named person on the record has one; without one, the sample still has 4 of 16 stories with no quote.
- 5 sentences: Lede, Impact, Voice, Background, Next.
- 6 sentences: add a second Voice from a person on the other side (S7 names the lone dissenter in P2; S8 and S9 carry a dissent or a critic in their quotes).
  Order: lede first, then falling importance. Cut from the bottom (the teaching pages say editors cut the end first). Later mentions use the surname.

---

## B. Diary and memoir: coding

### B1. Pepys, Jan 1-14, 1660 (14 entries, script plus reading)

Before the entries there is an opening block on the state of the year: public affairs first (the army, Parliament, the City), then one sentence on his own money and job. That is a precedent for a "first page": the world, then me.

Entry shape (script counts, raw text; sentence counts rough because semicolons split):

- Words per entry: 152, 165, 170, 173, 191, 238, 243, 252, 267, 310, 340, 426, 429, 621. Total 3,977 words. Mean 284, median about 248. Range 152-621.
- Opens with: a time of day 8 (This morning, In the morning, Early, Coming in the morning, Went out early); a place or work ("At my office", "Nothing to do at our office") 3; a state or situation ("Being at Will's", "I drink my morning at...") 2; a catch-up over days ("For these two or three days") 1. No entry opens on a date alone (the date is the heading) or on a feeling.
- Events are in clock order. The biggest event is not first. Public news (Parliament, Lambert) sits in the middle as one or two clauses, surrounded by errands, meals and cards.
- A single small fact gets one clause of about 8-20 words ("gave him a shilling", "my wife dressed the remains of a turkey and burned her hand"). A failed errand is recorded each time it happens ("missed of him") and costs one clause.
- People: "Mr." or "Mrs." plus surname almost every time; kin by relation ("my wife", "my father", "my Lord", "my Lady"); a nickname once ("Mrs. Jem"); first names are rare (Tom for a servant). A person gets a few words of who they are on the first use only when new.
- Ending: 11 of 14 close with going home or to bed ("and so to bed", "so home"). Four entries (2, 4, 9, 12) end on a feeling or condition (a bad night, a swelled nose, "great trouble", a thought about money); of these 2, 4 and 9 also touch bed or home. One entry (8) ends on a news fact (a burial the next day). Reflection is rare and short: one or two exclamations in 14 entries ("Strange the difference of men's talk!", "I was vext").
- Joiners (word matches across the 14 entries; some matches are not joiners, e.g. "but" often carries contrast but not always): thence 29 (includes "from thence" 8), where 37, but 25, and so 18, then 16, which 16, till 11, after that 10, "to bed" 10, "this day" 8, "this morning" 5, while 5, "and there" 5.

### B2. Gideon Welles, Mar 17 to Apr 2, 1863 (hand-coded, not counted by script)

- Three dated entries over about two weeks: Mar 17, Mar 31, Apr 2. Each entry is several hundred words and grouped by topic (letters of marque, then the Charleston attack, then Farragut and Porter), not by clock time.
- Opens: "Returned last evening from [trip]" (what just happened); "For a fortnight I have been ill" (a catch-up that explains the gap); "Had a call last evening and again to-day from Senator Sumner" (a person).
- Joined by: contrast ("but", "yet"), cause ("for he must be sensible of..."), "I suggested... Seward said... no one sustained", "in the first place", "therefore", a quoted exchange summarized in a sentence per speaker.
- Small facts: a rumor or report gets one sentence ("Conflicting accounts concerning Farragut's command"). A person's behavior gets several.
- People: surname plus title or no title (Seward, Chase, Mr. Seward, Senator Sumner, the President, Du Pont). Relation words only for kin (his brother-in-law Heap).
- Reflection is constant and judgmental: opinions on Seward, Chase and Porter inside the paragraph, and a month-end close ("I close my book and this month of March with sad and painful forebodings") followed by one sentence of hope for April. So a long stretch ends in a mood plus a look ahead.

### B3. John Quincy Adams, Oct 26-29, 1794 (hand-coded, 4 entries)

- Opens: a time and activity ("After writing all the forenoon"); a visitor ("Mr. W. Vaughan called on us this morning"); a summary of the day's weight ("a great deal of business crowded into the last five or six hours"); a scene of the road ("The road from London to Harwich is not so much travelled...").
- Weighting: a dinner party gets one sentence listing guests by name and relation ("Mrs. Copley's father, their son, and two daughters"). The business call to John Jay, which matters most, takes most of an entry (cash, then advice on conduct).
- Joined by: "In the first place", "I then requested", "therefore", "As the situation... I have determined", plus a time sentence ("to-morrow at 2 p.m."). Cause is stated outright ("Being so critical, I resolved...").
- Reflection: 3 of 4 entries contain an evaluating sentence (praise of a mother, the charm of the women he meets, the travelers "as if Babel returned"). Two of 4 end on a next step or plan (he retires early to prepare to leave), one on a feeling, one on a bodily detail (cold on deck, a berth).
- People: "Mr./Miss/Mrs." plus surname, relation to someone else ("Mrs. Copley's father", "his father at Hackney"), and kin by relation ("my mother").

### B4. Memoir guidance (search summaries, not full pages)

Two modes: scene (a moment in real time) and summary (compressing time). Spend scenes on moments that matter and summary on stretches that do not. Too much summary stalls a piece.

### Totals across the three diaries (hand plus script)

- Opens on a time or an activity: Pepys 8 of 14, JQA 1 of 4 (plus 1 on a visitor).
- Opens on a person or event arriving: Pepys 0 of 14, Welles 1 of 3, JQA 1 of 4.
- Opens on a catch-up of days passed: Pepys 1, Welles 1.
- Closes on going home or to bed: Pepys 11 of 14.
- Contains an evaluating sentence: Pepys about 2 of 14 (rare), Welles 3 of 3, JQA 3 of 4. The more public or political the diarist, the more reflection.
- Ends a stretch with a mood plus a look ahead: Welles (month close) 1 of 1; JQA 2 of 4 end on a next step.

### Recommended outline: "first page" (the evening a new life begins)

Based on Pepys's year-opening block (world, then self) and the first entry (a morning opening, a short chain of places, evening at home).

1. The world as it stands: two or three clauses on what is going on around the person (the year, the place, who holds the main office, the biggest news), each as a plain fact. Pepys gives this about as much room as a whole entry.
2. Me: one sentence on my own condition, money and work, with a mild, honest self-assessment (Pepys: well off by reputation, poor in fact).
3. The first day: a time word, then a short chain of three or four places and people in order ("This morning... then... in the evening"), each fact one clause. Name kin by relation, others by title and surname.
4. One small domestic fact (a meal, a burned hand) so it reads like a life, not a report.
5. Close on going home or to bed, with a one-clause mood or a worry.
   Length: Pepys's first entry is 173 words; the whole opening block runs a few hundred. A game first page of 4-6 sentences keeps items 1, 2, 3, 5.

### Recommended outline: "week paragraph" (several dated records grouped)

1. Open on a time or span, not a date: "This week", "For two or three days", "Through the week" (Pepys's catch-up opening; Welles's "For a fortnight").
2. Name the biggest record first as the paragraph's subject, then list the others by falling weight (JQA gives the big meeting most of the entry, the dinner a sentence).
3. Join with a time word or place move: "then", "after that", "from there", "by Friday", "meanwhile".
4. Use one "but" or "yet" for a contrast when two records disagree (a promise and a vote).
5. Give small facts one clause each; give the one that costs money or changes a relationship one full sentence.
6. People: title plus surname, kin by relation, first name only for a friend already met.
7. End on a mood or a plan ("so home", "a worry about..."), or with a one-sentence look ahead. About one entry in four ends on a feeling; reflection is more common the more political the diarist.

### 10 joining devices with counts

Counts for devices 1-9 are Pepys word-matches across 14 entries (about 3,977 words), and the "also in" column is whether Welles or JQA use a form of it (hand-read, not counted). Device 10 counts entries.

| #   | Device                                               | Pepys count          | Also in Welles / JQA                          |
| --- | ---------------------------------------------------- | -------------------- | --------------------------------------------- |
| 1   | place move: "thence", "from thence", "went to"       | 29 ("from thence" 8) | JQA yes (moves to dinner, to the packet)      |
| 2   | relative "where" ("went to X, where he...")          | 37                   | Welles yes                                    |
| 3   | "but" (contrast or interruption)                     | 25                   | Welles, JQA yes ("but", "yet")                |
| 4   | "and so" (result or continuation)                    | 18                   | no                                            |
| 5   | "then" (next step)                                   | 16                   | JQA yes ("I then requested")                  |
| 6   | "which" (adds a fact about the last thing)           | 16                   | Welles yes                                    |
| 7   | "till" (until an hour or a state)                    | 11                   | JQA yes (time of day)                         |
| 8   | "after that" / "after"                               | 10                   | yes in both                                   |
| 9   | "this morning" / "this day" / "to-day" (time anchor) | 15 combined          | Welles "to-day", JQA "this morning"           |
| 10  | close-out "and so to bed" / "so home"                | 11 of 14 entries     | not used (Welles closes on mood, JQA on plan) |

Also seen without a count (hand-read in Welles and JQA): cause ("for", "therefore", "as the situation is..."), "in the first place", "in the meantime", and one-clause said-lines ("Seward said he had no money").

## Notes for the Story lead

- News ledes in the sample are summary ledes, one sentence, median 22 words, with who-did-what and the number (vote count) in it; headlines and ledes are different objects.
- The second sentence, not the quote, is where the sample does the explaining; quotes come in paragraph 3-4 typically and need a named, titled speaker.
- Diaries put the biggest thing in the middle at its natural time; only the political diaries stop to judge. A game "week paragraph" can join by time and place words (place and time moves are the most common joiners in Pepys) and add one judgment sentence only where the player's own record supports it.
- Checks not done: no story on a new US president; no first-hand Anne Lister, Benn or Channon pages; Welles and JQA joiner counts are by hand.
