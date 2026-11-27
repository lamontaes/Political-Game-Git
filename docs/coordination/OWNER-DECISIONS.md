# Owner decisions

The CTO's only writer. When two rulings conflict, the most recent wins unless the older one makes more sense; either way the conflict is flagged here. Per-area digests of the owner's earlier Drive rulings live in `docs/coordination/prior-rulings/`; every session reads its area's digest before asking. Open questions block the release build (stopgap kind `owner-decision`). Rulings stay here so no session asks twice.

## Nov 17, 2026, afternoon: menus, the Desk, announcing (owner, verbatim; recorded by the CTO)

- **Menu test round 1 rejected** (about 2:25 p.m.): "Okay, I don't really like any of these, to be honest. They still have a ton of empty space in the menus. Or, yeah, in the screens. Like, it's just a transparent screen with stuff pasted on it. It's been the problem the entire time. I mean, I guess it's better with not looking like Excel, but still." The CTO's brief had required one see-through panel over the room. That rule produced this look, and it is dropped for menu mock-ups.
- **What fills a good menu** (inline): "The menu is the picture, Small and tight, Same size, more in it". He was "worried about a bunch of slop getting in there", so every word on a mock comes from data the game exports (#10035), and the CTO checks every line against it.
- **Round 2 pick** (Desk, about 3:50 p.m.): "The menu is the picture, version 2" (Sol's painted ballot-box Elections page, #10036). His note: "I would like to see this in the game's natural colors and a few other colors and a few other screens as well. This is barely taking any usage so you can have them do the entire screens or whatever or the entire menus but probably without people in them so I don't wanna have white or Black people." He clarified: no people in the painted art; the game's busts still show where a screen is about a person. Round 3 is #10038.
- **Desk layout** (inline): updates are a short summary, then a headline list with one tagged line per change (tap a line for its picture), with the rest folded. Questions are a one-line ask with lettered choices, each carrying its picture.
- **Announcing a run** (about 4:10 p.m.): "it should not open with money raised, spent, volunteers, indoors, unless it starts at 0... other people should be able to announce. Now, a lot of times, people won't get a lot of coverage, but, maybe the paper can announce, Shively Johnson and 3 others file for mayoral race or something like that, Of course, other people should be able to do it early."
  - A new campaign starts at zero (#10013 already does).
  - Other candidates announce early, each deciding from their own record (Elections, #9995).
  - The paper covers announcements and filings modestly, often as a roundup that grows with the race's importance (Story, #9750).
- **How announcing happens** (about 4:15 p.m.): "Also, announcing has to work somehow. Like, where do you announce? Maybe, maybe there is no real announcement. Maybe you're talking to a friend and you say, well, I guess I'm a candidate now, or I want to be. Or maybe you go to the party headquarters in your city, if it has one, and, you tell them you want to be a candidate. Or maybe you go to a rally, or maybe you just start talking to people. I don't know. There needs to be a bunch of different ways. Again, this goes to the story."
  - Announcing is a moment in the world with many ways in, offered by the player's life and place, not a button that flips a state.
  - Who hears depends on the way (a friend, the local party, the public). Story writes the scenes (#9750); Elections records the way and who heard (#9995).
- **Menu colors** (Desk, about 4:25 p.m.): "I like the one that's in the current game colors I do also like the red white and blue. There is still a lot of dead space though and text is just floating." Part B of #10038 uses the game's own colors, with two screens also in the paper red, white and blue. No dead space, and no text floating on the background: every block sits on a painted surface or a grouped panel.
- **Loading screen** (about 4:30 p.m.): "I don't like how boring the loading screen is... it should have a bunch of different things, like skimming a little off the top, closing alphabet agencies, legislating bureaucracy, you know, things like that, things that are kind of sarcastic." Each loading step shows a rotating stream of dry, sarcastic lines about the machinery of government (Story writes them; Menus builds the rotation), and the real step names stay readable.
- **Delete, don't fix** (about 4:45 p.m., angry, said "at least three times today"): "I said you can delete everything that wasn't written in the past couple days because it's all shit. I keep saying this I'd rather it start from nothing and build it up correctly and keep trying to fix the same garbage that isn't working."
  - The opening address scene is deleted. The game opens at home on the evening of January 20, and the address survives only as a record for the news and the family.
  - Story content that isn't working, or that predates the last couple of days and isn't proven in play, is deleted, not repaired.
  - Never ask him keep-or-cut questions about old content.
- **Faster checks** (about 3:20 p.m.): "whichever one's faster." Heavy test jobs move off pull requests to the train-to-main PR (Long game, #9752).

## Nov 17, 2026, midday: after playing v0.113.0 (owner, verbatim; recorded by the CTO)

- **Delete what the engine didn't write** (about 11:45 a.m.): "STOP TRYING TO MAKE SHIT SHINE JUST DELETE EVERYTHING THAT IT HASNT WRITTEN EBCAUSE THIS ISNT HELPING." Read back to him, he confirmed "Yes, that's it. Go.": every scene and line the English engine didn't compose from the world's own records is deleted, including stock lines picked whole from a bank and lines whose only insert is a padded name. A scene kind with nothing engine-written stops playing and is removed with its lines and tests, and a check keeps them out. Fewer scenes play until the engine writes them. Menus are not in this ruling.
- **Running for office:** "Run now, file on the date." From day one the player can announce for a coming race, form a campaign committee, raise money and gather petition signatures. The official filing happens in the real window, and the year between is the campaign.
- **Visual stops, in his order:** "Yes, go in that order": no boxes, the strip shrinks to its people, silent people never shown big, skin and colors as swatches with hair as pictures, no empty space in the creator, no person before a gender is picked, Metrics doesn't scroll. Also: "you should be able to randomize an entire character."
- **Builds ship on his stops, not on green checks:** a build ships only after a session that didn't build the fixes has played the installed app through filing and every stop he named, with screenshots.
- "saves literally dont matter. but make your own save so you can see."

## Nov 17, 2026, morning: Desk answers (owner, verbatim; recorded by the CTO)

- **Who hears a speech** (8:04 a.m.): "One by one: only the people you can see that day (household, family, people in focus, officials present). Everyone else hears it as part of their group, and each still keeps their own record when you meet them." Detail on demand: one record per group, and a person's own record is made when the player meets them.
- **New mechanics from real lives, bank 3** (8:03 a.m.): "Build the basic versions after the road to the first election is done: impeachment and censure, certification, quorum, special election dates. Violence aimed at officeholders stays out for now."

## Nov 16-17, 2026, night (owner, verbatim; recorded by the CTO)

- **Everything comes from the simulation.** "No, again, real number of businesses. Everything comes from the simulation. Stop pegging things to real numbers. Everything comes from the simulation." Real data only sets the strength of a relationship. It never sets a count, rate, level, share, band or starting value. (cto-notes/playtest/2026-11-17-pins-to-lift.md lists the 489 pins being lifted.)
- **History from 1925.** "Oh, 1925? Okay. I didn't know if I could be that ambitious, but sure. Absolutely." Each world's history is simulated from 1925. Day one is whatever that history produced: officeholders, party control and laws. "the 2024 result doesn't matter." Disasters come from each world's own risks, and "just like today" is an option. This replaces the Sept 28 and Oct 12 day-one rulings.
- **Parties.** Parties come out of each world's history and can rise, fall, split, merge or rebrand; each carries its own founding, stances and notable people. "I don't mean it literally. Again, just conceptually."
- **Appointments.** "No, you can only be appointed to council, like the playable offices." Boards exist in the background: "Other people can hold them and appoint them, but not the player." Keep them basic: "let it be on people's records."
- **Every figure is traceable from dev mode.** "every figure should be traceable from dev mode to speed this up in the futute"
- **The skills policy** ("Let's go ahead"): update an existing skill first; a new skill retires or merges an old one, under a cap of about 40; gotchas go in the job's skill; rules that must always hold become GitHub checks; unused skills are cut. Skills and docs merge straight to main, even in train mode.
- **Scene patterns from real lives.** "That's exactly what I've been wanting when I've said use real lives." Roles and settings are slots: "You're a little too specific." The patterns are in docs/story/scene-patterns.*.

## Open

- None open. The Nov 9 question on arrows for single-value steppers was answered the same day (below).

## Nov 16, 2026: Desk answers, playtest rulings and CTO authority (owner, on Fable's Desk and in chat; recorded by the CTO)

- **The acting CTO's 10:51Z ruling is withdrawn.** It allowed kept-red cases as expected failures. It is replaced by the done-proof rules (`AGENTS.md`, "How done is proven"). No check may be kept red on purpose.
- **Authority (05:50 p.m.):** full CTO authority: "make any skill, delete any skill, change anything in AgentMD... change guards... take the reins".
- **The ten Desk answers (2:45 to 2:49 p.m.), verbatim:**
  - Trains: "Merge Train 4 now and fix both on main after. Main carries a known game fault until then."
  - Two-branch switch: "Right after Train 4 merges. One more merge into main, then the switch."
  - Placed lines: "No. Count them again and rewrite them with inserts. A long words job." His note: "either that or remove them and start fresh".
  - Start age: "18, unless you pick another age. Every default life starts young, with the most years ahead."
  - Signature counts: "Take every count off the screens. The clerk and the talk tell you when you have enough."
  - Voter registration: "Keep it for townspeople; you are always registered."
  - Profit tax: "Keep it, as built on Train 2. Nothing to rebuild."
  - Budget amendment: "Keep it as built on Train 2. Nothing to rebuild."
  - Warm-up: "Longer. Fills more on its own, costs more time at every new game."
  - First year: "Work for someone else's campaign, a party committee or an appointed board until a race opens".
- **Playtest Desk answers (5:25 p.m.):**
  - Travel: "Places tied to you first, then the town's biggest workplaces across every kind of work".
  - Creator pictures: "Hair and facial hair as pictures, with skin and colors as swatches".
  - Speaker: "the design of a but the people in the top tight like c". Mock and meaning in `docs/mocks/2026-11-16-speaker/`.
  - Title paintings (5:36 p.m.): "mostly fine... A, without any people, they all just seem empty. And B, these are all basically the same painting, just multiple variants. There needs to be a lot more paintings, and they need to be a little busier... This isn't super high... I would rather you work on getting the busts to exist behind desks. If you establish that you can do that, that unlocks a lot more for us to do."
- **Metrics:** Layout A is approved. The mock is in `docs/mocks/2026-11-12-metrics/`.

## Nov 16: overnight on the second train; rulings given on the other account, Nov 13 to 16; the acting CTO's rulings (recorded by Fable B, acting CTO)

- **The cutover waits; overnight is the second train (owner, typed to Fable B, about 05:30Z):** "Nothing from about dev is going to happen until probably at least around noon, so about 12 hours, so you can stop waiting for that. Overnight, not much needs to be done except for any acting CTO questions. And then just checking the merge train and messaging back, I guess. I'm not sure if it has anything watching. I'll tell it to check it every hour or so. Check the second train PR, but you can go ahead and do fixes. So when I'm ready to merge it and start a Mac build, then you can do that."
  - Train 2 is the draft #9554. It is merged, and a Mac build started, only on his word.
  - To the other account the same hour (relayed): "Also, the CTO will answer questions and also send fixes on the second train PR. So look at that about every hour."
- **Rulings he gave on the other account, Nov 13 to 16.** The acting CTO cannot open that account's chat. Its lead posted his words on #9554 (comment 6915802083), and the whole relay is in `docs/coordination/prior-rulings/owner-words-2026-11-13-to-16.md`. What each decides:
  - **A new game's player is 18 or older (Nov 16, 05:02Z):** "Just do 18 and up right now. Life before 18 will come after early access." This changes the first step of the golden path: the player no longer turns 18 in play. With no birthday chosen, the player is one of the town's adults (`entrantOf`, `src/bench/world.ts`). The played-year check was brought to it (#9695). The golden path line in `AGENTS.md` and the README change when the train that carries the fold merges.
  - **The town, the state and the country are in motion on day one (Nov 14, 19:27Z):** "The town must be in motion on day one." and "And not just town, but country and state. Remember, it's all one simulation."
  - **Old material is deleted, not kept (Nov 15, 00:49Z):** "If there's old shit, this goes for everything, don't leave old shit in the files. Delete it. No need to keep a copy of everything. Just delete it. Treat it like a real game."
  - **The past is simulated, not looked up (Nov 13, 23:51Z, on a home's value last year):** "Yes, again, metrics. The entire, like, it's simulated. Like, I keep ruling that. So things need to be simulated in order to make your modern day make sense. Like, it's not hard to figure out."
  - **Dev mode can trigger every effect (Nov 14, 22:13Z):** "every single one of those should be able to be triggered using the game code and advanced in order to see the effect"
  - **Gathering signatures is talk, not counts (Nov 14, 00:50Z and 00:51Z):** "It shouldn't say signatures the clerk would count at all." and "None of those count lines or anything like that should pop up in dialogue. It should literally just be dialogue."
  - **A president's opening speech does not name the town (Nov 16, 05:27Z):** "Well, the opening speech, if it's from the president, of course it's not going to mention the town."
  - **Chosen on decision cards (the card's wording is the lead's; he pressed the option):** "Stop me at every vote" (Nov 14, 02:03Z); a bill left on the desk past its deadline with the stop off "becomes law unsigned" (Nov 14, 06:08Z); on adjourn, "Cast my position, else abstain" (Nov 13, 23:50Z); running mates: "Build it now", "I pick, or choose for me", and a no stands "but ask again later" (Nov 13 and 14); the raw source captures: "Fold it onto the train" (Nov 13, 23:46Z).
  - **Partial quotes only (the relay's part C):** track every seeded draw at opening so the random draws and fixed things can be taken out (Nov 16, 02:37Z); dev mode traces and forces every scene (Nov 16, 04:21Z); every line of dialogue and narration is registered and traceable, "there can be no leftovers" (Nov 16, 04:24Z).
  - **Cited in the code as his, with no words relayed:** that a profit tax is not weighed as a month's loss (the second train's business charges file, "approved by the owner Nov 16"), and that a council amends its adopted budget only for a cause on record (`amendmentRoom` in `src/core2/modules/budgets.ts`, "owner, Nov 15"). Both stand as built until he says otherwise; the next CTO sitting confirms them with him.
  - **Not his words (the relay says so):** "a person who decided to run keeps trying through the filing window" was the lead's ruling, and the fee it rested on is gone (Nov 15, below). Voter registration as a record and saving after each day have no message of his behind them; saves are covered by his Nov 15 words to Fable B (below).
- **The acting CTO's rulings, Nov 16 (each answers a standing rule; the owner may overrule any of them):**
  - **A fault kept in sight must not turn a check red (10:51Z, on #9554).** A test case kept failing on purpose is written as an expected failure that names its pool item: it passes while the fault stands and fails the day the fault is fixed, so the mark comes out. The pattern is already in `src/core2/day-zero.test.ts` (`knownRed`) and the played-year test (`FAILING_TODAY`). Why: a red main comes first (owner, Oct 15), and a check that is always red hides the next real failure. First use: the seven cases the train's #9687 keeps red, one of which made `golden-path-year` fail at every place.
  - **A test takes the case it needs from the world, not from the draw.** Three reds on the second train were tests leaning on luck, fixed as tests with no assertion loosened: the campaign rival lives in the town (#9694), the played year reads the new start (#9695), and a staged falling-out is sized to the tie it breaks (#9710). This is the `drawn-place-tests` skill applied.
  - **Main is copied from `dev` once for each passing release run,** at most every two hours and only when a change is pending, not on every merge into `dev`. The release run is the one place the whole candidate is built and validated. (`docs/coordination/TWO-BRANCHES.md`, "Step 9 as built"; the cutover drafts #9618 and #9620.)
  - **A release whose version commit main has already passed is skipped, never failed.** Main holds its work inside a later copy, and the next release carries it (#9620).
  - **Never merge `main` into a work branch after the cutover.** Main will hold the game without tests, so that merge deletes tests. The cutover edits remove the no-prompt permission for it and add a check that refuses such a branch (#9618).
  - **Three tests red on main today are accepted as known for the cutover:** `tests/guards/current-pointers.test.ts`, one case of `scripts/pool/next.test.ts`, and `scripts/claude-cloud-permissions.test.mjs`. Each is older than the cutover work and is owed its own fix.

## Nov 16: the work branch is named `dev`; the settings wait for the owner's other account; main takes only the copy-over step (owner, typed to Fable B on the second account, about 02:05Z)

- **His words, answering three questions on the two-branch plan (the name `dev`; that the GitHub settings need him; that main should refuse every push but the copy-over step):** "Yes, dev is fine. Don't worry about if something needs to be done. Don't worry about that because my account that has access to all that resets at 5 a.m. So it's fine. So we'll go with your recommendation for number 3."
  - **The name.** The work branch is `dev`.
  - **The settings.** The default branch, the protection rule for `dev`, and the lock on main are changed from his other account after it resets at 5 a.m. his time. Everything else is prepared before then and nothing waits on him. The exact steps are in `docs/coordination/TWO-BRANCHES.md`, "The settings, step by step".
  - **Main is locked.** After the cutover, main refuses every push except the promote step's (`scripts/promote/promote.mjs`). No session pushes to main or merges a pull request into it.
- **Until the cutover is posted, nothing changes:** pull requests target main and keep their tests, no branch named `dev` exists, and no session removes a test from main.

## Nov 15: Fable B is acting CTO until Monday afternoon and reads the train; promises move into the engine; saves get built now; the filing fee comes out (owner, typed to Fable B on the second account)

- **Acting CTO (owner, about 19:36Z):** "So the other day when I ran out of usage on my CTO account, which you're going to act as for right now until tomorrow, basically, until Monday afternoon, you're going to be the CTO. I had all the PRs on another account just being made on a train. So look for that train PR, and then I want you to take a look at all of it. You yourself as Fable, not subagents. Or maybe you can have subagents check rulings, do tests and stuff, but I want you to actually look at the code and reason. And get that PR ready for merge. If it's ready for merge, let me know. Look at the code, make sure it's not adding anything new. You know, it's following all the game rules, things like that. And then, yeah, I want to get it merged and then get a new game build out because I think there's a ton of changes." He added that comments may go on the train pull request for the other account, and that he had told it to start a new train so #9052 stops moving (frozen at 892427ec15198d1bedcf8b7b8e4de0c7d8956264).
- **Promises, saves and the filing fee (owner, 20:06Z, answering three questions from the read):** "Okay, so promises. Yes, with your recommend. I was just getting ready to say that. I'm really not worried about saves right now, but just go ahead and get them, working. That I don't think that should be something that waits till last, but saves don't need to be transferable between versions or anything right now. The game isn't really playable to a point where a save matters anyway. You can let the household cover it."
  - **Promises.** The recommendation he agreed to: the train merges as it is; the promise record, its settlement and the tie it moves go from the director (`src/director/promises.ts`, `promise-talk.ts`) into an engine module as the first follow-up; no new promise kind is added in the director until then. Item `core-promises-kept-and-settled-by-the-engine`.
  - **Saves.** Saving and continuing is built now, not last, and a save need not carry between versions yet. This replaces "Saves don't matter until early-access preparation" in AGENTS.md as far as building goes; the versioned format still waits. The work is the existing family `core-played-game-saves-and-continues` (part 1 is on the train; parts 2 to 4 are open and move to the front).
  - **The filing fee, first answer.** "You can let the household cover it." Superseded two minutes later (next line).
- **The filing fee comes out (owner, 20:08Z):** "Actually, I changed my mind. Remove the filing fee for now. I don't think it needs to be done. I think that's too much, a little bit too much depth."
  - This supersedes the line above, and it answers the fee the train added (#9153) and the "keeps trying" refiling built on it (#9528). The fee check, the payment, the refiling, the clerk's fee lines in the counter scene and their tests are removed at f271995aa7bbd64a36728da383cc1bef3126db2b on `claude/fable-b-cto-train-fixes`. #9531 (the household pays) is withdrawn. The Story session deletes its fee lines in `data/english/parts/scene-talk.json` (moves `state-tell-filing-fee`, `state-filing-fee-paid`, and the clerk's refusal and come-back replies). The fee stays out until he asks for it by name; the Oct 28 ruling stands as written: filing is petition, signatures, the clerk's check, then the ballot.
- **The Mac build (owner, between 21:13Z and 21:36Z):** "By the way, once it's merged, go ahead and immediately start a new Mac build." The release package workflow was started on main right after each of the two merges below.
- **Merge the train and the acting CTO's pull requests; no test files on main (owner, 21:41Z, answering "Merge the train (#9052)?" and "Merge my fix pull request (#9556) right after?"):** "yes and merge your pull requests, and don't merge tests into the main. If there are test files in main, start a Sonnet session to remove them all. I hate that. Literally, main should only be, well, I don't know. I just don't think test files should be on main. If it's on main, then it's already been tested."
  - **Done on his word:** #9052 (the Account lead's train, frozen at 892427ec15198d1bedcf8b7b8e4de0c7d8956264) merged as df8e666c8526018ac23e12a91bacaaf869405ee8, and #9556 (the filing fee removed, lettered districts, these rulings) merged as 94a14259d970d023eca5e60368446202f4e1d508. What he was told first: every check on the game as a whole was green on the train (golden path, the played year, a new game, both packages, typecheck, the 20 guards); of its 462 changed test files, each run once, 405 passed, 56 failed and one gave no result; the required `validate` check could not finish its test job inside its 45 minutes on a train this size.
  - **The shape he chose for "no test files on main" (card, 21:46Z, "Two branches"):** "All work and all tests go to a work branch, where every check runs. Main gets only the game: each time the work branch passes, its files are copied to main with every test file stripped. Builds come from main. Nothing is lost and the guards keep working." He was told beforehand that main held 1,903 test files and that 13 of the 20 guards, the golden-path check and the check every pull request must pass are built from test files, so deleting them outright would stop those working.
  - **What it changes:** a work branch (proposed name `dev`) becomes where pull requests and trains merge and where the checks run; main is copied from it with test files stripped, and builds come from main. Until the cutover is posted, nothing changes: pull requests target main and keep their tests, and no session removes a test from main. The prep (the rule for what a test file is, a preview of main without them, the promote step, the map of everything that assumes one branch) is a draft from `claude/two-branches-prep`; the cutover needs the owner's own settings (default branch, branch protection for the work branch).
- **Not yet recorded, asked for:** the owner's rulings of Nov 13 to 15 given on the other account and cited by the train (stop me at every vote, housing's past, the running mate, voter registration as a record, day one in motion, old material deleted, dev mode triggers every effect, the raw source captures). The acting CTO asked the Account lead for his words and times on #9052 (comment 6900438224) and records them here when they arrive.

## Nov 14: a line the world places counts as tied to the world; the padded names come out (owner, card in the project chat, 06:38Z)

- **Question on the card:** "Lines keep saying the listener's name ('Thanks, Alice.' 'Not yet, Eva.') only to pass a rule. Should the rule change?" **He tapped "Yes, change the rule"**, whose text was: "A line counts as tied to the world when the moment it plays in was chosen by a fact about the world. The padded names come out."
  - Done in `tests/guards/english/line-inserts.test.ts` as one more excuse, `placed`, by rule and never by a list of keys: a part every place of which (`uses`) carries a non-empty `requiresFacts`, `onlyWhen` or `excludesFacts`, or sits under a scene purpose whose situation types each name a cause record, or under a conversation subject raised only from a record (Words lead's ruling, same day: a bearing alone does not count). Part 2 (removing the padded names, bank by bank) follows. The owner's go-ahead for editing the guard: "I approve a heading those lines, and you have standing approval for changing anything else in the project. You have full authority." (Nov 14, 06:42Z).

## Nov 12 afternoon: the words lead owns the words, scenes, director, Journal and newspaper; creator tabs; Metrics timeline (owner)

- **Fable A may delete every line; the words are its magnum opus (owner, said to Fable A, relayed at 2:35 p.m. on issue #7365 comment 6833916808):** "You can, if you want to, you can delete every single line. That's up to you, but yes, go ahead and just let the CTO know that I said that. This is your code base, and the words right here is your magnum opus. So be sure you ask any questions or anything, but take control of it. And I'm counting on you to have this be the final time that this is made and remade, and that for this to last and keep improving."
  - **This replaces the Oct 28 rule** that ungraded lines keep playing until a grade or a ban removes them. Deleting a line is now the words lead's call.
- **"Delete everything" means restart; an engine part, rule or skill that makes the words harder may be changed or deleted (owner, said to Fable A, relayed at 2:38 p.m. on issue #7365 comment 6833982537):** "When I said you could delete everything, I meant you could restart. I guess maybe the engine. ... If it's better to delete stuff in order to get stuff to do it, like that's what the builders are for. You don't need to constantly build on everything. If something needs to be revised or changed or deleted, that's fine. ... If you want to delete every single line and start completely from scratch, you can do that. Or if there's something, if there's a skill or a rule or anything in the engine that's making it more difficult, you can change that. That's what I mean by taking ownership."
  - It applies to the CTO as well as to Fable A. A skill, rule or engine part that makes the words harder to get right is changed or deleted, not built around.
- **The same authority over scenes and the director, essentially the entire story (owner, said to Fable A, relayed at 2:43 p.m. on issue #7365 comment 6834097968):** "So you also have the same authority over, you know, the scenes and director, essentially the entire story. So change and delete whatever you need to. It's fine. If there are like scenes that are needed, you can just mark those, but don't let that stop you. But a lot of this stuff is already built. It's like negotiating and relationships and political events."
  - Scenes that are needed get marked. The mechanics (negotiating, relationships, political events) are already built, so a scene earns its place as the view of one of those records.
- **The Journal is part of the English engine, with its own display rules (owner, said to Fable A, relayed at 2:45 p.m. on issue #7365 comment 6834157645):** "This also includes the journal, because for some reason that keeps getting neglected and treated like a separate thing. It should be updated in the English engine. It just has different rules about what's displayed, just like a speech versus a conversation between two people versus a rally. It's the same thing. Because as of now, the journal is just a declaration of, I did this, I worked here, I did this, I worked here, this person was born, I went to school here. ... So the journal needs to be wired as well."
- **The Journal, people's histories and the newspaper under one umbrella; the jobs gap; Fable A leads the team; updates go through an artifact (owner, said to Fable A, relayed at 2:48 p.m. on issue #7365 comment 6834204644):** "Not only the journal, but the journal, people's histories, the newspaper, etc. Finally bring this all under one umbrella. It's time. I'm sick of it. So again, same ownership over the journal, the newspaper, and stuff. ... even though I've been told multiple times that the job data is in the game ... It's only ever like tool places and dye places and markets. I don't know why. ... doing this sort of front end work will help you in the back end. So don't limit yourself to changes or gaps found that are only with this. Your fable, you have authority over all this stuff. If you want, you can send a thing every X amount of minutes, 10, 15 minutes ... to the CTO, and it can put that in an artifact with me. Any decisions that goes for any of your ... team, since you're Fable, you're the team lead. You know, questions all go to the CTO. Tell the CTO to make an artifact for me, and I will answer things there."
  - Fable A is team lead. Updates come to the CTO every 10 to 15 minutes, and the CTO keeps one artifact where the owner answers. Questions from the team go through the CTO.
  - The jobs gap he names is the open item `core-town-jobs-are-mostly-markets-and-kitchens`, which he has now raised twice in one day.
- **Character creator: two tabs, everyday and formal (owner, said to the CTO in chat, about 12:55 p.m.):** "two tabs, everyday and formal, bust flips between them", then "build the tabs" (PR #8905). About 1:00 p.m.: "ill do a playthrough later for the design stuff". The rest of the creator's design waits for his playthrough.
- **Fable A works only on the words; a Red desk takes failures on main (owner, said to the CTO in chat, about 1:55 p.m.):** "yes start it, point fable at the lines".
- **On lines, start from scratch (owner, said to the CTO in chat, about 2:30 p.m.):** "i bet it's probably better to start from scratch". Fable A agreed: replace, do not sort. Each kind of scene's old lines are deleted the hour the engine can speak it.
- **Politics > Metrics: numbers stay the main view; a measure opens a timeline (owner, said to the CTO in chat, about 3:00 p.m.):** numbers stay the main view. Clicking a measure opens a timeline: one thin line over the years with each value written on it, no bars, no pies. This is the only exception to his Nov 5 no-charts menu rule. About 3:20 p.m.: "go with A plus the years table". Areas run down the left with a report, and a table of the years sits inside each area.

## Nov 12: words change at the engine level, after a fresh graded batch (owner)

- **Grade a fresh batch first; change the engine, not one sentence at a time (owner, about 12:10 a.m.):** "I looked at the president's speech, and while yeah, it's different, it's still weird and unnatural and clunky. So go ahead and get me a grading batch, like we previously talked about. So like things in context, made for you to reply in a voice note... start with just pulling up one of the president's speeches... start up a new life or something, and then actually play through and send me all the scenes, all the dialogue, up to whatever point you feel like is good... Don't start the word session yet, because I feel like the grading or the lessons from the grading or whatever still aren't being applied in the entire essay. I don't think you should be rewriting one sentence at a time, or I think you need to be changing the engine to where, I guess, different parts are written differently, more clearly, different rules, etc."
  - A grader plays one new life from the title through the address, the first weeks and the first campaign scene. It records every scene and line, in context, for a page he answers by voice note.
  - No words session or bank rewrite starts until he has graded that batch. Then the fix goes into the engine (how each part is composed, and its rules), not line by line.
  - Fable A builds other work in the meantime.

## Nov 11: every line goes through the English engine; work-list notes bundled; the repo slimmed (owner)

- **Mergers may use the admin flag (owner, about 5:10 p.m.):** asked whether the Codex and Muse mergers may merge past GitHub's queued checks with the admin flag, as the CTO has: "let them - you just check on muse's merges specifically sportatically". A merger merges with `--admin` only after the full gate in `docs/pool/START-A-MERGER.md`, pinned to the sha it checked. The CTO spot-checks Muse's merges from time to time.

- **Clothes as layers in colors, approved; formal and regular, tagged; officeholders in the suit (owner, about 8:28 a.m., decisions page call 13):** "I approve those clothes. Be sure there are formal clothes and regular clothes, and that they're tagged, etc. And make sure that, like, you know, we talked about it before, that like the president is wearing the suit in their, like, when you click their profile, and you know, in their bust. But yes, I approve."
  - Round 4 goes into the game (#8740): 28 layered pieces, front view. Men get a dress shirt, tie, suit jacket, sweater and chambray; women get a dress shirt, blazer, henley and cardigan. Each color is painted separately.
  - Every piece is tagged formal (dress shirt, tie, jacket, blazer) or regular (the whole tops).
  - An officeholder, the President and every seated official, wears formal clothes on their person card and on their bust everywhere. Everyone else wears regular clothes by where they are seen.

- **Overnight: visible first; every line verified and touched; merge in batches (owner, about 2:03 a.m., going to bed):** "Remember, the visible stuff first. The game should look different. The words and all that. The words and scenes ... it should be markedly improved. No lines should not be verified and touched. By verified, I mean you shouldn't, what just happened should not happen again. I've made it very clear. You have all the batches, you have the way I talk, you have the entire internet, etc. ... Remember to proactively create, make, and update skills." On merging he left the shape open ("maybe at 7 a.m. or something, you merge them all, or maybe you merge them at different points in the night. I don't know. ... just be a problem solver").
  - **Merging:** game code merges in trains by area, about 3, 5 and 7 a.m. Each train's heavy checks run once on the combined result. Reds, rules, checks and skills merge at once.
  - **Every line is touched,** meaning rewritten through the engine with inserts, except the call 12 kinds.
  - **Every line is verified** against his grades, the line rules, his own words and real speech, and on screen. A words PR shows its scenes before and after in three drawn places, and names the complaint it answers.
  - **Skills** are updated in the same hour an error repeats (CTO line on #7365).

- **Work-list notes merge as one bundle an hour (owner, about 1:30 a.m.):** he asked "I feel like it's only worth merging things in the game, right? Can't everything that has access to GitHub just look at branches and stuff? It's causing a lot of unnecessary problems, aren't they?" In the three hours before, 77 of 184 new PRs touched only docs, the pool or skills. The CTO proposed bundling, and he answered: "Yes, and update everything that needs to be updated."
  - The pool stays on main, because sessions on both accounts read it.
  - Cause write-ups, status notes and pool-only changes go to one rolling branch with one PR, merged once an hour, not one PR each.
  - "Claimed" and "in a PR" are read from the open PRs.
  - Game PRs keep updating their own item inside the same PR.
  - While more than about 150 game PRs are open, builders get send-back fixes and PRs that need main merged in, not new items.
  - Rules, checks, skills and docs PRs stay their own PRs. Fable B updates the rules, skills, the pool README and the builder brief to match (CTO line on #7365).
- **Slim the repo down to what is needed (owner, about 1:30 a.m., not urgent):** "it would be nice if sometime overnight or now, or whenever is best, Fable goes through everything in the repo, removes all old stuff, just removes it unless it's absolutely necessary, but like old images, old all that shit, just remove it all, slim it down to only what is absolutely needed. That doesn't need to be immediate though."
  - Main was 2.38 GB in 17,101 files.
  - Kept: what the game, a test or a script loads; the rulings, prior-rulings, playtest blocks and voice notes; LAW and ORDER; the calibration research; the approved mocks; the bust bank.
  - The full-body people art leaves main but stays set aside (Nov 10): one index file names the last commit holding each removed group, so it comes back with one checkout.
  - One PR per area, each passing the new-game check. History is never rewritten.
- **Nothing points at anything old; one master place for what is current (owner, about 1:32 a.m.):** "Not only that, but updates all documents so that nothing is pointing at anything old, and have somewhere as like a master updater or something, to where in the future old things aren't pointing at all different things at all different times."
  - Every path, file, skill, item or doc named in the docs, rules, skills and code comments exists on main and is the current one.
  - One master file names the current thing for each kind, plus a list of what replaced what, kept forever.
  - A guard on every PR fails when anything names a missing or replaced path, or when a new kind appears without a row in the master file. Its baseline only goes down.
  - Whoever replaces or removes something updates the master file and every pointer in the same PR. That's "replaced means deleted" (Nov 5), applied to references.

- **Every line through the English engine, with many versions and inserts; the opening first (owner, about 1:04 a.m., after seeing the first evening's talk after the President's address in the strip pull request's screenshot):** "I don't understand why we're still having this conversation all the lines in the game need to be run through the English engine. I don't understand how that somehow being allowed yet you keep saying everything is being updated. No take every line through the English engine. There needs to be a ton of different speech versions a ton of different "" inserts for it like this is this is a demonstration of the game. This introduces people to their world." This restates Oct 6 ("There should be no text anymore in the game that is not written by the English engine"). A whole stock sentence picked as-is from a bank does not meet it.
  - **Every line is composed by the engine,** in many versions, with inserts from the world's records: names, the town, the person's own job and views, and what happened.
  - **The opening comes first, because it is the demonstration of the game.** That's the President's address and the evening after it: the household talk and that night's news. The relative raises a real thing the President said in that address and where they stand on it from their own life. The player's replies are up to four, each a different move about what was said.
  - **Lines he graded bad leave the bank in the same change,** with every reference.
  - **What was on main:** that talk was whole fixed sentences from Oct 25 and Nov 2. On Nov 8 (playtest P37) he called it terrible ("how the words still aren't updated"), and that became three bad grades instead of a rewrite. Across the 21 banks, 8,218 of 12,075 lines carried no insert.
  - **A guard counts the lines with no insert in each player-facing bank,** and that count can only go down. Any kind of line the lead thinks should stay fixed goes to him as a call. Fable B holds the work (CTO line on #7365, Nov 11).
- **Which short lines stay (owner, about 1:26 a.m., decisions page call 12, no note):** "Replies of one to three words and action names stay; everything else is rewritten." Replies of one to three words ("Hello.", "You won.", "Got a second?") and the names of actions the player picks ("Go to work.", "Rest.") stay as they are, about 650 lines. A piece the engine joins counts as composed when the sentence it makes carries an insert. Everything else, about 7,500 lines, is rewritten with inserts, the opening first. The guard excuses exactly those kinds, by rule.

## Nov 10: rules, checks and skills merge first; staging waits for busts (owner)

- **Rules, checks and skills merge first (owner, about 8:50 a.m.):** "anytime there's a rule or a check or a skill, just have it merge it before anything else. So that way it takes effect on anything or anything that would take effect on anything else, like speed." A pull request that adds or changes a rule, a check (a test, a guard, a gate, a workflow), a skill, or something every other change runs through (speed, a shared engine) is gated and merged ahead of every other pull request. A pull request whose files that rule or check judges merges after it and passes it first. If such a pull request cannot merge (a conflict or a red check), its author brings it up to date ahead of other work. This refines Oct 27's "nothing waits": a pull request waits only for a rule, check or skill that judges it. Today it puts the words machine (#8114, #8117, #8124) ahead of the life record (#8115, #8123, #8139), whose new lines the rules then check.
- **Staging waits for busts (owner, about 8:40 a.m.):** "I'm not necessarily worried about the staging code now because you're going to be making busts. I haven't decided how they're going to display yet." Full-body staging defects (who stands where, people blocking each other in a room) are not filed or reopened while busts are coming. How busts are shown is his call.
- **The words machine reads every ruling, not only grade notes (owner, about 8:40 a.m.):** "I thought it was supposed to be checking all of that stuff while it was updating, applying grades and feedback from all of the batches." Seen on main: "Where are you from?" offered four replies that were one answer ("I'm from Grandville. And you?", "I grew up here.", "I'm from Grandville.", "Here in Grandville."), against Oct 14 ("Four dynamic choices, always"), Oct 15 ("The four replies each move the talk somewhere") and Oct 27 ("four replies are four different answers, never one reworded"). The rules are drawn from this file, the playtest blocks, `prior-rulings/` and LAW as well as the grade notes, and a rule reads the four replies together (CTO lines to Fable on #7365, Nov 10; pool item `play-replies-offer-three-as-often-as-four`).
- **The Journal names no feelings (CTO, from a standing ruling):** `prior-rulings/people.md` section 24, the Sept 6 owner-locked verdicts: "Imply relationship tension through ordinary concrete behavior/dialogue rather than narrating feelings." The journal bank's "names no feeling" test stays, and the memoir line "That made me glad." is rewritten from the records (Story).

- **Who does words work: split by role (owner, about 9:50 a.m., after Story and a Fable helper fixed the same journal line in #8151 and #8155):** "Split by role." Fable and its Sonnet helpers build the grading system: the rules, the checks, the run, the pulled list and the code that composes replies. Story writes every line in `data/english/parts/`. That covers rewrites of the lines the rules pull, the new reply moves that make four replies four different answers, and the saved meaning-and-tone verdicts. Story starts the rewrites once #8117 merges. A helper whose fix needs new or changed lines names them on its pull request, and Story writes them. One writer per bank file.

- **The strip: people on the talk box and who's here (owner, Nov 11, about 12:02 a.m., decisions page call 11, five scenes):** he picked the drawing as shown, and said: "Ooh, you know what? I do think I like that strip when there's a scene and there's people to talk. I do like this strip. Yes, that strip is good." Smaller busts (about 200, 180 and 150 pixels for one, two and four people) stand on a soft glass strip with their names: along the foot of the room for who is here, joined to the top of the talk box in a talk, the speaker lit and a little larger, the round face in the header gone; a crowd shows the people the player would know, then "and N more". The painted people leave rooms in the same change.
- **Busts: round 3 accepted; clothes as layers in colors; the talk box and who's-here mock-ups again (owner, about 11:08 p.m., decisions page calls 8 to 10):** Call 10, round 3 front: accepted, with "what about changing colors of stuff?" and "yes, I would like to be able to change ties and stuff. But conceptually, it looks good, but I want to see colors and stuff changing as well." Shirt, tie and jacket become separate pieces the creator can change, and clothing comes in more than one color, each painted, never tinted; he sees a sheet of the colors before they go in. Call 8, the busts on the talk box: "it's a little too big I think and I'd like to see this in multiple different scenes." Call 9, who's here: busts along the bottom of the room, and "it just looks like they're thrown in there. I'd like to see some way to delineate them. Also similar with a chat box." Both come back as mock-ups, smaller and set on a band in the menu look, in several scenes.
- **Not everything is tracked every day; summaries are automatic (owner, about 10:02 p.m., after main measured 138, 300, 251 and 554 seconds for years 1 to 4 in South Hooksett, New Hampshire):** "make it a project requirement that not everything is tracked every day, and that summaries are automatic, and that if something does need to be tracked more often, then it's specifically written and it's reasoned through by the coordinator or you. So that way this stops happening, because we obviously know the cause and it keeps happening. Make a skill, whatever. By the way, tell Fable to update skills if necessary. Or you, if there are errors that keep happening or new things or whatever, make skills." Every record and engine step names its cadence (on an event, monthly or yearly); old records fold into summaries automatically, keeping what play reads; anything daily is written in one register with its reason, what the player sees and its cost a year, approved by name by the lead or the CTO; a guard fails on a daily step or growing table not in the register; a skill teaches it. Skills are updated whenever an error repeats or something is learned, by the lead and the CTO, without being asked.
- **No people in rooms; busts on the talk box; a "who's here" view (owner, about 9:24 p.m., on the decisions page's call 7):** "No, absolutely not B. Remove all the people. And yes, I think the speaker as a large bust. Though that raises a question about repetitiveness with the small picture there. Maybe people can be on top of the text box and, you know, the picture of their portrait can resize based on how many people there are, and maybe, you know, get a little bigger when they're talking or something. And I think there needs to be ... some kind of screen or mock-up or something to see who's in the room, I guess, when you enter a place if we're not going to have people." Rooms are the painting alone for early access. He added at about 9:27 p.m.: "people will eventually be in the game, but right now for early access, it's just we have to do the busts." So the code that seats and draws people in rooms leaves the game, with its last commit recorded in `docs/art/full-body-people-after-early-access.md`, and the full-body art is kept in the repo outside anything the game loads (set aside, as on Nov 7, not deleted); the big scenes painted whole stay. Everyone in a talk sits on top of the talk box as a bust, sized by how many there are, and the speaker grows a little; the talk box drops its small round face. Entering a place shows who is there. The talk-box row and the "who's here" view go to him as mock-ups before they are built.
- **The lead owns the code base, and the UI is one system (owner, to Fable B directly on his second account, Nov 10 evening, as Fable B relayed it on #7365):** "You own this code base. I'm expecting you to change things, slim things down, make things more efficient, and make my game work." And: "Make sure that the UI system is unified so that when it's time to adjust the UI in the future, or I release new features in the future, that it's way easier to change stuff on a screen or on a menu or something." Every screen is built from shared parts with sizes, colors and corners named once, so a change to a control is made in one place; hand-typed sizes only go down (the guard from #8407). Slimming and making things efficient is expected work, not something to ask about.
- **Replies are up to four, not always four (owner, about 7:50 p.m.):** "it's also allowed to have less than 4 options sometimes. So maybe a specific scene says, where are you from? ... you might only have 1 option, but it's to make the player feel engaged. Or you may only have 2 options in the scene because you have to make a choice, a yes or no choice, anything like that. So just up to 4." The scene sets how many: one reply can keep the player engaged, two fit a real yes-or-no choice, never more than four. Every reply offered is still a different answer, never a rewording of another, and each moves the talk somewhere. This replaces "Four dynamic choices, always" below.
- **Start moving to busts (owner, about 7:30 p.m.):** "Make sure it has the bust too. It can start removing the people, and we need to start transitioning to the bust system." People on screens become modular busts (Nov 7 ruling): a head, a top drawn over the neck, and hair on top, stacked from one canvas. The proof pieces are in `docs/art/busts-2026-11-07/`. Full-body figures are removed screen by screen as busts replace them, each with every reference in the same change ("replaced means deleted", Nov 5). The big scenes painted whole keep full bodies (the opening address, election night, the swearing-in). Menus show busts as the approved mocks do. How busts show in rooms and scenes is still his call, asked with screenshots. Round 3 of the bust art (more detailed shirts, more hair, the men finished) is the CTO's once Codex is refilled.
- **Fable does the UI and UX itself (owner, about 7:22 p.m.):** "apparently Fable is good with UI and UX design. So I want Fable itself, while it's coordinating, to itself do the UI and UX stuff, because apparently it's way better. So I would like it to not only do the UI, but, you know, the UX, like all the buttons everywhere and stuff being a bunch of different sizes and not making sense, and stuff looking like a game, etc. Again, any design questions, come to me, or depth questions. Unless they can be answered by previous rulings." The lead (Fable B) designs and builds every screen the player clicks in its own session, not through a helper: one set of controls with one size and style per kind of button, screens whose purpose and way out read at a glance, and a game look by the Nov 5 menu rulings. Builders keep non-screen gameplay items. Design and depth questions no ruling answers go to the owner through the CTO, with screenshots.
- **Six design calls answered (owner, about 7:16 p.m., on the decisions page and in a voice note):**
  - **Recounts:** "Recount by own states rules. You need a 2000 to be able to happen. And sure, yeah, court after early access." A close race recounts by its own state's rule now, and the player can ask for one where the law allows. Court challenges come after early access, so a 2000-style fight over a count can happen then.
  - **The one crime system starts after the gameplay work:** "Yes, after gameplay work. I want to be able to play the game."
  - **The player's only crime is corruption:** "Only corruption for the player."
  - **Laws that reach no one: withdrawn, asked in error.** His page answer is void. The call came from one-line sweep reasons, not the items or the rulings. The hiring and renting discrimination ban was already ruled yes on Oct 24 and Oct 26 ("Discrimination: yes, and it is not asked again"), and it already acts (small employers stop weighing older applicants down); it stays on the menu and its items are built. Universal preschool already pays each eligible child's household; overtime is not on the bill menu; the sanctuary policy already reaches people. No law comes off the menu.
  - **Town events:** He first asked for them on Nov 1 ("there needs to be real ones with some good fluff or else it will get old"). Nov 10: "I've ruled on these community events. I've talked about ham days once, you know, just doing some basic research. But there can also be some general events as well." Each town holds its own real festivals, found by basic research (a town's Ham Days), plus a few general events a year; the paper reports them and a candidate can campaign at one. Small size; no per-attendee system.
  - **People's 14 values:** "Not now." Stances keep coming from each person's own life.
- **Too in depth is wasted work (owner, about 6:41 p.m., repeating Oct 11 "Keep it simple" and Nov 7 "I'm not worried about the super detailed stuff, just make the systems work for now"):** "commute time can just be, a slight estimation, but man, tracking actual land plots and stuff, I don't know what that means. Asking an office for public records, that's way too in depth. Way, way, way too in depth. And that's the kind of stuff that work is being wasted on." This replaces the 6:39 p.m. answer for those three: public-records requests and land parcels are dropped from the game, not deferred. Commute time is at most a slight estimate, one number a place from data the game already has, used only if something the player sees reads it. Every item and every stand-in now answers one test: where does the player see or feel this, on the golden path or in something the owner has ruled? An item seen nowhere and asked for by no ruling is dropped ("too in depth"), and research that only adds precision nobody sees stops. Each item's What names where the player sees the result, or "Feeds:" the item that does.
- **Three systems stay out of early access, and six student effects stay estimates (owner, about 6:39 p.m., inline answers to Fable B's first stand-in questions):** Public-records requests, land parcels with zoning and commute time: "Leave out of early access." Their research is kept and each stand-in is marked as staying; no build items. The six researched effects on student outcomes whose causes are not recorded (lead in the water, hot school days, carbon monoxide, a police killing nearby, a homicide nearby, deferred action): "Keep as marked estimates." The two killings wait for the one crime system; deferred action stays national policy, like marriage equality.
- **Design questions go to the owner (owner, about 6:33 p.m.):** "It can ask questions. It can post questions to you to ask me about actual design things, right? So my opinion on scenes and again, the depth of mechanics... you can make stuff into an artifact for me. Now, there might not be anything, and that's fine." When a scene, or how deep a mechanic goes, is a real design choice the record does not settle, the lead posts it on #7365 as `Fable B: owner questions` (two to four options, the recommendation first, with what each costs in speed and work). The CTO puts a few to him inline, or makes a page for a batch or for anything that needs examples. An empty list is fine, and nothing the record already answers is asked.
- **One money system; reuse before building (owner, about 6:33 p.m., on the state income tax and benefit causes, #8270 and #8280):** "make sure it's all the same, you know, dollar system and money, or it links to or reuses code where possible, etc. It doesn't need to build everything new all the time." Money moves only through what exists: the money accounts and obligations, the treasuries, withholding and the one benefit payer. A fix changes the function that already owns the mechanic and names it in its Fix; a fix that adds a second payment, tax or ledger path beside an existing one is sent back. A stand-in marked as a missing engine is first checked for an existing engine it only needs to be wired to.
- **Story ends; Fable B takes custody of words (owner, about 6:15 p.m.):** "please have this word session come to an end and have Fable take custody over words." This replaces the bank-writer half of "split by role" above. Story stops after its handoff comment on #7365. Fable B, the orchestrator on the owner's second account, now holds both the words machine (rules, grading, verdicts) and every line in `data/english/parts/`. One writer per bank file still holds: Fable B writes a file or names the one helper who writes it. Pool builders still write no lines there; they list the spots a line needs on their pull request.

- **Every assignment works without Fable; Fable rebuilds the pool (owner, about 11:15 a.m.):** "how model agnostic are the assignments... it would be great if it could continue its helpers and have another helper do its work now, and then spend time fleshing everything out so that everything has an assignment. Looking at the current pool, basically redoing the current pool system, I guess, with its new rules and findings." Fable hands its own hands-on builds to helpers and reviews them. It writes one item standard as a rule and a pool-guard check: the cause (found in code or measured, or "needs cause", which is not built), the fix, Done when as seen in the game, the design or root cause, what it waits on, a time box, and the model and effort the item needs. It then redoes every open, gated and blocked item against the standard: drops what its designs replaced, merges duplicates, rewrites the rest, and splits its own size-L items into parts Opus or Sonnet can build from the item alone. Only the short list that truly needs a Fable-level model stays with Fable (CTO line on #7365, Nov 10).

- **One crime system (owner, about 3:31 p.m.):** "there shouldn't be a bribe system and an embezzlement system. It should be a crime system, or that kind of system, and things should go through that way... I don't necessarily want to rewrite it or anything now." Every offense, from theft to assault to bribery to embezzlement, is a person's decision through the one chooser, written to the one crimes record and carried by the one justice path. Today that holds only for corruption (`corruption.ts` to `justice.ts`). Ordinary crime in `crime.ts` happens to households from national rates with no offender (stopgaps SG-CORE-crime-offenders and SG-CORE-crime-arrests). No rewrite now: new crime work (diversion first) adds a kind, never a system, and the merge is filed as a design item.

- **Crime is not only need (owner, about 3:27 p.m., on the diversion design #8208):** "I would hope that it's not just if they need rent payments that they commit crimes. Some people just commit crimes. You know, personalities. Or maybe they think they can get away with it." This holds for every crime and every kind of corruption. Three reasons weigh together through the shared chooser, as the bribe already does in `corruption.ts`: the person's traits, which are a reason by themselves; the risk as they know it from records (no audit in years, a watchdog that missed things, an earlier act that went unnoticed); and need. No dice: a decision is scored, never rolled, and being caught is read from records.

- **Officials can divert budget money (owner, about 3 p.m., on Fable's full check of the pool):** "Yes, keep it." An official can move money from one budget line to another outside the law. It is found out the way bribery is, through audits, the press or complaints. Fable writes the design step from the corruption engine, and then builders take its parts (`gov-treasury-diversion`).
- **Fable checked every pool item against the code (owner, about 1:05 p.m.: "i dont want spot summaries. iwant fable to look at all the assignments now since they're apparently finished and make sure they're right," and about 1:10 p.m.: "i think this is well worth the usage. because i can start other agents on these"):** All 955 live items were checked (#8179 to #8200): 576 right as written, 210 corrected, 145 still need a cause, and 17 dropped (#8201). The list in `docs/pool/redo-2026-11-10/checked.md` and the brief in `docs/pool/redo-2026-11-10/builder-brief.md` are the hand-off: an agent with no other context builds one item from the brief and the item's id, on the model the item names.

## Nov 9: grades judge by rule, each life has its own past, notes stay off main, Fable builds, the model guide (owner)

- **History for people older than the player (owner to Fable, about 11 p.m.):** "Yes, your recommendation for number one." Each person's past covers their own whole life, coarse (a year at a time), written only when the player opens or meets them. The world's own history (laws, elections, the economy) still starts in the player's birth year. This narrows the Oct 28 ruling ("history runs from the player's birth year"), which was asked about the player's own childhood and had been applied to everyone.
- **What a grade does to lines he hasn't seen (same answer):** "Two, yes, but I'm also not gonna grade 6,000 individual lines. That's the problem." A line that breaks one of his rules is pulled from play and queued for rewrite, lines he graded good are never touched, and odds stop being the main tool. The rules do the judging: a rewritten line goes back into play when it passes the rules, without waiting for his grade, and he sees small samples only. Earlier the same day: "this is why the entire engine being affected by grading is important. im not grading 6000 lines and 800 conversations individually."
- **"Kind of weird" (same answer):** "Yes, number three." With no rewrite given, it means pull the line until it is rewritten. "The context is weird" means fix the setup around the line and keep the line.
- **Notes and batch pages stay off main (same answer):** "Yes, both stay off main." Earlier: "I don't know why like my notes and stuff need to be merged into main. That doesn't make any sense. That just seems like unnecessary stuff that's downloaded." Voice notes and batch pages stay on their branches, he gets batches as an artifact, and only the rules and grades that come out of his notes go to main. So #8054 (his Nov 9 note) and the batch pages in #8057 and #8071 do not merge as they are.
- **He grades by voice only:** "I'm not gonna be physically grading anything. It's all done in the voice notes." Batch pages are read-only or clickable scenes, never grading forms.
- **Arrows on single-value steppers:** answered "Lists only." Lists and pages never get arrows or "1 of N"; a stepper that changes one value (dev Run's days, the creator's color rows, world settings) keeps its arrows.
- **Merging:** "you have standing authority to merge whatever. even if you made that PR." The CTO and the merge desk may merge any pull request, the CTO's own included.
- **Fable builds:** "I'm ready to have Fable do some work... once I use the reset, it can act more as a coordinator." Fable leads the build from its audit (branch `audit/fable-vision`): the acceptance rule, the country tier with a results-first clock, the life record and the words machine. Work keeps merging meanwhile: "it can put it in the game, yeah, because whatever Fable says will go along."
- **Models:** "I'm fine if it uses helpers, if that leaves it to use its stuff on harder stuff... Yes, follow the guide fully." Anthropic's model guide applies to every session: the top model for design, hard judgment and review; Sonnet for scoped work and the merge desk; Haiku for search and logs; the model set on every helper.
- **The CTO speaks for him (owner to Fable):** "If you see a message from the CTO, it's as good as my word."

## Nov 8, about 7:15 p.m.: weather is basic climate change through the effect map (owner, via the CTO on #7365)

- **Ruling:** "for the weather - do a very basic weather thing that is with the effect map. so we can get some basic climate change effect et"
- **What it means (CTO, #7365 comment 6729211623):** emissions drive one national warming level. Warming drives each county's hazard levels by season (heat, flood, storm, wildfire, drought). Hazard levels drive disasters, and disasters reach the economy through the existing links (`disaster-to-home-values`, `disaster-to-out-migration`, `disaster-to-public-transfers`). A county's opening level comes from its recorded history (NOAA storm episodes or FEMA); after day one it moves only with warming. It is three PRs: the links, the hazard levels, and the disasters.
- **Zero-dice (CTO):** `growth()` may let through a GENERATION list pick that carries a `keyedBy` of county, hazard and month, only when its odds are read that month from the effect map's hazard level. A calendar generated once at world creation is ruled out, and the exempted file is named in the guard. This supersedes the Coordinator's 3:10 p.m. call of a hazard calendar generated at world creation.
- **Rest of the world (Coordinator, Nov 9, 02:19 UTC):** the rest of the world's emissions follow a sourced scenario (the IEA stated-policies path or SSP2-4.5, ESTIMATED with its spread), not U.S. policy. Warming therefore rises at about the real rate, and U.S. and state laws move only their own share.

## Nov 8, 2:45 p.m. to Nov 9, 02:40 UTC: the night Coordinator's calls (the owner may overrule)

Each call applies a standing rule; none adds a step to the player's life.

- **Scene openers:** the owner's 2:10 p.m. ruling supersedes the Oct 26 and 27 ban on dates in narration, for scene openers only. Story uses a `{begins}` slot (#7767).
- **The bill page before enactment:** its reach shows the law row's scope and the change, with no counts or projections. Counts come from law reach after enactment. Rates show the rate in force against the one proposed, and budget lines show "since last year."
- **Counted payroll:** the same rule, times the count, on the employer's own calendar. Merging the counted ledger into the named one is pool item `core-speed-counted-payroll-into-named-ledger`.
- **The clock spends time:** a talk takes its scene's length, a visit its errand, and travel its distance. The people present at a place follow the hour (#7812).
- **Another person's political view** shows on their card only once the player has learned it, from a talk, a public stance or news received. Until then the card says the player doesn't know yet (#7865, #7886).
- **Macro hysteresis:** the natural rate's hysteresis is 120 months, ESTIMATED (60 months to no drift). The 2021 band test becomes a cause check that reports the real band without asserting it.
- **The Metrics tab is never blank:** on day 1 it shows what the world already holds. "Last year" is the opening's source figures, marked as estimates. A figure with no prior year shows the current value and a registered stopgap. From month 13 both columns are simulated (#7874).
- **Disaster damage:** homes are hit by dwelling kind, then home value, with ties broken by id. That is a cause from records, registered as stopgap `vulnerability-proxy` until homes carry exposure records (#7877).
- **The sewer shortfall:** no plug. What charges by use don't cover is the system's own deficit, paid by the general fund the way real systems are subsidized (#7889).
- **Job finding is one engine:** a seeker's progress builds from their own effort, the market's tightness and how long postings have been open. CPS spell length and JOLTS hires-to-openings check totals only. Counted seekers use the same rule, times their count. A fixed layoff rate stays stopgap `SG-LABOR-turnover-fixed-rate` until separations follow firm demand under the cycle.
- **Recovery from illness:** non-fatal episodes sit beside the fatal path, which is untouched, so the life table still matches. An episode starts when a person's strain crosses a line below their fatal line, or from a cause record. HCUP, NHDS and CMS rates check totals only. This supersedes the 5:53 p.m. call.
- **Task forces and study committees** (asked for by the owner by name): a record in the one body engine. One is formed when a body refers a split bill to study, or by an executive's order. Members are drawn by their records. Its report is read by the next bill's positions and by the press, and Story writes the scenes on top.
- **Per-world spread in the checks:** the M1 checks assert each day-1 opening value within the published figure ± the world's spread parameter, under the owner's Oct 27 ruling "realistic, not real" (#7884).
- The fee-by-bill question was ruled Oct 24 (yes, by bill); the press outlet shortfall and the counted out-of-town pay bullets were closed Oct 25 (below).

## Nov 8, 2:10 to 2:45 p.m.: the playtest of v0.94.0: grades reach the whole engine, no arrows or pages, one date (owner)

- **Word for word, with times:** `docs/coordination/playtest/2026-11-08-1-verbatim.md`, his answers in `2026-11-08-1.md`, and every point checked against main in `2026-11-08-1-check.md` (#7721). Recorded by the night Coordinator from the CTO's 2:45 p.m. handoff on #7365, while the CTO's account is at 95%: "you're at 95% so go ahead ans send everything over to my other account."
- **The English engine's reach and grading:** "time after time i bitch about the english engine yet it only updates one scene at a time. i keep saiyng that english engine updates should be reletively frequent and should impact the entire game, with it working specifically for scenes and stuff. this is why it feels like i've seen the same dialogue for 2 weeks." And (about 2:42 p.m.): "i have ruled on adding those lines in multiple times. this is why the entire engine being affected by grading is important. im not grading 6000 lines and 800 conversations individually." So:
  - A grade reaches every line that shares its pattern, voice and register across the whole game (as #6223 did on Oct 27), while each line still fits its kind of scene. #7435's narrowing to one kind of scene is undone.
  - New lines keep being added, and small batches come to him to grade.
  - A rewrite never deletes a line he graded good.
  - Updates are frequent and reach the whole game.
- **Scene openers:** "If it's June 7th, it says first thing on June 7th. You head to the clerk's office and speak to Maria Patton. And then it starts like that."
- **Addresses:** "you're right inagural is fine. i just hate the way the speech looks which is the english engines fault." The inaugural on Jan 20 stays. The way each address is worded is the fault.
- **No arrows and no "1 of N" pages anywhere:** "I fucking hate when you put these arrows... like those shitty survey sites." A long list is a list beside its detail. The CTO's "long lists page with arrows" wording is withdrawn.
- **Patch notes:** a list of builds, each opening to what it added, changed and fixed, like real patch notes. They're never "a huge, big-ass text box."
- **Loading:** the loading bar comes back. On Oct 28 he meant only a stray piece at its end. The loading screen names each step as it loads.
- **Budgets in The Political Process's style:** "yes i mean its style." That means real figures, "since last year", and timeline lines on a dark background, with no bar graphs. The Metrics tab he approved on Nov 5 gets a pool item.
- **A Week:** "3 seconds is too slow."
- **One date:** "There's one date and there's one time. One date, one time." Every screen reads the world's date, never one set at load.
- **Glossary underlines approved:** "The underline is working. Awesome. Love it, love it, love it."
- **CTO calls the owner may overrule (2:45 p.m.):** #7697's other-state budgets, built as the published budget times one growth factor, are sent back. Budgets move from each state's own simulated economy and its own laws.
- **Coordinator calls the owner may overrule (3:00 p.m., Memory's five fold questions in #7727, answered from AGENTS.md "Speed", Oct 30 01:55, Oct 8 "keep the result, not the reasoning", and no thresholds):**
  - Voters' heard promises are kept until the candidate's next election, which is the window `voting.ts` reads. Then they fold into the candidate's record of promises made and broken, by area.
  - Impressions fade on a sliding scale with time since the voter last heard of the candidate, at a researched forgetting rate. A row back at its resting value is dropped, and there's no "N years" cutoff.
  - Per-place votes stay for races in the player's own chain. Any other closed race folds to its totals and winner once the office's next race has used it.
  - Campaign gifts fold to yearly totals per candidate after the race closes, as for cash receipts. Each race's endorsement list stays.
  - The coarse fast-forward for unwatched years is built as well as these folds, not instead of them.
- **Coordinator calls (2:40 p.m.):**
  - The state per diem stays an expense payment on its own line, paid once by the treasury that owes it, outside the one payroll.
  - Layoffs keep the registered JOLTS turnover stopgap until firms have their own demand shocks. Hours are cut first through `api.rehourJob`, then whole people leave from discrete causes: the firm's cash, the owner's retirement, quits and life events.

## Nov 8 morning: check every ruling against the code; simulate, don't generate; ranges are not targets for anything; the other 49 states move on their own; candidates run because they want to (owner)

- **Word for word, with times:** `docs/coordination/voice-notes/2026-11-08-morning.md` (#7586). What main did against each ruling, file by file: `docs/reports/rulings-check-2026-11-08.md` (76 rulings: 24 done, 39 partly, 13 not done).
- **A project-wide rule** (10:06 a.m.): "Anytime I rule something, check it against the code first." Every brief and /goal carries his words, what main does (file:line) and the gap.
- **Simulate, don't generate** (9:50 a.m., repeated since Oct 7 and Nov 5): "You're simulating, not generating. You're just writing things and making the history match... That's why it should take 5 seconds." Off-screen activity in the player's own town (rivals' events, interviews, daily turns, relationships, news rebuilds) is kept as results, with detail built when opened; relationship records and the durable log fold.
- **Ranges are not targets, for everything; baselines only calibrate** (9:50 and 10:06 a.m.): "None of the simulation should be hard-coded like that or, you know, set against a baseline. The baselines are to calibrate... a cause formula... things can take drastic turns, wild turns, or just be, you know, calm." A Utah town at 1.6% against a real 3% "is completely fine if the simulation supports it... That goes for every state, every city." Real data sets openings and parameters inside cause formulas; nothing is pulled toward a real level each step, and no check fails a run for leaving a real band. (Main on Nov 8: unemployment is 4.5 minus a fading gap, inflation is pulled to 2.451 monthly, towns are pulled to their state's rate, and six checks fail runs outside real bands.)
- **The economy moves, and a Money session owns the dollar** (9:20 a.m.): "a completely new session that's solely focused on, the dollar. First, making the economy move, upswings, downswings, and so that way people react."
- **The other 49 states and the nation move on their own, top priority** (10:30 a.m.): "The other 49 states changing laws and, stuff happening nationally and locally and stuff is to the utmost importance, even simulation kind of stuff." Restates the Nov 5 ruling below, which main had not met: only the home state legislates (`world-legislating.ts:423-452`).
- **Scenes:** every kind working first, then many versions of each ("there's only 5 in corruption scenes right now, you could get... 30 different scenes within there"); lines in his voice ("all right, I got you, man"), conditions where useful; Story runs sub-agents for scenes, the director, and lines with tones and subjects.
- **Screens read what the game already records** (10:30 a.m.): "for things like what they think of me... Most of this stuff should not be new coding. It should just be reading the code and then just displaying it in different ways."
- **Candidates run because they want to** (10:20 a.m., to the coordinator): "Candidates don't necessarily need to be the strongest person. They just have to want to run. For whatever reason. Maybe they're crazy. Maybe they're not. Maybe they think they have a good chance. Maybe they have some inside knowledge that says that they have a good chance, etc." Who files is each person's own wish from their own reasons and their own (possibly wrong) read of their chances; long shots file; no fixed bar.
- **Small fixes** move to a session on the second account once this account nears its weekly limit (10:06 a.m.); at 95% more work moves there.
- **CTO calls the owner may overrule:** Story's endorsement-meeting check drops `line.includes(name)` and keeps the speaker check (the Lane 3 spoken-words rule). A county gets its own counted sample in the one store, weighted to its real count, built at the opening like the town's, not kin records weighted up and not a weight only candidacy reads; until then a read-time weight in candidacy is a registered stopgap.

## Nov 7 to 8: playable first, reversible laws, dev mode as the proving ground, all mocks conditionally approved, no subtexts (owner)

- **Word for word, with times:** `docs/coordination/night-2026-11-08/rulings-nov8.md` (fifteen rulings) and his voice note `docs/coordination/voice-notes/2026-11-08-story-and-night.md`. The menu rulings of Nov 5 to 8 are items 1 to 59 of `docs/mocks/2026-11-07-approved/RULINGS-nov5.md`.
- **The core:** make the game playable, systems that work over detail (Nov 7); every law at every level reversible by the body with the power (Nov 7); people are modular busts for early access (Nov 7); dev mode is the in-game fast track to prove anything, and "making it happen should just trigger the code in the game that makes it happen" from the screens a player reaches (Nov 8); scenes come from people's lives and tie to the effects ("a good term except for education... a strike"), the English differs by kind of scene (Nov 8); sessions fix what they find, not just report (Nov 8); every mock so far conditionally approved and the same principles applied to every other screen (Nov 8); "remove all those subtexts", and show the glossary's inline help (Nov 8); twenty years in seconds is fine if the result makes sense (Nov 8); a speed session researches before building (Nov 8).
- **CTO calls on conflicts the Nov 8 screens sweep found** (the owner may overrule): the player card keeps its portrait, as in the mocks he approved Nov 7 and conditionally approved Nov 8 (over the Oct 27 "only the date and time"); News uses the approved panel look, not a paper sheet (Nov 7 "no paper sheets" and the Nov 8 conditional approval of the news mock); no version string on the title (Oct 14 is newer than Sept 8). The speed bar is 120 seconds for every game year in every place, and a change may slow a year at most 5 percent as the median of three runs.

## Nov 5, 12:49 p.m. Eastern: other places are simulated from their people and filled in on demand (owner)

- **The owner, verbatim:** "it's slowing down because it is generating every record of every state and city passing laws but it is keeping those records instead of fitting them to the simulation. you dont need to do a whole huge record keeping thing. just simulate based on the people there and then you can fill in the gaps based on what was simulated when things need to be generated. generate on demand"
- **Standing law, restated** (owner, Oct 7: "simulate stuff when you click it instead of rendering every action every single day"; Oct 8: keep the result, not the reasoning, "there's no reason to index or keep everything"). Relayed by the CTO, Nov 5, who also withdrew the "each through its own chamber's votes and governor's decision" line of the State Sessions brief.
- **For every government outside the player's own chain:** (1) simulate from the people there on session days: members' and governor's views and the chamber's makeup decide what passes, no chance, cap or rate; (2) keep only the result, the law in force with its date and the vote count, and no filing, per-member vote, event or reason rows; the player's own state and Congress keep full records; (3) generate on demand: when the player opens another state's bill, vote or member, or a story or scene needs one, build that detail then, from what was simulated, the same every time and agreeing with the result (a roll call adds up to the count, a sponsor held that view), kept once seen, through the game's existing fill-in path (`core-fill-in-hook` and its neighbors), not a second generator; (4) the other states' roughly 7,500 legislators are not built at the opening if nothing needs them yet, and are named and built on demand (a named person is a real person once named, Sept 30); (5) routine records nothing reads (folded causes, the durable log, relationships for people out of focus) fold down to results.
- **Known cheats:** generating the detail and throwing it away (costs the same time); detail that contradicts the result; keeping rows just in case; a result from chance.
- **Finish line for this part:** in a played year from a place and seed nobody chose, at least 40 states change a law in force, each with its count; a test asks for one state's roll call and sponsor twice, gets the same answer both times, and it agrees with the count; records kept and memory reported before and after; the speed bars stand.

## Nov 3, 21:15 UTC: the final reorganization, and what the owner ruled (owner)

- **Five lanes and a merge desk:** `docs/lanes/`. All 837 unfinished items were accounted for: 446 live, reducing to 76 units; 135 later; 238 done, dropped or test-only; 18 answered from standing rules.
- **Six rulings on finishing,** his words: "for the first question. Sure, your recommendation, yes. Sure, option B. Not sure what the question is for number three, but you said you keep my rule. Sure. Yeah, whatever. Sure, number four, only in test files. Sure, no blocked status. Sure, your recommendation for number six."
  1. Checkers never hold a merge; nothing is done until a second session replays its finish line on main; only confirmed work moves the number.
  2. One check before merging: a new game opens and runs briefly without crashing. Nothing else holds a merge. This changes the Oct 6, 12 and 13 merge rules.
  3. Merge towns come from a printed replay number; a failure is replayed on that town against main to see whose fault it is. Fixed towns are for lane finish lines only.
  4. Stand-ins only in test files; lanes that can't use one run in sequence.
  5. "Blocked" means only a machine or permission failure, reported at once. Ownership is by lane; the second to merge updates; lanes sharing files write their agreement first.
  6. The same failure three times moves the session to its next item. No lane budget. A lane that passes all its paths takes other lanes' open items and invents nothing.
- **First-time winners:** a hard-working first-timer wins within three tries in most of the eight fixed towns, with holders at real rates. Replaces the CTO's "7 of 10," which was never his ruling.
- **Temporary fixes before release:** those a player can see. The rest stay listed with a reason. This relaxes the Oct 9 "release refuses while any is open" and the Oct 6 "nothing hardcoded."
- **People:** bodies built in Blender and seated by the room's camera, with people painted on them; each hair, face and garment is its own picture on that body. On a test in the Oval Office: "these look great." He had Blender and the add-on installed for this. People v1, v2, v3 and the green mannequin pictures are deleted. The work runs on the Mac; no cloud session works on people until he says.
- **The Oct 29 monument ruling stands:** menu screens show DC monuments, not conventions, with the latest character in front and passersby.
- **The store page is the owner's alone:** "I'm sick of you mentioning it at all. Has nothing to do with you." No session touches it or raises it. The Oct 29 stop stays in force.

## Nov 2, 01:40 UTC: at 94% of the weekly usage, every session hands off and stops (owner)

- **The owner:** "Okay, I'm at 94%. Have everyone come to a natural handoff. No need to necessarily rush, but do it with some intention. Because like I said, I left some buffer." Then: "interrupt them. We spoke earlier."
- **Done by the CTO at 01:40:** every running session was interrupted, including path-check runner A and the long-run runner. An interrupt also cancels messages still queued for a session, so the handoff order was sent again after it. The order: start no new work; bring what is on disk to a clean point; push every branch; write what is done and left in each open PR body; set each claimed item that won't be finished back to open with a Notes line naming its branch, head and next step; post a final status block; reply "handed off". Mergers and checkers comment on each PR they had started. The handoff for the other account is `docs/coordination/CTO-HANDOFF-2026-11-02.md`.

## Nov 2, 01:30 UTC: CTO ruling: the group-quarters test's eviction band leaves out Maryland, for its filing law (speed lead's question, with the reading line)

- **Ruling (under "Research before building": real data checks the simulation, with the reason cited):** the test band for eviction filings per 100 renter households is 0.65 to 23.32, every state's 2018 estimate except Maryland (Eviction Lab, Gromis et al., PNAS 2022; national 7.80, Connecticut 3.98, Tolland County 2.18). Maryland's 69.58 is left out because there the filing is the eviction notice and paying cancels it, so landlords file again and again (the Eviction Lab methods report, section 5.3). The game does not model that law, so its level is not a standard for a place the game plays. The full range would pass main's 43.25, which comes from students renting at their own incomes and being evicted, so it could not tell main from the build (Storrs, Connecticut: 1.31). If the game ever models a state's filing-as-notice law, places in that state get their own band from that state's figure.
- Read: OWNER-DECISIONS (Nov 1 14:20 group quarters; Oct 24 "Simulate it, don't ask"), DECISION-REGISTER, docs search for "eviction filing" and "Eviction Lab", `data/research/housing/eviction-filings-README.md` on the build's branch.

## Nov 2, 00:50 UTC: at about 91% of the weekly usage, everyone keeps working; skills now; progress recorded for the other account (owner)

- **The owner:** "Okay, so I'm at 90 or 91%. Everyone keep working like normal. Just remind everyone right now to do their skills, updates and new skills, or maybe delete whatever. And then just be sure that progress is recorded so that when you do run out of usage, my other account can know what's going on, etc. I'm not sure if I want to use Ultra Code on my other account when it resets."
- **Done by the CTO at 00:50:** every running session was told to send its skills PR now (updates, new skills, stale lines deleted) and to record its progress where the next session reads it: pushed branches, PR bodies with what is done and left, each claimed item's Notes with branch, head and next step, a status block in its channel section, and comments on half-checked PRs. The CTO's handoff is the newest block in `## CTO` of `docs/coordination/LEADS-2026-10-24.md`.

## Nov 2, 00:25 UTC: CTO rulings: donor calls follow a call list from the campaign's records; #7104's platform band is reported, not held (governing lead's questions)

- **Donor calls (under "Simulate it, don't ask" and "No dice"):** a campaign's donor calls walk a call list built from its own records: the candidate's family, then the rest of the people they know, then volunteers, then residents who said yes at the door, then party members, then everyone else who has heard of the candidate; within each group, by tie. Source: Call Time 101, already cited ("Candidates should prioritize personal before anything else"; "should start with their closest network"). It replaces walking the reachable list in id order, which sent 79% of asks to people with no reason to give; the Oct 24 walk-order ruling is about doors and was never this. The player's own calls follow the same list. It ships in the same PR as `people-press-staff-households` and the money-share refit, because the refit's bands depend on it; the body keeps the three changes in separate sections. If the bands still do not hold, the PR reports the measured gap and tunes nothing.
- **Amended 00:45 (the governing lead's measurement):** on the same 24 run seeds the call list changes who is asked first but not who is asked over ten weeks (57,579 asks either way; 21.6% against 21.9% to someone with a reason to give; $526,967 against $526,589), so it does not move the money bands and leaves the refit's PR. It stays the rule for the order of calls, because a campaign's early money and the player's own evening of calls read it (`play-campaign-acts-as-scenes`), and it ships as its own small PR. If no money share and month span holds 16-place pools under 0.5%, the money test draws 24 places (about 0.4% on 192 places so far), per the `governing-measurement` rule that a test's pool is sized from the resampled rate; refitting the donor's reason terms is filed as its own item, not done inside this PR.
- **Amended 01:15 (the refit on all 101 run seeds):** fitted on 51 seeds (408 places) and held out on 50 (400 places), with press people carrying a living cost. The best point is share 2.1 and month span 0.115 (from 1.75 and 0.1): $121 an hour, a $136 mean gift, a $92 median. Press people now give 9.5% of the money, down from 44.6%. No point on the grid brings 16-place pools under 0.5% outside a band (3.1% fit, 3.7% held out), because poor towns fall under $75 an hour while rich towns' median gift passes $125, the real spread between places. 24 places give 0.71% and 0.81%, and 32 give 0.13% and 0.22%. So the money test draws 32 places, under `governing-measurement`'s pool-size rule, with the bands unchanged and its run time about ten minutes. Refitting the donor's reason terms (about 22% of reachable people have a reason to give) is its own item.
- **Press staff pay:** giving press staff a living cost showed they hold no job and draw no pay (3 of 4 news directors in Petersville, Alaska reach $0 by summer). `SG-PEOPLE-press-national-payroll` is open again and `people-press-out-of-town-staff-paid` (lead governing) is filed.
- **#7104's C1 band (accepted as the governing lead ruled it):** the test prints the platform-emphasis band and does not hold it; the band moves to `campaign-platform-emphasis-c1`, under the Nov 1 23:35 handling of the 12-point incumbency line.

## Nov 1, 23:40 UTC: CTO ruling: a folded term or race is found by its id inside its seat's summary; it need not stay a row (speed lead's question, with the reading line)

- **Ruling (under the Oct 30 10:21 ruling, knowledge is compacted, never forgotten, and the Speed rule that old records fold once play no longer reads them):** for other places' ended office terms and old outside race rows (`core-long-run-election-and-term-rows`), it is enough that dev mode's `findRecord` resolves a folded term or race id to its entry in the seat's summary row. The folded ids need not stay as rows. Conditions: each entry keeps every field a reader reads (the holder's person id, start and end dates, how the term ended, the race's winner and vote totals); the player's own town and every race or term the player, their household or their circle took part in stay as rows; each reader's window is agreed with its owner (laws, governing, Words, the lane) before the fold; and the records proof shows every screen, scene, person card and trace why reading the same before and after.
- Why: #7020 seats every state's members, so terms and returns grow with every election. Kirkman, Iowa keeps 454,608 records at year 4 against 367,386 before it, and Long Hill, Connecticut projects about 12 times the years-1-to-4 term rows by year 100.
- Read: OWNER-DECISIONS (Oct 30 10:21, Oct 29 every state's members seated, Oct 30 04:14 fold routing), the item's Notes, the leads channel (Laws); the speed lead searched docs for "seatPasts" and "outside-seat-records".

## Nov 1, 23:30 UTC: the owner's answers and the filing visit (owner, 6:30 PM Eastern, two screenshots, Northampton, Massachusetts)

- **Talk is not a list (owner, on the clerk's answer to "I want to run for Mayor"):** "this dialogue is absolutely god-awful. It's just listing things. Unless it calls for it specifically in the dialogue scene, it shouldn't read as a list. That's not how normal people talk." Every scene's lines read as speech; a list appears only where the scene calls for one. (`words-clerk-visit-narration-real`)
- **The player never says what they did not choose:** after "File for this office", the record showed the player saying "I see." ("I never said that"). A choice is worded as the player's actual reply, and nothing else is put in the player's mouth. (`words-clerk-visit-narration-real`)
- **Bodies are named as the place names them:** "whatever the board sends you to sign. What do you mean, whatever the board? Do you mean city council? ... I'm in Northampton, Massachusetts." (`words-clerk-visit-narration-real`)
- **A trip to a closed office happens when it opens:** "I went to the office after the president's speech ended. So it should have not fast-forwarded, but it should have started the next day because obviously the office isn't open at 8:30 p.m." (`play-offices-keep-their-hours`)
- **The first filing offers the campaign tutorial, in the scene:** "it should be the first time in a game that the player files for an office. It should start this quote unquote tutorial... do you know how to run a campaign? So that's essentially saying, do you want the tutorial, yes or no? And then it could be like, your goal is to get X amount of signatures to get on the ballot. You do that by doing this. Now, you'll need money... this is what you can spend money [on]. You can get TV ads. Etc. You may want to do media... That's how the tutorials should work in the game." Tutorials are asked by a person in a scene, yes or no, the first time something happens, and their figures come from the place's records. (`play-first-filing-campaign-tutorial`)
- **Calendar (answer to the CTO's question 1):** "Sure... just make them color code those things. Like town meetings and stuff. And be able to hide them if you want." (`play-calendar-more-than-birthdays`)
- **Issues (question 2):** "I imagine clicking on it and the quote-unquote bill interface as it is in whatever place you're selecting. And seeing... what that does to say the budget or analysis on how homelessness affects graduation rates or anything like that. And if you've maybe run a poll, you could see what people are thinking. You could see recent legislation. You could see choose your position. Get me a mock." (`play-issues-law-page-and-what-shows`)
- **Mocks first, through the CTO (question 3):** "So the lane will show me a mock and you'll send it to me in this chat." Issues and Budgets are built after the owner sees their mocks.
- **No second lane builder (question 4):** "no, don't worry about starting a new builder."

## Nov 1, 22:25 UTC: the owner's v0.73.0 playtest: the address, the talk after it, the creator, the calendar and the paper (owner, 5:25 PM Eastern, five screenshots)

- **Random name after gender:** "Randomized name shouldn't work until you choose a gender." (`play-creator-random-name-after-gender`)
- **No talk, no click:** "If there's no dialogue, you shouldn't be able to click on the person." (`play-person-clickable-only-with-talk`)
- **The address has no statistics, is longer, and plays as the montage:** "I don't like where this part of the speech where it just laces statistics and stuff. Again, I keep telling the word session, look at real like inauguration speeches." "The speech can be longer because, again, it's supposed to be like a montage." "The speech with the president is supposed to start with the president, like in the Oval Office or something, and then doing like a montage. But here it's just like I'm just clicking continue." This restates the Oct 29 02:35 rulings (the montage; "no real statistic in play"), which are not built yet. (`words-address-flows-from-records`, `play-m6-01-the-opening`)
- **The talk after the address:** one opening line every time ("that's not how I approve this"), "they" for a President whose record says she, and replies that don't follow the choice. (`words-after-address-talk-follows`)
- **The player shown with a partner the records don't hold:** "I guess it has chosen to make my character gay again. I don't know why." Cause to be found by record. (`play-opening-who-shares-the-couch`)
- **The calendar:** "Something on the calendar I don't like is that it's just people's birthdays." The CTO's reading, open to correction: the player's own appointments and the town's dated public events first, with birthdays only for household and close family. (`play-calendar-more-than-birthdays`)
- **The paper:** "none of this is a story" (a closure printed as four field sentences; `words-news-stories-not-fact-lists`); "I click on it, nothing happens" (`play-news-story-click-opens`); a drop cap split "16" into "1" and "6" (`play-news-drop-cap-splits-numbers`); and "All 54 votes were cast. No, I can tell that's the generated number of people, not the simulated amount of votes", with every race named "Legislator" (`elections-past-race-votes-from-electorate`, under one model, two tiers).
- **Second batch (22:40):** the bottom of the paper ("a bunch of nonsensical stuff there"; `words-paper-law-and-budget-briefs-read-right`). People's histories: "Elected legislator, it needs to be told like a story. How many times do I have to say that? ... Under her name, she told legislator. That's not good. There needs to be more text." (`words-person-history-tells-a-story`). Issues: "I kind of see the vision here... I don't like how it's just laid out and a bunch of cards... I click on it and then it gives me no information about it. Give me options for what shows." (`play-issues-law-page-and-what-shows`). Budgets: "I don't know why it doesn't show every state either... look at another political game, the political process, look how it displays budgets... use that as inspiration... remove [in force at the opening]... put like when it is enforced, so October 1st, 2024 to blank." (`play-budgets-every-government-political-process-style`). Parties: "it says Democratic. Views fit close. How do you know?" (`play-parties-says-how-it-knows`).
- **Third batch (23:05, a Massachusetts life):** the speech again ("every one of these speeches has the same general outline. They need to vary... varying degrees of speech and varying ways that lots of people talk in the game. So that it really seems alive"; `words-address-flows-from-records`). One race: "it just gives me the choice of a bunch of council seats. No, I should only be able to run for one council seat." (`campaign-player-files-for-one-council-race`, under the CTO's town council seats ruling). Travel's clerk card: "It says what you do here. And then it's just a list of people's names." (`play-travel-place-card-says-what-you-do`). The clerk's narration: "how do you know why I came here with my forms in a folder?... I used to work at the county clerk's office. You filled out the forms there." (`words-clerk-visit-narration-real`). The counter's choices: "a terribly designed menu" (`play-clerk-choices-designed`). Seen in the screenshots: the clerk's office open at 8:30 PM (`play-offices-keep-their-hours`).

## Nov 1, 22:10 UTC: CTO ruling: the counted split applies to races without party labels; partisan races keep first place until a within-record spread replaces both (amends 18:20 Q1; governing lead's question, with the reading line)

- **Ruling (under "One model, two tiers" and #4861):** the 18:20 Q1 split holds for races with no party label on the ballot, at k = 1 (`appealPerShare`'s own slope, no new number). There it does what it was for: a council seat's counted record in Lexington, Texas now gives the leader 0.699 instead of 0.910. Races with party labels keep first place for counted records, because the lean order is already placed to each state's 2024 vote. A share on top counts that spread twice: in a draw of all 51, D.C. goes to 0.193 Republican against 0.072, and a town at 0.20 counts as 0.297. Reaching D.C. with the split alone needs k of about 2.7, which moves a 0.15 local gap about 10 points, against #4861's "a few points".
- **What replaces both:** a registered stopgap names the single model, a spread of leans within each counted record on the lean order, so that partisan and nonpartisan races split by one rule. `appealPerShare`'s source text is rewritten in the same PR. The first-place `choice` column beside the split is deleted (replace, never layer). `recalls.ts`'s whole-weight-by-sign gets its own item.
- Not chosen: widening `stateShareTolerance` (it loosens a test), and a second, steeper slope for partisan races (a second parameter fitted around a double count).
- **Amended Nov 1, 23:35 (governing lead's question):** the line falls where the candidates' party sides differ, not at whether a label is printed. A party primary, where every candidate carries the same label, splits by share at k = 1 like an unlabeled race, because the lean order sorts voters between parties, not within one. The rule is: split where the candidates' party sides are equal, first place where they differ. Built on governing/counted-vote-share: one seed of all 51 puts every state within 0.02 of its 2024 vote (D.C. 0.064 against 0.064), and an Arvada, Colorado council record splits 0.51, 0.26 and 0.23 where first place gave 0.92, 0.04 and 0.04. speed:year is 3.2% slower, the election year 6.3%. If the split alone does not bring a race's incumbency move near the item's 12 points, the PR reports the measured move and `campaign-incumbency-calibrated` carries the rest; nothing is tuned inside the split.
- Read: OWNER-DECISIONS (Nov 1 18:20 Q1 and Q2; near-binding pledges, Oct 29), DECISION-REGISTER, prior-rulings/elections.md, LAW; the governing lead searched appealPerShare, stateShareTolerance, partisan, 2024 vote, counted share and first place.

## Nov 1, 22:20 UTC: CTO ruling: campaign money merges on its registered stopgap; the press-staff fix and the refit come next (governing lead's question)

- **Ruling (under "Nothing waits": build against the smallest registered stopgap and say so):** #7062 (donors give from the month's pay after taxes and bills) may merge with its fitted money share leaning on `SG-GOV-gift-no-living-costs`. In the fit, 631 of 10,990 gifts but 44.6% of the money came from press staff seated with no living cost. Conditions:
  - the fitted parameter's citation names the stopgap and says the value is refit after `people-press-staff-households`;
  - that item is the governing lead's next unit, giving paid press staff a living cost at their pay in `press-staff.ts` `seatStaff` (owners already get one through `giveLivingCost`), and the refit lands in the same PR;
  - the press desk is Words', so the governing lead tells Words before editing `press-staff.ts`.
- Why: before #7062 a whole campaign raised $12 to $258. After it an evening of calls raises $93 to $217 an hour, with a typical gift of $58 to $94 (20 run seeds, 16 drawn places). The player gets that now, and the refit corrects the share within the next unit.

## Nov 1, 21:25 UTC: CTO ruling: old itemized payment copies fold once their readers' windows pass (speed lead's question, with the reading line)

- **Ruling (under "Speed": old records fold into summaries once play no longer reads them):** the Oct 30 10:21 ruling below covers what people know, not itemized copies of payments. The cash journal's itemized receipts may fold into per-person, per-kind yearly totals past the windows their readers name: 365 days for the player's circle, two calendar years for the player's household. Open obligations, observer rows, balances, the journal itself and every total stay whole, and a receipt a kept fact, a pledge or a law's chain proof names by id is kept. The fold waits for the lane's and the laws lead's answers on their windows, and its records proof shows every screen, scene and trace why reading the same before and after.
- Read: OWNER-DECISIONS (Oct 30 03:05, 04:14, 08:15 and 08:41 campaign-cause rulings; Oct 20 decision detail), DECISION-REGISTER, the leads channel (Speed, Oct 30 11:05), docs search for "compacted" and "foldedCauses".

## Oct 30, 10:21 UTC (recorded Nov 1, 21:25): CTO ruling: knowledge is compacted, never forgotten (speed lead's long-save plan)

- **Ruling (DECISION-REGISTER line 646: "Persistent history, relationships, commitments, memories, reputation, knowledge and consequences are core character state"; the absence design: "known events do not disappear"):** knowledge is compacted, never forgotten. Promise hearers kept on the promise row instead of one fact each is right: the same knowledge in one row. "Heard of the candidate" kept as a per-person set or a per-candidate count is right. Dropping any of it is not, except through the monthly forgetting pass for the two kinds that already have one. A fact play reads (a scene's "you heard...", the trace's why) must still answer the same after the change, and the records proof shows it.
- The dead may leave the live set for an archive (two-level population), as long as their history stays readable for kin, journals and the trace.
- Order of the long-save plan: exact cuts, then folds with their readers agreed, then dormant ties, then event ids and the dead.
- This was sent to the speed lead on Oct 30 and quoted in the channel (Speed, Oct 30 11:05), but was not written here until Nov 1.

## Nov 1, 20:00 UTC: CTO ruling: who writes a letter to the editor is a trait-engine decision (Words' question, with the reading line)

- **Ruling (under "No dice" and "One engine per mechanic"):** a letter to the editor is the trait engine's decision `press.letter` (write or keep quiet), the same shape as the meetings take-part decision (`traitWeightMeetingsTakePart`). It is weighed among the outlet's readers whose stance on a law cites a story they read, with each reader's strength of feeling as an input beside their traits, never stance strength alone, which would be a second decision path and a threshold. No traits lead is running, so Words adds the row itself: the decision row, its trait-coverage rows, a weight in `parameters.json` that starts TUNABLE with its spread, and a row in `data/research/trait-effect-sizes.json` from a fetched study of who writes letters (`researcher`). It is calibrated with `scripts/traits/trait-calibrate.ts` the way the meetings weight was. If no study gives an effect size, the weight stays TUNABLE with a registered stopgap naming the search.
- **Counted readers (one model, two tiers):** a counted group of readers is weighed with the same rule times its count. The writer a printed letter names is a named person, filled in, seeded, when the letter prints (two-level population), the same rule as the birthday and obituary briefs.
- Read: OWNER-DECISIONS (through Nov 1), DECISION-REGISTER, prior-rulings, LAW; Words searched docs/ for "letter to the editor" and "press.letter": nothing decided.

## Nov 1, 18:30 UTC: CTO ruling: the paper prints what a body did, not that it sat (Words' question, with the reading line)

- **Ruling (under the owner's Nov 1 "there needs to be real ones with some good fluff or else it will get old"):** Words measured a played year (`scripts/dialogue-batch/paper-year.ts`, seed paper-nov1): 520 to 903 stories in three drawn places, with board and council sittings at 60 to 143 a year. "Hughes County Board of Commissioners meets" ran 94 times in Blunt, South Dakota, and 101 to 157 sentences printed more than three times a year. From now on a sitting prints as a story only when the body took something up (a bill, a vote, a hearing), with the headline read from what it took up. The other sittings go into one weekly "Meetings this week" brief listing the bodies that met, and the fixed member-count line goes. It is the press's own selection (`src/core2/modules/press.ts`), carried by `words-paper-and-journal-everyday-life`. The same pass fixes the doubled article, out-of-state oaths in a local paper, and a 0% rate printed for a place too small to mean anything.

## Nov 1, 18:20 UTC: CTO rulings: counted votes split by the appeal gap; incumbency centered in every race (governing lead's questions, with the reading line)

- **Q1 (under "One model, two tiers", #4861 and "No dice"):** a counted voter record stands for W different residents, so its unpledged weight divides among the candidates by a logistic share of the appeal gaps at `appealPerShare`'s slope, as counted job choices follow "the selection weights times the count" (line 482). It no longer all goes to whoever is strictly first (`countedChoice`), which turned 0.15 appeal units of bare incumbency into 19.6 points in Lajas, Puerto Rico, against #4861's "a small appeal gap moves the result a few points". A share of the count is not a roll. Pledged households keep their whole vote (near-binding, Oct 29), and a named voter keeps first place. Its own item and PR, before the parameter fit, with the spread across drawn places shown.
- **Q2 (under "One engine per mechanic"):** the voter-trait incumbency term is centered (`incumbentLeanCenter`) in every race, not only on the partisan path, as the field's own doc says ("around that advantage, not on top of it"). No traits lead is running, so the CTO rules it. `traitWeightVotingBackIncumbent` is fitted after Q1, within its spread, and tagged ESTIMATED with its source; `traits-civic-calibrations-studies` carries a Notes line.
- Why: either incumbency term alone holds 94% of contested local races and removing both gives 56%, against the real 66 to 78%. Tuning the terms down cannot hold across 56 places while counted records vote as one.

## Nov 1, 18:10 UTC: a process is a skill, not a message; every session updates its skills (owner)

- **The owner, Nov 1:** "remind every session about creating/updating skills. i saw one messaging about communicating a process. just make it a skill. and update all". A session about to explain in a message how to do something writes it into the skill that covers it (or a new one) and sends the skill's name instead. A process received by message that no skill holds becomes a skill line in the same pass. Carried by `AGENTS.md` ("Skills") and the new `crew-messages` skill (#6992), which holds the message routes the CTO had been sending by hand. Every session was messaged at 18:10 to look back over its work and messages and ship one `skills:` PR with every lesson and process not yet in a skill.

## Nov 1, 16:50 UTC: every life is simulated (owner)

- **The owner, Nov 1, answering the relative-with-no-news question:** "EVERY. LIFE. IS. SIMULATED. WHAT DO YOU NOT UNDERSTAND. THIS IS LOW INTENSITY STUFF." A relative or acquaintance who lives elsewhere (a "husk", kept minimal until met) lives a simulated life at low intensity: they work, change jobs, move, marry, have children, fall ill, age and die. The same engines the town's people run through make it happen, at a coarse cadence, and each event leaves a dated record. "Nothing in their lives is simulated" was a gap, not a design. So a talk with a relative has real news under the Oct 14 Q7 and Oct 15 family-talk rulings, which stand: their happenings are the news. Built by a new lives lead (item `core-every-life-simulated`), with the speed lead on cost (low intensity holds the speed bar) and Words on the talk. The CTO's Oct 30 recommendation to keep the empty talk is withdrawn.

## Nov 1, 15:20 UTC: CTO ruling: counted voters carry a voting habit from their group's turnout record (red main's question)

- **Ruling (under "One model, two tiers"):** a counted voter's turnout has no habit term ("no one there has a record"), while a full voter's has one from their own record. So a state's turnout history never reaches the counted tier: Mississippi's counted turnout is 0.336 against CPS 0.689 (`electorate.test.ts`, seed 4c2b…, US-MS 2839000), because its survey engagement is the lowest in CES 2024 while its citizen turnout is above the nation's. The counted tier gets the same habit rule, seeded from its state's and age band's CPS turnout record (SOURCED) as its pre-start history: a cause the vote reads, never a forced figure. The national-centered engagement term stays, since it carries signal (correlation 0.57 with state turnout). The test's tolerance is not widened. Built by red main after agreeing it with the governing lead (voting is on their chain), proved on the Mississippi and Minnesota draws and one fresh draw.
- **Amended 15:25 (red main's measurement):** the habit term alone moves Mississippi only from 0.336 to 0.360. Once habit carries each state's turnout level from its own CPS record, a nationally centered engagement term counts the state level a second time, from a survey whose state ranking runs against turnout there. So engagement is centered on the voter's own state and carries only within-state differences, while habit carries the state's level: one cause each, counted once. `turnoutHabitWeight` is unchanged. The proof is ten draws with the mean and largest error against CPS on main and on the branch, and it ships only if the mean does not get worse.

## Nov 1, 14:20 UTC: CTO ruling: an evicted counted household stays counted; group quarters are built from research (speed lead's question, with the reading line)

- **Ruling (under "Two-level population" and "One model, two tiers"):** in Storrs, Connecticut (the nightly's seed 808522d29c84), full people grow from 1,747 to 5,804 in a year because `housing-homeless.ts` fills in every evicted counted household (`removeCountedHousehold` → `fillInPerson`). Every engine that scales with full people slows with them (garbage collection 282 s, campaigns 210 s, jobs 162 s in 2026). A counted household is filled in only when it comes to matter to the player. Eviction, homelessness and re-housing read the counted rule times its count, as the homelessness ruling (owner, Oct 14) applies to everyone. Built by the speed lead with a records proof: the same homeless counts and placements by place, without the fill-ins.
- **Group quarters (under "Simulate it, don't ask"):** college dormitories, prisons, military bases and nursing homes hold people who do not rent households. The model has none, so a college town's students rent and are evicted in large numbers. Their population by place and type comes from the Census (SOURCED), and they stay out of the rental market. A pool item led by the speed lead, with a researcher pass first. Storrs is the test.
- Read: OWNER-DECISIONS (homelessness Oct 14, evictions without courts, player eviction), DECISION-REGISTER lines 42 and 137, prior-rulings/economy.md (B. Evictions), AGENTS.md "Keep it simple"; searched: homeless, evict, group quarters, dormitory.

## Nov 1, 13:20 UTC: no wake-up timers (owner)

- **The owner, Nov 1:** "Alright, go ahead and get things working... Anthropic has removed 5-hour limits, so no need for any timers or anything." The Oct 29 23:00 wake-up chain (a trigger 2 hours 40 minutes out, then every 5 hours 2 minutes) is withdrawn. No session arms a `send_later`, `create_trigger` or other wake-up for resets; any still armed is deleted (none were enabled at 13:15). The `cto` skill's wake-chain line is replaced. Every crew session was messaged to resume at 13:15, after reading the first-account CTO's Oct 31 block and `docs/work-orders/codex-2026-10-31.md`.

## Oct 30, 08:15 UTC: CTO ruling: the circle fold's "last three" go unless a reader is named (amends 03:05; speed lead's question, with the reading line)

- **Ruling (under "an effect is a read, not a record" and the Speed rule that a long save stays flat):** the 03:05 fold kept each circle member's last three causes per candidate on the governing lead's condition. In a Ringgold, Louisiana save (seed long-1) they are the largest table by year 8, 270,470 of 1.42 million rows, and they grow as circle members times candidates times three. No reader in play is known: the race standing and the door scene read `causeSummaries`, and the trace reaches a folded cause only through a fact, which is kept. Unless the governing lead names a reader in play by 09:20 UTC, the fold keeps only the summaries (each contact kind's count, warmed and cooled, per voter and candidate), every fact-named cause and every pledge. If a reader is named, the three stay only while both the voter and the candidate are alive. Carried by the speed lead's follow-up to #6917; its records proof differs only in `foldedCauses`.
- **Settled 08:41:** the governing lead found no play reader of the kept three on main or on their six open branches (play reads the live causes on the day and `causeSummaries`; `foldedCauses` is read only inside `foldCauses`). The three go. Their one test-only reader moves its checks to before the race closes.
- **Amended Nov 1, 21:25 (the governing lead, 21:22, through the speed lead):** "every pledge" was the governing lead's condition, and they lift it now that pledges drop at a race's close: the pledge keep reason leaves `foldCauses` in the same PR as the pledge drop, and the warmth those contacts moved stays in `causeSummaries`. The governing lead also agreed to drop gifts, endorsements, polls and stepped-up rows at a race's close; these rows and the pledges are all kept in any contest the player filed in, and to drop the campaign money table once each posting is made (the cash journal keeps the dollars). Carried by `core-long-run-closed-race-rows-fold` (branch `speed/fold-doors`).

## Oct 30, 04:14 UTC: CTO ruling: folds are built, not asked (speed lead's routing question; recorded 08:15)

- **Ruling (under the Oct 29 22:45 and Oct 30 01:55 speed rulings, "old records fold into summaries once play no longer reads them"):** the speed lead builds each fold of a table that grows with history (the event log `core.durableLog`, `speech.retellings` and the like) without an owner question. Before building one, the speed lead agrees each reader's window with the session that owns that reader (`docs/coordination/CREW.md`), and goes ahead on a yes or after an hour with no answer. The PR body names every reader and its window. The routing at 04:14: speech retellings, the governing lead (voting, campaigns) and Words (civic roles); the event log, the governing lead, Words, the laws lead and the lane by reader. Recorded late: the ruling went by message at 04:14 and reached this log at 08:15.

## Oct 30, 04:10 UTC: the 04:00 ruling below is withdrawn: the owner already ruled this (Words' correction)

- **Withdrawn.** The owner's Oct 14 Q7 ("someone not in the room is talked about only when something recorded happened to them") and Oct 15 batch 11 grading ("Between relatives, work, school, where each is from and mutual acquaintances are not talked about ('Where do you work' between relatives is not a scene)") answer it, both quoted in `src/director/data/conversation-rules.json` (`happenings`, `familyTalk`). A relative with no news on record has no talk, and the empty talk is by design. The CTO's search missed the data file; `look-first` now names it. The question goes to the owner under **Open**, and `words-talk-husk-acquaintances-empty` waits on it.

## Oct 30, 04:00 UTC (withdrawn 04:10): CTO ruling: a shared relative with no news is still something to talk about (Words' question, with the reading line)

- **Ruling (acting CTO; withdrawn, see 04:10):** within the Oct 24 ruling that a talk with nothing on record says nothing ("that should be going to the hi, have a good day. That makes no sense"). A relative the two share has standing records (where they live, where they work), and those are something on record. So "How's your mother?" may be asked with no recent event and answered from them ("She's still out in Lakeville."). The "something recorded happened lately" gate in `subjectsBetween` is relaxed for shared relatives only. Answers read only records that exist and cite them, never invented news, health or moods. Talking about a husk does not fill them in (two-level population). The answer varies by the speaker's traits and writes the dated contact a talk writes. With no such record there is still no talk. Carried by `words-talk-husk-acquaintances-empty`.

## Oct 30, 03:40 UTC: CTO ruling: one File-for-it gate on the race page (Checker 3's question)

- **Ruling (under "one engine per mechanic"):** the race page offers File for it only on a race the player may run for, by the one field main's #6882 puts on every ballot row (`playerMayFile`, from `player-offices.json`). The menu stack's own copy of the check (an older row without the field kept the offer) is deleted; the campaigns-ballot check asserts main's condition. Merged into #6868 and up the stack.

## Oct 30, 03:05 UTC: CTO ruling: a closed race's causes for the player's circle fold into a summary (speed lead's question, with the reading line)

- **Ruling (under "Keep it simple" and the Oct 29 22:45 "old records fold into summaries"):** once a race closes, its campaign-cause rows for people in the player's circle fold into one summary per voter and candidate, keeping each circle member's last three causes per candidate, any cause a known fact names, and every pledge (the governing lead's condition). "Save why reasons only for the player and the people they deal with" is about whose why is kept, not every contact forever. The fold ships with a records proof that the race standing, return visits and the trace read the same. Measured: in a Ringgold, Louisiana save (seed long-1), 252 of 253 thousand cause rows in year 3 were kept only because the voter was in the player's circle (116 people, about 4,000 contacts each a year), the largest grower of a long save.
- **A long-run runner** (Sonnet, `session_01S4WSHroZq1RTpWvGEVLNCf`) runs the speed lead's 100-year save on its own machine, editing nothing, after the run was killed for memory in year 7 beside the speed lead's other work.

## Oct 30, 01:55 UTC: CTO ruling: the speed bar for a country's year and a save that runs for centuries (overridable)

- **The bar (speed lead's measured proposal, accepted under the owner's Oct 29 22:45 ruling "a country's year... hundreds of years... still speedy"):** on `npm run speed:year` in a place drawn from all 56, one process at a time: (1) a country's year runs under 120 seconds, and no change makes a year more than 20% slower than its base (as before); (2) over one save, the average of years 97 to 100 is at most 1.2 times the average of years 1 to 4 (four-year windows, so election years compare with election years), and the same holds for memory after a collection and for the records kept; (3) the long run is checked every night on one drawn small town and weekly on a large one, printing years 1, 10, 50 and 100.
- **Why this shape (research the speed lead fetched and had re-checked):** long-running games stay flat because they keep only what play reads and fold the rest: Football Manager's 100-season saves keep the same number of players because retirees leave; Crusader Kings 3 updates most people monthly, stopped creating stray nobodies and computes opinion on read; RimWorld garbage-collects world pawns with no keep reason; Dwarf Fortress promotes a figure to historical only at the last moment; microsimulation keeps the dead and their history outside the live set. Our two-level population ("Keep it simple") is the same idea; every engine that keeps a row per event now needs a fold rule (keep what play reads, summarize the rest once it closes).
- **How the bar is measured (03:20, the speed lead's finding):** `speed:year` runs four years by default so every check includes an election year, and the 120-second bar applies to each year; receipts print each year. A one-year check measured only 2025, an off year: in a Ringgold, Louisiana save, 2025 took 52 seconds and 2028, a presidential year, 155 (campaigns, press interviews, drives and voting).
- **Today (main 923bfbf3):** a year runs 25 to 162 seconds across six drawn places (two over 120), and one Ringgold, Louisiana save grew from 42 to 168 seconds a year and from 0.5 to 2.0 GB by year 6, then crashed in year 7 when the money journal's world lifetime total passed JavaScript's exact-integer limit; that crash is the first fix. The biggest growers: campaign causes (721 thousand rows, the governing lead's), the event log, speech retellings, door visits, campaign money, employer tax shares, ad buys, budgets' year-to-date.

## Oct 29, 23:00 UTC: never a meter for how someone feels about you; every session keeps a wake-up chain (owner, about 7:00 PM Eastern)

- **No scale of what someone thinks of you, anywhere (owner, on the CTO's person card with a "How close you are" bar):** "Oh no, not that kind of what she thinks of you. No scale like that. No, that is not allowed in this game... none of that how close you are bullshit. No, no, no, that's not how this game works. Again, look in Drive, look at the logs and the transcripts and indexes and everything." And: "you need to find a different way to display stuff other than bars like that. No, this is not that kind of game." It was already ruled: relationships are "never a visible meter" (DECISION-REGISTER, OCD-LIFE-008), and mood shows through behavior, never mood words (prior-rulings/people.md). So no bar, meter, scale, number, colored dot or band word for how a person feels about the player, on any screen. A relationship shows as what they are to you (Father, Coworker), what you share ("Lives with you"), what happened between you (their history), and how they act and talk. The CTO removed the person card's closeness bar and Government's feeling dot (cto/menus-person-card). This supersedes the 22:10 entry's "how they feel about you" on the member card: the CTO offered it, it was a meter, and it is gone. Bars that count things a record holds (a roll call's yes and no votes, money) are not this ruling; the Oct 14 mock's vote bars stay unless the owner says otherwise.
- **Every session keeps a wake-up chain (owner):** "message every session and tell it to set a trigger for 2 hours and 40 minutes from now. And then again for every 5 hours and 2 minutes after that, to make sure you keep working after resets, even if the limit is hit." Every session in `docs/coordination/CREW.md` was messaged at 23:00 UTC to arm `send_later` for 2026-10-30 01:41 UTC and, each time it fires, to arm the next one 302 minutes later before anything else. This lifts, for the wake-up chain only, the Oct 14 rule against sessions using scheduling tools and any brief line like it (the governing work order's "never use a scheduling tool"). The CTO armed its own (trig_01GYu68ndfqZE8LvQzNfpAL5) and arms a scheduled task into any session that cannot. As it turned out (23:40), the lane, the laws lead (on the owner's own word in its session) and the speed lead armed their own; the other thirteen declined (a relayed message does not lift their briefs' scheduling rule) or were refused by their permission check, so the CTO armed one-shot wake-ups into each for 01:41 UTC and re-arms all thirteen at each of its own wakes, every 302 minutes.

## Oct 29, 22:45 UTC: every menu redesigned like Government; "city council" means whatever the place has; a country's year, for hundreds of years (owner, about 6:30 PM Eastern)

- **Every in-game menu is redesigned the way Government was (owner, with a screenshot of a person card's History):** "now I want you to go ahead and do that relatively similarly for this, for all screens in the menus. One thing I really don't like is text when it's just laid out like this... this is your character's history... I don't like that at all. And another thing I don't like is just the black or gray just background, like stuff sitting on it... redesign all the menu screens. The in-game menu screens. So they're not blocks of text anymore with random buttons. And that's one more thing I don't like, is just buttons sitting there but without a railing to sit on or something, and something to delineate that that's the one that's selected." The CTO builds it, one screen per PR, person card first, then each menu; it takes over `play-menus-fixed-panels`.
- **His three answers:** (1) the surface is the **framed plate** (a brass-framed panel the content sits on, never the bare background): "I would like an example of the first two textured material framed plates, but... You can do the rest of this with the frame plates cause I think that's the one I'm gonna like." So every menu uses framed plates, plus one screen built in a textured material for him to compare. (2) A history is a **vertical timeline** (a gold line with years and an icon card per event, paged by chapter of life). (3) Tabs and buttons sit on a **tab rail** (a recessed bar the buttons sit in, the selected one raised and lit and joined to what it shows).
- **"City council is, you know, whatever the equivalent is":** the player's first local race is the place's own lawmaking body under whatever name it has (council, trustees, aldermen, commissioners, selectboard, township board). `player-offices.json` gains the local equivalents so every one of the 56 places has a first race.
- **Unincorporated places (he said: "I don't even know how that works"; CTO ruling, overridable):** an unincorporated place has no town government; the county governs it directly (the engine already models this: `executive.ts` staffs no town government there, and county ordinances that cover unincorporated areas only skip cities, `laws-in-force.ts`). So a player living there runs for the **county board** as their "city council" and for the **county executive** where the county has one as their "mayor". Where a township is the local government, the township board is the council. One rule from data, all 56 places. The governing lead builds it in phase A.
- **Speed is a country's year, for hundreds of years (owner, about 6:35 PM Eastern):** "And no, not just a town's year. It has to be a country's year. Like, the entire country. Like, I want simulations to be able to go hundreds of years. You know, if someone wanted to keep up their save for 2 years, I would love them to be able to play the same save and have it still be, you know, speedy." The year that must run fast is the whole played world (the player's place in full, every other place, state and Washington at their own level, the national economy), not one town. Year 100 and year 300 of one save must run as fast as year 1: what the game keeps and scans may not grow with history (old records fold into summaries, the dead and the long-gone leave the daily indexes, memory and save size stay flat). The speed lead measures today's country year and a long run (years 1, 10, 50, 100 of one save), researches how long-running simulation games stay fast, and proposes the measured bar; until then the two-minute bar and the 20% rule stand, now measured on the country's year. Owner's earlier ruling that saves don't matter until early-access preparation still holds for the save format; staying fast over centuries is an engine property now.
- **A speed lead runs on ultracode** (owner: "I wouldn't mind starting a speed ultra code session... It would have to frequently refresh to get... new rulings, like... seating all 50 states and Congress... games have figured this out, and I've made lots of rulings about speed before"): `session_01S4WSHpRbBHKwtCjaf1meFB` (Opus), which merges main and rereads this file every hour and reads every earlier speed ruling before cutting anything.

## Oct 29, 22:40 UTC: CTO rulings on the world-governing plan (laws lead's questions; docs/reports/world-governing-plan-2026-10-29.md)

- **Speed (standing rule "Speed"; "Keep it simple", two-level population):** both limits hold for every change: a town's year stays under two minutes on `npm run speed:year`, and no change makes it more than 20% slower than its base on the same machine. Other states' and other towns' members sit as named officials on their term rows (the `official:<term>` form the Politics screens already read), filled in as full people only when the player meets or opens them, never 7,400 full people at the opening. Measure U1 alone first; cutting town-only loops that scan officials without changing behavior is welcome. Yes, take `laws-session-moves-too-many-questions` (real bill volume) as the ruled lever.
- **"Three other towns" in places with no other local government (D.C., the Virgin Islands, Guam, American Samoa, the Northern Marianas):** the test redraws those, naming why, and Hawaii's and Puerto Rico's county-level bodies sit as county boards, all from data (one rule, all 56 places).
- **`gov-federal-questions-admitted` folds into `gov-congress-passes-policy-laws`** (same test, stopgap and done-when); the twin is dropped with its Notes carried over.
- **Time boxes don't end good work while the owner is awake and usage holds:** the laws lead keeps going past 00:40 UTC on U1 and the C2 research, pushing its branches and writing Notes every hour so a handoff is always ready, and stops only if usage runs out or the owner says so.

## Oct 29, 22:15 UTC: CTO rulings: menu scrolling read exactly; four effects-web grades; the laws lead runs parallel workflows

- **Menu scrolling, read from the owner's own words (CTO, correcting the 22:10 entry's wording).** He said: "I don't want you to have to, like, just scroll infinitely... it shouldn't be like a HTML thing. The main menu shouldn't really be scrolling. It should be things inside." So the menu panel itself never scrolls as a page; a box inside it (a list, an agenda, a roster) may page with arrows or tabs or scroll within its own bounded box, and paging is preferred where a game would page. The lane's #6768 made whole sheet bodies scroll under the gold scroller; that is the page scrolling he does not want, so every menu moves to a fixed panel with bounded boxes inside (`play-menus-fixed-panels`, lane), Politics → Government first (#6832).
- **Effects-web grades (CTO, under "Estimate, never UNKNOWN" and "Research before building"; asked by the laws lead):** (1) a statistically insignificant result with a tight interval around zero is graded "about zero", with its source and interval; (2) library materials to reading has no study, so it is an ESTIMATED grade of about zero from the nearest research, citing it and its spread; (3) the Congress stock ban to members' returns is "not applicable" with one line naming the record the game lacks (no member portfolios), not a silent drop; (4) the two marriage-equality links are graded "cause cannot vary", because the law is national and no place differs.
- **The owner to the laws lead, in its session (relayed):** "You can work on multiple at the same time... you can run 2-3 workflows at a time, I assume. Unless there's not enough space." The laws lead runs finish-laws, the world's governing map and the two effects-web families that wait on nothing (grades; research sizes) side by side.

## Oct 29, 22:10 UTC: the CTO builds one real game menu; menus don't scroll; the Government screen's answers (owner, about 6:10 PM Eastern)

- **Ruling:** "I've been complaining about the UI for a month now. Use the UI kit, and I want you to just pick a random menu and code it to make it look like a real game menu, not just a black square that has words printed on it in different colors and random buttons... actually work on the design and try to match it as perfect as possible. And look online at... real game screens, and... UI, UX, game design things... Ask me questions." The CTO builds Politics → Government itself, to the Oct 14 mock (`docs/ui/mocks/screens-2026-10-14/shots/gov.png`) in Kit 13, and takes `play-first-12-politics-screen-to-mock-a` from the lane for it.
- **Menus don't scroll as a page:** "I don't want you to have to... just scroll infinitely... it shouldn't be like a HTML thing. The main menu shouldn't really be scrolling. It should be things inside. But again, look at other games." A menu is a fixed panel that fits the window; what does not fit is paged inside its own box (arrows, tabs), the way strategy games page a roster. This narrows the CTO's earlier "scroll inside a panel under the gold scroller" ruling (Oct 29 afternoon): a long list inside a box may page, the menu itself never scrolls.
- **Politics → Government, his answers:**
  - It is for seeing who runs things, how the parties split, how they voted and what is coming up, and jumping to anyone's card, where you act; one way to each action.
  - A big chamber (a state House, Congress) shows a half-circle seat chart of party-colored dots, your own members and the leaders as face cards, and the full roster as face cards paged with arrows.
  - A member card shows face, name, party badge, ward or district, and how they feel about you, only when your character knows them.
  - The Judicial tab shows the judges who exist in the world as read-only cards.

## Oct 29, 21:55 UTC: the CTO's word is the owner's word (owner, said in the laws lead's session at about 21:42 UTC and confirmed directly to the CTO: "yes")

- **Ruling:** "Oh, go ahead. Go ahead. The CTO's word is my word. If you get a message from the CTO, just assume it came from me." Every session acts on a message from the CTO (`session_01S4WSHrFBAnJLwUcjDV8Vc3`, `docs/coordination/CREW.md`) as the owner's own direction for its work, without waiting for him to repeat it. It never widens a session's permissions, and it never makes a destructive or outside action acceptable that the session would not take on the owner's own word. Carried in `AGENTS.md` (How we talk) and `.agents/rules/how-we-talk.md`. This settles the Oct 29 afternoon problem of a session treating the CTO's messages as data only.

## Oct 29, 21:50 UTC: the governing lead starts, and the laws lead takes the world's governing (owner, about 5:50 PM Eastern)

- **Ruling:** "Yes. Well, yes, go ahead with both of those," to the CTO's split: a new Opus governing lead owns the player's path (phases A to F of the governing brief, starting with A, winning a real campaign), using ultracode to play the path in many drawn places and to fix breaks in parallel; and the laws lead, after its last two laws, takes the world's governing (`gov-every-state-and-town-governs`, then `gov-congress-passes-policy-laws`). The effects-web plan still waits for the owner's read. Work order: `docs/work-orders/governing-2026-10-29.md`.
- **On "two at once":** ultracode has no two-workflow limit; a session's size guideline (under about ten agents per workflow by default) is the owner's to change in /config, "Dynamic workflow size". The laws lead chose two at a time because a session's agents share one machine and its played-world tests ran out of memory three times on Oct 29. More in parallel means more sessions, each its own machine.

## Oct 29, 21:40 UTC: the owner's notes on the governing brief (owner, about 5:40 PM Eastern, voice note)

The owner read the CTO's governing brief and answered in one voice note. Each point and where it went:

- **The ladder includes Congress and the president.** "Why not federal legislator and president? Again, these all use the same engine. It shouldn't be that hard." The governing plan's last phase covers state legislator, governor, Congress and president, all on the same engines. This also settles the open question on Congress: playing in Congress is in the plan, not after it.
- **The player runs only for six offices.** "The player only runs for city council, state legislator, mayor, governor, Congress, and president. That's it. The other stuff can be simulated... but no, not the player." Trustee, clerk and county seats keep running in the world. Pool `play-player-runs-only-six-offices` (lane).
- **Winning is a real campaign, not door knocking alone.** "Look at real races": an organization backing a challenger, a campaign gaining steam until the incumbent comes home to campaign, donor meetings, hosting a forum, meeting possible constituents, debates; "it's raising money and stuff like that that needs to be decided for A." Pool `campaign-like-real-races` (phase A; lead CTO until the governing lead starts).
- **Swearing in happens, as a scene, with a speech where the office gives one;** "the word session will handle that." Pool `words-swearing-in-scene-and-speech` (words).
- **People bringing it up (step 8 of the brief) is the words session's.** Sent to words.
- **The voting and bill screens need work and must be tied to the place;** "it's all about how this stuff is communicated through the English engine." Pool `play-vote-and-bill-screens-redesign` (lane, to the mocks).
- **The vote is not locked to 6 PM.** Every town body meets at one tunable evening hour today (`office-day-calendar.ts` line 100); each body's real day and hour come from data. Evidence added to `office-stopgap-office-day-calendar-calendar`.
- **The executive's budget is the player's.** "Your character sends the budget without you" (objecting). Evidence added to `office-the-budget-season`; the budget is a desk stop by default.
- **Laws work federally, and every state and town governs.** "No, laws need to work federally. Other states and towns never sit. No, all 50 states need to." This restates the Sept 26 ruling (all 50 legislatures seated from day one, REG:276-284) that the build never met. Pools `gov-congress-passes-policy-laws` and `gov-every-state-and-town-governs` (laws lead).
- **Quorum is not a mechanic.** "It should always make quorum... relatively irrelevant, aside from maybe some dialogue every now and then." Meetings always make quorum; the CTO's proposed quorum rule is withdrawn.
- **Everything between a law passing and a person feeling it is in scope** ("I assume everything in between needs to also be done as well").
- **Parse every voice note for every session.** "When I make these voice notes, I say stuff that could apply to a lot of different sessions. Be sure you're parsing everything I say." The CTO splits each note into its points and routes each to its owner the same hour.
- **On counts:** the brief's "45 of 59 law types" was a count of one dispatcher's policy questions, not laws; the laws matrix is the measure (87 of 89 laws reach people on main, laws lead, Oct 29). The brief is corrected.

## Oct 29, 21:15 UTC: governing interview, first answers (owner, about 5:15 PM Eastern)

The CTO's governing brief (artifact "Our Civic Duty Governing Brief", Oct 29) put nine questions the rulings did not answer. Answers so far:

- **A "yes" at the door is near-binding.** The owner chose near-binding over a promise kept or broken freely. A resident who tells the player "You've got my vote" votes for the player unless something heavy changes their mind (a scandal they learned of, a rival they are close to, a broken promise of the player's own), each read from records, never a roll (no dice). Today the vote reads a door visit only as recognition (`voting.ts` 929, 1041), which is why no New Game life has won a race.
- **Before a vote you see what colleagues told you plus your aide's estimate, marked as an estimate that can be wrong.** No exact count. This follows the rule that stakes are learned only through routes the character could use (REG:284).
- **What stops you in office: your own bills, any vote where yours could decide it, your desk, and scenes, by default; you can customize it.** And office life is fuller than votes: "maybe you'll have a meeting with somebody... you look at your calendar and you have a bunch of stuff booked like you have a meeting with this person and then... an executive board... or maybe your meeting with the lobbyist... I read about how... Teddy Kennedy would meet with experts on one thing every night and eat dinner and then the next night he would get a whole different group of experts... until he was an expert. You know there's a lot more that goes on... giving speeches, giving talks... showing up places like... strikes and stuff." The officeholder's calendar fills from the simulation and the story: booked meetings with named people, boards, lobbyists, expert dinners that teach a subject, speeches, talks and appearances at events (strikes, openings, protests), each a stop the player can set to play or let happen.
- **Learning the job: a mix of short scenes and a real orientation** (owner: "it's a mix of short scenes in a real orientation. I've said this before."). The Sept 22 ask stands: real orientation programs for new members (local samples from every state, state and federal programs) are distilled for him and he picks what goes in (`docs/research/OPEN-QUESTIONS.md` 32-33, `new-member-transition-and-orientation`, only partly answered). The CTO missed that it was already answered in spirit; the research is now a pool item so it reaches him.
- **Co-sponsors: yes, as a promise, and promises can be vague and can be broken** (owner: "yes, as a promise but... you can also give vague promises as well and go back on promises"). A co-sponsor's name is on the bill and on their record; anyone, the player included, can promise loosely ("I'll look at it") or firmly, and can go back on it, with the person they promised remembering it.
- **The governing lead does not start yet** (owner: "Not yet"). The effects-web reorder waits until he has read the laws lead's plan.
- Still open: what "the town visibly changes" shows before the real screens, being appointed, Congress in early access.

## Oct 29, 19:35 UTC: five checkers run the gate so builders only build (owner, about 3:35 PM Eastern)

- **Ruling:** "Start 5 new Sonnet sessions that are explicitly like type check or doing like the prep work for the mergers after coding. So that way the builders can strictly build... if they have helpers, type check apparently takes a long time... I wouldn't mind offloading those." And: "message every session so that they know, and find some way to... divide things or queue things up."
- **How it works:** five Sonnet checker sessions (`CREW.md`); checker _k_ takes PRs whose number mod 5 is _k_. A builder and its helpers run only the tests they wrote or changed, never typecheck, the guards or the gate; they open the PR ready and message their checker. The checker is the branch's one writer from then until merge: it merges main in, runs the local gate with fresh draws, fixes what is mechanical (formatting, lint, declarations, paperwork, an obvious local type error), sends anything else back to the builder, and posts `Checker <k>: gate passed on head <sha>`. The mergers do not rerun a passed gate on the same head; they review and merge. Skill `checker`; `AGENTS.md` (Process), `session-start`, `merger`, `play-first` and `lead-session` updated.

## Oct 29, 19:20 UTC: people pack v4's look is approved; it goes into main and the build (owner, about 3:20 PM Eastern)

- **Ruling:** "No, I've already approved the general look of V4. I'd like that to go in too." The owner's visual check on `people-pack-v4` is given for the general look; the PR is no longer held. It merges like any PR once its checks are green and a merger has checked it (not its author), and the Mac build waits for it. Later visual changes to single figures are ordinary fixes, not a new hold. Replaces the hold in `MERGE-FIRST.md` line 5 and in the 19:00 entry below.

## Oct 29, 19:10 UTC: everyday clothes and work clothes are chosen apart (owner, directly to the people session; relayed to the CTO)

- **Ruling:** "The creator mixes like formal clothes, like with a suit and tie, with regular clothes. There needs to be two separate ones. So that way also, like, the president doesn't render in normal clothes. They render in their, you know, quote-unquote work clothes." The character creator picks everyday clothes (with colors) and work clothes separately and shows both portraits. Officials at government places, and anyone at their own workplace, are drawn in work clothes only; elsewhere in everyday clothes. Built in `people-pack-v4`.
- **CTO ruling on the open fallback (standing rule: the simulation decides who is present, and a view never drops a record):** where a person is in the scene's cast but the pack has no everyday figure in that room's pose (the slim woman on a couch at home), they are drawn in work clothes rather than left out, as a registered stopgap in v4 that names the figure to draw. The owner can overrule it in one line.

## Oct 29, 19:00 UTC: everything finished goes into main and a fresh Mac build; nobody stops (owner, about 3:00 PM Eastern)

- **Ruling:** "I want to get everything into main and play an up-to-date playtest... and update the Mac build so I can go ahead and install it... I think I'm on like 0.64.0." Then: "But, you know, I want them to keep working. I just want to play up to date." Every session pushes and opens PRs for what is already finished and keeps working; the mergers merge every green PR on `MERGE-FIRST.md`; the CTO starts the Release package workflow from main at about 19:45 UTC, and again whenever the owner asks for a build. Not a freeze. (People pack v4: approved at 19:20 UTC, above.)

## Oct 29, 18:45 UTC: every portrait is a standing figure (owner, directly to the people session; relayed to the CTO)

- **Ruling:** "people shouldn't be sitting in their image creator. They should all be standing, or in the character creator, or in their like profile or whatever." Every portrait (the character creator, person cards, faces in menus, the title bust) uses a standing figure holding nothing. A look the pack paints only seated is not offered in the creator until a standing figure of it is drawn; it still appears in rooms at sitting spots. Built in `people-pack-v4` (session_01S4WSHrjSXRBi1MtqEkbXWF).
- **Also found there:** the President's look came from the term id, so every world drew the same build; looks are now seeded by the world seed plus the person's appearance seed. The medium man has no standing figure yet, so where he is President he cannot stand behind the desk; v4 records that as a gap to draw.

## Oct 29, 18:55 UTC: v4 replaces v3; the owner looks at v4 only (owner, about 2:50 PM Eastern)

- **Ruling:** "I can ignore V3 because V4 changes how, like, it's, we have to regenerate things because there's going to be some standardized angles for people to slot into instead of a bunch of different ones for every room." #6778 (v3) is closed unmerged; `people-pack-v3` is dropped as superseded; the v4 PR carries v3's code (the one loader, mannequin staging, face crops, the creator, the v1 and v2 deletions) to main with the v4 people, and waits for the owner's look. The v3 art asks (the heavy man's address figures, recut fronts) are moot: v4 regenerates the people at the standard angles. `play-faces-show-the-moment-a-menu-opens` now waits on `people-pack-v4`.

## Oct 29, 18:50 UTC: where an office holder stands comes from the occasion, not the office (owner, about 2:45 PM Eastern)

- **Ruling:** "the president shouldn't be hard coded to be sitting. That's just for certain occasions. But he could, of course, be in different parts of the room. But yes, sitting is the idea right now." No rule ties an office holder to one spot or posture. The scene's occasion, sent by the director with the cast, picks the kind of spot (the desk seat for the address; standing or elsewhere in the room for other occasions); until an occasion is sent, the default is the seated spot, kept in data. Words and the people session agree the occasion field before either builds it (CREW.md seam). Carried on `people-pack-v4`.
- **Also recorded:** skills-only PRs merge at once, and the AGENTS.md skills list is one skill per line so two new skills never conflict (owner, 18:45 UTC: "they change like one or two files... how are they going to conflict with anything?").

## Oct 29, 18:35 UTC: skill PRs merge without waiting on CI (owner, about 2:30 PM Eastern)

- **Ruling:** "You shouldn't need to wait for checks to pass on new skills." A skills-only PR (skill files, their `.claude/skills` mirror, the AGENTS.md Skills list line, an `impact: none` declaration, dev-only scripts) is merged by the CTO as soon as it arrives: merge main in, run the skill test locally for the mirror and the list, merge. Carried in `AGENTS.md` (Skills) and the `cto` skill. First applied to #6785.

## Oct 29, 18:25 UTC: helpers never copy the whole repository (owner, about 2:15 PM Eastern, in the laws session; relayed by the laws lead)

- **Ruling:** "be sure the subagents, even if they clone the entire repository, they shouldn't. They should immediately delete what they don't need, or even more helpfully, only clone what they do need." And: "This needs to be a project rule... I'm talking about the thing with the sub-agents." A helper or sub-agent works in a sparse copy holding only the folders its task needs (by default everything except `art/`, `public/`, `desktop/` and the large docs folders), shares the main checkout's git objects, and links `node_modules` instead of installing it; a session that finds a full helper copy narrows it at once. Why: a full copy is about 3.3 GB (art alone 1.6 GB); six helper copies filled the laws session's roughly 40 GB allowance at 18:00 UTC and writes failed until the lead narrowed them to 1.2 GB each. Carried in `AGENTS.md` (Models, effort and helpers) and the laws lead's `helper-checkout` skill.

## Oct 29, 18:20 UTC: every session makes and updates skills (owner, about 2:15 PM Eastern)

- **Ruling:** "Make sure every session knows that it can proactively create skills and update the skills that they use if they find stuff, or they can ask if it's a, you know, that kind of thing. I want skills to be made." Every session adds a line to the skill that should have told it what it just learned (a trap, a fix that worked, a method used twice, a check that caught a defect) or creates a new skill when none covers it, in the same pass, mirrored to `.claude/skills/`, named in AGENTS.md's Skills list, with `test:skill-ops` passing and an `impact: none` declaration. It ships inside the work PR or as its own `skills:` PR the CTO merges. A skill line records a ruling, a standing rule or a working method and never makes policy; when unsure, the session asks the CTO. Carried in `AGENTS.md` (Skills) and the `skill-lessons` skill. Extends the Oct 27 rulings that skills learn from errors and from what works. The owner added: "it can be a project skill... deleting helper's entire cloned repositories and only keeping what's needed. So that way they have plenty of gigabytes to work with. I told it to make a skill for that. So it can be meta like that, or it can be... anything in game as well."

## Oct 29, 17:40 UTC: side stories on the paper (owner, directly to his words session, about 1:30 PM Eastern; that session asked the CTO who owns the two pieces outside its area)

- **Ask:** short filler "side stories" on the newspaper, for realism: a fourth car stolen when crime is up, someone opening a business, a local child winning a spelling bee, three Division I recruits on the high school team. Briefs of a line or two, maybe a picture, not clickable.
- **Who builds it (CTO):** the words session owns the press desk's brief selection (`src/core2/modules/press.ts`) while no other session holds the news engine. The one desk prints briefs from records it already sees (crime, businesses founded or closed, graduation and test results), chosen by cause (the outlet's space, the record's reach in town, recency), never a roll. School and sports achievements (a spelling-bee win, college recruits) are a record in the school engine from the student's own traits, grades and the school's records, built by the words session's helper after agreeing files and record shapes with the laws lead, whose helper is in the school engine on `school-college-step-record`. The lane lays briefs out as headline plus one line with no click-through. Briefs are sized to what a town's records hold, never padded.

## Oct 29, 17:15 UTC: mannequin-plate front masks draw only real furniture (acting CTO ruling; the owner may overrule at his visual check of `people-pack-v3`)

- **Ruling:** a plate spot keeps its `front` mask only where the mask is furniture in front of the person (a couch arm, a desk, a podium) and the screenshot shows it covering furniture alone. A mask cut to the mannequin's own outline (the colonnade walkway, home front-0's crossed-leg shin, the Oval briefing leg) is dropped from the plate JSON until the owner's art session recuts it as furniture-only, then drops back in as data. Answered by the standing rule that figures are framed whole (`play-stop-38`: no head cut off, nobody drawn through anyone). The address figures' `hands` rows are measured from their own pixels by a rerunnable script in the same PR. Read: OWNER-DECISIONS (Oct 27 people in rooms, Oct 28 visual-check rule, Oct 29), LAW section 2; searched: front mask, mannequin plate, framed whole.

## Oct 29, 17:20 UTC: sessions whose work meets talk to each other, so nothing is built twice (owner, about 1:15 PM Eastern)

- **Ruling:** "be sure that the sessions communicate with each other. I'm specifically thinking... the news writing stories using the words... something else coordinating because words needs a section someplace... Like laws." And: "I say this to make sure that systems aren't duplicated or anything like that again. I want to try to get this correct now." Where two sessions' work meets, they message each other directly and settle it; before building a record, reader, bank, screen part or helper in another session's area, a session asks that session whether it exists. Questions for the owner still go to the CTO. The roster, the session ids and the seams (words and the lane on the newspaper and labels; words and laws on laws people hear about; words and people v3 on who is in a scene; people v3 and the lane in `src/bench`; red main and each engine's owner; mergers and authors) are `docs/coordination/CREW.md`, which the CTO keeps current. Narrows the 16:45 line "sessions do not message one another". Carried in `AGENTS.md`, `.agents/rules/how-we-talk.md` and the cto, lead-session, merger, play-first and words-engine skills.

## Oct 29, 16:55 UTC: the laws lead gets six helpers (owner, about 12:50 PM Eastern)

- **Ruling:** "it can use up to like 5 or 6 sub agents. I would say 2 Opus sessions and up to 4 Sonnet sessions, just because laws are so close to being done. I just want them to hurry up and be done." The laws lead (`wire-law-links-to-people`) may run up to six helpers at once, at most two on Opus and at most four on Sonnet, each on one background record or family in its own worktree, with the lead reviewing every diff. This overrides the "at most two Sonnet helpers" line of the `lead-session` skill and the Oct 28 family-batch ruling for the laws line only, until its matrices are finished.

## Oct 29, 16:45 UTC: the CTO coordinates by message; idle sessions archived (owner, about 12:40 PM Eastern)

- **Messages to and from the CTO (owner: "you're also your CTO and coordinator. So I know there's a rule where you can't message each other, but that was just for the other account because it kept asking me permission to message every time. I'm not getting that with you. So you can message all the sessions, et cetera, and they can message you with questions for me and all that. And I'll just come back to this one").** On the second account the CTO messages any session, and every session messages the CTO with questions for the owner, blockers and decisions; the CTO answers or relays, and the owner comes back to the CTO's session. Sessions do not message one another. The files stay the record: the channel, MERGE-FIRST, PROGRESS, PR bodies and comments, and pool Notes. Supersedes the Oct 28 05:00 UTC ban, which was about the first account's permission prompts. Carried in `AGENTS.md` ("How we talk"), `.agents/rules/how-we-talk.md` and the cto, lead-session, merger, play-first and words-engine skills.
- **Idle sessions archived (owner: "go ahead and archive all like non-use sessions... if they're not from today, you can archive them").** 19 sessions on the second account were archived on Oct 29, 16:40 UTC. They included the Oct 19 to 28 pool, lead, helper, fixer and researcher sessions, the Oct 24 playtest session, and the stopped "Words engine narrative/English merge sequence". Kept: the CTO, the six crew sessions started today, and the owner's "Political Game words orders".

## Oct 29, 16:30 UTC: the second account's first sitting with the new CTO (owner, about 12:10 PM Eastern, after playing v0.64.0)

- **The CTO on the second account** is the session "CTO handoff documentation"; it started from `CTO-HANDOFF-2026-10-29.md`.
- **Early access is not the CTO's subject (owner: "stop asking about early access. It literally doesn't matter for you").** The CTO never raises early access, its date or readiness for it in a report or a question. Nothing is planned against the roadmap's Oct 30 line.
- **The crew, smaller for now (owner: "I approve the smaller crew for now").** Supersedes the Oct 26 counts (five or six mergers, one or two fixers) while it holds:
  - **Words, scenes and the director:** the owner's own session "Political Game words orders" (owner: "That's what the one I want to take the scene/director/words"). It owns `words-director-one-path`, `src/director`, `src/english` and `data/english`; no other session claims words or director items. Lane PRs may still touch those files with `Review: words`.
  - **People:** one Opus session on `people-pack-v3`, from the brief the owner's art session wrote (owner, via that session: "i want the v2 figures removed completely and these put in the game... make it to where these can be updated very easily"). Its PR merges only after the owner looks (Oct 28 visual-check rule).
  - **Two Sonnet mergers** (even and odd PR numbers), **one Sonnet fixer** on red main (`release-main-red-standing`), **the laws lead** (Opus, two Sonnet helpers) on the five background records, **one Sonnet lane session** on the four points below, and the CTO.
- **Stale pull requests are closed (owner: "You can close pull requests that aren't relevant anymore").** Standing approval: the CTO closes any open PR that main already carries or a merged change superseded, that the Oct 27 look-first audit marked close, or that is a draft with no push in five days. Each closed PR's item goes back to open with a Notes line naming the branch, so nothing built is lost.
- **Paperwork current (owner: "I would like you to update all the GitHub and paperwork stuff").** The merge order, the lane order, the pool's stale claims and in-pr items, and the channel are brought current by the CTO.
- **Steam is the owner's, not the CTO's (owner, about 12:40 PM Eastern: "stop worrying about Steam. That's nothing for you to do. Just remove everything about it... I'll tell you when Steam is ready... you have nothing to do with it").** No session plans, prepares, asks about or reports on Steam, the store page or its assets until the owner says Steam is ready. `release-m7-06-steam` stays as it was (blocked, priority 3).
- **Playtests are the owner's (owner: "I'll do the playtest, but I did enough now").** No cloud playtest unless he asks.
- **From his play of v0.64.0:**
  - Continue and Back: "I said continue and back, needs to be removed from every single menu" (third time; Oct 28 sitting point 22). Item `play-menus-no-continue-back`.
  - News: "when you click continue and back, it's like headlines and then a little bit of story. Nothing is actually on the paper." Item `play-news-paper-prints-the-stories` (the screen side); the words side stays on `words-printed-stories-have-a-body`.
  - Faces: "It shouldn't take 5 seconds after you open a menu for it to load. It should be there instantly." Item `play-faces-show-the-moment-a-menu-opens`, after `people-pack-v3`.
  - Profiles: "nobody has any record. I still don't see anybody's history being simulated when you open their profiles." Item `play-person-history-for-everyone-you-open`; `screens-person-history` merged Oct 28 shows history only to family and ties, from facts drawn at the start.

## Oct 29, 16:30 UTC: one standard for backgrounds and people (owner, noon Eastern, four inline answers)

- **Every pose at five angles, used throughout the game:** front, three-quarter left and right, back three-quarter left and right. No profiles, no flat back views, never mirrored. Owner: "5 angles per pose and have those 5 angles be able to be used throughout the game. So that way it can be standardized mannequins can make a lot more sense."
- **Backgrounds are regenerated from the start in one camera standard:** two shots per place (wide and medium), the same eye-level camera height and horizon line everywhere, so a person at a given floor depth is the same size in every room.
- **Mannequins first:** each background is painted with green mannequins at standard spots and angles, then edited to remove them; the empty room and its mannequin plate line up exactly.
- **First batch:** the golden path rooms in order, their region and town-size versions, and every person redrawn at the five angles (with the six second faces) as people pack v4. Everything else follows in the same standard.

## Oct 29, 02:35 UTC: the opening, the President's speech, the people poses and location variance (owner, 10:30 PM Eastern, four inline answers)

- **The opening is the montage with the key people inside it.** The address plays like a broadcast; the cutaways alternate the President working (the colonnade, the Oval Office window, writing at the Resolute desk) with America (people along a route, people pausing where they are). When the speech's subject turns to them, the Vice President, Congress and the player's governor with a few state legislators appear, each named by office as the camera passes. It ends at home with the partner's "Did you see the President's speech?". This joins the Oct 14 sequence (OD:301) and the Oct 28 montage (WANTED cto-28, cto-29); neither is dropped.
- **Which speech:** the inaugural on Inauguration Day, the State of the Union in its season, and otherwise a televised address to the nation from the Resolute desk in the Oval Office. Replaces the rule that every non-inaugural opening is a State of the Union.
- **People for these scenes:** the last Scenario credits (they expire Oct 30) buy one more ten-pose sheet per person in the people kit, split into parts like the rally kit: seated at a desk writing, on a couch, at a counter, walking, waving, on the phone, at a lectern, watching TV. Suits, ties, blouses and dresses are drawn whole by Firefly. The kit and the checks are `art/people-rooms/scenario-kit/rally-build/` on `claude/people-rooms-art` and the CTO's `people-art-checks` skill.
- **Golden-path pictures vary by region and by town size, and each has several versions.** Owner, verbatim: "I don't just wanna keep seeing the same pictures. You know what I mean like a bunch of different officers and like seriously just look at your real life examples of big and small counties and stuff that kind of thing same thing with neighborhoods not everything's always perfect you know real neighborhoods just make things look realistic." Town halls and clerk counters, polling places, election-night halls, doorsteps, council chambers and neighborhoods are painted from real big and small places, worn as well as nice; a town keeps the version it was given.

## Oct 29, 15:45 UTC: the CTO's role moves to the owner's second account (owner, 9:45 AM Eastern)

- **Ruling:** "I am going to switch most of this stuff to my other account, aka all the Claude sessions... take inventory, stop the current cloud sessions, update all skills, and make a CTO handoff." The handoff is `docs/coordination/CTO-HANDOFF-2026-10-29.md`. Every cloud session on the first account was stopped with a stop order (push, item back to open with a Notes line, final block); its scheduled tasks are disabled. The next CTO starts on the second account from the handoff file, the channel and this log.
- **Also this morning:** the six laws' missing records are background simulations (13:30 UTC); 28 merged items flipped to done by the CTO after the flip job's fix (#6682) merged; four sessions that sat on permission prompts were interrupted and told never to use scheduling tools or edit `.git`.

## Oct 29, 13:30 UTC: the six laws' missing records are background simulations (owner, 9:25 AM Eastern)

- **Ruling:** "I'm fine doing those research things. They shouldn't take that long. Just go ahead and make them like a background process. That's one of those things that the player doesn't really need to see, but it needs to be simulated for laws and stuff like that." The records a law's researched outcome needs are built from research as background simulation, calibrated not hardcoded, never shown to the player as a step: medical bills and medical debt (Medicaid expansion), youth substance use (cannabis sales), small-dollar lenders (the consumer loan cap; `world-small-dollar-lenders`, approved Oct 24, stands), the college step after high school (higher education into completion), and the two with no study (natural resources, social media age checks) estimated from the nearest research with a spread, marked as estimates. This is the Oct 24 "simulate it, don't ask" rule applied; the Oct 28 "no new mechanic" rule means wire through the engine that owns each record (health, people, the economy's lenders, the school engine), not a new system beside it.
- **Lead:** laws, on `wire-law-links-to-people`, family batches, one PR per record kind with one drawn-place proof.

## Oct 28, 20:20 UTC: family batches on every wire line (owner, 4:15 PM Eastern, "go ahead and do family batches for the links reaching people and traits, etc.")

- **Ruling:** every wire line ships by family from now: the links reaching people (laws), the traits decisions, the office statistics, the director's producers, the screens' points, grouped by the engine or menu that owns them. One PR per family, one drawn-place proof per family naming the record ids, matrices regenerated once per family PR. Two Sonnet helpers per lead, each on one family in its own worktree; the lead reviews every diff. The per-unit rule of Oct 27 stays for a finished scene, screen or law that stands alone; it no longer applies to matrix lines.
- **Why:** one law per PR with a full proof each ran at about one an hour, and every PR rebased against the others on the stopgap register and the parameter table. The stopgap register is being split into per-family files to end those collisions.

## Oct 28, 18:15 UTC: the words and director plan approved (owner, 2:10 PM Eastern, "All the six are right")

- **Ruling:** the plan at `docs/reports/words-director-plan-2026-10-28.md` is approved whole. Scene depth stays. Filing is petition, signatures, the clerk's check, then the ballot (this reverses "Filing: no fee or petition mechanic"). The narrator shows first, Continue, then the person talks (this replaces the Oct 27 "at once"). The batch-grading apparatus is deleted; one grade file, the reach table and the in-play grade control remain. The ungraded Oct 15 lines keep playing until a grade or a pattern ban removes them. One Opus session owns the director and the English engine together, with two Sonnet helpers.
- **Signatures (owner's words):** "signatures should happen somewhat naturally, but I would like there to be some scenes where you earn people's signatures. Or maybe signatures is the game's way of introducing you to campaigning." The count fills as the candidate campaigns; some signature scenes exist; the elections engine keeps the petition record, the words session the scenes.
- **Cadence (owner):** "start getting this merged so every time the Mac client updates, the dialogue and scenes are just a little bit better. Every time. Or maybe a lot better." The first PR is big: every verbatim voice note applied at once ("you can already get most of the way there with the voice notes").
- **Items:** `words-director-one-path` (lead words) and `play-screens-sitting-oct28` (lead play-first). The elections session carries the filing rules and the petition record on its item.

## Oct 28, 14:50 UTC: history runs from the player's birth year (owner, 10:50 AM Eastern, "Yes, simulate to the birth year. Remember, it doesn't have to be any kind of depth. It's just got to be general to make the game flow.")

- **Ruling:** the one history (engine map line 7) starts at the player's birth year, not in 2000. A 35-year-old's childhood, schooling, moves and household are run by the same engines at a coarse step (a year, not a day), general, with no depth: where the family lived and moved, who was in the household, school attended, first jobs. Enough that the opening, the Journal, the person card and the director have records to read; nothing more. The pre-start window parameter moves from a fixed year to "the player's birth year" for every drawn place.
- **Also:** every wire line whose time box ended restarts on the same item, with no time box (owner: "whatever else didn't finish its time box, start those too"). Restarted 10:30 to 10:55 AM: elections, office and budgets, laws, opening and home, and the old engine's port-and-delete (the carcass's last 881 files).

## Oct 28, 14:40 UTC: every red on main has one owner (owner, 10:40 AM Eastern, "fix the red items on main. Why does nobody own it? ... why are you letting stuff slip through the cracks?")

- **Ruling:** a red on main is never "not this item's". It has one owner at every hour: the merger whose merge turned it red, for the first hour, then the standing red-main session (channel section `## Red main`), which fixes every red at the root on its own PR and posts each red, its cause and its PR every two hours. Wire sessions whose engine holds the red take it first; after an hour without a PR the red-main session takes it.
- **Cause of the gap:** the merger skill read only the Release workflow's run on main. Deterministic validation and M0 guards carried the reds (`realistic-not-real`, `world-legislating`, `health.traits`, `scene-talk`, `law-reached-scenes`, the English guard), and Release stayed green, so no merger saw them, and the wire sessions each listed the reds in their blocks as someone else's. The skill now reads every workflow and names the owner; MERGE-FIRST line 0 carries the rule.
- **Also restarted on his word (10:30 AM):** the elections, office-and-budgets and laws wire sessions, on the same pool items, with no time box. The CTO's mistake was reading "only mergers are running now" as a choice and waiting instead of restarting them.

## Oct 28, 05:30 UTC: the overnight plan (owner, 1:20 AM Eastern, "go ahead, I approve... standing approval for whatever you need")

- **Order:** trim first (every duplicate deleted from the engine map's lines and the duplicates report), the carcass audit in parallel (everything neither engine, view nor guard listed with proof, handed to the trim), then wiring through the one engine per mechanic: five sessions (opening and home with history; people and the director; every screen from the kit; one election engine and the campaign; office, budgets and justice with the copied statistics drawn per world) plus the law links to named people. Items: wire-opening-and-home, wire-people-and-director, wire-screens-from-the-kit, wire-elections-and-campaigns, wire-office-budgets-justice, wire-law-links-to-people, carcass-audit-everything-not-engine-view-or-guard, trim-main-every-duplicate-deleted.
- **"Wired" (owner's words, confirmed):** the simulation is the one layer; every engine (personality, speech, the director, laws, campaigns, elections, the economy, money, people's opinion of you, all of them) reads the same history and records; the golden path is only the player's view of it; realistic not real, so one save's history may be a boom and another's fifty bad years.
- **No holds:** mergers merge every green PR all night; a golden-path red that reproduces on clean main does not block; anything unsure is a registered stopgap and a line in the morning report, never a question that waits.
- **Branch protection is on** (validate and golden-path required; set by the owner's local session). Art intake is written tonight as open PRs with proof sheets (the same scene with different people, poses, outfits, hair, faces and rooms) and merged only when the owner looks and says yes (owner, 1:40 AM: "a few steps away from ready to merge, but I want all the work to still be done... it just won't be fully attached until I give the visual okay"); mergers do not merge a PR marked OWNER VISUAL CHECK. The local session keeps pushing art and writes docs/art/HANDOFF.md for a cloud session to finish its work.
- **Mergers fix with sub-agents (owner, 1:50 AM: "the mergers can use sub-agents as fixers. I'll say 3 Sonnet sub-fixers each").** No fixer sessions tonight; a merger hands a send-back to one of up to three Sonnet sub-fixers, re-gates and merges.
- **The 10 AM Eastern build:** the watcher dispatches it at 9:30 and writes docs/reports/morning-2026-10-28.md at 9:45 with the furthest step a player reaches, in words.

## Oct 28, 05:00 UTC: no session messages; GitHub and Drive only (owner, 1:30 AM Eastern)

- **Sessions communicate through GitHub or Drive, never by message (owner: "tell every session to communicate via GitHub or Drive and not try to send messages because it doesn't work, and then work gets dropped").** Messages between sessions are refused or lost; the channel, MERGE-FIRST, PROGRESS, PR bodies and comments, and pool Notes carry everything. The Oct 27 "messaging opened" line is withdrawn.
- **Guards first (owner: "That's what I want. Guards first").** No builder starts until the guards are on main and the owner has seen what they turn red; he decides the builders from that list.

## Oct 28, 04:00 UTC: the map first (owner, 12:30 AM Eastern)

- **The simulation is the one layer; everything else is a view of its records (owner, 12:45 AM Eastern: "All this stuff happens in the engines and the simulation, which is the overall layer. It's just different ways of displaying the same information... That's how literally every single game works. Make my game like how every other game works").** Screens, scenes, the Journal, News and speeches read the records; none computes or stores its own version of a fact. In AGENTS.md's first bullet.
- **Every building session is stopped until the engine map is read (owner: "give me the map first"; "I will decide on these sessions... these are not questions you ask me until we even know the scope of the problem").** One read-only session writes docs/reports/engine-map-2026-10-28.md: every engine, its readers, its duplicates, what reaches each screen, every writer and reader of the past, every hard-coded number; no code changes. The owner decides the sessions from it.
- **A new mechanic is forbidden; a missing piece is a stopgap and a question (owner: "Yes, a stopgap. Because I've been proven right literally every single time this comes up. It's in the code. Whatever you need, it's in the code").**
- **Every piece of UI comes from the UI kit, nothing invented (owner: "The 20 play sheets, those all need to be from the UI kit. Every single piece of UI, not just the menu, needs to come from the UI kit. Every single piece, nothing invented").**
- **Realistic, not real, for the whole world (owner: "no hard-coded percentages or situations in the world, just by the simulation, just like RimWorld, every world is different, every tile is different every single time").**
- **One history (owner: "history's exactly like I said, it's going through a different system. There needs to be one. Everything needs to pull from the same history").**
- **The mergers keep merging what is green; nothing else runs.**

## Oct 28, 03:15 UTC: build the playable game, nothing hidden (owner, 11 PM Eastern Oct 27)

- **Take out the depth and build the playable path (owner: "Take out all the depth. Literally just build it. I'm sick of the depth. I just want to play my game"; "I want everything merged, and I just want the game to work").** One session plays the golden path on main and fixes each stop, minimum viable; every open PR merges the hour it is green; the drafts close.
- **Every cut corner is a registered stopgap in the existing register, never a new system (owner: "anytime a corner is cut or compromises is made, make sure that it's duly noted, flagged, everything. Using the same thing that everything else uses, not making up a new system").** No hard-coded numbers: cutting research means keeping the existing table value, not typing one.
- **Every system is already built; use it (owner: "literally every single system in the game has been built. Use it. For every single item that is in the pool, the system is built. I guarantee it").** A new mechanic is a last resort and is flagged as a stopgap naming the engine the builder could not find.

## Oct 28, 02:00 UTC: one UI package (owner, 9:55 PM Eastern Oct 27)

- **One engine per mechanic, for the whole game (owner, 10:10 PM Eastern Oct 27: "There's one election engine. They all work the same, except some of them are assigned different things because they're state or a congressional thing. You shouldn't need a million different election levers"; and: "don't just take election specifically. The game generally").** Every mechanic has one engine; levels, offices, bodies, places and laws are rows it reads. The duplicates session inventories every family at once and collapses each to one; AGENTS.md carries the rule.
- **One UI package: a few menu types, one renderer each, every screen a definition (owner: "Why are there so many individual UI elements? There needs to be one for every menu, and then a menu type, and then just insert it... How hard is it to just put in one UI package that I can update? It should not take 7 hours to change the menus when everything's already been designed"; and on Budgets: "It should not just be words on this blank background").** No screen draws itself; a screen is data (its type, sections, labels, readers) and the type's renderer draws it; changing a type changes every menu of that type. The screens designer builds it, Budgets and Jobs first; a lint fails any screen outside the package.
- **UI is not done until the owner's build shows it:** eleven screens merged Oct 27 after v0.59.0 packaged, so he saw none of them; the CTO dispatches a build after every batch of screen merges rather than waiting for the two-hour cron.

## Oct 28, 01:00 UTC: the People screen (owner, 9 PM Eastern Oct 27, with a screenshot of v0.59.0)

- **The people map is the earlier one he liked, restored, not redesigned (owner: "There was a people map that had already been made that I had already really liked. There's no reason to try to reinvent it. It had different colors for different people").** Colors per kind of person; visible lines.
- **No Family tab; family is a filter (owner: "there shouldn't be a separate family tab. When you can sort by family... The family tab, it's just people in a location. That's not needed").**
- **No box around anyone (owner: "no black box around my guy or anyone else. It should be either a headshot or the people cut out").**
- **Click a person to View person, and that is where their history shows (owner: "You should be able to click on people and then view that person, and then that's where you see that stuff. But again, it doesn't have any history").**
- **The bottom-left card is the date and time, not a second picture of the player (owner: "I'd rather have the date and time down there versus another picture for me"); the bust crop cut through the face ("looks like my guy is missing an eye").**
- **"Everything is stuck at midnight"** (third time today): the clock fix (#6397) outranks every other item until it is on main.

## Oct 28, 00:15 UTC: after the audit

- **Sessions message the CTO and their paired sessions; the files stay the record (CTO, Oct 28, from the audit's note that AGENTS.md still said sessions never message).** The owner opened messaging on the scene line Oct 27 ("message back and forth") and every session has messaged the CTO since; the rule now says so. A message never replaces a channel block, a PR comment or a pool Notes line.
- **The game is populated from one art-wanted list (owner, Oct 28, 12:40 AM Eastern: "start a list/tally of scenes it needs generated along with suggested tags, situation, etc. so my local Opus session can generate them... tying in the research on choosing random people, looking at their lives... multi-purpose use things... more bad apartments... not everything is always super neat... more variants... let's start populating the game").** `docs/art/WANTED.md`: the director engineer owns it, the words lead, the finisher and the people-in-rooms builder append; rows come from the scene web, the scenes-from-life episodes, the realistic-lives trace and the sittings; multi-purpose pictures and variants (condition, time, weather, occupancy, region) rank first; the owner's local Opus session generates top down and marks rows generated; the builder puts them in the game and strikes them.
- **Duplicates already merged are found and removed (owner, Oct 28, 12:20 AM Eastern: "now there needs to go through and look at all of the duplicated stuff that's already been merged and coded in that needs to be removed").** A dedicated Opus session inventories every second writer, engine, renderer, bank or unread record on main and deletes one of each pair per PR, the one the rulings keep staying; a guard blocks new twins. The systems integrator keeps its four facts.
- **The retroactive look-first audit (owner, 7:15 PM Eastern Oct 27: "YOU NEED TO DO THIS RETROACTIVELY FOR EVERYTHING").** Report #6445: of 191 open PRs, 27 contradict a ruling, 83 repeat code on main, 52 repeat another PR; of 479 priority 1 and 2 items, 37 twins, 40 already built. The CTO closed 13 PRs and dropped the twin and already-built items on Oct 28 00:15 UTC; Merger 4 closes the rest of the audit's "close" rows and merges its "merge as is" rows; the sessions doing work twice were told which owns it.

## Oct 27, 5:40 to 6:15 PM Eastern: the v0.59.0 screenshots (owner, to the CTO)

- **Menu subtitles are removed, never replaced (owner: "REMOVE. THE. MENU. SUBTITLES. DO NOT REPLACE THEM").** Continue, Saved games and Patch notes show only their names; the Oct 24 line "every dimmed entry says why" is withdrawn. PR #6436.
- **Realistic, not real, for every statistic unless it is in law (owner: "THE 4.1% IS STILL HARDCODED. I SAID NO REAL DATA. EACH START SHOULD BE DIFFERENT BASED ON THE SIMULATION. REALISTIC NOT REAL"; "IT GOES FOR EVERY STATISTIC UNLESS IT IS IN LAW. USE A HELPER").** Every real-world statistic that reaches play starts from its real value as the center of a per-world spread drawn at Start and then moves with the simulation; laws in force stay as the real starting law. A dedicated Opus session audits every such number, fixes each source, and adds a two-seed guard.
- **Every painting in the set is used (owner: "WHY IS THIS THE ONLY STOREFRONT SCENE USED? YOU HAVE ACCESS TO HUNDREDS").** 922 backdrops by place type and time of day; a scene draws from the whole set for its place type, time and weather, seeded by the place. The people-in-rooms builder has it first.
- **History is simulated before the start date, no hotfix (owner: "fix history not simulating before 2025! no hotfix! i keep getting told it's fixed and it isn't").** The engines run the years before Start; the generated-history proxy (`buildDeepPast`, SG-P8-deep-past) is deleted once every reader reads simulated records; the owner's test is the Journal of a 35-year-old in two seeds. A dedicated Opus session owns it; nobody reports it fixed, they show the two Journals.
- **A narration-only beat shows one Continue, bottom left of the talk box, and no Leave or Say nothing (owner, 6:20 PM Eastern: "WHEN IT IS JUST THE NARRATOR REMOVE THE LEAVE/SAY NOTHING! I DON'T LIKE HOW TALK IS DISPLAYED. CONTINUE ON THE BOTTOM LEFT").** A conversation keeps four replies with Say nothing as the smaller control beside them (Oct 14); Leave only where leaving is a real choice. The talk box's look follows the mock: speaker, line, replies as a menu, no subtitle string under the name. Screens designer, first.
- **A scene's place comes from its purpose and its people**, never from the last backdrop: "waiting for you to get home" fired on Main Street at midnight (integrator).

## Oct 27, 5 PM Eastern: the owner's answers to the CTO's question list (owner, to the CTO)

- **Look first is every session's duty, as a skill every skill names (owner: "Not just the CTO, but every session. Every skill needs to have it, or it needs to be a separate skill that's referenced by every skill, because I'm sick of seeing stuff fixed or asked that I've already done"; "Look at previous decisions. Search the drive. Search logs... I've talked about businesses and towns before. Find it").** The `look-first` skill, referenced from every skill and AGENTS.md. The CTO's question list of Oct 27 asked four things already ruled (businesses, real data, the inaugural varying, scenes as the game); recorded here as the lesson.
- **Time and the day (owner: "Nothing happened this week. It shouldn't pop up anything. There doesn't need to be any indicator other than the time and date on the bottom. A day in game is not necessarily playable. The game is played through scenes. That's what stops time, or maybe you stop time. But if a scene doesn't interrupt you, it doesn't. You don't have to click through 4 months... a day depends on your position and what's going on in the world").** No "quiet week" screen or line; the HUD shows the date and time; scenes stop time, or the player does; the rest of play is the regular screens (drafting bills, talks).
- **The President's address (owner: "Yes, nothing about your state... obviously it should change by the goddamn party and traits. It should change by what the president wants and what's happening in the world... these speeches are not all the same. That's why the 4.1%. No, none of that real data in there. Real data is just used to calibrate as soon as you press start, it's alternate history").** A real inaugural shape, national only, varying by the President's party, traits, wants and the world's events; no real statistic in play.
- **Talk (owner: "the talk button you click on somebody. How hard is that to understand?").** Clicking a person starts the talk; no Talk button.
- **"Last talked": never shown.** "How you met" may show, but only worded like a human and placed by UI principles ("this just gets shoved in there without any adherence to UI or principles").
- **Door-knocking and every campaign act are scenes (owner: "a short scene at 1 or 2 doors, maybe sometimes it's uneventful, maybe sometimes you meet someone at the library, maybe sometimes you meet someone waiting outside of a job... Scenes are the game. They're the narrative").**
- **The campaign screen: one board (owner: "One board, I'll have to see it explicitly... there should be some kind of inbox with media requests or building a campaign team... the political process has some kind of manager. I would like to be able to do that. Maybe you meet someone, maybe it's your significant other or your best friend").** The board carries an inbox (media requests and the like) and a campaign team the player builds from people they know, met in scenes. The owner sees the board before more is asked.
- **Travel: a list of places with a painting per place type and who is there now (owner: "I like number eight").**
- **Businesses: already ruled Sept 22, 28 and 29 (prior-rulings/economy.md R16, words.md 11, OWNER-DECISIONS "Business and roles database"): employers are generated to fit each town from calibrated business tables, no fixed list, no generic names; the data calibrates, the rest happens in the background.** The fixed 38-kind list in `src/core2/town-workplaces.ts` contradicts it and is a defect.
- **A quiet Tuesday (owner: "maybe the simulation stops there. Or maybe the one wants to see something that happens on the news... maybe they decide to go somewhere. It depends on the player and what the director and simulation say... There is no 'a week passes with nothing happens'. You're playing a game").** The director and the simulation decide; no authored idle state.
- **Pose-slot scenes from the mannequin mockup: do them all; how many people each is the director's call.**
- **When a line is terrible: sometimes a broad rule, sometimes straight feedback; the owner's voice messages and the sitting blocks carry which.** Everything he says is on GitHub or Drive; find it.

## Oct 27, afternoon: screens rulings from the v0.56.2 sitting (owner, via his local Opus session, 3:30 PM Eastern; full block to follow in `docs/coordination/playtest/2026-10-27-1.md`)

- **Screens are designed from game design principles and reference games, not improvised (owner: "How hard is it to look at other games and look at game design principles, examples, and textbooks and stuff and design a good goddamn screen?").** The Political Process (menus, calendar, travel, news), Wildermyth (scenes), Crusader Kings and RimWorld are the references. A dedicated Opus screens designer owns this; every screen PR cites the principles page it builds to.
- **No dead space** ("there's so much dead space and empty space in these menus"): a panel is sized to its content or its content fills it.
- **No subheadings** ("Remove all those fucking subheadings. I hate them all"): no "YOU ARE AT HOME" under Travel or its like on any screen.
- **"Serving when your story began" is gone** from every Government row ("Like, what is that? No. Stop.").
- **The calendar is usable, not "a blob":** events on their days, one worded line each naming who and what, no duplicates, no "LAW TAKES EFFECT" rows that name no body or effect ("these random laws take effects are not useful"); the player's own deadlines first.
- **News is a newspaper with story text** ("there is still no newspapers, even though UI was made for them"); no record kinds, series names or jurisdiction labels on screen.
- **The person card's Talk button is removed** ("Remove the goddamn talk button").
- **The talk box subtitle and the traits block speak plainly:** not "Warehouse worker · Quinn Supply Company · partner" and not trait names ("The player is not seeing this stuff. It needs to be a plain version of what this person's like"); sentences from the English engine.
- **Systems are linked, one source per fact, and screens read it (owner, 4 PM Eastern: "Systems are being made for individually instead of linking everything together... The UI needs to be linked to the systems as it works... Sessions should not be building their own shit").** A dedicated Opus integrator owns the links: the player's job (one employment record read by Travel, Jobs and study, the card, the opening and the director), the clock and a place's opening hours (no scene at midnight in an open office; PR #6059's fix lands), ties and shared history in scenes (a known person never gets a stranger's scene), and the campaign record (one count of volunteers for the header, the row and the director). A second copy of a fact is a defect to delete.
- **The English ban (owner: "When it says you're in place or person is with you, I hate those. Remove every instance of that from the English engine. Block that").** No line restates where the player is or who is present; every "You're in {place}" and "{person} is with you" piece is deleted and a test blocks their return.
- **Volunteers do not stop the player one by one (owner: "it shouldn't be stopped for literally every single volunteer. Maybe some that matter. And that's only when you're doing small local campaigns, or maybe your first campaign. If you're running a presidency campaign and you stop for every little volunteer, like, what are we doing?").** A sliding rule on race size and the volunteer's tie, no threshold.
- **Scenes have depth or they do not fire (owner: "these scenes aren't making sense. I guess they're firing, but contextually they make no sense to the story. Again, I use Wildermyth as an example. These scenes have zero depth to them").** A scene reads the tie, the history and the clock; four replies are four different answers, never one reworded.
- **Playtest points come back to the owner as questions before anyone builds the design side (owner: "all the stuff I'm saying needs to come back to me afterward and actually ask me goddamn questions instead of just freeballing it").** The CTO brings the questions from each sitting to him in one list; defects are fixed without asking, design choices wait for his answer.
- **No license or rights question, ever, for any asset, generated art included (owner, Oct 27, 4 PM Eastern: "Nothing I use is license... No questions"; reconfirms Oct 26: Developer ID, notarization, signing and licenses are never raised).** The asset admission skill records only where a picture came from so it can be made again; the rights gate is deleted. A session that asks about a license is sent back.
- **People in rooms (owner, 4:30 PM Eastern, via his local Opus): a room gets a mannequin plate per spot (position, size and facing at the painter's perspective; data, never drawn), the engine draws the real filled-in person at the spot behind the furniture by a depth map, an empty spot shows the painting, big rooms hold "only who's there", a forearm resting on a desk "is fine for now", the opening rooms first ("the easiest things to see will be in the opening; so that first").** Hair, per-garment clothes colors and contact shadows ship in the same line. The owner's local session makes the art (plates, hair pieces generated on the v2 heads, garment masks): "You're generating the images. Code is going to other sessions." One Opus builder owns the code.
- **Main-menu scenes get plates too, outfits are tagged and chosen, cuts are tight (owner, 4:45 PM Eastern: "Cutting tag the scenes that are on the main menu as well. And be sure there are multiple outfits to choose from and that those are tagged. So like the president is wearing a suit... is it possible to have an actual like clothing creator, like just clicking next... Your cutting is terrible. So you always leave way too much of a buffer"; "not only back view hair, but every angle needed"; "facial expressions and different faces for men and women, just to give the generations variety for now").** The art branch is `claude/people-rooms-art` (art/people-rooms/README.md, MANIFEST.md, manifest.json); the people-in-rooms builder consumes it.
- **Travel always lists destinations**, including at night; **council members never all show "60% of the vote"** (a placeholder); **one left menu, not a panel duplicating the rail.**

## Oct 27, midday: ship each finished unit (owner, to the CTO, 12:15 to 12:45 PM Eastern)

- **Nothing is held back; one finished unit is one merge (owner, Oct 27, 12:30 PM Eastern: "There's a lot of work, not just in what I mentioned, that's just arbitrarily being held back... There's no reason to be holding shit back. That's the point of having so many mergers and fixers." And 12:45: "That goes for everything, not just what I said. So if one law gets finished, put it in the game. Then work on the next one. If four effects on the web are finished, put those in. Keep working. This rate of update should be fast.").** A finished law, outcome-web link, trait decision, scene, screen or speed change goes to main as its own PR the hour it is green, then the next one starts. No family batches, no "merge after", no merge holds except a red main, no waiting for a matrix to be whole. A merger sends back only for a defect a player would meet, a standing-rule break or a claim the checks disprove, and fixes paperwork in the merge. Scope (owner, 12:55 PM Eastern: "Family batches are fine for the future or overnight, but just not now. There's too much stuff that needs progress and needs human feedback right now"): per-unit shipping is the rule while the owner is awake and testing; a lead may batch a family overnight or when the owner says so. The CTO's release windows of Oct 27 morning stay withdrawn.
- **The English engine, the scenes and the UI are finished first, by dedicated sessions (owner, Oct 27, 12:15 PM Eastern: "I want that English engine along with the scenes and the UI stuff done as soon as possible. Start a dedicated session. I want those merged soon so I can make sense of a playtest").** One Opus finisher owns the scenes and the English engine's lines to playtest-ready; one dedicated merger (W) lands words, director and UI PRs; a lane session moves the last four screens onto the shared parts.

## Oct 27: rulings (owner, to the CTO, overnight)

- **Any record can call a scene; the examples are a floor, never a ceiling (owner, Oct 27, 01:30 Eastern: "stop limiting the scope to what I say. It can be a constituent stopping you in the street after a law passes. News of a new war starting: even though wars aren't coded in, you could still talk with somebody about it at a location. People in hallways, legislators in hallways, lobbyists, interviews in hallways. Even though all those scenes won't necessarily be in the game, if the circumstances are right in the simulation, they should be callable. And then the English engine handles the words").** The director's situation types are written for kinds of circumstance (a person with a reason meets the player at a place after a record), cast and worded from whatever records exist, not for a list of named moments. One Opus session at high effort owns the director and the scene code; Sonnet researchers feed it fact packets and gap lists from real lives through pool items and PR comments, and the two sides may message each other (owner, Oct 27; this overrides "sessions never message each other" for the scene line only).
- **The playtest is finished by the morning build (owner, Oct 27, 01:30 Eastern: "Everything from the playtest should be absolutely finished by the time I wake up... all the people taken out, change the color of people's clothes, the UI unified, dev mode corrected... the opening speech flows like a real speech... scenes removed from the hardwire... people's pasts simulated when you open the journal... if there's 58 laws, there's 58 choices in the speech... on the Mac build by 10 a.m.").** Every item from the Oct 26 sitting and every Tier 2 line is in a build by 10:00 Eastern; what is not done is said plainly in the morning report with its reason, never hidden. Three more mergers and two more fixers run overnight.
- **Hard-coded play content is a defect (owner, Oct 27: "the images of the unemployment is at 4.1%, the fact that I know that is ridiculous... stand your ground laws... things are being hard-coded in or things are not being read").** The opening address, its figures and its law lines are read from the world's own records and the laws in force; a number or a law named in code or in a fixed bank slot is removed in the same PR that reads the record.
- **Real lives calibrate the scenes (owner, Oct 26, late: "use real life people's as examples. It can be a known American, unknown American, president, congressman, mayor, city councilman, school member, anyone... It can be copyrighted material because you're just using it as calibration, and take scenes from their life. See if the engine can produce it. If not, work the framework of the dialogue in, and that will affect other scenes").** Every new scene starts from an episode in a real American political life: a fact packet, the engine asked whether its records would fire it, each gap turned into a producer, lines or an engine item. Copyrighted sources are read for calibration only; no real name, line or likeness ships. Skill: `scenes-from-life`.
- **Lines ship per scene; batch grading is over (owner, Oct 26: "Is October 15th batch 22?").** Batch 22 was the Oct 15 lines; no newer writing existed. Each scene lands with its own new lines and the old ones are deleted in the same PR; the owner's sitting notes are the grade.
- **The skills learn every iteration (owner, Oct 26-27: "update skills, make new skills, etc. That's how this is supposed to work. So that way this will run smoother every iteration").** A repeated send-back reason, a red-main cause, an already-ruled question asked again, or a gap the owner names becomes a skill line or a new skill in the same CTO pass (`cto`, Lessons loop).
- **The scene web covers the whole game, not the golden path (owner, Oct 27: "It's not just election night and campaigns. It's legislative stuff at every level of government at different states. Executive stuff at every level. Random meetings, meetings with donors, being corrupt, meeting with this constituent, that constituent, this location, that location, debating this law, having a debate, having an interview. There is infinitely more").** The web is split by domain, each in every state from its data: home and family; meeting people and places; the campaign; election day and night; legislating (council, county, state, Congress); the executive (mayor, county, governor, president); constituents and cases; donors and corruption; the press. Five Sonnet scene builders work one domain each under the words lead, one real-life episode per 4-hour box, from the start; nothing waits for the owner.
- **The scene web (owner, Oct 27: "a victory speech obviously means there needs to be a concession speech... they had a contentious call with the other candidate, or this other person in this state had this one unique experience, and that can be a branch... use hundreds of people... built into a system, like the effects web").** Every scene the owner asked for, its mirror and its branches from real lives, is one row of a regenerated matrix (`docs/reports/scene-web`), with its trigger, its situation type, its lines per speaker and whether it fired in a played year. Each morning the owner reads what scenes exist, what played overnight, and what is missing. Item `words-scene-web-from-lives` (L, split by season); lead: words.
- **A grade calibrates the engine, not one line (owner, Oct 27: "I grade 17, that should calibrate the entire engine... a butterfly effect, and calibrates a concession speech later on").** A grade attaches to the piece's pattern, speaker trait and register and moves every piece sharing them across every bank; the owner grades inside play and in sitting notes, never in a laid-out batch. Item `words-grades-calibrate-by-trait-and-register`; lead: words.
- **Skills are created from what works, not only from errors (owner, Oct 27: "not just errors, but work processes as well... if something works well and I like it, I would like it automatically made into a skill... the biography thing, for example. And if you try it while I'm asleep and something ends up not working right after a sweep, then you update it"). The owner never prompts a skill's creation or update; the `skill-lessons` job writes both what to stop doing and what to keep doing, and corrects a new method after its first sweep.**
- **Skills update themselves (owner, Oct 27: "if three errors keep happening at 5, 5:30 and 5:32, a skill would be automatically updated... Anthropic and OpenAI have thousands").** A scheduled job every four hours runs `skill-lessons`: failures seen twice become a skill line or a new skill, as a PR the CTO merges. Item `skills-lessons-auto-update`; lead: cto.
- **Not enough scenes is the problem (owner, Oct 26, late).** The owner's scene examples from every playtest are collected in `docs/design/scenes/owner-scene-examples.md`; the words-and-scenes lead works them season by season, one real-life episode per pass.

## Oct 26, evening: rulings from the playtest sitting (owner, via his local Opus session; `docs/coordination/playtest/2026-10-26-1.md`)

The owner played v0.34.0 for about six hours (Albion, Pennsylvania, council race, lost 214 to 159; then a year as a U.S. Representative in a custom world). His verdict: "I see the biggest problem being words and scenes." Each ruling below is his, recorded by the CTO the same day.

- **Shifts never stop the player.** "Shifts are for the simulation. Absolutely not... Remove every semblance from that in the game... The player should not be clicking through that." "There's no reason for this to be a job simulator." The core player clock's pause at each shift start and end is removed; routine work never stops time.
- **Wildermyth pacing.** "It's okay if it goes from January 14th all the way to March 11th, and then there's something on March 11th, 17th, 18th, and 21st, then nothing till July." Quiet stretches are allowed outside a season; scenes cluster when the records give cause.
- **Campaign seasons are full of scenes.** "Getting ready for the election, having interviews, a debate, assembling an election team, meeting people, having moments that change your life, working with other candidates, working with current elected officials, holding rallies... participating in corruption if it comes up." A filed candidate's months are never silent.
- **Election day is about five minutes of scenes:** canvassing, going to vote ("this should be a scene, maybe with a narrator"), the returns, conceding or celebrating. Election night "needs to be its own pop-up menu kind of thing." Going to vote stays the player's choice (Oct 26, morning).
- **One UI system and one scene system.** "There's a bunch of independent UI things or a bunch of independent campaign scenes or rails... This all needs to be unified... too much duplication or individuality." Every screen control comes from one shared part; every scene from one director path (`screen-to-mock`, `scene-standard`).
- **Watch the World and the custom world become one dev mode where you can do anything from the start**, "more like RimWorld or Crusader Kings... get rid of the opening questions. The questionnaire, that's useless." Playing as anyone, starting as a legislator or the President, lives there. Sharpens the Oct 14 rulings (OD:166, OD:169).
- **The world lives without the player.** "Everything that I say I want my character to be able to do should be simulatable in the background. The world keeps living without my character. I am not the main character." Legislatures meet on their real calendars ("nor should any body only vote yearly"), with bargaining, deals, vetoes, killed bills and pork in the background.
- **Bills on paper, every term clickable, an estimate beside it** (reconfirms Sept 25 and Oct 14): "the bill is illustrated on screen with the UI, and you can click that specific part... then it shows the simulated stuff on the right, how the CBO would estimate." Citations open the game's own display of that law, never a web page.
- **Menus are menus.** No subheadings in the menu list; "if there's this many options, it should open an actual menu, not just in the chat"; talk history set apart ("different color, separated"); a scene's name above Day and Week; "Continue" becomes "Skip scene" or "Simulate scene."
- **Creator colors:** hair, skin and clothes colors return to the creator; everyone is "bald... gray" today because #5898 removed them.
- **Rejected in play, reopened with his words** (CTO): `play-first-10-journal-from-day-one` ("What the hell kind of entry is that? There's no history"), `play-first-09-opening-speech-per-world` ("That's not a speech"), `play-stop-04-filing-panel-runs-off-screen`, `play-stop-16-identical-council-seat-choices`. A merge is not the owner's acceptance of a play item (Oct 25); the item closes on his installed-build check.
- **Oct 8 montage ruling, recorded late (CTO):** door knocking plays as a montage with porch scenes, not a tally.
- **The 31 draft items from the sitting are filed as pool items as written** (CTO, Oct 26), the owner having asked that Fable rule: they are SMART, each with a time box and a done-when a merger can check. The one drafter's number (a 28-day cadence for a filed candidate) stands as the campaign-season rule and does not apply outside a season.

## Oct 26: rulings (owner, to the CTO)

- **Election day is the player's choice (owner, Oct 26: "it should just be a choice. If you want to go, you can. If not, you don't have to").** Election day is not a forced stop and the character never casts the player's ballot. The day offers the polls like any other place the player can go; skipping it means not voting, with no penalty beyond not having voted. Closes `SG-OFFICE-owner-decision-ballot-stop`: remove the forced stop, keep the Oct 13 rule that the engine never votes for the player.
- **Discrimination: yes, and it is not asked again (owner, Oct 26: "I've answered the discrimination so many times. I said yes").** The Oct 24 ruling stands as written (sex and race on the record, a discrimination ban refuses a decision whose reasons cite a protected trait, complaints pay back pay and a fine). Any PR body, stopgap or pool Note that still asks it is a defect; cite this line and build.
- **Developer ID, notarization, code signing and licenses are not blockers (owner, Oct 26: "ignore the Developer ID... This game isn't a finished product right now. That should not be blocking anything. Ain't no licenses").** No lane item, release step or PR waits on a signing identity, a notarized build or a license. The unsigned Mac build is the owner's install until early-access preparation. Any item or stopgap citing them as a blocker is closed or reworded; nobody raises them to the owner again.
- **Wildermyth is the model for scenes, the director and people generation (owner, Oct 26).** His words: "The way it does its stories or scenes, like in the comic book strips, that's how I want it in my game... where the narrative and the story progresses through those scenes, where you're clicking through dialogue and then you play the game through the actual game. The people generation, the variedness in their generation, etc." This sharpens the Oct 24 line: a scene is not only an interruption of time; the story advances through the scenes, and play happens between them. Every Words and director item is graded against it: does the scene move the story (a relationship, a race, a bill, a household) and hand the player back to the game with something changed? People generation is graded the same way: varied people with pasts that surface in scenes, from the world's records, never a template.
- **MEMORY-FLAT stays behind playability (CTO, Oct 26, from the owner's "I don't understand what memory flat is").** MEMORY-FLAT is the Oct 13 memory package (`docs/packages/MEMORY-FLAT.md`): a town is about 25 MB of real data and was costing about a gigabyte, which caused the bench crash. Its ceilings are in the gate. The remaining steps are ordinary pool items and never block the lane.

## Oct 26: acting-lead rulings (words-and-scenes lead; standing rules, the owner may overrule)

- **The order a party asks its members to run is decided, not asked (words-and-scenes lead, Oct 26; `words-scene-party-asks-you-to-run`, #6146).** The owner ruled "The party asks someone to run only with some inroads on record" (Oct 15, night, batch 13 review) and that "a player with a high-standing job may be propositioned to run for a seat someone needs filled" (Oct 14). So the chair asks members by inroads first (closeness to the chair), then standing (how many people know them). `SG-P15-party-ask-order` resolves as decided. The question is withdrawn from the owner's list. Read: OWNER-DECISIONS (Oct 26, evening), DECISION-REGISTER, prior-rulings/elections.md and prior-rulings/words.md, LAW; searched: party asks, propositioned, recruit, Pendergast.

## Oct 25: rulings (owner, via the acting CTO)

- **OWNER SCREENSHOT NEEDED is not a merge gate (owner, Oct 25: "remove that block").** A lane PR merges on the agent's before and after screenshots (linked or embedded) and the merger's checks. The owner's installed-build check closes the pool item afterward, never the PR. Mergers: merge the 26 lane PRs carrying that line on their own evidence. Supersedes the Oct 14 "a look that changed needs the owner's yes on the screenshot" line as a merge rule; the owner still sees every changed look, on the installed build, and the item closes on his yes.
- **Handoff lines never on a branch (acting CTO, Oct 25).** The lane's `docs/play-first/PROGRESS.md` is written on main only: the agent appends its handoff by `git checkout main && git pull && append && push` (or by commenting on the PR, and the CTO copies it to main). A lane branch that changes `PROGRESS.md` is a defect; the merger drops that hunk and merges. Resolves the 21 PROGRESS conflicts.
- **Family name (owner, Oct 25: "sure household").** A family name typed in the creator renames the household; #6096 stands as built, and the stopgap SG-PLAY-creator-family-shares-name resolves as decided.
- **Three Words scenes (owner, Oct 25: "will give me the seats").** Build all three without asking: a party approaches the player to run for a seat it needs filled (the Pendergast approach, Oct 14 below); a family member's absence is a scene when a record explains it (moved away, in the hospital, jailed, died), silent otherwise; staff bringing bad news is a scene when a press record names the player or their bill. Words builds them from records; the owner sees them in play. Items `words-scene-party-asks-you-to-run`, `words-scene-family-absence`, `words-scene-staff-bad-news` (words, p1, lead words, milestone play-first).
- **Press outlet shortfall (acting CTO, Oct 25, under "simulate it, don't ask"):** an outlet short of money cuts staff, pages or closes by its own books, the press engine's existing rule; the outside-audience top-up is removed. Stopgap SG-PEOPLE-press-bureau-shortfall resolves on that build; the Open bullet is gone.
- **One rulings log (acting CTO, Oct 25):** `OWNER-DECISIONS.md` is the only rulings log. `DECISION-REGISTER.md` and `prior-rulings/` are read-only history (each now says so at its top); newest wins. The channel's "Decisions made" blocks are status, not rulings: a lead that decides something files it here as an acting-lead ruling or it isn't one. Carried by the lead-session skill.
- **The freeze lifted (owner, Oct 25):** "get everything moving again, not this lane but everything." Play-first stays the first claim for its leads; nothing else is held. The 18 open items frozen Oct 24 are open again and `play-first-freeze` is dropped. The lane owns `src/bench` and may edit director and English files with `Review: words`; Traits' and Effects' overnight PRs stand; Speed's queued PRs open.

## Oct 25: acting CTO rulings (standing rules; owner may overrule)

- **Screenshots in lane PRs (acting CTO, Oct 25):** a plain link to the PNG on the PR's branch satisfies the screenshot rule; the merger opens it. Embedding is preferred, not required. Backticked links are a writer defect the fixer corrects in the body, never a send-back reason on its own.
- **A "no" on adopting an income tax leaves an existing one standing (laws lead; laws-nine-links-taxes).** Simulate it, don't ask (owner, Oct 24): a vote changes only what it names. The adopt question reaches a state or town without the tax; where one already stands (Michigan, Nebraska) a "no" changes nothing and no repeal runs. Abolishing an existing tax is its own question on its own bill.
- **Drug possession counts as low-level where the research class the PR uses says so (laws lead; SG-LAW-justice-low-level-drug-possession, justice-low-level-offenses).** The FBI/BJS quality-of-life class the case flow follows (Chalfin, Hansen, Weisburst and Williams 2022) includes drug possession, so it is the sixth category on the same police-staffing link, with its own FBI arrest rate by place, recorded ESTIMATED with the source. The stopgap resolves on #6056's branch.
- **laws-end-to-end-proof: the screenshot half is split out (laws lead).** The screenshots live in `laws-end-to-end-screenshots` (the `laws-end-to-end-proof-screens` half; lead play-first, p1; the grading hold is gone since Oct 24, so nothing blocks it), and the proof item closes on records: the test, the record ids, the journal row by id.
- **#5972 stands (M0–M2 lead).** A roadmap flip PR opened during the freeze was never in the freeze's way, and the freeze is lifted anyway; so does #6005. Merge on green in the merger's order.
- **Daily focus only for people seen in the last 30 days: yes (speed lead), as an index read, not a scan.** The focus set is read from an index of who the player saw and when; no daily pass over everyone known. Tests that read focus as daily move to the index. The year-three band is checked by the speed proof (`core-speed-contact-offers-grow-with-ties`), not asserted here.
- **`people-drives-cause-acts-pull-less`: done-when amended as the speed lead proposed (per-person rates and hours; the share of adults who act goes to a drive-formation item; the band to the contact-offers item). `core-speed-gc-churn` is done (6.2 percent of the year on main). `core-speed-cause-group-offers-per-topic` is dropped.**
- **Effects: `core-approach-office-no-staff-throws` and `core-counted-hire-calendar-other-employer` are dropped as duplicates (of `core-planned-approach-office-staff-left` and `jobs-counted-hire-other-employer-calendar`, both done). `core-counted-household-jobs-in-step` is done (#5609), confirmed.**
- **How often a cause-holder acts: the CEV calibration (`people-cause-holder-activity-calibrated`) is the band.** The speed lead ships `people-drives-cause-acts-pull-less` against it; no owner question.

## Oct 24: rulings (owner, via the acting CTO)

- **Lane edits director and English files (owner, Oct 24, "go ahead"):** play-first lane agents may edit `src/director`, `src/english` and `data/english` directly for lane items. The Words session reviews those PRs: the PR body carries `Review: words`. The merger does not send a lane PR back for touching those files. Carried by docs/play-first/README.md, the `play-first`, `merger` and `words-engine` skills.
- **Budgets at 17 (owner, Oct 24, "go ahead"; newest wins):** Budgets is hidden until it is relevant to the player: they hold office, have filed, or are of age to vote. The Oct 20 menu-study line that lists Budgets under Politics at all times (below, "The menu structure") is superseded on this point. Carried by `play-first-14-budgets-hidden-until-relevant` and docs/play-first/LAW.md.
- **Issues screen (owner, Oct 24, "go ahead"):** Politics → Issues is law cards per the Oct 14 mock, not a plain list. The decision register's "Issues follows this register, not its mockup" line (REG:149) is superseded on the list-versus-cards point. Carried by `play-first-12-politics-screen-to-mock-b` and docs/play-first/LAW.md.
- **New game (owner, Oct 24, "go ahead"):** one button, Start a life. The world modes (custom, watch) live under one Advanced link beneath it. The Oct 14 ruling that a custom start lives in dev mode stands for the custom world. The Oct 14 "Start a life, Custom world, New world" menu is superseded. Carried by `play-stop-13-start-a-life-or-new-world` and docs/play-first/LAW.md.
- **Simulate it, don't ask (owner, Oct 24, standing):** "Most of this is simulated in the background. Look it up and make it in the game. Don't hardcode it." Any mechanic real life has that the simulation needs (a lender, pay growth, a fee) is built from research as a background simulation, calibrated not hardcoded, with no question to the owner. Only design calls about the player's own experience reach him. This extends the Oct 24 "questions the rules already answer" ruling.
- **Small-dollar lenders (owner, Oct 24):** yes, simulated in the background: payday and small-dollar lenders exist where state law allows them, their rates and volumes from sourced data (CFPB, state regulators), read by the consumer-loan rate cap and by households that borrow. Pool item `world-small-dollar-lenders` (p2, M). Closes the laws lead's Open question (stopgap SG-WORLD-credit-rate-cap-no-small-lender resolves when the item is built).
- **Pay growth with tenure and performance (owner, Oct 24):** built, not asked. Pay moves with tenure and the worker's record at the employer, calibrated from BLS/ECI tenure-wage research, no fixed step. `owner-pay-growth-by-performance` is unblocked: intent renamed in its Notes, kind feature, p2, status open.
- **Fees set by bill (owner, Oct 24):** yes, a council can set a fee level by bill where its powers allow; the fee is a law row the treasury reads. `SG-GOV-fee-level-by-bill` (registered on #5926) is decided; the gov builder resolves it on that branch.
- **Acting CTO rulings from the channel (Oct 24):** speed may ship a small exact cut on in-pair profile attribution with identical fingerprints when the whole-year ratio is inside noise, stated in the PR; campaign walk order (SG-GOV-campaign-walk-order) stays a registered stand-in until the campaigns engine reads a route from the map; M0-08 closure timing and M0-04 scores are checked as the spec's command says, no change; the M3-09 timeout is raised for that spec only; m0-m2 may edit laws files for `laws-georgia-state-minimum-wage-missing` (laws lead out); drop `core-speed-alike-drive-offers` and `core-speed-opening-heap-pooled`; close #5388, #5389, #5400 and the journal part of #5771 as superseded; mark `play-golden-path-withholding-reads-kept-rows` and `core-counted-household-jobs-in-step` done; time to conception is a sourced average by mother's age with the couple's circumstances on a sliding scale (estimate, never a roll); one head per recheck: a lead never pushes to a branch while a merger's check is running.

- **The playtest (Oct 24):** "Not tonight: he can file for council and campaign, but the ballot won't reach his own race, no screen says he won, and six weeks later the game locks on December 14, 2026." Three stoppers end play (`play-stop-23` job-offer hold lock, `play-stop-21` ballot stuck, `play-stop-22` win never shown); 26 items in all; play-first order in docs/work-orders/play-first-2026-10-24.md. Report: docs/reports/playtest-2026-10-24.md (PR #5956 kept open as the record).
- **Play first (owner, Oct 24):** "Only the bare minimum needs to be put in the game right now. I still can't play the game." The owner being able to play tonight is the one measure; every report leads with it; new work other than what stops play is frozen until the CTO lifts it.
- **The play-first lane (owner, Oct 24):** all playtest work in one lane with one owner (docs/play-first/), run by many agents in turn; every assignment SMART and time-boxed; push constantly so nothing is lost between agents; the owner's rulings in LAW.md are the lane's law.
- **Grading (owner, Oct 24):** batch-style line grading is not how the owner grades; he reacts to scenes and scenarios with voice notes; the hold on hand-written lines is released; graded and liked lines ship.
- **Scenes like Wildermyth (owner, Oct 24, relayed by the acting CTO):** scenes "that come out of what is actually happening in the world, narrated into a moment, played out with real dialogue and choices, the outcome back into the game; the current opening is the right shape, the words are wrong."
- **The owner's read of the playtest screenshots (owner, Oct 24, relayed by the acting CTO; carried by docs/play-first/ORDER.md):** Start a life is the main one and goes first; Custom world and New world are combined or explained. Panels keep the slight gold box permanently, not transparent. The creator's month, day and year line up. One font in the town list (the states' font), and the populations shown are the simulated ones. The v1 figures ("the ones with the airplane") are completely removed; the Codex v2 set may be used, else people stand generated-in. People in the house need a reason to be there: no "X is with you"; "Noah Chan is with you" is removed. The news box fades or can be dismissed. The opening speech is generated per world and per president from the game's numbers, not formulaic. People's histories are simulated and the journal runs from day one. The person in the people web is the one you made. Menus look like a real game, not a spreadsheet, per the mocks and the UI guides. No budgets for a 17-year-old. The politics screen needs a guide. Buttons are the same size.

## Oct 24: rulings (owner, to the laws lead)

- **Sex and race on the record (owner, Oct 24: "yes"; he had already answered yes, and the CTO's Oct 24 Open list on #5858 still asked it):** every person carries a recorded sex and race. Race comes from the place's Census shares when the world generates who exists, consistent within a household by the data; counted groups carry the same shares times their count. An employer or landlord passes someone over only from their own recorded traits and views, with the reasons recorded, never a roll (the #5102 ruling), and a discrimination ban refuses a decision whose reasons cite a protected trait. Closes the Open question; built by `people-protected-traits-on-record`, which unblocks `owner-employer-bias-source` and the rights family's discrimination law.
- **Low-level offenses (owner, Oct 24: "yes"):** the justice case flow models minor quality-of-life offenses (disorderly conduct, loitering, public intoxication and the like) and their arrests, so police staffing can move low-level arrests by a sized research link. Built by `justice-low-level-offenses`.

## Oct 22: rulings (owner, via the acting CTO)

- **Builders on Oct 21 to 22 (owner, Oct 22):** they ran on a different account. The Oct 20 "pool builders and the pool feeder pause" ruling covered the account that stood at 83 percent of its weekly limit, not the fleet. No rule was broken.
- **Hearing about the town's conditions moves a stance (owner, Oct 22: "sure"):** the default proposed on #5637 is the rule. Hearing "rent rose" (or any condition change the month's news carries: unemployment, crime and the rest) moves a housing-policy (or the matching) stance only for the people the news reached, toward the side their own views already tie to that condition, by the existing heard-event amount in the views engine (no new opinion size), with the outlet recorded as the reason. Closes `web-views-from-conditions`'s question; the Open bullet above is removed.
- **Acting-CTO rulings stand (owner, Oct 22):** the 0.15 governor-share bound (`gov-two-level-governor-share-flaky`) and the FHFA MIRS Transition Index from 2019-06, tagged ESTIMATED (`macro-mortgage-rate-fhfa-transition-index`), stand as written in the Oct 20 night rulings; the owner did not overrule.
- **Dead PRs (owner, Oct 22: "clear out the PRs that aren't needed"):** closed by rule: superseded (another PR's body says it replaces them), already on main (zero commits ahead), item done via another PR, old-core additions, and stale pre-Oct-14 branches with conflicts. The list with each PR's pool item is in the body of the acting CTO's Oct 22 fix-forward PR. Items they carried return to the pool as open where not done; items done through the replacement PR stay done.

## Oct 20, night: acting CTO rulings from the pool (standing rules; the owner may overrule)

- **Director producers and the Words line** (`words-director-watches-officeholders`, `director-bring-it-up-names-signer`): any builder may build the director-side producer that reads a record (a law's signer, an officeholder's address, signing or term ending) and stages the situation and moves. Every word still comes from the English engine's mined bank; where no graded sentence exists, the builder files a Words-line pool item and the scene stays out of play until graded. Rules: no hand-written player text; replace, never layer.
- **Purpose scenes in play** (`words-scene-talk-in-play`): the `after: words-scene-talk` gate governs alone; no separate blocker.
- **Counted giving** (`people-stopgap-drives-counted-giving`): a counted group's gift is the full person's gift rule applied to the group's own income and cash records, times the count, not the mean of full members' gifts. Rules: one model, two tiers; the CTO's Oct 14 ruling.
- **Governor share test** (`gov-two-level-governor-share-flaky`): the 0.15 bound stays. It is measured from the interval between the state's presidential split and the share the standing term predicts for the sitting executive's party, and the failure message prints place and seed. Rules: the merger's no-loosening rule; the owner's Oct 20 ruling that swings stay small.
- **Roadmap spec commands** (`docs-roadmap-spec-commands`): the builder writes the `command` values in its PR and never touches a spec's `test` text; `passes` is set only where the test covers the spec.
- **Out-of-town candidates** (`core-race-candidates-who-runs`): they run by the counted tier's existing rule (`countedCandidacyReasons` in `src/core2/modules/candidacy.ts`); the seat's holder weighs running again by `candidacyReasons`. Rules: one model, two tiers.
- **Discrimination complaints** (`justice-discrimination-complaint`): the commission orders back pay (the applicant's wage times the days they stayed jobless) and a civil fine, both paid by the employer on the journal; the fine comes from the law row, or a registered ESTIMATED parameter sourced to EEOC resolutions. The applicant files or not by the chooser, from their traits and whether they learned the reason. Rules: no dice; ask why.
- **Orientation** (`people-orientation-record`): full adults carry a recorded orientation from sourced shares, consistent with their household; counted groups use the place's same-sex couple share times the count. Applies the owner's Oct 19 pairing ruling.
- **Counted job choices** (`world-jobs-counted-choices`): a counted group gets the same offer list a full person would and is scored by the shared `scoreOffers` on the group's mean needs and traits; the members who act follow the selection weights times the count, with remainders carried to the next month and members chosen by trait lean, ties by id. Rules: one model, two tiers; no dice.
- **Health mechanics** (`people-stopgap-health-missing-mechanic`): the health engine exists; what remains is conditions beginning during life (incidence from prevalence by age) and injuries (exposure against the person's own line). Rules: no dice; sliding scales.
- **Mortgage rate after 2019** (`macro-mortgage-rate-fhfa-transition-index`): FHFA's MIRS Transition Index stands in from 2019-06, tagged ESTIMATED with FHFA's caveat in the citation. No owner question. Rule: estimate, never UNKNOWN.
- **Opening stances with no survey item** (`people-views-opening-stance-per-question`, the ballot-measure and approval items): such a question keeps lean times the question's axis, marked ESTIMATED with a spread. Rule: estimate, never UNKNOWN.
- **Unemployment work search** (`world-unemployment-work-search`): a claimant's weekly contacts are sized from their drive, traits and the regional labor market, not posted openings; the week's benefit scales with contacts over the requirement, up to the full amount; a place with no rule asks nothing. Applies the owner's Oct 20 ruling. Rules: no dice; sliding scales.
- **A player's unanswered plea or report** (`gov-stopgap-justice-missing-mechanic`): no choice by the deadline means no plea (trial) and no report; the engine never decides for the player.
- **Federal-only questions** (`gov-stopgap-world-legislating-missing-mechanic`): each enters Congress's pool only once it has a standing answer, members' stances and an effect reader. Rule: an effect is a read.
- **Local tax base** (`gov-withholding-local-exemptions`): build the personal exemptions from the law rows only; pre-tax paycheck deductions are not built, and the builder raises them as a question in its PR body. Rule: a game, not a spreadsheet.
- **Executive powers check** (`gov-stopgap-executive-missing-data`): a verification against Book of the States, NCSL and state constitutions; no owner question.
- **Private school choice** (`core-private-tuition-choice-reads-beliefs`): the Oct 20 ruling covers faith, views, distance and a child's care need; the town's private share checks the total and is never a per-family quota. Rules: no dice; sliding scales.
- **Credit lines** (`core-stopgap-parameters-estimated-industry-priors`): the 0.26 usable-line share (spread 0.15 to 0.40) checks totals only; whether a firm holds a line comes from the credit engine reading its books and owner. Rule: no dice.
- **Business shortfalls** (`world-stopgap-finance-estimated-mechanism`): an unfunded obligation goes into arrears and the owner chooses to put in cash, borrow, cut or close; the 27-day cash buffer checks totals. Applies the owner's Oct 20 money ruling.
- **Social Security** (`world-retirement-benefit-from-law-and-record`): build only the law's formula on recorded earnings; spouse, survivor and earnings-test benefits are a question for the owner in the builder's PR body. Rule: a game, not a spreadsheet.
- **Authored parts held until graded** (`words-authored-parts-shippable-sweep`): all 141 authored parts are flipped to not shippable, as the merge audit and the fixer PRs already do. The 20 director tests that relied on them assert on mined or graded parts, or that the scene stays out of play while its only line is ungraded. The lines go into the next owner grading batch, and the build does not wait on the grading. Rule: no hand-written player text.
- **The Freddie Mac survey exclusion** (`research-macro-sourced-parameters`): the exclusion ruled on #3959 stands. The mortgage rate after 2019 comes from FHFA's index, as ruled above for `macro-mortgage-rate-fhfa-transition-index`.
- **Residence room art** (`director-stopgap-scene-placeholder-art`): art work for the art pipeline, not an owner decision; the item stays blocked on the art.

## Oct 20: rulings (owner, spoken; recorded by the CTO)

- **Unplanned pregnancies** (#5220, `SG-PEOPLE-unplanned-pregnancy`): they happen to the people in the background as built, from each person's own records and the law where they live. Not for the player's own character or household. Nothing is shown to the player beyond what the world already shows.
- **A family moving away from an 18-year-old** (#5473, `SG-P15-moves-player-home-stays`): background households may split this way when it is cheap to simulate and as common as in real life. The player's own family does not leave the player before 1.0; the hold in `moves.ts` stays.
- **Unions** (#5302, #5415): unions, membership rules and strikes come after early access, with 1.0 (consistent with Oct 14). The union owner-decision rows are deferred to 1.0 and do not block the early-access build; public bargaining's pay-follows-the-budget part may merge without union leverage or strikes.
- **Unemployment work search** (`owner-unemployment-work-search`): recorded law, simulated. Claimants in the world follow their state's weekly contact rule in the background; there is no form or paperwork step for the player.
- **A new minority-party member's bill** (#5141): it can reach the floor the normal way, if it gets through committee.
- **How rivals campaign** (#5268): like real candidates of their kind, studied from real campaigns. A rich or self-funding candidate leans on paid ads and staff, a poor one on doors and volunteers, a known incumbent on press and record, an unknown on building name recognition. Rivals choose among the same campaign acts as the player, by their own money, standing and traits.
- **Bribe offers** (#5333): zero offers in a plain year is fine. Offers follow reputation: someone known to take bribes, or to trade favors for money, draws many more requests.
- **A town with no open jobs** (#5174): yes, the player is offered work elsewhere in the region (the outside employers).

- **The menu structure** (owner, from the menu study): the scene is home; menus are overlays that pause time with the room's people still visible. Bottom left: the player card, with the vertical icon rail above it (names on hover): Journal, Calendar, Money, Politics, News, People, Travel. News gets its own rail button. Options (settings, guide, quit to title) moves off the rail to the Esc key and the title screen. Clicking your own portrait opens You, with Work and study as its second tab. Politics: Government, Issues, Budgets, Parties, plus Your office only while you hold a seat and Campaigns only once you've filed. Alerts: a toast for news that just reached you, a dot on a rail icon for something unread, a scene when something needs you; no pop-up lists. Actions start from people, places and scenes, not menu lists.
- **The campaign day:** no "Today" list of acts. Campaign acts are scenes you go to (a venue for a speech, doors to knock, an interview, a debate); the Campaigns tab shows standing and polls only.

- **Why money exists for the player** (`owner-why-money-exists`): money is time, freedom and pressure, never a score. (1) Keeping a life afloat (rent, bills, the car, children) runs in the background and just has to make sense; it is not a budgeting game and needs no great depth. Missed payments still have real consequences (eviction, credit, family stress). Money trouble shows in scenes and in how the person looks and lives (a worn look when broke, a scene that breaks the wallet), not because everything is tied to the wallet. (2) Money buys time and risk: savings let a person quit a job to campaign, take a low-paying seat or survive a loss. (3) Debt makes a person a target: a broke official is who lobbyists and bribes go after. (4) Access, giving and scrutiny: money opens rooms (dinners, clubs, church giving), donations earn endorsements and favors, and officials' finances are public, so unexplained wealth draws investigations.
- **Election vote swings** (#4861): tone it down. A small appeal gap between candidates moves the result a few points, as in real elections; party lean, incumbency and money dominate.
- **A filled-in relative's cash** (#5468): follows their household's real income, not a share of the town's pooled money.
- **Private school** (#5483): beliefs, the schools nearby and a child's needs decide which families choose private school, not only money.
- **Memory** (`core-memory-election-log-growth`): after a year, keep the summary and reasons of the player's routine decisions, not every detail.
- **The Mac update dialog** (`core-stopgap-main-player-text-gap`): its words come from the English engine, like all player text.

- **Models (owner, Oct 20; replaces the Oct 15 "Sonnet only" rule):** a big cross-system job runs as an Opus lead session with Sonnet helpers: "start an Opus cloud session and allow it Sonnet helpers" (laws), then the same for the effect web and traits, "with 8 helpers". Builders and fixers run on whatever the owner picks for the job ("I can do 2 Opus sessions or 4 Sonnet"). The CTO may use Sonnet helpers for research and audits ("up to 5 Sonnet subagents").
- **Merging (owner, Oct 20; replaces "only the CTO merges"):** merger sessions merge (Antigravity lanes, Codex, Claude cloud mergers) under `.agents/skills/merger/SKILL.md`, each in its own share. The CTO audits their merges and fixes the skill when a merger slips ("Look at the mistakes Codex has made before on merges... Fix the merging skill"). Nobody merges their own PR; the CTO merges only its own docs, skill and pool PRs.
- **Usage (owner, Oct 20):** at 83% of the weekly limit he chose "wiring only, lean": the three wiring sessions keep going at three helpers each; pool builders and the pool feeder pause until the weekly reset or his word.
- **Agent instructions (owner, Oct 20):** keep every skill and doc current, create the skills the work needs and delete dead ones, following Anthropic's guidance; "this will help me perpetually."

## Ruled by the CTO overnight, October 14, 2026 (from standing rules; the owner may overrule)

- **Counted people keep about 30 bytes each in packed columns** (two-tier package) rather than being regenerated from the seed as the MEMORY-FLAT package said; the newer design meets the memory goal (heap after opening 766 MB to 451 MB) and the year halves (146 s to 72 s in Robbins). Conflict flagged; newest wins.

- **Town size (day-one audit):** a town opens at its real Census size; nothing pads it to 10,000. Follows one model, two tiers (counts must match the place).
- **Which place is the town:** the governing unit the player lives in, the one whose offices they could run for (the town, not the village inside it), from the place data.
- **A generated official's campaign past** holds an opponent, vote totals, promises and the result (#4190 built it); a date and a fixed share is a placeholder.
- **A law with two effective dates** (premiums collected from one date, benefits paid from another) carries both, each read by the engine that collects or pays.
- **The opening past** (falling-outs, favors, who held which job) may be seeded generation of what happened, consistent with each person's record, as the register allows for who exists; nothing after day one is a draw.
- **State party leaders** come from the whole state's generated people, not the player's town.
- **Tie by lot in a small race:** the state's statute from data where it names a size; else a registered ESTIMATED line (elections PR #4171).
- **Felony-barred share** on the voting-eligible base as published, an estimate with its source.
- **A named voter's single vote** follows a running account of their own voting record (sliding, no coin).
- **A primary where nothing separates two candidates** is still decided: voters read what does separate them (standing, incumbency, money, endorsements, name recognition from the press); a race is never left blank by most voters.
- **A child does not take up a cause:** drives read a person's age and standing on a sliding scale; a three-year-old with activist traits is a defect, not a personality (traitWeight 1.0 stands).
- **Tests of removed mechanics are retired** with the mechanic (replace, never layer).

- **The opening's sequence:** the president's address with the vice president and key people behind them, pointed out by name and office as the camera passes; then Congress; then your governor with a few important state legislators; then your family, if you have one (else skip); then into the game at home. Cutaways during the address follow the sentence's subject.

- **Election day is a scene.** The player goes to their polling place and marks a ballot there; the vote is cast in the scene, never in a menu. Firefly images already made may stand in for the place and the ballot while the screens are crude, on the kit.
- **Unions and strikes: 1.0. Police, the National Guard and the war design: 1.0;** specific questions may be asked later.
- **Ask why.** Every proof answers why, by record: why a vote was 5 to 0, why a person knew a law caused their smaller check. A session that cannot answer why has found a defect.
- **Knowing is a read.** Nobody attributes a change in their life to a law unless they learned of it: from the news they received, a conversation, a notice on the check, or an ad. Most people only notice something happened and grumble. A stance that cites a law must cite how the person heard of it.
- **Dev mode's Trace is the ultimate trace.** From any record, click every decision behind it: why a number was chosen, whose views and where they came from, who got the dollar, what they cut, how they learned, how they felt and which trait made them feel it, what they did or didn't do. Lightest weight: recorded reasons where kept, recomputed from the same seeded history where not. A report button writes the clicked chain so one Haiku agent can write the audit instead of ten.
- **Famous political careers are capability tests** (a bartender to Congress at 29, a governor to the White House): can the simulation produce the career from causes, never by script.
- **Grading batches may include lies and context.** The lie versions of lines are graded on the same axes, and a line may carry a made-up context scenario, on one condition: the simulation must be able to produce it. A scenario it cannot produce is a gap: search the register and the PRs for intent first, then flag it, never invent it.
- **Words (from grading batch 6, spoken):** lines must sound like people talk ("Where are you from?", "I'm from Washington. What about you?", "And you?"); a reply's second move must follow from its first (never "I'm from Washington. Have you talked to Omar?"); many variants of the same meaning so the player never sees a line twice; and the batches must cover legislation wording, journal wording, emotional register (happiness, sadness, arrogance, combinations), interviews, meeting speech and campaign lines, not one small-talk scenario. New lines are added to the grading page as other systems (press, debates) are built.
- **Slim the repository like a real game** before early access: unneeded files, tests of deleted or old-core code, duplicate tooling and documents go; the guards stay.

- **The world has a past.** History does not start on the day the player generates in. Laws in force carry their enactment history; the prior election for every seat exists with its campaign facts; officials have voting records from the prior term; the year before day one has a news archive; two seeds in one place produce different, recognizable pasts.
- **Public figures are known.** Everyone knows what the public knows about the president, the vice president, their governor, their representative and their mayor (positions, record, reputation), distinct from having met them; "you have never met" is never the only line.
- **The player's own context:** parents, their relationship, siblings, where the family came from and a few remembered moments are kept facts the journal and dossier render from day one.
- **Standard for the morning build:** the behind-the-scenes logic makes sense and every system works as intended; what remains is graphics, English and the human feel. The player can run for office, debate, read the news.
- **English calibration** may draw on everything readable (the web, books, Claude's own documents) to sound natural; nothing ships in dev speak.

- **The player casts their own ballot** (owner, Oct 13: "you should be able to cast your vote"); the engine never votes for the player, and a candidate's own ballot is theirs to cast.
- **A yes-or-no vote resolves from a sliding score** (CTO, from the sliding-scales rule, which governs causes, not the final yes or no): a deal offered to someone already in favor counts as accepted.
- **Filing under a party** requires being a member (joining reads the person's views against the party's positions, per the register's votes-from-principles ruling) or filing as an independent where the place allows it.
- **The executive proposes where the place's charter or constitution allows it** (data), and signs or vetoes everywhere (owner: "all of them").
- **Where the data has a primary date, the primary is held** (one rule, all places); Alabama county primaries skipping is a defect, not a decision.
- **Movements (from the proposal and the register's movement ruling):** in early access: marches, petitions, primary challenges, the player speaking, joining and founding; a person's lean may move over years from what happens to them and what they hear (realignment must be possible); the director gains public scenes (a rally, a march, a crowd, a speech to strangers); police, the Guard and the military as deciding bodies, boycotts and war are 1.0; a living retired leader keeps leading until they step down or die, then a similar successor inherits (the register).

- **What you know about a person:** faith and the rest come out only through what they say and do; the dossier shows what anyone would know (age, hometown, probably job), the rest emerges. The player's own traits emerge the same way, and people hold views on the player as they do on anyone.
- **Starting age:** 17 turning 18 is the early-access default; starting older (with a job, a home and a record) is allowed; the old client had a randomized-age control and may again.
- **Marriage and children:** the player has a household; how marriage works is not yet decided (the owner dislikes how The Political Process handles it). The world nudges the player toward politics: elections happen around them, and a player with a high-standing job may be propositioned to run for a seat someone needs filled (a Pendergast-style approach).
- **Money's advantage** is time: a good job buys more time to campaign and less at work.
- **A campaign day:** a handful of choices. **Debates are in early access.**
- **Speeches:** the player composes a speech by picking one of four parts at a time, as Suzerain does; the parts come from the English engine's speech acts and the player's own record and positions.
- **Writing a bill:** already decided in the Drive register (September 25 and 26, 2026): the bill-on-paper workflow. A subject index is navigation only; once a subject is chosen the bill itself is the workspace; the player selects provisions on the paper and a compact panel offers only the supported operations (eligibility, thresholds, funding, timing, reporting, replace or repeal, or ask staff for a revision); "add another section" adds a compatible typed component; the paper is the one authoritative draft. The catalog is "Legislative Content Menus, Proposal V1" (18 subjects, shared sections, operations raise, lower, expand, restrict, replace, repeal), scoped by the real-bill research. Then negotiate with named colleagues.
- **The executive** gets all of it in early access: appointments, the budget, vetoes, emergency decisions.
- **Time and scenes:** no skip-ahead control. The world runs day by day; scenes interrupt the player (major moments, filterable by kind), with short talk in the chat box between them; between scenes the player does the work through the interfaces. Scenes are the simulation's way of showing the character's view of what the player's actions did.
- **World setup:** a custom start lives in dev mode; a normal game has little preparation (RimWorld's amount at most).
- **Getting caught in a lie:** depends, as in life: the person's trust, and the press may or may not pick it up by its own reads.

- **Dev mode (the old "watch the world", to be renamed):** one mode where the owner or a player can do anything: pass or repeal any law at any level instantly, make any person or body take any decision, jump time, trace any record's causes, and watch the world run. "What if" experiments live here and are a player feature in early access.
- **Press:** the player can influence a paper and influence people; reporters are people in the world with their own records. Outlets have biases and owners: a landscape like today's (cable channels with a lean, a profile-writing magazine, an online opinion show, local papers), names generated, never real brands; owners are wealthy people whose relationships with politicians read into coverage of them and of their opponents, both ways. The world has to exist without the player: every outlet acts on everyone by the same reads.
- **Indictment and prison:** if the player is caught, the trial plays in scenes; then the player is gone for the sentence while the world runs, and may die in prison. The game is real, not raunchy: temptation and scandal exist (an affair, a payoff), told without graphic detail.
- **Capability tests belong in dev mode:** can the background world organize a protest, produce a demagogue, in rare cases overthrow a government, produce a realignment on the scale of 1933 to 1945, or drift toward a war? Real politicians' lives are tests of capability, never scripts.
- **The reward loop** is the effect of the player's actions on the simulation over time.
- **Square pegs:** when an engine or feature the owner asks about does not exist, the CTO says so plainly instead of fitting it into something else.

- **Ballot measures:** in early access. The player's main interaction is voting on them (and campaigning for or against through the existing campaign paths); writing one is not for early access.
- **Recalls:** in. Rare, from causes; the player as an officeholder can be recalled.
- **Interest groups and corruption:** in. The player is approached (support with strings, a bribe with a real risk), but never through hard-coded situations. The engine's causes must be able to produce what real corruption cases, books and films show; real cases are stress tests of capability, never scripted scenarios.
- **Constituent cases:** exist, but 95 to 99 out of 100 happen in the background; the few that reach the player are the ones their record makes theirs.
- **Faith (the beliefs engine):** has a place. For some people it shapes votes and relationships, for some it is a view, for some it is surface; the weight is per person from their record. A player may lie about it privately (say they are religious when they are not), through the existing lie.
- **Congress is in early access.** Same engines as every other level.
- **The player's money:** a basic rent or mortgage, maybe college debt, money into one's own campaign; never a scoreboard (see Open).
- **No game over.** When the player dies or steps away, a summary in the manner of Crusader Kings 3; continue as anyone in the world, keep watching the world, or start a new game. Dynasty play is in: an heir can "ride the wave of my movement" (the owner's long-standing example is RFK's Indianapolis speech).
- **Wealthy families on day one:** generated, realistic, with real power (old money, media owners, developers), from the wealth tables; they appear as donors, employers and rivals. Fortunes also grow in play.
- **Starting or buying a business:** 1.0, not early access. An owner sees the books.
- **The economy must answer "what if":** a player should be able to test a sweeping change (the owner's example: government raises every public salary to a $70,000 base) and see whether private employers follow, through causes, not a script.
- **Business and roles database:** private businesses may be simulated from a large calibrated database of business kinds and roles with real starting pay (public occupation and county business tables), moving with inflation and the economy; public institutions are full records; chains and tycoons emerge, no scripted chains, no real brands.

- **Business taxes:** the employer's payroll tax share, unemployment insurance, profit tax and property tax on premises exist as money flows read from the law in force, adjustable by legislation, with no step for the player.
- **Costs that leave town:** recorded, and paid to a business in town where one sells the goods, else to the outside account as such.
- **Counted workers' quits** keep no reasons (bookkeeping is a debug switch).
- **A new opening's pay** reads the region's pay level and the wage floor in force, sliding by role.
- **Filing:** no fee or petition mechanic; filing happens where the place's records say.
- **Starting politics:** seeded generation of who exists and of a person's starting lean is allowed; every vote and donation is decided by the person's reasons.
- **Turnout** is a sliding propensity from causes, never a yes-or-no coin.

- **Evictions without courts:** an eviction completes after the state's notice period from the law in force; the household moves as the housing engine moves leavers. No court scene until courts come.
- **Ties:** follow the law of the place; where it says lot, a recorded lot from the world's generator.
- **One elected seat and one appointed post at once:** the law of the place decides (incompatible-offices rules in data); where it allows, allow.
- **Family hires:** not banned. The relationship is a recorded reason of the hire; the press and views read it.
- **Repealing a fresh law:** the body's own rules from data; where none, a sliding reluctance from how recently and by how much it passed. No fixed cooldown.
- **Treasuries:** spend what the legislature appropriated, through the engines that exist; taxes and benefits are set by bills that change the law in force; the books balance in the background and the player touches money only by legislating.
- **Generated versus simulated people:** every named official (governors, Congress, cabinet, town and state officeholders) is a full person with a campaign past from day one; everyone else is counted until the player meets or clicks them, then built from the records and demoted when they leave the player's life.
- **Sources for tuning:** copyrighted writing may be read to calibrate the English engine; only public-domain or permissively licensed text ships verbatim.
- **Sub-agents:** three Haiku, two Sonnet or one Opus per session, for parallel work or research only; audits run as an Opus session with up to ten Haiku tracers and one Sonnet verifier.

## Rulings, October 14, 2026, morning (owner, spoken; recorded by the CTO)

- **Replacement means every role.** When anyone dies, leaves or is removed, the role is refilled by whoever fills it in life: an outlet hires a new reporter, a business hires a new clerk, an organization names a new chair, a seat follows its vacancy rule. No role stays empty because its holder is gone. The press engine's refill (#4180) is the pattern for every engine.
- **The journal is a dramatized story, not a list of facts.** It reads like a memoir: "When I was seven my dad died; I had no idea how much that would shape my life." School years are not entries unless something happened in them. Entries are procedural and revised later: an uneventful high school chapter gains "except for one person" twenty years on, when that friend becomes important. Running, winning, losing, deciding to run are entries. "The bill passed" is not a chapter about a son. No entry is a lone event with no story around it.
- **Bills follow the real form.** Numbering, title, sections and enacting language follow the norm for that body, as a real bill reads. The player edits only the terms (the amount, the date, yes or no on a provision), each a clickable field; the rest is written by the engine. Hearing minutes are fine as minutes. A notice from the election office is the kind of thing the newspaper prints.
- **Businesses are generated with real-sounding names.** Not "general store" (not what Americans say) and not real brands: generated chains and local names, with real people in them.
- **Anything the tracer cannot answer is a dev-mode item.** A legislative vote shows each member's reasons; a business closing shows its books; a budget cut names the law and the line's history; a person shows job, pay, hours and spending.
- **Why, every time.** Recall petitions against every board member at once, a legislature passing its whole year on one day, a nineteen-year-old cashier with $9,900 saved, a governor unopposed, a defeated state House member with no next chapter, every winner taking office on January 1: each is a defect until the record answers why.
- **Statewide races draw statewide candidates.** The state's party leaders and officeholders are the pool for governor, lieutenant governor, attorney general and the like; a race with only the town's people weighing it is wrong.
- **Taking office follows the law of the place**, from data (constitution or statute, cited), not a single date.
- **Legislatures meet on their calendar.** Bills are heard and voted across the session days the state's calendar gives (#4173), never all on one day.
- **An every-place runner.** The dev system runs every one of the 56 places at once for a number of years and reports every crash and broken invariant with the place, seed and stack, so a failure in one place is found before a player finds it.
- **A graded part withdraws the rest (owner, Oct 14, 2026, morning).** When the owner grades part of a words batch, the ungraded remainder is withdrawn, the engine applies the grades to every line it produces, regenerates the whole batch, and only then is a new batch put in front of him. A batch that is still repetitive is not ready; the pipeline carries an automatic repetition guard with its thresholds in the parameter table.
- **The CTO asks why before reporting (owner, Oct 14, 2026, morning).** A report of what the engine did carries the cause from the code or the record for every number and every repeated pattern, found by the CTO before the owner has to ask. The owner should not have to list the gaps; a lopsided total, a constant, a repeated date or a tiny balance is a question the report answers.
- **Sessions never send messages (owner, Oct 14, 2026, morning).** A cloud session never calls send_message, send_later or any trigger; those prompts block it. Everything a session has to say goes in its PR body (top section, newest first) and its status file. The CTO reads PR bodies and relays.
- **Play how you want (owner, Oct 14, 2026, morning).** The player chooses what stops them; the important few stop by default, everything else runs in the background and still counts. Any act of office can be done or simulated; simulating never costs what doing would not, the player lives with the result; doing gives control and the consequences of what is said. The player chooses how often they go home to the district, sit in a cabinet meeting, or fly somewhere to meet people. Local, state and federal are one game and never exist independently. Package: `docs/packages/office-play.md`.
- **Homelessness is a factor (owner, Oct 14, 2026, morning).** A person who does not work and does not pay loses their home like anyone else; the player's household too (default yes, owner-decision stopgap until he rules). Not being homeless is a motivation the drives read, for their own reasons, sliding by traits. Homelessness exposes a person to drugs, violence, illness and death through the health engine, from causes. Package: `docs/packages/homelessness.md`.
- **Reporters and outlet owners do not hold office (CTO ruling, Oct 14, 2026, from the 56-place audit; owner to confirm).** Candidate filing follows this ruling under `SG-GOV-press-office-owner-confirmation`; confirmation remains open. A working reporter or the owner of an outlet may not hold an elected or appointed office, appoint officials or run while employed by the outlet; they resign the job or the race, as real outlets require. Found: reporters on councils in Idaho, Iowa and Kentucky; a reporter in South Dakota's mayor's seat appointing the city administrator.
- **The desktop package updates itself (owner, Oct 14, 2026, late morning).** The owner plays the desktop package, not the bench. The app updates like a normal game: changed files come down, old ones go, no new download of the whole package. Open: a signed and notarized mac build needs the owner's Apple Developer ID (owner-decision stopgap on the PLAY branch); Windows and the unsigned mac path work without it.

## Rulings, October 14, 2026, afternoon (owner, spoken; recorded by the CTO)

- **A purpose phrase per policy.** Each policy in the bill catalog carries one purpose phrase as data, authored once at development time and graded in a words batch like any line; a bill's title reads from it. A bill may cover several areas: it is a set of sections, each a provision, and a member may trade a vote for support of an amendment, add a poison-pill amendment, or ask a favor through the deals engine.
- **A local measure has its own form.** A town or county ordinance reads as an ordinance (number, enacting words of that body, sections, effective date) from public-domain municipal forms in data, never the federal short-title form. The owner recalls this was approved earlier in the Drive record.
- **Bill text is real and the player edits its terms.** A section reads as a real section does ("This section reduces the amount the Department may pay a state agency for the costs of SNAP administration to 25 percent."), composed from the record: the series, the old value, the new value, the statute cited from data. What the player can change is obvious and clickable: the number (25 to 25.2 percent), the date, and the shape of a term (a flat rate or a graduated schedule). The player edits sections of a believable bill; the engine writes the rest.
- **Arrogance, anger and fear have words.** Boasts, threats and alarms are mined from public-domain speech like the other registers, plain and rude versions included; the director decides who says them from traits.
- **Four dynamic choices, always** (replaced Nov 10: up to four, all different, the scene sets how many). A conversation always offers four replies ranked by the engine, with "say nothing" as a smaller control beside them, never one of the four. A reply's second move follows from its first.
- **The director and the English engine come first now.** The owner wants both substantially done before his usage limit; other work continues but yields to them.
- **A screen's look ships only on the owner's screenshot (owner, Oct 14, 2026, afternoon, after the first Mac playthrough).** No change to how a screen looks (the title, a panel, edges, a backdrop, a control added to a screen) merges without the owner approving a full-window screenshot in the PR body. The title screen follows the Oct 2 and Oct 8 rulings: a recognizable national civic scene full-window, the menu in the approved Kit 13 panel, no version string, no place search on the front. The Oct 14 title (black window, boxed panel, Place field, version string) was never approved and is replaced.
- **The owner does not read PR bodies (owner, Oct 14, 2026, afternoon).** Anything meant for the owner (a question, a screenshot to approve, a result) reaches him through the CTO in the chat, in plain words or as an image. A PR body is for the sessions and the CTO; "OWNER DECISIONS NEEDED" at its top is the CTO's cue to bring the question to him, not a message to him.
- **A words batch tests the engine, one axis per item, across different scenes (owner, Oct 14, 2026, evening).** Each item shows the full context or trace that produced the line and tests one thing: a word chosen by a trait, an opening and closing combination, a choice set (the four replies, the lies, say nothing) for the owner to mark which are good here. Thirty items are thirty different scenes (a legislator arguing, pork barreling, a wedding, a council meeting, a rally), never the same closer thirty times. A phrase that needs one grade ("Madam Chair") appears once. Three places with nothing differentiating them is wasted usage: one place, with real local laws passing, so the conversations differ.
- **Bills get monikers (owner idea, Oct 14, 2026, evening; for the Next list).** People call a bill what people call it (Obamacare, the bottle bill, the One Big Beautiful Bill), and a bill can be named in honor of someone (a president lost to drugs, the drug bill in his name). The engine never says a policy's catalog name literally ("I'm committed to 'bottle deposit'"); it says your bill, what it does, or its moniker, in many wordings from the speaker's views.
- **The title and New game, as settled (owner, Oct 14, 2026, evening).** The menu is New game, Continue, Options, Patch notes, Quit. New game opens the choice: Start a life, Custom world, New world. Then the creator: name, age, birth. No seed field, no place search and no customization on the title itself. The Oct 13 front with Seed, Place and Customize the world on the menu was the bench, not the game, and is not the settled title.

## Ruling, October 14, 2026, evening (owner; relayed by the CTO)

- **Sessions don't wait on GitHub Actions.** Each session runs its gate in its own session, on the files it changed only: typecheck, eslint, prettier and the tests for those files, never the full suite. A new file nothing else reads needs no run. The result goes as one line at the top of the PR body, and the CTO merges on that line.

## Ruling, October 14, 2026, night (owner; relayed by the CTO)

- **The art bench is removed; only the game client ships.** The private hub and controller (Art Desk, Agents and Settings tabs, the Follow main source selector), its packaging and smoke scripts, its update worker and received channel, the `internal-art-review` build profile and its CI row, and the Art Desk and art bench dev tools are deleted, not hidden. What remains is one desktop app: the game client, opening on the title screen, updating itself from GitHub Releases. The Mac package is the one that must pass; the Windows row stays allowed-to-fail (`SG-PLAY-windows-package-allowed-to-fail`) until early access.

## Owner rulings from the Oct 14 night playthrough (recorded by the CTO)

**Checks run in the session (owner, Oct 14, evening).** A PR merges on the builder's gate run in its own cloud session over the files that changed: typecheck, eslint, prettier and the tests for those files, written in one line at the top of the PR body. Never the full suite. A new file nothing else reads needs no run. GitHub's runs are not waited on; the Mac package still builds on GitHub's Mac machine because it must.

**Only the game client ships (owner, Oct 14, night).** The art bench, the private hub and its Art Desk, Agents and Settings tabs, and the art-review build profile are removed. One desktop app: the game, opening on the title, updating itself from GitHub Releases, packaged for Mac.

**Day advances time; scenes stop it (owner, Oct 14, night).** Pressing Day never opens a list of mundane choices ("Take it easy", "Take care of X", "Call X", "attend-school"); those are removed from the game. Calling or visiting a person happens from that person. What stops time is a scene the director fires from the simulation's records. A player may advance a day or a week and click around (meetings, people, places) when they want to; before the player holds an office the days are mostly quiet, and holding office is where day-level play (policy, talking, negotiating) begins. Options must not need a dozen interrupt toggles; the director decides what interrupts.

**Scenes are the narrative (owner, Oct 14, night).** The President's address at the opening is the model: the director reads the records, picks from everything the simulation supports the scenes that apply to this person now, and fires one, told by the English engine. A scene is a rendered moment with place and people (a mother asking the player to sit down: a divorce, a lost job with hope for another) and its consequences play out over the following months through the engines (money tighter, a better job, a new partner met at work). Then play returns to the ordinary game. A parent interrupts the player when the simulation says so ("did you do your homework?"), never on a schedule.

**Conversations (owner, Oct 14, night, answering the CTO's twelve questions).**

- A talk starts from the place and the occasion, then from the biggest recorded event of either person or from the relationship (Q1: C).
- A talk has one main topic with side remarks, and one topic may lead to a related one (Q3: A and B).
- A listener brings up news they received first; public news only if they follow politics closely (Q4: C).
- Family at home: the director picks the scene that applies from the household's own records (money, work, school, health), and it has consequences (Q5: by the director, from records).
- A quiet day is quiet: the player can skip days at a time (Q6: nothing fires).
- No cold "How is X?" questions about people not in the room unless something recorded happened to X (Q7: A, the CTO's reading of "mundane shit" being out).
- How long a talk runs (Q2) the owner did not rule on; the CTO rules C: a talk runs until its topic is done, the other person closes it, and the player can start another.
- Q8 to Q12 the owner said his words answer; the CTO reads them as: character shows (Q8: B and C), scenes for what matters and a plain text exchange for the rest (Q9: C), replies that matter in the scene with one "listen" and one "ask more" (Q10: C), a journal line for a talk that mattered (Q11: B), and memory of the last talk (Q12: C). Owner reviews by playing.

**The player's choices are the player's (owner, Oct 14, night, restating the register).** Advancing the calendar made a 17-year-old a barista and the owner of a house without a choice. No engine accepts a job, a home, a filing or any choice for the controlled person; the engine offers, the player decides. The household's home is the household's, shown as such.

**Who you are is a character screen (owner, Oct 14, night).** Portrait, name, age, birthday, home and family, school or work, traits and views in words, money in one line, like any game's character screen. Law effects on the player belong under Politics, written as sentences, never as keys with "undefined".

**Scenes carry the consequential dialogue; the day screen carries the dealing (owner, Oct 14, night, 9:25 p.m.).** A scene has a goal, is told as a narrative with the player's character, the narrator (already settled: second-person scene narration, first-person "My life" journal, grounded in records, register line 160) and the other people, and its dialogue is consequential: a family scene at home, or a tense floor vote where the goal is to convince one member to vote no on the amendment (the owner's example: McCain and the Obamacare repeal). The day screen is for dealing: "I'll do this if you do this", negotiating, talking with people, policy. The director fires a scene when the records make one apply; the scene plays the moment out, then play returns to the day screen.

## Oct 15, morning: batches grade content, not only wording (owner)

- **Situations, not just semantics.** A grading batch exists to put varied content in front of the owner: different situations, scenes and lines with their context, so he grades what the game can say and about what, not only whether a sentence is well formed. A batch of thirty scenes where the same two or three situations repeat (a job started, a daughter born, a roll call) is not what he asked for.
- **Proof scenes are allowed.** A scene or line may be sent for grading before the director fires that situation in play, as long as the English engine composed it from a real record and its context in a played world ("okay, it can generate this line along with context"). The batch says which scenes fired in play and which are composed proofs of a situation the director does not yet fire.
- **Feed the engine.** The Words session's job is also to give the engine pieces to work with: new situation types, occasions and banks, mined and registered the usual way, so each batch widens what the game can say. The Words session reads what the director does (`src/director/`) and builds on it or extends it; it does not wait for the director to fire a situation before the words for it exist.
- The CTO holds a batch whose scenes are mostly repeats of the same few situations, the same way it holds one with record defects.

## Oct 15, afternoon: usage (owner, repeated; now written)

Replaced on Oct 20 (see "Oct 20: rulings"): Opus leads with Sonnet helpers are allowed, and merger sessions merge. Kept below for the record.

- Sonnet is the only Claude model that builds, reviews or merges. No Opus sessions or sub-agents of any kind.
- The CTO session answers the owner and prepares orders, rulings, skills and reports. It never merges, reads diffs, logs or test output, runs tests, creates PRs or holds PR subscriptions; a Sonnet helper does those and returns a table.
- Recorded in `.agents/skills/cto/SKILL.md` under "Usage rules for the CTO session".

## Oct 15, afternoon: stale questions closed

Fifteen questions were shown to the owner as open; most were already ruled or built. Each is closed below with where the answer lives. Stopgap rows are resolved and their pool items are done.

- Demotion days (core-od-demotion-days): NEW RULING, owner, Oct 15: "The days without contact before a met person drifts back into the counted population is a per-world range of 180 to 240 days, drawn once per world at generation (seeded generation is allowed), never a single fixed number." Built in `demotionDays`.
- Relatives of a met person (core-od-fill-in-outside-kin): BUILT. `fillInPerson` rebuilds the past with `buildDeepPast`; relatives elsewhere are husks filled in when met.
- Towns above 10,000 (core-od-town-size): DECIDED. "a town opens at its real Census size; nothing pads it to 10,000." The code's cap still needs to follow.
- Trusts (core-od-trusts): GENUINELY OPEN. No ruling found; estates go through probate.
- Windows package (core-od-windows-package-allowed-to-fail): DECIDED. "the Windows row stays allowed-to-fail until early access."
- Player offered a post (gov-od-player-offered-post): DECIDED. "No engine accepts a job, a home, a filing or any choice for the controlled person; the engine offers, the player decides."
- Party loyalty data (laws-party-loyalty): GENUINELY OPEN. Parked on the data's non-commercial license.
- Ballot stop (office-od-ballot-stop): DECIDED. "the engine never votes for the player"; election day is a scene at the polls.
- Kit 12 or Kit 13 (owner-kit12-vs-kit13): BUILT. The play page is on Kit 13 (`src/bench/play.css`).
- Opening key people (owner-opening-key-people): GENUINELY OPEN. The owner said he would clarify; ranked from the offices data until then.
- Why money exists (owner-why-money-exists): GENUINELY OPEN. The owner has not settled the reason.
- Town districts and wards (people-od-town-districts): GENUINELY OPEN in writing. No ruling found in the register, these rulings or the prior-rulings digests, though the owner recalls deciding it; he is asked to repeat it once and it is recorded.
- Who sees a business's books (world-od-business-books): DECIDED. "An owner sees the books."
- Player eviction (world-od-player-eviction): DECIDED. "loses their home like anyone else; the player's household too."
- A loser's podium and bill carrier (not in the pool): DECIDED. Confirmed by the owner in the Oct 14 entry above; both work through the existing conversation.

## Oct 15, afternoon: rulings

- **Trusts (owner, Oct 15):** simulated in the background so estate and inheritance taxes work correctly: a trust holds assets, passes them outside probate, and the taxes in force read it. No player-facing mechanic.
- **The opening's key people (owner, Oct 15):** the president and vice president; the state's legislators; the most powerful person in each chamber (the one chamber where a state has only one); and the player's own representatives (their council member, state legislators, U.S. representative and senators). Nothing else is "key" at the opening.
- **Built: the opening's key people (core-opening-key-people).** One list (`src/core2/opening-key-people.ts`) feeds the opening and the Politics screen: the president and vice president; every sitting legislator of the player's state; the most powerful person in each chamber (the Speaker of the House, the Senate majority leader, and each state chamber's Speaker or president pro tempore, from the chamber leadership data's assignment authority); and the player's own council members, state legislators, U.S. representative and senators. The governor is not key under this ruling, so the opening no longer points him out. Question for the owner: the Politics screen now lists every state legislator by name (hundreds in some states); say if it should list only the leaders and the player's own.
- **Why money exists for the player (owner, Oct 15): not settled yet.** Until then money accumulates and is spent on rent, the household's costs and the things already built; nobody builds a scoreboard or a sink on a guess. The owner notes the spending side is probably not fleshed out either: pool item `core-player-money-spending`.
- **Town council seats (CTO ruling under "one rule, all 56 places" and "estimate, never unknown"; the owner said the question was asked wrongly):** each place's council or board is elected the way its own records say (at-large, by district, or mixed, from the place's data where the repository has it), estimated as at-large with a per-world spread where it does not, marked as an estimate with its source. "Wards" is not a term the game uses except where a place's own records use it. The state House districts stay what a resident's district means for state races.
- **Party loyalty data (CTO recommendation; owner to confirm):** do not use the Shor-McCarty dataset (its license forbids commercial use and the game is a commercial product); calibrate state chambers' party loyalty from each legislature's own public roll-call records instead, which are public records.
- **Before a stopgap or an owner decision is registered, the register is read (owner, Oct 15):** quote the ruling instead of registering a question that was already answered. See AGENTS.md, "Placeholders".
- **Any agent with repository access may take pool items (owner, Oct 15):** Claude, Codex, Cursor, Antigravity or any other; the pool's claim rule is the only coordination; merging stays with the CTO.
- **People art:** the layered figure set (art/people-engine/v2/) is the owner's ruling of Oct 15 (he rejected the cut-out people and approved the 'make it once, right' brief); the Oct 12 whole-figure ruling is superseded.
- **Town size:** the audit could not find the 10,000 cap in current code; the pool item core-town-size-census is to verify first and close if the cap is gone.

- **Party loyalty calibration (owner, Oct 15):** the Shor-McCarty state legislative data may be used to calibrate the state-chamber party-loyalty parameter. Nothing from it ships in the game and no in-game citation is needed; it is one calibration input, weighted against each legislature's own roll-call records. Owner, later Oct 15: no credit, no note, no lawyer's look; calibration from a source is like an author being inspired by a book. Use it to calibrate, literally.

- **Moving time (owner, Oct 15):** the Day button and a Week button advance time. On the calendar, clicking a future day shows a small skip-forward icon or button (no 'skip to event' label); pressing it runs time to that day. A scene stops any advance. Until the director's scenes carry play, these are the only ways time moves; the Day and Week buttons are not meant to be the primary way once scenes do. The ruling of Oct 14 ('no skip-ahead control') is superseded by this one.

## Oct 15, evening: batch 11 grading rulings (owner)

- **A scene has an endpoint.** It exists for something: money, a bill, or the player's political life. The batch page says what each scene is for. "Where do you work" between relatives is not a scene. Family talks are personal scenes only, since the family has little involvement in play for now, and lines like "Have you talked to Diana?" do not belong in one.
- **The narrator sets the scene.** A few sentences of narration set it up; then the characters play it out. Two short narrator lines ("Your son is with you." "You got a job.") do not set a scene.
- **A reply continues the conversation.** "All right" and "Okay" as answers to "How's Keanu?" are not how conversations work, even when grammatical. The four replies each move the talk somewhere.
- **Journal lines carry their subject.** "My father was elected mayor" (the office), "My daughter Jane was born" (the name), and "Little did I know" needs what. "That was a turning point" only when the record shows it was one.
- **Speeches are built as the player gives them (the owner's Suzerain example).** Short openers and closers, then longer, meatier choices at the core of the speech, on different subjects. A four-line rally is not a speech. The rally's choice set (batch 11 scene 16) is the shape to build on. "Thank you very much" over "Thank you so much" in a speech.
- **A bill has a real name, not a description.** "Allow multifamily in single family zones" is a description. Its text is shown next to its title in the batch.
- **A lie about where you are from names another place** ("I'm from Bloomington"), never "Not here." Nobody says a date in speech ("I talked to Diana on November 13").
- **"Say nothing" is dropped from grading.** School, workplace, notices and public hearings are graded enough and are not sent again until something new is said in them.
- **Calibrate dialogue from anything:** English books, other games, the whole internet. The owner does not accept "it's hard" when the patterns are everywhere.
- **The text rule (owner, Oct 15, evening):** the owner never ruled that a shipped sentence must appear in a public-domain record; that was the Words session's own habit. The rule is: the banks in `data/english/parts/` are built at development time by writing pieces to the calibrated patterns, drawing on any source for the patterns (books, games, transcripts, the internet) and copying no one's copyrighted text; the English engine arranges the pieces at play; no text is typed into screens or code. Public-domain records remain a fine source of pieces, not a requirement. The 'two documents, one public-domain' attestation rule is withdrawn.
- **Grading grades the engine, not scenarios (owner, Oct 15):** batches grade pieces by move, register and bearing (greet, deliver news, condole, ask, answer, deflect, promise, close, and the rest), each shown with the slots it fills, so one grade carries to every scene that uses that move. Once the grammar is calibrated, the CTO brings finished composed scenes when the engine has enough graded pieces to compose them properly, a few at a time; then the same scene composed for different personalities (traits), graded for whether each person sounds like themselves. Nobody grades an assassination scene and then a financial-crisis scene as one-offs.

- **The Words session's model (owner, Oct 15, evening):** the one exception to Sonnet-only. The Words line (the English engine and the director) runs as an Opus session at medium effort, because taste, variety and naturalness are the product there; it may run one Sonnet sub-agent for the engineering (coverage table, bench script, calibration table, gate changes) while Opus does the writing and reads the bench page before the owner sees it.

- **Storage override in the cloud (owner, Oct 15):** builders, mergers and checkers in cloud environments set `OCD_STORAGE_OVERRIDE` themselves and never ask the owner to verify it.

## Oct 15, evening: batch 12 rejected; what a scene is (owner, relayed by the CTO)

Recorded whole, as the owner sent it.

- **Batch 12 is rejected.** It is the same material as batch 11 with personality variants: "Do you remember Newark Charter School?", "Have you talked to X?", a death of someone the player does not know, replies that are "Yes" and talks that end with "Talk to you soon." Repeating the same situations with five profiles is not content. The owner will not grade another item of that kind. Every item of the form "do you remember <school>" is removed from the banks and the catalog as an opener unless something recorded happened to the school or decades have passed and the record shows it.
- **What a scene is.** A scene has a setup, a person with a purpose, and stakes, and it plays out:
  - Narrator: While you're preparing for the committee meeting, Senator Menendez walks in.
  - Menendez: Do you have a minute?
  - You (one of four replies): I'm really worried about this vote. I know I told you yes, but this time I can't do it.
  - Menendez: (answers that, with his own stake)
  - ... and it continues until the purpose is resolved or refused.

  The narrator sets the scene in a few sentences. The other person opens with a purpose. Each reply carries a stake and moves the exchange. A yes or no never ends a talk; the asker follows up. Nobody closes with "Talk to you soon" after a question was answered. Where in language does "Do you remember the school?" "Yes." "Okay, bye." happen? Nowhere; that pattern is a defect in the conversation rules and is fixed at the root before anything else is built.

- **What to build.** Scenes the game will actually play, drawn from the golden path and the political life: a colleague asking for your vote; you telling a colleague you can't vote yes after all; a member asking you to carry a bill; a donor or a party chair asking for something; a reporter at your door; a constituent at office hours with a problem; a family member reacting to your filing, your win, your loss or your absence; a campaign volunteer or opponent at a rally; the mayor's desk with a bill waiting; a staff member bringing bad news; a council member bargaining over a section. The director's catalog gets these as situation types with roles, purposes and stakes (no sentence text in the catalog). Where the cached world does not fire one, stage it as a proof scene from that world's real people and records, as Order 2 allows, and say so on the page.
- **Reusable pieces.** Author the dialogue so a piece serves many scenes: "Do you have a minute?" opens an office visit, a kitchen talk and a campaign stop; "I know I told you yes, but I can't this time" works for any vote, favor or promise; a refusal, a plea, a threat, a boast, a condolence, a deflection each serve every situation with that move and key. Tag every piece by move, key, register and bearing so the engine arranges it anywhere. Write to the calibrated patterns from any source (the text rule of Oct 15); copy no one's copyrighted text.
- **The next page.** Batch 13 is the first page built this way: at least thirty different scenes of the kinds above, each a full exchange as it would appear in the game (narrator paragraph, the opener with purpose, the four replies with stakes, the other person's answer, on to the close), composed per personality where it changes the words, with no two scenes sharing a situation and cast and no two reply sets alike. Use the grading-bench features (move, register, bearing, traits, length, pieces) on every line. Tell the owner in this chat when it is ready, with the place, the count and the list of situations, and the path `docs/grading/words-batch-13.md`.
- **Process.** Claim pool items with `npm run pool -- claim <id> --branch <branch>` before building. Ask the owner in the chat, in one sentence with your default, whenever a design is his call.

## Oct 15, night: batch 13 review, the rulings for batch 14 (owner, voice notes)

The owner reviewed scenes 1 to 28 of batch 13 ("a solid step forward") and asked for the rest to be reworked to these rulings as batch 14. Most grading arrives as voice notes; taps on the page are grades of the sentence alone (a 3 means the sentence is fine but the context is wrong).

- **Introduce people before they speak.** The narrator says who someone is and why they are here ("You arrive for the interview Michael Howell asked for; he writes for Weom"). Nobody is addressed by an outlet or a record name the player has not been told ("Got a minute for Weom?" reads as a place).
- **A reply fits the line it answers.** "Who's your source?" only answers a claim; "Let's not get ahead of ourselves" and "I'll be at the doors this weekend" did not answer what was asked. A follow says what it means ("We have it on the record" is what "who's your source" was for: say that directly).
- **Plain words, no trade or dev language.** "Canvassing" or "door knocking", never "the doors"; "campaign signs", not "the signs"; never "gaps", "settled", "That's not an answer" when it was one.
- **Say why.** A plea gives its stake ("I need to bring something home to my district", "I could lose my primary over this"); a bargain names the trade ("this is a two-way street", "I'll need your vote on my bill"); "Make it smaller" names what; "I need a few days" says "to think it over".
- **Threats sound like politics:** "You'll need friends after this vote. I won't be one." (graded 5), "The party has a long memory.", "You know how this works." Not "I'd think hard about that." or "Remember this conversation." (graded 1; "I won't forget this." is better).
- **Scenes run as deep as the moment needs**, five to ten exchanges for a contentious one; a scene does not end at "Deal." when there is more to settle (where the votes are, what the count is).
- **Auto-replies.** The player's character may say a line the player did not choose, to keep the talk going before the real choice ("Attorney General? Why me?", "How did you know?"), and the other person answers it ("Kelly at the clerk's office told me").
- **A request needs its ground.** The party asks someone to run only with some inroads on record; a donor who leans on you gave a large share of your money ("you owe your career to me"); "I'll take the meeting" only after a meeting was asked for.
- **Bills.** Titles from the records need work (later); a scene may also call a bill by what it is ("the infrastructure bill").
- **Trees and endings.** Scenes become trees with several branches and endings (up to about ten per scene as the engine grows); the scene stays the same, the words and the people's memories change with the path.
- **Variety.** Even good lines turn robotic when the structure repeats; vary openers, closers and the order of moves.
- **Family:** a filing scene asks how they found out before it asks why; a win may say "Mr. Commissioner"; promises like "This weekend is ours" belong after a few exchanges, not as the first reply.

## Oct 16, early morning: batch 14 review and standing instructions (owner, voice notes)

- **Ungraded is not rejected.** Lines and pieces the owner didn't grade aren't rejected; the good ones go into the game as simulation pieces. "We're not authoring scenarios. We're giving the simulation pieces to work with." Track them as pool items (word packs), and get the engine to a state the CTO can merge ("engine part one").
- **The one-scene, tap-to-reply page is right** ("Amazing"). Keep that format.
- **Every scene is different and tests something different.** Three scenes of one purpose with the same lines is a regression; a batch draws on what the director and the world actually produce, not the same staged ask again.
- **Replies are too vanilla.** After the first exchange, the options must not rehash the first options; they move the talk on (for example "They'll see when I vote", ending it, or a lie). Contentious exchanges are good.
- **Calibrate replies on real exchanges.** Interviews: 60 Minutes transcripts and Firing Line (Margaret Hoover). For every scene, find how real people say it (a confronted lie, a volunteer after a rally). The owner allocates one more Sonnet sub-agent, for research only.
- **Specific lines.** "I'm not going to talk about that" is unnatural. "Then put this in the story: I'm proud of my vote" is wrong before the vote. "I'll have something to say after the vote" is the most natural. "Your vote is public. Your reasons don't have to be a secret" is great. Caught in a lie: "You're right, I shouldn't have said that" sounds like AI; "People say a lot of things" is decent; "Then {source} has it wrong" is good. The three-way choice (an off-ramp, doubling down, or honest but combative) is right.
- **Volunteers.** "They loved you up there. What do you need from us this week?" is an awkward jump: talk about the speech, and let the player's character answer first. "Bring a friend next time", "You've got it. We'll bring more people Saturday" and "We'll be there" read as AI's quick resolution, not how people talk.
- **Send finished work only.** Don't hand over a batch with a "still rough" list; fix what is known before the owner grades.
- **Study any source (owner, Oct 16).** Calibration research may read anything, copyrighted or not (full interview transcripts, documentaries, captions, books): it only studies how people reply, the way one rapper learns from another's rhymes. Nothing is copied into the game, so no source credit is needed. Lines stay original.

## Oct 16, morning: batch 15 review (owner, voice notes)

- **Every scene needs conclusions.** A scene has several distinct endings, and several ways to reach each one; today most branches just stop. An ending is a result the world keeps (a vote given, a favor owed, a story that runs, trust lost), not "resolved/refused/open".
- **New situations every batch, as the director would make them.** Three kinds of vote ask read as the same two or three situations. Batches draw on the director's whole catalog and the research, not the same staged asks again.
- **Replies may be longer and substantive.** Not every line short; some carry an argument or a reason. Today many replies "completely kill" the talk, and the dialogue doesn't sound natural yet.
- **Specific lines.** "You'll have to ask the chair" makes no sense for your own vote. "I'm not doing this in a hallway" and "Your vote is public. Your reasons don't have to be a secret" are good. "I've got a meeting. Walk with me if you want" answered by "The story runs Thursday" is a weird response: an invitation to walk should be taken up. Volunteer: "The back of the room was standing by the end" doesn't connect to "Was it that loud back there?", "It cut out twice" is unexplained, "Where'd you drive in from?" is creepy, "Go home. I'll call you at eight" is awkward, and the volunteer replies overall are weird. Vote asks: "Fine, I'll do it, but this is the last time" and "Okay. For you, I'll do it" are weird answers to "What do you need to get there?" and to a reminder of your word. The opponent scene is awkward throughout.
- **Endings end naturally (owner, Oct 16, morning).** A scene needs a natural close, not a game-changing result: some scenes are transitions between the big ones, and the director finds that balance. What he grades is voice and choice.
- **The improvements apply to every conversation, not the staged scenarios.** The English engine must put together a coherent exchange, even crudely, for any situation the game produces, including ones nobody has written for yet (having a baby, say). In live play the owner marks what's thin as a gap; the engine builds crudely until then.

## Oct 16, afternoon: batch 16 review (owner, voice notes)

A step forward, still awkward. Rules that apply to every scene:

- **Say what happened.** A complaint names the concrete effect ("you made it worse" without saying what is weird); the asker cites what changed, from the record.
- **Mirror escalation.** When the other person escalates, the player can escalate back, not only de-escalate or leave ("Then we're done talking" is an exit, not a back-and-forth). He liked the pressing in the apology scene.
- **"Why?" is always there** when someone asks something of you (the floor switch had no "Why?").
- **Endings land.** Walking away gets a beat, not a pleasantry ("I'm just here for cereal" / "Enjoy your cereal" was anticlimactic; "I've been to meetings" then nothing was weird).
- **Offers carry context:** who, why you, what the job is, and some surprise. The appointment had none, and "keep my own voice" made no sense for a budget office.
- **Answer what was asked.** Asked to state your name for the record, the reply states it.
- **Endings that set something show up in play:** "Tuesday nights. Then I'll see you there, and so will everybody I bring" is great, and should put an event on the calendar.
- **Specific lines:** "Come stand on my corner at five" reads wrong (drop it); "I still don't like it. But okay." isn't how people talk; the recall's first two replies are unnatural and "Have a good day" is weird; the hearing's "I'm done" / "Next speaker" is flat.

## Oct 19: batch 17 review (owner, voice notes)

Rules that apply to every scene:

- **Every claim has a reason the listener can follow.** A complaint says why the change hurts this person ("I must lock up any gun where a child could reach it" left him asking why that is bad for her: is she a hunter, conservative?). A narrator line names the thing it refers to ("because you can't decide": decide what?). A petition, a forum or office hours appear only after the scene has said what they are.
- **American usage.** People say "have to", not "must", about what a law makes them do; "the eleven o'clock news", not "the eleven o'clock"; "put the vote on hold", not "hold the vote"; "the people this affects", not "reaches"; an office is named as people say it ("the finance secretary"), never as "Budget Director / Finance Secretary".
- **A reply answers the line right before it.** "I will. First thing on the agenda" after "A tense night. That's what you've got?" makes no sense; neither does "Ten minutes" after the player asked for five, "Not this one" after an offer, or "Thank you. That's noted" after an apology to the chair.
- **Promise only what the character can do.** "I'll call you" to a stranger in a grocery store: how?
- **A good exchange keeps going.** "If I wait, somebody else takes it" met with "Or you lose, and nobody remembers you either" should open more talk, not end; the polling-place scene ended abruptly when it was going well.
- **Endings and their labels match the path.** Leaving a question unanswered ("Come here. One more for the road.") is not "You said what it meant."
- **Introduce people by role.** He could not tell whether Jessica Sparks was staff or a reporter; a governor on the phone is "the governor", not "the executive".
- **Vary the bills.** The same two or three bills come back in every scene.
- **Narrated reactions are welcome** ("grumbles" instead of "Good night").
- **Mundane scenes need a stake.** The first day at work ("Mind the step", "I'll find the coffee") went nowhere; "What do you want to learn first?" is an odd question at a diner.
- **Pronouns.** "Leans in the doorway like they've done a hundred times" reads wrong for one man; avoid the pronoun or use the person's own.
- **Liked:** the mentor's "Run for state senator when you can win it, not when you want it"; the floor switch ("Why me?" / "Then move me. What's it worth to you?" / "Done. Put it in writing tonight"); the appointment's "Why me? We've never met." / "That's the point" / "Tell the governor I'll talk. Not yes. I'll talk." / "Don't make me chase you"; the victory scene apart from "Write that on your hand".

## Oct 19: speeches, voices and merging graded work (owner)

- **Speeches next.** The opening presidential speech is weak. Speeches should work in real figures naturally (inflation, Social Security, states' rights, whatever the record holds), and lines should belong to kinds of people and ways of speaking (a newscaster, a plain speaker, a polished one).
- **Speechwriting craft is earned.** Call and response, saying things in threes and literary turns belong to speakers who have the skill: a poor first-time candidate's first speech does not sound like a president who was an actor. Grading such speeches may need its own curve; the Words session proposes how.
- **Graded work lands.** As batches are graded, what's good goes onto a PR that is ready to merge and kept up to date, so the English engine in the playable game improves as grading goes on. The session never merges its own PR.
- **Context with every scene (owner, Oct 19).** Each scene on the review page comes from a generated world, and says why it is happening and who the people are to each other (a parent, a coworker, a colleague, a stranger), from the records, so the owner can judge whether a line fits the relationship: "you might say something to your mom that you would never say to a coworker." Worth a slower batch.
- **Grade many things, and every note adjusts the engine,** not one scene.
- **The Words session is also the director (owner, Oct 19):** it makes scenes fire and makes the words right, so the two work together.

## Oct 16, evening: rulings (owner, via the acting CTO)

- **Who tells a person a law changed their money (owner, Oct 16):** mostly the news and social media, not friends. Owner: "most people's friends don't talk about laws that were passed. Usually... the news and social media and stuff." The source a stance cites is the outlet or feed that reached the person; friends and officials may still carry it where the records show a conversation, but it is the exception. Carried by PR #4747 and pool item `director-law-reached-scene-teller`.
- **Disasters after FEMA's records end (owner, Oct 16):** the game keeps making its own records. "The game obviously keeps making its own." Nothing stops at the last real year. Carried by PR #4599 (`core-disasters-ss-prices`).
- **The Politics screen's list of legislators (owner, Oct 16):** keep everyone, behind a division filter: federal, state, local, with the ability to change which city and state you are looking at. Owner: "have a good division filter thing, like city, state, local, being able to change cities and states." Pool item added: `play-politics-division-filter`.
- **Pre-Oct-12 PRs with no successor (owner, Oct 16):** closed; anything unfinished in them becomes a pool item. (#713, #2200, #2217, #2221, #2229, #2486, #2497, #2880, #3295, #3492, #3996.)
- **Autoplay (owner, Oct 16):** the character never gives the player's money to cause groups on their own. "Never without you." Closes the owner-decision item `core-player-autoplay-acts`: build it as never-without-the-player and remove the owner-decision stopgap.
- **A candidate may ask for money beyond their own circle, and being asked fills a counted person in (owner, Oct 16):** yes to both. The one condition is that the person actually has the money and actually likes the candidate. Owner: "if they met some random person in the park and that person was a billionaire and they actually liked them... that dude has to have the money." The ask reads the person's money and their view of the candidate; nothing else gates it. Carried by `gov-campaign-day-no-money-small-town` (#4749) and the campaign engine.
- **Bill scenes do not wait for the floor (owner, Oct 16):** "There can be multiple scenes. Multiple things can happen when writing a bill." The director may fire scenes at every stage a bill passes through: drafting, committee, floor, signing; not one scene at the end.
- **Undoing a law a body just passed (owner, Oct 16):** takes however long the place's own rules say: "whatever it says in statute." Read the body's rules from data; no fixed waiting period in logic. One rule, all 56 places.
- **Reporters and outlet owners and office (owner, Oct 16): correction to the CTO ruling.** They are not barred from holding office. The defect was that a reporter was automatically put into an empty seat at the opening (#4663 fixed that); a reporter who wants to run may run. The earlier CTO line "reporters and outlet owners can't hold office" is withdrawn.
- **Disasters (owner, Oct 16):** both FEMA's records and the world's own conditions; after the records end, the game keeps making its own weather. Restates the bullet above; the source list is now settled as both.
- **Crime engine (owner, Oct 16):** yes, later, "when it gets a little more fleshed out"; the owner is not sure it is needed yet. Stays priority 3 in the pool (`owner-crime-engine`), not blocked on a decision.
- **Papers endorse candidates (owner, Oct 16):** "Sure, I think that happens in real life, so if it happens in real life, sure." An outlet's endorsement follows its own leanings and the record, no dice.
- **Not understood, to be asked again in plain words (Oct 16):** executive acts crowding out roll calls; employer raising pay for an unfilled opening; the federal budget multiplier; the teen-boy figure; stress and mood baselines; the law-reach pay floor; the first simulated year against 2020; what "carry a bill" means. Nobody registers a stopgap on these as decided until the acting CTO brings them back.
- **Carrying a bill (owner, Oct 16):** a person with no seat may ask a lawmaker they know to introduce their bill, "sure, I guess", but it is rare and works only if the asker matters: "only if they're important." The lawmaker's yes reads the asker's standing and their relationship; nobody carries a bill for a nobody. The Oct 14 CTO relay (SG-GOV-carry-request) stands with that condition.
- **Nothing in the simulation is a locked number (owner, Oct 16, said again):** "It's a simulation, so it calibrates from real life... there's no artificial shit in here like that." "You don't just get an implicit multiplier... that's not how this game works." Research calibrates; it never sets an outcome by a fixed coefficient or cap. Applies to every question below and to every parameter tagged TUNABLE with no source. The acting CTO notes the questions on the pay cap and the multiplier should never have been asked.
- **Unfilled openings and pay (owner, Oct 16):** yes, an employer may raise what it offers for a job nobody takes, and there is no cap: "if they can't afford it they can't afford it; if they're stubborn they might not do it." The raise reads the employer's own books and traits, calibrated against real wage growth for open positions. Pool item `world-unfilled-opening-pay`.
- **Federal spending and the economy (owner, Oct 16):** no multiplier, one or per line: "that's not how this game works." The effect of a federal dollar is the dollar followed: who is paid, what they spend, who that employs, read by the engines that already move money. `macroFiscalMultiplier` (1.2) in `src/core2/data/macro/parameters.json` is a defect to replace. Pool item `world-macro-no-fiscal-multiplier`.
- **Teen boy indoors (owner, Oct 16):** yes, drawn with the youngest adult figure until plain teen art exists. The owner thought teen figures already existed; the art item for plain teen poses stays in the pool.
- **Stress and mood baselines (acting CTO ruling, Oct 16, under "no dice", "sliding scales" and the owner's words today; owner to overrule):** the owner asked the CTO to answer from the code. The appraisal and decay machinery in `src/core2/emotion.ts` is sound: trait-weighted impulses, closeness, exponential return to baseline. The defect is `stressBaseline` 0.25 as one TUNABLE number for everyone (no source). Ruling: each person's resting stress is computed from their own situation (money pressure, job security, health, household load, traits), with the population's spread calibrated to a real adult stress survey (for example the PSS-10 national norms: mean about 13 of 40, varying by age, income and employment), never one value. Mood baseline as "relative to the person's own usual self" stands. Owner: "as long as it's calibrated correctly and not everybody's the same zombies... some kind of math formula with weights." Pool item `people-stress-baseline-per-person`; closes `owner-stress-mood-scale`.
- **Public minimum salary (owner, Oct 16):** it is a law, and an employer may of course pay more than the floor. The one-time dev-mode raise is not the mechanism; the law in force is read by every public employer's payroll, including later hires.
- **The first simulated year against 2020 (owner, Oct 16):** no grading of months against real 2020. "It just has to make sense; it doesn't have to be super accurate to 2020... it's just to calibrate the simulation; no numbers are locked in." Real history calibrates ranges; no test fails a world for not matching a real month. Retire that check.
- **Executive acts and roll calls in the news (acting CTO reading of the rule above; owner may overrule):** not answered directly; no fixed 40 or 15 slots. An outlet prints what matters to its readers by its own reads (what moved money or people in its place, what its readers follow); the count falls out.

## Oct 19, later: batch 18 review (owner)

- **Every batch reads new.** Batch 18 repeated batch 17's replies; that breaks "every batch needs to be different." Every wording helps calibrate, so a review page never shows a line from an earlier page (the gate refuses one that does).
- **Personality, experiences and memories come into effect,** and the context panel shows them: a person acts from their traits, their money, their household and job, and the views their records hold, with what formed those views (a story read, a speech retold, a campaign's message). A city attorney would not complain about a photo-ID law; only someone it burdens who is against it does.
- **Not every line comes from a memory (owner, Oct 19).** Baldur's Gate 3 is the model: some replies are extra options drawn from the player's own life ("[Out of work]"), sometimes just color, sometimes changing the outcome, beside the ordinary ones.
- **Rejected lines:** "Write down your number. I'll call you this week." and "Which part of it hit you? I ask because if it's landing wrong on your street, I want to know."

## Oct 19: the narrative seam (CTO)

- **The director and the English engine are two layers under one contract.** The director says what is happening and why, by record (roles, purpose, stakes, the move at each turn, the facts to cite by record id), with no words. The English engine says how it is said: it fills each move from the banks, graded by move. Nothing crosses the seam. The one blurred place, `src/director/scene-talk.ts` picking pieces from `data/english/parts/scene-talk.json`, moves into the English engine on its own PR after the current item, with what was deleted counted in the PR body.

## Oct 19, evening: batch 19 review (owner)

- **Scenes need a reason and stakes.** "There are scenes being generated, but why?" Each batch scene was a stand-in in a random life; nothing the player had done (campaigning, a vote, being accused, holding office) led to it, and some scenes should lead to a game screen (drafting a bill). Not every scene needs stakes, but the batch must show a life where they build.
- **The narrator is a narrator.** Every scene opened with one narrator sentence and two lines from the other person. Vary it, and let the narrator speak between lines ("the crowd grows louder"), as Baldur's Gate does.
- **The panel is plain English.** Dates read month, day, year. "office replied", "bond loyalty", "works as us-house at Us" and "no job on record" for someone who just left a job are not English. Show money only where it matters, and say why.
- **Casting fits the life.** An 80-year-old is not told to wait a cycle or that they'll land on their feet; the trainer on a first day is not the boss; the poll worker and the voter are told apart by role.
- **Lines carry the thread.** "Then we'll settle it at the next meeting" dropped the personal grievance she came with; "bring your numbers" twice is redundant; "can't afford a yes" sounds like a bribe and should be a real trade from the district's interests (its industries, its employers).
- **Wording took a step back in places:** "Before the day eats us", "picked the diner, and the back booth, and already ordered", "Take the message. I'm not holding the room", "I'll help anyway".

## Oct 19: rulings (owner, via the acting CTO)

- **A counted household's arrears when it is filled in (owner, Oct 19):** "It depends on the people; it can be yes or no." A household filled in carries back rent or not from its own record: its income against its housing cost over the months it has been counted, the place's conditions, and the household's traits once filled in. No fixed share carries, no fixed share is cured. Closes the Open bullet of Oct 17 (SG-WORLD-housing-fill-in-arrears); the "carry" build is the stand-in until the read is built.
- **Which pre-vote hooks belong to a committee's day (acting CTO ruling, Oct 19; owner to overrule):** the owner said it is a builder question: "I don't even know what hooks run." Ruling: the committee's day runs whatever the records already fire for a body on a sitting day (trades, hearings, staff reports, members' reads of their views) at the stage the body's own rules put them, from data, one rule all 56 places; nothing new is invented for it. Closes the Open bullet of Oct 17 (SG-GOV-committee-day-hooks).
- **County and state counted population at the opening (owner, Oct 19):** generated straight from the census, not seeded from residents' relatives. "Straight from the census. It'll be variable again; it just depends on the simulation." The counts vary per world from the simulation's own seeding of who exists, consistent with the census for the place. Answers #5039's question. Pool item `core-opening-counts-from-census`.
- **Trial models (owner, Oct 17 to 19):** GLM 5.3 produced a real, gradeable PR (#4990, graded about 4.1 of 5 by the acting CTO, two fixes sent back); GLM 5.3 Flash lost its working directory and opened no PR. #4990's work returns to the pool to be finished by any builder: `world-macro-federal-dollar-finish`, then `world-macro-outside-outlays-indexed`.

- **Pairing (owner, Oct 19):** "people can move in together, yes." Who pairs with whom reads each person's own record, including orientation; two homeowners can pair and combine households like anyone else, and the home they leave returns to the market. The woman-and-man-only and never-two-homeowners rules in PR #4963 are defects to replace.
- **Public contract awards (owner, Oct 19):** yes, the game awards public contracts (a government hiring a firm for work from its budget lines), so `gov-bribe-buys-a-contract` has something to buy. That item is unblocked and waits on `gov-public-contract-awards` (area gov, kind feature, priority 2, size M).

## Oct 19, evening: acting CTO rulings from PR questions (standing rules; the owner may overrule)

- **Old-core features (#5091, #5081):** PRs that add to `src/simulation` are closed, not merged. The owner's Oct 19 ruling: the old core goes, and useful code is lifted into core2; nothing new is added to it. A core2 polls item, `elections-polls-core2`, replaces them.
- **Superseded elections items (#5087):** `elections-poll-sampling` and `elections-ballot-referrals` are dropped.
- **Golden-path check budget (#5061):** the five-minute budget is not raised; the year run gets its own job.
- **Unread tables (#4899):** deleted by default ("an effect is a read"); a table is kept only where a golden-path screen reads it, with that read built in the same PR.
- **Words conflicts (#4626):** banks are never hand-merged; #4459 merges first and word-pack is regenerated on top of it.
- **Vehicle tax with no law on record (#5103):** estimated from the treasury's budgeted vehicle line divided by vehicles in the jurisdiction, tagged ESTIMATED with the source ("estimate, never UNKNOWN").
- **Employer passing over an applicant (#5102):** the owner's traits and views read against the applicant's record, with the reasons recorded; a discrimination ban refuses a decision whose recorded reasons cite a protected trait. No dice.
- **Openings and experience (#4982, #4977):** an opening asks for the role's experience from data, never the departing worker's.
- **Family subjects (#4478):** news a relative passes on, and job loss or eviction in the household, are family subjects in relative talks.
- **Adults with no cash (#4309):** 1,002 of 1,289 adults with no cash is a defect under "estimate, never UNKNOWN". Pool item `people-adults-opening-cash-husks` (priority 1), not a board note; the pool is the backlog.
- **Module areas (#5119):** school → People; press and news → Government; disasters → World; outcome-web → Core; world-panels → Play.
- **Territory town's Government screen:** shows the president and vice president ("public figures are known"), marked as not chosen by this place's voters. Closes `owner-territory-president-on-government-screen`.
- **Work-recovery hours (#5077):** stays ESTIMATED with its spread until the research carries per-episode lengths; no change to the value on a guess.
- **Rows with no engine (#4146):** the keep/delete list is accepted under "replace, never layer"; anything deleted that the golden path later needs returns as a pool item.
- **Questions sent to the owner (Oct 19):** the pairing rule (#4963); whether public contract awards exist (`gov-bribe-buys-a-contract`); the four screens' visual review.


## Verbatim rulings carried out of source comments

The excerpts below preserve source wording. An excerpt is not a new ruling and does not supersede the decisions above.

### src/bench/appearance.ts · 88942647ab2f

~~~~text
/**
 * The creator's appearance step (owner, Nov 7, 2026: "busts, never full
 * figures"): a look is one of the bust bank's people (their skin), a
 * hairstyle in a color, facial hair where the bank paints any, and the
 * clothes they dress up in: a shirt, a tie and a jacket, each in a color
 * (owner, Nov 10: "I would like to be able to change ties and stuff ... I
 * want to see colors and stuff changing as well"), and the everyday top they
 * wear away from work, in a color (owner, Nov 12: "two tabs, everyday and
 * formal, bust flips between them"). Every choice is read from the bank's
 * manifest (bust.ts), so a new person, piece or color there is offered here
 * with no change.
 */
~~~~

### src/bench/appearance.ts · 3386f6185663

~~~~text
/**
 * The busts on New game (the approved front mock, fr-new): someone starting
 * out, in everyday clothes, and three who hold office, each drawn from the
 * bank's people by the visit's seed (owner, Nov 17: "the New game screen shows
 * new people each time"). No world exists yet, so these are only who is
 * pictured, never a choice anyone makes. They are the Random button's own draw
 * (`drawnAppearance`), so no new pick exists.
 */
~~~~

### src/bench/bill-stage.ts · 6cf7af1d572b

~~~~text
// The aide's estimate of how the player's chamber will vote (owner, Oct 29: what colleagues told you
    // plus your aide's estimate, marked as an estimate that can be wrong, no exact count). It reads only
    // what members told the player; those who have not said are assumed to split as those who did.
~~~~

### src/bench/bust.ts · 2de9f71253ba

~~~~text
// The bust bank (owner, Nov 7, 2026: "maybe just busts for most things and
// full body for certain scenes"; Nov 10: "we need to start transitioning to
// the bust system"). A person on a menu is a head, their clothes (a shirt, a
// tie and a jacket as layers, or one whole top), facial hair and hair, each a
// picture on one shared canvas, stacked in the manifest's order with nothing
// moved, scaled or tinted (owner, Nov 10: "I would like to be able to change
// ties and stuff ... I want to see colors and stuff changing as well"). This file is the only reader of
// art/busts/v1/manifest.json: it says which pieces a person is and where each
// piece's file is. The screen stacks them (ui/bust.mjs).
~~~~

### src/bench/calendar.ts · b8da4f0227b7

~~~~text
// Birthdays only for the household and close kin (owner, Nov 1: "it's just
  // people's birthdays"): the people who live with the person, and parents,
  // children, siblings and a partner by the closeness table's own marking of
  // which relations are extended.
~~~~

### src/bench/campaign-trail.mjs · 3b700ef1aebc

~~~~text
// The campaign trail in a real browser (owner, Oct 20: campaign acts are
// scenes you go to; the Campaigns tab shows standing only). Shared by the
// browser checks that run a campaign act: open Travel and the trail's card,
// where the doors, the event, the interview, the calls and the debate wait.
~~~~

### src/bench/campaign.ts · e96fe8e5d823

~~~~text
/**
 * A filing's petition as the screens show it, read from the petition record:
 * the signatures the law asks, the last day and the signatures held. The
 * clerk's check is told in the news and the Journal, not on a screen (owner,
 * Nov 14). Null for a filing with none.
 */
~~~~

### src/bench/campaign.ts · 566e465b8ff7

~~~~text
// Who turned the player down, and who may be asked now (owner, Nov 14: a
  // no stands for now; ask again later).
~~~~

### src/bench/campaign.ts · 5dcabf7a74ce

~~~~text
/**
 * Where each act on the campaign trail happens before anyone is met: the
 * street of doors, the hall, the outlet's newsroom, the campaign office. One
 * list, read by the act's scene and by the trail's tile, so the tile shows
 * the place the act opens in (owner, Oct 20: "campaign acts are scenes you go
 * to"), and each act shows a place of its own. The acts' places are
 * `trailPlaces` in scene-places.json: the first painted name of each act's
 * list, a wanted picture first and its stand-in after. An act with no place
 * of its own is not listed: a house party is the host's living room, and the
 * player's own money is given from home.
 */
~~~~

### src/bench/campaign.ts · 2397262ae89d

~~~~text
// While the petition circulates, a doors outing is how signatures come in
  // (owner, Nov 14): the names the doors added today, from the petition's own
  // signer rows, some days none and some days many.
~~~~

### src/bench/card.ts · 66c71efaaa5e

~~~~text
/**
 * A person's life as their card tells it, oldest first: one worded line per
 * event the one history reader returns (`historyOf`: what they were made with, the
 * simulated past and what the engines recorded in play), each on the record
 * that caused it. Never how close the tie to the viewer is (owner, Oct 29). A
 * record whose words the bank cannot fill is left out.
 */
~~~~

### src/bench/card.ts · 71aeb1771aa3

~~~~text
/**
 * The card's lines folded as the story tells them: a run of terms or of spells
 * at one employer is one line, and more than two jobs are one line standing
 * where the last job began, so a long career is never told as if it were one
 * moment (CTO, Nov 24, C10: "five jobs at 18").
 */
~~~~

### src/bench/card.ts · 82fdb203b675

~~~~text
/**
 * The card's story, oldest first (owner, Nov 1: "Elected legislator, it needs
 * to be told like a story. How many times do I have to say that?"): each
 * record a sentence of a short biography from the bank, the first naming
 * them and the rest using their recorded pronouns, or said to the player of
 * their own life. A run of terms in one office is one sentence ("won
 * election as state representative, and won it again in 1988 and 1990"),
 * and one school is said once. A year is said only where a bank piece has a slot for it.
 */
~~~~

### src/bench/card.ts · 5862ea748ed6

~~~~text
/**
 * The lines under a person's name (owner, Nov 1: "Under her name, she told
 * legislator. That's not good. There needs to be more text."): who they are
 * now (the office they have held since their first term in it, else their
 * work, their school or their town), then where and when they were born.
 * From the same records the story tells, so the two agree.
 */
~~~~

### src/bench/card.ts · 6dd4b9570b84

~~~~text
/**
 * The leanings a person is said to have, strongest first, each by the pole's
 * own label and how strong it runs. No sentence goes beside the label: one
 * that only said the label again in other words was deleted (Fable A on
 * #7365, Nov 12, under the owner's Nov 11 ruling that every line comes from
 * the world's records). A line comes back only where a record shows the
 * leaning.
 */
~~~~

### src/bench/card.ts · 5d7691005e91

~~~~text
/**
 * The card of a named official the player has not met and who lives
 * elsewhere (a state legislator, a member of Congress, the President): what
 * the public record says, from their term and office. `official:<term>` is
 * memberKey's form for them; a term holder's person id is accepted too.
 * Every person on a screen opens a card (owner, Oct 28, point 13).
 */
~~~~

### src/bench/card.ts · 2db9588b0450

~~~~text
/**
 * A public record whose service began no later than the office run the card
 * tells (owner, Nov 1: the header's "Since 2025" against elections in 2011,
 * 2013 and 2015), so the header, the lines under the name and the story agree.
 */
~~~~

### src/bench/creator.ts · fdee29db6db8

~~~~text
/**
 * The youngest a life can begin at (owner, Nov 16: "Just do 18 and up right now. Life before 18
 * will come after early access."; world.ts `PLAYER_MIN_AGE`).
 */
~~~~

### src/bench/creator.ts · 9b87fb2d6b5c

~~~~text
/**
 * A name from the national corpus, drawn by seed and draw number. With no
 * gender chosen yet, any given name may come up (owner, Oct 14: Randomize
 * name works before a gender is picked).
 */
~~~~

### src/bench/creator.ts · 318b5f680ff7

~~~~text
/**
 * The whole character Random draws (owner, Nov 17: "you should be able to
 * randomize an entire character"): a gender, a name for it, a birthday, a
 * place from all 56. The look is drawn by the page's next request for the
 * gender's appearance, on the same seed and draw.
 */
~~~~

### src/bench/creator.ts · 8cd6e0b11cd0

~~~~text
/**
 * The capitol painting of a state, D.C. or a territory, by its jurisdiction
 * key ("US-TX"), in midday light: what the loading screen shows behind the
 * world being built (owner, Nov 16: loading shows the player's state). A state
 * with no capitol painting of its own gets the dome or tower the picture list
 * (`capitolPlaceFor`) gives it.
 */
~~~~

### src/bench/dev-api.ts · 36697411b2ce

~~~~text
// Jump to an hour: the player's own clock moves to that hour (today's, or
    // tomorrow's when it has passed), through the same wait an office's
    // opening uses, so the world runs to it and people are where their
    // schedules put them at that hour. Dev mode's proving ground (owner, Nov 7).
~~~~

### src/bench/dev-force-legislature.ts · c408d14b0bc5

~~~~text
/**
 * Dev mode forces the legislature's scenes through the legislature's own writers (pool item
 * dev-force-every-scene-through-its-writer; owner, Nov 15: "a part of the dev mode should be able to
 * trace and force every scene to play"). Each recipe writes the cause record the way the engine
 * writes it in play, then runs the next day, and the director stages the scene from that record id
 * through its own scheduling:
 *  - `carry`: someone the player knows asks them to carry a bill (`askToCarry`, carry-asked);
 *  - `held`: the player's own bill, which its committee's chair holds unheard (`draftBill`,
 *    `castChairHearing`, the committee stage: bill-held-in-committee);
 *  - `presented`: a colleague's bill passes and reaches the player's desk as the executive
 *    (`draftBill`, the members' votes, `holdEveryChamber`: bill-presented);
 *  - `introduced`: the player introduces a bill (`draftBill`: office.introduced);
 *  - `count`: a colleague's bill goes to the floor one vote short, and the sponsor's count the
 *    evening before asks the player (`scheduleVote`, the members' votes, `askBeforeTheRoll`:
 *    vote-ahead).
 * A scene of the seat needs a seat: a player who holds none takes the town's seat in the state's
 * lower chamber (or the governorship, for the desk) through the offices engine's dev start
 * (`seatPlayerInStateOffice`), as a winner takes office. Every write is marked by the caller as
 * `scene-forced` and never counts as played.
 */
~~~~

### src/bench/dev-mode.ts · 4158f21efba5

~~~~text
/**
 * Dev mode (owner, Oct 14, 2026): change any law, make any person or body
 * decide, jump time, trace any record, watch the town by month and run a
 * saved "what if". Every write goes through the core's own calls (`enactLaw`,
 * the chooser's controller hook, `castMemberVote`, `holdVote`,
 * `executiveDecision`, `rerateJob`) and leaves a dev-mode record on the core,
 * so every engine reads it the normal way and a release save can refuse it.
 * Read-only views spend no game time and write nothing. Words come from the
 * English engine; this returns record data and ids only.
 */
~~~~

### src/bench/dev-mode.ts · c493b91b68df

~~~~text
// An offer comes only to a player who applied (owner, Nov 16): apply for the
  // town's openings each day, the Openings screen's own call, until one calls.
~~~~

### src/bench/dev-proof.ts · d1c39060abbb

~~~~text
/**
 * Dev mode's records proof (owner, Oct 29, 2026, to the speed lead: "That
 * needs to be built into the advanced mode... a dev mode where you can be
 * anybody, make anything happen in the simulation... and trace why things
 * happen"). Two builds that run the same seed and place to the same date
 * should keep the same records; a speed change must not change what the
 * simulation decides. This reads what a world keeps from the same list a
 * snapshot saves (`worldRecords` in `src/core2/snapshot.ts`): the core's
 * records, every engine's tables and every engine's runtime part, the counted
 * population among them. It keeps one digest per table and compares two
 * proofs table by table. A differing table names the first record that
 * differs, so the trace (`dev-trace.ts`) can open it and show why it happened.
 * Engines whose state a snapshot would miss are listed as not covered, never
 * passed as the same. Read-only: it writes nothing and spends no game time.
 */
~~~~

### src/bench/dev-trace.ts · fcabaa9059ea

~~~~text
/**
 * Dev mode's trace tree (owner, Oct 14, 2026, relayed): from any record, the
 * records and reasons that produced it, one level per click, each child
 * labeled with the engine and the field or function that links it. "How they
 * learned of it" is its own kind. Read-only: it finds what the core and its
 * engines saved; it writes nothing and spends no time.
 */
~~~~

### src/bench/dev-trace.ts · 8c7b13b66bd0

~~~~text
/** A cash account by id: its owner, what it holds and its latest payment. */
~~~~

### src/bench/dev-trace.ts · 285b27f8afd9

~~~~text
// A printed police log: how the month stood against the town's usual, the
  // closed months that usual rests on, and the share of a brief's space the
  // desk gave it, read by the press's own function (owner, Nov 16: dev mode
  // traces what a thread would trace by script).
~~~~

### src/bench/dev-views/address-parts.ts · 484f49f3505d

~~~~text
/**
 * Dev mode's "Why each line of an address" (owner, Nov 16, 2026: dev mode must "trace and force
 * every scene to play... see why every scene played and why dialogue options were chosen"; every
 * line of dialogue or narration registered and traceable). For each address on the record, newest
 * first (the President's, a governor's, a town's): each sentence as it was said, the bank pieces it
 * was joined from with each piece's tie (the speaker's view, the place, the law in force, a record,
 * or how it is said), the facts its slots said, and the records those facts came from. Read from the
 * address's own record through the one function every view says it with (address-render.ts), so
 * what dev mode shows is what was said. Reads only; spends no time.
 */
~~~~

### src/bench/dev-views/budget-amendments.ts · e8ab3b5fd56a

~~~~text
/**
 * Dev mode's Budget amendments: for the player's town government (or the one named in `government`),
 * the arithmetic that lets its body amend the adopted budget this year (what the treasury has
 * taken in a month since the year began against the months before it, the revenue planned for the
 * months closed, what is already amended in, and the room left), and each amendment bill the body
 * has filed with the cause its provision carries. It reads the one `amendmentRoom` the filing
 * reads, and the bills' own provisions, so it shows what the body acted on (owner, Nov 16:
 * everything traced by code must be traceable in dev mode).
 */
~~~~

### src/bench/dev-views/dev-closing.ts · c3565607c133

~~~~text
/**
 * The business closes today through its owner's own closing (cash to the
 * owner, final pay held back, its jobs, contracts and books ended), the same
 * call as when an owner chooses to close; the books keep dev mode as the
 * reason. The jobs engine, the claims and the news follow from the closing.
 */
~~~~

### src/bench/dev-views/director-day.ts · 99283ce4be0d

~~~~text
/**
 * Dev mode's director's day (pool items dev-mode-shows-the-directors-day and
 * dev-mode-shows-a-scenes-first-line-piece; owner, Nov 16: "a part of the dev mode should be able to
 * trace and force every scene to play. So see why every scene played"). `GET dev/director/day?person=&date=`
 * returns one person's schedule entries for one day, read from the one ledger the director writes
 * (`ledger.people.get(id).schedule`), with no copy: for each moment its cause record, outcome, the
 * types bound, the types held back with the reason the director gave, the reason a waiting scene
 * closed as a journal line, and, for a scene that stages, the bank piece its first line opened on and
 * the facts that filled it (read from the scene as the director composes it). Counts by outcome and
 * by reason come from the same rows. The row is one object per moment so the board's columns
 * (candidates, first failed gate, reads, scores, picks) are added as fields on it, not as a second
 * route. The player and the date of the world are the defaults. Reads only; spends no game time.
 */
~~~~

### src/bench/dev-views/election-offers.ts · 2f0f05788e5a

~~~~text
/**
 * Dev mode's Election offers: for each office on the player's Elections page, whether the clerk
 * offers it to the player and, when not, the one reason (`playerFilingBar`) or the eligibility
 * rule that stops them, with the day they can file. It reads the page's own list
 * (`localRaces`), so what it shows is what the page offers (owner, Nov 16: dev mode shows why
 * each office is or is not offered).
 */
~~~~

### src/bench/dev-views/opening.ts · f5a6b401db0a

~~~~text
/**
 * Dev mode's "How this world opened" (owner, Nov 16, 2026: "be sure this is on dev mode as well as
 * tracing, but track everything at open so that way you can ... finally eliminate all of these
 * random draws or fixed things"). For a town, a person, a household, a business and an office, each
 * value the opening set: what it is today in the record, how the opening made it (real data, the
 * world's offset from a published figure, a decision, generation, an ad hoc draw or a number fixed
 * for every world), the line of code and the data row that made it, the record's own saved source,
 * and what replaces it when it is a draw or a fixed number. How each value was made is the opening
 * audit's list (src/bench/dev-views/opening-sources.json, from the Account lead's report
 * opening-draws-and-fixed-values in the project's shared folder); the values are read from the
 * records each time. "Every draw the opening took" is not a hand list: Record rebuilds this world
 * from its recipe with the draw recorder on (src/core2/kernel/draw-recorder.ts) and lists each line of
 * code that drew, by file and function, with what the list says of it; a site the list does not
 * know shows as such, and dev-opening-draws.test.ts fails on one. Read-only: it writes nothing to
 * this world and spends none of its time.
 */
~~~~

### src/bench/dev-views/printed-stories.ts · df05853c185e

~~~~text
/**
 * Dev mode's Printed stories, on the Calendar (owner, Nov 16: what a thread traces by script, dev
 * mode traces in the game): the stories the town's outlets printed, newest first, each id opening
 * dev mode's Trace, so a printed police log opens to how its month stood against the town's usual,
 * the space the paper gave it and who it happened to (dev-trace.ts). Registered from its own file
 * (dev-views.ts). It reads the news engine's stories; it writes nothing and spends no time.
 */
~~~~

### src/bench/dev-views/scene-trace.ts · cae8f1b1afa7

~~~~text
/**
 * Dev mode's scene trace (owner, Nov 16: "a part of the dev mode should be able to trace and force
 * every scene to play. So see why every scene played and why dialogue options were chosen"; "every
 * single line of dialogue or narration ... has to be traced so easily, there can be no leftovers").
 * One view over what the director and the line register already hold, with no tracer of its own:
 *  - `types`: every situation type the director stages, with the way dev mode can cause it (the
 *    existing `scenes()` recipes), whether it can be forced at all (a type no engine writes the cause
 *    of is listed as unreachable, which is itself the finding), how many times it was staged for the
 *    player, and what the register says of its lines.
 *  - `moments`: the player's last staged scenes, each with its cause record, who is placed and why
 *    (`presentReasons`), the setting's record, the outcome and the types held back and why.
 *  - `lines`: every scene-talk line of a type's purpose, from the line register, with its tie class,
 *    the facts it needs, whether an engine reaches it and whether the grades or a rule hold it.
 *  - `force`: causes a type through the game's own code (`DevMode.forceScene`, or the legislature's
 *    own writers for its scenes, dev-force-legislature.ts) and writes a dev-mode mark `scene-forced`
 *    on the record; a forced scene is never a played one for a Words stamp.
 * Who each person in a scene is named as is the "who is named" view's (who-named), not read here.
 */
~~~~

### src/bench/dev-views/who-named.ts · 703bffd66dbb

~~~~text
/**
 * Dev mode's "Who is named" trace (owner, Nov 16, 2026: "all this stuff that you're tracing, if
 * it's not already being traced by the dev mode, it should be being traced by that"): for the
 * player's scenes, newest first, each person in the cast and why the narrator names them the way it
 * does, from the one read the narration makes (`whyNamed`, who-they-are.ts): the phrase said after
 * their full name with the kind, stage and records it came from, or why they are named alone
 * (family, met before and by which record, the scene's own line says who they are, or nothing on
 * record). Whether they had met is read as of the day the scene is said (`sceneDay`), from the
 * met records' own dates;
 * a meeting dated later is shown as met later. Rule 136, item dev-scene-why-a-person-is-named-so.
 */
~~~~

### src/bench/dev-why.ts · add546c79f68

~~~~text
/**
 * Dev mode's "why" panels (owner, Oct 14, 2026, relayed): the trace says what
 * a record is linked to; these say why. Read-only, from records the engines
 * already keep, and where an engine keeps no reason the panel says so (the
 * `gap` line) so the gap can be filed against that engine.
 *
 *   - a legislative vote: each member's recorded reasons (the legislature's
 *     own decision row), and the sum;
 *   - a business closing: the books behind it (the finance engine's book, the
 *     owner's loss record, the choice's recorded reason);
 *   - a budget line change: the measure and the law behind it, and the line's
 *     history;
 *   - a person: the year's ledger (pay, hours, taxes, rent, spending), and
 *     their kept decisions (each act's offered options with every reason, the
 *     trait reason first, or the chosen option's reasons once condensed);
 *   - a credit line's repricing: the line's rate history, each change with
 *     the central bank meeting behind it;
 *   - a state of the country tier: its people and jobs, the part its played
 *     town and county hold in full and the rest, which add to the state's.
 */
~~~~

### src/bench/dev-why.ts · 9580bdcca512

~~~~text
/**
 * A counted household's money (owner, Nov 16: what a trace finds, dev mode
 * shows): its share of its group's cash and bank savings, the months they
 * cover its costs, and what it opened with against the survey's median for a
 * family like it, spread by its own savings draw. Then why each of its people
 * out of work is looking: the search's recorded reason and the chooser's
 * terms. All read from the residents and jobs engines; nothing is worked out
 * here that they do not keep.
 */
~~~~

### src/bench/dev-why.ts · be3227ea53cd

~~~~text
/**
 * A full household's opening savings draw (owner, Nov 16: what a trace finds,
 * dev mode shows): every household opened at the survey's median for a family
 * like it times this draw, fixed by the world's seed and the household's id
 * and never redrawn (household-balance-draw.ts); a counted household's Money
 * panel shows the same draw beside what it opened with.
 */
~~~~

### src/bench/dev-why.ts · 21a960227450

~~~~text
/**
 * How the story director staged a moment (owner, Nov 16: what a script
 * traces, dev mode traces): the schedule row the director wrote for it,
 * read as kept, never worked out again here.
 */
~~~~

### src/bench/election-night.ts · 8bd739127cbb

~~~~text
/**
 * Election day and night as the player lives them (owner, Oct 26, 2026:
 * "about five minutes of scenes"). On election morning a candidate's
 * volunteer comes by to canvass, and the day asks whether the player goes to
 * vote: going opens the ballot at the polling place, staying home casts
 * nothing (the engine never votes for the player). That night the returns
 * come in place by place from the count's own records, smallest place first,
 * as a small place's tally is done first, until the race is called. The
 * narrator's words are the director's (`src/director/election-day.ts`);
 * the screen shows the count's numbers and names as record data.
 */
~~~~

### src/bench/election-night.ts · 8a8c799c40bc

~~~~text
// The choice itself is asked after the canvass, or at once, and only of a player
    // who can vote here: with no polling visit nothing is asked and the day goes on
    // to the count (owner, Nov 9: "It just shouldn't let you do it if you can't vote.").
~~~~

### src/bench/filing.ts · 145ee4a0bcfe

~~~~text
// The place's own council or board, by its office record: the body a seat
  // sits on, or for a single office the body of the same government (owner,
  // Nov 1: "Do you mean city council?").
~~~~

### src/bench/filing.ts · 517705243e12

~~~~text
// With no race left to file for here there is no scene (Fable A, Nov 13,
  // rule 19; owner, Nov 14: the clerk never says how many signatures are in,
  // so a petition still gathering gives the counter nothing to say).
~~~~

### src/bench/filing.ts · e7ae8befc187

~~~~text
/**
 * When the office that takes these filings is next open (owner, Nov 1:
 * "obviously the office isn't open at 8:30 p.m."): its clerk's own work spans,
 * the record Travel's "who is there now" reads, and where the records hold no
 * hours for the clerk (or name no clerk), the estimated weekday hours of every
 * office. Null when the office is open at this minute. A day off (a weekend, a
 * holiday the spans leave out) is skipped.
 */
~~~~

### src/bench/government-bodies.ts · 02e26bdfd585

~~~~text
/**
 * Politics → Government, one level at a time (owner, Oct 29: drawn as a
 * real game menu). For a level
 * (local, state, federal) and a state, each lawmaking body the screen draws
 * and each executive office, read from the records: the body's room, its
 * members with their party and seat, how the parties split it, its recent
 * roll calls (the record engine's votes, so last term's show from day one),
 * and what is coming up (its next meeting, its bills waiting for the floor,
 * the filing deadline and election day for its seats). Record data only: the
 * screen words every label, and nothing here writes a record.
 */
~~~~

### src/bench/government-bodies.ts · b003218a20b2

~~~~text
/** A seat's holder as a member card reads them: face, name, party and seat (never how they feel about the viewer: owner, Oct 29). */
~~~~

### src/bench/government.ts · 4c50caaada53

~~~~text
// The player files only for the offices player-offices.json lists (owner, Oct 29); the rest run in the world.
~~~~

### src/bench/government.ts · c5b4653b8934

~~~~text
// A body elected by district shows the viewer their own district's seat,
    // never the others (owner, Nov 16).
~~~~

### src/bench/government.ts · 9538f1778880

~~~~text
// Everyone running: filed, and announced while the window is ahead
        // (owner, Nov 17: "other people should be able to announce").
~~~~

### src/bench/government.ts · 4353ce93f6d8

~~~~text
// The player's announcement for this race, while it waits for its
      // window (owner, Nov 17: "Run now, file on the date").
~~~~

### src/bench/government.ts · ce7f28a62623

~~~~text
// The President and Vice President are known to everyone, but a
        // territory's voters do not choose them (owner ruling, Oct 19).
~~~~

### src/bench/government.ts · e12e21b95fb0

~~~~text
/**
 * Announce for a race whose filing has not opened (owner, Nov 17: "Run now,
 * file on the date"): the same bar and the same platform and party as a
 * filing at the counter, through the elections engine's announcement.
 */
~~~~

### src/bench/handler.ts · 4e6ab37581d8

~~~~text
/**
 * The minute of day the player's clock, the light behind them and a scene's
 * opener all read. The opening day is that evening at home, when the household
 * gets home, so the clock is never at the midnight it starts the day from
 * (owner, Nov 16: "the timing is completely messed up"): the player's own
 * minute, raised to the arrival minute on the opening day.
 */
~~~~

### src/bench/handler.ts · ec3302575bfd

~~~~text
// Who has something to say: the director's own answer (a talk that opens with
  // no lines is no talk), read without writing anything. The room leaves the
  // rest unclickable (owner, Nov 1).
~~~~

### src/bench/handler.ts · d63252d6cdcf

~~~~text
// Every game opens on the one start date (owner, Oct 14, 2026).
~~~~

### src/bench/handler.ts · 9304f087fb0b

~~~~text
// A talk with no line is no talk (owner, Nov 1), on every road: a scene,
      // the room, a workplace visit. Nothing opens, and the screen hands the
      // room back.
~~~~

### src/bench/handler.ts · 417093459573

~~~~text
// The state's map with the player's districts and who holds each,
      // for Parties (owner, Oct 28, point 20: "bring it back").
~~~~

### src/bench/handler.ts · 8c22f1804397

~~~~text
// The title's Patch notes: the release machinery's own file, one
      // released section at a time (owner, Oct 28: "get them in").
~~~~

### src/bench/handler.ts · 98c26d73db8b

~~~~text
// The player's interrupt setting (owner, Oct 14, 2026): which kinds of
  // scene may stop the day. A director record its scheduling reads.
~~~~

### src/bench/handler.ts · 38c0c9286d8f

~~~~text
// The office keeps its clerk's hours: going to a closed one plays the
      // visit at its next opening, the clock moving there (owner, Nov 1:
      // "it should have started the next day").
~~~~

### src/bench/handler.ts · 41e138935432

~~~~text
// Announce for a race whose filing opens later (owner, Nov 17: "Run now,
  // file on the date").
~~~~

### src/bench/handler.ts · 191274642bdb

~~~~text
// Not a save this version reads (owner, Nov 15: saves "don't need to be transferable between versions").
~~~~

### src/bench/legislature.ts · 6c6142f606fc

~~~~text
/**
 * Draft a bill from your seat: it goes on the body's next agenda that is not
 * yet posted. Asking a colleague, offering a deal and taking the vote are
 * acts in the day and the meeting scene (office-day), not buttons here.
 *
 * A phase-in is the same bill in dated steps (the owner's ruling, Sept 12
 * travel clarification, item 1): one section per step, each the same law
 * with its own amount and date, never a second bill. The legislature
 * engine puts each section into law on its own date when the bill is
 * enacted, for the bill's government and by that government's rule
 * (`enact`), so the seat names no jurisdiction and computes no date.
 */
~~~~

### src/bench/m0-check.ts · 14da1dacb7d9

~~~~text
/**
   * Seven played days (owner, Oct 14, 2026: Day and Week never open a choice
   * list): every act of the chosen person is the character's own pick, saved
   * as its own decision, or answers a stop; an answer nobody was asked for is
   * refused and changes no record; other residents' lives continue.
   */
~~~~

### src/bench/m0-check.ts · 007b42527b72

~~~~text
/**
   * A skip from a random date stops at the earliest thing that needs the
   * player (a big moment, a deadline) and says which; a routine shift the
   * character attends on its own never stops it (owner, Oct 12); nothing is
   * skipped past.
   */
~~~~

### src/bench/m1-13-check.ts · 1cf7e9228a29

~~~~text
// A real range is a comparison, not a target (owner, Nov 8): every region has a change to read, and
// the ones outside the real band are reported beside the result without failing the run.
~~~~

### src/bench/m2-03-check.ts · 64efe4b3c7c7

~~~~text
// Roadmap M2-03, filing in person, as the play screen files, headless, in the
// place the golden-path runner draws (GOLDEN_PATH_SEED, GOLDEN_PATH_PLACE_KEY).
// The player is the resident who turns 18 soonest. First they walk into the
// office that takes filings for a contest whose rules they don't meet (an
// age, residency or deadline its records name) and name it: the clerk says
// the rule that stops them and offers no way to file. At 18 they walk in
// where a contest they can enter files, state a platform and file once: their
// petition is out with the signatures the place asks (or, where its law asks
// none, the clerk takes the filing at the counter), they stand in the race,
// and a second filing is refused. Filing is a petition; no one pays a fee
// (owner, Oct 28; src/core2/modules/elections.ts). Exits nonzero naming each
// failed clause.
// Usage: node --max-old-space-size=8192 --import tsx src/bench/m2-03-check.ts
~~~~

### src/bench/mannequin-plates.ts · 2f843ba3459b

~~~~text
// Mannequin plates (art/people-rooms/mannequin-plates, its README): a room
// painted with green mannequins in the exact poses a person may take there.
// A person is drawn only on a plate's spot, fitted to its mannequin, and a
// picture with no plate shows nobody (owner, Oct 28: "do not put people in
// until there are mannequins in there for every position"; Oct 29). Each
// `<scene>.mannequins.json` names the backdrop it was painted on, and in
// `backdrops` the other lights of that same painting (night, midday, morning,
// rain are one room re-lit, so its mannequins stand in the same places); a
// new plate or a new light is data there, read with no change here.
~~~~

### src/bench/map.ts · dfec69fd926d

~~~~text
// Each holder with their party: the map colors a district by the party
      // that holds it (owner, Oct 28: Parties illustrated with the map).
~~~~

### src/bench/montage.ts · f34f6ad950a2

~~~~text
/** The kind of speech: an inaugural is given at the Capitol's stand, with the Oval Office as a cutaway (owner, Nov 23). */
~~~~

### src/bench/montage.ts · 54a55b241bcf

~~~~text
/**
 * The address as the montage stages it. A staged speech (the inaugural) shows
 * every cutaway in its alternation, the Oval Office and then America, however
 * few parts the address has: when its country parts are fewer than the
 * cutaways, a part of two sentences or more is split after its first sentence
 * into two parts, so the picture changes on a sentence and a part of the
 * address stays one paragraph (CTO, Nov 24: "change the cutaway on a sentence
 * inside a part, not on a part"). No word is added or changed. `parts` is the
 * speech's text per Continue after the split, or null when nothing split.
 */
~~~~

### src/bench/montage.ts · 62fbe9f91239

~~~~text
/**
 * The people each part of a speech names, by part: every full person a
 * sentence of the part cites (the Vice President, the Speaker), never the
 * speaker. The montage shows them as that part is spoken (owner, Nov 12: "it
 * was just showing random busts of people ... unless it's people that he's
 * introducing in this speech").
 */
~~~~

### src/bench/montage.ts · 4c99478c5aa5

~~~~text
// The Vice President first, then the chambers' leaders, the player's
  // governor, and the legislators after (owner, Oct 29: "the Vice President,
  // Congress and the player's governor with a few state legislators").
~~~~

### src/bench/montage.ts · 73f57634562f

~~~~text
/** The address is a formal occasion for the people it names: they wear formal clothes (owner, Nov 23, P10). */
~~~~

### src/bench/nation-news.ts · 8206c4c4b93d

~~~~text
/**
 * The Nation heading on News: laws other states passed lately, as a view over
 * the laws engine's own rows (owner, Oct 28: every screen is a view of the
 * same records; Nov 5: other places keep only the result; the CTO, Nov 6:
 * tell the ones that matter to this reader by reach and ties, no hand cap).
 * Nothing is stored for it: the laws come from the one history reader (the
 * record of each law taking effect), and the English engine words each law
 * from its row when the paper opens.
 *
 * A law is told when its reach (its state's share of the nation's people,
 * `state-reach.json`) times one plus the reader's ties to that state (family
 * there, work there, a state next door) clears `nationNewsReachBar`. Moving
 * away from a state is not yet a tie: the person keeps no record of where
 * they came from (SG-WORDS-nation-no-moved-from-tie).
 */
~~~~

### src/bench/news-picture.ts · 18af88809f3f

~~~~text
/**
 * The picture a news story carries: the painted place the story's own record
 * is about, never a stock photo keyed by level and never a face (owner, Oct
 * 14, docs/play-first/LAW.md: "The game paints the photo of the actual
 * story"). A body's vote or meeting shows the room that body sits in, a law
 * the capitol or hall of the government that made it, a business story the
 * business, a home sale the home, a month's change in the town the town's
 * main street. The pictures are the scenes' own backdrops, read through the
 * scenes' own pickers, so a story and a scene at the same place look alike.
 * Rooms are painted empty: no one in a story's picture can disagree with
 * their card.
 */
~~~~

### src/bench/office.ts · 59f05dc15920

~~~~text
// The number as a clerk reads it ("Ordinance 2025-6"): a bare "2025-6"
    // under a title reads as a date (owner, Nov 11).
~~~~

### src/bench/office.ts · df8fcfccd040

~~~~text
/**
 * The switches Your office offers (owner's card, Nov 14, 2026: "Stop me at every vote"): each is
 * one name the player knows over the registered stop kinds it sets together, and shows only when
 * the seat has that kind of moment. On by default; off leaves the player away from that kind of
 * vote (the engine records them absent, a desk bill waits, nothing is cast or signed for them).
 */
~~~~

### src/bench/opening.ts · 0600697ef716

~~~~text
// The opening (owner, Oct 14 and Oct 26, 2026): the President's address, then
// home that evening, where that night's news can be picked up. Every word is
// the director's opening story, composed by the English engine at loading.
~~~~

### src/bench/opening.ts · b69083632f5c

~~~~text
/**
 * When the player lands at home on the opening day (owner, Oct 14: home after
 * the address): once the household's last shift that day has ended, from each
 * member's own work spans, and never before the address airs at the player's
 * own clock (src/core2/data/opening/address-airing.json), the hour a household with no
 * one at work sits down to it.
 */
~~~~

### src/bench/opening.ts · 9afc5f87ee0e

~~~~text
// The office alone (owner, Oct 26: "President · Michigan" read as where
      // the player is); the President's home state is not part of his tag.
~~~~

### src/bench/path-check.ts · 167892631978

~~~~text
// Step 3: walk into the office that takes filings for a contest you can
  // enter, a council seat first where the place has one, an open seat first
  // of those (the golden path is a council race; owner, Oct 29: the player
  // runs for six offices).
  // A race takes filings only while its window is open (the clerk's answer,
  // `playerMayFileFor`): with none open today, the character lives on a week
  // at a time, up to two years, until one opens, as a player waits for it.
~~~~

### src/bench/people-pack.ts · 7bce76b7195f

~~~~text
// The people pack: the game's painted people, read from one manifest
// (art/people-engine/<pack>/manifest.json, its README). This is the only
// file that names a pack or a file in one: everything else reads the rows
// here. More clothes, colors or people are more manifest rows; a new pack is
// a new folder and this one constant (owner, Oct 29: "make it to where these
// can be updated very easily").
~~~~

### src/bench/people-pack.ts · 848addf49bf8

~~~~text
/**
   * Drawn writing or resting its hands on a desk that is not in the drawing
   * (owner, Oct 29: "she has a pen in her hand and she's writing on her green
   * pants"): drawn only at a desk spot, cut at the hands.
   */
~~~~

### src/bench/people-pack.ts · 91fe2e1a1dc0

~~~~text
/**
 * Draws the figure a link names (`/art/people/<id>.png?<colors>`) in the
 * background, one between requests, so a face the server has handed out is
 * ready before the screen that shows it asks (owner, Oct 29: faces "should
 * be there instantly"). Drawn once per look; asking again is a cache hit.
 */
~~~~

### src/bench/places.ts · 2ba7fe7a6ca3

~~~~text
/**
 * The town's pictured places the player has a reason to go: where they,
 * their household or their family work, the schools while someone at home is
 * of school age, where people they know work, where they can do something
 * right now, and the state's offices while they hold an office. Each says
 * why it is listed. A town office is not listed on being a civic office
 * alone (owner, Oct 26: "Why have to travel ... Public Works Department?");
 * the offices that take the player's filings are their own cards. Not every
 * organization with a picture (owner, Oct 13: "Why would you need to visit
 * the market?").
 */
~~~~

### src/bench/places.ts · 72372f73da48

~~~~text
// Where the player has political business by the records
  // (play-travel-in-a-village-lists-no-town-office): the town's or county's
  // office, while they hold a seat on its body or its body meets today.
  // An office listed only for being an office stays out (owner, Oct 26).
~~~~

### src/bench/places.ts · 192a48a354ca

~~~~text
// A payer record (the town's retirement-income paying account) holds
      // money, not a building: never a place to go (owner, Nov 16:
      // "Grano, North Dakota retirement-income paying account" was listed).
~~~~

### src/bench/places.ts · cfc67d067128

~~~~text
// Then the town's biggest workplaces across every kind of work: each kind's
  // largest employer first, then each kind's next, by headcount from the
  // organization and job records (owner, Nov 16: "places tied to you first,
  // then the town's biggest workplaces across every kind of work").
~~~~

### src/bench/play.css · e509177fd9f8

~~~~text
/* The play page on Kit 13, the owner's approved control set (docs/ui/kit13/APPROVED-2026-10-04.md).
   Every screen uses these classes and nothing else:
   .panel (dark glass, brass frame, brass corner ornaments), .bust (a person's round headshot),
   .name / .heading (Cinzel), .speech / .prose (Andada Pro), .label / .role / .when
   (Fira Sans), .replies / .reply (numbered lines), .action (a button: .primary is Continue,
   plain is Back; one size for all; the brass corner mark shows only while .active or
   pressed), .tab-rail / .tab (the open tab a raised glass box), .nav-item, .item, .ring (an icon),
   .glyph (thin close X, return arrow), .row (a gold label and its value), .lie-scales.
   The chevron rule: a mark appears only on a static button while it is activated; never in
   radial menus, items, cards, tabs or rows. Nothing inside a menu scrolls: long screens page.
   Any text shadow is head-on, never offset. No button chevrons, no thin gold rules, no navy. */
~~~~

### src/bench/play.css · 6b426d48deab

~~~~text
/* The one menu panel (owner, Nov 5; MENU-LOOK.md): the approved texture, 78%
     solid, about #1C1A17 under it, with its slim brass edge and small corners
     in the picture itself. The edge is cut from the picture's outer 64 pixels. */
~~~~

### src/bench/play.css · 7cddb4faef76

~~~~text
/* One scale above 1440x900: the whole game is drawn in a logical window of 1440x900 or
   more and enlarged to fill the real one (owner, Nov 8, P11). --vw and --vh are that
   logical window's width and height; play.mjs sets --ui-scale on resize. */
~~~~

### src/bench/play.css · bc2b0031ce95

~~~~text
/* ---- The strip of busts (ui/bust-strip.mjs; owner, Nov 11, 2026) ----
   A room is its painting alone. The people in it stand as busts with their names under
   them, straight on the room. --bust is one bust's side; the talk box sets it larger. */
~~~~

### src/bench/play.css · e9f9b4200955

~~~~text
/* The strip is as wide as the people on it (owner, Nov 16: "one person,
     shorten the strip"), centered where it lies. */
~~~~

### src/bench/play.css · e530bf32e941

~~~~text
/* No plate and no band behind the busts (CTO, Nov 24: boxes, against the owner's
   Nov 5 and Nov 23 rules): each bust stands straight on the room in a soft pool
   of light that fades out. */
~~~~

### src/bench/play.css · 2f8b4326ac28

~~~~text
/* Eased all the way out, so on a bright sky it is a faint shade and never a patch
     (CTO, Nov 24: nothing hard-edged). */
~~~~

### src/bench/play.css · 490e88397088

~~~~text
/* Silent people are never shown big (owner, Nov 16): only the speaker is. */
~~~~

### src/bench/play.css · 4de8ac1668c0

~~~~text
/* Who is here: small and packed in the top-right corner of the screen, like mock C
   (owner, Nov 24: "they're supposed to be at the top right"; docs/mocks/2026-11-16-speaker). */
~~~~

### src/bench/play.css · 7735f84650a1

~~~~text
/* A panel at the side of the room (the meeting, the desk, the ballot, election
   day, the returns) never covers the people: they stand in the room it leaves,
   smaller, and nobody is cut in half (owner, Nov 11: "it's being covered up by
   the menu"). A bill read there takes the whole frame, and the foot with it. */
~~~~

### src/bench/play.css · 00fd1ac2c5e6

~~~~text
/* A person's card takes the room: the talk it was opened from waits under it
   out of sight, and comes back when the card closes. Its lower edge used to
   show under the card (owner, Nov 11: nothing is left half covered). */
~~~~

### src/bench/play.css · c45cc503e836

~~~~text
/* In a talk the speaker's bust sits on the talk box's top edge and comes down to
   it from the corner (owner, Nov 16; Nov 24). */
~~~~

### src/bench/play.css · ff7caa22c98b

~~~~text
/* Buttons in a row share one size (owner, Oct 24): every title item is as tall as Continue. */
~~~~

### src/bench/play.css · d2ea948aa85f

~~~~text
/* One button size across the game (owner, Oct 24: buttons are the same size). */
~~~~

### src/bench/play.css · 8bdcfd4b5895

~~~~text
/* Tabs sit on a rail (owner, Oct 29: buttons need "a railing to sit on, or something,
   and something to delineate that that's the one that's selected"); no boxes (owner, Nov 5 and
   Nov 16): a tab at rest is plain type, hover a soft fill, and the chosen one a lit brass
   fill, with no bar, edge or rule around or under any of them. */
~~~~

### src/bench/play.css · 3a114ce6895c

~~~~text
/* LIE CONTROL (owner, Oct 2): the scales of justice, 34px, in the conversation box's upper right.
   No word for it anywhere: no label, no hover text, no tag on answers. Level at rest; toggled on,
   the scales tip and glow red and the lying replies glow soft red. Nothing false to say: level,
   dimmed, not clickable. */
~~~~

### src/bench/play.css · d5021f17169e

~~~~text
/* HOVER (owner, Oct 2): anything you can press glows white, smoothly; a lying reply glows red. */
~~~~

### src/bench/play.css · e5d40098d380

~~~~text
/* How I look's two tabs of clothes (owner, Nov 12: "two tabs, everyday and formal"),
   on the owner's menu look: the open tab a lit brass fill, the other raised glass in
   soft light; no rail, no ring, no bar under the open one. */
~~~~

### src/bench/play.css · 6720eb75c9b6

~~~~text
/* A picked button is a lit brass fill: no corner mark on any control (owner, Nov 5). */
~~~~

### src/bench/play.css · d991d61ead8f

~~~~text
/* The loading bar: a plain track and a gold fill that stays inside it, one sixth for each
   step the world builds in (owner, Nov 8; the Oct 28 stray piece was the old fill's
   overhang past the frame). */
~~~~

### src/bench/play.css · 38f9602a2f06

~~~~text
/* The place's name ("Jericho Center, Vermont") sits on one line: the card grows to it
     (owner, Nov 23, P31). */
~~~~

### src/bench/play.css · fbb605273a68

~~~~text
/* Before a gender is picked there is no person and no look: the creator is its one column,
   and a second column opens beside it with the person once a gender is picked (owner, Nov 17). */
~~~~

### src/bench/play.css · c45717e9ec26

~~~~text
/* The name stands on the portrait's faded lower chest, not under it, so a tall look
     (a man's extra rows) with a name filled in still fits the window (owner, Nov 17:
     no empty space in the creator; the CTO's catch, Nov 24: the panel's top ran off screen). */
~~~~

### src/bench/play.css · a499be610e12

~~~~text
/* The place list takes the rest of its column, so the creator has no dead space under
   it; it scrolls only when it holds more than the column's height (owner, Nov 17:
   no empty space in the creator). */
~~~~

### src/bench/play.css · 3dc94abed8c2

~~~~text
/* The states and towns: a box of rows that scrolls inside itself, under the
   game's own thin scroller (owner, Oct 28: no native scroller; Oct 29: no Back or
   Continue on any menu). */
~~~~

### src/bench/play.css · e79e6e3208a7

~~~~text
/* The card is the date and time, and Day and Week (owner, Oct 27: "There
   doesn't need to be any indicator other than the time and date on the
   bottom"); the player's name and place are read aloud, not shown. */
~~~~

### src/bench/play.css · 37516e5cd370

~~~~text
/* A broadcast heard at home: the station over the line, with a tiny icon of
   its kind (owner, Oct 14: a small card with a radio/TV icon, the station,
   and the line). */
~~~~

### src/bench/play.css · 057eee0204f6

~~~~text
/* The other person's past lines lean left of the player's own, so the three kinds read
   apart: your past lines, theirs, and what is said now (owner, Oct 28 sitting, 39). */
~~~~

### src/bench/play.css · 2b1608167da3

~~~~text
/* The talk box's controls (owner, Oct 27, 6:20 PM): with nothing to answer, one
   Continue at the bottom left and nothing else; in a conversation, the replies
   with Say nothing and Leave only where each is a real choice. */
~~~~

### src/bench/play.css · 931f7976a21c

~~~~text
/* Bills: the panel ends under its list and its bill, and grows to the window's height when they
   are longer (CTO, Nov 24: with three bills the lower half was empty). */
~~~~

### src/bench/play.css · 542f5a10885d

~~~~text
/* Patch notes: a long list of builds beside a long page of notes. It takes the window's whole
   height (owner, Nov 23, P1: "why are there 4 scroll wheel bars?" with free space under it), and
   only the list's own box and the page scroll in it. */
~~~~

### src/bench/play.css · 7c75e9147ae3

~~~~text
/* The month is days set by spacing and type: no grid lines, no boxes (owner, Nov 16). */
~~~~

### src/bench/play.css · 88e0af931532

~~~~text
/* The person card (on framed plates, owner Oct 29): their standing
   figure on a plate of its own at the left; at the right the name and what they are to
   you, small fact plates, how close you are, then a tab rail over one plate that holds
   their life told in sentences, their record or who they know. The card is as tall as
   what it holds and never scrolls; a long history pages by chapter. */
~~~~

### src/bench/play.css · e25d86b50247

~~~~text
/* Who they are now and where they come from, under the name (owner, Nov 1). */
~~~~

### src/bench/play.css · 01372bd64bf0

~~~~text
/* ---- Opening (director/opening-story, owner Oct 14, 2026) ----
   The night's news on the table at home and its reader; then the first
   choices glowing one at a time. A cinema scene hides the HUD. Positions
   only: the look is kit12's own components. */
~~~~

### src/bench/play.css · ae6615cc1199

~~~~text
/* ---- Polling place (director/scenes-and-filters, owner Oct 14, 2026) ----
   Election day's ballot over the polling place's picture: kit12's panel,
   heading and actions; positions only. */
~~~~

### src/bench/play.css · d7ff351e8d66

~~~~text
/* Sections side by side, as many across as the panel holds, so a screen
   with several bodies shows them all at once (owner, Oct 28, point 22). */
~~~~

### src/bench/play.css · abe4ed3cdb7a

~~~~text
/* A headshot: the person's bust, placed inside the frame by ui/face.mjs. Never in a circle or a
   box (owner, Nov 5): it sits in soft, even light and fades at its edges, as the approved bust does. */
~~~~

### src/bench/play.css · 90472739d327

~~~~text
/* People on the one roster (owner, Nov 7: the person card, "perfect"; the mock's
   pl-people): the roster at the left and the chosen person's card beside it, the
   width of the panel; each keeps to the panel's height and scrolls inside itself
   (a menu never scrolls as a page). */
~~~~

### src/bench/play.css · b823837edb0e

~~~~text
/* The person card stands the panel's full height (owner on People, Nov 16:
   "still lots of empty space"): each column's last section reaches the
   panel's foot, and a long story scrolls inside its own section. */
~~~~

### src/bench/play.css · 0dd893b1e903

~~~~text
/* The state filter under the level tabs: the kit's dropdown, boxed at rest as
   the main menu's typing boxes are (owner, Oct 28: "a separate box, like the
   main menu's"), reading the state's name. */
~~~~

### src/bench/play.css · 1e5f0d5b7849

~~~~text
/* What the bill adds reads brighter, never underlined: an underline looks like a link (CTO, Nov 24, on #10386). */
~~~~

### src/bench/play.css · 806d1c0537d7

~~~~text
/* ---- News is the paper (owner, Oct 28, point 25; the paper's looks,
   news3.png; art/newspaper-mockups). The sheet is the page: cream or white
   stock, ink, the paper's type and columns, no panel chrome. ---- */
~~~~

### src/bench/play.css · 57accf57d315

~~~~text
/* A brief is a headline and a line, never opened (owner, Oct 29 and Nov 1:
   "I click on it, nothing happens"): set small and plain, in the paper's sans,
   so nothing on it looks like the headlines that open. */
~~~~

### src/bench/play.css · 7032d9e81c78

~~~~text
/* A place in its own view (owner, Oct 28, point 28): the picture large across
   the top, what you do there and who works there under it, then Go. */
~~~~

### src/bench/play.css · 7cd22709b4f3

~~~~text
/* ---- Politics → Government, the framed-plate look (owner, Oct 29: "a real game
   menu"). One fixed panel:
   the screen fits the sheet, and what does not fit pages inside its box
   (ui/pager.mjs), never a scroll. Kit 13 tokens only. ---- */
~~~~

### src/bench/play.css · ddcf3dad6123

~~~~text
/* A picture fades into the panel at its edges, never a frame (owner, Nov 5). */
~~~~

### src/bench/play.css · 74295deb129e

~~~~text
/* A bust runs head to upper chest and ends in a soft fade, never a hard cut (MENU-LOOK;
     owner, Nov 23, P21: "look at the tiny headshots. Their bodies are cut off."). */
~~~~

### src/bench/play.css · 2d4b4baee3ed

~~~~text
/* ---- Plates: a group, never a box (owner, Nov 5 and Nov 16: "no boxes"; this replaces the
   Oct 29 framed plate). A plate is spacing and type around its content: no surface, edge,
   shadow or corner. */
~~~~

### src/bench/play.css · 6d04fc1a8827

~~~~text
/* The patch notes and bills lists are the pager's own box and scroll there; the list around it is no second
   scroll and no cap at 46% of the window (owner, Nov 23: "none of these scrollers ... when there's ample dead
   space"; the Bills list stopped at its fourth bill with the sheet's room below it empty). */
~~~~

### src/bench/play.css · 4f28c92ae2fb

~~~~text
/* The name sits above the shade, and the shade is dark enough under it to read on a bright picture
   (owner, Nov 23, C14: "tile names are faint on bright pictures"). */
~~~~

### src/bench/play.css · 11b90dd4e7c7

~~~~text
/* The campaign trail has fifteen or so tiles: they take the panel's width in more columns and a
   shorter tile, so the trail fits its panel and nothing scrolls (owner, Nov 23, C14: "the panel scrolls"). */
~~~~

### src/bench/play.css · 0d248c15bdec

~~~~text
/* The calendar's kinds, each its own color, named and hidden by the key above the month
   (owner, Nov 1: "color code those things ... and be able to hide them"). */
~~~~

### src/bench/play.css · 16f2ef128bc4

~~~~text
/* ---- The approved strip screens (owner, Nov 7, 2026; docs/mocks/2026-11-07-approved/):
   You, the person card, Government and Budgets. Section header strips of their own depth
   with spacing and type and no box (owner, Nov 5 and Nov 16), a bust that ends in a soft fade,
   a name in Playfair Display, small gold tags. All from ui/strips.mjs. ---- */
~~~~

### src/bench/play.css · 63977a28b929

~~~~text
/* A vote row with a paper behind it: its name is brighter at rest and a hover lights the row,
   the one light language (MENU-LOOK, States; owner, Nov 23, P22). It is not a .pick, whose
   span rule shrank the row's type to 14 px beside its 17 px neighbors (owner, Nov 23, C7). */
~~~~

### src/bench/play.css · 4fa116a43552

~~~~text
/* The rail's names (owner, Nov 8): a ring's name lights beside it after a quarter second of
   hover or focus, in the menu look, and a dot marks what is unread. */
~~~~

### src/bench/play.css · eb1a9c739bbe

~~~~text
/* In a scene or a talk the player card and the menu buttons are gone, never dimmed (owner,
   Nov 7); the talk box takes the stage. */
~~~~

### src/bench/play.css · 34fb2f8bbd92

~~~~text
/* The journal's page takes the whole panel, so the page is never half empty (owner,
   Nov 8 and Nov 23; N8-C32). */
~~~~

### src/bench/play.css · c6478f1eb257

~~~~text
/* A long name keeps its words whole and sends its aside under it, never squeezing both
     into one narrow line (owner, Nov 16, N16-58: "it's squished right here"). */
~~~~

### src/bench/play.css · ee5764301949

~~~~text
/* A list whose rows all break alike (Elections): the aside always sits on its own
   line under the name, so one row never carries it beside the name and the next
   under it (owner, Nov 23: "Why is the 2021 on a different line?"). */
~~~~

### src/bench/play.css · af7900c189cb

~~~~text
/* The subjects and the laws stand as tall as the panel holds; the box pages inside itself
   (ui/pager.mjs), never a scroll with free room below it (owner, Nov 23). */
~~~~

### src/bench/play.css · 29b50c02c48e

~~~~text
/* The governor races elsewhere, after the call (owner, Oct 27 audit: rows past the panel's foot
   could not be reached): the list spans the board in columns, so every state and Close fit the
   window with nothing to scroll. */
~~~~

### src/bench/play.css · c9d657078e5b

~~~~text
/* Metrics (owner, Nov 12 and Nov 17): the areas at the left, the area's measures beside them and
   the chosen measure's timeline; it fills the panel and never scrolls as a page, and a long list
   of measures scrolls inside its own column. */
~~~~

### src/bench/play.css · e5723101bfa7

~~~~text
/* Patch notes: headed sections of short bullets (owner, Nov 16: "like real patch notes"). */
~~~~

### src/bench/play.html · fbc472611369

~~~~text
<!-- Advanced: the one dev-mode start (owner, Oct 26): the world's settings, then anyone to play as. -->
~~~~

### src/bench/play.mjs · 6d8dedd20a74

~~~~text
/**
 * Who is here, small and packed in the top-right corner of the screen (ui/bust-strip.mjs;
 * owner, Nov 16: "the people in the top tight like c", mock C, and Nov 24: "they're
 * supposed to be at the top right"): a room is its painting, and the people in it
 * are a few busts in the corner. `scene` is anything with `people` and `more` (a
 * scene, a visit, a story beat); none clears it. `onClick` makes each person with
 * something to say a way into a talk, until a talk is open: then a click opens a card.
 */
~~~~

### src/bench/play.mjs · 994f0a0f1777

~~~~text
// A call or a letter: the one who rings or writes is not in the room, so the strip
// shows no one of theirs (owner, Nov 16, N16-44).
~~~~

### src/bench/play.mjs · 8ea72e6b884d

~~~~text
// Escape closes the top thing that is open and restores focus; only when nothing is open does it
// open Options (owner, Sept 20: "Escape dismisses the top applicable transient context and
// restores focus; when none is open, it opens the session menu"). In order: a person's card, the
// news reader, a term's card, the open menu. A talk or a scene is not one of them.
~~~~

### src/bench/play.mjs · cbb7694396fe

~~~~text
/**
 * Closes every card Escape would close, at once. A scene or a stop that comes due while one is
 * open (a menu opened while the day ran) is drawn under it, and the held clock looked like a
 * stuck game (owner, Nov 16: "I think I'm stuck... I pressed escape"), so whatever holds the
 * clock closes the cards first. Options, the pause Escape opens, is not one of them.
 */
~~~~

### src/bench/play.mjs · 3d8c2ba9502c

~~~~text
// The opening's staged story sets the backdrop itself; setting the room's
  // here first would load two pictures in a row (owner, Oct 28, point 2).
~~~~

### src/bench/play.mjs · 811d261af803

~~~~text
// A person in the room is talked to by clicking them; their name in the talk
  // box opens their card (owner, Oct 27: the card has no Talk button).
~~~~

### src/bench/play.mjs · bb434ca8c48e

~~~~text
// A line that follows another ("Two years after that, ...") is shown with the line it
  // follows, from its own link record, so a pop-up never opens on "that" with nothing before
  // it (owner, Nov 23, P20).
~~~~

### src/bench/play.mjs · 3cd3e83258b0

~~~~text
// No card notice that "a law took effect" (owner, Oct 27: "Why am I getting a
  // notification that a law took effect?"): a law that reaches the player is
  // told by its own scene and story, which say how.
~~~~

### src/bench/play.mjs · 377df969b454

~~~~text
// ---- Election morning (owner, Oct 26, 2026: going to vote is a choice) ----
// The narrator's morning from the election-day bank, a canvass for a
// candidate before the polls close, then Go vote (the ballot at the polls)
// or Stay home (no ballot cast). Buttons are control names.
~~~~

### src/bench/play.mjs · 7f76a952a9e9

~~~~text
// ---- Election night (owner, Oct 26, 2026: its own pop-up) ----
// The returns for the player's race as each place reports, smallest first,
// with the running count; Next returns steps through them; the call ends it,
// with the governor races elsewhere that night. Numbers and names are the
// count's record data; the narrator's lines come from the election-day bank.
~~~~

### src/bench/play.mjs · c9281c2acb39

~~~~text
// The governor races elsewhere that night have their own page after the
    // call, rows in columns across the board, so all of them fit the panel at 1024x768
    // with nothing to scroll (owner, Oct 27 audit: rows past the panel's foot
    // could not be reached).
~~~~

### src/bench/play.mjs · c4dc5d35c219

~~~~text
// ---- Election day (owner, Oct 14, 2026: election day is a scene) ----
// The polling place's picture with the voter and the household members who
// may vote, and the ballot: each race as the elections engine lists it, each
// candidate by name and party. A click marks the race; Leave blank and Leave
// are control names. The voting engine counts what is marked.
~~~~

### src/bench/play.mjs · 393bc5ae652e

~~~~text
// Day and Week run the world forward (owner, Oct 15, 2026); a calendar day
// runs it to that day. A scene the director fires stops any of them there.
~~~~

### src/bench/play.mjs · 6a626c0ea45d

~~~~text
// The narrator speaks first and alone; Continue, then the person talks (owner,
// Oct 28 sitting, 36: "The narrator shows first, Continue, then the person
// talks"). What comes next (the person, the next part of a speech) waits
// here for that Continue.
~~~~

### src/bench/play.mjs · 5124d5cf2d30

~~~~text
/**
 * Numbered replies; a key press of the number says it. Each is shown as the
 * player's own words, the line the transcript then records (owner, Nov 1:
 * a choice "should be an actual reply").
 */
~~~~

### src/bench/play.mjs · 92e2b3c211ce

~~~~text
// Saying nothing is a smaller control beside the four replies (owner, Oct 14).
// A line that does not read right is marked where it is said; no time passes.
// Mark gap is a developer control: it joins the talk box only while dev
// mode is on, and is never in the player's markup.
~~~~

### src/bench/play.mjs · 4039e29cc886

~~~~text
// The narrator sets the counter up first, alone, whatever the visit
  // arrives with (a race picked at once adds lines before this runs); Continue,
  // then the clerk speaks. Once per visit (owner, Nov 8: "it says first thing
  // on June 7th. You head to the clerk's office and speak to...").
~~~~

### src/bench/play.mjs · 443590d517ef

~~~~text
// No form at the counter (owner, Oct 28, point 31: the rules panel was a
  // dev menu): filing carries the party the player is tied to, from the
  // record, and the platform from the filer's own views.
~~~~

### src/bench/play.mjs · e9e26ab6098e

~~~~text
// The counter offers four replies at most; an office with more races
  // asks "What else is open?" among them and the next races follow, soonest
  // first. Each race is told apart in its own line (its seat, its election
  // day and who holds it now), never in a hover card over the next line
  // (owner, Nov 1: "a terribly designed menu").
~~~~

### src/bench/play.mjs · 3c2bfc45ca69

~~~~text
// What the filing asks next is said by the clerk, once, in the talk: no
  // count or status label sits under the dialogue (owner, Nov 14).
~~~~

### src/bench/play.mjs · 2c479d36794b

~~~~text
/**
 * Asking people for something, played as a scene (owner: every campaign act is
 * a scene): the place with the player at it, each person asked the next
 * Continue (their name and bust, what they said from the ask's own record),
 * the last the total in the narrator's voice. An evening of donor calls and a
 * volunteer shift are this.
 */
~~~~

### src/bench/play.mjs · 8d62e0e4c1e3

~~~~text
/**
 * A governor's race that carries the office the law elects on its ticket: the running mate
 * once named, else the people of the player's party the world's own pick ranks, best first, to
 * choose from, and Choose for me for the world's pick (owner, Nov 14).
 */
~~~~

### src/bench/play.mjs · da257063eacf

~~~~text
// An evening of calls is a scene (owner: every campaign act is a scene):
      // the player at the phones, one call per Continue, each person heard by
      // name with what they gave or why not, then the night's total.
~~~~

### src/bench/play.mjs · 2a36557e2577

~~~~text
// The petition record: the signatures held against those the
              // law asks, and the day they are due (owner, Nov 14: the tab keeps
              // the running total). A race that asks no signatures shows none.
~~~~

### src/bench/play.mjs · c0ff3962699e

~~~~text
/**
 * The campaign trail: where the acts are (owner, Oct 20: "campaign acts are
 * scenes you go to"). One card in Travel per filed campaign; its doors, event,
 * interview, forum, calls, donor meeting, speech and debate start their scenes.
 */
~~~~

### src/bench/play.mjs · 72aea6a11003

~~~~text
// The speech plays one part per Continue (owner, Oct 28 sitting, 11:
    // "Each Continue can carry a paragraph"); the last Continue ends it.
~~~~

### src/bench/play.mjs · 5838583fef4a

~~~~text
// A speaker heard on a broadcast is named, never drawn in the room
      // (the narrator said how it was heard); one on the montage or in the
      // room stands on the strip. A cutaway (America, the state, home) shows
      // its own people and the speaker only on the set, never on the strip
      // as well (CTO, Nov 19 and Nov 24: "in a cutaway she belongs only in
      // the corner").
~~~~

### src/bench/play.mjs · ecf496dc0b30

~~~~text
// Heard on a broadcast: the station over the line with its small icon
      // (owner, Oct 14: "a small card in the conversation text style with a
      // tiny radio/TV icon, the station, and the line").
~~~~

### src/bench/play.mjs · af7f24f4dc67

~~~~text
/**
 * The approved person card's strip screen for one person, built from their known record
 * (owner, Nov 7, item 54, "perfect"). Shown in its own panel by showPerson and inside the
 * People screen beside the roster. Returns null when the person is gone.
 */
~~~~

### src/bench/play.mjs · 9de22ecfde56

~~~~text
// When you were last in touch and why, read from the tie's own record (the
  // card's tie row: its latestChange); an event only, never how close you are
  // (owner, Oct 29: no band word for how someone feels, on any screen); a
  // person with no tie to you has no line.
~~~~

### src/bench/play.mjs · de80ed6e41b2

~~~~text
// Their life from the records, oldest first, as the card has told it since
    // #6772 and #7090: the card is sent the story and draws it (owner's
    // playtest, Nov 8).
~~~~

### src/bench/play.mjs · a2a43bb98f60

~~~~text
// Their life sits under the bust, in the bust's own column (owner on
  // People, Nov 16: "still lots of empty space"); with no bust it takes the
  // second column, beside who they are.
~~~~

### src/bench/play.mjs · f8361da352cb

~~~~text
/**
 * A card never runs past its panel (owner's menu rule; CTO, Nov 18). The life
 * story sits under the bust; when it does not fit there it moves to the card's
 * second column, which has the room, and stays under the bust when the panel
 * holds it either way.
 */
~~~~

### src/bench/play.mjs · 7ac4ee5335ad

~~~~text
/**
 * Another state's change opened (play-states-screen-opens-any-state): who voted
 * yes and no in each chamber and its sponsor, from the roll call kept the day
 * it passed. It closes like every menu, by its tabs and close control (owner,
 * Oct 29: no Back in any menu).
 */
~~~~

### src/bench/play.mjs · 058b7e025e5e

~~~~text
// A bill opened inside the meeting or the desk returns to it; a menu has no Back
  // (owner, Oct 29: "continue and back needs to be removed from every single menu"):
  // a menu's bill closes with the menu's tabs and close control.
~~~~

### src/bench/play.mjs · ef9ebb9358e5

~~~~text
// The body's line on the board: who sits on it, and the way in to writing
    // a bill, which takes the whole screen (a list of subjects beside the
    // chosen one's page). A menu has no Back (owner, Oct 28 and 29): the Your
    // office tab above it returns to the seat.
~~~~

### src/bench/play.mjs · 943a7acf71d3

~~~~text
/**
 * A tab of the You group as the approved strip screen: the player's name and
 * the one bust every tab of the group shows (the card's own face record), with
 * the tab's sections beside it. No whole figure stands beside a menu (owner,
 * Nov 7).
 */
~~~~

### src/bench/play.mjs · c19e1335b7ea

~~~~text
/**
   * You, as the owner approved it on Nov 7 (item 53; the mock's you-ol-g): your
   * name and role over a bust, "Who I am" and "What I'm like" in the first
   * person from your own records, and the people you're closest to as names
   * that open their cards. "What people say about me" waits for a record of
   * what people say about a person (stopgap in the PR body).
   */
~~~~

### src/bench/play.mjs · 3c2dc4120408

~~~~text
// One story from birth, a page to each chapter of the life, with no heading over any
    // part of it (owner, Oct 27: "written like a story, not individual sections... from
    // birth"; "remove all those subheadings").
~~~~

### src/bench/play.mjs · a23722760294

~~~~text
// How the place is doing (owner, Nov 5, ruling 23: "Keep it, call it Metrics"): plain numbers,
  // this year beside last, no charts. Every figure is the record's; the words are control names.
~~~~

### src/bench/play.mjs · 0387125f4de7

~~~~text
// The approved Budgets screen (owner, Nov 7, item 56; the mock's bud-strips): the
    // governments as tabs, the fiscal year typed at the right, the departments, the open
    // department as a typed page, the town's money, and who wrote it. The game keeps
    // budget lines by category rather than departments, so each spending line is a
    // department; Last year comes from the government's previous budget; "Asked" is the line
    // before this year's budget bill (lineBeforeBill); the executive's bust is the offices
    // record's chief executive; a department's head is the executive's appointee for its line
    // (budget.ts headsOf).
~~~~

### src/bench/play.mjs · a72b0c374366

~~~~text
// "Since last year ... up by ..." from the record's own change, set beside last year's
    // figure (Nation's budgetView: changeMinor, changePct); never computed here. No little
    // chart (owner, Nov 5: data, never charts).
~~~~

### src/bench/play.mjs · 9d136b9d8e7d

~~~~text
// The Guide as an encyclopedia page (owner, Oct 29: every menu like
  // Government, never blocks of text): the terms as cards on a plate, paged
  // two across, and the chosen term's article beside them; the search narrows
  // the cards as it is typed.
~~~~

### src/bench/play.mjs · edff9f9bca12

~~~~text
/**
   * Campaigns: the coming ballot's real races (owner, Oct 28, point 19), each
   * opening to who runs, with their filed views, every candidate's name their
   * card, and File for it taking you to the office that takes the filing.
   * The player's own filed campaign stays above it (screens-campaign-board
   * is the one board that replaces those rows).
   */
~~~~

### src/bench/play.mjs · 499b53eec233

~~~~text
// Where they stand, as typed rows in the strip screens' own
              // sentence case, not the capitals of a form's label (owner,
              // Nov 23, C11 and P28).
~~~~

### src/bench/play.mjs · 9b4780328a0f

~~~~text
// Run now, file on the date (owner, Nov 17): announce for a race whose
      // filing opens later; the campaign starts today.
~~~~

### src/bench/play.mjs · 010c4e59942b

~~~~text
// A race whose filing hasn't opened runs the world to that morning, as a
      // calendar day does (owner, Nov 17: "so I don't have to figure out the
      // filing thing"); what needs the player on the way stops it there.
      // Not for a player who is old enough only after this race's filing
      // closes: the morning it opens, they still could not file.
~~~~

### src/bench/play.mjs · a4a07cdbf4d1

~~~~text
// A race the player cannot run for says so on a disabled button, never on a caption under
      // the buttons (the CTO's send-back, Nov 24; the Nov 8 no-subtext rule), and then offers no
      // Sim to a filing date that is not theirs. A race not yet open says it through its dates
      // and its Sim button alone.
~~~~

### src/bench/play.mjs · 167bcc85d447

~~~~text
// One list, no headings over it (owner, Nov 24): the offices the player
      // runs for come first, each with when they can file, then the rest of the
      // ballot by election day; a race's page says its day.
~~~~

### src/bench/play.mjs · 3f5d7eace8c3

~~~~text
/**
   * Politics → Government, drawn as a game menu (owner, Oct 29: "make it look like a real
   * game menu"). The level (Local, State, Federal) and the branch
   * (Legislative, Executive) are two rows of tabs. A lawmaking body is its
   * room's painting with its name and when it meets, its party split, its
   * members as cards (a big chamber as a seat chart with your members and its
   * leaders first), its recent roll calls as bars and what is coming up, with
   * the level's executive beside it. One fixed panel: what does not fit pages
   * inside its box, never a scroll (owner, Oct 29). Every card opens the
   * person's card, where you act (owner, Oct 29: see and jump).
   */
~~~~

### src/bench/play.mjs · ca4bed678aee

~~~~text
// The body's name over its room, no line under it (owner, Nov 7: no
      // subtitles on menus): its seats are in Seats, its meeting and election
      // in Coming up.
~~~~

### src/bench/play.mjs · 0955247b9d6b

~~~~text
// What is coming up sits under the chief, and only when something is scheduled (no filler
      // line for an empty calendar; the CTO, Nov 24).
~~~~

### src/bench/play.mjs · 304060de4ce0

~~~~text
// A branch the level has nothing in is not offered (nothing on screen
      // does nothing): a township with no executive shows its board alone.
      // SG-PLAY-government-judicial-no-judges: no Judicial branch yet, since no
      // judge exists in the world to show (owner, Oct 29: judges read-only).
~~~~

### src/bench/play.mjs · 25ed858ca3f0

~~~~text
// The state filter: the kit's dropdown, the player's state by name
      // first (owner, Oct 28, point 15).
~~~~

### src/bench/play.mjs · 3f08cf3e64d7

~~~~text
/**
   * Parties, illustrated: the state's map with the player's districts and
   * town filled in the color of the party that holds each, a legend of the
   * parties by seats, then each party's seats as person rows (owner, Oct
   * 28, point 20: the map that once existed, brought back).
   */
~~~~

### src/bench/play.mjs · 193674166244

~~~~text
/**
   * Issues: the law in force here as cards by subject (owner, Oct 28, point
   * 21: "click an issue (minimum wage) and see the law itself and find the
   * law"), each card opening the law's own screen: what is in force at each
   * level and since when, the statute it rests on, the measure that enacted
   * it, what is coming, and who voted. No row repeats the state the filter
   * and the card already name.
   */
~~~~

### src/bench/play.mjs · 509f0ddb88ec

~~~~text
// Patch notes opened from the title sit beside the title menu, never over it (CTO, Nov 24: the panel
  // overlapped the menu and cut off "Continue as ..."): centered in the room to its right.
~~~~

### src/bench/play.mjs · c27394d57e0f

~~~~text
// You carries its own bust (the approved strip screen). Jobs and study and
  // Your life are strip screens too: no full-body figure stands beside a menu
  // (owner, Nov 7: "let's just do the busts"; Nov 10: "start removing the people").
~~~~

### src/bench/play.mjs · 0f697a9f962d

~~~~text
// A screen is as tall as what it holds (owner, Oct 27: "so much dead space");
  // the calendar, the people web and two-column readers fill the window.
  // A screen that ends under its content fits; one that flows in columns or
  // lays its sections out in a grid (Politics, Budgets) takes the window.
~~~~

### src/bench/play.mjs · 230efbf83561

~~~~text
// Bills end under their content, up to the window's height (CTO, Nov 24: the panel fits its content).
~~~~

### src/bench/play.mjs · bc4518f515d7

~~~~text
/**
 * No menu scrolls (owner, Oct 29; Lane 4, path 11): once a sheet is on
 * screen, each pager in a part of it that runs past its foot (the sheet's
 * body, or a split screen's side or main) gives back a row at a time until
 * the part fits, the pager holds one row, or a row given back no longer
 * shortens the part (something else in it is the taller). A screen counts its rows from the
 * window; what sits above a pager (a row of buttons, a long title) is only
 * known once drawn.
 */
~~~~

### src/bench/play.mjs · 0544c54ca55e

~~~~text
/**
 * A list that still scrolls takes the room a whole row, or a cap, could not use (owner, Nov 23: no
 * scroller "when there's ample dead space"): a sheet that ends under its content stops at its
 * tallest height, so the list's box grows by what is left of it instead of leaving a gap under it.
 */
~~~~

### src/bench/play.mjs · 5e2d315b66c6

~~~~text
// The rail over the player card: a column of round icons, News among them; it is
// the one menu, Who you are among them, the Guide its own entry (owner, Oct 28,
// point 23: not a tab in Politics). The card under it shows only the date
// and time (owner, Oct 27: "the time and date on the bottom"; no second picture).
// The rail is named from the controls file, so it is mounted once that loads.
~~~~

### src/bench/play.mjs · d0f5a85eb856

~~~~text
// A dock that comes into view under a resting pointer (the click that began the
// life, a scene that ends, a sheet that closes) shows no hover light until the
// pointer moves: nothing glows on its own (owner, Nov 23, N8-P12). It watches
// every panel that hides the dock, not only the rail's own `hidden`.
~~~~

### src/bench/play.mjs · f58124d52950

~~~~text
// ---- New life ----
// The title screen: a national scene or event, full window, that moves on with
// each visit (owner, Oct 8 and Oct 14). Continue resumes the life in progress.
~~~~

### src/bench/play.mjs · 7c36b9bc32b8

~~~~text
// The rotation runs only on the title menu itself: a creator panel keeps the
  // painting it opened on (owner, Oct 28: "the double background jump").
~~~~

### src/bench/play.mjs · 11eaf58a6b35

~~~~text
// One picture, one fade: both layers drift on the same clock, so the
        // base takes the new picture underneath and the top layer clears at once
        // (no second fade, no restarted zoom; owner, Nov 8 P1).
~~~~

### src/bench/play.mjs · 41644442a870

~~~~text
// The world's settings, as the approved world screen draws them: a row of arrows over
// the figure each step means (owner, Nov 8: "the figure itself in each control"). The
// chosen step of each row is kept here; the server reads the settings it makes.
~~~~

### src/bench/play.mjs · 465080aa3b23

~~~~text
/**
 * Where the close X on the front takes you from each panel: one level out. There is no Back
 * button on any menu (owner, Oct 28: "Remove every Continue and Back from every menu").
 */
~~~~

### src/bench/play.mjs · 710d4746a884

~~~~text
// After a state is picked, out returns to the states (owner, Oct 28, point 5), then out of
    // the creator.
~~~~

### src/bench/play.mjs · 2068a683b76b

~~~~text
// A sheet opened over the title (Patch notes, Options, Saves) closes when a front panel
  // opens, so New game never sits under it (owner, Nov 23, P2).
~~~~

### src/bench/play.mjs · 5942e76f2f18

~~~~text
// The loading card (no panel) sits in the top-left corner (owner, Oct 14).
~~~~

### src/bench/play.mjs · 03b5b5fc2c01

~~~~text
// The look, and the person in it, appear only once a gender is picked (owner, Nov 17).
~~~~

### src/bench/play.mjs · 32bf1f2dadd5

~~~~text
/** The birthday a new creator opens on: the youngest a life may begin at, 18, unless one is picked (owner, Nov 16 and 17). */
~~~~

### src/bench/play.mjs · 733736133ef5

~~~~text
// Begin names what is still missing and marks it, until it is filled (owner, Oct 28: "It
// should flash red, or say what is missing at the bottom").
~~~~

### src/bench/play.mjs · f8cc8744d618

~~~~text
// The portrait's size in the creator (layout, not game rules): it starts at `start`
// and is the one part that gives way, so a tall look (a man's or a nonbinary person's
// extra rows) with a name filled in still fits the window, and a short one fills the
// room it has (owner, Nov 17: no empty space in the creator; the CTO's catch, Nov 24:
// the panel's top edge ran off screen).
~~~~

### src/bench/play.mjs · e8660585d4e1

~~~~text
/** Draws the portrait, keeping the one being left up until the new one has every piece, so it is never blank while the look changes (owner, Nov 16, N16-9). */
~~~~

### src/bench/play.mjs · 832277c698f4

~~~~text
// Character appearance: the look's bust (the one every screen will draw) and
// a row with arrows for each thing a bust shows. Below the rows both tabs
// share, two tabs of clothes (owner, Nov 12: "two tabs, everyday and formal,
// bust flips between them"): the bust wears the open tab's clothes.
~~~~

### src/bench/play.mjs · 52f2c97340eb

~~~~text
// One Random draws the whole character (owner, Nov 17: "you should be able to randomize an
// entire character"): gender, name, birthday, place and look, on the creator's seed.
~~~~

### src/bench/play.mjs · 29aa873cbd9d

~~~~text
// The loading card: the panel holds only the progress over the scene.
  // Loading shows the player's state (owner, Nov 16): its capitol behind the
  // card, from the state chosen in the creator, or the drawn one once known.
  // The picture is in place before the card names the town, never after it.
~~~~

### src/bench/play.mjs · b66520f893e1

~~~~text
// The scene the director staged for the evening (the address) plays first
    // and sets the one backdrop the opening loads. The night's news pops up
    // after it opens, so it waits until the speech ends (C5; owner, Nov 7:
    // "News pop-ups wait until the scene ends").
~~~~

### src/bench/player.ts · b15589ff74d7

~~~~text
// Their household too: a talk at home opens on the biggest recorded
    // event of either person, which the director reads from its ledger
    // (owner, Oct 14, 2026, night).
~~~~

### src/bench/player.ts · 93fac0f24ba5

~~~~text
// A fresh clock stands at the start of the next day, and the day is lived to its start
    // (owner, Oct 27: nothing at midnight): a first act's hours run from the morning, never
    // from 12:00 AM.
~~~~

### src/bench/player.ts · c68e219585e6

~~~~text
// The birthday is met in its morning, like any day's first scene
        // (owner, Oct 27: nothing at midnight): the day is lived to its start.
~~~~

### src/bench/player.ts · d385a64e7dfd

~~~~text
// Election day is a scene (owner, Oct 14 and 26, 2026): the director
        // stages the polls at the eve's close for a voter the count counts,
        // so election morning, with the choice to go vote, comes before the
        // core enters it. The clock's midnight is the start of the core's
        // next day.
~~~~

### src/bench/player.ts · f8e4e935305b

~~~~text
// Day never opens a choice list (owner, Oct 14, 2026): the character
      // answers its own choices with the core's selection, and only a stop
      // (a director scene, a fixed commitment or a deadline) ends the advance.
~~~~

### src/bench/printed-words.ts · 6f3d6d0ec9a7

~~~~text
/**
 * A body's sitting that took up business, told by what it took up (CTO,
 * Nov 1: print what the body did, not that it sat). The desk prints one only
 * where none of its votes reached the wire; a sitting that took up nothing
 * is in the week's meetings brief, never a story of its own.
 */
~~~~

### src/bench/printed-words.ts · c912f6ccc17f

~~~~text
/**
 * An obituary: who died, the age they reached and the town they lived in,
 * then the life's facts the records hold (words-paper-and-journal-everyday-
 * life; owner, Nov 1: "real ones with some good fluff"): where they were
 * born (the run's birth record, as the Journal reads it), the office they
 * served in (their term), where they last worked and for how long (their
 * latest work record), and the partner and
 * children who survive them (their family records, by name). A fact the
 * records do not hold is left out, never guessed.
 */
~~~~

### src/bench/progress.ts · ceee42b2ebfc

~~~~text
// A played life enters as its player, at the age the opening gave them
  // (owner, Nov 16: "18, unless you pick another age"; in a town with nobody
  // that age the nearest stands in, world.ts `entrantChoice`). Without a
  // player, the town's own 17- and 18-year-olds are searched.
~~~~

### src/bench/scene.ts · d029d809a214

~~~~text
/**
 * The one condition every room of a home is shown in: the most wanted of the
 * household's conditions that each of its rooms is painted in, so the living
 * room and the kitchen of one dwelling match (owner, Oct 28 sitting: a
 * run-down living room beside a clean kitchen). With none painted for every
 * room, every room is shown as painted.
 */
~~~~

### src/bench/scene.ts · bba965b2677a

~~~~text
// The opening's day ends at home after the address (owner, Oct 14, 2026).
~~~~

### src/bench/scene.ts · 7f1779ca7db5

~~~~text
/**
   * The minute the scene is drawn at: a household member on a shift then is at
   * work, not at home. Left out on the opening evening, which keeps the whole
   * household (the address is watched at home, owner, Oct 14).
   */
~~~~

### src/bench/scene.ts · fe83615ac1ad

~~~~text
/**
 * Who is in the room, as the strip of busts shows them (owner, Nov 11, 2026:
 * "I do like this strip"): everyone the records give a reason to be there,
 * each a name and a bust dressed for the place. The player is not listed. A
 * room of more than `here.shown` people names the speaker and the people the
 * scene is about, then the people the player knows, then whoever else until
 * the strip is full, and counts the rest (`more`). Nobody is listed without a
 * recorded reason, and a person the bank cannot draw yet (a child) is left out.
 */
~~~~

### src/bench/scene.ts · 494723abfe70

~~~~text
/** The opening day: home after the address, by rule (owner, Oct 14, 2026). */
~~~~

### src/bench/story.ts · 7f88111a887e

~~~~text
// A call or a letter is between two people who are not in one room: the
    // one who rings or writes is heard or read, never staged standing beside
    // the player (owner, Nov 16, N16-44). They stay in `names` for their lines.
    // `apart` tells the talk box too, which would otherwise stand the caller on
    // its strip by their card's face.
~~~~

### src/bench/story.ts · 6c2ae523a499

~~~~text
// One narrator: a scene with a purpose opens on its own narration, the
    // same voice that speaks between its lines; the situation's paragraph is
    // for a moment with no exchange (the plan of Oct 28, section 1: "Two
    // narrators per scene ... One narrator, the director's").
    // The situation's arrival line is for a scene with no exchange. One with
    // a purpose opens on its own narration alone: the clock and the place are
    // on the screen (owner, Nov 24: "you already know what day and time it
    // is"), and saying them beside the scene's own lead is a second narrator
    // (the plan of Oct 28, section 1, which story-one-narrator.test.ts holds).
    // This replaces the Nov 8 arrival before a purpose's setup (3acdf74dfc).
~~~~

### src/bench/story.ts · bf3a9229c9c8

~~~~text
// The address plays as a montage: one picture and cast per part (owner,
    // Oct 29 02:35).
~~~~

### src/bench/title.ts · c33f5ec89e08

~~~~text
/**
 * The title shows the national monuments, each in every light its painting
 * on main has (owner, Oct 29 monument ruling, OWNER-DECISIONS: "menu screens
 * show DC monuments, not conventions"): the U.S. Capitol, the White House and
 * the Lincoln Memorial. Conventions, rallies and rooms are out. A Washington
 * Monument or Jefferson Memorial joins the rotation by adding its place here
 * once its painting is in the manifest. The latest character in front and
 * passersby wait on the people system (Lane 4, path 1).
 */
~~~~

### src/bench/title.ts · f477e98236ea

~~~~text
/**
 * Every capitol the manifest paints, one per state and territory: the title draws from all of
 * them, not three (owner, Nov 17: "draws from many more monument paintings, and each game
 * starts on new ones").
 */
~~~~

### src/bench/ui-look-scan.mjs · 796fcc3fcc08

~~~~text
// The scans of the menu look guard (owner, Nov 23: "a box around boxes ... explicitly
// forbid it. Make it turn main red" and "none of these scrollers, especially when there's
// ample dead space in these menus"). Each is a function that runs inside the page, so a
// browser check passes it to `page.evaluate`; docs/mocks/2026-11-07-approved/MENU-LOOK.md
// is the rule they enforce, tests/guards/ui-look-baseline.json what is still allowed.
~~~~

### src/bench/ui/ballot-paper.mjs · 6f6bb9237237

~~~~text
// The ballot at the polls (owner, Oct 26: "Why can't you click these people"; mock pl-ballot):
// each race as a block on a paper, its candidates with an oval to mark, Leave blank; at the
// right "What I know about them", the candidate under the pointer (or the first of the race)
// with face and what the player knows. The voting engine counts what is marked.
~~~~

### src/bench/ui/bill-paper.mjs · bc3b3b49c4e4

~~~~text
/**
 * Today's amount beside the new one: two cells, the law in force as it stands
 * and what the bill makes it (the owner, Oct 29: "the bill ... with today's amount beside
 * the new one").
 */
~~~~

### src/bench/ui/bill-paper.mjs · a62c8bbe1551

~~~~text
// A field and a name, not prose: the glossary does not underline the label (CTO, Nov 24:
    // "Sponsor is underlined like a link").
~~~~

### src/bench/ui/bust-strip.mjs · 1eaa5e24c388

~~~~text
// The strip of busts (owner, Nov 11, 2026: "I do like this strip when there's a
// scene and there's people to talk"): the people in a room as busts standing
// straight on the room with their names under them, each in a soft pool of light
// (no plate and no band: CTO, Nov 24). It lies along the foot of the room to say who is here,
// and joins the top of the talk box in a talk, where whoever speaks is lit and a
// little larger. A room is its painting alone; nobody is drawn into it.
~~~~

### src/bench/ui/bust-strip.mjs · 70fd6085c772

~~~~text
// Someone with nothing to say is not a way into a talk (owner, Nov 1: "If
  // there's no dialogue, you shouldn't be able to click on the person"); but
  // anyone on the strip opens their card (owner, Nov 23, P9: "I can't click on
  // any of these people").
~~~~

### src/bench/ui/bust.mjs · ebd372601580

~~~~text
// The one bust part (owner, Nov 10, 2026: "we need to start transitioning to
// the bust system"). A person on a menu is a few pictures stacked on one
// square canvas: head, top, facial hair, hair (src/bench/bust.ts picks them).
// Every piece is one file shared by everyone who wears it, so the browser
// fetches and decodes each once. Screens call `bustStack` only through the
// one face part (face.mjs); nothing else draws a person on a menu.
~~~~

### src/bench/ui/calendar.mjs · cf78ca5a60bc

~~~~text
// The calendar: a compact month of day tiles with a small
// icon for each thing on the day, the chosen day on a plate of its own between, and Coming up
// beside it paged inside its box (owner, Oct 29: a menu never scrolls as a page). The screen
// hands it the day that is today, the dated items in words, the labels from the controls
// file, and what skipping forward to a day does.
~~~~

### src/bench/ui/calendar.mjs · 759b9510ec7f

~~~~text
// The kinds a player keeps on a calendar, each with its own color (owner, Nov
// 1: "color code those things. Like town meetings and stuff. And be able to
// hide them if you want"); the key above the month names them and hides them.
~~~~

### src/bench/ui/calendar.mjs · 02075505340e

~~~~text
// A kind is named by its icon and its words, never by a color (owner ruling, Nov 8).
~~~~

### src/bench/ui/calendar.mjs · 1b8c0264a59a

~~~~text
// Each thing on the day is named on it, its kind's icon before its own
      // line (owner: "events on their days, one worded line each naming who
      // and what"; the pl-calendar mock), the player's own first; the rest
      // are on the day's plate.
~~~~

### src/bench/ui/chamber.mjs · 2784f2341e7d

~~~~text
// The one chamber header: the painting of the room a body or an office works
// in, and its name set on the picture, with no line under it (owner, Nov 7: no
// subtitles on menus).
~~~~

### src/bench/ui/counter-picks.mjs · 326ec690a523

~~~~text
// Which races the filing counter's replies offer at one turn of the clerk's
// talk. The talk box holds a few replies, never a long list (owner, Oct 26), so
// an office that takes more races than fit asks "What else is open?" as one of
// them, and the next turn offers the next races, soonest election first, until the last
// page, where it stops. Every race is reachable at the counter itself.
~~~~

### src/bench/ui/dev-reply-why.mjs · d11fa82abc8c

~~~~text
// Dev mode's "why these replies" (owner, Nov 16: dev mode does the tracing in the game): beside a
// scene the player has open, the facts the scene knows with the records each cites, and for each
// reply offered the use that placed it (the facts it needs, the facts that would rule it out, what
// it follows) and the wordings that fit the spot as closely. Every record id opens the one Trace
// box, so a vote's reasons term by term are one click from the reply that cites them. It reads
// only what /api/story serves with ?dev=1; it writes nothing and spends no time.
~~~~

### src/bench/ui/dev-scene.mjs · b4c74e610093

~~~~text
// Every kind, under the one of three headings that says what dev mode can do for it (the
  // engines' own records decide it, `scenes()`): bring it about now, run the world until its
  // cause record comes, or nothing yet. No line under any button (owner, Nov 8, 2:15 a.m.: no
  // subtexts); a kind nothing can start is listed and cannot be picked.
~~~~

### src/bench/ui/draft-card.mjs · 500615446b10

~~~~text
// Writing a bill (owner, Oct 14: "bills follow the real form, and the player
// edits only the terms"). A list of everything the body may write a bill
// about, grouped by law area, each row with what is in force today; beside
// it, the chosen subject's page: what is in force, the one term the player
// sets, and Draft. Built from the pick list and the strip sections every
// list-beside-its-page screen uses; the screen hands it the body's issue
// groups already in words, and nothing here computes.
~~~~

### src/bench/ui/draft-card.mjs · 060f5e8e8604

~~~~text
// A phase-in by a percent a year (the owner's ruling, Sept 12: dated steps or a percent a
    // year): the percent, the years it runs and the day of the first increase. The amount in force
    // is what it rises from, so the typed amount and the added steps give way to it.
~~~~

### src/bench/ui/election-night.mjs · 55e6e41bcf76

~~~~text
// Election night (owner, Oct 26: "its own pop-up menu kind of thing"; mock pl-night): the
// title, then strips: the count as the places report (names and votes), what the narrator
// says of it, and the way on. A step is { lines: [{ text }], totals: [{ name, votes }] } or,
// last, { nation: { lines, races } }.
~~~~

### src/bench/ui/face.mjs · 52f7c6d80d24

~~~~text
// The one face part (play-one-person-shows-two-faces; Fable audit, Nov 9:
// "There are six ways to draw a person card and three ways to draw a face").
// Every card, list, menu and strip draws a person here, from the one face
// record the server gives for that person (scene.ts faceOf, or the creator's
// look through appearance.ts portraitFace): their bust (ui/bust.mjs stacks its
// pieces). Three crops of the same bust, never a second picture:
// - `round`: the headshot, the head filling the middle of a soft-edged square so
//   every face takes the same share of the frame at every size (no circle, no box; owner,
//   Oct 28);
// - `bust`: across a screen's left column, ending in a soft fade on the chest
//   (the approved strip screens);
// - `strip`: the stack alone, its head's middle marked, for the strip of busts
//   (ui/bust-strip.mjs) to place.
// How a bust is cropped is the owner's call (Nov 10, "Staging waits for
// busts"); a new crop is added here, never drawn in a screen.
~~~~

### src/bench/ui/face.mjs · 7e43898a01a9

~~~~text
/**
 * A frameless picture of a look, for the creator's rows of hairstyles, facial hair and tops: `head`
 * fills the square with the head and its hair, `chest` takes in the shoulders and the top. No circle and
 * no box (owner, Nov 5: portraits are never inside a circle or box); the row draws the lit fill.
 */
~~~~

### src/bench/ui/guide-screen.mjs · d4f4858e4512

~~~~text
// The Guide (owner, Oct 28: its own menu entry; mock pl-guide): the civic words in a list at
// the left, the chosen word's article in header strips at the right: what it is, what it
// means here, and the words it is tied to, on the one list-beside-detail part
// (`rosterScreen`). The list and the article are the glossary's own records; the screen
// hands them in.
~~~~

### src/bench/ui/look-row.mjs · e1996e0d69a2

~~~~text
// A row of the character creator's look, or a stepper: a feature's name, then its choices, each a color
// swatch (skin, hair color, cloth colors) or a picture (hairstyle, facial hair, top)
// (owner, Nov 17). The screen passes what a pick does.
~~~~

### src/bench/ui/meeting-item.mjs · 6a9f7e43d021

~~~~text
// One agenda item at a meeting, or one bill on the desk: the bill's name, number and
// sponsor, the members as round faces ringed by how each voted, the tally and its result in words, who spoke, and the buttons under it in rows (the paper and the
// speeches, then the vote). The panel the meeting and the desk both draw (owner, Oct 29:
// "the UI is terrible"; the members, the tally and the result on the panel). Every word
// is a control name or a record's own: the status word, the counts, the member names.
~~~~

### src/bench/ui/metrics-screen.mjs · d92e7f6e9d3a

~~~~text
// The Metrics screen on the one list-beside-page part (`rosterScreen`): the areas down the left,
// the chosen area's measures beside them (this year, last year, the change), and the chosen
// measure's timeline: one thin line over the years with each value written on it, no bars and
// no pies (owner, Nov 12: "numbers stay the main view; a measure opens a timeline"). Every
// figure is the registry's; the screen only places them. Nothing scrolls as a page.
~~~~

### src/bench/ui/metrics-screen.mjs · e024249e5263

~~~~text
/** How many years the table shows at most, the newest last (mock Layout A, owner, Nov 12: "A plus the years table"). */
~~~~

### src/bench/ui/news-board.mjs · 82ddc70c64e3

~~~~text
// News (play mock pl-news, on the owner's Nov 16 ruling that every story opens on a click): the
// outlets as tabs, the paper's name and the day, then every story as a headline in a list at the
// left and the chosen story at the right, set in type on the dark panel (never a cream sheet:
// owner, Nov 7). The screen hands it the outlets with their stories in words, the labels, the day and how to name
// a story. Every story is a headline in a list at the left; clicking one opens it at the right.
~~~~

### src/bench/ui/news-board.mjs · 047694cf2ed5

~~~~text
// Every story is a headline in the list at the left and opens at the right when clicked
    // (owner, Nov 16: "News stories open on click"). The page opens on its fullest story.
~~~~

### src/bench/ui/news-open.mjs · 781cf1f7cac2

~~~~text
// An outlet the player follows comes first (CTO, Nov 24: "News opens on the
  // first outlet the player follows"): the one with the newest story they have
  // not read, else the first of them (the home paper leads the tabs), whether or
  // not it has printed anything: the household's own paper, never the newest
  // story of an outlet it does not follow.
~~~~

### src/bench/ui/newspaper.mjs · 0f6fe79dc644

~~~~text
/**
 * The newspaper art (art/newspaper-mockups, owner Oct 28). Each paper keeps
 * one engraved masthead with its name set in the blank plate; `plate` is that
 * plate's left, top, width and height in percent of the strip.
 */
~~~~

### src/bench/ui/pager.mjs · 2fbfffe666ee

~~~~text
// The one long-list box: a bounded box that shows `rows` rows and scrolls
// inside itself for the rest. No arrows and no "1 of N" (owner, Nov 8: "like
// those shitty survey sites"); the menu panel itself still never scrolls (Oct
// 29), only this box. The box keeps its height, so a short list never moves
// the screen. A list this long sits beside its detail (patch notes, the
// journal's chapters): choosing a row shows its detail, it never turns a page.
~~~~

### src/bench/ui/palette-setting.mjs · cc614bfac290

~~~~text
// The color-blind palette as one global setting (owner, Nov 5: every menu reads one shared
// place, colors are never set per screen): a class on the body, remembered in the browser, off
// by default. The shared colors are tokens in play.css; this class swaps them for the
// Okabe-Ito set and gives each color-only signal a second cue (a ring's stroke).
~~~~

### src/bench/ui/people-screen.mjs · b33cb56a3e5d

~~~~text
// The People screen (owner, Nov 7: the person card, "perfect"; mock pl-people): everyone you
// know in a roster at the left, grouped by how they're tied to you, and the selected
// person's card beside it, on the one list-beside-detail part (`rosterScreen`). The roster
// reads the records the screen hands it; the card is the one person card the game builds
// everywhere (the screen passes its builder in).
~~~~

### src/bench/ui/person-card.mjs · 798ceadb1ec6

~~~~text
// The one person card (play-one-person-shows-two-faces): every place a screen
// shows a person by face and name builds it here, from the one face record the
// server gives for that person (scene.ts faceOf), drawn by the one face part
// (face.mjs). Each layout is a mock's arrangement of the same parts; none
// draws a face its own way. Never a mark for how someone feels about you
// (owner, Oct 29: no scale of what someone thinks of you); no letter in a
// circle (owner, Nov 8).
~~~~

### src/bench/ui/plate.mjs · 8b0a73d4691f

~~~~text
// The one framed plate: what a menu's content sits on, never the bare panel
// (owner, Oct 29: "I don't like... the black or gray just background, like
// stuff sitting on it"; he chose framed plates). A soft gradient, a thin brass
// edge, an inner shadow and small brass corners, all from play.css. Every
// record section is one (section.mjs); a screen asks for a plate by itself
// for anything else.
~~~~

### src/bench/ui/rail.mjs · c8f543439f49

~~~~text
// The Guide: an open book, its own entry on the rail (owner, Oct 28, point 23).
~~~~

### src/bench/ui/screen.mjs · 20e509bc12ec

~~~~text
// The record screen: the menu type of every screen that reads one person's or one
// place's records (Who you are, Jobs and study, the Politics guide). A screen is a
// definition and this renderer draws it; change the type here and every record screen
// changes (owner, Oct 27: "one for every menu, and then a menu type, and then just
// insert it").
//
// A definition: { controls?: [node], heading?: { name, meta }, lede?, grid?,
// sections: [{ title, items, wide? }] }. `controls` (a select, a picker) sit above the
// rest; `grid` lays the sections two across, a `wide` one across both. An item is one of:
//   { text, tone? }            a line: tone "feature", "narrative", "small", "empty" or "title"
//   { fact: [label, value] }   a label and its value on one line
//   { people: [{ name, note, onOpen }] }   names that open their card
//   { figure: [label, value] } a label and a large value
//   { stats: [[label, value], ...] }       figures side by side
//   { picture }                a picture slot (removes itself when the file is missing)
//   { views: [{ label?, text }] }          short paragraphs side by side
//   { total: [value, label] }  a large count and what it counts
//   { pages: [item, ...] }     items one under another
//   { actions: [{ label, onClick, className?, testid? }] }   buttons in a row
//   { section: { title, items } }          a section inside a section's pages
//   { node }                   a node another kit part drew (a chart, a select)
~~~~

### src/bench/ui/section.mjs · 85ff9afc603c

~~~~text
// The one section part: a group of a screen's rows, under its title when it has one, on a
// framed plate (owner, Oct 29: content never sits on the bare panel). Layout only; the title
// and content come from the screen's definition.
~~~~

### src/bench/ui/split-screen.mjs · 51ed69334e57

~~~~text
// The one two-column menu layout: a row of controls across the top, a main
// column and a side column of labeled sections, the whole fitting its panel
// (owner, Oct 29: a menu is a fixed panel; what does not fit pages inside
// its box, it never scrolls as a page). Politics → Government is the first
// screen on it.
~~~~

### src/bench/ui/strips.mjs · 79384c553cd6

~~~~text
// The approved strip screen (owner, Nov 7, 2026: You, the person card,
// Government, Budgets; docs/mocks/2026-11-07-approved/): a left column with
// the screen's name, the role line under it and a bust, and sections down the
// right, each a header strip of its own depth under a broken gold outline.
// Every screen of that look builds from these parts, never its own markup.
~~~~

### src/bench/ui/strips.mjs · 6a0061ae42bd

~~~~text
// `underBust`: sections set in the bust's own column, under it, so the
      // portrait column leaves no hole (owner on People, Nov 16: "still lots
      // of empty space").
~~~~

### src/bench/ui/tab.mjs · 8a2eabbf2fee

~~~~text
/**
 * A bar of tabs (`tabs`: { key, label, onSelect }), `active` chosen, keyed by `attr`, on
 * the rail every tab sits on (owner, Oct 29: buttons need "a railing to sit on" and a
 * clear mark on the chosen one).
 */
~~~~

### src/bench/ui/talk-box.mjs · 7fe1e6de87ad

~~~~text
/**
 * A talk's lines in the three kinds the box tells apart (owner, Oct 28 sitting, 39:
 * "not enough delineation between what the player said, what was said before, and what is
 * being said now"): the player's past lines (`history mine`, named), the other person's
 * past lines (`history theirs`, named), and what is said now (`speech`, everything after
 * the player's last line). `lines` are `{ text, mine, lying, held, grade }`, oldest first;
 * `keep` is how many past lines stay above the line said now.
 */
~~~~

### src/bench/ui/talk-box.mjs · fe451ff92b5e

~~~~text
// With nothing to answer (the narrator alone, or an exchange at its end) the box
  // shows one Continue, bottom left, and nothing else (owner, Oct 27, 6:20 PM).
~~~~

### src/bench/ui/term-mark.mjs · f671abd7b43e

~~~~text
// Inline glossary help (owner, Nov 8: "I've never seen any of the inline helping stuff for the
// glossary"). A civic term is underlined wherever it appears in player text, not only when it
// is a whole label: hover shows its short definition with Mark as learned, a click opens the
// Guide there. One walker over the game's text, run again whenever a screen draws.
~~~~

### src/bench/ui/toast.mjs · 3071755d0129

~~~~text
// The one toast part (owner, Oct 26: a toast that never leaves is a defect; CTO, Nov 24,
// N16-24: "pop-ups vanish before you can read them"). A toast is a `.toast` panel at a
// screen corner. It never times out: it stays until the player opens or closes it (a
// `[data-close]` slot, see panel.mjs), and until then it waits behind whatever the player
// has open: a scene, a talk, a person's card or a menu, and shows when that closes.
~~~~

### src/bench/ui/travel-screen.mjs · fc963778ef21

~~~~text
// The Travel screen (owner, Nov 1 and Nov 7: places as pictures; mock pl-travel): the
// places you can go in groups of picture tiles at the left, and the chosen place's
// picture, hours, who is there, what you can do there and Go at the right.
// The screen hands it entries; a place's details load when it is chosen.
~~~~

### src/bench/ui/trend-line.mjs · 478bb17f913f

~~~~text
// A figure's history as a plain line on the dark panel, never a bar graph (owner, Nov 8:
// The Political Process's "View Timeline": a line, the first and last years at its ends).
// The screen hands it the record's yearly amounts, oldest first; nothing here computes a
// figure, it only places points.
~~~~

### src/bench/ui/trend-line.mjs · 938f8393f568

~~~~text
// Every value written on the line (owner, Nov 12: "each value written on it"), its year
  // under the point; the words come from the caller, never made here.
~~~~

### src/bench/ui/tv-set.mjs · 78c5193bee2d

~~~~text
// A speech heard on television (owner, Nov 17: "A broadcast speech gets a TV
// graphic"): the speaker's bust on a set with Live over it and the station under
// their name. The bust is the shared strip of busts (ui/bust-strip.mjs) with one
// person; nothing here draws a face of its own.
~~~~

### src/bench/whole-figures.ts · 8b5aab341370

~~~~text
/**
 * A figure holding something is drawn only where that thing belongs (owner,
 * Oct 29: phones at a rally or on the street, paper at a hearing or the
 * address desk, pen and paper at a desk; never at home), read from
 * src/bench/data/whole-figures.json `propPlaces`; one holding nothing goes anywhere.
 */
~~~~

### src/bench/world.ts · 880fcc31931f

~~~~text
/**
 * The youngest a new game's player is (owner, Nov 16: "Just do 18 and up right now. Life before
 * 18 will come after early access."). Life under 18 stays in the simulation; it is only not where
 * a new game starts (pool item people-life-before-18-after-early-access).
 */
~~~~

### src/bench/world.ts · 9cc3979cf849

~~~~text
/**
 * The birthday of a player who is the default age (owner, Nov 16: "18, unless
 * you pick another age"): the start date's own month and day, `PLAYER_MIN_AGE`
 * years back (a leap day falls on the 28th).
 */
~~~~

### src/bench/world.ts · 7d2c2fecbcf6

~~~~text
/**
 * The resident a chosen birthday makes the player (owner's Oct 26 playtest: a creator birthday of
 * 35 left the parent 47 and the schooling of a 17-year-old; Nov 16: a 17-year-old with a wife).
 * The world is drawn with a resident of the chosen age (`playerAge` in population.ts), and the
 * player is a resident whose own age on the opening day is the chosen age, born nearest the
 * chosen day, so their household, partner, children, schooling, work and money are the life
 * someone that age lived. The identity call then moves the birthday within that same age
 * (`applyChosenPerson`). A resident is passed over if the chosen day would leave a parent, or the
 * player as a parent, younger than the child-bearing minimum the kin builder keeps
 * (`OPENING_KIN`). Where the town holds nobody that age, the resident of the nearest age stands
 * in, marked as an estimate, and keeps their own birth date. Nothing here is drawn.
 */
~~~~

### src/bench/world.ts · 2f151744998b

~~~~text
// A woman or a man is drawn from the residents of that sex, so the partner
  // the place gave the resident is one the chosen gender fits (owner, Nov 1,
  // v0.73.0: "it has chosen to make my character gay again"); nonbinary and
  // a place with none of that sex at the age take the nearest birthday.
~~~~

### src/bench/world.ts · f036e6785a1c

~~~~text
/** The warm-up the New game route and the day-zero check use (owner, Nov 14: the town in motion on day one). */
~~~~

### src/bench/world.ts · d5054323a6a1

~~~~text
// Day one from the century or from today's real record (CTO line 6935086070 on #9747, point 5).
~~~~

### src/bench/world.ts · 7234c4d5f451

~~~~text
// The century before day one (owner, Nov 17, 2026: history simulated from 1925, a year at a
  // step, during the loading screen): run here a year at a time, each year its own step so the
  // loading screen keeps answering, before the offices seat whoever it elected.
~~~~

### src/bench/world.ts · d7f9b084802a

~~~~text
// The opening, told as a story from the records (owner, Oct 14, 2026): the
  // President's address and that night's news, composed once while the
  // world loads and kept on the director's ledger for the screens.
~~~~

### src/core2/ballot-order.ts · ad85077fe609

~~~~text
/**
 * The order of names on the printed ballot, by the law of the place
 * (`data/research/elections/ballot-order-2026.json`): alphabetical by
 * surname, a drawn alphabet, a lot drawn for each contest, rotation so each
 * candidate is first on an equal share of ballots, by party, the incumbent
 * first, or filing order. A drawing the law requires (the alphabet, a lot) is
 * the world's own recorded draw: the same contest always draws the same
 * order (owner, Oct 14, 2026: where the law says lot, a recorded lot from the
 * world's generator). Every voter reads the first-listed edge from the form
 * of the ballot they hold (`ballotCuesOf`).
 */
~~~~

### src/core2/bill-catalog.ts · 4090ae0819d3

~~~~text
// Any amount law can be repealed: the body's own law ends and the level
  // holds what it held before, including nothing (owner, Nov 7).
~~~~

### src/core2/births-people.ts · a1c04b870c11

~~~~text
// A parent's origin, so the family looks related (owner's playtest, Nov 8).
~~~~

### src/core2/budget-stakes.ts · 38c9d4ed338f

~~~~text
/**
 * What a federal budget line sends each state, per resident, against the
 * national average (1 = average): a member of Congress weighs it when a bill
 * raises or cuts the line. Calibrated on USAspending and agency records
 * (data/research/federal/federal-spending-by-state-fy2024.json); each world's
 * stake is drawn around the published one (owner, Oct 27: realistic, not real).
 */
~~~~

### src/core2/business-books-view.ts · b4a2569bd3ac

~~~~text
/**
 * The record a screen would read for a business's books (business audit,
 * owner ruling 5, Oct 14): whether a player sees another business's books is
 * the owner's open decision (registered as an owner decision), so this builds
 * the record only, from the books and the records other engines keep, and
 * holds no text. Read-only: it spends no game time and creates no facts.
 */
~~~~

### src/core2/business-books.ts · cbe5d1124343

~~~~text
/**
 * This world's ratio for a kind of business: the published aggregate moved
 * by the world's own draw (owner, Oct 27: realistic, not real). Margin and
 * pay share move as levels; the sales-sensitive cost share stays between 0
 * and 1. Every business of a kind in one world reads the same ratio.
 */
~~~~

### src/core2/business-charges.ts · 7dce4989ce77

~~~~text
/**
 * What a business pays straight out of its cash under a law or a tax, beside
 * its wages and the suppliers on its books: the employer's share of payroll
 * taxes, the property tax on its premises, what an energy price law adds to
 * its bills, health premiums it pays for its workers, its compliance duties
 * and its profit tax. Each payer engine records the payment here the moment it
 * moves the money, as a running total per business and kind, so the month's
 * books (business.ts, `bookedMonth`) read what the month added without
 * scanning any history. The kinds that are operating costs are weighed by the
 * staffing and closing decisions; profit tax is taken out of profit, so it is
 * read through the business's cash (its cushion, its room to hire), never as a
 * month's loss (lead's call, approved by the owner Nov 16).
 */
~~~~

### src/core2/business-names.ts · da2b878d0295

~~~~text
/**
 * Business names (owner, Oct 14): each kind of employer's name styles, in
 * order, from data: a local family's, the town's or the county's name with
 * the words Americans use on that kind of door. No real brands; a business
 * with other locations carries its first location's name, so chains grow
 * from local names. Read-only and pure.
 */
~~~~

### src/core2/campaign-day.ts · 7e21b886678f

~~~~text
/**
 * A campaign day for the player (owner, Oct 14, 2026): a handful of choices,
 * each an act read from the records, no more than that. Knock on doors in a
 * neighborhood, hold an event, host a forum, give an interview, raise money,
 * meet donors at a supporter's house party, rest.
 *
 * Nothing here is a new mechanic. Each choice runs an engine's own act
 * (`knockDoors`, `holdEvent`, the meetings engine's `holdTownHall`,
 * `requestInterview`, `askForDonation`, `holdDonorMeeting`) with the player's
 * own hours; availability is read from the records the engines keep (doors
 * knocked, the campaign's cash, the town halls held, the press desk's week, the gifts
 * already given). No choice is decided by a roll. Choices carry ids and
 * numbers only; the English engine words them.
 */
~~~~

### src/core2/campaign-incumbent-response-test-kit.ts · d4592c8ed6d4

~~~~text
/**
 * Each case draws its places (owner, Nov 17: "be random with it"): a case that
 * needs a particular situation (an open race with a serving incumbent who can
 * run again and a poll showing the challenger ahead; a challenger's evening of
 * doors whose word reaches the incumbent; a counted resident who says yes and
 * opens the incumbent's door) takes the first drawn place where it holds, and
 * names every place it passed over and why. GOLDEN_PATH_SEED replays a draw.
 */
~~~~

### src/core2/campaign-petition-kit.ts · ab4085a6a11f

~~~~text
/**
 * For tests and checks whose candidates must stand on the ballot: filing is
 * a petition (owner, Oct 28), so each candidate campaigns for signatures as
 * a candidate would, a canvass each day through the campaign engine's own
 * day choice (the player's, or a world candidate's), until each petition
 * holds what the law asks or its deadline comes, and then the world
 * lives to the clerk's check the morning after the last deadline. Nothing is
 * signed by hand: every name comes from a person met at a door or asked in
 * the circle, answering for their own reasons.
 */
~~~~

### src/core2/campaign-stances.ts · 94f36541431d

~~~~text
/**
   * The record that gives them a reason to run on a question, or null for
   * none (owner, Nov 23: "random issues and stances with no reason why those
   * are chosen"; the CTO, Nov 24: a candidate runs only on stands their own
   * record gives a reason for). In order: a vote they cast on it; for a named
   * official, the position their row records; for a person, what their own
   * life adds to it today (`lifeShift`), what their faith or degree adds
   * (`openingRecord`), or what has reached them about it (`stanceOn`).
   */
~~~~

### src/core2/campaign-views.ts · 901bcf0a3096

~~~~text
/**
 * This world's national polled share for a question's "yes" (owner, Oct 27:
 * realistic, not real): the published share moved once by the world's offset,
 * relative to its nearer bound so it stays a share. Even where no poll is
 * recorded.
 */
~~~~

### src/core2/campaign-views.ts · 94c32b77ff49

~~~~text
// Their own view times the platform's position: someone with no view of a
  // question is barely moved either way by it; someone who holds it strongly
  // is drawn or put off (owner, Oct 9: most people hold weak views or none).
~~~~

### src/core2/candidate-pool.ts · 1e724aac3170

~~~~text
/**
 * Who has standing in a race (owner, Oct 14, 2026: no "one level up" ladder).
 *
 * The pool for any race is everyone with standing in its jurisdiction:
 * officeholders at every level (the officials engine's people and the offices
 * engine's terms), party officers, former candidates, and prominent people (a
 * business's owner, a press outlet's owner or head, a group's lobbyist).
 * Counted residents join when their own record draws them (the candidacy
 * module's counted screen). Each member weighs running with the same chooser
 * every town resident uses (`decideToRun`); this file only says who is in
 * the pool, how well known each is in the race's jurisdiction, and the
 * facts the chooser reads beyond a resident's: ambition, the chance their
 * lean gives, their party's backing and their means.
 *
 * Imports of the offices, officials, parties and elections modules are type
 * only, and their tables are read by module id to avoid import cycles; the
 * exceptions are the one test for another place's office
 * (`isOutsideOffice`) and the one fill-in (`holderOf`), called only while a
 * pool is built.
 */
~~~~

### src/core2/candidate-pool.ts · d45dc4cbc417

~~~~text
// Prominent people the records name: a business's owner, a press outlet's
  // owner or head, an interest group's lobbyist.
~~~~

### src/core2/cost-of-living.ts · 495ba104d173

~~~~text
/**
 * A household's cost of living (owner, Oct 13, 2026: "it's just rent. That's
 * it. Or mortgage"). Money out of a household is two things: its housing
 * payment (the lease or the mortgage with its escrow, standing bills from
 * housing that fall behind and can end in eviction) and one everyday-living
 * amount a month, paid from what its members hold.
 *
 * The everyday amount starts as the household's opening purchases: the BLS
 * Consumer Expenditure Survey's spending for its region and size
 * (living-costs-data), at the town's sellers in the shares the opening gave
 * them (by each seller's recorded capacity). Each month it follows the
 * sellers' prices and the members' pay against what it was. Every household
 * purchase the opening or fill-in hands the core arrives here as one plan per
 * household, not one bill per store on a payday calendar.
 *
 * Each month, on the household's day: the members keep back what their home
 * will cost by their next such day (the rent or mortgage payments not yet made,
 * and any arrears) beyond the pay due in before then, and spend up to the
 * everyday amount from the rest, at the sellers still open. What they can't afford goes
 * unbought; it is never a debt. Each seller's sale goes through the sales tax
 * at the seller's place, so sales-tax laws still collect.
 */
~~~~

### src/core2/counted-actor.ts · 6ebf595106c4

~~~~text
/**
 * Who is still in the wider population, for the shared chooser. The residents
 * module registers how it reads a counted person; the core asks here, so the
 * core never imports a module (owner, Oct 15: the layering stays one way).
 */
~~~~

### src/core2/counted-groups.ts · d59ea741cd15

~~~~text
/**
 * The counted tier of one model, two tiers (owner, Oct 14, 2026; see
 * docs/design/one-model-two-tiers.md). Everyone a place holds who is not a
 * full person is in a counted group: one record per place, district,
 * household kind, income band, tenure and head's age band and work, with
 * its households and its members' identities kept as packed columns. A
 * member is an id, a name, a birth date, a sex, traits (small whole numbers)
 * and a household; nothing else about them exists until they are filled in
 * (no past, no ties outside the household, no sources of their own).
 *
 * Engines that still read counted people one by one get a record built from
 * these columns on demand (`personInput`, `householdView`): the stopgap
 * SG-CORE-counted-person-views, retired engine by engine as each reads groups.
 */
~~~~

### src/core2/counted-money.ts · 3feb43a4f1d6

~~~~text
/**
 * A payment between a counted person, household or place and another owner,
 * for engines outside the residents engine (benefits, an owner's draw, a
 * tax bill): positive `amountMinor` is paid by the counted side, negative is
 * paid to it. The counted side is the person's or household's group, else
 * the place's groups by their people. Pays what the groups hold. Returns the
 * amount moved.
 */
~~~~

### src/core2/decision-detail.ts · fa0644b33685

~~~~text
/**
 * Memory stays small (owner, Oct 12): act records keep their full reasons
 * (every option's score) for `circleDecisionDetailDays`; after that a circle
 * member's act keeps only what the "why" view needs to name the choice. The
 * player's own routine acts and weighed choices keep everything for
 * `playerDecisionDetailDays` (after a year only the summary and the reasons,
 * not every option's score: the Oct 20 decision-detail ruling); their public
 * records and news keep everything. A circle member's weighed choice keeps
 * its full record for the same detail window and then goes; their other
 * entries go after `circleActRetentionMonths`.
 * Writers
 * queue each record as they keep it, so condensing visits each record once
 * and never scans the log.
 */
~~~~

### src/core2/decision-detail.ts · 4d26e8045e46

~~~~text
/**
 * The cash journal's itemized receipts fold past their readers' windows on
 * the 1st of each month (CTO, Nov 1, 21:25): a followed person's after
 * `cashJournalDetailDays` (dev mode's 365-day ledger), the player's and their
 * household's from Jan 1 of the prior year (play-first lane, Nov 1). What
 * folds goes into each person's yearly total by kind; open obligations,
 * observer rows, receipts a kept record names, balances and every total stay
 * (`foldCashJournalDetail`). Returns how many receipts folded.
 */
~~~~

### src/core2/election-ties.ts · b178435f45f1

~~~~text
/**
 * An exact tie, settled the way the state's law says
 * (`data/research/elections/tie-rules-2026.json`), by the kind of race:
 *
 * - a lot, where the law says lot (a recorded draw: its citation, the tied
 *   candidates, each name's slip and the result);
 * - a second election between the tied candidates;
 * - the legislature in joint session (statewide offices) or the local
 *   governing body, each member voting for their own reasons: their views
 *   against each tied candidate's platform, their party's side against the
 *   candidate's, and how they stand with each candidate, never party alone.
 *
 * Race size counts where the law has it (a state that reruns a large race
 * and draws a lot for a small one). Owner ruling (Oct 14, 2026): ties follow
 * the law of the state, a recorded lot where the law says lot.
 */
~~~~

### src/core2/electorate-century-laws.ts · 829f3b59188b

~~~~text
/**
 * The century's law in force (owner, Nov 17, 2026, CTO line 6935086070 on #9747: "History is pure
 * simulation from 1925 ... That includes Presidents, Congress, governors, legislatures, party
 * control and laws"; History's family 4 plan). After each November the bodies the century elected
 * sit a session, and on each policy question each chamber votes by the one stance rule every
 * played legislator votes by (officials-roster.ts `memberSupportAt`). A law changes only when every
 * chamber passes the change and the executive signs it, or the chambers override the veto. What a
 * member supports comes from where they stand: their party's typical position in the body, moved
 * by how far their own seat stands from their party's other seats (`expectedIdeal`), never a roll.
 *
 * Sessions are the only process (stopgap SG-HIST-century-law-sessions): every question comes up
 * each session, with no drafting, committee or leadership, until the century runs the bill engine
 * for the played town's state.
 */
~~~~

### src/core2/electorate-century.ts · b158416d0c36

~~~~text
/**
 * The century before day one (owner, Nov 17, 2026, CTO line 6935086070 on #9747): "History is pure
 * simulation from 1925, a year at a step, during the loading screen ... Day one is whatever that
 * history produced: who holds every office, party control, and the laws in force. Real data only
 * sets how strongly things move one another." And the owner's rule behind it (CTO line 6933444847):
 * "I want the world to decide the state ... load into one world where there has been 100 years of
 * Democratic presidents or something."
 *
 * The century runs forward from 1925, a year at a step, and the last step's records are day one's.
 * Its elections are counted on the one count (`countPlaces`, electorate.ts) with the one race rule
 * (`candidateReasons`, electorate-inputs.ts), the rule every race in play uses. What happened is
 * decided by the count: where each state stands, who runs (a sitting president runs again until
 * elected twice), the party's time in the White House and the president's standing. Who exists is
 * generated: each state's and the country's place on the lean order in 1925 is one starting shift
 * from the world's seed (`centuryShift`, any size equally likely), sized by the real map's spread. After
 * that no roll decides anything.
 *
 * It is a pure function of the world's seed, worked out once per seed and kept, so every reader
 * (the offices engine seating the President, the President's record, the past election behind the
 * term, the next race's time-for-change reason) reads the same century without a module of its own
 * at load. "Just like today" (`historyMode`) is the same build with today's real record in place of
 * the century's last step (CTO line 6935086070, point 5).
 *
 * It runs the presidency (pull request 1 of the History lane's plan, #9747), Congress (pull
 * request 2: every House seat and the Senate by class) and every governor and partisan statewide
 * officer (pull request 3a). The legislatures, the economy and the laws follow, each on the same
 * steps.
 */
~~~~

### src/core2/electorate-century.ts · ba99b3576b17

~~~~text
/**
 * One race in one place on the one path (electorate.ts `countParties`): the count, and the
 * place's result cleared of what was personal to the two candidates (their incumbency and
 * experience) and of the year's national tide (the President's approval, the midterm swing, the
 * party's time in the White House, the economy), which is what carries into where the place
 * stands: how it moved against the nation, never the tide itself (CTO line 6936486748, Nov 17,
 * 2026: "The national tide belongs to that year's race and no other").
 */
~~~~

### src/core2/electorate-century.ts · b8223be8acab

~~~~text
/**
 * What acted on a race alone, the right's less the left's: the candidates' own standing
 * (incumbency, experience, spending) and the year's national tide (approval, the midterm, time for
 * a change, the economy). A place's lean carries its result less this (CTO line 6936486748).
 */
~~~~

### src/core2/electorate-century.ts · 8706885111e8

~~~~text
/**
   * Each place's lean moves to its own cleared results' mean by the carry share (interim rule,
   * to be replaced by World B's one writer, `carryLean`, when it lands: #9747, World B 02:24Z;
   * the clearing as the CTO ruled at 02:49Z).
   */
~~~~

### src/core2/electorate-century.ts · 6488a6b227c2

~~~~text
/**
 * A century candidate's campaign means against the typical race's, drawn once per person (who
 * exists: their donors, their own money, their party's backing), as a multiple of the typical
 * spending; the one race rule reads it through its spending reason (electorate-inputs.ts
 * candidateReasons), so two races of the same year and place no longer meet the same two
 * candidates (CTO line 6936407513: "let ... the candidates' own pull enter the count").
 */
~~~~

### src/core2/electorate-century.ts · 4e092ac32942

~~~~text
/**
 * Every state legislative seat in 1925, as the offices engine lists them (which seats exist,
 * their terms and their cycles, never who holds them): who holds it is the side its own district
 * leans to. The played town's state is counted seat by seat, every other state's chambers as
 * results (CTO line 6937011121).
 */
~~~~

### src/core2/electorate-places.ts · ec5a0375da0c

~~~~text
/**
 * The places outside the town that vote in its races, and in the races it
 * only sees from afar, at a coarser level (owner, Oct 14, 2026): a county, a
 * U.S. House district, a state legislative district's share of its state.
 * Each is sized and placed on the lean scale from its real 2024 vote; it
 * votes on the counted residents' engine (`electorate.ts`), never a model of
 * its own. The figures here are inputs: how many eligible voters a place
 * holds (its 2024 two-party votes over its state's CPS citizen turnout) and
 * where it leans (its 2024 Republican two-party share, net of the holder's
 * incumbency where a holder carried the seat then).
 *
 * Realistic, not real (owner, Oct 27): every world opens on its own 2024. One
 * national swing and each state's own move every place's two-party share,
 * each state's votes cast move by the world's turnout, and the town's citizen
 * share is drawn around its survey figure, all once per world from its seed.
 * The eligible voters stay the people who live there, so a world's turnout
 * differs from the published one.
 */
~~~~

### src/core2/electorate-places.ts · 7cfff88b4d48

~~~~text
/**
 * This world's swing in a state's Republican two-party share from 2024: the
 * world's national swing and the state's own, each drawn once from the seed
 * (realistic, not real; owner, Oct 27). Positive toward the Republicans.
 *
 * Each draw keeps its floor away from zero, and so does their sum: where the
 * state's own draw would cancel the national one to within its own floor, it
 * moves with the national swing instead, so no state opens on its published
 * share (CTO, Nov 17; Agugulu, American Samoa, seed 108d24aa2670d324 drew a
 * New Hampshire swing of 9e-10). History's century shares replace this path.
 */
~~~~

### src/core2/electorate-places.ts · cbe114661a35

~~~~text
/**
 * A district where the century counted it stands where the century left it (CTO line 6935086070
 * on #9747: day one is whatever that history produced), not at its 2024 result; its people and
 * their turnout stay the place's.
 */
~~~~

### src/core2/electorate-places.ts · 879ac5122dcb

~~~~text
/**
 * Who holds a seat when this world starts (realistic, not real; owner, Oct
 * 27): the real holder, unless the world's swing carried the seat's 2024
 * share across even against the holder's party, when the other party holds
 * it. A seat with no contested 2024 result on record keeps its holder (an
 * uncontested seat was safe; a chamber that did not vote in 2024 is the
 * stopgap SG-WORLD-roster-no-2024-vote). Generation of who holds what at the
 * start, read from the seat's own vote, never a roll.
 */
~~~~

### src/core2/electorate-registration.ts · 2ba244868efd

~~~~text
/**
 * Voter registration as a record (owner, Nov 14, 2026). A full person is on
 * the rolls or not, at an address, since a day, and a move leaves the
 * registration at the old address until the person registers again. The
 * rule that fills the record in is one for both tiers of the population:
 *
 * - Whether a person registers at all, apart from what the state does for
 *   them, comes from the share of their kind who are on the rolls in the
 *   real survey (CPS, November 2024, citizens by state and age band), spread
 *   over the town's people from their own id, as a person's starting carry
 *   is (`openingVoterCarry`). A state with automatic registration registers
 *   a person when their address changes or they turn 18.
 * - How long they wait after a move, or after turning 18, comes from their
 *   own sense of duty: the median wait times e to the minus the slope times
 *   duty. A named person registers on the day the wait ends. A counted
 *   record stands for people with every wait up to and past that median,
 *   so it is on the rolls in the share `1 - 2^(-days / wait)`; a record
 *   whose date of moving is unknown stands for the share of its age that
 *   moved in the last year (the moves engine's own rates).
 * - A registration counts in an election if it took effect by the state's
 *   deadline, or on the day where the state registers people at the polls.
 *
 * Nothing here is rolled. The records it keeps are read by the turnout rule
 * (`decideTurnout`), the polling place (`pollingPlaceOf`) and the day's
 * record of who was turned away or registered at the polls.
 */
~~~~

### src/core2/electorate-registration.ts · 9d6fc5a81747

~~~~text
// The person the player controls is always registered (owner, Nov 16: "Keep
  // it for townspeople; you are always registered"): the rolls are the
  // townspeople's, and the player is never turned away from them.
~~~~

### src/core2/electorate.ts · 0c12b9c58732

~~~~text
/**
 * The electorate the world doesn't name, in one engine (owner, Oct 14, 2026):
 * the town's counted residents (two-level population) each vote from their
 * own record (age, traits, work hours, place in the town's lean order)
 * without being filled in as a full person, and every place outside them (the
 * rest of a county, district or state, other states) is counted on the same
 * engine at a coarser level: the town's counted voters re-placed on that
 * place's own lean and weighted to its eligible voters
 * (`electorate-places.ts`). Filled-in residents are full people and vote
 * through the named route. See docs/design/electorate-one-model.md.
 */
~~~~

### src/core2/electorate.ts · 914c56256163

~~~~text
/**
 * A door "yes" that still holds decides the voter's choice in proportion to
 * how far it holds (owner, Oct 29: a yes at the door is near-binding), on a
 * sliding scale with no threshold: the pledged candidate's total is lifted by
 * `holds` times the gap to the best rival's total without any pledge, so a
 * yes held in full keeps its candidate ahead by the pledge weight whatever
 * the other reasons sum to, a yes half held closes half the gap, and one
 * fully doubted adds nothing. The one rule for a named voter's appeal
 * (voting.ts) and a counted voter's (`countedAppeal`), read by each after its
 * totals are summed. `pledge` is the weight times how far the yes holds.
 */
~~~~

### src/core2/electorate.ts · 3f211f64464e

~~~~text
// Their own word at the door (owner, Oct 29: a "yes" is near-binding).
~~~~

### src/core2/electorate.ts · 2f661defc653

~~~~text
/**
 * How a counted record's unpledged voters divide among the candidates on a
 * ballot without party labels (CTO, Nov 1, on one model, two tiers, owner
 * ruling 4861 and no dice): a record stands for many different residents, so
 * its weight splits by each candidate's share of the appeal,
 * exp(k a_i) / sum_j exp(k a_j) at the coefficient k of
 * `countedShareCoefficient`, as counted job choices split by the selection
 * weights times the count. A small appeal gap moves a few points of the
 * record, not the whole of it; a share of the count is not a roll.
 * Candidates alike in appeal share it evenly. A lone candidate keeps the
 * choice rule's own answer (`countedChoice`): the whole record where it is
 * not against them, none where it is. Shares sum to 1 (or to nothing). A
 * named voter (one person) and a household that gave its word at a door keep
 * first place (`countedChoice`). A count reads it through
 * `countedShareRule`, which keeps first place on a ballot with party labels.
 */
~~~~

### src/core2/electorate.ts · 4f1ce14809b4

~~~~text
/**
 * Whether a race's ballot sorts its candidates by party: their party sides
 * differ (a general election between parties). A ballot whose candidates all
 * carry the same side, a party's primary or a race without labels, does not
 * (CTO, Nov 1, 22:10 as amended for primaries).
 */
~~~~

### src/core2/electorate.ts · 35dac1dba468

~~~~text
/**
 * How a counted record's people divide in one race, read once for a count
 * that applies it to every voter it holds (CTO, Nov 1, 18:20 as amended at
 * 22:10, and for primaries). Where the candidates' party sides are equal (no
 * labels, or one party's primary), by each candidate's share of their appeal
 * (`countedShares`). Where their party sides differ, the whole
 * record to its first place (`countedChoice`), as before: each place's
 * people already stand along the lean order where they split as the place
 * voted in 2024 (`orderPlacement`), so a share on top would count that
 * spread twice (D.C. would count 0.193 Republican against its 0.072).
 */
~~~~

### src/core2/electorate.ts · 84fcc8bc12aa

~~~~text
/**
 * The share of a counted record's people who back the right-hand candidate in a race between two
 * party candidates counted from afar. A record stands for the people over its own stretch of the
 * lean order (half of it, `halfStretch`, either side of its rank), not one person at its rank: on
 * that stretch their lean, and so the gap between the two candidates in their eyes, runs on a
 * line (a voter's appeal moves with lean times the candidate's side, `countedAppeal`, and lean
 * with twice the distance along the order), so the people past the point where the gap turns
 * back the right, the rest the left. `gap` is the right's appeal less the left's at the record's
 * own rank; at either end of the lean scale (`atEnd`) the stretch stands whole on one side. A
 * small move in a place's lean or a candidate's pull then moves the count (CTO line 6936407513,
 * Nov 17, 2026: "count ... over a continuous lean distribution, so that small moves matter"; the
 * replacement SG-GOV-counted-lean-spread named: "A spread of leans within each counted record on
 * the lean order").
 */
~~~~

### src/core2/encounters.ts · 09f7b96b475f

~~~~text
/**
 * P15 part 5: meeting new people through real encounters (owner's ruling,
 * October 10, 2026). A visit to someone meets the people who live with them;
 * joining a group meets its other members. Each meeting is a dated fact naming
 * the place and the other person, and the first tie holds the hours spent
 * together, so closeness grows only through later contact. A new hire
 * meets the coworkers already working there. A resident who speaks at public comment meets the members of the
 * body who hear them. Two people who talk meet each
 * other.
 */
~~~~

### src/core2/estates.ts · 09a503f4f250

~~~~text
/**
 * A full person's estate when they die (money stress audit defect 6; owner,
 * Oct 14: wills, probate, debts and taxes before heirs). Standing payments
 * to them (a benefit award) end. Their debts come first: what they owed and
 * hadn't paid on each standing payment is paid from the estate, and the
 * payment ends. Then probate: where the estates module runs, the estate
 * waits `probateDays` (a timeline, not a scene). Then the heirs: by the
 * person's will, where their traits and age led them to make one, in shares
 * by closeness among their family; else by the intestate order in
 * `data/estates.json` (Uniform Probate Code §2-102 to §2-103), equally within
 * the first class with anyone living; with no kin it escheats to their state
 * (UPC §2-105). The settlement is a public record.
 *
 * Before the heirs take, the estate pays the federal and state estate taxes
 * in force, and each heir's share pays the state's inheritance tax by their
 * relation (`laws-death-taxes.ts`, the law in force read on the day probate
 * closes); each heir gets the estate's accounting, naming the laws.
 *
 * Trusts (owner, Oct 15, background only): a person of means, by their traits
 * and the size of their estate, has put part of it in a living trust, whose
 * beneficiaries take at death outside probate, in shares by closeness. The
 * trust is revocable, so it stays in the taxable estate: the estate tax is
 * figured on the whole estate, trust and probate together, and each part pays
 * its share. The part left to probate waits as before.
 *
 * A relative still in the wider population inherits like any other: they are
 * filled in as the same person when the estate reaches them.
 *
 * A home whose owners have all died is sold when probate closes: the
 * outside market pays the dwelling's value, the lender is paid first, and
 * the surplus goes into the estate, so the estate tax and the heirs' shares
 * count it (housing-sale.ts). A household whose last living member the
 * decedent was, and which owns its home, sells it; a counted household's
 * home is sold by the same rule when its last member dies
 * (removeCountedPerson). SG-CORE-estate-cash-only: loans and businesses are
 * not settled.
 */
~~~~

### src/core2/event-id-retention.ts · 032bff29489e

~~~~text
/**
 * Keep results, not their history (owner, Oct 7, Nov 5, Nov 8): the set of
 * every event id the world has seen (`core.eventIds`) lets an event enter
 * once and lets its writers ask "has this happened?". Every reader asks
 * about today (a speech, an address or a closure on `core.date`), about a
 * race still ahead (a contest id carries its election day) or about an id
 * with no date (a cause group's founding, a scene's reply). So an id whose
 * newest written date is more than `eventIdRetentionDays` past can never be
 * asked about again, and it leaves the set; an id with no date stays.
 *
 * Ids are queued by the month of their newest date as they enter, so the
 * monthly pass drops whole months and never walks the set. With bookkeeping
 * on (tests, proofs) every id stays. An id a live drive still cites stays
 * too, since a drive forms from an event and the drives engine checks that
 * event again each day it rewrites the drive; it leaves at the first monthly
 * pass after no drive cites it. Kept forever, the set was 117 MB of a
 * long run's heap (Montpelier, Vermont, year 6: 661,212 ids).
 */
~~~~

### src/core2/family-origin.ts · 4922cfabfe07

~~~~text
/**
 * A chosen look's origin and the player's family (owner, Nov 8: "I'm Mexican
 * and my son is white"). A person's origin is one of their two parents' (the
 * rule births already use, `childOrigin`), so when the player chooses a look
 * from another origin than the family was drawn with, the family is worked
 * out again from the record of who is whose parent, not painted all in the
 * player's tone:
 *
 * - one of the player's parents takes the chosen origin (picked by the
 *   player's id), so the player is still one of their parents' children;
 *   the other parent keeps theirs, and the parents may differ;
 * - the player's brothers and sisters, children, grandchildren, nieces and
 *   nephews each take one of their own parents' origins, by their own id;
 * - a partner, in-laws and housemates keep the origin they were drawn with,
 *   and so do grandparents, aunts and uncles (the record does not say which
 *   side of the family they are on).
 *
 * Only people still carrying the drawn origin are worked out again; someone
 * already of another origin keeps it. No dice: the pick is by id and seed.
 */
~~~~

### src/core2/free-block.ts · 52b33dfc81cb

~~~~text
/**
 * A person's own upkeep a day (personal care beyond the sleep the schedule
 * reserves, and meals), from their own record: a base, more for each year
 * past adulthood, and more as their own health asks for care (`careNeedOf`,
 * the health engine's read). ATUS fits only how strongly age and health count,
 * so the average adult lands near the survey's day; two people of different
 * age or health differ (CTO, #9747 05:40Z). The parts are returned for dev
 * mode's trace.
 */
~~~~

### src/core2/game-start.ts · 943dee26bd51

~~~~text
/**
 * The one date every game starts on (owner ruling, Oct 14, 2026): Inauguration
 * Day, January 20, 2025, in every place. The data's vintage calibrates the
 * world; it does not move this date. Every opening, the bench, scripts and
 * tests read it from here instead of writing a date.
 */
~~~~

### src/core2/gov-rules/council-election-method.ts · 2171b2a8cf00

~~~~text
/**
 * How a city or town council's members are elected: how many seats are ward
 * seats (each chosen by, and from, one part of the town) and how many are at
 * large. Ported from the old engine's `living-world/town-wards.ts`
 * (`councilWardPlan`); that file now reads this one.
 *
 * Where a compiled charter states its council composition, that is used.
 * Otherwise the council is estimated at large (owner rulings, Oct 15), with
 * the national shares of the ICMA 2018 survey as the source
 * (data/research/local-government/council-election-methods.json).
 */
~~~~

### src/core2/gov-rules/council-election-method.ts · 7b5728c8f50b

~~~~text
/**
   * What the place calls a seat's part of town: "ward" only where its own
   * charter says ward seats, else "district" (owner ruling, Oct 15).
   */
~~~~

### src/core2/gov-rules/council-election-method.ts · 8a5c1d9819a9

~~~~text
// No record of how this council is elected: it is estimated at large, the
  // way most councils are (owner rulings, Oct 15, OWNER-DECISIONS.md "Town
  // council seats"), and marked as an estimate with its source.
~~~~

### src/core2/gov-rules/county-governing-body-rules.ts · 49719828620a

~~~~text
/**
 * COUNTY GOVERNING BODIES (Build 25, CTO ruling of September 29, 1:54 a.m.):
 * how many members sit on a county's board, and on a Puerto Rico
 * municipio's municipal legislature, from the law that sets it.
 *
 * Three kinds of answer, each labeled wherever it is shown:
 *
 * - **state-law**: the state's own statute sets the size of every county
 *   board without a charter of its own (data/research/local-government/
 *   county-governing-bodies.json, each with its citation).
 * - **municipal-code**: Puerto Rico's Municipal Code, Law 107 of 2020, sets
 *   each municipal legislature by the municipio's population.
 * - **estimated**: the state's law has not been read. The board takes the
 *   national average, ESTIMATED FROM AVERAGE from the National Association
 *   of Counties' count of county board members.
 *
 * A county whose own charter sets a different size (a charter county in
 * California, Ohio, Missouri or Washington) is not read yet, so it takes its
 * state's size: a known gap, not a rule.
 */
~~~~

### src/core2/gov-rules/local-chief-executive-rules.ts · 2b67bc6e21f9

~~~~text
/**
 * Ported from the old engine's `nationwide-world/local-chief-executive-rules.ts`.
 *
 * Whether a town elects its chief official, and by what title and for how
 * long, for every town with a government of its own.
 *
 * Read where the game has compiled the town's government and its reading says
 * so. Otherwise ESTIMATED FROM AVERAGE: every unread town takes the most
 * common real rule in ICMA's 2018 Municipal Form of Government Survey, as
 * ChatGPT reported it on 2026-09-22 (answer to
 * `local-executive-and-council-rules`, kept verbatim under
 * docs/research/chatgpt-answers/2026-09-22-nationwide-2235/), the same rule
 * for every place (CTO rulings of September 28, 10:32 p.m., and September 29,
 * 1:54 a.m.: no draw where a rule is unread):
 *
 * - the chief elected official is elected directly, as in 75.6% of towns
 *   (by the council 21.3%, the top vote-getter for council 0.9%, rotation
 *   1.6%, other 0.7%);
 * - the term is four years, as in 49.4% of towns (1 year 13.5%, 2 years
 *   28.6%, 3 years 6.1%).
 *
 * Until September 29, 2026, each unread town drew both from those shares.
 *
 * The owner's interim rule, not research (lamontae, 2026-09-23 9:07 p.m. ET,
 * "yes to the democratically elected mayor"): until a city's own rule is read,
 * a city of more than `OWNER_LARGE_CITY_POPULATION` people elects its mayor
 * directly, since nearly every large American city does.
 * A read rule overrides it. It applies only where the town's population is
 * known, and `place-population.ts` holds none yet, so today it changes no
 * town; it takes effect the day that table is filled.
 *
 * Only a directly elected chief official is a race anybody can file for. A
 * town whose council chooses its mayor from among its members has no mayoral
 * race; the council's choice is not built yet.
 *
 * ESTIMATED FROM THE ICMA NATIONAL MUNICIPAL AVERAGE described above, pending
 * town-level research under `town-mayor-rules-by-town-size`:
 *
 * - shares by town size or state are not published, so every unread town
 *   takes the same national rule, and a town whose council in fact chooses
 *   its mayor has an elected one until its own rule is read;
 * - the survey's term shares describe every chief elected official, including
 *   council presidents chosen for a year;
 * - a directly elected chief official is titled "Mayor" unless the town's
 *   reading names another title (ICMA's title shares describe every chief
 *   official, including council presidents chosen by their councils);
 * - term limits (8.6% of towns in the same survey) are not applied;
 * - whether a sitting council member who wins the mayoralty gives up the
 *   council seat is not settled, so the council seat is left as it is.
 */
~~~~

### src/core2/gov-rules/place-population.ts · a17478bffbad

~~~~text
/**
 * The town's population in this world (realistic, not real; owner, Oct 27):
 * the published reference population is the center of a per-world spread, and
 * every engine that reads a town's size reads this, never the published count.
 */
~~~~

### src/core2/gov-rules/place-population.ts · 1f2bb135f62e

~~~~text
/**
 * The place's residents in group quarters (college housing, prisons,
 * juvenile facilities, nursing homes, other institutions, military quarters
 * and other noninstitutional quarters) on Census Day 2020, by its locality
 * key (`placeLocalities`), or null where the file has no row. The CTO's
 * ruling of Nov 1: the count by place and type comes from the Census.
 */
~~~~

### src/core2/gov-rules/township-governing-body-rules.ts · a07d538ec82f

~~~~text
/**
 * TOWN AND TOWNSHIP GOVERNING BODIES (Build 25, CTO ruling of September 29,
 * 7:55 a.m.: local councils pass local law in small towns too).
 *
 * A census-designated place inside a New England town, a New York town, or a
 * New Jersey, Pennsylvania or Midwest township has no government of its own.
 * Its local government is the town or township it lies in, which the Census
 * Bureau's 2025 Government Units listing carries as a township whose place
 * code is the town's county subdivision code. Which town holds most of a
 * place's residents is read from the ACS 2020-2024 county subdivision parts
 * (scripts/research/export-acs-place-towns.py).
 *
 * The board's size is read the way a county board's is: the state statute
 * where it has been read (data/research/local-government/
 * township-governing-bodies.json, each with its citation), and otherwise the
 * most common size among the states read, ESTIMATED FROM AVERAGE. A town that
 * enlarged its board by its own vote or charter is not read yet.
 */
~~~~

### src/core2/grief.ts · 05392f5a3095

~~~~text
/**
 * P15 part 4: grief after a death, and each person's own resilience line.
 *
 * Owner's ruling (October 10, 2026): each person carries their own emotional
 * resilience, generated once and keyed to them, and grief's pull toward rest
 * and family fades by it. Here the line is a grief half-life read at the
 * person's stable key from a log-normal spread. The spread is solved from
 * Bonanno et al. (2002): the share whose grief has fallen to "little" by 6
 * months (45.9%, the resilient pattern) and the share still above it at 18
 * months (15.6%, chronic grief). Nothing is rolled when someone dies: a
 * relative's grief is their closeness to the person who died, halving every
 * half-life of their own.
 */
~~~~

### src/core2/hearer-groups.ts · cbb398817087

~~~~text
/**
 * Hearers nobody watches, heard as groups (owner, Nov 9: "not to track
 * everything at every day"; design `docs/speed/off-screen-campaigns-as-results.md`,
 * stage 1 step 1). A case made to an audience (a speech) reaches each watched
 * hearer as a person, through the views engine's `onEvent`. Everyone else in
 * the audience is a full person nobody is looking at: they are applied once
 * per group of like hearers (the same place, lean, age band and how readily
 * they yield to an argument), with the same rule a counted group is moved by
 * (`stanceAfterCase` with an exposure), and each member's view reads the
 * group's stance (`groupShift` in `stanceOn`). Watched means the player, their
 * household and circle, anyone in focus (`keepsWhy`), or a state or federal
 * official; they stay individual. A hearer's tie to the speaker is carried
 * into the group as its members' mean closeness to that speaker.
 *
 * A person joins the group they are first heard in and keeps it, so their
 * read is one row. A group's stance is the mean of its members' shifts: each
 * case moves it by the share of members who heard it.
 */
~~~~

### src/core2/housing-construction.ts · ed8ff49e69ec

~~~~text
/** The state's building permits per thousand people in this world: the published rates (Census Building Permits Survey) moved once by the world's own offset (owner, Oct 27: realistic, not real). */
~~~~

### src/core2/housing-counted-buy.ts · 7912abfc2ea9

~~~~text
/**
 * A counted renter household buys a home (pool item world-counted-renters-buy):
 * the same decision a full renter makes (housing-buy.ts), weighed once a year
 * on its lease's anniversary month, with the money moved through its group's
 * accounts. Its means are its own savings: its share of its group's account,
 * the money that goes with it when it changes groups (`departingCash`), which
 * its savings weight spreads among households alike in income, age and tenure
 * (`savingWeight` in counted-money.ts). Short of the down payment for every
 * household the record stands for, it does not buy (Account lead's rulings,
 * Nov 14, 2026, from "one model, two tiers" and "no dice").
 *
 * A purchase: the household joins its owners' group first, taking its share
 * with it, and the down payment is paid from there (the renters it leaves
 * behind pay none of it) to
 * the seller (a builder's finished new house in town, else a seller leaving
 * the town, which the outside market stands for), times the households the
 * record stands for; the town bank lends the rest where its capital has room,
 * else a holder outside the town does, as at the opening; the rent flow ends;
 * a `mortgage:<household>` part joins the place's counted mortgage flow for
 * that holder; the household's home, mortgage and purchase are housing's
 * records like any owner's; and the place's price
 * level counts it as a buyer by its weight.
 */
~~~~

### src/core2/housing-foreclosure.ts · 1e56e4a22002

~~~~text
/**
 * Losing an owned home (owner, Oct 14, 2026: "whatever happens if you don't
 * pay your house"). A mortgage behind past the federal 120 days (Regulation
 * X) goes to foreclosure under the state's law from data (judicial or
 * nonjudicial, its notice and sale timeline, any redemption period). The
 * household can still catch up before the sale. At the sale an outside buyer
 * pays the home's value less the foreclosure discount. The lender takes what
 * it is owed from that, its books carrying any shortfall as a loss, and the
 * household keeps any surplus. After the redemption period the household is
 * removed, and goes where its records take it, as after an eviction.
 *
 * Counted owners default by the same rule times their count: their group's
 * housing arrears say how many of the group's owners are behind, the ones
 * with the least income first. A removed counted owner stays counted without
 * a home, as an evicted counted renter does.
 */
~~~~

### src/core2/housing-homeless.ts · 7ba9ab799d69

~~~~text
/**
 * Losing a home (owner, Oct 14, 2026: "they should become homeless"). A
 * household removed by an eviction is no longer housed: where it goes is
 * decided by its own records, in order: a relative with room (doubled up), a
 * shelter bed in the place (sheltered), else the street (unsheltered). The
 * status is one row per household that isn't housed, read by every engine
 * through `housingStatusOf` and `housingStatusCounts`, and announced the day
 * it changes (`housing.status-changed`). A household rents again when its
 * income and cash reach what a landlord asks for.
 *
 * Counted households are evicted the same way: their group's rent arrears
 * (the core's group money) say how many of the group's renting households
 * are behind, the ones with the least income of their own first. A removed
 * counted household stays counted (CTO, Nov 1, under "Two-level population"
 * and "One model, two tiers"): its record comes to stand for the one
 * household removed, holds no home (tenure "none"), and the same rule places
 * it, counts it and rents to it again from its counted record.
 */
~~~~

### src/core2/housing-homeless.ts · c8e28876e28c

~~~~text
/** The state's shelter beds per 10,000 people in this world: the published rate moved once by the world's own offset (owner, Oct 27: realistic, not real). */
~~~~

### src/core2/housing-homeless.ts · 22f9987f38d5

~~~~text
// The player's household never moves without their choice: a relative's
    // town is offered only to everyone else (owner's playtest, Nov 8).
~~~~

### src/core2/housing-homeless.ts · f07eaab6da80

~~~~text
/**
 * A counted household loses its home and stays counted (CTO, Nov 1): its
 * record comes to stand for the one household removed (the rest it stood for
 * keep their homes in its group, as at fill-in), it holds no home, and it
 * joins the group of households without one, its share of its group's money
 * going with it. Returns whether it has members left to place.
 */
~~~~

### src/core2/housing-past.ts · 930f130f06bc

~~~~text
/**
 * Housing before the start (owner, Nov 13, 2026: "it's simulated... things
 * need to be simulated in order to make your modern day make sense"; Oct 27:
 * "The engines run the years before Start"). The housing engine's own rules
 * run over the world's coarse window, after the people and moves passes, so
 * day one's leases, rents and home values have a past:
 *
 * - Each household's tenancy began on one date: a full household's latest
 *   move record (the moves pass), a counted renter's years in place (the
 *   opening's `since`), a counted owner's purchase year (the opening's ACS
 *   B25038 draw the mortgages read). The household's `since` and its
 *   dwelling's are set to it, so a household has one past.
 * - Rents run forward: the town's market rent moves with pay (the economy
 *   pass's months, the renewal rule's pay ratio), its level set once per
 *   place so the median rent paid on day one is the opening's sourced median.
 *   A lease signs at the market rent then and renews on each anniversary of
 *   its signing month; day one's rent is the rent its last renewal set.
 * - Home values follow this world's price level from each purchase
 *   (`pastPriceRatio`: the housing engine's monthly price step run from the
 *   economy's months, the path play continues and the mortgages read). A
 *   full owner's mortgage is restated from the year its move record says it
 *   bought.
 * - Each place's typical rent and home value, at every step and each
 *   December, are kept as history and as the registry's year rows, so
 *   Metrics reads last year on day one as it does from month 13 on.
 */
~~~~

### src/core2/housing-prices.ts · 8d78a9b53ac4

~~~~text
/**
 * Home prices are this world's own (owner, Nov 13, 2026: "it's simulated...
 * things need to be simulated in order to make your modern day make sense").
 * Each place keeps one price level, a typical home's value, that the housing
 * engine steps once a month from causes:
 *
 *   ln L' = ln L + momentum * (last year's change) / 12
 *                + reversion * (ln F - ln L)
 *                + pressureResponse * tanh(pressure / pressureScale)
 *   ln F  = ln pay + rateResponse * ln A(rate)
 *
 * - pay: what buyers earn, indexed to day one (the town's own pay in play,
 *   smoothed over a year; the economy's pay before day one).
 * - A(rate): the loan a fixed monthly payment carries at the 30-year rate.
 * - momentum: buyers expect last year's change to go on (Capozza et al.).
 * - reversion: the market closes the gap to what pay and rates support.
 * - pressure: the month's buyers against the homes offered, over the homes
 *   owned (zero before day one).
 *
 * Published data calibrates the three responses (the fit in
 * scripts/research/home-price-fit.ts against FHFA's state indexes) and the
 * level's scale once (the ACS median at its value date); it never sets the
 * level. Every home's value is the one rule `homeValueAt`.
 */
~~~~

### src/core2/housing-prices.ts · 8f3b4a9048c2

~~~~text
/**
 * A signed offset between the floor share of the named housing spread row and
 * the whole spread, fixed by the world's seed and the key: generation of the
 * starting world, never an actor's outcome (owner, Oct 27: realistic, not
 * real). The one world draw (world-draw.ts), times this table's spread row.
 */
~~~~

### src/core2/hud-rents.ts · 06edca9b3610

~~~~text
/**
 * The row as this world has it (owner, Oct 27: realistic, not real): the
 * published rents and income limits each moved once by the world's own offset
 * for the HUD area, so rents in the world are near HUD's but never HUD's.
 * Play reads this; the `published` readers are calibration.
 */
~~~~

### src/core2/jobs-elsewhere.ts · 31d6c21a69db

~~~~text
/**
 * Working lives elsewhere (owner, Nov 1, 2026: "EVERY. LIFE. IS. SIMULATED.
 * ... THIS IS LOW INTENSITY STUFF."). A relative or town leaver living in
 * another place (`livesElsewhere`, the inactive tier) works, loses work, finds
 * work, moves to another job and retires by the same quarterly pulls the
 * pre-start working life runs on (src/core2/past-work.ts): JOLTS layoffs and
 * quits and CPS spells out of work, moved by their state's unemployment this
 * month, their age and their traits' leans in the jobs engine's own
 * decisions. The jobs engine reviews them once a month on its own review day;
 * a pull adds up and the change happens when it reaches one whole, never by a
 * roll. A layoff is the jobs engine's own `work.job-lost` event; a job begun,
 * a move to another job and a retirement are `person.work-spell` events, the
 * same facts as the pre-start spell's. Their relatives in town witness each.
 *
 * Who is working on day one is generation of who exists: each person's own
 * seeded line read against the CPS 2024 employment and participation rates
 * for their age, so the rates hold over everyone and nobody's line is a draw
 * of what they do. The opening's place along each pull is seeded the same
 * way, as the moves engine spreads the town's.
 *
 * No firm is kept outside the town, so no employer is named
 * (SG-LIVES-work-no-employer); people out of the labor force stay out until
 * they reach the age of retiring (SG-LIVES-work-out-of-labor-force). Nothing
 * here moves money: a husk keeps no accounts (two-level population).
 */
~~~~

### src/core2/journal-state.ts · e228b7e108f1

~~~~text
/** What play reads of a touched owner: whose cash the commit writes. */
~~~~

### src/core2/journal-state.ts · dc1872b34e63

~~~~text
/** Bookkeeping's proofs per owner, in the same order; empty in play. */
~~~~

### src/core2/journal-state.ts · b8e1a1820033

~~~~text
/**
 * Folds the itemized receipts past their readers' windows (CTO, Nov 1,
 * 21:25: "itemized payment copies fold past their readers' windows"; the
 * play-first lane and the laws lead agreed the windows). Walks the receipts
 * from the oldest and stops at the first dated on or after `before`. It keeps
 * a receipt its source still requires (an open obligation; release reads it),
 * every observer-mode receipt, one a kept record names by id (`named`), and
 * one dated on or after `householdSince` that the player or a member of the
 * player's household is followed on. Every other receipt adds its amount and
 * count to each followed owner's total for its kind and calendar year
 * (`foldedByOwner`), leaves those owners' indexes (an emptied index goes) and
 * goes. Balances, the lifetime totals, the latest rows and the required index
 * stay whole. Folding again on the same day changes nothing. Returns how many
 * receipts folded.
 */
~~~~

### src/core2/journal.ts · 1c6f62edef06

~~~~text
/** Complete registered account index for this owner, including every fund. */
~~~~

### src/core2/kernel/draw-recorder.ts · afc632314353

~~~~text
/**
 * Which lines of the game drew a seeded number, and how often (owner, Nov 16, 2026: "track
 * everything at open so that way you can ... finally eliminate all of these random draws or fixed
 * things"). Off in play: each draw primitive (the seeded generator, the world's seeded unit, the
 * stable hash, the officials' uniform and the bench's look hash) calls `recordDraw`, which returns
 * at once while no recording runs. Dev mode's "How this world opened" turns it on while it rebuilds
 * the world's twin from its recipe, and the opening-draws test turns it on while it opens a pinned
 * world; each reads the sites back by file and function. No imports, so the kernel can use it.
 */
~~~~

### src/core2/knowledge-retention.ts · 6de45d25ef02

~~~~text
/**
 * Memory stays flat (owner, Oct 12; CTO speed and memory order, Oct 14):
 * every event a person lives through leaves `event:<id>:experienced` in their
 * knowledge, and only two writers read it: the appraisal the same day, and a
 * drive's update, which checks its source event. Once a week a key older
 * than `experiencedKeyRetentionDays` goes unless it is the source of a drive
 * the person holds. Forgetting is retention, not a check, so it runs with
 * bookkeeping on as well. The event's own facts stay;
 * the player keeps everything.
 *
 * Each key is queued by the day it was learned as it is written
 * (`api.observe`), and the saved queue holds about one retention window of
 * days. The monthly pass walks the queue's days, skips those not yet due and
 * handles the entries of the rest, never every fact of every person. Days are
 * in the order first written, not by date: a back-dated write (a drive's
 * source observed again on the day the drive formed) can add an old day at
 * the end. A key a held drive keeps waits in its day for the next month; a
 * key gone or learned again leaves it (the new write queued its own day); the
 * player's due keys leave it and are queued again from their facts if the
 * player changes. A save made before the queue existed has it rebuilt from
 * the facts as it loads.
 */
~~~~

### src/core2/labor-past.ts · 34df972c99f7

~~~~text
/**
 * The town's labor market a year before the start (owner, Nov 13, 2026: "it's
 * simulated... things need to be simulated in order to make your modern day
 * make sense"), so Metrics reads last year beside people at work, people
 * looking for work, jobs open and the town's unemployment on day one, the way
 * it does from month 13 on.
 *
 * One rule for both tiers (a counted group is read with the rule a full
 * person is, times its count): the town's unemployment moves with the
 * economy pass's month, so the people looking a year before day one are the
 * people looking on day one moved by how the pass's unemployment stood then
 * against now, out of the same labor force. Jobs open follow the hires the
 * working-life run's own finding rule (`findPerQuarter`, the pass's months)
 * lets seekers make: openings are what is filled, so they move as the seekers
 * times how fast work is found. The figures are written into the closed year
 * row before the start, as the economy stood a year before its latest
 * published month (the way the state's figures read), and cite the economy
 * pass's history record in force then.
 */
~~~~

### src/core2/legislature-bill-form.ts · 84848ffbe900

~~~~text
/**
 * A bill's form in its own body (the owner's ruling, Oct 14, 2026): what it
 * is, how the body numbers it, and its enacting clause. A state chamber
 * numbers by its recorded prefix and period ("LB 12" in Nebraska's
 * two-year legislature), Congress by H.R. and S. per two-year Congress, and
 * a town's body numbers its ordinances by the year.
 */
~~~~

### src/core2/macro-model.ts · 202c502cefcc

~~~~text
/**
 * One published month moved by this world's offsets (owner, Oct 27:
 * "realistic, not real"; Nov 13: "it's simulated... things need to be
 * simulated in order to make your modern day make sense"). The published
 * figures set the base and the shape only. A rate offset moves every month
 * alike; a growth offset compounds from the opening month back, so every
 * month's 12-month change carries it, however far back the month is. The one
 * rule for the months play opens from (`historyMonths`) and the months the
 * history before them records (`worldPublishedMonth`), so the two agree on
 * every month both hold and nothing jumps on day one. Only the figures the
 * row has are moved.
 */
~~~~

### src/core2/medical-bills.ts · b68c3264ed1f

~~~~text
/**
 * Out-of-pocket medical bills and the medical debt they leave, the coverage
 * engine's monthly pass (modules/coverage.ts runs it on the 1st, after the
 * premiums). Background simulation from research (owner, Oct 29 13:30 UTC):
 * the player takes no step.
 *
 * A person's month of care is priced in the place they live: a month of
 * ordinary care takes a fitted amount of a health worker's time
 * (medicalCareUnitHealthPayDays), at what the place's own hospitals and
 * clinics pay their staff today (carePrices), so the price of care moves
 * with the town's own health pay. Each member's part follows two records
 * read the day it is billed:
 *
 * - the care their health asks: the health engine's care need (one for a
 *   serious illness under way, a share for held conditions, none otherwise;
 *   a counted member's serious illness is the counted-illness row), on a
 *   sliding scale up to the top 5 percent of spenders' care (MEPS #533). A
 *   town with more illness has more care and larger bills;
 * - the part of that care their coverage leaves them: their coverage record
 *   (an employer plan, Medicare at 65), their Medicaid coverage where the
 *   law reach keeps it by person id (coverageSpellsNow, named and counted
 *   alike), or none, at the share MEPS #441 finds each pays out of pocket.
 *
 * The household pays the bill from what its members hold, less what they
 * keep back for their home (as for everyday living, cost-of-living.ts), to
 * the town's hospital or clinic (the one its living plan already buys from
 * first), else the outside account. A counted household pays the same bill
 * times its weight through its group's account (counted-money.ts
 * chargeGroups), its housing arrears kept back. What a household cannot pay
 * it still owes, oldest bill first, and asks again each month; a bill unpaid
 * 120 days after it was billed (26 CFR 1.501(r)-6) is placed for collection
 * as a medical-debt record on its books (the credit engine's loans, kind
 * "medical"). The provider weighs each household: the further its income
 * sits under the poverty guideline for its size, the more of the bill is
 * written off as financial assistance and the less is sent to collections
 * (collectionsShare), times the outcome web's factor for
 * finance.medical-debt-in-collections, the measure the expansion's
 * medicaid-expansion-to-medical-debt link moves.
 * No roll: the bill goes unpaid because the household's cash and coverage
 * say so.
 *
 * One cause, one path: the law reach keeps the Medicaid coverage of the
 * town's residents, full and counted, by person id, and pays the adult
 * nothing for it, so a town household meets the expansion only through its
 * own coverage (a covered member's smaller bill) and the place-level row is
 * left out of its factor. Medicaid's own part of a covered member's care (the
 * cost of the care less the member's share) is paid to the seller by the
 * state and federal treasuries, the federal share at the match in force
 * (law-reach payMedicaidCare), inside their budget lines. A member the
 * expansion would cover but whose coverage the work requirement ends (its
 * stretch on their person id) is billed at their own plan's share; what that
 * adds over Medicaid's share is paid first, under ids that cite the
 * requirement. The expansion's and the requirement's coverage links are
 * carried by those records (links.json carriedBy), so the web does not run
 * them. A household in another place the world keeps
 * (the places around the town), whose coverage the reach does not keep,
 * meets the expansion through the place-level row on the share sent to
 * collections, its one path there.
 *
 * Only households in the places whose money the world keeps are billed
 * (billedPlaces).
 */
~~~~

### src/core2/medical-bills.ts · 7ca298fd87a4

~~~~text
/**
 * Keep results, not their history (owner, Oct 7, Nov 5, Nov 8): a household
 * not billed this month (it died out, moved beyond the billed places or
 * merged) that owes nothing and holds no medical-debt record leaves its row.
 * The billing pass reads a row only for what is owed, the debt and its
 * seller, so a household billed again later is billed as it would be from
 * that row. Kept, they were 104 MB of a long run's heap (Montpelier,
 * Vermont, year 6: 46,917 rows). With bookkeeping on (tests, proofs) every
 * row stays.
 */
~~~~

### src/core2/modules/budgets.ts · 4d856cf799b9

~~~~text
/**
 * This world's factor on a published figure (owner, Oct 27: realistic, not
 * real): one plus the world's own offset for that figure, drawn once from the
 * world's seed, its size between the floor share of the spread and the whole
 * spread named by `spreadKey`. The same factor every year, so a base year and
 * its successors agree. Budget lines, the federal debt and its holders, the
 * payees of a line, the service charges' mix and the states' federal stakes
 * all move by it.
 */
~~~~

### src/core2/modules/budgets.ts · 11a691a82ea3

~~~~text
// A home outside the played town is billed by its own place's terms, not
  // the played town's rate and collector (owner, Nov 5: "It should be
  // everywhere").
~~~~

### src/core2/modules/budgets.ts · d42b79dc6e88

~~~~text
/**
 * What a government collected over the fiscal year before `fy` (its own
 * receipts, borrowing left out), over the Census base's revenue for that
 * year: 1 until a whole year of its treasury's months is recorded. The nation,
 * every state and every county re-budget their revenue from it each year, so
 * the plan follows what the law in force actually brought in (owner, Nov 12:
 * budgeted revenue must move; `outside-budgets.ts` does the same for the other
 * states from the country tier's ledgers). Other governments hold 1.
 */
~~~~

### src/core2/modules/budgets.ts · 17ba4160ec9f

~~~~text
// Each line is last year's times its ratios, rounded once to the cent from
  // the exact product (CTO, #9747 6991875920).
~~~~

### src/core2/modules/budgets.ts · b6e4f2b4d58c

~~~~text
/**
 * What a government's year has brought in against what it was bringing in
 * when its budget was written, net of what its body has already amended in:
 * the room a body has to amend the adopted budget (owner, Nov 15: a council
 * amends for a cause on record, not because members wish a line were
 * different). The cause is the treasury's own months: what it took in a month
 * (collected, borrowing left out, plus aid received) since the fiscal year
 * began, over the months before it, as a share of the year's planned revenue
 * for the months closed. Receipts are compared with the treasury's own earlier
 * pace so the answer holds for a town, a county and a state alike. Positive
 * room is money over plan a body may raise lines by; negative is the shortfall
 * it must cut by; null before a month of the year has closed or with no month
 * before it to compare.
 */
~~~~

### src/core2/modules/business.ts · a2f38b822ebd

~~~~text
/**
 * Businesses growing: every business has an owner, and each month the owner
 * chooses how much of that month's profit to draw, never more than the
 * profit the business has kept. Where a place's market for a kind of
 * business has room, the owners of that kind's strong businesses choose
 * first whether to open another location there; if none does, the place's
 * adults choose whether to found one. Chains are repeated growth, never
 * scripted. Every payment moves through the ledger.
 */
~~~~

### src/core2/modules/business.ts · 5ce38add446f

~~~~text
/** This world's share of jobs in outside-owned firms: the published share moved by the world's own draw (owner, Oct 27: realistic, not real). */
~~~~

### src/core2/modules/business.ts · 91a138b87606

~~~~text
/**
 * The next owner: the business's best-paid, longest-serving full worker,
 * else an adult in the owner's family who owns nothing yet.
 */
~~~~

### src/core2/modules/business.ts · fc2018d719ed

~~~~text
// Nobody to hand it to: the owner (or, if they died, their household) closes it and takes what's left.
~~~~

### src/core2/modules/business.ts · 0348ee2ed7e1

~~~~text
/**
 * A person who already owns a business the book was added for (an outlet's
 * publisher, say) is recorded as its owner, so the owner's draws, hiring and
 * closing decisions run on it like any owner-operator's. No profit is owed
 * before the day of enrollment.
 */
~~~~

### src/core2/modules/business.ts · 8546abd33c55

~~~~text
/**
 * The share of this world's businesses that close in a year: the state's
 * published rate moved by the world's own draw (owner, Oct 27: realistic,
 * not real). A base rate that checks totals and sizes the past years'
 * closures; no one business's closing is rolled from it.
 */
~~~~

### src/core2/modules/campaigns.ts · 94faca84ffc5

~~~~text
/**
 * A world candidate's ask for money that reached the controlled person
 * (play-campaign-ask-reaches-player): theirs to answer, never taken. The
 * engine never moves the player's money on its own (owner, Oct 14: the engine
 * offers, the player decides).
 */
~~~~

### src/core2/modules/campaigns.ts · 23d240adc2b4

~~~~text
/**
 * What a resident said at the door when a campaign asked for their vote
 * (owner, Oct 29: a "yes" at the door is near-binding). Written at the knock
 * from the same rule the door's own answer comes from, for every candidate's
 * door and both tiers: a full person's warmth after the visit, or for a
 * counted resident what that visit makes of their record. The ballot reads
 * it (`voting.ts`), and the door scene tells it.
 */
~~~~

### src/core2/modules/campaigns.ts · 17541b5625e2

~~~~text
/**
       * Each resident's "yes" at a campaign's door, one row a voter and
       * candidate in a contest, kept while the contest is open: a closed
       * contest's rows go at its close (`closeRace`), except in a contest the
       * player filed in, which keeps every row (CTO, Nov 1 21:25), and a
       * voter's yes in a race still open stays.
       */
~~~~

### src/core2/modules/campaigns.ts · 12b7572f9b40

~~~~text
/**
 * The answer to a campaign's ask for a vote at the door: a "yes" when the
 * candidate is the one the resident would vote for now, kept as their word
 * (and in place of any earlier word to a rival in the race). A no at a later
 * knock leaves an earlier yes as it was: a word given is near-binding, and
 * only something heavy changes it (owner, Oct 29: a scandal they learned of,
 * a rival they are close to, a broken promise), which the ballot reads from
 * records (`pledgeDoubt`), or a yes they give a rival who now outweighs it.
 */
~~~~

### src/core2/modules/campaigns.ts · afb7ac0658d8

~~~~text
/**
 * What a fact learned through a cause names as its source. The player's
 * circle and people in focus keep the cause itself; for everyone else the
 * cause folds into the voter's summary row for the candidate (CTO, Nov 8:
 * other places keep only the result, detail is built on demand), so the fact
 * names that row.
 */
~~~~

### src/core2/modules/campaigns.ts · c7af360df9f6

~~~~text
// The player's circle and people in focus keep the cause itself as the
      // fact's source; for everyone else the cause folds into the voter's
      // summary row for this candidate (CTO, Nov 8: keep only the result,
      // build detail on demand), so the fact points at that row.
~~~~

### src/core2/modules/campaigns.ts · 16422256eca7

~~~~text
/**
     * Which counted residents who open are filled in as full people: all
     * (true, the default), none (false: a world candidate's or a volunteer's
     * door reaches them as a count), or at most this many, the ones the
     * evening's porch scene could cast (the player's own canvass: a door
     * touches the counted group, and only someone the player talks with in
     * a scene is filled in; owner, Oct 27, "a short scene at 1 or 2 doors").
     */
~~~~

### src/core2/modules/campaigns.ts · e48207fb1d98

~~~~text
/**
 * A unit price in this world, in minor units: the published market price
 * moved by the world's own draw (owner, Oct 27: realistic, not real), never
 * below one cent. A price the Postal Service or a law sets (postage, a
 * filing fee) stays as published.
 */
~~~~

### src/core2/modules/campaigns.ts · 5f8351a479f3

~~~~text
/**
 * How much one offer of help matters to the candidate's story, from 0 to 1
 * (owner, Oct 27, 4 PM Eastern: "it shouldn't be stopped for literally every
 * single volunteer. Maybe some that matter. And that's only when you're doing
 * small local campaigns, or maybe your first campaign."). The race's reach on
 * the story falls smoothly with its eligible voters and with each campaign the
 * candidate ran before; within that, a close tie counts twice a stranger. The
 * director sizes the offer's moment by it, so a friend's offer in a first
 * council race is a scene and a stranger's in a statewide race a journal line,
 * with no size or count at which it flips.
 */
~~~~

### src/core2/modules/campaigns.ts · 9018b4169203

~~~~text
/**
 * Whether a door asks for a signature: the petition circulates and holds less
 * than what a campaign gathers (`signaturesToGather`: the clerk's count plus
 * the names off the roll). Past that, a door asks for the vote (owner, Nov
 * 14). One rule for the player's doors, a world candidate's and a volunteer's.
 */
~~~~

### src/core2/modules/campaigns.ts · 62419c02fb49

~~~~text
/**
 * What a campaign holds and has not set aside: raised less spent, less its
 * funds for an event, a poll and circulators. The one figure every purchase
 * (an ad, a poll, mail, a venue) and every hire budgets from, so none spends
 * money another has been promised (a purchase from the raised-less-spent
 * total once spent the circulators' fund, and their pay then fell due with
 * the cash gone: Tutu, U.S. Virgin Islands, 2026-05-09, "owner after").
 */
~~~~

### src/core2/modules/campaigns.ts · 6c95a0018326

~~~~text
// In person (a speech, a town hall) and in a debate (owner, Oct 14: the
  // audience's views move by the same read as a speech), a candidate who is
  // a person is heard as a speaker on each statement's question: the speech
  // engine moves those who heard it by the candidate's standing with them
  // and lets them retell it at home. Interviews reach their readers and
  // viewers through the causes above.
~~~~

### src/core2/modules/campaigns.ts · 7ca3b18970eb

~~~~text
// Level of detail (owner, Nov 9): a world candidate's paid message reaches
  // the viewers nobody watches once per group of like hearers, the rest as
  // people (`hearAsGroups`). The message row above keeps every viewer.
~~~~

### src/core2/modules/campaigns.ts · 74ffede57e06

~~~~text
/**
 * The organizations in town weigh a race on its campaign turn (owner, Oct
 * 29: "she was working with the Democratic Socialists of America... then
 * her campaign gained steam"). Each group's speaker weighs every candidate
 * standing, the player among them, by the one endorsement rule, reading
 * the group's stance where a person reads their own views; they endorse the
 * one they back above all rivals among those whose platform takes up the
 * group's cause and agrees with it, and no one when none stands out (asked
 * again on later turns, as ties and the field change). A group backs one
 * candidate in a race, once: its members hear it as an endorsement, and each
 * is asked to give their evenings, deciding from their own reasons, their
 * tie to the speaker, their share in the group's cause and their free
 * hours. A group the player speaks for decides only by the player's choice.
 */
~~~~

### src/core2/modules/campaigns.ts · cedda151d379

~~~~text
/**
 * An outlet weighs a race it covers (owner, Oct 16: papers endorse, "if it
 * happens in real life, sure"; its endorsement follows its own leanings and
 * the record, no dice). Its head, who sets its line, weighs every candidate
 * standing by the one endorsement rule (`weighEndorsement`), reading their
 * own views as a group's speaker reads the group's stance: the outlet backs
 * the one candidate its head agrees with above every rival, among those whose
 * platform shares a question with those views, and no one when none stands
 * out (weighed again on a later week as the field and its platforms change).
 * It endorses once in a race, under the outlet's own name (its
 * organization): its followers hear it as an endorsement, and the paper
 * prints it as every endorsement is printed (`campaign-endorsed`). True once
 * the outlet has backed someone in the race.
 */
~~~~

### src/core2/modules/campaigns.ts · f209241f6985

~~~~text
/**
 * When a race's count is in, its candidates' causes fold into one summary row
 * a voter (owner, Oct 29: "simulations... hundreds of years... still
 * speedy"; core-long-run-tables-grow-with-history).
 */
~~~~

### src/core2/modules/campaigns.ts · dd71debdab6b

~~~~text
/**
 * A folded cause kept for the trace goes once it is older than
 * `circleActRetentionMonths`, the window the circle's routine acts already
 * keep (`decision-detail.ts`; CTO, Nov 8: a folded cause keeps its own row
 * only for the player's circle and people in focus, and only while someone
 * can ask why). Readers: dev mode's `findRecord` and a fact's `sourceId`
 * lookup in the why view; a fact older than the window names a source the
 * trace no longer finds, as for any circle act past its window. The player's
 * own rows stay. The campaign summary row already counts every folded cause.
 */
~~~~

### src/core2/modules/campaigns.ts · 58449382a679

~~~~text
/**
 * Fold candidates' causes into one summary row a voter. A voter and
 * candidate fold whole, so a summary's sum is the same sum, in the same
 * order, that `contestStanding` reads. The player's own causes stay as rows.
 * A folded cause that a voter's known fact names as its source moves to
 * `foldedCauses`, where the trace still finds it; no other folded cause is
 * read, so none other is kept (CTO, Oct 30 08:15, amending 03:05). A pledge
 * keeps no cause: a closed race's pledges go at its close (`closeRace`), and
 * the warmth those visits moved stays in the summary (governing lead, Nov 1
 * 21:22; CTO's amendment 21:25).
 */
~~~~

### src/core2/modules/campaigns.ts · ab224d38ab90

~~~~text
// The player is asked too, when the campaign's lists reach them; nothing answers for them, so the ask
  // is kept and a scene puts it to them (owner, Nov 16: "Work for someone else's campaign... until a
  // race opens").
~~~~

### src/core2/modules/campaigns.ts · 407adf2ee1b3

~~~~text
/**
 * A decided race's rows that only the race read go once its election day has
 * passed (governing lead, Oct 30 and Nov 1): its door rows (the campaign row
 * keeps its door counts) and its pledges, the "yes" voters gave at its doors,
 * which the door's answer read during the race and the ballot on primary and
 * election day. Every filing of the contest is read by its id, so no
 * campaign row is made. Only this contest's pledges go, by their contest: a
 * voter's yes in another race still open stays. A contest the player filed in
 * keeps every pledge, its rivals' too (CTO, Nov 1 21:25). No cause is kept
 * for a pledge (`foldCauses`), so the drop leaves nothing behind. Its
 * messages and word are not touched here: a filing stays on the ballot after
 * the count, so word of it may still pass on (`foldRivalWord`).
 */
~~~~

### src/core2/modules/campaigns.ts · 35a6dcf49b47

~~~~text
/**
 * The day to tell a filed player their petition is behind (the Account lead
 * and the owner's Oct 14 rule: the engine offers, the player decides): written
 * once per filing, as a record the director stages as a scene with the clerk
 * or helper, answered by the player. Nothing is done for them (OWNER-DECISIONS
 * Oct 14, "No engine accepts a ... filing or any choice for the controlled
 * person").
 */
~~~~

### src/core2/modules/candidacy.ts · 861091e1a72c

~~~~text
// Their own read of their chance: the odds they would have (their standing
  // against a sitting incumbent's, shared with everyone already running)
  // and the hope an enterprising, risk-taking person adds to them. A long
  // shot who files anyway is realistic (owner, Nov 8).
~~~~

### src/core2/modules/candidacy.ts · 8e72bec36385

~~~~text
// perception: a person's own read of their chance, their real odds plus the hope an enterprising, risk-taking person adds, read once for this one decision (owner, Nov 8, 10:20 a.m.: candidates run because they think they have a chance).
~~~~

### src/core2/modules/candidacy.ts · f65764148de5

~~~~text
// The roles that make people run for the seats near them (the owner's
    // ruling, Nov 8: party activity, owning a business, civic roles are
    // reasons to want the seat): each a sliding pull, zero for one who has
    // none, scaled by how much of it the record shows.
~~~~

### src/core2/modules/candidacy.ts · c5f864a3a1f5

~~~~text
/**
 * Announcing before filing opens (owner, Nov 17: "Of course, other people
 * should be able to do it early"; CTO on #9995: each candidate decides when to
 * announce from their own record, the way the town's candidates decide to
 * file). A runner who has decided to run weighs, the day they decided and
 * every candidacyAnnounceEveryDays after until the window opens, announcing
 * now against waiting to file, through the core's one chooser: their ambition,
 * how many people know them, whether the seat is open, the party and civic
 * roles they already hold, and how near the window is pull toward announcing;
 * what waiting is worth pulls the other way. One who announces does it through
 * the elections engine's one announcement (`announceCandidacy`), the same row
 * and record the player's announcement makes, and files it when the window
 * opens (`fileRunners`).
 */
~~~~

### src/core2/modules/candidacy.ts · f9da4f2ea8cc

~~~~text
/**
 * A party with no one filed for a partisan seat looks for someone to run
 * (owner, Oct 14 and Oct 25: the Pendergast approach). The day filing opens,
 * once the town's runners have filed, its chair asks the party's own members
 * in town who could hold the seat (those who file under its label, by the
 * filing's own membership rule): those the chair is closest to first, then
 * those the most people know (the party's read of who can carry it). Each ask
 * is a record for the member and the chair. The member weighs running again with the ask as a reason; the
 * first who decides to run files, and the party asks no one else. A member
 * whose choices are the player's answers in the scene the ask stages.
 */
~~~~

### src/core2/modules/candidacy.ts · 53c536458b05

~~~~text
// Only with some inroads on record (owner, Oct 15: "The party asks
      // someone to run only with some inroads on record"): the member knows
      // the chair or the two have a tie. A stranger is never asked.
~~~~

### src/core2/modules/candidacy.ts · 8922db306b53

~~~~text
/**
 * Filing opens, before the day's weighing: each party asks the member it
 * would ask first for the seat, as a party recruits while the window is open
 * (owner, Oct 14). Being asked is one of the reasons that member weighs the
 * seat that day (`askOf`), so an ask can bring in someone who had not yet
 * decided to run. A party whose member says no, and a party with no one
 * filed after the weighing, goes on to its next member (`askForCandidates`).
 */
~~~~

### src/core2/modules/candidacy.ts · 6902248b7ed5

~~~~text
/**
 * Keep results, not their history (owner, Oct 7, Nov 5, Nov 8): a person's
 * decision not to run in a race decided more than
 * candidacyDecisionRetentionDays ago leaves the table on the first of a
 * month, in play. Every reader asks about a race still being run (who
 * filed, who was asked, the incumbent's own choice) or about those who ran:
 * demotion keeps a runner full until their race, the candidate pool reads
 * past runners from the weighed rows, and the dev path check reads the
 * holder's own decision to run. Those all stay. Kept, the declined decisions
 * were 28,733 of 30,181 rows at Montpelier, Vermont, year 4 (27 MB as JSON).
 * With bookkeeping on (tests, proofs) every decision stays.
 */
~~~~

### src/core2/modules/climate.ts · 3216a4d15a52

~~~~text
/**
 * The climate, through the effect map (Nation, Nov 9, 2026; owner: "do a very
 * basic weather thing that is with the effect map. so we can get some basic
 * climate change effect"). One national warming level and each hazard's level
 * (heat, flood, storm, wildfire, drought), as results, month by month.
 *
 * Emissions come from the simulated laws: the carbon price and the federal
 * power-plant carbon limit in force in every state (read as every state's law
 * is, `stateLawInForce`, against the day the world opened, lagged by the
 * links' own months), weighted by the state's people over the country's. The
 * country's energy CO2 moves by that index and the rest of the world's does
 * not: the rest of the world's CO2 carries on at the world's own trend, drawn
 * from its seed (`restOfWorldTrend`), never a real year's path, so the warming
 * rises with no law changing and the laws move only their own share. The CO2 adds to the warming at the transient climate response
 * (`emissions-to-warming`), and each hazard's level is one plus its link's
 * size times the warming since the world opened (`warming-to-<hazard>-hazard`).
 * The links name this module as the engine that carries them (they are not a
 * place's rate, so the web does not run them). Nothing here draws or limits a
 * level, and nothing moves it but the laws in force.
 *
 * The recorded history sets only where each county's hazard starts (the
 * disasters module's FEMA record); this module keeps what the warming does to
 * it. The national events engine and the town's disasters module read the
 * levels (`stateHazardRate`, `hazardRate`) and make the weather from them.
 */
~~~~

### src/core2/modules/constituent-cases.ts · 494686502fc2

~~~~text
// The wider population brings problems from the same records: a counted
  // resident out of work, with the cushion their group's fund leaves them.
  // They stay counted (two-level population, owner, Oct 11): the case is kept
  // by their id and decided by the same rule, and they are filled in only
  // when the official who hears it is the player, or the player opens them.
~~~~

### src/core2/modules/contracts.ts · 908d4df7e817

~~~~text
/**
   * Members whose first choice was the winning firm while they own it or a
   * relative or housemate does: the vote of an interested member. `relation`
   * is "self" for the owner, else the member's family relation to the owner
   * (closeness.ts `familyRelation`).
   */
~~~~

### src/core2/modules/corruption.ts · 53067a37ad02

~~~~text
/**
   * An offer to the person the player controls, which waits for the player's
   * own answer in the scene (the cause record `corruption.bribe-offered`): a
   * trait decides only for people the player is not (owner, Nov 8).
   */
~~~~

### src/core2/modules/counted-demotion.ts · 701e1eb77702

~~~~text
// They keep their results, not their day-to-day memory (two-level rule,
  // owner, Oct 11: nobody gets a full past or memory until filled in): what
  // they heard and lived through goes, as a counted person holds none; their
  // counts, accounts, jobs, drives, ties and the records of what they did
  // stay, and meeting them again brings back the same person to learn anew.
~~~~

### src/core2/modules/counted-demotion.ts · 203db5f03ef8

~~~~text
/**
 * How many days without contact before a met person drifts back: drawn once
 * per world from the world's seed within the parameter's spread (owner, Oct
 * 15, 2026: 180 to 240 days, never one fixed number). Seeded generation of
 * who the world is; nothing rolled in play.
 */
~~~~

### src/core2/modules/counted-moves.ts · dcf5d3a2cfc7

~~~~text
/**
 * The counted population moves from causes (one model, two tiers; owner,
 * Oct 14, 2026: "if California repealed its state income tax, people would
 * flood in"). Every state and territory holds its people at a coarse grain
 * (age bands, from its BEA population); the town and its neighbors hold
 * theirs as counted groups. Once a month every group weighs every other
 * place: the country tier's share of its age that leaves its state this
 * month, times what holds it (a home owned, children at home) and pushes it
 * (an eviction), its region's unemployment against its state's, and the
 * outcome web; the rest of its own state is one more destination, weighed
 * with the other states by size, draw and pull (the after-tax income each
 * offers in real terms, its unemployment against home's), so how many stay
 * in their state comes from the weighing, never a published share. Nothing
 * is rolled and nothing is scaled back to a published rate: the expected
 * movers accrue month by month and a whole household moves when one is
 * due, toward the place that pulled hardest. People arrive in the town the
 * same way from every other place, and from abroad as the tier's month
 * brings them, settling where work is open. The regional engine reads each
 * state's counts.
 */
~~~~

### src/core2/modules/counted-moves.ts · a484ccbe464f

~~~~text
/**
 * Institutions admit as rooms empty (owner, Nov 8: group quarters turn over).
 * A place's rooms of one type are its beds: the people they held the first
 * month. When a resident dies or is filled in and the room stands empty, the
 * next person on the institution's waiting list moves in, a person drawn
 * like one the type's rooms hold (same ages, new identity, seeded), so a
 * nursing home, a dormitory or a barracks stays occupied the way its beds are.
 * Residents are discharged on the type's own calendar (`groupQuartersStayOf`):
 * a type's beds turn over once in its stay, in the months its calendar names
 * (a college graduates its class in May and admits the next in August), the
 * rooms in turn by id and never by a chance. A nursing home has no stay: its
 * residents leave when they die.
 */
~~~~

### src/core2/modules/credit.ts · d5c04c3f8eec

~~~~text
// The county's published deposits are the center; this world's banks hold a
  // level drawn from its seed (realistic, not real; owner, Oct 27).
~~~~

### src/core2/modules/credit.ts · 7d2bf4cf275a

~~~~text
/**
 * The town's small-dollar lender, or nothing where its state's law ends them.
 * Its yearly volume is the households that borrow (the FDIC's share of
 * households using a payday loan in a year, scaled to where lenders operate
 * by Pew) times the loans and dollars a borrower takes (Pew), moved by a
 * level drawn from the world's seed so no two worlds open on the same figure
 * (owner, Oct 27). Its cash is that volume over the turns a year gives it.
 */
~~~~

### src/core2/modules/credit.ts · 6982ec31048d

~~~~text
// The owner decides; a firm with no recorded owner (a public employer, an
    // ownerless landlord) is run by its best-paid full worker, who weighs the
    // same reasons. With no full person to decide, its counted people's summed
    // pulls do, as a counted owner's do.
~~~~

### src/core2/modules/crime.ts · 32681259c1c4

~~~~text
/**
 * A kind's yearly rate per 1,000 in this world: the published NCVS rate moved
 * as the world's own level of its outcome moved from the published one
 * (owner, Oct 27: realistic, not real), so the crime engine and the outcome
 * web open on the same drawn level.
 */
~~~~

### src/core2/modules/drives.ts · 6eb32dbe7faa

~~~~text
/**
 * The same response for the final choice among responses. Its trait lean is
 * already inside each response's urgency, and for a lasting drive it is
 * scaled by the person's agency (age and standing), so the chooser does not
 * add it again: otherwise a young child with an activist's traits takes up a
 * cause as readily as an adult (CTO ruling, Oct 14).
 */
~~~~

### src/core2/modules/drives.ts · b840da7ed593

~~~~text
// A tie with less than the level to lose (two strangers, or a thin tie)
  // takes the hours of the level itself, as strain later time together must
  // first make up: a stranger who is confronted is someone the holder has now
  // fallen out with, not someone the confrontation never touched (CTO, #9747
  // 6999923338).
~~~~

### src/core2/modules/drives.ts · 293d279e5f92

~~~~text
/**
 * How long a drive takes to fade by half without new events or acts: its
 * kind's base, moved for a kind that names a trait lean by the holder's own
 * lean (a resentful person holds a grudge for years, a forgiving one lets it
 * go in weeks; Pins, CTO #9747 05:10Z). Kept on the drive, so dev mode's
 * Trace box shows it.
 */
~~~~

### src/core2/modules/elections.ts · 18d942deddae

~~~~text
/**
 * Elections, part one: contests and filing (golden path step 3).
 *
 * At the opening every seat covering the town gets its next contest: the
 * election date, the primary and the filing deadline from
 * `elections-calendar.ts`. A person files at the office that takes that
 * contest's filings (`filingOfficeFor`), once, if they meet what that place's
 * rules require: age, residency and registration, read from
 * `data/research/elections/filing-requirements.json` (or the estimated terms
 * in `candidate-filing-terms.json` where a place isn't read yet). Filing is
 * a petition, signatures, the clerk's check, then the ballot (owner, Oct 28,
 * reversing the Oct 13 "no fee or petition" ruling): a filing opens a
 * petition with the signatures the place's law asks (`petitionRule`), the
 * candidate's campaign gathers them (`signPetition`, from the campaign
 * engine's doors, events and circle), and the voting engine's clerk checks
 * them the morning after the deadline (`keepPetitionCheck`). No fee is
 * charged. The filing becomes a record; an unmet rule comes back as
 * structured reasons the English engine words.
 */
~~~~

### src/core2/modules/elections.ts · 544cfb1966b9

~~~~text
/**
   * "announced" from the day the candidate declares for a race whose filing
   * window has not opened (owner, Nov 17: "Run now, file on the date"): the
   * campaign raises money and gathers signatures, and the candidate is not
   * yet in the race. Filing in the window makes it "petitioning" while the
   * candidate gathers signatures, then "on-ballot" or "short" by the clerk's
   * check; "withdrawn" for one who left the race or lost a primary.
   */
~~~~

### src/core2/modules/elections.ts · 7c68c5eeff09

~~~~text
/**
 * The signatures one side's petition must hold: the place's read count; none
 * where its row says the law asks none (signatures "where the place requires
 * them", owner, Oct 6, prior-rulings/elections.md R5, restored by the Oct 28
 * ruling that filing is a petition); where its row gives a formula, the
 * place's rule in `petition-rules.json`, computed for the race's own
 * electorate (owner, Nov 14: a race needs the number its own law sets).
 * A place and family with neither is a gap in the data, not a count.
 */
~~~~

### src/core2/modules/elections.ts · 5c834e1cccf1

~~~~text
/**
 * The appointing body offers the player a vacant town seat before it seats anyone (owner, Nov 16: "you
 * can only be appointed to council, like the playable offices"; CTO, Nov 17: the player can be
 * considered on a record of service, campaign work or a party committee). Only a seat the player could
 * run for, in their own district, to a player of voting age living in the town whose record brings
 * them to notice. The seat waits on their answer, or on the offer spacing days.
 */
~~~~

### src/core2/modules/elections.ts · dfdb3e8b30f6

~~~~text
/**
 * Whether the player may file for an office of this kind, given the kinds of
 * the home's own local offices (owner, Oct 29: the player runs only for city
 * council, state legislator, mayor, governor, Congress and president, and
 * "city council is, you know, whatever the equivalent is"). A row with
 * `onlyWhereNo` is the player's only where none of the home's local offices
 * has one of those kind prefixes: the township board where the home has no
 * council, the county board where it has neither, the county executive where
 * it has no council, mayor or township board. Pure: the one rule over the data.
 */
~~~~

### src/core2/modules/elections.ts · b4999ee85bf3

~~~~text
/**
 * The district of a districted local body the player's home is in: one of
 * its district seats, by the home's household (owner's town council seats
 * ruling, CTO: by district, the player files only for their own district's
 * seat). No district map is read for a town's council or a county's board, so
 * the home's district is drawn from its household over the body's district
 * seats, the same district every day; null with no player.
 */
~~~~

### src/core2/modules/elections.ts · 1cc0cdb15db7

~~~~text
/**
 * The one reader of whether the player is offered a contest and, when not,
 * the one reason: the clerk's counter, Campaigns and the filing error read
 * this and keep no copy of the rules (owner, Nov 16: a voter sees and runs
 * for the seat that is theirs). The order of the checks is the order of the
 * reasons: the office, the seat's town, the window, the body's other races,
 * then the district.
 */
~~~~

### src/core2/modules/elections.ts · 79f97f7f4d14

~~~~text
/**
 * Why an office is not one the player runs for: the two causes of `not-your-office`, from the one rule
 * (`playerMayFileForKind` over the player-offices data; owner, Oct 29). `not-run-for`: the office is
 * not one a player runs for (a sheriff, a clerk, a statewide office below governor). `home-has-own`:
 * it is the player's only where the home has none of its own (a county board where the town has a
 * council). `insteadIds` are the home's own offices the player runs for instead, so the screen can name
 * them (owner, Nov 16: "I can't run for anything"; crew list #9747, item 3a: closed offices show why).
 */
~~~~

### src/core2/modules/elections.ts · 18e7b830ac5c

~~~~text
/**
 * Whether the player may run in this contest today: an office the player runs
 * for (`playerMayFileForKind`), a seat that covers their home, its filing
 * window open (`filingWindowOpen`), and of a local body's seats only the one
 * race that is theirs (owner, Nov 1 playtest: "I should only be able to run
 * for one council seat"; CTO's town council seats ruling): their own
 * district's seat where the body is elected by district, and where seats are
 * elected at large, the at-large race once, as one candidacy. A candidacy
 * already filed in one of a body's races on that day rules out its others.
 */
~~~~

### src/core2/modules/elections.ts · 7be785f87f25

~~~~text
// A candidate who announced files the same candidacy: its campaign, money
  // and signatures carry on under the filing (owner, Nov 17: "Run now, file
  // on the date").
~~~~

### src/core2/modules/elections.ts · d9804e475956

~~~~text
/**
 * Announce for a race whose filing window has not opened yet (owner, Nov 17:
 * "Run now, file on the date. From day one the player can announce for a
 * coming race, form a campaign committee, raise money and gather petition
 * signatures. The official filing happens in the real window, and the year
 * between is the campaign."). The candidacy is the filing's own row in the
 * "announced" state, so the campaign engine opens its committee, raises money
 * and gathers signatures on it as on any filing; filing in the window
 * (`fileCandidacy`) turns the same row into the filing. The same checks as a
 * filing, except that the window has not opened; a race whose filing closed
 * or is open now takes a filing instead.
 */
~~~~

### src/core2/modules/elections.ts · d80b9110bcf1

~~~~text
/**
 * Whether a candidate is in the race for the press: a filing that stands, or
 * an announced one whose race is still ahead (owner, Nov 17: "Run now, file on
 * the date"). An announced candidate is already campaigning in the open, so
 * the papers ask them and they can be asked.
 */
~~~~

### src/core2/modules/elections.ts · b5adebd75efd

~~~~text
// Keep results, not their history (owner, Oct 7, Nov 5, Nov 8): once the
  // clerk has checked a petition, its check keeps what counted (the valid
  // count and the names struck), and no reader asks for its signatures again
  // (they are read while it circulates and by the check). In play they go;
  // kept, they grew from 54,506 rows at year 4 to 132,276 at year 8 at
  // Montpelier, Vermont (Nov 9, 2026). With bookkeeping on, every row stays.
~~~~

### src/core2/modules/employer-taxes.ts · 5ab8ae177cbf

~~~~text
/**
 * A quarter's tax on profit (owner ruling, Oct 14): a business owned by
 * another organization (a corporation's location) pays the corporate rate in
 * force on its operating profit over the quarter, from its books, to the
 * federal and state treasuries. An owner-run business's profit is its owner's income
 * under the law and is taxed as that (`passThrough`). Every business also pays
 * property tax on its premises each quarter (`payPremisesTax`).
 */
~~~~

### src/core2/modules/executive.ts · d95b223a8c80

~~~~text
// The player's decisions are theirs: nobody appoints the player to a post
  // they didn't choose (owner, Oct 14: the engine offers, the player decides).
~~~~

### src/core2/modules/grievance.ts · bee86261ecb6

~~~~text
/**
 * Grievances between two people (world-police-patrol-and-grievance-causes,
 * part 2; design: docs/design/proposals/movements-and-unrest-2026-10-14.md,
 * unrest arises from conditions between people). A grievance is written only
 * because a recorded event hurt a named person, through the events the
 * engines that create the conflict already emit:
 *
 * - a layoff: the jobs engine's `work.job-lost` (src/core2/modules/jobs.ts
 *   `layOff`). The laid-off worker holds it against the person who decided
 *   (the employer's owner, or the best-paid worker who runs an ownerless
 *   firm). The cause record is the jobs engine's `job-change` row.
 * - an eviction: the housing engine's `housing.eviction`
 *   (src/core2/modules/housing.ts `remove`). The evicted household's head
 *   (its oldest member) holds it against the landlord's owner. The cause
 *   record is the housing engine's eviction case.
 *
 * A grievance ends when its cause is undone: the same employer hires the
 * worker again (the jobs engine's `hire` change), or the household rents
 * again from the same landlord (the housing engine's `housing.status-changed`
 * to housed, with the lease it signed).
 *
 * Detail only where the player can see it (owner, Nov 10, through the CTO:
 * "it has to perform like a game"): a grievance row is written only where at
 * least one party is a full person (the people a scene, a card or the trace
 * can show). A dispute among the counted population writes no row: it adds
 * to one count per place, month and cause, on the event as it fires. By the
 * same rule for both tiers, a row and a count stand for the people the cause
 * record stood for (`heads`, the job change's own count).
 */
~~~~

### src/core2/modules/grievance.ts · fc5250d0b43c

~~~~text
/** The person they hold it against, or the business where it has no owner (SG-WORLD-grievance-ownerless-landlord). */
~~~~

### src/core2/modules/health.ts · 7e66a503a87b

~~~~text
/**
 * Owner ruling, October 9, 2026: each person carries their own resilience
 * line, a generation fact keyed to them. Under the life table's proportional
 * hazards, the integrated hazard a person reaches at death is spread as a unit
 * exponential, so the line is that spread read at the person's stable key.
 * No decision reads it as a chance; strain still builds smoothly from causes.
 */
~~~~

### src/core2/modules/health.ts · accbcb0827a0

~~~~text
/**
 * Another place's holders nobody has opened are not even husks (CTO, Nov 18
 * 13:44Z), but they live by the same rule: each gets the health record a
 * husk gets, from who their engine says they are, on the day they join.
 */
~~~~

### src/core2/modules/housing.ts · 5cf763d59e42

~~~~text
/**
 * A county's median gross rent and owner home value in this world: the
 * published ACS medians moved once by the world's own offsets, drawn from
 * its seed (owner, Oct 27: realistic, not real; the medians calibrate).
 */
~~~~

### src/core2/modules/housing.ts · 29c480d325cf

~~~~text
// Full households and the wider population's, ranked together for owning.
  // Group-quarters rooms are outside the housing market: the institution
  // houses them, so they never own, rent or borrow (CTO, Nov 1).
~~~~

### src/core2/modules/housing.ts · d5f30095faa3

~~~~text
// Every renter owes rent, with or without income of its own (owner, Oct 14): a household its group's money or its own cash can't carry falls behind like any other.
~~~~

### src/core2/modules/housing.ts · 5cec0e1247af

~~~~text
// The player's household is evicted like any other (owner, Oct 14).
~~~~

### src/core2/modules/housing.ts · 1b748315f466

~~~~text
// Evictions without courts (owner, Oct 14, OWNER-DECISIONS.md): the hearing is a dated step of the statute that follows its conditions (rent owed, notice given); there is no judge or court scene until courts come.
~~~~

### src/core2/modules/interest-groups.ts · 42eaed9dedd4

~~~~text
/**
 * A crowd that keeps coming back over the same grievance becomes a standing
 * residents' group (owner, Nov 8: "can you start a movement?"): the same group
 * a bill's fiscal losers form (same id, same organization, same lobbying of
 * the next bill on its question), founded by the people who keep turning out
 * and not by a bill. Returns the group, or null where the engine is not
 * installed or no one who is alive can speak for it. A group already standing
 * on the question takes the new members.
 */
~~~~

### src/core2/modules/jobs.ts · b4eed7d2e13f

~~~~text
/**
 * Someone left an employer's staff: its need grows by the jobs they stood for (one for a full person) at once, and the
 * leaver's job waits to be replaced in the same role (owner, Oct 14: every
 * role is refilled when its holder dies, leaves or is removed).
 */
~~~~

### src/core2/modules/jobs.ts · d3daa993f133

~~~~text
/**
 * Counted workers who left an employer outside the jobs engine since the
 * last review (the wider population's deaths and moves, which end or drop
 * their jobs) are replaced as full workers are: their jobs join their
 * employers' leavers. Each employer keeps the counted jobs it had at the last
 * review; one that is gone, not ended by the jobs engine and not now a full
 * person's job, left. Counted leavers keep no reasons (owner, Oct 14, ruling
 * 3). One pass a month.
 */
~~~~

### src/core2/modules/jobs.ts · 51aa537ffe25

~~~~text
/**
 * Every employer opens the world with the openings a real one carries on any
 * day (owner, Nov 12: a jobless player "can never be offered a job" when the
 * books start empty): its staff times its industry's JOLTS openings rate
 * (src/core2/data/jobs/openings-rate.json), each opening standing for the
 * employer's typical counted worker's weight. A place's openings are made
 * whole by largest remainder across its employers, so nothing is drawn; each
 * is a role furthest below the employer's staff mix, copied from a job of
 * that role, and opened on a day spread back across its industry's wait
 * (`vacancyDays`), so they come due to be filled one after another from the
 * first weeks on. Returns the jobs posted, by employer.
 */
~~~~

### src/core2/modules/jobs.ts · dee67f43bc1f

~~~~text
/**
 * An industry's employment this month against the opening month's, from BLS
 * CES seasonal factors; 1 for kinds with no series. With a world's seed
 * (play), the industry's swing is this world's own: each month's deviation
 * from 1 moved by one offset for the series (owner, Oct 27: realistic, not
 * real). Without it, the published factors (calibration).
 */
~~~~

### src/core2/modules/jobs.ts · ae55a292a293

~~~~text
/**
 * An opening nobody has taken may be offered more by its owner (owner, Oct 16:
 * "if they can't afford it they can't afford it; if they're stubborn they
 * might not do it"). The raise is read from the employer's books and its
 * owner's traits; no step and no waiting period is fixed.
 *
 * - What the seat can carry: each head's share of what the last month left
 *   after purchases and compliance (the wages it has to cover), read against
 *   the opening's pay now. A seat already paid at or above that share is not
 *   raised: the employer cannot afford it.
 * - What the empty seat has cost: the days it has stood empty times that
 *   share a day. Nothing has been lost on the first day, so nothing is raised
 *   on it; the longer it stands, the more the owner will add.
 * - Who decides: the owner's open-handedness, from the shared chooser
 *   (`decisionLean`), scales what they will add; a stubborn owner adds
 *   nothing.
 * - Who a raise could draw: pay fills a seat only through a job-seeker who is
 *   ready to apply (`findingReady`) near the employer. The raise is scaled by
 *   the share of the place's fillable openings those ready seekers could take
 *   (their count over the openings, at most one): where no one is ready to
 *   look, a higher offer draws no one and none is made (Nov 18: a cashier's
 *   posted pay went from $15.98 to $111.01 an hour in one review with no
 *   seeker in town ready to apply).
 * The added monthly cost is the least of those three and the room the last
 * month's trading left, which raises already given this review use up. An
 * opening a counted worker will fill stands for their household's weight, so
 * its raise costs that many seats' worth of the room.
 */
~~~~

### src/core2/modules/jobs.ts · 665ea6cbfb7f

~~~~text
/**
 * The one read the business engine takes of a firm's staffing (owner, Nov 9:
 * firms diverge by service level): the employer's last review, or none for a
 * firm the jobs engine does not run or has not yet reviewed (a new business
 * still hiring reads as serving no one). The service level
 * is staff over target, one where the firm is fully staffed.
 */
~~~~

### src/core2/modules/jobs.ts · 1998e4a5b9f0

~~~~text
/**
 * A new opening's pay: the role's own rate, moved with the region's pay level
 * since it was set, never under the wage floor in force; the median of whoever
 * holds the role plays no part (owner, Oct 14). What the job's holder has
 * earned in it by tenure and how they work (`raisePay`) stays theirs: the
 * opening is priced from the role's rate without it.
 */
~~~~

### src/core2/modules/jobs.ts · 1fb20d46619a

~~~~text
/**
 * The owner who decides for a business today: its recorded owner, unless that
 * person has died. Until the estate settles the business
 * (`world-estate-settles-loans-and-businesses`), the owners table can still
 * name the dead, and a dead owner decides nothing: the decision falls to whoever
 * the caller names next (Washington, District of Columbia, seed 23bc2900…c7289:
 * a layoff on July 1 named an owner who died on June 2).
 */
~~~~

### src/core2/modules/jobs.ts · 57ad525b05d2

~~~~text
/** The full worker who runs a firm with no recorded owner: the best paid of those staying, ties by id. */
~~~~

### src/core2/modules/jobs.ts · e0d01e34ea44

~~~~text
// Only where someone at the employer knows them (owner, Oct 27: an offer
  // comes through a person; Nov 16: "I didn't even apply for one"): a person
  // the player knows or is kin to, on that employer's staff, speaks for them.
~~~~

### src/core2/modules/jobs.ts · 92dbf4f376b5

~~~~text
/**
 * The employer picked the person the player controls: a person at the
 * employer makes the offer and holds the position until the deadline. The offer
 * is the `job-offered` record the director stages as a call from that person
 * (owner, Oct 27: a job offer comes through a person and a scene or not at
 * all); the employer withdraws it unanswered after the deadline. With nobody at
 * the employer to make it, there is no offer.
 */
~~~~

### src/core2/modules/justice.ts · b044d000ea42

~~~~text
/**
 * Justice, the small version (owner, October 14, 2026: "Courts, trials,
 * prisons: build a small version"). A crime the corruption engine recorded
 * reaches a prosecutor only through someone who knows of it: the official
 * who refused a bribe, or someone a party told. Each step is decided from
 * the records, never a roll:
 *
 * 1. Report: the person who knows weighs reporting against their tie to the
 *    accused and their own traits.
 * 2. Investigation: the prosecutor weighs the evidence, how prominent the
 *    corrupted office is and their own party against the accused's. An open
 *    investigation follows the money: every payment the accused made or took
 *    on the books brings in the other party.
 * 3. Charge and plea: after the charging time, each target is charged when
 *    the evidence clears the prosecutor's bar (raised by the cases they have
 *    lost); a charged defendant pleads when the case against them, net of
 *    what their money buys in defense, would convict.
 * 4. Trial: on the state's time to disposition, the verdict is the same read
 *    of evidence against defense, with its reasons.
 * 5. Sentence: the state's range for the offense, slid by the bribe's size
 *    and the office; a fine paid to the treasury on the journal, probation, or
 *    prison. A conviction vacates the person's seats by the place's
 *    forfeiture rule. Prison ends the job and the person's own choices until
 *    release; release returns them with the conviction on record.
 *
 * Every step is an event the news and the director read: the hearing and the
 * verdict play as scenes when the person is the player or in their circle.
 *
 * Ordinary crime reaches this engine as counted cases (one model, two tiers;
 * engine map E13): public safety brings each month's arrests by offense, court
 * and age band, and this engine files them, decides them when their time to
 * disposition comes and holds the convicted in jail, prison or a juvenile
 * placement for their term. A counted case, its sentence and its custody are
 * rows of the same tables as a named defendant's, marked `kind: "counted"`.
 */
~~~~

### src/core2/modules/justice.ts · 753852a6150b

~~~~text
/**
 * The court escrow fund under a treasury's owner: bail sits here, apart from
 * the cash the government can spend, until the hearing returns it.
 */
~~~~

### src/core2/modules/kin-contact.ts · a004e211bda4

~~~~text
/**
 * Word from relatives who live elsewhere (owner, Nov 8, 2026: "EVERY. LIFE.
 * IS. SIMULATED."): each month a town resident's pull to hear from a relative
 * living elsewhere builds with how close the two still are, at the pace one
 * whole contact a month at full closeness (`kinContactsPerYearAtFull`); a pull
 * that reaches one whole is a contact, written as `family.contact` (the
 * relative writes, the resident reads) and recorded as time together on the
 * tie (`relationship`), so the tie fades slower the more they write. Nothing
 * is rolled: closeness decides, and a tie that has faded to nothing writes
 * nothing. The director's `letter` scene reads the record.
 *
 * It runs inside the partnerships review (one monthly entry for the lives of
 * people outside the played town), so it installs nothing of its own.
 */
~~~~

### src/core2/modules/laws.ts · bbab8820048f

~~~~text
// Social Security's retirement ages are federal law (owner, Oct 12).
~~~~

### src/core2/modules/laws.ts · a9482f1ead37

~~~~text
// In a world whose day one is the century's, the law in force is what the century's
    // bodies left: a federal question Congress's, every other the state legislature's (CTO
    // line 6935086070 on #9747; History's family 4). No federal law reaches a state question
    // there, as the century's Congress votes only the federal ones (stopgap
    // SG-HIST-century-federal-mandates).
~~~~

### src/core2/modules/laws.ts · 16c4b0cf558c

~~~~text
/**
 * A repeal: the body's own law on a series ends on the repeal's effective
 * date, so the level holds exactly what it held before that law (an earlier
 * law of its own, its opening row, or none at all), and the next level's law
 * governs as before. The row the body's last bill wrote is ended, not
 * covered by a second row (owner, Nov 7: "these should all be able to be
 * reversed"). Returns the ended row, or null when the body has no law of its
 * own on the series to end.
 */
~~~~

### src/core2/modules/legislature.ts · 572ec26915be

~~~~text
/**
     * What the section cites as the law it amends, for the English engine:
     * the designation of the bill, passed in play, that enacted it, with
     * that bill's form; or, for a law in force when the game began, the
     * statute its research recorded (`terms.cite`), since laws in force stay
     * the real starting law (owner, Oct 27). Null where neither is on record:
     * a starting row's research source (a web page, a survey, a note on how
     * it was estimated) only calibrated the row and is never said in play.
     */
~~~~

### src/core2/modules/legislature.ts · 5b86d97a53a6

~~~~text
/**
 * A bill is not introduced without a section: its title is what its sections
 * do, so a bill with none cannot be named (owner, batch 11).
 */
~~~~

### src/core2/modules/legislature.ts · 64a5ed2e7529

~~~~text
/**
 * The sponsor edits the bill on paper before its vote (the owner's
 * bill-on-paper workflow, September 25, 2026): add a section, replace one or
 * strike one. The paper is the one record of the bill: each edit rewrites
 * its sections and checks them again. A bill already voted on is not edited.
 */
~~~~

### src/core2/modules/legislature.ts · 2ea7dd46ea84

~~~~text
/**
 * What a member asked for their vote would take in return, from their own
 * record (brief O; owner's rule, Nov 14: a price is never named in the same
 * breath as the vote, and only an act the engine does can pay it). Two prices
 * the engine can pay, the one that moves them most first:
 * - `their-bill`: the asker's vote for the member's own bill waiting in the
 *   same body, paid as `offerDeal` kind `back-their-item` naming that bill;
 * - `amend`: half of the section of the asker's bill that weighs most against
 *   them (a budget line or a law amount: a yes or no question has no half),
 *   paid as `offerDeal` kind `amend`, which changes the bill for everyone.
 * Null where neither would carry them, or where they already lean for it.
 */
~~~~

### src/core2/modules/legislature.ts · 9b6abf37f6e3

~~~~text
/**
 * The floor before the roll (owner, Nov 8: members speak in session, for and
 * against, recognized by the chair): the sponsor speaks for the bill if they
 * sit in this chamber, else the member whose position leans furthest for it;
 * the member whose position leans furthest against speaks against. Only a
 * full person who is alive can rise, and only if their position leans their
 * way at all, so a bill nobody opposes has no one against. Ties go to the
 * member key. A public record the director stages for the members in the
 * room and the press can tell.
 */
~~~~

### src/core2/modules/legislature.ts · 2f5d245ba01f

~~~~text
/**
 * The floor before a chamber votes, and a committee's markup before it
 * reports (the owner's ruling, Oct 14, 2026, afternoon). A sponsor short of a majority works the holdouts nearest even:
 * each asks for a section of their own in return for their vote, and the
 * sponsor gives it where they still back the bill with it. Then the member
 * most against a bill that would pass may move a poison pill: a section of
 * their own the bill's backers dislike, adopted by the opponents and those
 * who like it, that leaves the bill short. Whether they play it that way is
 * their own temperament. Each adopted section is the bill's for good.
 */
~~~~

### src/core2/modules/legislature.ts · 7387c1f98aa5

~~~~text
/**
 * The executive's turn on a budget the legislature passed: a chief executive
 * with a veto signs or vetoes from their own position (the owner, Oct 14:
 * the executive signs or vetoes everywhere), recorded as an executive-action
 * the press reads. Null where there is no such executive, or where the
 * person the player controls holds the office: their budget proposal is
 * their own act, and a desk for it is a separate piece of work.
 */
~~~~

### src/core2/modules/legislature.ts · 9c3ed0a11a97

~~~~text
// The lapse is the executive's act as much as a signature is (owner's
  // card, Nov 14 2026, 06:08Z: "the Journal says so"), on the same record.
~~~~

### src/core2/modules/meetings.ts · d5e8f10aa517

~~~~text
/**
 * The player accepts a debate's invitation from the menu (the invitation
 * scene went with the unwritten kinds, owner, Nov 17): the sitting goes on
 * the record with the moderator who asked, as the scene's yes did. `fromId`
 * names the choice that said yes, for the record's citation.
 */
~~~~

### src/core2/modules/moves.ts · c8517d63c4e4

~~~~text
/**
 * Moves (M1-09, part 2): who leaves town, and why. Leaving is a choice, never
 * a draw. Each adult carries a pull to leave that builds month by month: from
 * their stage of life (the counted tier's own leaving rule: how often people
 * their age in their state leave it this month by the country tier, and the
 * rest of their state as the destination weighing draws it) held back by
 * what ties them to the town (a home they own, children at home, relatives
 * here, a job), and from what happens to them (an eviction, a lost job, a
 * parent, child or sibling moving away), and their region's work against
 * their state's. Nothing scales the town back to a published rate. Each
 * month every adult weighs leaving against staying through the core's one
 * chooser; the pull is the reason to go. A householder takes their partner
 * and children; a grown child living with a parent leaves on their own.
 * Where they go is a record, never a draw: to a relative living elsewhere,
 * else the state the destination weighing ranks highest for their pay and
 * tenure (the rest of their own state among them).
 *
 * A leaver's records stay. Their job ends, the household's rent and spending
 * here end, they take the destination as their place (with their household,
 * or in a new one there when others stay), so the town's residents and voter
 * rolls no longer list them, and they are no longer simulated in town (the
 * same inactive tier as relatives who live elsewhere). The ACS rates check a
 * year's totals against the simulation, never set them.
 *
 * Every life is simulated (owner, Nov 1, 2026: "EVERY. LIFE. IS. SIMULATED.
 * ... THIS IS LOW INTENSITY STUFF."): a relative or acquaintance who lives
 * in another real place (the inactive tier, kept minimal until met) builds
 * the same monthly pull at their own stage of life, weighs it through the
 * same chooser and moves to a relative's place, else the state the
 * destination weighing ranks highest, else elsewhere in their state. Their ties are read
 * where they live (their household, partner and relatives there). A move
 * there is the same dated record, witnessed by their relatives in town; it
 * moves no money and fills nobody in (two-level population).
 */
~~~~

### src/core2/modules/national-events.ts · 5bca6557f68e

~~~~text
/**
 * What happens in the rest of the country, as results (Nation, Nov 8, 2026).
 * Natural hazards come from real recorded history keyed by place and season,
 * as world generation and not dice (owner, Oct 9, 1:55 p.m.,
 * docs/design/list-pick-inventory.md; CTO, Nov 8, 12:21 on #7365). FEMA's
 * declarations are the record, through October 9, 2026 (owner, Oct 16: both
 * FEMA's records and the world's own conditions; after the records end the
 * game keeps making its own weather). While the world's dates fall inside the
 * record, a game month has the real disasters of that month on their real
 * days, in the state each reached, with the counties it declared. After it, a
 * month's disasters come from the climate's hazard levels (the effect map's
 * `stateHazardRate`: each state's recorded declarations by hazard and season,
 * moved only by the warming, which moves only with the carbon laws): each
 * state and hazard keeps its exposure, the expected disasters so far, and a
 * disaster happens the month it has built up a whole one. Nothing is drawn
 * and nothing is typed; the same laws give the same disasters, and a world
 * with other laws differs by its exposures. The disaster's detail is a
 * recorded disaster of that state and hazard taken in turn
 * (SG-NATION-hazard-replay). Each disaster is one
 * result row on its day and a public `national.disaster` record for
 * national:<state>. The town's own disaster stays the disasters engine's
 * (`hazard.disaster`). Damage, aid, a declaration, the counties and the
 * households are built on open from the engines that hold the housing stock,
 * building codes and budgets in force (stopgap
 * SG-NATION-disaster-damage-from-causes).
 */
~~~~

### src/core2/modules/national-events.ts · 23bb06bf5eb9

~~~~text
/** The month's calendar: the disasters the world's own hazard levels give (owner, Nov 16: "disasters come from each world's own risks"). */
~~~~

### src/core2/modules/office-day.ts · 2a9ed60fdf46

~~~~text
/**
 * The officeholder's day (office play, OFFICE-LOCAL; one engine for every
 * level, `docs/packages/office-play.md`).
 *
 * - **The body's calendar.** Every local body covering the town (a council,
 *   a township board, a county board) meets on its own rule
 *   (`office-day-calendar.ts`): a date, an hour and a length.
 * - **The meeting.** Its agenda is the bills put before the body
 *   (`placeOnAgenda`). Public comment and each member's vote run through the
 *   legislature and meetings engines when an item is taken up.
 * - **Stops are chosen.** The player picks what stops them (`setStops`):
 *   by default a vote on their own bill, a bill on their desk, an emergency
 *   and election day. A meeting the player stops for holds the clock at its
 *   hour until they adjourn it (`takeUpItem`, `adjourn`); one they don't is
 *   held in the background.
 * - **Simulate or do.** Whatever the player does not decide, the character
 *   decides by the same rule every other member or executive uses: a member
 *   votes their own position, an executive signs or vetoes from theirs. The
 *   player never abstains because they looked away. Adjourn is the one press
 *   that casts their stated side or abstains (owner, Nov 13). Each such act is kept
 *   (`acts`) as the character's own, with its reasons.
 */
~~~~

### src/core2/modules/office-day.ts · 2228a3d6846d

~~~~text
/**
 * What can stop the player: the local kinds here, and whatever kinds the
 * other levels register (`office-day-registry.ts`). Election day always
 * stops them at the polls (the polling-place scene): whether the character
 * may not cast the player's ballot (owner, Oct 13).
 * An emergency stop waits on the disasters engine's declarations.
 */
~~~~

### src/core2/modules/office-day.ts · ce61f0cabf8e

~~~~text
// The important few stop by default (owner, Oct 14, 2026: play how you want).
~~~~

### src/core2/modules/office-day.ts · 848072b9d435

~~~~text
// Any vote where the player's seat could decide it (owner, Oct 29: "your
  // own bills, any vote where yours could decide it"): a meeting of a body
  // small enough that one seat turns a vote, with a bill on its agenda.
~~~~

### src/core2/modules/office-day.ts · ed85e0d33166

~~~~text
// Every meeting and every vote of the player's seat stops them, and the
  // desk does (owner's card, Nov 14, 2026, 02:03Z: "Stop me at every vote").
  // A stop the player switches off leaves them away: absent from that vote,
  // a bill on the desk waiting for them; nothing is cast or signed for them.
~~~~

### src/core2/modules/office-day.ts · dfaafd566897

~~~~text
/**
 * What each holder of an office had already given when the world opens (owner,
 * Nov 14, 2026: "the town must be in motion on day one"; skill
 * day-one-in-motion). A real office-holder is mid-cycle on any day: the last
 * office hours and the last town hall were some days ago, spread over the
 * custom's interval, and the yearly address was given in last year's season.
 * The holders are taken in id order and each is put a share of the way
 * through the interval (the first near the start of it, the last near the
 * end), so the town's holders are not all due on one day; nothing is drawn.
 * The rows are the office-day engine's own act rows, read as the date of the
 * latest act by what comes due (`dueOf`, the duty need, the address's
 * season), so a mayor played from day one finds office hours coming round
 * rather than all of them owed at once. Taken before the warm-up, so the
 * dates are the build date minus the offset.
 */
~~~~

### src/core2/modules/office-day.ts · 51bd1fc476c5

~~~~text
/**
 * The chair adjourns: each item left is voted on the position the player has
 * stated on it, and abstained where they have stated none (owner, Nov 13:
 * "Cast my position, else abstain"); the clock moves on. Every other member
 * votes their own position.
 */
~~~~

### src/core2/modules/office-day.ts · aa6d7940c68d

~~~~text
/**
 * Before any vote of a body the player sits on (owner's card, Nov 14, 2026,
 * 02:03Z: "Stop me at every vote"): nothing is cast in the player's name
 * unless they pressed for it. "Decide for me" at a held meeting casts the
 * member's own position; a player stopped for the vote who says nothing
 * abstains (the roll call's rule for a player with no cast vote); a player
 * whose stop for it was off was not there, and the roll records them absent.
 * The hook runs at the vote itself (committee-day.json keeps it off a
 * committee's day), so the floor is never voted a week early.
 */
~~~~

### src/core2/modules/offices.ts · fb843bbb5c27

~~~~text
// Another place's holder's earlier terms of the seat wait until they
      // are met or opened (owner, Nov 5: "generate on demand"; `openPastTerms`).
~~~~

### src/core2/modules/offices.ts · 4024b903f544

~~~~text
// One race per ticket (CTO line 6935893727): the President's term carries it.
~~~~

### src/core2/modules/offices.ts · e6ac332a893a

~~~~text
// No one first served younger than the minimum age. A career that age
  // would have started at the minimum itself (the age floor cutting a long
  // draw short) begins instead at the age the seat's holder first ran at: the
  // minimum plus a spread past it, drawn once per seat (who exists, not what
  // anyone decides), so first terms do not pile up at the minimum (owner's
  // playthrough, Nov 23, row C10: a mayor "elected at 21"). A career the
  // minimum did not cut is left as drawn.
~~~~

### src/core2/modules/offices.ts · b8e104eb3a9f

~~~~text
/**
 * The election that seated a term starting on a date: the general election
 * the November before a January start, else a local election some weeks
 * before. The winner's share is drawn once per seat and race from the
 * world's seed inside the spread for that kind of office (owner, Oct 27:
 * realistic, not real), so no two holders print the same share by rule.
 */
~~~~

### src/core2/modules/offices.ts · 8c62f3406140

~~~~text
/**
 * An engine that may offer a vacant seat, filled by appointment, to someone the appointing body does not
 * seat unasked: the player, who takes a seat only by their own choice (owner, Oct 14: the engine
 * offers, the player decides; Nov 16: "you can only be appointed to council, like the playable
 * offices"). True when it made an offer; the vacancy then waits on `answerVacancyOffer`.
 */
~~~~

### src/core2/modules/official-pay.ts · 20e91e906ae9

~~~~text
/**
 * An official of another state is counted, not paid person by person, until
 * the player knows them or they are in focus (owner, Nov 5: simulate from the
 * people there, keep only the result, generate on demand; the same people the
 * "why" records are kept for, `keepsWhy`). Their salary is still the seat's;
 * the pay row, post, living cost and monthly paycheck start the payday after
 * they are met, with no back pay. Federal officials and the player's own
 * state are paid from the start. stopgapId: SG-GOV-outside-officials-counted
 */
~~~~

### src/core2/modules/officials.ts · c0546599c340

~~~~text
/**
   * For another state's official (not the player's state, not federal): the
   * identity they are built from when something opens them. Until then they
   * are a recorded husk, not a full person (owner, Nov 5: simulate from the
   * people there, keep only the result, generate on demand).
   */
~~~~

### src/core2/modules/officials.ts · fb75a7a64a4a

~~~~text
/**
 * What another place's unopened holder stands on (their term names no
 * person and no official row is kept), from their draw. Their session reads
 * them through this, so other places keep only their results (owner, Oct
 * 11, two-level population; CTO, Nov 18 13:44Z).
 */
~~~~

### src/core2/modules/officials.ts · 198c038a92c9

~~~~text
/**
 * Another place's unopened holders live by the same mortality rule as
 * everyone: the health engine books their illness and death from who they
 * are (their term's birth date and home state, their draw's traits), and
 * their death writes only its result: the term ends and the seat falls
 * vacant, filled by the place's own law. Nobody is built (CTO, Nov 18
 * 15:04Z). Moves are not read for them: a husk never moved either.
 */
~~~~

### src/core2/modules/officials.ts · 8f08a12e52b0

~~~~text
// The world's own pick first; then everyone with a record the player can
  // weigh, strongest reasons first; newcomers only to make three (owner,
  // Nov 14: three or four to choose from).
~~~~

### src/core2/modules/parties.ts · 4864a7158d6f

~~~~text
// In a world whose day one is the century's, the parties are the century's, each at its share
  // of the state's last presidential count there (History family 9, PR 9c; CTO line 6935508228).
~~~~

### src/core2/modules/parties.ts · 437a637c374c

~~~~text
// The player's party is the player's to choose (owner, Nov 8: "it says
  // that I'm registered Democrat already"): they open with none.
~~~~

### src/core2/modules/partnerships.ts · 188e3342ab44

~~~~text
/**
 * Partnerships in play (owner, Nov 1, 2026: "EVERY. LIFE. IS. SIMULATED."):
 * people living elsewhere partner, marry and part. Once a month, on the 1st,
 * a single adult's pull to partner builds by the opening's own partnership
 * chain (src/core2/opening-partnership.ts: the place's ACS first-marriage pace
 * for the never married and NCFMR's remarriage pace for the previously
 * married, for single people of their age and sex), and a couple's pull to
 * part builds by NSFG's intact-marriage curve for how long they have been
 * together; each is moved by the person's traits' lean in its decision, and
 * a couple's by the hardship stress either partner carries (a layoff, an
 * eviction, a missed payment). Nothing scales the pace back to the chain's:
 * a place whose people lean against partnering partners less. A pull that
 * reaches one whole makes the change: never a roll.
 *
 * Every change goes through the core's one partnership writer
 * (`setPartnersV1`), which records the link, each person's dated fact and
 * the `family.partnered` or `family.separated` event, here with the union's
 * kind and their relatives in the played town as witnesses. Someone living
 * elsewhere knows nobody else full, so the partner they meet is generated:
 * who exists, seeded by the pair, aged by the CPS spouse age gap, of the other
 * sex (SG-LIVES-partner-same-sex), and moves into their home there. A couple
 * that parts splits: the one who did not keep the home starts one of their
 * own at the same place. Nothing moves money and nobody is filled in.
 *
 * The town's full people go through the same monthly review (owner, Nov 8,
 * 2026): a single adult's pull builds by the same chain; when it reaches one
 * they partner with a single adult they know (closeness, the CPS age gap),
 * else a partner from the wider population, and the couple climbs stages with
 * their own dates: dating in separate homes, moving in together (the one with
 * less cash moves into the other's household, so the lease, the share of the
 * everyday spending and the payers follow through `changeHouseholdV1`), a
 * proposal (`family.engaged`), the wedding (`family.married`), and, by the
 * same NSFG curve as anyone, parting (`family.separated`, the one with less
 * cash starting a household of their own). Traits move how soon each step
 * comes and how many partner. The counted population's partnerships
 * are their own unit (SG-LIVES-partner-counted).
 */
~~~~

### src/core2/modules/partnerships.ts · bc42fe0cd112

~~~~text
// The player's household changes only by their choice, never by the
  // engine's move-in or split (owner's playtest, Nov 8).
~~~~

### src/core2/modules/partnerships.ts · 24282443f7cc

~~~~text
// Living together changes the player's home, so the partner asks and
      // the player's answer in the scene decides (coordinator's ruling under
      // the owner's overnight say, Nov 14 2026, family life question 2).
~~~~

### src/core2/modules/people.ts · d7f1096fe749

~~~~text
/**
 * Pre-start people pass (M1-14): a full person's own dated records that fall
 * before day one (their birth, where their records put their parents that
 * day, and each dated past fact) are entered in the history, after the
 * moves into the county the moves engine's rule runs, so the world's
 * past can be read by record id, their working life is run through the
 * window (`past-work.ts`), and then the day each couple set up home together
 * (owner, Oct 28, 2026: who was in the household each year). Counted people
 * carry no individual past until they are filled in, and the records' own
 * sources are kept.
 */
~~~~

### src/core2/modules/people.ts · b156e86d233d

~~~~text
// The working life from school to day one is run, not copied (owner,
  // Oct 27, 2026: history before the start is simulated).
~~~~

### src/core2/modules/people.ts · 6d97687b2784

~~~~text
/**
 * A person's whole past, once (the owner's ruling, Nov 9, 2026: each person's
 * past covers their whole life, coarse, written only when they are opened or
 * met, a relative living elsewhere included): where they lived, their
 * schools and their working life from their birth to the day before the
 * world's opening, by the passes the run uses
 * with the person's own window. Moves first, since school and work are placed
 * by where they lived. Opening them again does nothing; the rows are the same
 * whenever and however a person is opened (the world's seed and the person's
 * records decide, nothing else).
 */
~~~~

### src/core2/modules/place-prices.ts · 8a22ea53c6b9

~~~~text
/**
 * The household goods table this world prices from. The published table (BLS
 * CES 2024, NTD 2023, ACS 2024, FHWA) is the center; each statistic is drawn
 * once per world from its seed (realistic, not real; owner, Oct 27). What law
 * sets, the fuel tax per gallon, stays as published.
 */
~~~~

### src/core2/modules/place-prices.ts · 9f1a22c66582

~~~~text
// The controlled person's money moves only by their own choice (owner,
      // Oct 14), and a dependent one (no job) pays nothing of the household's
      // bills: the household's price changes fall on the others.
~~~~

### src/core2/modules/press.ts · 1ca9f2a78504

~~~~text
/** Its owner: a person who holds it, and whose views and ties read into it. */
~~~~

### src/core2/modules/press.ts · bf59777480f3

~~~~text
/**
 * How many outlets of each kind this world's town has: the published level
 * moved by the world's own draw, rounded, and never below one where the
 * published count is at least one (owner, Oct 27: realistic, not real).
 */
~~~~

### src/core2/modules/press.ts · 7c0b6d252e60

~~~~text
// Every public record in the town's coverage goes on the wire, and the
    // police log's entries in the town (owner, Oct 29: side stories), which
    // the paper prints as briefs though the crime record itself is kept.
~~~~

### src/core2/modules/press.ts · add941beb8a2

~~~~text
// Owner, head and reporters know one another from the first day.
~~~~

### src/core2/modules/press.ts · aea6c84aa2e9

~~~~text
// An outlet's lean: its owner's, its head's, and its kind's audience's as
  // a whole.
~~~~

### src/core2/modules/press.ts · 2bae1b9bf481

~~~~text
/**
 * A magazine's profile: who it writes about is the person the fresh records
 * name most (ties to the outlet's own reporter's closeness, then id), not
 * profiled by it this year; how it reads is the story's framing (the owner's,
 * head's and reporter's regard and the outlet's line). Its readers' view of
 * the person moves toward the framing.
 */
~~~~

### src/core2/modules/press.ts · c21cc60ac1c9

~~~~text
/**
 * The school year's results reach the desk the week the school engine keeps
 * them (owner, Oct 29: side stories): how many of the town's seniors
 * graduated, and the spring tests' proficiency, one item each, worded from
 * the measure rows themselves (`graduation:<year>`, `tests:<year>`).
 */
~~~~

### src/core2/modules/press.ts · 9411ce3ebf8c

~~~~text
/**
 * The week's milestones, for the briefs column (words-paper-and-journal-
 * everyday-life; owner, Nov 1: "real ones with some good fluff"): a
 * resident of the town who retired this week (the jobs engine's record of
 * their leaving), one who reached a round birthday this week, and a
 * business in town that reached a round year since it was founded, each
 * from its own record's date (the person's birth date; the business
 * engine's founding row or its age at the opening). The round ages and
 * years are data (data/press/briefs.json, milestones).
 */
~~~~

### src/core2/modules/press.ts · 3c2a0d4c6d24

~~~~text
/**
 * The week's letters to the editor (words-paper-and-journal-everyday-life;
 * the CTO's ruling, OWNER-DECISIONS Nov 1 20:00). For each town newspaper,
 * the readers whose stance was last moved by one of its recent stories about
 * a bill or a law weigh writing to it: how strongly they feel past the
 * strength it takes to write (`letterStrength`), with their temperament at
 * its calibrated weight (the press.letter decision, Mondak and Halperin
 * 2008), never the stance alone. The paper prints the strongest case among
 * those who would write, one letter a week, and a writer whose letter ran
 * waits the span the paper's letters policy sets before another, and longer
 * before another on the same question. The letter
 * names the bill or law the story reported and whether the writer is for it.
 */
~~~~

### src/core2/modules/press.ts · 1f4416c0fd24

~~~~text
/**
 * The police log of the month that just closed reaches the desk in the next
 * month's first week (owner, Oct 29: side stories, "fourth car stolen"): the
 * crimes the town's residents reported to police, worded from the crime
 * engine's own month record (`police-log:<month>`). A month with none
 * reported puts nothing on the wire.
 */
~~~~

### src/core2/modules/press.ts · b4bfcd5c198a

~~~~text
/**
 * Why a town's police log for a crime month stood where it did on the page,
 * for dev mode's trace (owner, Nov 16: what a thread traces by script, dev
 * mode traces in the game): the month's reported count, the comparison the
 * wire carried (`policeLogComparison`), the closed months the usual rests
 * on, and the share of a brief's space the desk gave it (`usualSpace`).
 * Read from the crime engine's month rows; nothing is kept.
 */
~~~~

### src/core2/modules/press.ts · df61a483da9c

~~~~text
/*
 * What a paper found when it exposed an official (`press.exposed`),
 * read from the act's own record so the reporter who calls says what the
 * story says, not only that there is one (owner, Nov 15, on the scandal call:
 * "I've got a story about the water rates, and your name is in it... that's
 * very ambiguous"; Words lead's lines in reply-sets/oath-bribe-scandal.md C).
 *
 * - a bribe taken (corruption.ts crime record): who paid, and what the money
 *   was for, the bill or the contract award, read the same way the offer
 *   scene reads it (`wantedFacts`);
 * - a conflict on an award (contracts.ts award row, its conflict): the award
 *   by the work it pays for, the firm, and whose firm it is, the official's
 *   own or a relative's.
 */
~~~~

### src/core2/modules/promises.ts · 1fd245d3d6b6

~~~~text
/**
 * Promises kept, broken and remembered: the engine (owner, Nov 15, 2026:
 * "Okay, so promises. Yes, with your recommend": the promise record, its
 * settlement and the tie it moves are the simulation's; the director only
 * words it).
 *
 * A scene reply (or an answer that makes a broken promise right) that keeps
 * a promise names its kind and tie on its record (the director's
 * promiseReplyFacts). This module keeps one row for it, held by the one who
 * gave their word and owed to the other, filed under the records that would
 * settle it and the day its window closes, and ends it on the day that
 * record lands (a member's vote at the roll, a signature or veto, a missed
 * payment, a meeting held, a talk between the two) or its window closes. It
 * never scans: a settling record costs one set test and one index lookup,
 * and the end of each day one index lookup for the windows whose last day
 * it was (onAfterDay, after every record of the day, so a promise kept on
 * its last day is kept).
 *
 * Kept warms the tie once and broken cools it, through the core's writer,
 * citing the row; settled while the two were apart, the move waits for the
 * next time the one owed says it (`promiseSaid`). An answer to a broken
 * promise raised moves the tie by the answer's row (owning it, explaining,
 * denying). The kinds, windows and sizes are src/core2/data/promises/.
 */
~~~~

### src/core2/modules/public-action.ts · c6620e6cfa5e

~~~~text
/**
 * Public action (owner, Nov 8: "if you're having a good term except for
 * education, then you might get a strike... if the world is great, maybe
 * there's not a lot to react to, or you show up to a rally, or if it's bad,
 * you show up to a protest"). Each month, after the outcome web writes the
 * town's row, the town's term is read by area (src/core2/term-read.ts). A bad
 * slide feeds the town's organizing in that area and a good one its pride;
 * both fade a share each month, so a movement grows over a bad term and dies
 * after one that mends. The people each area touches (the school's staff, the
 * town's renters, the jobless, every resident) then each decide whether to
 * join, by the same resident's decision a residents' group uses
 * (`joinsGroup`: their view, whether it touches their own life, who they know
 * who is already in, and their traits). Two or more who join are an action: a
 * strike where the area's workers act, a protest where residents press a
 * demand, a rally where they gather to say the term is going well.
 *
 * What an action does: the people in it make their case on the area's policy
 * question to the officials who hold the town's seats, through the speech
 * engine, so the views engine moves each official by their standing with the
 * speaker, and the position they take at the next vote is the one their views
 * give. The player is never decided for: an action the player's own life is
 * touched by is left open for them (`playerTouched`), and the scene is theirs.
 *
 * The wider town's counted people are asked by the same decision, by their
 * count: the school's staff, the renters, the jobless and every counted
 * resident, each as many as their record stands for (one model, two tiers).
 */
~~~~

### src/core2/modules/school.ts · b3fe021e0b97

~~~~text
// The school years before the start, a year at a step (owner, Oct 28),
  // and for a named person filled in after the run.
~~~~

### src/core2/modules/serve-asks.ts · 51c7f2eb9d6f

~~~~text
/**
 * Asking someone to serve (brief J, Nov 14, 2026): the player asks a person
 * to take a seat the player fills (a running mate on their ticket, a town
 * department head as mayor or a cabinet member as governor; aides by the same
 * read later), and the person answers from their own record. Nothing is rolled: the answer is a sum of named terms
 * (`src/core2/data/serve/willingness.json`), yes where it is above zero, and the same
 * person asked on the same record gives the same answer.
 *
 * The ask is a scene: `askToServe` keeps the ask and emits `serve-asked`, the
 * director plays it as the player's ask (`ask-to-serve`), and only the
 * scene's ending seats anyone: a yes names the person through the seat's own
 * engine (`chooseRunningMate` for a ticket; the "name a department head" act
 * or `appointGovernor` for a post, with the council's or the chamber's
 * confirmation as before), a no is kept with its reason and date and the
 * seat stays open. A no stands for now (owner, Nov 14 05:17Z: "Yes, but ask
 * again later"): the player may ask again after `askAgain.days`, or sooner
 * once what the no rested on has changed on the record.
 *
 * One row per seat and person, written over when asked again: the table
 * holds at most the people offered for the player's own open seats.
 *
 * "Choose for me" (or a post left to the official's own choice) plays no
 * scene and seats the world's pick as before, and
 * the world's own picks do not read this willingness (pool item
 * world-picks-read-serve-willingness).
 */
~~~~

### src/core2/modules/serve-asks.ts · cd74dae92cd9

~~~~text
// Someone the player already asked stays on the list while their answer is
  // kept, even where the world's ranking has since moved past them, so a no
  // can be seen and asked again (owner, Nov 14 05:17Z). Bounded by the asks
  // kept for the seat.
~~~~

### src/core2/modules/speech.ts · 5aa582e65732

~~~~text
/**
 * Speeches (M4-04): reception and retelling. A speech is recorded as heard by
 * its audience; the views engine moves each listener's stance on its topic by
 * the speaker's standing with them (`standingWith`), and the drives engine
 * may turn it into a cause. Then each listener decides, through the core's one
 * chooser, whether to retell it at home, from how far it moved them, how
 * closely they follow politics and their temperament; a retelling reaches
 * their household and the ties they have outside it, and moves them the same way. A listener with nobody at home
 * or in their ties outside the audience has no one to tell and weighs nothing. The wording of the speech is GOV's (`giveSpeech`) and the English
 * engine's; this engine records who heard it and what it did.
 *
 * Word of what someone did spreads the same way (CTO, Nov 17: "word of what you did spreads
 * from the people who saw it"). An act on the list people talk about (`src/core2/data/speech/word-kinds.json`)
 * is weighed by each of those who saw it with the same choice, from how hard it struck them;
 * a retelling reaches the same people, and each hearer who believes it learns who told them
 * (`word:<event>:heardFrom`) and is a witness of it at one remove (`word.retold`), which the
 * drives engine reads as it reads the act. What a person knows of someone is what they saw
 * and what they were told: there is no reputation table.
 */
~~~~

### src/core2/modules/speech.ts · 74b21c35fc49

~~~~text
// Level of detail (owner, Nov 9): in a world candidate's speech, hearers
  // nobody watches are applied once per group of like hearers; the rest hear
  // it as people.
~~~~

### src/core2/modules/speech.ts · d87985ff3c9a

~~~~text
/**
 * A speech's retellings are kept as rows for speechRetellingKeptDays, then
 * dropped (owner, Oct 29: old records fold into summaries): nothing in play
 * reads a retelling after the speech's own day; what a hearer was told of an
 * act stays in their knowledge (`heardFrom`). The speech's address row stays,
 * since a speaker's addresses are counted (`addressesGivenBy`). Each day looks
 * up only the retellings weighed that many days before, by date.
 */
~~~~

### src/core2/modules/staff.ts · ae0d12ba1f93

~~~~text
/**
   * Why this person was the hire, by part: how well they'd do the work, how
   * far they live within reach of the office, their age's place in the
   * working-age pool, knowing the official, and a family tie (a reason the
   * press and views can read; family ties are allowed, owner Oct 14).
   */
~~~~

### src/core2/modules/staff.ts · c2546dfbd87f

~~~~text
/** The aide this hire replaces, who died or left the post (owner, Oct 14: every role is refilled). */
~~~~

### src/core2/modules/staff.ts · 0c2c33a150d3

~~~~text
/**
 * Where the official's office sits, from the records: a state (or federal)
 * office at its government's seat (the capital's place, owner, Oct 14); a
 * town or county office in the town.
 */
~~~~

### src/core2/modules/staff.ts · c1b71cb3654c

~~~~text
// The person the player controls is never hired by the engine's choice
    // (owner, Oct 14: the engine offers, the player decides).
~~~~

### src/core2/modules/staff.ts · 95e6520e2fc2

~~~~text
/**
 * An office that sits outside the town draws applicants from where it sits
 * (owner, Oct 14). That place's people aren't modeled, so one applicant is
 * drawn from the world's seed and the office, the way officials outside the
 * town are: the same person every time, a record only once hired, at the
 * calendar cadence of people outside the town (registered stopgap).
 */
~~~~

### src/core2/modules/views.ts · 866eddc96fff

~~~~text
/**
 * A move of a person's opening lean by an event in their own past (the
 * owner, Nov 12: a father's lost job "could have turned you super MAGA, or
 * it could have turned you liberal"), by the record that holds the event.
 */
~~~~

### src/core2/modules/views.ts · 41f68bc04857

~~~~text
/**
 * How what a person lived through before the start moved their view (part
 * 14; the owner, Nov 12, either way). Two events are read, each from its
 * work-spell record:
 * - A parent laid off while the person was a child. The person moves toward
 *   that parent's view, or away from it, by their own traits (the shared
 *   decision `views.parent-hardship`); further the more the parent follows
 *   politics, since children take on their parents' views more "if the
 *   family is highly politicized" (Jennings, Stoker and Bowers 2009).
 * - Their own layoff as an adult, which moved them toward more support for
 *   welfare spending, "appreciably larger among Republicans", and "short
 *   lived, dissipating as individuals' employment situations improved"
 *   (Margalit 2013): leftward on average, more for those who lean right,
 *   fading with the years back at work; rightward for someone whose traits
 *   lean to blaming outsiders (the shared decision `views.own-layoff`).
 * Each shift keeps its record, so the view's why names the event.
 */
~~~~

### src/core2/modules/views.ts · d895a0d732df

~~~~text
/**
 * The shift a person took as one of a group of like hearers nobody watches
 * (`hearAsGroups`, owner's level of detail, Nov 9): the group's stance on the
 * question, read by the group the person was first heard in. Zero for anyone
 * never heard as a group. One row read for the membership, one for the stance.
 */
~~~~

### src/core2/modules/views.ts · 60763a2ea3c2

~~~~text
// Knowing is a read (owner, Oct 14, 2026): an event citing a law, a
      // vote or a bill moves a stance only for someone who learned of it,
      // from the case made to them or from a record they hold (a story they
      // heard, a notice), and the stance cites how they learned.
~~~~

### src/core2/modules/voting.ts · 00dc6d87e81c

~~~~text
/**
   * Each record's voters for each candidate before turnout, in field order:
   * its unpledged weight divided by the race's rule (`countedShareRule`: each
   * candidate's share of their appeal without party labels, whole to the
   * first with them), plus a pledged household's whole vote
   * (`countedDivision`; CTO, Nov 1). The count is each row times the
   * record's turnout (`voted`), all of it times the share of the town's
   * people who may vote (`countedScale`: citizens, less those barred for a
   * felony conviction).
   */
~~~~

### src/core2/modules/voting.ts · dfbc69312bfd

~~~~text
/**
 * The signatures a petition needs in this world: the number the race's own
 * law sets for the race's own electorate (owner, Nov 14). A town race reads
 * the town's voters, and its petition asks no more names than the town has.
 * A county, district, state or federal race reads its whole electorate
 * (`wideElectorate`): the law's count, or its formula computed from those
 * voters (the votes the world recorded for the office, else the two-party
 * votes the race's places last cast), gathered in the town and, outside it,
 * by the campaign's paid circulators (`circulatorShift`).
 */
~~~~

### src/core2/modules/voting.ts · fc26d47b8ad3

~~~~text
/**
 * How far something heavy the voter learned since their "yes" at the door
 * undoes it, 0 to 1, read from their own records (owner, Oct 29: near-binding
 * unless something heavy changes their mind): a scandal story about the
 * candidate that reached them after they said it, by how far they trust the
 * press; a rival in the race they are closer to than the candidate; and the
 * candidate's promises they heard made that the candidate's votes have broken
 * since. Each slides; none flips.
 */
~~~~

### src/core2/modules/voting.ts · c26c9ea2e5ab

~~~~text
/**
 * How a counted record's voters divide (one model, two tiers): the record
 * stands for `weight` different residents, so its unpledged voters split by
 * the race's rule (`shares`, from `countedShareRule` once per count; CTO,
 * Nov 1): each candidate's share of their appeal on a ballot without party
 * labels, whole to the first on one with them. A door reaches one household,
 * never the whole record, and its "yes" is near-binding (owner, Oct 29):
 * that household votes whole on its word (first place, `countedChoice`), and
 * where the record stands for several, the others split as they would have
 * without it. A word that something heavy has wholly undone (nothing of it
 * still holds) binds no one: that household divides with the rest.
 */
~~~~

### src/core2/modules/voting.ts · 6b471b01db1b

~~~~text
// The wider electorate sees the field as the town's counted voters do: the
  // candidates' public standing, the incumbent's name and record, and their
  // places on the ballot (CTO, Oct 14: a race is never left blank by most
  // voters for want of a platform to tell candidates apart).
~~~~

### src/core2/modules/voting.ts · 505c3d005c0b

~~~~text
/**
 * A count's margin against the place's recount rule (owner, Nov 10, 2026:
 * "Recount by own states rules"): inside the automatic margin a recount
 * opens by itself; inside the margin a candidate may ask in, the candidate
 * behind decides from their own traits and how close it was, and the player
 * is offered the choice on election night. No roll.
 */
~~~~

### src/core2/modules/voting.ts · b054192e84c8

~~~~text
/**
 * Keep results, not their history (owner, Oct 7, Nov 5, Nov 8): a race's
 * counted ballots (every counted voter's turnout, split and reasons) are
 * read only by the "why did this resident vote so" lookups (`countedBallotOf`,
 * `countedBallotsOf`); the race's result, returns and the named voters'
 * ballots stay. In play, when a new race's counted ballots are kept, those
 * of races more than countedBallotRetentionDays past go. Kept, they were
 * 80 MB in 45 rows at Montpelier, Vermont, year 4 (Nov 9, 2026). With
 * bookkeeping on (tests, proofs) every row stays.
 */
~~~~

### src/core2/modules/voting.ts · 02e61876f475

~~~~text
/**
 * A race the town doesn't vote in, by its id: its row, or, once folded, its
 * entry in its seat's newest race row (OWNER-DECISIONS, Nov 1 23:40: a folded
 * race is found by its id inside its seat's summary).
 */
~~~~

### src/core2/modules/voting.ts · b3b57fde87b9

~~~~text
/** How many people of their party a player running for governor chooses a running mate from (owner, Nov 14). */
~~~~

### src/core2/modules/voting.ts · d9c44ed7965c

~~~~text
/**
 * A governor candidate's ticket, as their campaign shows it: the ticket
 * office's contest, the running mate once named, and, while the candidate
 * may still name one (the player, from filing where the state's law joins
 * the ticket then, else from the primary), the people of their party the
 * world's own pick ranks, strongest first (owner, Nov 14: the player picks,
 * or "Choose for me" takes the world's pick). Null where the governor's
 * state elects no office on the ticket.
 */
~~~~

### src/core2/modules/world-legislating.ts · 997cc401dc64

~~~~text
// Another state's session keeps only its results and is generated on
    // demand (owner, Nov 5): nothing about it is read at the opening, so its
    // legislators stay named officials on their term rows, seated by no one
    // (the CTO's ruling of Nov 17). Its calendar entry opens it later.
~~~~

### src/core2/modules/world-legislating.ts · 2d403361578f

~~~~text
/**
 * How the law on a question stands, for anyone weighing a change to it: how
 * settled it is (-1 passed today, 1 long standing) and, for a change that
 * would reverse the latest law, the body's reluctance to undo it, larger the
 * fresher it is and the wider it passed (owner, Oct 14: no body's rules are
 * in data, so a sliding reluctance from recency and margin; no fixed cooldown).
 */
~~~~

### src/core2/modules/world-legislating.ts · 98b2fba9f9b9

~~~~text
// Another government's session is simulated from its people and keeps only
  // its results (owner, Nov 5: "generate on demand").
~~~~

### src/core2/modules/world-legislating.ts · ba29dedf2642

~~~~text
// Its members are read as they are kept: nobody is made a person or
    // given an official row for a session the player never opens (CTO,
    // Nov 18 13:44Z); `officialStance` reads an unopened one's draw.
~~~~

### src/core2/modules/world-metrics.ts · d56e0f55cc3d

~~~~text
// The year opens with what the engines hold on the first day, so a
    // figure is on screen before the first monthly row (owner, Nov 5: the
    // Metrics tab is never blank). No year before it is written: nothing
    // kept one.
~~~~

### src/core2/modules/world-panels.ts · cde73c773ee9

~~~~text
/** Each business's owner, their draws from profit, and every founding and new location with its reasons. */
~~~~

### src/core2/office-day-federal.ts · 47b5eb37eea6

~~~~text
/**
 * The evening before a floor vote, for the member the player controls: at
 * home in the district, they miss it (the roll records them absent);
 * the whip of their party asks if they stand against the party leader; and
 * the vote stops them when its kind does (their own bill by default, any
 * every vote by default). With that stop off they are not on the floor and
 * the roll records them absent; stopped and silent, they abstain. Nothing is
 * cast in their name (owner's card, Nov 14, 2026, 02:03Z).
 */
~~~~

### src/core2/office-day-state.ts · f94dc8157e97

~~~~text
// Another state's governor keeps only the result (owner, Nov 5, 12:49
      // p.m. Eastern, OWNER-DECISIONS.md: for a government outside the
      // player's own chain, simulate from the people there and keep the
      // result): the address and the stances said stay on this entry's
      // result row, and no speech is delivered to a full audience. The
      // player's own state's governor is in the chain and speaks to it.
~~~~

### src/core2/offices-past-results.ts · c4712a7fb69d

~~~~text
/** The race's real result in this world (owner: recognizable with drift), or null where the research does not have it. */
~~~~

### src/core2/opening-county-sample.ts · 59ebb852c030

~~~~text
/**
 * The county's counted households at the opening (CTO, Nov 8, on #7365: "a
 * county gets its own counted sample in the one store, weighted to its real
 * count, built at the opening like the town's"). The households are drawn
 * the way the town's are (the Census household mix, the invented-person age
 * table, the name corpus, the opening temperaments), placed at the county's
 * own place, and every record stands for as many real households as the
 * county's eligible voters ask for (`ResidentsInput.weights`). Working adults
 * hold the county's employment: how many of each age work is the county's
 * ACS rate, and the sector they work in follows the county's Census County
 * Business Patterns employment, in groups the size of a workgroup.
 */
~~~~

### src/core2/opening-employment.ts · 6d9f3dd3ee66

~~~~text
/**
 * The share of an age band employed in a county in this world: the published
 * share (ACS county table, else the national CPS share) moved once by the
 * world's own offset, relative to its nearer bound (owner, Oct 27: realistic,
 * not real). Play reads this; `publishedResidentEmploymentRate` is calibration.
 */
~~~~

### src/core2/opening-income.ts · d2644caadbca

~~~~text
/**
 * The average monthly Social Security benefit this world's participants draw:
 * the published participant average, scaled by one benefit level drawn per
 * world from its seed (realistic, not real; owner, Oct 27). The formula and
 * the cost-of-living adjustment are law and are not touched.
 */
~~~~

### src/core2/opening-key-people.ts · b0c84e65c3bc

~~~~text
/**
 * The opening's key people (owner ruling, Oct 15, 2026, afternoon): the
 * president and vice president; the state's legislators; the most powerful
 * person in each chamber; and the player's own representatives. One list,
 * read by the opening story and the Politics screen, from the offices and
 * leadership records. No pick is made here: who is key follows from the
 * offices and from who holds the post that rules each chamber.
 */
~~~~

### src/core2/opening-key-people.ts · 7184290f2d80

~~~~text
// The President and Vice President are known to everyone, including a
  // territory's town whose voters do not choose them (owner ruling, Oct 19).
~~~~

### src/core2/opening-kin.ts · e8325e90f845

~~~~text
// No two relatives share a full name (owner, Nov 16: partner and sister
    // were both "Ashley Lucas"): a name already carried by someone in this
    // household or its kin is drawn again with that given name taken.
~~~~

### src/core2/opening-kin.ts · 9ca7c749a67d

~~~~text
// Parents still married live together as partners, so the engines
      // that read couples (moves, births) see them as one (every life is
      // simulated, owner, Nov 1).
~~~~

### src/core2/opening-origin.ts · 1a7bf0ce808b

~~~~text
/**
 * Where a person's family comes from (owner's playtest, Nov 8: "I'm Mexican
 * and my son is white"). One origin per household at the opening, drawn from
 * the town's own residents by race and Hispanic origin (2020 Census place
 * counts, `place-race-origin.generated.ts`) where the town has a row, else
 * the state's adults (Census CPS, Nov 2024 voting supplement, table 4b),
 * kept on the person's `looks.origin`;
 * everyone in a household shares it, and kin inherit a resident relative's.
 * A child born in play takes a parent's (`childOrigin`). The faces read it
 * (`bench/whole-figures.ts`), so a family looks related. Nothing else reads
 * it: names decide nothing (Sept 26), and no outcome depends on it.
 */
~~~~

### src/core2/opening-private-tuition.ts · 7e9090c27b6a

~~~~text
/**
 * The private share of students in this world's state: the published NCES
 * share drawn once per world from its seed, kept between 0 and 1 (realistic,
 * not real; owner, Oct 27).
 */
~~~~

### src/core2/opening-ties.ts · 17debd3ceba1

~~~~text
/**
 * Whom a counted person knows when they are filled in (CTO, Nov 8, on #7365):
 * the neighbors their years in one place have given them, and their
 * workgroup at a sampled county employer. Both come from the other counted
 * households of their place; the ones named become husks (met and filled in
 * later) exactly as any tie to a counted person does. Who is chosen is
 * seeded by the pair (generation of who exists), how many by the person's
 * years in place and the estimated neighbors-known curve; the same person
 * returns the same ties every time.
 */
~~~~

### src/core2/opening-town-jobs.ts · a98482700f9f

~~~~text
/**
 * The town's mix as its written employers can hold it. A sourced-only kind
 * the town has no institution for (a hospital, a bank) gives its share to the
 * other workplaces of its own sector in their shares (a hospital's to the
 * clinic and the care home, a bank's to the insurance agency); with none, the
 * share leaves the mix and every other kind takes it in proportion. Never into
 * whichever kind is next in line, which filled towns with stores, kitchens
 * and warehouses (owner, Nov 12: "only the market and like craft shops").
 */
~~~~

### src/core2/opening-upbringing.ts · eec79a3241bd

~~~~text
/**
 * The opening's upbringing projection: a resident's first trait values from
 * what the opening's draft records about their household, nothing drawn.
 *
 * Ported from the old engine's `people-upbringing.ts` and `people-traits.ts`
 * as the opening reached them. The opening's draft holds people, households,
 * memberships, kinships and partnerships, and the jobs just written; it holds
 * no pay, schooling, moves, deaths, congregations or childhood records, so
 * every branch of the old projection that read those is constant here and is
 * not carried over: money is always the national child distribution's stable
 * sample for the person, caregiving is always the household's estimate, and
 * disruption, events, schooling and first jobs are always empty. What varies
 * by person, and is reproduced exactly: the recorded parents, the household's
 * adults, the sibling count (recorded for a child with parents, else the
 * national distribution's stable sample), the family pattern a grown resident
 * is matched to among the town's recorded families, and the money levels.
 *
 * Every trait value this writes is read in play by the people engine; the
 * history that is to run from the player's birth year (owner, Oct 28)
 * replaces this estimate with recorded childhoods when it lands.
 */
~~~~

### src/core2/outcome-web-model.ts · ba4518bdec66

~~~~text
/**
 * A kept outcome's starting level in a state in this world: the published
 * level (`publishedBaseOf`) moved once by the world's own offset, drawn from
 * its seed (owner, Oct 27: realistic, not real). A rate in law and an index
 * that starts at 100 keep their level. A percent moves relative to its nearer
 * bound, so it stays between 0 and 100.
 */
~~~~

### src/core2/output-numbers.ts · 6adf2b0a9596

~~~~text
/**
 * A year of the place's past, written by an engine's pre-start pass from its
 * own history (owner, Nov 13, 2026: the past is simulated so the present
 * makes sense): the figures it read on `date`, by registered number id, into
 * the place's year row, with the history record kept beside each figure for
 * dev mode's Trace. A year before the world's start is closed; the start
 * year's row is the one play folds its months into. Other engines' figures
 * already on the row are kept. The row names the figures the passes wrote
 * (`pastFields`, on a closed past year only): there any other figure is
 * unknown, never zero, because no pass ran it (eviction notices are not
 * simulated before the start).
 */
~~~~

### src/core2/past-business.ts · 17585efd5d74

~~~~text
/**
 * Business closures in the year before day one: the
 * town's businesses start on day one, so the past carries the ones that
 * closed first, as records with a kind, a name, a former owner, the workers
 * and a date, for the news archive and for the people they touched.
 *
 * How many: the state's yearly exit share (BDS, the business engine's own
 * figure) of the town's businesses is the expected total, which only sizes the
 * year and is capped by the owners who could have retired. Which kinds: the
 * town's kinds in proportion to how many it has now (largest remainder, kinds
 * in id order). Who: the owner's age pull toward closing is the business
 * engine's (`businessCloseAgeWeight` past `jobsEarliestRetirementAge`), so
 * the former owner is the living resident furthest past that age who owns no
 * business now, and the recorded reason is the engine's own "retiring". No
 * roll decides any of it. Dates follow the same order: the closures are spaced
 * through the year, the owner furthest past retirement first.
 */
~~~~

### src/core2/past-elections.ts · a3e4ec8b814d

~~~~text
/**
 * Elections happened (owner, Oct 14, 2026): the election that seated each
 * day-one officeholder of every office covering the town.
 *
 * Each is a result record with the winner (the holder) and the strongest
 * challenger, their votes and shares, turnout, and the town's voter groups'
 * split. Real anchors hold where the research has them: the November 2024
 * presidential and House results and each senator's last election (Clerk of
 * the House), drifted a little per world. Elsewhere the winner's share sits
 * inside the tenure table's spread for that kind of office, and the ballots
 * come from the state's 2024 presidential total, the county's, or the town's
 * voter groups, scaled for a midterm or a local election.
 *
 * Each group's share for the winner follows its lean against the two
 * candidates' (no group is assigned a vote), centered so a town-wide race
 * adds up to its share. Each winner's campaign promises, on the questions
 * they stand on most strongly, go to the campaigns engine's promise table,
 * where the record engine marks them kept or broken by the prior term's votes
 * and the voting engine weighs them.
 */
~~~~

### src/core2/past-elections.ts · c0fa01ddb58c

~~~~text
// This world's votes cast (realistic, not real; owner, Oct 27): the
        // recorded or estimated total moved once by the world's offset.
~~~~

### src/core2/past-health.ts · a696305b5fda

~~~~text
/**
 * The life record, part 6 (owner, Nov 8, 2026: "a girlfriend or a car
 * accident"): a serious illness or injury before the start, told as a night
 * in hospital, written when a person is opened. Each year from the adult age
 * to the start, the share of adults their age with an overnight hospital stay
 * (NHIS 2018, Table P-10a, less childbirth stays) builds a pull against their
 * own seeded line; a pull that reaches it is a stay, and a new line begins.
 * The most recent stay is told, with how many there were. Seeded generation
 * of what happened to them before the world opened; no roll decides what
 * anyone does, and no pregnancy is told (owner, Oct 20).
 */
~~~~

### src/core2/past-history.ts · 9267f8e4c026

~~~~text
/**
 * The one history reader (owner, Nov 25, 2026: "THE JOURNAL, DIRECTOR, PERSON
 * CARDS, ETC ALL PULL FROM THE SAME HISTORY. STOP MAKING NEW SYSTEMS FOR NEW
 * THINGS WHEN THEY ALL USE THE SAME THING"; "make the history reader work
 * game wide. so ALL systems are reading the same thing").
 *
 * It keeps nothing. What already happened is in the records the engines
 * wrote: the pre-start history (src/core2/pre-start.ts), the durable log, a
 * person's own life (`lifeOf`, src/core2/person-life.ts) and the tables an
 * engine keeps of what it did (a job change, a term, the century's races).
 * Each engine that keeps such a table hands it here as its module's
 * `history` source, so this family imports none of them. Any reader,
 * for a person, a household, an employer, a place, a state or the nation,
 * gets the same events from the same records, each with its record id, its
 * date, the records that caused it and the records it led to. A screen or a
 * scene words them differently; none of them builds its own past.
 */
~~~~

### src/core2/past-justice.ts · 453ac3898a90

~~~~text
// The player is run by the same rule as everyone (owner, Nov 12, 2026,
    // 6:33 p.m.); choosing a past through scenes comes after early access.
~~~~

### src/core2/past-laws.ts · 0c0a3f27ce09

~~~~text
/**
 * Laws have histories, and officeholders have records (owner, Oct 14, 2026).
 *
 * Prior term: each chamber covering the town recorded votes on contested
 * questions in the years before day one: the questions its members ran on
 * first, then the bill catalog's for its level. Each bill's sponsor is the
 * member standing most strongly on it then; each member's vote follows their
 * own stance; a seat its holder didn't yet hold votes by the seat's lean.
 * Votes go to the record engine's table, which the voting engine weighs and
 * which marks the members' campaign promises kept or broken.
 *
 * Laws in force: every law row gets a history. Rows that take effect
 * together (one series' tiers, one date) are one enactment. It was passed
 * before its effective date by the enactment lag; a law the research records
 * only as in force at the opening was passed some years before. Its roll
 * call is the members who served then voting their stance, the rest of the
 * seats generated predecessors; a law the current members serving then would
 * have voted down was passed before they took their seats. The sponsor is the
 * strongest yes voter, the signer the executive who held office then, and
 * each phase points at the one it amends.
 */
~~~~

### src/core2/past-laws.ts · 494d9fb1404e

~~~~text
// A policy question's law in a century world is the century's record (its session, its
      // chambers' counts); one no session enacted has no history (CTO line 6935086070 on #9747).
~~~~

### src/core2/past-module.ts · 2e711077e217

~~~~text
/**
 * The world has a past (owner, Oct 14, 2026): the records of what happened
 * before day one, kept in one module so other engines read them by id.
 *
 * - `laws`: each law row's history (enactment, body, session, roll call,
 *   sponsor, signer, amendments), keyed `law-history:<law row id>`.
 * - `elections`: the election that seated each officeholder, with both
 *   candidates, the votes, turnout and the town's voter groups' split.
 * - `figures`: what the public knows about each public figure: office,
 *   positions, record, prior election and the reputation a public sees.
 * - `closures`: each business that closed in the year before day one, by the
 *   id its archive story cites.
 *
 * The votes themselves go to the record engine's table and the promises to
 * the campaigns engine's, where voting reads them; the archive goes to the
 * news engine's stories. Nothing here is decided in play: who existed and
 * what happened is generated once from the world's seed, and every choice in
 * it (a vote, a split) follows a person's or group's recorded lean.
 */
~~~~

### src/core2/past-moves.ts · ab7796c90af4

~~~~text
/**
 * Moves before the start (owner, Oct 28, 2026: "simulate to the birth
 * year... general to make the game flow"; pool item history-past-moves).
 * Whether a full adult came to the county is read from their records: a
 * parent living outside it, else a recorded birthplace outside it. When they
 * came is run by the moves engine's own rule, a year at a step: from the
 * year they were grown, their pull to leave where they were builds by the
 * share of people their age in their state who leave a county in a year
 * (ACS 2024, the moves engine's own rate, handed in by the people engine),
 * held back while
 * they have children at home, and they move on the day it reaches one whole
 * move (`movesStayPull`). Someone whose pull would not reach it before the
 * start came in the run's last year. No roll decides anything. Their
 * children at home born by then come with them.
 *
 * `residenceOn` is the one reader of where a full person lived on a day
 * before the start: the school engine's run, the working-life run and the
 * people engine's births and partnerships read it.
 */
~~~~

### src/core2/past-moves.ts · 860c40c28c4d

~~~~text
// A renter's pull builds faster than an owner's (the owner hold).
~~~~

### src/core2/past-moves.ts · 328ab5a89894

~~~~text
// A renter moves more often than an owner (the owner hold).
~~~~

### src/core2/past-moves.ts · 04e4f6408789

~~~~text
/**
 * A person's moves into the county over their own life, once (the owner's
 * ruling, Nov 9, 2026): a move before the world's window is kept, and one
 * the pre-start run already wrote stays as it is.
 */
~~~~

### src/core2/past-news.ts · e889e8f244a6

~~~~text
/**
 * News has an archive (owner, Oct 14, 2026): the year before day one, as the
 * news engine's own stories, so the news screen and bring-it-up are not
 * empty on day one and a person can have heard of something.
 *
 * Stories come from the past's records: each prior election decided in the
 * year, each law passed or taking effect in it, each recorded vote of a body
 * covering the town, each budget that began in it, each business of the town
 * that closed in it, and each parent of a resident who died in it. The press
 * engine writes every one of them (its outlet, its framing and the record's
 * facts), as the town's own paper.
 *
 * Who heard: the news engine's own delivery rule. A full resident hears a
 * story after a delay set by how closely they follow politics and how much
 * they trust the media, and never once the delay passes the story's life.
 * A story they would hear after day one is put on the engine's delivery
 * calendar for that day. Nobody too young to follow the news hears it.
 */
~~~~

### src/core2/past-partners.ts · 624fafada795

~~~~text
/**
 * The life record, part 6 (owner, Nov 8, 2026: "None of my history is
 * simulated... a girlfriend or a car accident"): an earlier partnership that
 * ended before the start, written when a person is opened. No new rates: the
 * opening's own chain of partnering (`partneringPerYear`: first marriage by
 * the place's ACS never-married shares, remarriage by NCFMR) and of parting
 * (`separatingPerYear`, NSFG) with widowhood by the SSA 2023 life table at the
 * partner's age (the CPS spouse age gap, `partnerAgeFor`), read year by year
 * against the person's own seeded lines, as the moves engine and the opening
 * kin read leaving against theirs. Seeded generation of who existed in their
 * past; no roll decides what anyone does.
 *
 * Only what agrees with the person's records is written: a partnership the
 * chain ends before their present one began (or before today, where they live
 * alone). Someone the chain still has together while their records say they
 * are single is left as the records say. The earlier partner is a name and a
 * birth year on the record, never a full person until met.
 */
~~~~

### src/core2/past-public.ts · 9007c115e7fd

~~~~text
/**
 * Public figures are known (owner, Oct 14, 2026): everyone knows what the
 * public knows about the president, the vice president, their governor,
 * their members of Congress and their mayor, distinct from having met them.
 *
 * Each figure gets one record of what the public knows: the office and when
 * they took it, their stated positions (their own causes first), their
 * record on day one (votes, laws sponsored and signed), the election that
 * seated them and their campaign promises, and their reputation: the traits a
 * public sees, furthest from the middle first. Internals stay internal.
 *
 * Knowledge records: each full person the figure's office covers, old enough
 * to follow public life, holds the figure's name, public role and a pointer to
 * the record, with access "public" and learned when the figure took office or
 * the person came of age for it, and the campaigns engine's impression of a
 * voter who has heard of them and knows where they stand (warmth unmoved),
 * which the voting engine reads to weigh their record. Knowing a figure this
 * way never adds them to the people a person has met. A promise counts with a voter only when they
 * heard it made (the record engine), so each covered person who would have
 * heard the campaign by the news engine's rule holds the promise too.
 */
~~~~

### src/core2/past-school.ts · 132056a68961

~~~~text
/**
 * The school years (owner, Oct 28, 2026: "simulate to the birth year...
 * general to make the game flow"): the one school calendar every child
 * shares, the school engine's rule for which school a child of a place
 * attends, its run of the years before the start, and the reader every
 * screen and scene uses for where a person went to school.
 */
~~~~

### src/core2/past-school.ts · aa9593e282ba

~~~~text
/**
 * The school years before the start (owner, Oct 28, 2026: "simulate to the
 * birth year... general"), a year at a step: each school year a full person
 * was of school age inside the run, they attended the school this engine
 * gives a child of the place they lived that year (`schoolOfPlace`, the same
 * rule as a school day in play), at the stage the one school calendar puts
 * them in. A record is written when the stage or the school changes: the
 * first year at each school. Nothing is drawn.
 */
~~~~

### src/core2/past-school.ts · 05b0a2b21e37

~~~~text
/**
 * A person's school years over their own life, once (the owner's ruling,
 * Nov 9, 2026): the same rule as the run, over the window from their birth.
 * A full person's clipped records are restated, not kept beside it.
 */
~~~~

### src/core2/past-work.ts · 1e0d9004226d

~~~~text
/**
 * The working life before the start (history-past-work; owner, Oct 27, 2026:
 * "fix history not simulating before 2025"). Every full adult's work from
 * leaving school to day one runs through the pre-start window quarter by
 * quarter, by the same decisions the jobs engine makes in play: an employer
 * keeps or lets go by how they work (`jobs.value-worker`), a worker looks
 * around by their lean toward looking (`jobs.review-worker`), and someone out
 * of work finds a job by their lean toward applying (`jobs.apply`). Each
 * quarter's pull comes from the economy pass's own month
 * (`economy.conditions`): layoffs rise as unemployment rises, quits fall and
 * finding work slows as it stays high. No roll decides anything: a pull adds
 * up quarter by quarter and the separation or hire happens on the day it
 * reaches one whole event, so the same person in the same economy has the
 * same life, and a different town or seed has different people and firms.
 *
 * The run ends in the opening as it stands: the job held on day one began on
 * its own recorded date, and someone jobless on day one stopped working on a
 * date their own records give (a child's birth, a retirement claim) or, if
 * none does, as long ago as their own pull toward finding work says they
 * would still be looking. Past jobs are at the businesses of the person's
 * town that were open by then (the business pass's founding dates), each
 * hire taking the employer with the most openings left that quarter.
 * Records name only full people; a person filled in later gets theirs then
 * (`pastWorkFor`), read against the openings the full people left.
 */
~~~~

### src/core2/past-work.ts · 2787cd94a549

~~~~text
// An employer named for a place the world keeps none for is a record of
  // that place from the day a spell names it (owner, Nov 16: every named thing
  // is a record): its kind and its place, no cash of its own.
~~~~

### src/core2/past.ts · 4a694cdba2f8

~~~~text
/**
 * The world has a past (owner, Oct 14, 2026). Opened once the government
 * modules have seated the day-one officeholders and loaded the law in force,
 * and before the story director starts: the prior elections and the winners'
 * promises, the prior term's votes, every law's history, the year's business closures, the news
 * archive and what the public knows about its figures, in that order, since
 * each reads the one before.
 */
~~~~

### src/core2/person-work.ts · 0de21c7b0f52

~~~~text
/**
 * What a person does, from the two records that say it: the job they hold
 * (the jobs table) and each office they serve in (the offices engine's
 * serving terms). One reader for every screen that tells it: the person card,
 * the journal and Travel (pool item
 * play-a-relatives-card-and-journal-disagree-on-her-job; owner, Oct 28: "It's
 * just different ways of displaying the same information"). A public office
 * whose seat is also the person's job (a full-time county commissioner) is one
 * thing, told as the office; a part-time office beside an ordinary job is
 * two, and both are told.
 */
~~~~

### src/core2/place-leans.ts · 375cd520b1c0

~~~~text
/**
 * Where each counted place's people stand, carried forward (calibration audit, family 6;
 * CTO, Nov 17, 02:49Z). A place's lean is its right share with nothing at stake. It is
 * kept here, one row a place, and moves only by the place's own last result: the part of
 * that result that was the place's own (its state's conditions against the nation's), not
 * the year's national tide and not the candidates. The published 2024 map is read only
 * for a place that has never been counted and was given no opening lean.
 *
 * One writer (`carryLeans`), one reader (`leanOf`), and `setOpeningLean` for a world whose
 * history hands each place its opening lean. The voting module owns the table and passes
 * it in; the readers below name it by its id, so this file loads no module.
 */
~~~~

### src/core2/player-v1.ts · bb2bb3977414

~~~~text
/**
 * What stops the controlled person's clock: a module's stop (a director
 * scene, a held deadline, a meeting). A work shift never does (owner, Oct 26:
 * "Shifts are for the simulation... The player should not be clicking
 * through that."); the character attends on its own choice.
 */
~~~~

### src/core2/player-v1.ts · 9a5752c37284

~~~~text
// A shift's start is a moment the clock reaches, so the character
    // answers its own work choice there, but never a stop (owner, Oct 26).
~~~~

### src/core2/player-warm-up.ts · e4933d0e2fdb

~~~~text
/**
 * The opening's warm-up (owner, Nov 14, 2026: "The town must be in motion on day one... not just town, but
 * country and state. Remember, it's all one simulation."; skill day-one-in-motion). A world built to open
 * on the start date can instead be built a few days before it and run forward to it with the engines' own
 * days, so the records an engine makes on its first steps (a budget in force, the cabinet, the economy's
 * lines, a cabin of cases) already exist when the player arrives. It is the one mechanism for the opening's
 * first weeks; what a place has from longer ago (last year's address, past police months, sitting
 * committees) is written by the engine that owns it for the past date, not by a longer warm-up.
 *
 * The played person does nothing in these days: they run through the player clock's own day
 * (`runControlledDay`, player-v1.ts), where no module may choose for the controlled person, so no job
 * change, move, filing or stop lands that the player would have chosen. Nothing is shown to the player: the
 * director starts after the warm-up.
 */
~~~~

### src/core2/population.ts · 41b471bb3df6

~~~~text
/**
 * Each group-quarters type's residents in the opening's sample of `sample`
 * people (CTO, Nov 1: the count by place and type comes from the Census).
 * This world's count of a type is the Census count times the world's
 * population over the published one, never past the world's whole count;
 * the sample holds it in the sample's proportion, so the world's own count
 * cancels: the Census count times the sample over the published population
 * (or over the group-quarters total where that is larger). Empty where the
 * place has none.
 */
~~~~

### src/core2/population.ts · 8b898a83f37f

~~~~text
// Group quarters (CTO, Nov 1): the place's Census count of residents in
  // college housing, prisons, nursing homes, barracks and other quarters is
  // part of its population, so their share of the sample is carved out of
  // the same draw, and households are drawn for the rest only.
~~~~

### src/core2/pre-start.ts · 185708ba3f03

~~~~text
/**
 * A person's own window (the owner's ruling, Nov 9, 2026: each person's past
 * covers their whole life, coarse, written only when they are opened or
 * met): from the day they were born through the day before the world's
 * opening. The part before the world's window is told a year at a step; the
 * part inside it keeps the world's step.
 */
~~~~

### src/core2/press-conflict.ts · 9ea1bf291d3b

~~~~text
/**
 * Who works for or owns an outlet today. Press staff may run for office and
 * hold it (owner, Oct 16, 2026: "a reporter who wants to run may run"); this
 * index is not a bar. The only reader is the stand-in that seats a vacant
 * local office without an election (offices.ts), which does not pick someone
 * because of a press job: the defect the owner named was a reporter put into
 * an empty seat automatically at the opening.
 *
 * `pressConflict` reads the press engine's outlets table by module id (an
 * import of the press module's values would close a cycle with the offices
 * and candidacy modules) and indexes every outlet's staff once a day and
 * again whenever the press changes an outlet's people (`pressStaffChanged`), so
 * a call is a map lookup and never scans the world.
 */
~~~~

### src/core2/press-desk.ts · 118040b0d0f2

~~~~text
// A body's sitting is news for what it did, not that it sat (CTO, Nov 1,
  // under the owner's "real ones with some good fluff or else it will get
  // old"): one that took up business is told by its votes, one story a
  // bill, so its own record prints only where none of its votes reached the
  // wire; one that took up nothing goes in the week's meetings brief. A
  // county board's sittings filled 94 of a year's headlines in Blunt, South
  // Dakota, seed paper-nov1:2, all "Hughes County Board of Commissioners
  // meets".
~~~~

### src/core2/press-desk.ts · 52dad78a8368

~~~~text
// The briefs column (owner, Oct 29: side stories, "a line or two"): a
  // local outlet prints the short items from the town's own records that its
  // reporters left (data/press/briefs.json), the most read first, up to its
  // space; a week whose records hold none prints none.
~~~~

### src/core2/press-staff.ts · 986748361af4

~~~~text
/** Null for an owner, who holds the outlet and is on no payroll. */
~~~~

### src/core2/press-staff.ts · 0395a366358e

~~~~text
/** Someone given a household cost at hire (an owner, or staff from outside the town), which they spend out of each week through this date. */
~~~~

### src/core2/press-staff.ts · 6daa6f29e982

~~~~text
// Someone seated from a recorded identity (an owner, or staff who live
  // outside the town) has no household to give them a cost, so they get the
  // one-person household officials get: the Consumer Expenditure basket and a
  // studio's rent, and the savings a family keeps at their pay (an owner's,
  // at the income the press parameters set), paid in from outside. Staff
  // drawn from the town's people keep their household's own costs.
~~~~

### src/core2/race-places.ts · f8328134cfaa

~~~~text
/**
 * A race's whole electorate where it reaches past the town, for its petition
 * (owner, Nov 14: a race needs the number its own law sets for its own
 * electorate, never a town's share): its eligible voters, their last
 * two-party votes and lean, and the counted voters outside the town by
 * place, whom a campaign's paid circulators can reach. The places are the
 * race's (`basePlaces`), the town's own voters set apart from its home
 * place. An island area's state or federal race, whose villages' voters are
 * not on record, reads the island's people (shared among the office's
 * districts) at the town's own voters per resident. Null for a town race, or
 * a race the world holds no one outside the town for.
 */
~~~~

### src/core2/record-test-kit.ts · f5f139ec541d

~~~~text
// The rival's own campaign turn decides to show the record
    // (campaign-rival-ad-quotes-a-real-vote): no hand call of the ad.
    // A campaign spends at an even pace to election day, so a turn months
    // out has no money for a spot (rec-probe-3: $9 to $27 of attack money
    // 295 days out). The world plays on to the race's last weeks, where a
    // campaign's turn has money to show the record (CTO, Nov 17).
~~~~

### src/core2/recount-rules.ts · f422940c80e3

~~~~text
/**
 * Each place's recount rule (owner, Nov 10, 2026: "Recount by own states
 * rules"), read from data/research/elections/recount-rules-2026.json by the
 * one count (src/core2/modules/voting.ts, keepCount). Pure: a count's margin
 * against the place's tiers, no world state.
 */
~~~~

### src/core2/reference/lazy-data.ts · 58e8031fadff

~~~~text
/**
 * Large place-keyed data tables, read on first use and kept only for the
 * states a world actually asks about (owner ruling on PR #4123, Oct 13 2026).
 *
 * Importing the engine used to parse every row for all 56 states and
 * territories before a town existed. A table built here reads its file the
 * first time a key from a new state is asked for, keeps that state's rows
 * and lets the rest go. Callers keep their own signatures; only the table
 * object they read from changes.
 *
 * The reader is a seam: Node reads the file (the bench, tests and tools all
 * run on Node); another host can supply its own with `setJsonDataReader`.
 */
~~~~

### src/core2/reference/living-costs-data.ts · 47fabd7522c4

~~~~text
/**
 * What this world pays for everyday living: the published basket scaled by one
 * price level drawn per world from its seed (realistic, not real; owner,
 * Oct 27). Every opening reads this, never the published basket.
 */
~~~~

### src/core2/regional-model.ts · a314ae9bf700

~~~~text
/**
 * Each region's month before the start in this world: the published months
 * moved by the world's national offset from the published national month
 * and by each state's own offsets, drawn once from the world's seed (owner,
 * Oct 27: realistic, not real; the published figures calibrate). A state's
 * offsets move its metros and the rest of it alike.
 */
~~~~

### src/core2/representative-sample.ts · 191149e51f63

~~~~text
/**
 * The full people are a representative sample of the town, plus the
 * player's circle (owner, Oct 12, ruling 4). Before the town collapses to
 * two levels, its households outside the circle are grouped by the oldest
 * member's age band and the household's pay (above or below the median), and one household
 * per group stays full. Which household is seeded (generation of who exists);
 * each of its people stands for their group's share of the town (a weight),
 * for estimates such as polls and views. The counted voter groups still cast
 * the counted people's votes, so weights are for estimating, not voting.
 */
~~~~

### src/core2/residents.ts · 056a5758e3be

~~~~text
/**
 * A public school district's teachers are counted workers like any town's:
 * the district's pay owner (the town government's) pays their wages through the
 * counts' payroll, so there is no reason to keep them, and their households,
 * as full people (the year of a dense town grew 36 s when #5044 kept them).
 */
~~~~

### src/core2/residents.ts · 259c24c1468e

~~~~text
/** This world's median earnings for a place: the published median moved once by the world's own offset (owner, Oct 27: realistic, not real). */
~~~~

### src/core2/saves.ts · b54bb49f7d77

~~~~text
/**
   * History before the start: each engine's pre-start pass from this date
   * (M1-14). Left out, it runs from the player's birth year (owner, Oct 28,
   * 2026) at the parameter table's step (`preStartStepMonths`); `false`
   * skips it.
   */
~~~~

### src/core2/saves.ts · 554fb4ecf98c

~~~~text
/**
 * The year the one history starts (owner, Oct 28, 2026: "simulate to the
 * birth year... general to make the game flow"): the player's birth year, in
 * every drawn place. A world with no player (a test world) starts at the
 * birth year of its youngest adult, the resident a player would be; a world
 * with nobody has no history.
 */
~~~~

### src/core2/school-outcomes.ts · fa46a780a781

~~~~text
/**
 * School outcomes (each school year, every place). In the testing month every
 * enrolled student of a tested grade gets a math and a reading record, and on
 * the last day of the school year every senior a graduation record. Both
 * tiers follow one rule: the place's expected share is its base (the web's
 * 2024 state base) times the web's factor for the student's income fifth,
 * spread over the fifths by the researched gradient; within a fifth the
 * count is filled from the top by each student's own standing (attendance
 * and study traits), a counted student standing for as many real students as
 * their household's weight, and the fraction left over carries to next year.
 * A math student whose household moved into the town after the school year
 * began switched schools, and the school-move link (carried here, not run by
 * the web) lowers that student's own share by its researched size.
 * There is no roll. A full student keeps a result record; counted students
 * are kept as group counts, and their results are read the same way by every
 * engine that reads the place's measures (schoolMeasure).
 *
 * The college step (owner, Oct 29, 2026: a background simulation, never a
 * step the player takes) is decided on the same day for the seniors who
 * graduate, by the same standing: each is ranked within their income fifth
 * for whether they enroll (the immediate enrollment share) and, of those who
 * enroll, whether they complete a bachelor's (the six-year completion share
 * times the web's factor for the college completion outcome, which is how
 * the state's higher education line reaches a named graduate). Each share is
 * the NCES figure moved by the world's own factor for that table
 * (worldRateFactor), so no two worlds open on the same college-going rate. A
 * completer holds a bachelor's, and an enrolled graduate who does not holds
 * some college, from the day normal time ends (collegeOf), which the jobs
 * engine reads when it prices a hire.
 */
~~~~

### src/core2/shared-history.ts · 371f1007c1e0

~~~~text
/**
 * What two people have done together, read from the records that say so: the
 * one source the director's casting, its scene leads and the conversation
 * read for a tie's history (owner, Oct 27, 4 PM Eastern: "Systems are being
 * made for individually instead of linking everything together"). It writes
 * nothing; each kind names the record it comes from.
 */
~~~~

### src/core2/starting-cash.ts · db0679c8636d

~~~~text
/**
 * What a family at this income, and with a head of this age when it is
 * known, keeps in its accounts in this world: the published median, scaled
 * by one balance level drawn per world from its seed (realistic, not real;
 * owner, Oct 27). Every opening cash reads this.
 */
~~~~

### src/core2/state.ts · a2240c63cbba

~~~~text
// A chosen look from another origin than the family was drawn with
      // (owner, Nov 8: "I'm Mexican and my son is white"): the family's
      // origins are worked out again from who is whose parent
      // (family-origin.ts), not all painted in the player's tone.
~~~~

### src/core2/term-read.ts · 4bd208a86813

~~~~text
/**
 * How an official's term is going, read by policy area (owner, Nov 8: "if
 * you're having a good term except for education, then you might get a
 * strike"). Each area is a few of the outcome web's own measures
 * (`data/term-read/areas.json`); an area's read is how far those measures
 * moved between the web's row at the start of the term and its newest row,
 * a slide between -1 and 1, never a pass or fail. The read cites the two
 * rows, so anything built on it (an address's bad news, a group's walkout)
 * can say why. Nothing here writes a record or decides what anyone does.
 *
 * stopgapId: SG-WORDS-term-read-warmup (the first twelve months of a world
 * are not read, while the town's records settle in).
 */
~~~~

### src/core2/term-read.ts · 56edd74c4e02

~~~~text
/**
 * The country's term read: each area's slide from the country's own monthly
 * figures where it keeps them (jobs and prices, from the macro months, real
 * history included), and for the other areas the mean over the places the
 * web keeps (the player's town and every place the economy records). Other
 * places keep only results (owner, Nov 5), so this is those results, not a
 * count of every place.
 */
~~~~

### src/core2/tooling/m1-02-check.ts · 1f530895ee75

~~~~text
/**
 * M1-02 golden-path check, on the whole economy. A pinned town on the
 * two-level world with every economy engine runs the days given (default two
 * years) from its start date. Passes when:
 * (1) UNCHECKED (owner, Nov 8: real ranges are not targets): the simulated
 * 12-month changes and quarterly output growth are printed beside the
 * 1990-2026 bands and never tested against them. The national cycle has no
 * recorded cause to test a value against yet (the national row is the sum of the
 * country tier's states, country-model.ts), so this clause waits for the cycle's causes (Money) and
 * keeps no band meanwhile; (2) the country tier holds all 56 states and the
 * latest simulated month's unemployment is the sum of their cells; (3) every board vote records
 * its reasons; (4) at every rate change, each of the town bank's prime-linked
 * business lines reprices on the decision's effective date. The loan-cost
 * witness (4) needs a town with a bank line open at a rate change, so the
 * town is pinned below. Exits nonzero on failure.
 */
~~~~

### src/core2/tooling/m1-03-check.ts · a7ddb52cc72b

~~~~text
/**
 * M1-03 golden-path check, state and metro economies, in a played world. Uses
 * GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY from the runner. The drawn place
 * is built as the player gets it (`buildBenchWorld`, every module installed)
 * and plays one game year from its opening month. Passes when:
 * (1) two states drawn from the seed change in jobs and in pay between the
 *     opening December and the next December, differently from each other
 *     (at the published precision). UNCHECKED (owner, Nov 8: real ranges are
 *     not targets): the 5th to 95th percentile of the real December-over-
 *     December state changes (BLS CES state series, in
 *     data/research/regional/series/stats.json) is printed beside the
 *     changes and the count of states outside it, and never tested, because
 *     the regional cycle has no recorded cause to test a value against yet
 *     (Money);
 * (2) the town sits in a region of its own state, and the prices and pay it
 *     was given (the finance conditions every engine reads) are the
 *     nation's moved by that region's own price level and pay since the
 *     opening;
 * (3) every state's and metro's opening figures in the played world are the
 *     real ones (BLS LAUS unemployment, BLS CES jobs, BEA regional price
 *     parities; src/core2/data/regional/regions.json carries the series).
 * Exits nonzero naming each failed clause.
 */
~~~~

### src/core2/tooling/m1-03-check.ts · 8a95d3f7816f

~~~~text
// The real spread is printed beside the drawn states' changes below and how
// many states sat outside it, never tested against (owner, Nov 8: real ranges
// are not targets). Each state's change is its own region's national-growth
// times its sector mix, so the cause a value could be tested against is the
// regional model's, which has none recorded yet (Money).
// BLS publishes one-year percent changes to one decimal: states that read the same there have not diverged.
~~~~

### src/core2/tooling/m1-04-check.ts · 0aea7a195cbc

~~~~text
/**
 * M1-04 golden-path check, jobs, in a played world. Uses GOLDEN_PATH_SEED and
 * GOLDEN_PATH_PLACE_KEY from the runner. The drawn place is built as the
 * player gets it (`buildBenchWorld`, every module installed) and plays one
 * game year, read at the end of each month. Real rates are not targets (owner,
 * Nov 8): the check does not compare the town's unemployment or its hires,
 * quits and layoffs with its state's recorded ranges; it asks why they are
 * what they are, by record. Passes when:
 * (1) every person out of work and looking in the town has a reason from the
 *     jobs reasons table, and a named person let go has the layoff on record;
 * (2) every hire, quit and layoff at the town's employers names its reason and
 *     who decided it (a decider that is a record in the world), counted as
 *     the people it stands for;
 * (3) every layoff names the cause that decided it: the turnover pull, the
 *     employer's demand and books (target staff, observed staff, losses), or
 *     a closure.
 * The town's unemployment and the rates of hires, quits and layoffs per
 * hundred jobs are printed with their counts, never tested against a band. A counted
 * worker who leaves keeps no change record (owner, Oct 14, ruling 3,
 * src/core2/modules/jobs.ts noteCountedLeavers), so what is measured is the
 * record. Exits nonzero naming each failed clause.
 */
~~~~

### src/core2/tooling/m1-05-check.ts · c17cf9060276

~~~~text
/**
 * M1-05 golden-path check, housing, in a played world. Uses GOLDEN_PATH_SEED
 * and GOLDEN_PATH_PLACE_KEY from the runner. The drawn place is built as the
 * player gets it (`buildBenchWorld`, every module installed) and plays one
 * game year. Passes when:
 * (1) and (2) UNCHECKED (owner, Nov 8: real ranges are not targets): the
 *     town's median rent and median home value at the start and end of the
 *     year, beside the range of the county medians in its state (ACS
 *     2020-2024 B25064 and B25077, src/core2/data/housing/housing.json
 *     countyRentValue), and the year's move in the value beside the range of
 *     four-quarter ratios its state's FHFA all-transactions index recorded
 *     from 1985 on (housePriceIndex; the annual CPI-U ratios in
 *     src/core2/data/macro/history.json where FHFA has no state rows), are
 *     printed and never tested. Housing prices have no recorded cause of
 *     their own to test a value against yet: the engine moves the value by
 *     the replayed index (housing-prices.ts, a place in the code audit's
 *     list), so the clauses wait for Money's cycle and keep no range
 *     meanwhile;
 * (3) every eviction case on record opened from rent owed (owed at notice
 *     above zero, on a lease that exists) and carries the steps of the
 *     place's law as recorded (the same row of housing.json eviction,
 *     statute text in data/research/housing/eviction-steps-2026.json);
 * (4) every case followed those steps in order, each on the day the law's
 *     days give: notice, cure deadline (notice plus the notice days), filing
 *     on the cure deadline, hearing (filing plus the hearing days), judgment
 *     (the hearing, or later when a payment plan was missed), removal
 *     (judgment plus the stay days);
 * (5) every removal followed a judgment, ended the lease and left a
 *     dwelling marked removed for eviction (or rehoused since, for a
 *     household that rents again), and every household marked removed for
 *     eviction has a removed case behind it.
 * Exits nonzero naming each failed clause. A year with no case on record
 * passes clauses 3 to 5 and says so.
 */
~~~~

### src/core2/tooling/m1-05-check.ts · f116bb4675ca

~~~~text
// Printed beside the town's figures in the report below, never tested
// against (owner, Nov 8: real ranges are not targets).
// (2) The year's move in home values against the recorded annual moves.
~~~~

### src/core2/tooling/m1-07-check.ts · de67c020d15f

~~~~text
// (4b) Every level on its own: the federal government, the state, the county
// and the city each report their taxes and spending per resident beside the
// published figure and the world's spread. A level fails only when its budget
// in force at the end of the year differs from its own opening budget by more
// than the world's spread parameter, as taxes doubled would (owner, Nov 8:
// ranges are not targets; a published figure the world leaves is a report,
// never a failure). The county's and the city's own figures have no separate
// published row: the Census table holds their sum, which is reported with
// them.
~~~~

### src/core2/tooling/m1-08-check.ts · d589354f6b73

~~~~text
/**
 * M1-08 golden-path check, businesses grow and shrink, in a played world.
 * Uses GOLDEN_PATH_SEED and GOLDEN_PATH_PLACE_KEY from the runner. The drawn
 * place is built as the player gets it (`buildBenchWorld`, every module
 * installed) and plays three game years, the cash journal watched
 * (setJournalTrace) for the owners' draws. Passes when, for each of the three
 * years:
 * (1) the town's business openings and closings are explained by records
 *     (real rates are not targets, owner, Nov 8): every founding on record in
 *     the town names a founder who is a record in the world, a kind, and the
 *     market room it chose on, and every business whose books closed in the
 *     year names the reason it closed (its owner's choice to carry on or not,
 *     from its losses or the owner's age, or a closure by its books). The
 *     openings and closings per hundred businesses are printed with the
 *     Census Business Dynamics Statistics range for the state beside them,
 *     never tested against it;
 * and over the run:
 * (2) owners' income comes from profit: every owner draw on record that moved
 *     money was one journal entry out of the business's own account into the
 *     owner's, was no more than the profit the business had kept
 *     (retained before the draw), came after the business's sales (it had
 *     received sales, and all its draws in the run are no more than the sales
 *     it received in the run), and was never made from a business with no
 *     profit kept;
 * (3) a business that adds a location does so with nothing scripting it: where one does, at least one
 *     founding on record names a parent business, the market room it chose
 *     on, and the parent's strength, with the parent's own cash funding it
 *     (a founding row the monthly founding decision wrote, not the opening's).
 * Exits nonzero naming each failed clause.
 */
~~~~

### src/core2/town-employment-mix.ts · 9f32af30af95

~~~~text
/**
 * Every workplace's share of the town's jobs in this world: the sourced mix
 * with each sector's and public group's jobs moved once by the world's own
 * offset (owner, Oct 27: realistic, not real). Play reads this.
 */
~~~~

### src/core2/town-pay.ts · 7d082adcdcaa

~~~~text
/**
 * GAME ASSUMPTION, labeled: where a worker sits in their occupation's wage
 * distribution. A new hire starts at the starting percentile and moves toward
 * the ending one over the tenure years at the employer. With a world's seed
 * (play), the two percentiles and the years are this world's own, drawn around
 * the assumed ones (owner, Oct 27: realistic, not real); without it, the
 * assumed rule (calibration). Recorded credentials select actual paid peers
 * for an observed hourly mean, never a fixed degree premium.
 */
~~~~

### src/core2/turnout.ts · f53141c0710c

~~~~text
/**
 * Whether a voter turns out (owner, Oct 14, 2026): a sliding propensity from
 * causes, never a coin. One function for every voter the game counts, named
 * or counted, in the town or in a place counted from afar:
 *
 * - readiness apart from the race: their sense of duty and how closely they
 *   follow politics, against what voting costs them that day (their work
 *   hours and the election laws in force, the cycle's lower salience);
 * - the race's stakes for them: how much separates the candidates in their
 *   own eyes, on every race on the ballot that day;
 * - the campaign's reach: how many times a campaign reached them this cycle;
 * - habit: their own record of voting or staying home.
 *
 * The propensity is the logistic of their sum, so it slides: nothing flips a
 * voter from never to always. A counted resident stands for the town's people
 * like them, so their vote counts at their propensity. A named person's act is
 * one vote: they turn out in the share of elections their propensity says, in
 * the order their own record carries (`namedTurnout`), so the same person in
 * the same circumstances does the same thing and nothing is rolled.
 */
~~~~

### src/core2/union-rate.ts · 536e1e39d408

~~~~text
/**
 * A state's union membership rate (BLS, 2025) in one world: the published
 * rate is the center and the world's own draw moves it (owner, Oct 27:
 * realistic, not real). Read by a union local's dues and by the
 * right-to-work law's reach; only the rate is a statistic, what a law does to
 * it is law.
 */
~~~~

### src/core2/why-kept.ts · b27f38eeea08

~~~~text
/**
 * Whose "why" record is saved (Keep it simple, owner Oct 11, 2026): the
 * player's and the people they deal with, plus anyone in focus. For anyone
 * else the dollars, the counts and the pulls an engine reads are still
 * recorded; only the row that says why for a person nobody asks about is
 * left out.
 */
~~~~

### src/core2/world-base-rates.ts · 8d18449debf9

~~~~text
/**
 * Each world's base-rate tables (owner, Oct 27: realistic, not real): one
 * factor per published table (births, moves, chronic conditions,
 * college enrollment, college completion), drawn once from the world's
 * seed by the shared world draw, that scales the whole table. A base rate checks totals and never picks one actor's
 * outcome; the factor only makes the world's own rates differ from the
 * published ones. The spreads are parameter rows.
 */
~~~~

### src/core2/world-draw.ts · 1822c32db017

~~~~text
/**
 * Starting levels for one world (owner, Oct 27: "realistic, not real"): a
 * published statistic is the center of a spread the world's seed draws from
 * once at Start, so no two worlds open on the same figure and none opens on
 * the published one. Generation of the starting world only, never an actor's
 * outcome; the sizes live in the parameter table. This is the one draw: the
 * national and state economy, the budget lines, the housing medians and every
 * other starting figure take their offset from `worldOffsetUnit`.
 */
~~~~

### src/core2/world-settings.ts · 323c0093b62f

~~~~text
/**
   * Where day one comes from (owner, Nov 17, 2026, CTO line 6935086070 on #9747, point 5: "'Just
   * like today' is the same engine with a new-game or dev-mode option that forces today's real
   * record"): the century run from 1925 (the default), or today's real record.
   */
~~~~

### src/director/address-kind.ts · 2767c334a5e4

~~~~text
/**
 * The kind of address a speaker gives (owner, Nov 8: "It's still very
 * robotic... it's always good news. It's never bad news... Sometimes you
 * could have a Jimmy Carter, a crisis of confidence kind of thing. Sometimes
 * it could just be a hopeful speech, or it could be like Trump just railing
 * on people... it needs to work off of effects or in-laws and people around
 * them and their temperament and their personality"). The kind is picked
 * from the world's records and the speaker's recorded traits: the term read
 * by area (src/core2/term-read.ts), the economy's year, a recent disaster
 * and the speaker's open priorities. Each kind's score is what the world
 * gives it to say times one plus the speaker's pull toward it; the highest
 * score wins and a tie goes to the name first in the alphabet. No roll
 * picks it. It holds no sentence: the English engine's bank writes the
 * address in the chosen kind's manner.
 */
~~~~

### src/director/address-render.ts · 65816fd1c47e

~~~~text
/**
 * An address as its record keeps it (owner, Nov 16: every line registered
 * and traceable, "there can be no leftovers"; the lead, Nov 16: a speech
 * that was given is a record of what was said). The one writer
 * (`composeBlocks`, src/director/opening-story.ts) composes the address once,
 * on its day, and the record keeps each sentence as the bank pieces it was
 * joined from, the facts each slot said and the records those facts came
 * from. Every view of it (the address scene, the line a hearer quotes, the
 * paper, dev mode's "why each part") says it through `sentenceText` here,
 * so the words never change after it was given and never differ by who reads
 * them.
 */
~~~~

### src/director/address-render.ts · 5fa27651d567

~~~~text
/**
 * The bank pieces a speaker said in the addresses on the record before this
 * one, oldest first, from each address's own record of what was said: the one
 * writer of every address reads them so a voice prefers a wording it has not
 * used lately, and says the one used longest ago when every fitting wording
 * has been said (no dice; owner, Nov 12: the same sentence in address after
 * address). Read once an address is composed, a few times a year.
 */
~~~~

### src/director/address-render.ts · 28836a6046da

~~~~text
/**
 * The address's parts in words, one per Continue. A governor's or a town's
 * greeting is never a part of its own, it joins the next; the President's
 * opening paragraph is its own part, whatever it holds (owner, Oct 28
 * sitting, 11 and 41: the opening paragraph, the country's story, the close).
 */
~~~~

### src/director/address-response.ts · ac649daafed5

~~~~text
/**
 * The other side's answer to a governor's State of the State (owner, Nov 8:
 * "speeches against the governor"). On the day of the address, the state
 * legislator of the other party who leads their side (the minority leader, else
 * the one whose ideal is farthest from the governor's) answers on the first
 * thing the governor asked for that they stand against, by their own record of
 * views (the officials engine's ideal and signature issues). Nothing is rolled:
 * no one of the other party who opposes an ask, no answer. The answer is a
 * public record the news carries, and a case the speech engine puts to the
 * governor, so the pressure is on record the same way a protest's is.
 */
~~~~

### src/director/address-sentences.ts · fecee1f9d34e

~~~~text
/**
 * An address cut into the sentences its versions tests count across worlds
 * (local-address-versions, opening-address-versions): one helper for both.
 * A question of `shortQuestionMostWords` words or fewer ("Why?") is read
 * with the sentence after it as one thought. The words lead's ruling of
 * Nov 12, on seed bab4ffbbf3ef6ae3: "Why? Because I believe {belief}." is one
 * piece, and the owner's own rule treats one to three words as too short to
 * carry a fact (Nov 11, call 12: "Replies of one to three words and action
 * names stay"). Every other sentence is cut exactly as before.
 */
~~~~

### src/director/address-story.ts · 9e4b8855a763

~~~~text
/**
 * The world's story an address opens on (Story thread #9750, part 4; owner,
 * Nov 16: "it's a real speech. It's a mix of hopefulness, maybe a little
 * braggadocious, and sets expectations ... or maybe it's warning because in
 * this generated world, you know, maybe the economy's been terrible ... or
 * maybe corruption"). Before the planner reads the speaker's own issues it
 * reads what the world has been through, from its records:
 *
 * - **the economy's run**: the macro months over the last `runYears` years,
 *   how far prices outran pay or pay outran prices and whether more or fewer
 *   people were out of work at the end than at the start, and whether the
 *   speaker governed those years or inherited them;
 * - **a disaster**: the country's declared disasters of the past year for
 *   the President (the national events engine's rows), the place's own for a
 *   governor or a local head (the disasters engine's);
 * - **a scandal**: a bribe taken to the press about a member of the body the
 *   speaker addresses (the corruption engine's reported record).
 *
 * Each is a story row of `opening-address.json` (`stories`): the facts that
 * must hold (`gate`), what its amount is multiplied by (`weight`), and the
 * order of the sections its address says, so a warning and a brag do not
 * share a skeleton. The story with the highest weight times amount is the
 * address's; a tie goes by the story's name, and with none the address takes
 * the kind row's own order (`steady`). No roll. It holds no sentence: the
 * opening-speech bank's `story-open` and `story-turn` pieces of the story's
 * topic say it.
 */
~~~~

### src/director/arc-variant.ts · d63fe7955143

~~~~text
/**
 * Which arc a scene plays (owner, Nov 8, 9:50 voice note: "they've gotta have
 * like a variance. So even though there's only 5 in corruption scenes right
 * now, you could get, I'm just making a number up, 30 different scenes within
 * there"). One kind of scene may have several arcs, its variants: the same
 * purpose played as a small gift, a large sum, a friend's favor, a second ask,
 * a desperate plea. Which one a scene plays is read from the records, the way
 * an address's kind is (address-kind.ts): each variant's score is what the
 * records give it, a sum of named reads each between 0 and 1 with its weight,
 * times one plus the asker's pull toward it (the mean of the personality facets
 * the variant lists). The highest score wins and a tie goes to the name first
 * in the alphabet. No roll picks it, and nothing flips at a threshold: a
 * bribe a little smaller than another is a little more of a gift.
 *
 * This is the one engine for every kind. A kind with no row in
 * `src/director/data/arc-variants.json` plays its purpose's single arc as before. The
 * variant's arc (state, replies, follow, again, endings) is a row of the same
 * data; the words are the scene bank's, by the variant's own purpose id, and
 * the family's pieces serve where a variant has none of its own
 * (`SceneMove.family`). It holds no sentence and no kind's name: what a read
 * looks at is data, and the reads are fifteen ways of looking.
 *
 * The reads use only what stays true while the scene is open (the record the
 * cause names, the tie as that record kept it, what happened before the
 * cause's day), so the tree the player sees is the tree their reply is
 * matched against.
 */
~~~~

### src/director/bargain-facts.ts · b0494d793fd1

~~~~text
/**
 * What a colleague the player asks for their vote has on record to say
 * (brief O, Nov 14 2026; the Words lead's rules 93 and 106; owner's card,
 * 06:43Z: a colleague asks in return only what the game can do now). Read when
 * the evening-before ask is composed, never on a day tick.
 */
~~~~

### src/director/bring-it-up.ts · 6f3d9366e2d8

~~~~text
// A story about the listener (a vote they cast, a bill they sponsored) is
  // what one brings up to them first; otherwise the newest change (the
  // owner's council member heard nothing of his own ordinance, Oct 29).
~~~~

### src/director/bring-it-up.ts · 0ad8de3ec167

~~~~text
// A printed story blames no one: the outlet only printed it. Someone who
  // holds no cause, or none they can name, says nothing more ("I have no
  // idea" answers nothing; owner, Nov 12, on non-replies): the change is
  // told alone.
~~~~

### src/director/cause-facts.ts · 3ce4db471c30

~~~~text
/**
 * What the record behind a moment names, as the narrator says it: the office
 * a race or an oath is for, the bill a vote or a signing is about, the
 * employer or outlet that called, the job's title, the party that asked, the
 * charge and the prison term, the landlord, the law. One reader for every
 * scene's lead and cause line (`composeScene`), so a line about a record says
 * what that record holds (owner, Nov 11: every line through the English
 * engine, with inserts from the world's records). A fact the record does not
 * hold is left out, and the engine picks a wording that does not need it.
 */
~~~~

### src/director/circumstance.ts · 4bf1d229e4da

~~~~text
/**
 * Scenes from circumstance (owner, Oct 27, 2026, 01:30 Eastern: "if the
 * circumstances are right in the simulation, they should be callable, and
 * the English engine handles the words"). A record written anywhere in the
 * world can call a scene for the player when they are at a kind of place
 * that day and someone there has a reason from the record to bring it to
 * them: a resident who read about a vote the player cast stops them in the
 * street, a coworker brings up the national news, a colleague catches them
 * in the capitol's hallway after a committee hearing.
 *
 * The rows (`src/director/data/circumstances.json`) hold the structure and no sentence.
 * This file is pure over the core: it reads only the records written today
 * (each kept as it is recorded, `CircumstanceQueue`), never history or the
 * whole world, and casts the person with the highest score; the record id
 * breaks a tie, so nothing is drawn by chance. The ledger writes the moment
 * it returns and the ordinary scheduler stages the situation type whose
 * cause carries the row's label.
 */
~~~~

### src/director/civic-roles.ts · 961789cf2ea1

~~~~text
/**
 * The civic roles a scene's situation type names, filled from the records
 * that carry them (owner, Oct 15, 2026): the poll workers who work an election
 * day's polling place, the reporter who asks at an interview, the chair who
 * presides over a body and the members who sit on it, and the executive who
 * signs or vetoes, the reporters who cover an officeholder's act on a bill
 * (the press corps), the officeholder's own aides and the residents who asked
 * at their town hall. The moment's cause
 * record says which: a bill's id names its
 * body; an interview's id names its reporter; a speech's id names its listeners; the voter's own precinct names
 * its workers.
 *
 * The clerk who takes a filing is the person the contest's filing office
 * records name (`filingClerkFor`: an elected clerk, the town's appointed
 * clerk or the county government's listed clerk). A contest filed with a state
 * or federal office has no counter in the town: the role stays unfilled, and
 * the scene says so by the reach report, never by an invented clerk. A bill
 * presented to the executive's desk is brought by its body's clerk, the
 * town's or the county's (`localClerkFor`), and an official's aide is one of
 * the staff they hired (`servingStaffOf`).
 */
~~~~

### src/director/civic-roles.ts · 478b55339317

~~~~text
// Who brings a lost vote to its sponsor: their aide where they keep
      // one; a council member keeps none, so a fellow member who voted for
      // the bill finds them, the closest first (the owner's council member
      // heard nothing after his ordinance failed, Oct 29).
~~~~

### src/director/constituent-help-facts.ts · c31d1691761d

~~~~text
/**
 * What a constituent's own records hand the office-hours scene (owner, Nov 9:
 * "a bunch of different scenes and scenarios and variants", drawn "from
 * people's lives and the world's records"): the employer they lost and how
 * long ago, the back rent a notice names and the day it runs out, the hourly
 * pay under the legal floor, and the relative at home who needs care. Each is
 * a fact of the scene cited to the records it came from, and each is set only
 * where its record is on the books, so a line that names it plays only then.
 * The variant that plays is chosen by arc-variant.ts from the same records;
 * this file only words what they say.
 */
~~~~

### src/director/conversation.ts · 4eada38a2036

~~~~text
/**
 * Conversations on the new core (M4-02). Every subject is a record the
 * speaker holds. The other person asks or tells; every choice answers that
 * line (rule R3), each with a different move: plainly, with a further fact
 * from the records, or by turning the question back. A second sentence only
 * follows from the first (owner, batch 6); the other person moves the talk
 * on. Leaving is the screen's control, never a choice.
 *
 * Talking is time together: each exchange is recorded through the core's
 * relationship writer, so closeness grows and news passes as at any contact.
 * The lie (the scales control) exists only when the last line asks about the
 * player's own record and the listener doesn't already know it. Pressing it
 * turns the whole set of choices false: each stays a different move, and each
 * is a mined denial or a believable false alternative the player's own record
 * contradicts. A lie leaves its exact claim as a belief in everyone present,
 * the director keeps it, and anyone who knows the truth sets a believer
 * straight when they next talk.
 *
 * Every line is a mined sentence (`./mined/conversation-bank.ts`); a moment no
 * mined sentence covers is left unsaid.
 *
 * What a talk is about: it starts from the place
 * and the occasion, then from the biggest recorded event of either person in
 * the director's ledger, else from what they share; it keeps to that one
 * topic, may go on to one related topic, and the other person closes it when
 * the topic is done. Someone not in the room is asked after only when
 * something recorded happened to them; news is what the speaker received,
 * and the President's address weighs by how closely they follow politics.
 * The listener remembers the last talk's topic and doesn't open with it again.
 */
~~~~

### src/director/conversation.ts · ac30aaf358e8

~~~~text
/**
   * The answer moves that fit a subject's question, where not every wording
   * of the subject answers it: "Where did you go to school?" is answered with
   * where, never "It's okay." (owner, batch 11).
   */
~~~~

### src/director/conversation.ts · 8d3c40a86cbd

~~~~text
/**
 * What a relative's latest recorded happening gives a talk about them (the
 * owner, Nov 1: every life is simulated, and under Q7 what happened to them
 * is the news): the stage their news is told in, and the facts it needs,
 * where they moved and where they work now, each cited to its record.
 */
~~~~

### src/director/conversation.ts · 631b17192006

~~~~text
// The town both of them live in is "town", never its name (said-as
      // ownPlace; owner, Nov 12: "we'll watch what it does to Wofford
      // Heights"); another town by its name.
~~~~

### src/director/conversation.ts · ec0c1a381cfb

~~~~text
/**
 * The speaker's own work day, told to someone they live with (words composer,
 * talk on ordinary days; owner, Nov 12: "the game says nothing at home"): the
 * work-spans engine's shift for today, before it starts (when they are on and
 * when they are done), after it ends (how long it ran), or none on a day off
 * from a job they hold. Each fact cites the job; the hourly pay cites it too,
 * for an answer about the day. Nothing at all without a clock, without a job,
 * or while the shift is under way (they are not home).
 */
~~~~

### src/director/conversation.ts · 3595fe5fe129

~~~~text
// The day ahead is news only when it is not the usual day: longer or
      // shorter than the job's usual hours (owner, Nov 12: a schedule line
      // that repeats daily tells nothing).
~~~~

### src/director/conversation.ts · 8f32844e9dcd

~~~~text
/**
 * One printed story as a subject the teller can raise: what it is about, by
 * the policy question it names, said as people say it, with where the teller
 * stands on that question from their own record. News is told in a person's
 * own words, never read out as a headline (owner, Nov 12: "sworn in, gives
 * inaugural address. What do you make of that?"): a story that names no
 * question, or one the teller holds no view on, is not raised in talk. This
 * holds for every kind of printed story, by what it is about.
 */
~~~~

### src/director/conversation.ts · 80264a2df55c

~~~~text
/** The address's points this talk already made: another may follow in the same talk (CTO, Nov 19). */
~~~~

### src/director/conversation.ts · 17f5be0e5be8

~~~~text
// Nobody is asked after while they stand there, or when they live with
    // both of them (owner, Nov 12: "Have you talked to Maya?").
~~~~

### src/director/conversation.ts · e83524c632ff

~~~~text
// Only someone who saw or heard the same address can be told about it: the
  // listener's own record of it, never the date (CTO, Nov 19 05:06Z on #9750).
~~~~

### src/director/conversation.ts · 2c91c17ce8c6

~~~~text
// The point of the address the speaker raises, from their own life, and
    // where they stand on it (owner, Nov 11: "the relative raises a real
    // thing the President said in that address and where they stand on it
    // from their own life").
~~~~

### src/director/conversation.ts · 1e839d252c08

~~~~text
// After a point this talk made, the talk may go on to another point of
    // the same address (CTO, Nov 19 10:48Z on #9750: the first evening's talk
    // goes on), never one this talk already made.
~~~~

### src/director/conversation.ts · 0fa5aebba221

~~~~text
// A point someone in the house made today comes after one nobody
            // made (owner, Nov 12: "basically saying the same thing"), but a
            // point is the speaker's own stand on it: with every point made,
            // they still make theirs (lead, Nov 13: two people in one house
            // agreeing or disagreeing on the same question is the scene).
~~~~

### src/director/conversation.ts · 3fe536994394

~~~~text
// Where the speaker stands politically, from the views engine's record of
  // their lean, said only as far as their tie to the listener and their
  // temperament allow (`./view-learned`). Once said, the listener knows it.
  // A stand is the speaker's own, given once: a question a housemate named
  // today is still theirs to stand on (lead, Nov 13: a fact is told once in
  // the house a day, a stand is not blocked by another's).
  // Right after an address point, the stand they give is on that point (CTO,
  // Nov 19 10:48Z on #9750: the listener's own view on that point comes first).
~~~~

### src/director/conversation.ts · 8445447bc8a6

~~~~text
// Who gave it, as a slot in its own case that the said-as reader words
  // once the talk is composed: the role the first time the screen names
  // them, then "he" or "she" (owner, Nov 12: "There needs to be pronouns and
  // titles", "saying the full name every time").
~~~~

### src/director/conversation.ts · 1187a13b4801

~~~~text
// What the President would do, and the President's side, for a policy
  // point; a year point is something the address said happened. Their own
  // stand, which the words follow.
  // The act is named in full (owner, Nov 12, through the pre-grade: "Do
  // what? 'Do that'?"): a stand says plainly what the speaker would or would
  // not have done, never a pronoun for it.
  // The act as a person says it, from the question's own names (the plain
  // verb phrase, and what an opponent says), never the speech's sentence
  // ("not raise tariffs", "a plan to ...": item 5 of the Nov 12 brief).
~~~~

### src/director/conversation.ts · f73a65452e08

~~~~text
// Only someone who would know says what it means here (owner, Nov 12:
  // "how the hell would she know?"): a person who holds an office in town
  // reads its laws and its figures as part of the work. Anyone else has no
  // source for them, and the question is not offered (pointAnswerable).
~~~~

### src/director/conversation.ts · c2c0466f8fe2

~~~~text
// How long it has been since they were at school together, the asker's
    // own sense of the years, after the player answers "Remember {school}?":
    // a question answered is followed up, never the talk's last word (owner,
    // Oct 15; the played talks at Cumming, Iowa, seed 7952d3f3e3253ee4, Nov
    // 15). After an answer that already said the years, they agree instead
    // (the stage the player's move names in the rules).
~~~~

### src/director/conversation.ts · 94166f3506f6

~~~~text
// Right after an address point, the listener's own view on that very point
  // is the first related subject (CTO, Nov 19 10:48Z on #9750).
~~~~

### src/director/conversation.ts · 6972e1209d8a

~~~~text
// A relative the listener has not met, by name, with their town or work
  // (owner, Nov 11: "This introduces people to their world").
~~~~

### src/director/conversation.ts · b4677bb4e0aa

~~~~text
/**
 * The key a listener remembers each topic the player talked over with them
 * under (owner, Nov 1: a talk with nothing new is no talk; remembering only
 * the last topic let two topics alternate forever).
 */
~~~~

### src/director/conversation.ts · f7e2eb24e43a

~~~~text
/**
 * After an answer that raised nothing, or a silence: the main topic may lead
 * to one related topic, then the other person closes the talk (owner,
 * Oct 14, 2026, night).
 */
~~~~

### src/director/conversation.ts · fa1fa948a9ff

~~~~text
// What the two did together each of them knows (the telling's shared
    // events): nobody who watched the address with the player asks whether
    // they saw it; they open on their own point of it, which weighs what
    // the address would (owner, Nov 12: "settle in to listen to the
    // president's address").
~~~~

### src/director/conversation.ts · 4fba5c691a42

~~~~text
// A story's question already named in the house today is behind the
    // player: a second housemate does not bring the same news (owner, Nov
    // 12: "basically saying the same thing").
~~~~

### src/director/conversation.ts · cc669a4a5587

~~~~text
// Where someone stands never opens a talk (owner, Nov 12: "a statement
    // of politics from nowhere"): it comes up only after the news that is its
    // cause, told in the same talk (conversation-rules.json related.news).
    // A stand opens a talk only with its own reason from the speaker's life
    // (their work or their money, `has-reason`), never from nowhere.
~~~~

### src/director/conversation.ts · 73231ee11d12

~~~~text
// News of something the two watched together is not news between them
  // (owner, Nov 12: the address's headline read out to someone who watched
  // it in the same room): it is not brought up.
~~~~

### src/director/conversation.ts · b7db1d9167f6

~~~~text
// At home, a scene with the household's hard news opens by asking for the player's attention
  // ("We need to talk.") instead of a greeting (owner, Oct 14, 2026, night: a
  // mother asking the player to sit down).
~~~~

### src/director/conversation.ts · d72cc4456798

~~~~text
// Hello and goodbye with nothing between is not a talk (owner, Oct 24:
    // "that should be going to the hi, have a good day. That makes no
    // sense."): with nothing on record to say, nothing is said.
    // The same for a hard-news opener with nothing after it.
~~~~

### src/director/conversation.ts · ab0dde467049

~~~~text
/**
 * The people a talk says by role, said once by role and then by pronoun
 * across the whole talk, its lines and the replies offered (said-as; owner,
 * Nov 12: "There needs to be pronouns and titles"). The President is the one
 * role talk says today.
 */
~~~~

### src/director/conversation.ts · 7b55e3208869

~~~~text
/**
 * An employer the talk is about is named once, then said as "work" (said-as,
 * `nameOnceThen`; owner via the coordinator, Nov 12: "a day off from Walters
 * Supply Company?" / "Walters Supply Company wears me out."), across the
 * talk's lines and each reply offered.
 */
~~~~

### src/director/conversation.ts · 4c6f47fea361

~~~~text
// People who live together know each other's work (owner, Nov 12: a
      // housemate asking "What do you do?").
~~~~

### src/director/conversation.ts · da4bdf696d77

~~~~text
// A lie about where the player is from names another place (owner, Oct 15:
    // never "Not here."): a place a relative or someone the player knows lives
    // in, else any other place the world holds people in.
~~~~

### src/director/conversation.ts · be1791c36e94

~~~~text
// A question put to the player is answered before anything is asked back
  // (owner, Oct 29): no reply to it opens with a question of its own.
~~~~

### src/director/conversation.ts · 4d41b39ae91f

~~~~text
// A reply's second move follows from its first (owner, batch 6): turning
  // the same question back ("I'm from here. And you?"), or asking about their
  // work after naming yours. Never an unrelated subject tacked on.
~~~~

### src/director/conversation.ts · f71fc143b179

~~~~text
// The replies the rules name for a line's move are its only replies:
    // after a question, and after news told with the teller's stand, which
    // is answered by agreeing, disagreeing or asking why, never a bare
    // "Wow." or "Really?" (owner, Nov 12: "the just non-replies").
~~~~

### src/director/conversation.ts · 915326a2d2a7

~~~~text
// A reply that ends on a question is offered only where the other person
    // can answer it (owner, Oct 29: "Did you see the President's address?"
    // answered "Oh, okay. What about you?"): it raises a subject they have,
    // asks them to tell more, or makes a move the talk answers (a request, a
    // plea to be left alone, a reaction). Else a wording that asks nothing
    // stands in, or the reply is not offered.
~~~~

### src/director/conversation.ts · 4878ad2d22ac

~~~~text
// A stand is answered by agreeing, disagreeing or asking why (owner, Nov
  // 12: "Good to know." is not a reply to a stand).
~~~~

### src/director/conversation.ts · 5b0aaebc805f

~~~~text
// A reply that only takes the line in ("Oh, I see.", "Alright.") says
  // nothing and gets nothing back: it is not offered (owner, Nov 12: "the
  // just non-replies"). With nothing else to say, the talk ends on their line.
~~~~

### src/director/conversation.ts · 95b6b660307c

~~~~text
// The owner's grade of each reply's move after the other person's line
  // (`movePairs`, "ask>note"): a pair graded unnatural is offered after the
  // ones that read right, one graded natural before them (owner, Oct 29:
  // calibration reaches every line). Ungraded, every factor is 1 and the
  // order is the reach order below.
~~~~

### src/director/conversation.ts · 06bc4158edfd

~~~~text
// Four replies are four answers, never one reworded (owner, Oct 27, 4 PM
  // Eastern: "four replies are four different answers"): a second wording of
  // a move already offered is not offered.
~~~~

### src/director/conversation.ts · 64ea4f79f755

~~~~text
// A talk between people who live together ends on its last line that says
  // something: nobody at home announces where they will be or that they will
  // check in (owner, Nov 12: "the same bullshit ... with the just
  // non-replies").
~~~~

### src/director/conversation.ts · aa0a17dbe67b

~~~~text
// Nothing new raised: the other person takes the answer in by the scene
    // engine's rule for the move it made (owner, Oct 29: one engine for every
    // line), in words written to answer it ("Sit with me a minute?" "Sure.",
    // never "That's what I thought too."), then carries on; after a request
    // or a plea to be left alone, their answer ends the talk. An answer that
    // only takes their line in ("Oh, okay.") gets none: the talk has no
    // answer to a note.
~~~~

### src/director/conversation.ts · 76ce2945ec01

~~~~text
// An answer says something or is not said: a bare taking-in ("Okay.",
    // "I see.") of an answer that asked nothing is a non-reply (owner, Nov
    // 12: "a useless interaction"); the talk carries on from its records
    // instead. Taking up a request ("Sit with me a minute?" "Sure.") stays.
~~~~

### src/director/conversation.ts · 80cd86773da1

~~~~text
// A yes never ends a talk (owner, Oct 15): after "Sit with me a minute?"
    // "Of course." they carry on with what they have. Where the answer
    // closes it ("Okay. I'll leave you be.", or they have nothing more),
    // their answer is the last word: no goodbye follows it.
~~~~

### src/director/conversation.ts · 41e30788df45

~~~~text
/**
 * Whether a question the player puts on the address's point can be answered
 * from what the other person holds (owner, Nov 12: "how the hell would she
 * know?"): what it means here needs this world's own record (the state's law
 * or the town's figure) that the player has not already heard today; what
 * they would do instead needs a stand of their own with a reason from their
 * own life. A dodge is never the whole answer, so with no record the
 * question is not offered.
 */
~~~~

### src/director/debate-sitting.ts · 4106b2056a6d

~~~~text
/**
 * The debate's part of the sitting (owner, Oct 26-29: interviews and debates
 * are scenes; the loop is `./sitting`). When the player says yes to a debate's
 * invitation, the meetings engine puts `debate-accepted` on the record and
 * the director stages the `debate-sitting` scene from it. This source finds
 * the debate that record is about, names the moderator who asks, the outlet
 * that hosts it and the tie, and holds the debate with the answers the
 * sitting collected (`answerDebate`): the other candidates answer from their
 * own positions at that moment. Everything else is the loop's.
 */
~~~~

### src/director/doors.ts · 41234cbd66e9

~~~~text
/**
 * The doors a candidate knocked themself today, from the campaign engine's
 * own records of who it reached (its causes table): each door that opened,
 * and whether the candidate had knocked there before. Of the day's doors,
 * a door whose resident has a cause on record first (a variant other than
 * the plain one), then the one whose resident most agrees or disagrees with the candidate's
 * platform (the cause's own agreement) is the household with a stake: the
 * owner's porch scene in a day of door knocking (Oct 8). While the
 * candidate's petition circulates, each door says whether its resident signed.
 */
~~~~

### src/director/family-stake.ts · f5336f7e2cc9

~~~~text
// Money: how many days the household's savings carry what its pay does
  // not (living costs less the wages its members' jobs pay, as the business
  // engine reads a founder's runway) against the days the race has left to
  // run. A household whose pay covers its costs has no money to say about it
  // (owner, Oct 28 sitting, 38: "who says the player is not campaigning
  // after work?").
~~~~

### src/director/filing-visit.ts · 828212cb1b07

~~~~text
// The clerk tells the candidate about the race before the paperwork
  // (owner, Oct 28 sitting, 32: "you're running for Trustee ... the primary
  // is this date and the general is this date ... here is what a trustee
  // does, here is the term"), from the contest's records, as one answer in
  // connected sentences, never a list of facts (owner, Nov 1: "it shouldn't
  // read as a list. That's not how normal people talk."): the statement of
  // the clerk's scene, and its replies are the player's choices.
~~~~

### src/director/filing-visit.ts · 05d7a1e381fd

~~~~text
/**
   * The player's filing at this counter, when there is one: they are back
   * for another race. Without one, this is their first visit, to ask for the
   * papers (owner, Nov 1: "You filled out the forms there").
   */
~~~~

### src/director/floor-debate-facts.ts · 51039db767e3

~~~~text
/**
 * What the floor's speaker may say beside the bill's number: what the bill is
 * about, whether the speaker wrote it, the reason the speaker can give in the
 * open, and how big the body is (owner, Nov 14: a three-seat board does not
 * talk like a legislature). Read from the legislature's own rows: the bill,
 * the speaker's position part by part, and the body's seats.
 *
 * The reason is the largest part of the speaker's position that leans their
 * way and is said aloud: their own view, the people they speak for, or that
 * the bill is their own. A deal or a lobby's pressing is never said on the
 * floor as the reason (Words lead, rule 103 and ruling Nov 14); that cause
 * stays on the record for the player to find another way.
 */
~~~~

### src/director/inaugural-address.ts · cdb9cb0094d6

~~~~text
/**
 * The address an executive office gives once its holder is sworn in (owner,
 * Oct 29: "depending on what your office is, you'll give a speech"). It is
 * recorded through the speech engine like every speech (`deliverSpeech`, the
 * one place a speech is recorded as heard), never by a second speech writer:
 * the people named in the room hear it, the views engine moves those it
 * persuades and each listener may retell it at home. The words are the English
 * engine's; this holds no sentence.
 */
~~~~

### src/director/interview-sitting.ts · ac106f4ea82c

~~~~text
/**
 * The interview's part of the sitting (owner, Oct 26-29: interviews are
 * scenes; the loop is `./sitting`). When the player says yes to an outlet's
 * invitation, the press engine puts `interview-accepted` on the record and
 * the director stages the `interview-sitting` scene from it. This source
 * finds the interview that record is about, names the reporter who asks, the
 * outlet and the tie, and publishes the interview with the answers the
 * sitting collected (`answerInterview`). Everything else is the loop's.
 */
~~~~

### src/director/journal-later.ts · cc499151b072

~~~~text
/**
 * What a Journal entry knows of the life after it (owner, Nov 24, page 1: the
 * Journal is a memoir told looking back; "if in 30 years you become a huge
 * healthcare guy, then the journal entry could update... Little did I know").
 * An entry's own facts are the records of its day. This is the one reader of
 * the person's later records, each with the ids it stands on: the first
 * office they went on to hold, the policy area of the bills they went on to
 * sponsor, whether one of those bills answers the same policy question the
 * entry is about, and the years between. It writes no words; the English
 * engine's lines read the facts, and an entry whose lines name none of them
 * reads the same as before.
 */
~~~~

### src/director/journal.ts · 2f401a002183

~~~~text
/**
 * The household's own story, read from the records the engines ran for the
 * years before the start (owner, Oct 28, 2026: "simulate to the birth
 * year"): the day the person and their partner set up home and the day their
 * parents did (`family.partnered`, the people engine), where the family came
 * from (the place of their recorded birth), a parent's new job they were old
 * enough to remember (the working-life run), the first school they attended
 * (the school engine's run), what the household's earners do now (their
 * jobs' records), and each parent and sibling the family records name. Each
 * moment cites its record's id; the place is named from the place records,
 * and a person only the writer knows by name is skipped.
 */
~~~~

### src/director/journal.ts · 8c6c066daf24

~~~~text
// Their own birth, where the run's record puts their family that day: the
  // story starts there (owner, Oct 27: "written like a story from birth").
~~~~

### src/director/journal.ts · cbcc79732927

~~~~text
// A child is born with a name: "My daughter Jane was born." (owner,
      // Oct 15). A second child already said by name keeps it alone.
~~~~

### src/director/journal.ts · 134492f6cd70

~~~~text
// A relative with their name, so a line carries its subject ("My
        // daughter Jane was born."; owner, Oct 15, evening).
        // With the name said, two daughters are each "my daughter ...".
~~~~

### src/director/journal.ts · 04d4fe1d41eb

~~~~text
// An entry is told looking back (owner, Nov 24, page 1): beside the facts of
  // its own day it carries what the person's later records say, with their
  // ids, as of the page's last day (journal-later.ts).
~~~~

### src/director/journal.ts · ef49f66bab8c

~~~~text
/**
 * The look-back when a life ends (owner, Sept 28): each chapter's opening
 * line, in order, from the same records. The death itself is not worded: no
 * mined sentence says it from these records, so it is left out.
 */
~~~~

### src/director/ledger.ts · 548a64fa10b3

~~~~text
/**
   * Memories keep what matters and summarize the rest (owner, Oct 11). Moments
   * older than the recent window fold into a month's summary by label, except
   * the strongest by hindsight and any scene still waiting. A forgotten
   * moment's impact stays on its pair's thread, so importance is unchanged.
   * The player keeps every moment: the journal is theirs.
   */
~~~~

### src/director/ledger.ts · 49b29dbaa813

~~~~text
// A setting with no hours of its own keeps the player's day: nothing
    // stops the clock at midnight (owner, Oct 27).
~~~~

### src/director/local-address.ts · b6d7e54a7c7f

~~~~text
/**
 * A governor's State of the State and a mayor's State of the City (owner,
 * Nov 8: addresses by "the President, and governors' and mayors'"). It is the
 * same address the President gives, at a smaller scale, planned by the same
 * one outline planner (speech-outline.ts) from its own outline row: one theme
 * from the speaker's record and the term read of the state's or town's areas,
 * each point context, stand and ask, and each ask said once to the level that
 * can act. This file says who speaks, on which day, and what their realm's
 * term read is. The English engine writes every sentence; the address is
 * recorded as a public event the news carries and the household watching it
 * can bring up, like the President's.
 */
~~~~

### src/director/opening-facts.ts · a9c3c406675d

~~~~text
// The outline's own record of each point fills what the sentences left
  // out: a speech that only asks to be held to a question names no stance
  // or verb phrase in its sentence, but the plan that chose the point holds
  // the President's side, and the question's names hold the rest (owner,
  // Oct 28: every view reads the same record; the sentences are a view of
  // the plan, not a second source for it).
  // Only a point the speech said aloud is one a listener can raise: a planned
  // point no sentence names is not in the address.
~~~~

### src/director/opening-story.ts · 7ad7754fe5e4

~~~~text
/**
 * The opening, told as a story (owner, Oct 14, 2026): the President's address
 * about the world the simulation made, that night's evening news, then the
 * player's household at home that evening, where the news can be picked up. Everything said comes from
 * the English engine's mined banks with the world's records in its slots,
 * composed once while the world loads; a sentence the records can't support
 * is left out, never written.
 *
 * - It opens on the address itself, the President speaking with the Vice
 *   President and key people pointed out; home comes after the governor and
 *   the family (owner, Oct 26, 2026).
 * - The address reads the macro engine's opening month against the year
 *   before, saying a figure with what it is, never a bare claim ("Prices are
 *   too high"); the President's own three issues (an ask of Congress only
 *   for an issue the President supports); a place only from a campaign visit
 *   to the player's own state; a governor's name only when the scene
 *   introduces the governor; and the Speaker's recorded gender for the
 *   salutation.
 * - Each person the camera points out is there for a recorded reason: the
 *   sentence that names them, or the player's own household.
 * - The news reads the address as that night's lead story and the town's own
 *   lead story that day (a closure, a hazard, a death, else its jobs figure).
 * - The address is recorded once as a public event, so the news engine
 *   carries it to the town and anyone who hears it can bring it up; the whole
 *   opening is kept on the director's ledger for the screens.
 */
~~~~

### src/director/opening-story.ts · c2b9194eea3c

~~~~text
/**
 * The people an address names, by the fact key of their slot (owner, Nov
 * 12: "who's Kathryn Hansen?", "There needs to be pronouns and titles."). The
 * shared said-as reader (src/english/said-as.ts) says each from the address's
 * telling: "Vice President Kathryn Hansen" at first mention, then "the Vice
 * President" or "she". A slot names the case its place in the sentence needs:
 * `-object` ("with her beside me"), `-possessive` ("her counsel"); a slot
 * ending `-addressed` speaks to the person, with title and name.
 */
~~~~

### src/director/opening-story.ts · 7c609c548379

~~~~text
// A subject is named once, then said another way (owner, Nov
            // 12: "good news on a stronger economy ... report on a stronger
            // economy"); the greeting and the close may name it once more.
~~~~

### src/director/polling-place.ts · c954efc01267

~~~~text
/**
 * Election day at the polls (owner, Oct 14, 2026): election day is a scene,
 * and the ballot is the scene's choice. Going is the player's choice (owner,
 * Oct 26): on the eve of an election the day offers the polls, and a voter
 * who goes marks a ballot there, one who stays home casts none.
 *
 * The one polling-place path (engine map line 25): at the close of the eve,
 * the director stages the polls for each watched person the voting engine
 * counts as a voter the next day (`mayVoteOn`, the count's own rule), as the
 * director's own visit record; the bench reads that record (`stagedPollingVisit`)
 * and builds the ballot from it. The contests on the ballot are the elections
 * engine's, each candidate as the ballot lists them, and what the voter marks
 * is cast through the voting engine's own `castBallot`, so the count when the
 * polls close reads it. The scene filter decides whether the visit is staged:
 * a voter who leaves the polling place out of the scenes that stop their day
 * votes or stays home on their own reasons, like everyone else. Words come
 * from no hand-written bank: the screen shows the ballot's record data and
 * control names.
 */
~~~~

### src/director/purpose-scene.ts · 37811dd27092

~~~~text
// A notice to pay or leave (housing.ts): what the household owes as people
  // say it ("about $400"), how long it has gone unpaid, whether the shortfall
  // is small or deep against the rent, and the day it must pay by. The lines
  // are worded to fit all of it (owner, Nov 8 playtest: "that far behind" of
  // a $14 shortfall).
~~~~

### src/director/purpose-scene.ts · 61fecd373c29

~~~~text
// The finding a reporter calls about (press.ts press.exposed): a bribe, by
  // who paid it and the vote or contract it bought; a conflict, by the award,
  // the firm and whose it is. The reporter says what the story says, not only
  // that there is one (owner, Nov 15). Every exposure ran after the reporter
  // dug through the paper trail (press.ts weighTip), so the papers are in hand:
  // a denial is a lie the reporter can show is one (`knows-truth`).
~~~~

### src/director/purpose-scene.ts · 49c9a8ef96de

~~~~text
// What the petition the filing opened asks (owner, Oct 28: filing is a
  // petition, signatures, the clerk's check, then the ballot): the
  // signatures and the day they are due, or that the office takes none.
~~~~

### src/director/purpose-scene.ts · c605b7e3c3ee

~~~~text
// How it passed, said as people say it, never as a count (owner, Nov 14
  // 00:50Z; Words lead rule 50): nobody against it, enough to override a
  // veto in every chamber, or short of that, by the chambers' own tallies.
~~~~

### src/director/purpose-scene.ts · e054b0d6e80e

~~~~text
/**
 * The first filing of a life (owner, Nov 1: "it should be the first time in
 * a game that the player files for an office... do you know how to run a
 * campaign?"): the clerk asks, and a candidate who says no is walked through
 * it from the place's records, the petition and the town's own paper, whose
 * ad time a campaign buys and whose reporters cover the race. A second filing
 * is not asked again.
 */
~~~~

### src/director/reach.ts · a8288c891144

~~~~text
/**
 * Which situation types fired in a played year, and for each that did not,
 * why (owner, Oct 15: nothing fires without a recorded cause, and a quiet
 * day fires nothing). A type that fired names the moments and their cause
 * records. A type that did not says whether its producer is not built yet,
 * whether no record in the year matched it, or whether a matching moment
 * stayed a journal line under the person's pace.
 */
~~~~

### src/director/relation-facts.ts · 15feb55a6de5

~~~~text
/**
 * How two people stand, read once from the records (owner, Nov 15, part 1c:
 * one reader for the talk box, the scenes and the Journal). `askerId` is the
 * one who comes to the other (the player calling, the one who asks in a
 * scene); `askedId` is the one who answers. Kin, acquaintance, closeness and
 * the side of the tie all come from here; nothing else re-reads them.
 */
~~~~

### src/director/reply-set-check.ts · 51da0cf96e5e

~~~~text
/**
 * A talk offers up to four replies, and the scene sets the count (owner,
 * Nov 10, 2026: "it's also allowed to have less than 4 options sometimes...
 * So just up to 4."). One to four, every one a different answer: no two share
 * a move or say the same text. Fails on none, on more than four, and on two
 * replies that are one answer reworded.
 */
~~~~

### src/director/scene-talk.ts · 0056d7da517d

~~~~text
/**
     * The answer of one whose price is taken up (`carries: "price"`), and of
     * one asked only to stay out of the room who agrees (`carries:
     * "absence"`). Each is offered only where the record holds the act that
     * pays it (brief O; owner, Nov 14: only what the game can do).
     */
~~~~

### src/director/scene-talk.ts · 04c480710e93

~~~~text
/**
 * How a person takes in what the player answered in an everyday talk, by this
 * engine's own rule (owner, Oct 29: one engine for every line, and calibration
 * reaches all of it): the `talk` purpose's answer moves for the move the
 * answer made, each worded from the scene bank fitted to it (`after` names
 * the move, `afterPiece` the talk's subject and choice), the one the
 * speaker's traits lean to most, a tie by the stable hash. Null where no
 * answer move has words. `closes` when the answer ends the talk.
 */
~~~~

### src/director/scene-talk.ts · 7b40cb023a1b

~~~~text
// The player does the asking (owner, Oct 14: convince one member to
  // switch): the player says the purpose's asker lines and the one asked
  // answers in its asked lines, the player's lines the choices. The one asked
  // answers from where they stand, never by a roll: asked plainly, yes only
  // if they already lean for it, not yet if a favor would carry them, no
  // otherwise; asked again, the favor carries them where it would at the
  // roll and pressing holds them where they stood (the arc's `asks`).
~~~~

### src/director/scene-talk.ts · 7ca9e210c60f

~~~~text
// The first exchange never wraps the scene up where the asker has a
      // question or a push left (owner, Oct 16: "quick resolution. That's
      // not how normal people talk"); the last round never leaves one hanging.
~~~~

### src/director/scene.ts · 43579527a271

~~~~text
/**
   * The scene's first line, naming the day, the place and the person the
   * player meets (owner, Nov 8). It is the narration's first sentence; a
   * scene that plays another narrator's words (an exchange with a purpose)
   * opens on it unless those words already name the day.
   */
~~~~

### src/director/scene.ts · 0a10ed7684f8

~~~~text
// Every scene opens on one line that names the day, the place and the
  // person the player meets (owner, Nov 8: "If it's June 7th, it says first
  // thing on June 7th. You head to the clerk's office and speak to Maria
  // Patton. And then it starts like that."), which replaces the line that
  // only said a call or a letter. It supersedes Oct 26 and 27's "never the
  // day or the place", which were about restating the screen's own labels.
~~~~

### src/director/scene.ts · da11afb9c4da

~~~~text
// What happened, by the cause record's own facts: a first line
          // never says it is about something without saying what (owner,
          // Nov 15: story points come with context). A cause that names no
          // happening (a tie that grew, a speech heard) opens on the plain
          // first line. The day it happened is not said: the line already
          // opens with today (Words lead, Nov 15).
~~~~

### src/director/scene.ts · 2ef676aaf2b7

~~~~text
// Said as people say a sum ("about $6"); the Journal and the
              // books keep the exact figure (CTO, Nov 18, on #10190).
~~~~

### src/director/scene.ts · 2a46f8e7a261

~~~~text
/**
 * The outlet that carried a broadcast to the player's home: the first of the
 * place's own outlets in the order local-address.json `heard` gives. Its
 * station is what the talk box names over the line (owner, Oct 14: "News you
 * overhear: TV or radio speaks like anyone else: a small card in the
 * conversation text style with a tiny radio/TV icon, the station, and the
 * line.").
 */
~~~~

### src/director/scheduling.ts · 38ce0daa4b59

~~~~text
/**
   * A scene that is an event in itself (a swearing-in, owner Oct 29; a
   * person's own first date, the proposal they are asked, the birth of their
   * child, family life report 1, Nov 14): it stops the day however strongly
   * the moment was felt, for the one whose record it is.
   */
~~~~

### src/director/scheduling.ts · 08d76829fc9d

~~~~text
/**
   * The player's office stop this scene's stop follows (a desk visit follows
   * the desk switch): switched off, the scene does not stop the day, and
   * nothing is decided for the player (owner's card, Nov 14, 02:03Z).
   */
~~~~

### src/director/scheduling.ts · 32ac9901cfc3

~~~~text
// A friend asks only for what the game can settle now (the Words lead,
  // Nov 15; owner's ruling: a colleague asks only for what the game can do):
  // the next posted town meeting the player may come to. With none, the
  // scene is not staged rather than dropped at its request.
~~~~

### src/director/scheduling.ts · 259b3644de19

~~~~text
// News from the household's own records (a parent's lost job, a death, a
  // serious illness) is a family scene at home whatever its size (owner,
  // Oct 14, 2026, night: the director picks the family scene the
  // household's records make apply).
  // A record of the whole household (an eviction) is a family scene for
  // each of them, with no one else named.
  // A record of one's own life that names them (a filing, the count of their
  // own race, a story against them) is met where its scene is set that day:
  // at home, or for an officeholder at the office or by phone.
~~~~

### src/director/sitting-ties.ts · 3703e31a9190

~~~~text
/**
 * The ties every kind of sitting gives its lines (owner, Oct 26-29: interviews
 * and debates are scenes; the loop is `./sitting`): how the asker stands with
 * the candidate, and the outlet that hosts it. Each is a fact the bank's pieces
 * are fitted by, citing the records it rests on.
 */
~~~~

### src/director/sitting.ts · 45a574525a91

~~~~text
/**
 * The sitting (owner, Oct 26-29: interviews are scenes). A candidate who said
 * yes to an asker (a reporter's interview, a debate's moderator) sits for it
 * in the conversation engine: the asker puts each of the sitting's own
 * questions as a line, the player picks how to answer each (plainly, with a
 * further fact from their record, by turning it back on a rival, or briefly;
 * the lie where their record allows one; or says nothing), and when the last
 * question is answered the engine that made the sitting publishes it with
 * exactly those moves.
 *
 * This file is the loop and knows no kind of sitting. A kind brings a source
 * (`SittingSource`, one per kind: `./interview-sitting`, `./debate-sitting`): how to find the
 * sitting a talk is the occasion of, who asks, which questions, and how to
 * publish. Its settings (the record it stages from, the bank subjects) are a
 * row of `data/sittings.json`.
 *
 * Nothing is typed here. Every line is a piece of the conversation bank
 * (`data/english/parts/conversation.json`), and a piece is said only when the
 * record holds the fact it needs: a vote to stand on, a rival with a stand of
 * their own. What the platform the player filed says (else what their own
 * views, votes and party hold) is their stand; the sitting never answers
 * for them. A question the asker cannot put in words is
 * left unanswered, and only then does the filed platform stand in.
 */
~~~~

### src/director/sitting.ts · 1b6eaf08674c

~~~~text
/**
 * The asker takes an answer in (or the silence), in words written for the
 * move, about what was just said: the question's own facts (what it was
 * about, the vote, the rival) and the side the answer put on the record
 * (`said-for`, `said-against`, `said-none`), so the take restates the
 * candidate's answer and never only acknowledges it (owner, Nov 12: "the
 * just non-replies").
 */
~~~~

### src/director/speech-builder.ts · 7a9711b5d52d

~~~~text
// The world around them (owner, Nov 8: "start with laws and effects and the
  // world around you"): the areas of the speaker's town that moved most since
  // the term began, bad news with the remedy it presses on the town's officials
  // as a stand, good news as a thing worth saying.
~~~~

### src/director/speech-outline.ts · 2a6d0eb69bd8

~~~~text
/**
 * The one outline planner every speech goes through (words composer, unit 3,
 * docs/design/words-composer.md; owner, Nov 12: "don't only just make changes
 * just for the president's speech. This should apply to all speeches ... the
 * problem is the engine"). The President's inaugural and State of the Union,
 * a governor's State of the State and a mayor's State of the City are each a
 * row of `src/director/data/speech-outlines.json`: its sections in order, how many points
 * and asks it carries, whether its asks are numbered and whether the past
 * year may be told as the speaker's own record. The planner reads the row and
 * the world and returns the blocks `composeBlocks` words:
 *
 * - **One theme** (owner, Nov 12: "There's no theme for the speech. That's a
 *   problem."): the bill catalog's subject the speaker's own signature
 *   issues, the strength of their stands and the world's conditions point to
 *   (`themeOf`). Only that subject's points, asks and figures are said.
 * - **Each point is context, stand, ask** (owner, Nov 12, 1:05 a.m.: "it's
 *   okay if context is given ... that just establishes context in a smooth
 *   way"): one sentence from the world's records over a span (how long, how
 *   much), then the speaker's stand on it, then the asks.
 * - **Each ask once, to the level that can act**, ranked by the speaker's own
 *   signature issues in the theme first, so asks differ between worlds and no
 *   one question leads every speech ("why is it always stock trading?").
 * - **No home state**, and an inaugural tells no record the speaker did not
 *   make ("is he gloating from his predecessor?").
 *
 * The research behind the rows is docs/research/speech-structure-2026-11-12.md.
 * Nothing here reads a dice roll; ties go by name.
 */
~~~~

### src/director/speech-outline.ts · c8e03225e4db

~~~~text
/**
 * What the story can say about each of the country's subjects: the claims
 * its record supports, in words and never as a figure (owner, Oct 27: "No,
 * none of that real data in there"; Nov 1: "I don't like where this part of
 * the speech where it just laces statistics").
 */
~~~~

### src/director/speech-outline.ts · 7d0e3e9c8adc

~~~~text
/**
 * The world's names and subjects any part of the address may say, each from
 * its record (owner, Nov 11: "a ton of different inserts ... This introduces
 * people to their world"): the Vice President and the Speaker by name (said
 * with their title at first mention and by role after, in `composeBlocks`),
 * the President's last office, and the theme's hardest and best subject in
 * words (the one of the theme's measures that moved furthest the wrong way,
 * and the right way). A part says what it needs of these and is left out
 * where the record holds none. No home state and no ask: the theme's asks are
 * said in their own section, to the level that can act.
 */
~~~~

### src/director/speech-outline.ts · bb9905deb3cd

~~~~text
// No home state: a speech names a place only where its section is about
  // that place (owner, Nov 12: "Why Georgia?").
~~~~

### src/director/speech-outline.ts · 877ed4204fa0

~~~~text
/**
   * The part of the address the block is said in: the talk box plays one
   * part per Continue (owner, Oct 28 sitting, 11 and 41: "Each Continue can
   * carry a paragraph"). Blocks with the same part are one paragraph.
   */
~~~~

### src/director/speech-outline.ts · 131aa7516e84

~~~~text
/**
 * Whether a speaker at this level speaks to a question: a question the
 * catalog gives to the states as well as the nation is the governors' to
 * speak to, so the President speaks only to the nation's own (owner, Nov 12:
 * "If it's a federal law, it's a federal law"; its "today" sentence is about
 * the states, not the country).
 */
~~~~

### src/director/speech-outline.ts · 2c72295ddada

~~~~text
/**
 * The context of a measure, from the world's records over a span (owner,
 * Nov 12: "for 30 years we've suffered from terrible inflation, averaging out
 * to over 12% per year"): how many whole years the macro engine's months
 * cover, and the measure's average over them. For an area of the term read,
 * the years since the speaker took office. Empty when the span is too short
 * to say.
 */
~~~~

### src/director/speech-outline.ts · 77767e6ce221

~~~~text
// The kind of address (owner, Nov 8), from the world and the speaker.
~~~~

### src/director/speech-outline.ts · f6fff534ecdd

~~~~text
// The world's story the address opens on, before the speaker's own issues
  // (address-story.ts; owner, Nov 16: "maybe it's warning because ... the
  // economy's been terrible ... or maybe corruption"): its row orders the
  // sections, so a warning and a brag do not share a skeleton.
~~~~

### src/director/speech-outline.ts · 7df989f4aef3

~~~~text
// Which side the ask took, so a close that holds the speaker to
            // it says the side the speech asked for (CTO, Nov 19).
~~~~

### src/director/speech-outline.ts · 8ad206fcaf6e

~~~~text
// Each point, one paragraph (owner, Nov 12: "disjointed statements put
    // together"), in one of several shapes (`pointShapes`): how its question
    // stands today, as the speaker's side describes it; its figure, only
    // where the question's row lets that side use one, tied to the question;
    // what the speaker believes, by the question's family and the speaker's
    // pole of it; and the ask, plainly for or against.
~~~~

### src/director/subject-tie.ts · 160928c5067e

~~~~text
/**
 * The tie rule for what a talk is about (Words lead, Nov 16, rules 146 and
 * 156; owner, Nov 16: "why is every update of the engine not making
 * everything better at the same time?"). A Subject is raised only when it has
 * a recorded tie to the speaker or the hearer: a record of the speaker's or
 * the hearer's own life, a stand they hold, the place they live in, a law
 * that reaches them, or a frame they both stand in. The check lives once,
 * here, where any Subject is accepted into a talk (`acceptSubjects`, called
 * by `subjectsBetween`): a Subject with no tie is refused whoever built it.
 * A builder that raises a story, a change or any outside event supplies the
 * tie it found; a Subject made of the speaker's or hearer's own record is
 * tied by its kind (`OWN_RECORD_KINDS`).
 */
~~~~

### src/director/swearing-in.ts · c0a4e3b324ab

~~~~text
/**
 * Taking office is an event (owner, Sept 22 and Oct 29: "swearing in needs to
 * be an event ... that's just a scene ... depending on what your office is,
 * you'll give a speech"). The offices engine writes `took-office` when it
 * seats someone; this reads that record for the swearing-in scene
 * (`src/director/data/situation-types.json`, type `swearing-in`): the office
 * and seat it names and who stands in the room (the oath's giver is cast with
 * the other civic roles, `civic-roles.ts`). It writes
 * nothing and holds no sentence: the English engine words every line, and the
 * address an executive office gives afterward is `inaugural-address.ts`.
 */
~~~~

### src/director/talk-heard.ts · f5b9a97e9dbd

~~~~text
/**
 * What the player already heard today from anyone in the household (the
 * telling's "said today"): the wording pieces, kept as the player's own
 * knowledge, one key per piece, learned on the day. A wording heard today is
 * not picked again that day, so two housemates never give the same sentence
 * (owner, Nov 12: "basically saying the same thing").
 */
~~~~

### src/director/tooling/director-year.ts · 35a30900a4d9

~~~~text
/**
 * P13 proof runner: one generated town, one year on the new core, with the
 * story director watching chosen lives. Developer tooling only; run in a
 * cloud environment, never on the owner's Mac.
 *
 * Input: a prepared core input written by the core's measurement tool
 * (`npx tsx src/core2/tooling/measure.ts --mode opening
 * --prepared-input-output <file>`), so the town, seed and player are the
 * core's own. Finance is bound the same way the core's finance year binds it.
 *
 *   npx tsx src/director/tooling/director-year.ts --input <prepared.json>
 *     --output <receipt.json> [--through 2022-01-01] [--watch <id> ...]
 *     [--cohort-employer-of <id>] [--timing-only base|director]
 *     [--with-drives true]
 *
 * --with-drives installs the drives and health modules from the drives
 * package (P10, pull request 3922) when they are present in the checkout;
 * they are loaded at run time so this tool does not depend on that package.
 */
~~~~

### src/director/types.ts · e3d48ea44657

~~~~text
/**
   * What the person keeps only in summary (owner, Oct 11: memories keep what
   * matters and summarize the rest). Forgotten moments by month and label,
   * forgotten broad events' impact by event, and old backdrop by kind.
   */
~~~~

### src/director/types.ts · fe444a636dfe

~~~~text
/**
 * A voter's election-day visit (owner, Oct 14, 2026: election day is a
 * scene): the contests on their ballot, what they marked, and whether they
 * voted or left. The voting engine counts what was marked (`castBallot`).
 */
~~~~

### src/director/types.ts · 08c2056eb6bb

~~~~text
/**
 * The player's interrupt setting (owner, Oct 14, 2026): which kinds of scene
 * may stop the day, by situation type. The director's scheduling reads it
 * whenever it decides a moment's outcome.
 */
~~~~

### src/director/vote-stand-facts.ts · bf2879288b61

~~~~text
/**
 * What the record says a person did on a bill they voted on, and why, so a
 * scene's replies are placed by it (rules 110 to 113, owner's feedback on the
 * reporter's call, Nov 14 2026): a reply never says the opposite of the vote,
 * a "why" is answered by a reason the record holds, and the scene can open on
 * what just happened. Any scene whose cause names a bill the asked person
 * voted on reads it, not only the reporter's call.
 *
 * Read from the legislature's own rows: the member's row of the roll (their
 * vote, their position part by part as the floor weighed it, the trades they
 * took), the chamber's count and the body's own office row.
 *
 * - `acted` and `voted-yes` / `voted-no`: they have voted, and which way (a
 *   cause that sets its own `voted-*` keeps it);
 * - `bill-passed` / `bill-failed`: what the chamber did, from its count;
 * - `body`: the body said short ("the council"), from its office row;
 * - `reason-*`: every part of their position said aloud that leans the way
 *   they voted, the floor's reasons (`own-view`, `people`, `own-bill`, the
 *   floor's `publicReasons`) and two the floor never says but a member does
 *   after the vote: a trade they took (`deal`) and their own last vote on the
 *   question (`last-vote`). The person playing chose their vote, so their own
 *   view is always one of their reasons;
 * - `against-people`: the town's lean pulled the other way;
 * - `wrote-bill`: the member is the bill's sponsor, read off the bill;
 * - `top-reason-*`: the two largest parts of their position that lean the way
 *   they voted, among the ones a member says to a reporter: their own view
 *   (`own-view`), the people (`people`), the bill's author (`own-bill` when
 *   they wrote it, `sponsor` when they trust or distrust who did), a trade
 *   they made (`deal`) and their party (`party`, state and federal members).
 *   A reporter asking "why" hears one of these (Words lead, Nov 15); none is
 *   set when no part leans their way or they voted against their own bill,
 *   and only the ones the bank words are set (`WORDED_REASONS`). A lobby, a
 *   wing, ambition and the press are never said as a reason.
 *
 * Each fact cites its records; a part with no record behind it is left out.
 */
~~~~

### src/director/who-they-are.ts · aff226964bbf

~~~~text
/**
 * What a person is to the player, from the records, said once after their
 * name the first time a narration names someone the player has not met
 * (owner, Nov 15, rule 136: "the narrator should give you context. Jose
 * Salgado, who is the ranking chair member or whatever ... this is an
 * engine-wide thing"). One reader for every scene at every level: it returns
 * a kind and its slots, never words; the said-as reader words it from
 * `data/english/said-as.json` `whatTheyAre` (the Words lead's lines).
 *
 * The kinds, first that holds, by what matters in a scene:
 * 1. office: a seat they hold (offices and officials engines) or a post they
 *    were appointed to (the executive engine), said by the office-name
 *    reader (`officeSaid`); a presiding officer with a title of their own
 *    ("Speaker") is said by that title.
 * 2. staff: an aide of an official (the staff engine).
 * 3. constituent: someone in the town a seat the player holds covers.
 * Someone none of these holds for is named alone. Only kinds a scene the
 * player reached by their own presses has said are read (lead and Words lead,
 * Nov 16); the others' lines wait in the Words lead's lines.md, and pool item
 * director-narrator-says-who-a-person-is lists them.
 *
 * Nothing is returned for someone the player has met (the met record, #9489's
 * `relationFacts`), family, a partner or a housemate: the first name says
 * enough there.
 */
~~~~

### src/director/who-they-are.ts · ccc7d22a4abd

~~~~text
/**
 * Why a scene names `otherId` the way it does, for dev mode's trace (owner, Nov 16: what a
 * session traces by script, dev mode shows in the game): the phrase said after the first full
 * name and the kind, stage and records it came from; or why they are named alone: family or
 * household, met before (which arm and its record), the scene type's own line saying who they
 * are (said-as.json sceneSaysIt), or nothing on record. The same reads the narration makes, so the
 * trace cannot drift from what is said.
 *
 * `asOf` is the scene's day, for a scene already played: whether they had met is read from the
 * met records' own dates, as the narration read it then. A first sitting together counts on its
 * own day (the narration reads shared hours as they stand that day); every other record only
 * before it, so someone a scene introduced is not "met" in it. A record dated later is returned
 * as `metLater`. The kind (an office, an aide, a constituent) is read from today's rows.
 */
~~~~

### src/director/yearly-address.ts · 53d55a32d9c0

~~~~text
/**
 * The President's address to Congress in each year of play (owner, Nov 8:
 * "In a ten-year run no two addresses read alike, and a bad year sounds like
 * one"). On the day the federal calendar sets for the joint address
 * (`jointAddress`, src/core2/office-day-federal-calendar.ts) the address is
 * composed from the world as it stands and recorded as the same public
 * event the opening is, so the news carries it, the household watching it
 * at home gets the `address` scene and anyone who heard it can bring it up.
 * The kind it takes (a crisis of confidence, hopeful, combative, a victory
 * lap, mourning, a policy push) and the subjects it tells come from the
 * term read by area, the economy and the President's traits (opening-story.ts
 * and address-kind.ts); this file only says which day.
 */
~~~~

### src/english/calibration.ts · bbc97b6040a0

~~~~text
/**
 * The calibration table the English engine reads (owner, Oct 15, 2026: "every
 * word is a data point calibrating the entire engine"). Weights only: no
 * scenario text, no scene script, no if-this-town-then-that. Nothing here
 * names a place, a person or a situation's wording. The table
 * (`data/english/calibration.json`) holds, all TUNABLE with the spread each is
 * checked against:
 *
 *   per trait      a pull toward each bearing and toward longer or shorter lines;
 *   per register   the target length in words and sentences;
 *   per move pair  whether that arrangement read naturally.
 *
 * No weight here depends on how the owner graded a line. A line plays or it
 * does not: his grades hold lines back (`english-grades.ts`) and his rules
 * pull them (`line-rules.ts`, `bank-parts.ts`). Among the lines that play,
 * the pick is the stable seeded choice, moved only by the speaker's traits,
 * the register's length and the move before.
 *
 * `scripts/dialogue-batch/apply-grades.ts` folds the bench's grades of trait
 * fit, length and naturalness in; the engine reads the table when it chooses
 * a piece (`english-composition.ts`) and ranks a reply
 * (`src/director/conversation.ts`). Every function is pure and deterministic
 * (no randomness), and an empty table returns 1 or 0 everywhere.
 */
~~~~

### src/english/composed-checks.ts · b856622f4557

~~~~text
/**
 * A line of narration that opens on a clock time or a date (owner, Nov 24:
 * "shouldn't really say this because the date is in the bottom left"; "you
 * already know what day and time it is"). Naming the occasion ("It's the
 * evening of January 20.") is not listed.
 */
~~~~

### src/english/composed-checks.ts · 56fdd788584f

~~~~text
/**
 * The policy phrase a spoken line holds, when its filled text names a policy
 * by the bill catalog's policy name or by the question's `about` noun phrase
 * (owner, Nov 24, on a mother's "So the President wants a higher top income
 * tax rate": "No person would say that. They'd be like, finally, someone
 * wants to tax the rich"; Nov 23: "random ass laws like ban the box public
 * hiring. What does that mean?"). Null when the line names none.
 */
~~~~

### src/english/composed-checks.ts · db0c1d522d0b

~~~~text
/** A spoken line that quotes a rate, a percentage, an index or a statistic (owner, Nov 14: people say how it sits, not the figure). */
~~~~

### src/english/composed-checks.ts · 2644759937a8

~~~~text
/**
 * A line that names the month a vote comes ("come November") when the
 * world's election calendar holds no election in that month within the year
 * after the line is said (owner via the coordinator, Nov 12). A sample with
 * no calendar is read as holding none.
 */
~~~~

### src/english/composed-checks.ts · 377eba9e88eb

~~~~text
/**
 * An organization named more than once in one spoken exchange (one screen's
 * lines and the replies it offers): after the first naming it is said by the tie,
 * "work" or "school" (said-as ownPlace; owner via the coordinator, Nov 12).
 */
~~~~

### src/english/composed-checks.ts · 3537db8c0cd1

~~~~text
/**
 * A name said only to say the person is there: a speech sentence that opens
 * "With <name> here," does no work for the point after it (owner, Nov 16:
 * "With Vice President Sandra Solomon here, I'll tell you plainly... what
 * does that have to do with anything?").
 */
~~~~

### src/english/composed-checks.ts · 17cf25b8ad08

~~~~text
/**
 * A speech's close that names nothing from what the speech said (owner, Nov
 * 16, of "That's the work in front of California, and I thank you for
 * hearing me out.": "She didn't really say anything that's in front of
 * it."): the last line shares fewer than `closeSharedWordsLeast` subject
 * words with the screens before it, places, people and the close's own
 * frame words (`closeFrameWords`) set aside.
 */
~~~~

### src/english/conversation-words.ts · e82288e3b008

~~~~text
// A line with reasons on record is composed: one of its wordings as the
  // core, then a reason the engine joins after it when the facts it names are
  // on record (owner, Nov 11: "a ton of different speech versions").
~~~~

### src/english/english-newscast.ts · 7f2dffcbcdad

~~~~text
// A closing is told, not listed (owner, Nov 1: "none of this is a
    // story"): who ran it, how long and why it closed in one sentence, then
    // what it leaves the people who worked there.
~~~~

### src/english/english-newscast.ts · 8bd64e6851a9

~~~~text
// The week's sittings that took up nothing, in one brief (CTO, Nov 1:
  // print what the body did, not that it sat).
~~~~

### src/english/english-opening-speech.ts · 1cb3b3f6ef18

~~~~text
/**
 * The opening address's words (`data/english/parts/opening-speech.json`):
 * authored pieces for the President's inaugural address or State of the
 * Union, each with a polished and a plain version for the speaker's recorded
 * manner. The shape is a real address's: an opening and the oath, what the
 * President believes, the country's year, its people, the turn to Congress
 * and the priorities each tied to a law, the Vice President, the states, a
 * call to the people, a close. The address says no figure at all (owner, Oct
 * 27: "none of that real data in there"; Nov 1: "I don't like where this part
 * of the speech where it just laces statistics"), and a piece names no law:
 * every policy, name and office is a slot, and every claim a piece makes
 * ("more people are working than a year ago", "the law says no") is a
 * required fact the director supplies from a record, so a piece is said only
 * where its fact is held (`requiresFacts`).
 *
 * The director (`src/director/opening-story.ts`) decides which blocks the
 * address has and with which facts; this file turns one role of one block
 * into a move for `composeAddress`. It holds no sentence and no order.
 */
~~~~

### src/english/english-opening-speech.ts · 6c0ed45d8d70

~~~~text
/**
   * The kind of address the sentence is for (`crisis`, `combative`,
   * `hopeful`, `victory`, `mourning`); a piece without one belongs to every
   * kind that has no piece of its own for the role (owner, Nov 8).
   */
~~~~

### src/english/english-opening-speech.ts · aa6a0f53540a

~~~~text
/**
   * The part of a joined sentence the piece is (owner, Nov 11, call 12: "A
   * piece the engine joins counts as composed when the sentence it makes
   * carries an insert"): an opener said before the move's core, or the core
   * itself, which names a slot from the world's records in every wording. A
   * piece without one is a whole core.
   */
~~~~

### src/english/english-opening-speech.ts · ca8e32b7a24b

~~~~text
/**
 * Whether a core piece carries something: a slot filled from the world's
 * records, or a fact it is said only when the record holds. A core that
 * carries neither ("This is a working speech.", "I'll keep this practical
 * tonight.") is not a type the outline can pick (owner, Nov 12, via the
 * words lead: four sentences that say nothing). Openers and closers lead or
 * end a core that does.
 */
~~~~

### src/english/journal-words.ts · 5533a2ea5df4

~~~~text
/**
   * Which look-backs fit which moment, by part key: `memorable` ones ("I'll
   * never forget that") are the only ones a birth takes (owner, batch 9: "My
   * daughter was born. I didn't know that at the time." makes no sense), and
   * `youngOnly` ones ("I never knew") fit only a moment from childhood.
   */
~~~~

### src/english/line-register.ts · 1bc70fa7ba45

~~~~text
/**
 * The register of every bank line (owner, Nov 16: every line of dialogue or narration is registered
 * and traceable, so there are no leftovers). Computed from the banks in `data/english/parts/` and
 * the engines' own data, with no second list: each piece with its bank, move, tie class, whether
 * the grades or a rule hold it, the scene purposes that use it and whether an engine can place it.
 * The code and data-file scans and the baseline are in scripts/words/line-register.ts; the dev scene
 * view (src/bench/dev-views/scene-trace.ts) reads this. A bank file added under data/english/parts
 * is added to BANKS here, and tests/guards/english/line-register.test.ts fails until it is.
 */
~~~~

### src/english/line-register.ts · 1063b050cda6

~~~~text
/** The ids of the story elements (docs/story/elements) the piece draws on; empty until it is matched to one (owner, Nov 24: every line needs matching to an element). */
~~~~

### src/english/line-register.ts · 6ae1b98d846a

~~~~text
/** Every bank the register reads, by file name, lines or none: the cut (owner, Nov 17) left banks empty, and an empty bank is still a bank. */
~~~~

### src/english/line-rules.ts · 2db4a057bb50

~~~~text
/**
 * `rewrite`: the lines the rule flags keep playing and go on the rewrite queue
 * (the `waiting` list); a rewrite that passes the rules replaces them (CTO,
 * Nov 10, 2026, on the four journal lines whose first rewrites broke the limit).
 */
~~~~

### src/english/line-rules.ts · 776b17df486f

~~~~text
/**
   * What the owner said, short and exact. Research-only rules have none. A
   * `via` says the words are not his recorded voice but how a log, a ruling or
   * a grade row put them.
   */
~~~~

### src/english/mined/conversation-bank.ts · 13a79c8db5ea

~~~~text
// A reason the engine joins after a line of the role it names (owner,
      // Nov 11: every line composed from pieces, with inserts).
~~~~

### src/english/reply-follows.ts · 99c95ef0231c

~~~~text
/**
 * Whether a reply follows the line before it (the rule
 * `reply-follows-the-line-before`, `data/english/line-rules.json`).
 *
 * Every pair (line before, reply) the director can produce is judged once
 * against the rubric below; the verdicts are this rule's store in the one
 * store every judged rule uses (`src/english/judged.ts`,
 * `data/english/judged/reply-follows.json`): sheets with `npm run words:pairs
 * -- --rule reply-follows-the-line-before`, folded with `npm run
 * words:verdicts`. A reply that does not follow some line is not pulled
 * (owner, Nov 9: when the context is wrong, fix the setup and keep the line);
 * it is simply never offered after that line. The picker
 * (`scene-talk-words.ts`) and the run (`scripts/words/run-rules.ts`) both read
 * the verdicts through `follows`.
 *
 * A pair nobody has judged follows: the store lists only the "no" verdicts.
 *
 * The picker's table also holds every pair an enforced exchange rule barred
 * (words machine part 3: a line judged with the line it answers), which the
 * run writes to `data/english/pulled.json` as `barred`, each with the rule and
 * verdict that barred it. One table, so one way a reply is kept from a line.
 */
~~~~

### src/english/scene-talk-words.ts · 77a830b64dd6

~~~~text
/**
 * A piece that calls the other person by their first name ("Thank you,
 * {first}."). A voice that has done it on a branch does not do it on every
 * line after (owner, batch 3: the name tag on every line): while another
 * piece fits, the next line leaves the name off, and a piece that tags the
 * name after a comma ("Thank you, {first}.") is said without it.
 */
~~~~

### src/english/scene-talk-words.ts · e335a170650f

~~~~text
/**
 * The use that placed a wording and the wordings it tied with, read from the
 * same fit the picker made (dev mode's "why this reply", owner, Nov 16: dev
 * mode does the tracing in the game).
 */
~~~~

### src/english/scene-words.ts · ec87837dd926

~~~~text
/**
 * A line the narrator gives: the arrival (the day as people say it, where and
 * who the player meets, owner, Nov 8), the setting by its kind (a call or a letter), who is there, what is happening by the staged situation's type (`lead`), how the
 * first move opens the scene, and what led here by the moment's label
 * (`cause`).
 */
~~~~

### src/english/span-words.ts · 74354f58f8c7

~~~~text
/**
 * A span of days as people say it (`data/english/span-words.json`): "three
 * months", "a year and a half", "about thirty years", never a day count.
 * Callers pass the number of days. A year or less is told in months; longer
 * spans in years, so a journal of a long life does not open every line with
 * the same "more than a year" (owner, Nov 8 playtest).
 */
~~~~

### src/english/speech-registers.ts · 425afa112d0b

~~~~text
/**
 * Where a line is spoken, and what that setting allows.
 *
 * A House member does not talk on the floor the way they talk at the kitchen
 * table. A register names the setting; its card says who is addressed and how,
 * which rhetorical devices the setting admits, and what real talk in that
 * setting measured like. The engine uses the first two to choose parts. The
 * measured figures are never dice: they are checks a watched world's totals
 * should land near, because each speaker's own choices add up to them
 * (Lamontae, September 28, 2026: "no fixed percentages for behavior").
 *
 * The cards are Research 2's (Drive, "07 RESEARCH FOR CTO REVIEW, Sept 28 —
 * Research 2 · Speech and Dialogue Corpus", 9:50 p.m. consolidated), approved
 * as design D-3. Only formulas from public-domain government sources (the
 * Congressional Record, federal hearings, White House briefings) are written
 * here word for word; the other corpora supply counts only.
 */
~~~~

### src/bench/play.css · 406f70c29942

~~~~text
/*
   * The play page on Kit 13, the owner's approved control set. Every screen
   * uses these classes and nothing else:.panel (dark glass, brass frame,
   * brass corner ornaments),.bust (a person's round headshot),.name /.heading
   * (Cinzel),.speech /.prose (Andada Pro),.label /.role /.when (Fira
   * Sans),.replies /.reply (numbered lines),.action (a button:.primary is
   * Continue, plain is Back; one size for all; the brass corner mark shows
   * only while.active or pressed),.tab-rail /.tab (the open tab a raised
   * glass box),.nav-item,.item,.ring (an icon),.glyph (thin close X, return
   * arrow),.row (a gold label and its value),.lie-scales. The chevron rule: a mark appears only on a static button while it is activated; never in radial menus, items, cards, tabs or rows. Nothing inside a menu scrolls: long screens page. Any text shadow is head-on, never offset. No button chevrons, no thin gold rules, no navy.
   */
~~~~

### src/bench/play.css · 3896a2954481

~~~~text
/*
   * How I look's two tabs of clothes, on the owner's menu look: the open tab a lit brass fill, the other raised glass in soft light; no rail, no ring, no bar under the open one.
   */
~~~~

### src/core2/gov-rules/place-population.ts · da6f3e231a53

~~~~text
/**
 * The place's residents in group quarters (college housing, prisons, juvenile
 * facilities, nursing homes, other institutions, military quarters and other
 * noninstitutional quarters) on Census Day 2020, by its locality key
 * (`placeLocalities`), or null where the file has no row. The CTO's ruling
 * of: the count by place and type comes from the Census.
 */
~~~~

### src/core2/housing-past.ts · 34681a6bcf40

~~~~text
/**
 * Day one's vacant rentals come from the town's own past, not the national vacancy (History; the
 * CTO's 16:27Z line on Justice's B item 10): the leases its renters signed in the year before day
 * one each left a unit empty between tenants for `rentalVacantMonths`, so a town whose renters
 * stay put opens with few vacant units and one whose renters move often opens with more.
 */
~~~~

### src/core2/opening-staffing.ts · ea3fac39170f

~~~~text
/**
 * Opt-in opening option (`generatedOpening(place, { staffToCustomers: true })`):
 * a business is staffed to what its customers buy, not to the county's job
 * mix. Its projected sales follow from its payroll; its customers are the
 * town's households and governments (their purchase contracts) plus its
 * industry's sourced share of buyers outside the town. Where those cover only
 * part of the projection, the business keeps that share of its jobs (at
 * least one). Full people keep their jobs; the workers let go join the
 * workers the opening couldn't place. Opening generation only; built so the
 * CTO and the owner can compare closures with and without it.
 */
~~~~

### src/core2/tooling/drives-proof.ts · c558302fc25e

~~~~text
/**
 * P10 acceptance (d) proof: one generated town, one normal year, with the
 * health producer and drives module installed. Prints and writes a receipt:
 * drives formed per year by kind against the population, every response
 * decision count, one complete event → drive → acts chain with reasons, and
 * pairs of people who met the same event and decided differently.
 * Developer tooling only; run in a cloud environment, never on the owner's Mac.
 */
~~~~

### src/core2/trait-packs.ts · 61485fa6679f

~~~~text
/**
   * What a settled value resists, per how strongly the person holds it.
   *
   * This is the shape the owner asked for: how hard somebody is to change
   * depends on how strongly the trait is theirs, and nothing else about them
   * is invented to say so. The strength is already on the record — it is what
   * the store writes to say whether a lean is subtle or defining — so a
   * strongly held value resists more than a faint one on the same day of the
   * same life, read from the record rather than from a hidden stubbornness
   * number. Every entry is at or above zero.
   */
~~~~

### src/director/tooling/director-year.ts · 62cf44f88a6a

~~~~text
/**
 * P13 proof runner: one generated town, one year on the new core, with the
 * story director watching chosen lives. Developer tooling only; run in a
 * cloud environment, never on the owner's Mac. Input: a prepared core input
 * written by the core's measurement tool (`npx tsx
 * src/core2/tooling/measure.ts --mode opening --prepared-input-output
 * <file>`), so the town, seed and player are the core's own. Finance is bound
 * the same way the core's finance year binds it. npx tsx
 * src/director/tooling/director-year.ts --input <prepared.json> --output
 * <receipt.json> [--through ] [--watch <id>...] [--cohort-employer-of <id>]
 * [--timing-only base|director] [--with-drives true] --with-drives installs
 * the drives and health modules from the drives package (P10, pull request
 * 3922) when they are present in the checkout; they are loaded at run time so
 * this tool does not depend on that package.
 *
 *
 *
 *
 */
~~~~

### src/english/english-composition.ts · 2d12e5fbed49

~~~~text
/**
 * The speech acts every line the simulation produces is labeled with. The
 * list is Lamontae's; it grows only through him. He approved the last seven,
 * for the story director's moves, on (docs/design/story-director.md, answer
 * 2).
 */
~~~~
