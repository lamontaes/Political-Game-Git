# The owner's scene examples

This is the owner's record of scenes, moments, conversations and story beats he has asked for, in his words, collected from the decision logs, playtest notes, prior rulings and design docs. Each line gives his quote, the date, the `file:line` source, and, where the record says, whether it exists on main (built, in PR, open item, missing). Newest first by date within each section. Scene-standard rules (how a scene must be built) are in `.agents/skills/scene-standard`; this file lists only what he asked to see.

Source shorthand: **OD** = `docs/coordination/OWNER-DECISIONS.md`; **REG** = `docs/coordination/DECISION-REGISTER.md`; **LAW** = `docs/play-first/LAW.md`; **PT** = `docs/coordination/playtest/2026-10-26-1.md`; **DR** = `docs/coordination/playtest/2026-10-26-1-drafts/`; **PR-elections**, **PR-screens**, **PR-words** = `docs/coordination/prior-rulings/{elections,screens,words}.md`; **OR** = `docs/reports/owner-record/01-decisions-governing-current-work.md`. Status is read from `docs/pool/items/` on main (Oct 27); "missing" means no pool item was found.

## The model for all of it

- **Comic-strip stories** (owner, Oct 26; OD:32): "The way it does its stories or scenes, like in the comic book strips, that's how I want it in my game... where the narrative and the story progresses through those scenes, where you're clicking through dialogue and then you play the game through the actual game." Open item `words-scenes-like-wildermyth`.
- **Scene out of the world** (owner, Oct 24, via the acting CTO; OD:77, LAW:50): scenes "that come out of what is actually happening in the world, narrated into a moment, played out with real dialogue and choices, the outcome back into the game; the current opening is the right shape, the words are wrong." Open item `words-scenes-like-wildermyth`.
- **Wildermyth month pacing** (owner, Oct 26; PT:20, OD:14): "a month might jump by... It's okay if it goes from January 14th all the way to March 11th, and then there's something on March 11th, 17th, 18th, and 21st, then nothing till July." Missing as a rule the director follows.
- **Scenes are the narrative** (owner, Oct 14, night; OD:287, LAW:42): "The President's address at the opening is the model: the director reads the records, picks from everything the simulation supports the scenes that apply to this person now, and fires one, told by the English engine." Built (#5914), item `words-scenes-fire-in-play`.
- **What a scene is** (owner, Oct 15, evening; OD:381): "A scene has a setup, a person with a purpose, and stakes, and it plays out." Built (#5914, `words-scenes-fire-in-play`).
- **Scenes play out as trees** (owner, Oct 16, early morning; OD:408): scenes "become trees with several branches and endings (up to about ten per scene as the engine grows)." Built (#4612, `words-scene-endpoints`), though PT:20-era play shows no branching.
- **Every scene has conclusions** (owner, Oct 16; OD:426): "A scene has several distinct endings, and several ways to reach each one; today most branches just stop." Built (#4612, `words-scene-endpoints`).
- **Consequential dialogue** (owner, Oct 14, night, 9:25 p.m.; OD:304): a scene has a goal and "its dialogue is consequential: a family scene at home, or a tense floor vote where the goal is to convince one member to vote no on the amendment (the owner's example: McCain and the Obamacare repeal)." Missing as a played scene.
- **Narrator speaks mid-scene** (owner, Oct 19, later; OD:511): "let the narrator speak between lines ('the crowd grows louder'), as Baldur's Gate does." Missing.
- **Extra replies from your life** (owner, Oct 19; OD:501): "Baldur's Gate 3 is the model: some replies are extra options drawn from the player's own life ('[Out of work]')." Missing.
- **Skip or simulate a scene** (owner, Oct 26; PT:27, OD:21): "Continue" becomes "Skip scene" or "Simulate scene", with the scene's name above Day and Week. Missing.

## Opening

- **President's address as a speech** (owner, Oct 26; DR/covered-notes.md:11): "This isn't coming out like a speech. And these scenes are hard-coded in." / "That's not a speech." Open item `play-first-09-opening-speech-per-world` (an earlier version, #5902, was rejected in play).
- **Speech per world** (owner, Oct 24; LAW:43): "The opening speech is generated per world and per president from the game's numbers, not formulaic." Open item `play-first-09-opening-speech-per-world`.
- **Real figures in speeches** (owner, Oct 19; OD:465): "Speeches should work in real figures naturally (inflation, Social Security, states' rights, whatever the record holds)." Open item `words-opening-speech-per-world`.
- **Speaker kinds** (owner, Oct 19; OD:465): lines "should belong to kinds of people and ways of speaking (a newscaster, a plain speaker, a polished one)." Missing.
- **Inauguration as news** (owner, Oct 26; DR/words-news-inauguration-story-reads-as-news.md:18): "This isn't news." Open item `words-news-inauguration-story-reads-as-news`.
- **President poses** (owner, overnight; OR:590): "three or four poses that the president could take... one maybe like an action one where they're pointing, one sitting at the Resolute desk, you know, one among a bunch of people." Missing.
- **First "this is cool" moment** (owner; REG:220): "Seeing the President and Vice President, clicking them and reading their records; then seeing a bill and everything legislation can do." Built (the opening scene exists; PT:33 says it reads as a stat readout).
- **Opening order** (owner, Sept 28; PR-screens:109): "the year and the world, then the White House, then your corner of the country (your state's governor, legislature and current fights; your county and town), then your story last." Built in part (`PR-screens:109`).
- **Title as national scenes** (owner, Oct 8; LAW:24, PR-screens:29): "title screen = recognizable national scenes (White House at night, Lincoln Memorial, rally, convention) with people posed in them." Open (draft `DR/play-stop-27-title-motion-and-rotation-restored.md`, no pool item yet).

## Home and family

- **Family reaction with a purpose** (owner, Oct 26; DR/words-household-filing-scene-has-a-purpose.md:18): "there was no reason to have that dialogue. ... that's not like Wildermyth, because there was no reason to have that conversation. It was unnatural. Like, that scene was useless." Open item `words-household-filing-scene-has-a-purpose`.
- **Narration that does not restate** (owner, Oct 26; DR/words-scene-narration-does-not-restate-where-you-are.md:18): "It shouldn't say you're at home. You're obviously [there]." Open item `words-scene-narration-does-not-restate-where-you-are`.
- **Mother asks you to sit down** (owner, Oct 14, night; OD:287): "a mother asking the player to sit down: a divorce, a lost job with hope for another," with consequences over the following months (money tighter, a better job, a new partner met at work). Open item `words-scene-for-unstaged-big-moments`.
- **Parent interrupts when the world says so** (owner, Oct 14, night; OD:287): "A parent interrupts the player when the simulation says so ('did you do your homework?'), never on a schedule." Missing.
- **Family scene from household records** (owner, Oct 14, night; OD:294): "the director picks the scene that applies from the household's own records (money, work, school, health), and it has consequences." Missing.
- **Family absence** (owner, Oct 25; OD:44): "a family member's absence is a scene when a record explains it (moved away, in the hospital, jailed, died), silent otherwise." Open item `words-scene-family-absence` (claimed).
- **Family reacts to filing, win, loss, absence** (owner, Oct 15, evening; OD:390): "a family member reacting to your filing, your win, your loss or your absence." Open item `words-household-filing-scene-has-a-purpose`.
- **Win greeting** (owner, Oct 15, night; OD:410): "a win may say 'Mr. Commissioner'; promises like 'This weekend is ours' belong after a few exchanges." Missing.
- **Money breaks the wallet** (owner; OD:133): "Money trouble shows in scenes and in how the person looks and lives (a worn look when broke, a scene that breaks the wallet)." Missing.
- **Wedding** (owner, Oct 14, evening; OD:267): "Thirty items are thirty different scenes (a legislator arguing, pork barreling, a wedding, a council meeting, a rally)." Missing.
- **A death retrospective** (owner; REG:1110): "A death retrospective like Crusader Kings III or BitLife: journal-like, the kind that makes you say 'I forgot that happened.'" Missing.
- **Heir rides the wave** (owner, Oct 14; OD:213): an heir can "ride the wave of my movement" (RFK's Indianapolis speech); a Crusader Kings 3 style summary on death. Missing.

## Meeting people and talks

- **Talks with replies and purpose** (owner, Oct 26; DR/covered-notes.md:5): "what the hell, mark gap, say nothing, leave. This is not ... like what I approved as dialogue." In PR #6078 (open and green when logged, `words-scene-talk-in-play` and `play-stop-01-talk-says-nothing` track it).
- **Four replies, say nothing apart** (owner, Oct 14, afternoon; OD:263): "A conversation always offers four replies ranked by the engine, with 'say nothing' as a smaller control beside them." Built (#4469, `words-replies-continue` covers the reply rule).
- **A reply continues the talk** (owner, Oct 15, evening; OD:362): "'All right' and 'Okay' as answers to 'How's Keanu?' are not how conversations work." Built (#4469, `words-replies-continue`).
- **Introduce people first** (owner, Oct 15, night; OD:399): "The narrator says who someone is and why they are here ('You arrive for the interview Michael Howell asked for; he writes for Weom')." Built (#4468, `director-narrator-sets-scene`).
- **A good exchange keeps going** (owner, Oct 16; OD:454): "'If I wait, somebody else takes it' met with 'Or you lose, and nobody remembers you either' should open more talk, not end." Missing.
- **Scenes run five to ten exchanges** (owner, Oct 15, night; OD:404): "five to ten exchanges for a contentious one; a scene does not end at 'Deal.' when there is more to settle." Missing.
- **Mirror escalation** (owner, Oct 16; OD:438): "When the other person escalates, the player can escalate back." Missing.
- **Shared-cause invitation** (owner, Oct 24 playtest; `docs/reports/playtest-2026-10-24.md:128`): talk with Noah Chan after a "shared cause" moment should be heard, not "Hi." / "Have a good day." Fix reported green and ready to merge in `docs/coordination/LEADS-2026-10-24.md:1969`; related open item `words-reunion-talks-the-shared-cause`.
- **Mentor scene** (owner, Oct 16; OD:461): liked "Run for state senator when you can win it, not when you want it." Built (graded and liked, `OD:461`).
- **Volunteer after a rally** (owner, Oct 16; OD:420): "They loved you up there. What do you need from us this week?" should talk about the speech first. Missing.
- **Reporter at your door** (owner, Oct 15, evening; OD:390): "a reporter at your door." In PR #5407, item `play-campaign-ask-reaches-player`.
- **Interview** (owner, Oct 26; PT:21): "having interviews". Pick-an-outlet built (#4777); the interview scene is open item `words-campaign-season-scenes-fill-the-months`.
- **Romance without a prompt** (owner, Sept; `prior-rulings/people.md:14`): "Romance progresses naturally from time spent together (shared places, repeated meetings, conversations)... no prompt, no dice." Missing as a scene.

## Filing

- **Filing deliberately marked** (owner, Oct 26; PT:35): nothing marks deciding to run; the clerk says "on-ballot". Open item `words-filing-clerk-line-after-filing`.
- **Filing is a conversation at the clerk** (owner, Oct 6; PR-elections:40): "Files at the clerk's office (a conversation that teaches the campaign)." Open item `words-filing-clerk-scene-where`.
- **Signatures are a few played scenes** (owner; PR-elections:39): "Signatures: a few played scenes, the rest background, where the place requires them." Built (#4720, `elections-petition-signatures`).
- **Party asks you to run** (owner, Oct 25 and Oct 14; OD:44, OD:189): "a player with a high-standing job may be propositioned to run for a seat someone needs filled (a Pendergast-style approach)." Built (#6146), item `words-scene-party-asks-you-to-run`.
- **Party asks only with inroads** (owner, Oct 15, night; OD:37): "The party asks someone to run only with some inroads on record." Built (#6146).

## Campaign season

- **A season full of scenes** (owner, Oct 26; DR/words-campaign-season-scenes-fill-the-months.md:18, OD:15): "See, there's nothing happening. This is where scenes should be happening. You know, getting ready for the election, having interviews, a debate, assembling, you know, an election team, meeting people, having moments that, you know, change your life, working with other candidates, working with current elected officials, holding rallies, etc. That maybe, you know, participating in corruption if it comes up, etc." Open item `words-campaign-season-scenes-fill-the-months`.
- **Election team** (owner, Oct 26; same quote): "assembling, you know, an election team". Open item `words-campaign-season-scenes-fill-the-months`.
- **Moments that change your life** (owner, Oct 26; same quote): "having moments that, you know, change your life". Missing.
- **Working with other candidates and officials** (owner, Oct 26; same quote). Missing.
- **Corruption if it comes up** (owner, Oct 26; PT:21): "participating in corruption if it comes up". Missing as a campaign scene (bribes exist: `gov-bribe-buys-a-contract`).
- **Door knocking as a montage** (owner, Oct 8, recorded Oct 26; OD:24, DR/words-door-knocking-montage-with-porch-scenes.md:18): "Door knocking plays as a montage with porch scenes, not a tally." / "It just throws you into a location. This is where a scene would help." Open item `words-door-knocking-montage-with-porch-scenes`.
- **Door count means nothing** (owner, Oct 26; same file:18): "How do you know you knocked on 45 doors, 32 reached? What the hell does that mean?" Open item `words-door-knocking-montage-with-porch-scenes`.
- **Campaign acts are scenes** (owner, Oct 20; OD:131, LAW:60): "Campaign acts are scenes you go to (a venue for a speech, doors to knock, an interview, a debate)." Built (#5549), but the venues are bare per PT:36.
- **Debate** (owner, Oct 14; OD:191): "A campaign day: a handful of choices. Debates are in early access." In PR #5975, item `words-debate-opponent-scene` (sent back).
- **Debate answers as scenes** (owner, Oct 24 playtest; `docs/reports/playtest-2026-10-24.md:141`): "No debate scene, no opponent answers, no audience." Expected: see the debate. Open item `words-debate-answers-not-campaign-stops`.
- **Speech built four parts at a time** (owner, Oct 14; OD:192): "the player composes a speech by picking one of four parts at a time, as Suzerain does." Built (#4815, `play-speech-builder`).
- **A four-line rally is not a speech** (owner, Oct 15, evening; OD:364): "Short openers and closers, then longer, meatier choices at the core of the speech... The rally's choice set (batch 11 scene 16) is the shape to build on." Built (#4477, `words-speech-built-in-stages`).
- **Rally as a public scene** (owner, Oct 14; OD:185): "the director gains public scenes (a rally, a march, a crowd, a speech to strangers)." Missing.
- **Rally, debate stage, convention held until produced** (CTO on the owner's Oct 6 decision; PR-elections:105): debates, rallies and conventions "happen only when real actors (sponsors, parties, campaigns) set them up." Missing producers.
- **Campaign volunteer or opponent at a rally** (owner, Oct 15, evening; OD:390). Missing.
- **Donor or party chair asks** (owner, Oct 15, evening; OD:390): "a donor or a party chair asking for something." In PR #6002, item `words-donor-ask-scene`.
- **Campaign is not a math problem** (owner, overnight; OR:441): "if you are really good at speeches, like that can really guide you, or... you need a Pendergast-type figure." Missing.
- **Interest groups approach you** (owner, Oct 14; OD:208): "The player is approached (support with strings, a bribe with a real risk), but never through hard-coded situations." Missing as a scene.
- **Primary challenge** (owner, Oct 14; OD:185): "primary challenges" as early access. In PR #6022 for the loss side, item `words-primary-loss-scene`.

## Election day and night

- **Election day is five minutes of scenes** (owner, Oct 26; PT:22, OD:16): "canvassing, 'going to vote, this should be a scene, you know, maybe with a narrator', the returns, 'conceding or... celebrating.'" Open item `words-election-day-and-night-scenes` (claimed).
- **Going to vote with a narrator** (owner, Oct 26; PT:22): "going to vote, this should be a scene, you know, maybe with a narrator." Open item `words-election-day-and-night-scenes`.
- **Election morning canvass** (owner, Oct 26; OD:16): election-day canvassing. Open item `words-election-day-and-night-scenes`.
- **Election night as its own pop-up** (owner, Oct 26; PT:22, OD:16): election night "needs to be its own pop-up menu kind of thing." Open item `words-election-day-and-night-scenes`.
- **Concede or celebrate** (owner, Oct 26; PT:22): "conceding or... celebrating." Open item `words-election-day-and-night-scenes`.
- **Election night with your real people** (owner, Oct 6; PR-elections:19, `prior-rulings/press.md:15`): "election night is a played scene with your real people, precinct by precinct, crowd behind sized by turnout." Open item `words-election-day-and-night-scenes`.
- **Polling place scene** (owner, Oct 14; OD:164, REG:82): "The player goes to their polling place and marks a ballot there; the vote is cast in the scene, never in a menu." Built (#6062, the ballot turns to the player's own race, per `LEADS-2026-10-24.md:2336`).
- **Engine never votes for you** (owner, Oct 14; OD:332): "the engine never votes for the player"; election day is a scene at the polls. Built (#6062).
- **Loser's podium** (owner, Oct 14; OD:339): a loser's podium scene through the existing conversation. Open item `words-primary-loss-scene` (#6022).
- **Morning after** (owner, Oct 26; PT:38): the morning-after scene "has purpose" but restates "You're at home." Fix reported merged (#6147, `LEADS-2026-10-24.md:2336`).
- **Election night text panel** (owner, Oct 26; PT:38): election night is "a text panel with 'Turnout 34 / 161' against 373 votes." Own race first built (#6041, `play-election-night-own-race-first`); the scene itself is open item `words-election-day-and-night-scenes`.

## Holding office and lawmaking

- **Colleague asks for your vote** (owner, Oct 15, evening; OD:390): "a colleague asking for your vote; you telling a colleague you can't vote yes after all." Built (#5949, `words-bargain-scenes`).
- **Telling a colleague no** (owner, Oct 15, evening; OD:383): "I'm really worried about this vote. I know I told you yes, but this time I can't do it." Built (#5949).
- **Carry a bill** (owner, Oct 15, evening; OD:390): "a member asking you to carry a bill." In PR #6007, item `words-carry-bill-scene`.
- **Mayor's desk with a bill** (owner, Oct 15, evening; OD:390): "the mayor's desk with a bill waiting." Built (#5953, `words-desk-bill-scene`).
- **Office hours** (owner, Oct 15, evening; OD:390): "a constituent at office hours with a problem." Built (#5955).
- **Staff bring bad news** (owner, Oct 25; OD:44): "staff bringing bad news is a scene when a press record names the player or their bill." Open item `words-scene-staff-bad-news` (claimed).
- **Council bargaining over a section** (owner, Oct 15, evening; OD:390). Built (#5949).
- **Bill scenes at every stage** (owner, Oct 16; OD:480): "There can be multiple scenes. Multiple things can happen when writing a bill." Hearing scene built (#5932, `words-hearing-scene-for-the-sponsor`); chair's question open item `words-hearing-chair-question`.
- **Floor switch** (owner, Oct 16; OD:461): liked "Why me?" / "Then move me. What's it worth to you?" / "Done. Put it in writing tonight." Built (graded and liked, `OD:461`).
- **Appointment** (owner, Oct 16; OD:461): liked "Why me? We've never met." / "That's the point." Built (#4738).
- **Vote and floor on screen** (owner, Oct 26; PT:40): a sitting congresswoman "spends a year in her bedroom: no D.C., no Capitol, no colleagues, constituents, lobbyists." Missing.
- **Legislature in the background** (owner, Oct 26; OD:19): bargaining, deals, vetoes, killed bills and pork. Open (laws lead; `PT:25`, `docs/coordination/playtest/2026-10-26-1-assessment.md:86`).
- **Trial in scenes** (owner, Oct 14; OD:201): "the trial plays in scenes; then the player is gone for the sentence." Open item `words-justice-imprisoned-talk`.
- **Temptation and scandal** (owner, Oct 14; OD:201): "an affair, a payoff, told without graphic detail." Missing.
- **Recall** (owner, Oct 14; OD:207): "Recalls: in. Rare, from causes." Built (#4817, `director-recall-override-scenes`).

## News and the journal

- **Journal as a chronicle** (owner, overnight; OR:472): "It needs to be more in a narrative way... you ran for governor, you ended up raising this much. You know, maybe this could affect your legacy." Open item `play-first-10-journal-from-day-one`.
- **Journal from day one with history** (owner, Oct 26; DR/covered-notes.md:26): "What the hell kind of entry is that? Again, there's no history. I keep saying history should be simulated." Open item `play-first-10-journal-from-day-one`.
- **News looks like a newspaper** (owner, overnight; OR:464): "literally visually look like a newspaper or a magazine... a bunch of different titles, kind of like Apple News." Built (#4305, `play-news-front-page`); the story view reopened as `play-stop-42-news-story-opens-as-the-paper`.
- **A news story opens as the paper** (owner, Oct 26; PT:39): News is a gray list. Open item `play-stop-42-news-story-opens-as-the-paper`.
- **Live news worded** (owner, Oct 26; PT:39). In PR #6213, item `words-live-news-worded`.
- **News overheard** (owner, Oct 14; LAW:77): "TV or radio speaks like anyone else: a small card in the conversation text style with a tiny radio/TV icon." Missing.
- **Heard it from the news** (owner, Oct 16; OD:474): "most people's friends don't talk about laws that were passed. Usually... the news and social media and stuff." In PR #5150, item `director-law-reached-scene-teller`.
- **Bills get monikers** (owner, Oct 14, evening; OD:268): "People call a bill what people call it (Obamacare, the bottle bill, the One Big Beautiful Bill)." Built (#5067, `words-bill-name-of-bill`).

## Other

- **Death or stepping away** (owner, Oct 14; OD:213): "a summary in the manner of Crusader Kings 3; continue as anyone... keep watching the world, or start a new game." Missing.
- **The world happens around you** (owner, overnight; OR:381): "other people lie, or other people run for elections, or other people literally anything: go to college, get married... You're a cog." Missing as a visible scene.
- **Corruption caught by people turning** (owner, Oct 5; `prior-rulings/press.md:27`): "caught ONLY via investigations, leaks, records, or people who turn on you. No detection roll." Open item `gov-corruption-unexplained-wealth-surfaces`.
- **Judge plays cases as scenes** (owner; `prior-rulings/justice-officials-population.md:31`): "Judge play: cases as scenes, rule within law and philosophy, appealed, reported, remembered." Missing (courts after early access).
- **Epidemic closes the schools** (owner, Sept; `prior-rulings/people.md:74`): "named people you know get sick, and officials decide whether schools close." Missing.
- **Threats sound like politics** (owner, Oct 15, night; OD:403): "You'll need friends after this vote. I won't be one." Built in part (graded, `OD:403`).
- **Public meeting agenda** (owner, Sept 29; PR-words:34): "A public meeting's agenda comes from real local business: the ordinances filed." Built in part.
- **A state capital and local places** (owner, overnight; OR:596): "50 state capitals, uh, scenes, but local stuff... like the parks or whatever." Missing.
- **A notice from the election office** (owner, Oct 14; OD:241): "A notice from the election office is the kind of thing the newspaper prints." Missing.

## Count

Counted from the trailing status of the 112 entries above (an entry that is partly built is counted as built only if its phrase starts with Built):

- Built: 30
- In PR: 10
- Open item: 36
- Missing: 36
