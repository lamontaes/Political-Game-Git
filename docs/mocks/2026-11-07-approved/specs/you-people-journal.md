# You, the person card, People and the Journal: what the owner has ruled

Gathered Thursday, Nov 5, 2026, about 3:15 p.m. Eastern, read-only, to redesign these four menus. Nothing was changed anywhere.

**How to read this.** The look of every menu was locked today and lives in the `menu-look` skill (`~/.claude/skills/menu-look/SKILL.md`); it is not repeated here. Under each screen: its job, the rulings in force (latest wins), the rulings they replaced, what the game shows today, what records exist to fill it, where today's screen breaks a ruling, and the questions only he can answer. "His words" means verbatim. "Recorded" means the CTO's write-up of his ruling, quoted from the log.

**Sources, short names.**

- OD: `docs/coordination/OWNER-DECISIONS.md` on main (sections named by their date and UTC time).
- LAW: `docs/play-first/LAW.md`. ORDER: `docs/play-first/ORDER.md`.
- MOCKS: `docs/ui/mocks/screens-2026-10-14/README.md` and its `shots/` (person.png, who.png, jobs.png, people.png, journal.png).
- Mac logs: `cto-notes/playtest/2026-10-26-1.md` and `cto-notes/playtest/2026-10-27-1.md` (his words typed or spoken during play).
- Voice note: `docs/coordination/voice-notes/2026-10-24-playtest.md`.
- Pool: `docs/pool/items/<name>.md`. Code today: `src/bench/play.mjs`, `src/bench/card.ts`, `src/bench/ui/people-web.mjs`, `src/bench/ui/journal-page.mjs`, `src/bench/ui/timeline.mjs`, `src/bench/data/controls.json`.
- Memory notes: `~/.claude/projects/-Users-lamontae-political-game-play/memory/<name>.md`.

---

## 0. Rules that bind all four screens

1. **Never a scale for how someone feels about you.** His words, Oct 29, about 7 p.m. Eastern, on a person card with a "How close you are" bar: "Oh no, not that kind of what she thinks of you. No scale like that. No, that is not allowed in this game... none of that how close you are bullshit. No, no, no, that's not how this game works." And: "you need to find a different way to display stuff other than bars like that. No, this is not that kind of game." Recorded rule: no bar, meter, scale, number, colored dot or band word for how a person feels about the player, on any screen. A relationship shows as what they are to you (Father, Coworker), what you share ("Lives with you"), what happened between you (their history), and how they act and talk. Bars that count real things (a roll call, money) are allowed. Source: OD, Oct 29 23:00 UTC. Older rule it restates: relationships are "never a visible meter" (`docs/coordination/DECISION-REGISTER.md`, line 328, OCD-LIFE-008).
2. **Mood shows through behavior, never mood words.** "Imply relationship tension through ordinary concrete behavior/dialogue rather than narrating feelings." Sept 6, owner-locked verdicts (`docs/coordination/prior-rulings/people.md`, item 24).
3. **Every life is simulated, from the birth year, at low intensity.** His words, Nov 1: "EVERY. LIFE. IS. SIMULATED. WHAT DO YOU NOT UNDERSTAND. THIS IS LOW INTENSITY STUFF." (OD, Nov 1 16:50 UTC). Oct 28, 10:50 a.m.: "Yes, simulate to the birth year. Remember, it doesn't have to be any kind of depth. It's just got to be general to make the game flow." (OD, Oct 28 14:50 UTC). Oct 27: "fix history not simulating before 2025! no hotfix! i keep getting told it's fixed and it isn't" (OD, Oct 27, 5:40 to 6:15 PM Eastern).
4. **Detail is generated on demand from what was simulated.** His words, Nov 5, 12:49 p.m.: "just simulate based on the people there and then you can fill in the gaps based on what was simulated when things need to be generated. generate on demand" (OD, Nov 5). For people: a person is filled in when the player opens them, matching the records already kept, the same every time (OD, Oct 14 CTO standing rule "Generated versus simulated people"; Oct 8 owner note, recorded: when a person first matters, build their family and histories on demand, working backward from their record so it fits the world and leads to them, memory `husk-people-and-montage`).
5. **One history, read by every screen.** His words, Oct 28: "There needs to be one. Everything needs to pull from the same history." And: "It's just different ways of displaying the same information." (OD, Oct 28 04:00 UTC). Screens read records and never make up a line.
6. **Every named person is a real person you can open.** Sept 30, 1:07 a.m.: everyone named anywhere exists and is viewable, his example "click Will Smith and see: he lives here" (memory `every-named-person-is-a-person`; restated Nov 5 in OD).
7. **Portraits are standing figures.** His words, Oct 29: "people shouldn't be sitting in their image creator. They should all be standing, or in the character creator, or in their like profile or whatever." (OD, Oct 29 18:45 UTC). Small cards use headshots; full records show the saved full-body person (Sept 19 register line, `docs/coordination/prior-rulings/screens.md`, item 20).
8. **No initials, ever.** Oct 28 sitting, point 12: "No initials in circles anywhere in the game. Pictures: headshots or body shots." (`docs/coordination/playtest/2026-10-28-1.md`). A person with no figure yet shows an empty ring (`docs/pool/items/people-web-no-initials.md`).
9. **Faces are on screen the moment a menu opens.** His words, Oct 29: "It shouldn't take 5 seconds after you open a menu for it to load. It should be there instantly." (OD, Oct 29 16:30 UTC; built, `docs/pool/items/play-faces-show-the-moment-a-menu-opens.md`).
10. **Plain words.** No trait names (rule under You and the person card), no developer text, people named by who they are on first mention, never a person the player can't place ("who is Jenna?") (Oct 1, memory `journal-is-a-story`). American English only (menu-look).
11. **No dead space, no subheadings, no Continue or Back, menus never scroll.** All in menu-look; sources OD Oct 27 afternoon, Oct 29 16:30 and 22:10 UTC.
12. **People art is paused.** Nov 3, about 8:45 p.m.: "Okay, let's pause this entire thing." His path for drawing people is not picked yet (memory `people-paused-nov3`; Nov 4 he rejected 3D). Every standing portrait on these screens waits on that.

---

## 1. You

Opened by clicking your own portrait on the player card. Today it is called "Who you are" and has three tabs: "Who you are", "Jobs and study", "Your life".

### Its job

- Recorded, Oct 14 night: "Who you are is a character screen... Portrait, name, age, birthday, home and family, school or work, traits and views in words, money in one line, like any game's character screen. Law effects on the player belong under Politics, written as sentences, never as keys with 'undefined'." (OD, "Owner rulings from the Oct 14 night playthrough"; LAW line 20.)
- Recorded, Oct 20, from his menu study: "Clicking your own portrait opens You, with Work and study as its second tab." (OD, Oct 20, "The menu structure".)
- Why the portrait is on the player card at all, Sept 29, 1:45 a.m.: "Next to the date and time, show the player character's current portrait, so the player always sees how old they look." (`docs/coordination/prior-rulings/screens.md`, item 6.)

### Rulings in force

- **The name is "You", its second tab "Work and study"** (Oct 20, above). Latest ruling on naming; today's screen still says "Who you are" and "Jobs and study".
- **Opened from the portrait on the player card** (Oct 20; locked again in today's menu-look layout: "the player card (portrait opens You; ...)"). Today's rail of menus does not include You (menu-look: Journal, Calendar, Money, Politics, News, People, Travel, Guide).
- **What you are like is a plain description, never trait names.** His words, Oct 27, 3:20 p.m.: "What is this sociability, handling disagreement, keeping commitments, risk, deliberation? The player is not seeing this stuff. It needs to be a plain version of what this person's like, their personality or something." (Mac log Oct 27; OD Oct 27 afternoon, line "The talk box subtitle and the traits block speak plainly".) Oct 26: "traits neither much keeping commitments neither much those aren't traits... politics there's more dev language again how does this keep happening" (Mac log Oct 26, line 47).
- **One job record, read the same everywhere.** Recorded, Oct 27, 4 p.m.: "the player's job (one employment record read by Travel, Jobs and study, the card, the opening and the director)... A second copy of a fact is a defect to delete." (OD, Oct 27 afternoon.) He found Travel saying "You work here" while Jobs said "No current job".
- **Your figure is the look you made.** Oct 24: "the person in the web isn't even the person that you characterized" (voice note); recorded "His face and clothes from the creator on the card, Who you are, his person card..." (ORDER item 7; `docs/pool/items/play-first-06-created-look-in-every-scene.md`).
- **Standing, holding nothing** (rule 0.7).
- **Work clothes and everyday clothes are chosen apart.** His words, Oct 29: "There needs to be two separate ones. So that way also, like, the president doesn't render in normal clothes." Recorded: people at government places or their own workplace are drawn in work clothes; elsewhere in everyday clothes (OD, Oct 29 19:10 UTC). Which one You shows is not ruled (question below).
- **Your life story comes from the one history**, from your birth year (rules 0.3 to 0.5). On Oct 29 he showed a history screen and said "this is your character's history... I don't like that at all", and chose a **vertical timeline** for histories: recorded "a gold line with years and an icon card per event, paged by chapter of life" (OD, Oct 29 22:45 UTC).
- **The engine never takes a job or a home for you.** Recorded, Oct 14 night: "No engine accepts a job, a home, a filing or any choice for the controlled person; the engine offers, the player decides." (OD.)
- **A job offer needs a reason and a person.** His words, Oct 26: "Why did the job thing come up? A law took effect? Why did it stop you for that? You don't hold any office. I don't understand. There's no context into you getting this job." (Mac log Oct 26, line 83.) "there's no reason for this to be a job simulator" (OD, Oct 26 evening).
- **Money is not a score.** Recorded, Oct 20: "money is time, freedom and pressure, never a score." (OD, Oct 20, "Why money exists for the player".) Oct 14: "money in one line" (above).
- **Never show on Work and study** (Oct 1, his play-through, memory `playtest-notes-oct1-night`): the top row "Your role: Server" and "Waiting on you"; the "$7.25 federal minimum" line; an "Other work" tab, "Cooperative employers" and "Nationally, this work pays…" text, which he called "AI slop".

### Superseded, and what replaced them

- **The Oct 14 mock of Who you are** (MOCKS: "Full-height portrait in front of a painting of your own home... Traits as round icons, then household, school, job, your views as cards"; his reaction to that pass: "good"). Its trait icons carry one-word labels (Stubborn, Curious, Slow to anger, Loyal). Replaced in part by Oct 27's "plain version" ruling, which the crew built as sentences. Whether one plain word per trait is also acceptable is open (question 4). Its "views as cards" and framed boxes are replaced by today's no-boxes look.
- **"Framed plates" under every section** (his Oct 29 answer, OD Oct 29 22:45) are replaced by Nov 5: "i like the dark panels but i dont like the boxes being displayted like that" (`cto-notes/menus/RULINGS-nov5.md`, item 3).
- **"The bottom-left card is the date and time, not a second picture of the player"** (his words Oct 27, 9 p.m.: "I'd rather have the date and time down there versus another picture for me"; OD, Oct 28 01:00 UTC). Today's locked layout puts the portrait back on the player card, and he reviewed it there on Nov 5 ("I don't like there just being a circle around there and then it's still the same blank background"), objecting to the circle, not the portrait. Worth one confirming line (question 2).
- **"Who you are" and "Jobs and study"** as names (Oct 14 mocks), replaced by "You" and "Work and study" (Oct 20).

### What the game shows today

Code: `sheets.who`, `sheets.jobs`, `sheets.history` in `src/bench/play.mjs`; labels in `src/bench/data/controls.json` (`titles`, `who`, `jobs`). Proof: `docs/lanes/proof/confirmer-lane4/who/santa-rita-1960-who.jpg` and `santa-rita-1960-jobs-1440.jpg` (Santa Rita, Guam, a 64-year-old); `docs/play-first/shots/play-menus-fixed-panels/1440x900-who.png`; `docs/play-first/shots/play-menus-jobs-and-your-life/`.

- **Opened from:** the first icon on the left rail. The player card has no portrait today; it shows the date, time, Day and Week.
- **Header:** "Who you are" with a tab rail "Who you are / Jobs and study / Your life".
- **Left:** your standing figure in a framed box, no home painting behind it.
- **Who you are tab:** name; "Age 64 · Born July 16, 1960"; one to three plain sentences in the second person ("You think things through before you act. You love being around people. You'd rather find common ground than fight."); boxed plates for Home (town, "Population 6,619 · 0 moved in, 0 moved out this year"), Work (if you have a job), School (only while you attend), Money ("$864"); Family as face cards for the people you live with, paged; Politics as a plate with your lean word ("Liberal") when the record has one. In the Santa Rita proof no Politics plate shows, and the bottom half of the panel is empty.
- **Jobs and study tab:** a Work plate (the workplace painting, title, employer, pay per day, hours per day), or "No current job" with why ("You have no job, and nobody in your household draws a wage."); a "Work and school" timeline ("1971 You went on to middle school." "1989 You went to work at Oliver Building Services."), four to a page with arrows.
- **Your life tab:** your whole history down the same gold timeline, oldest first, a boxed card per event. This tab was added by the CTO on Oct 30 (`docs/pool/items/play-menus-jobs-and-your-life.md`); it is not in any ruling of his.

### Records that exist to fill it

Name, birth date and age; the plain sentences from your traits; your figure and saved look; home town, its population and this year's arrivals and departures; your job (title, employer, wage, hours, workplace painting) or why you have none (the household's livelihood record); the school you attend; cash and the household's money (the Money screen holds the full accounts: months of balances, spending, home, assets, debts); the people you live with, with faces and relation words; your political lean, and views where the record has them; your own history from birth (birthplace, school stages, jobs held, moves, partner, children, a parent's death, offices won), each line on its record.
Missing or thin: your views in sentences by subject (the Oct 14 mock had "The plant should have warned people before cutting the shift"); family who live elsewhere (they appear only in People); a figure that shows your age (the 64-year-old in the Santa Rita proof is drawn young, against the Sept 29 "how old they look"); job offers as people and scenes rather than a side panel.

### Where today breaks a ruling

- Named "Who you are" and "Jobs and study", not "You" and "Work and study".
- Opened from a rail icon; the portrait on the player card doesn't exist.
- Boxes everywhere (plates, timeline cards, the figure's frame), and half-empty panels.
- Pay shown per day ("per day"), which nobody earns that way; the Oct 14 mock read "$10.25 an hour · Nights, 40 a week".
- The town's population and moves sit on You, though Politics is getting its own tab for how your place is doing (Nov 5).

### Questions only he can answer

1. **The third tab.** You has You and Work and study by your ruling. The crew added "Your life", your whole history on the gold timeline, which the Journal also tells as a story. Keep it, fold it into the Journal, or drop it?
2. **Your portrait on the player card.** On Oct 27 you said "I'd rather have the date and time down there versus another picture for me." Today's locked layout has your portrait on the card opening You. Confirm the portrait stays, and that You has no icon on the rail?
3. **Which you is shown.** Your figure in everyday or work clothes, and in front of what: a painting of your own home (the Oct 14 mock), the room you're in, or the dark panel? Should it age as you age?
4. **What you're like.** Today it's two or three sentences ("You think things through before you act..."). The Oct 14 mock had one plain word per trait as icons (Stubborn, Curious, Loyal). Sentences, plain words, or both? And does the player see all of their own traits from day one, or only what has shown up in play (the crew's Oct 14 rule says the player's traits emerge like anyone's)?
5. **Your politics.** One lean word ("Liberal"), or your views by subject in sentences, from your record?
6. **Work and study.** Do job offers appear here at all with Take it and Turn it down (the Oct 14 mock), or only through a person in a scene, with this tab showing your job, your past work and school, and the jobs open in town when you're out of work? Pay by the hour and hours by the week?
7. **Your town's numbers** (population, who moved in and out): stay on You, or move to the new Politics tab for how your place is doing?
8. **Family on You.** Only the people you live with (today), or parents, siblings and children who live elsewhere too?

---

## 2. The person card (profile)

What opens when you open anyone: their figure, who they are to you, what they're like, their life and their record.

### Its job

- His words, Oct 27, 9 p.m., on People: "You should be able to click on people and then view that person, and then that's where you see that stuff. But again, it doesn't have any history." Recorded: "Click a person to View person, and that is where their history shows." (OD, Oct 28 01:00 UTC.)
- His words, Oct 29, after v0.64.0: "nobody has any record. I still don't see anybody's history being simulated when you open their profiles." (OD, Oct 29 16:30 UTC.)
- Sept 29: the dossier must show why someone is a boss: "no history pops up about anybody" (memory `owner-rulings-sept29-pm`). The same day, recorded for every officeholder: "the office stated plainly at the top; age, home state, party; career before office; family; positions on the big questions; approval; what she has signed or vetoed in office. Estimate from averages where a value isn't read (no UNKNOWN)." (`docs/coordination/prior-rulings/people.md`, item 5.)
- Recorded, Oct 29, from his Government answers: Government is for "jumping to anyone's card, where you act; one way to each action." (OD, Oct 29 22:10 UTC.)

### Rulings in force

- **No scale of what they think of you** (rule 0.1). The card's closeness bar was removed the same night.
- **No Talk button.** His words, Oct 27, 3:16 p.m.: "Remove the goddamn talk button." (Mac log Oct 27; OD Oct 27 afternoon.) Oct 24: "And one big talk button. That's not how this was approved." (voice note.) Oct 27, 5 p.m.: "the talk button you click on somebody. How hard is that to understand?" Recorded: "Clicking a person starts the talk; no Talk button." (OD, Oct 27, 5 PM.)
- **Nobody is clickable without something to say.** His words, Nov 1: "If there's no dialogue, you shouldn't be able to click on the person." (OD, Nov 1 22:25 UTC; built, `docs/pool/items/play-person-clickable-only-with-talk.md`.) This is about people in the room.
- **"Last talked" is never shown; "how you met" may be, done right.** Recorded, Oct 27, 5 p.m.: "'Last talked': never shown. 'How you met' may show, but only worded like a human and placed by UI principles ('this just gets shoved in there without any adherence to UI or principles')." (OD.) Earlier that day: "Again, last talk, January 20th, 2025, with zero history." (Mac log Oct 27.)
- **What they're like in plain sentences, never trait names** (same Oct 27 ruling as You; built in the third person, "She keeps to herself.", `docs/pool/items/words-person-card-third-person-sketch.md`).
- **History simulated for everyone you open**, not only family (Oct 29 above; rules 0.3 to 0.6).
- **The history reads like a story, with more than a title under the name.** His words, Nov 1, on Angela Moseley's card: "Also, the people's histories are still terrible. Elected legislator, it needs to be told like a story. How many times do I have to say that? And I don't like just the top part. Under her name, she told legislator. That's not good. There needs to be more text." (OD, Nov 1 22:40 UTC; `docs/pool/items/words-person-history-tells-a-story.md`.)
- **A history is a vertical timeline** (Oct 29 22:45 UTC, under You). He gave this answer with a screenshot of a person card's history.
- **Nothing that breaks immersion on a person card** (Oct 15, LAW line 18).
- **Public figures are known.** Recorded: "Everyone knows what the public knows about the president, the vice president, their governor, their representative and their mayor (positions, record, reputation), distinct from having met them; 'you have never met' is never the only line." (OD, Oct 14 CTO standing rule; LAW line 48.)
- **What you know about a stranger.** Recorded: "faith and the rest come out only through what they say and do; the dossier shows what anyone would know (age, hometown, probably job), the rest emerges." (OD, Oct 14 CTO standing rule.)
- **Standing full-body figure, the person's own look, there the moment the card opens** (rules 0.7 to 0.9).
- **The relation word is the real one** (Mother, Father, not "parent"), capitalized, with no empty headings or floating dates (`docs/pool/items/words-parent-named-mother-or-father.md`, `play-stop-41-person-card-no-empty-headings.md`, from his Oct 26 sitting).
- **The line under a name in talk needs work.** His words, Oct 27: "The warehouse worker, Clint Supply Company partner, that needs work. I don't like the way that's displayed." (Mac log Oct 27.) Said of the talk box, but it is the same kind of line the card puts under a name.

### Superseded, and what replaced them

- **The Oct 14 mock card** (MOCKS: "Tall and narrow, like Skyrim: small header (name, office, age, street, chips), a meter for what they think of you, then their public journal as a timeline. Tabs for you and them, and their record. Talk, Visit, Call."). Its meter is gone (Oct 29 23:00); its Talk button is gone (Oct 27); its chips "Your mayor" and "Met Jan 6" were ruled out in the build orders (`docs/pool/items/play-person-card-layout.md`). Visit and Call were never ruled on again (question 1). Its "You and her" tab has no successor: what happened between you is told inside their history (Oct 29 23:00).
- **"How they feel about you, only when your character knows them"** on a member card (OD, Oct 29 22:10 UTC), withdrawn 50 minutes later by the 23:00 ruling.
- **Two finished build items still describe a meter** and are out of date: `docs/pool/items/screens-person-card-plain.md` ("keeps... what the person thinks of the player") and `play-menus-plates-rail-person-card.md` ("the closeness meter when there is a tie"). The code has no meter.
- **Framed plates** (Oct 29) replaced by no boxes (Nov 5).
- **The Oct 14 mock's people-web side card** for a chosen person, replaced by the full card through View person (Oct 28).

### What the game shows today

Code: `showPerson` in `src/bench/play.mjs`; the card's facts from `knownCard` in `src/bench/card.ts`; labels `controls.person`. Proof: `docs/lanes/proof/confirmer-lane3-path3/storrs-card-0.jpg` (a mother), `storrs-card-3.jpg` (a grandfather), `storrs-official-0.jpg` and `-1.jpg` (selectmen), every card's text in `storrs-cards.json`; `docs/play-first/shots/play-menus-plates-rail-person-card/`.

- **Opened from:** People (select a face, then "View person"), the family cards on You, member cards in Politics, and the name over a talk. Clicking a person in a room starts a talk instead, so a person standing in front of you is opened only through their name in the talk box.
- **Left:** their standing figure in a framed box.
- **Right:** name; "Mother · Age 35" (age only for family and housemates); one line under it ("Works as warehouse worker at Nunez Supply Company. Born in Storrs, Connecticut in 1989." or "Has served as selectman since 2025..."); chips for what you share ("Lives with you", "Works with you · Livingston's Market", party for a public figure); two or three plain sentences about them (only for family, housemates or someone you have a relationship with); boxed plates for Work, Seat held, Home, School; then a tab rail of **History** (a gold timeline, four boxed entries a page, year above each sentence) and **Record** for officials (in office since, votes on record, laws sponsored, laws signed, positions as for or against, and "Knows": colleagues by office with "Works with", "Rival" and the like).
- **What the history says today:** "1989 Rowan Carter was born in Storrs, Connecticut." "2006 You were born to her." "2021 She went to work at Nunez Supply Company." "2021 She moved to the county." Relatives with nothing recorded get one line: an uncle's whole card history is "Justin Henry was born." A grandfather's is his birth and "He had a child, ..." three times. The confirmer's verdict: "most relatives' stories are one or two lines" (`docs/lanes/proof/confirmer-lane3-path3/README.md`). It waits on his look.

### Records that exist to fill it

Name, relation word, age, birth year and birthplace; their look and face; their job and employer; seats held and terms, past elections; home town (when you would know it); the school a child attends; what you share (home, workplace, past workplace, school, a campaign); the plain sentences from their traits; their history (birth, moves into or out of the county, children, jobs, a parent's death, offices won, earlier terms of the same seat); for public figures what the public knows (party, service start, votes, laws sponsored and signed, positions); colleagues they know in office. A person you open is filled in from the world at that moment.
Missing: how you met; former partners, moves into the county for most townspeople, and parents' deaths for people filled in late (`docs/pool/items/play-person-history-fill-in-writes-the-coarse-past.md`, notes); a law that reached this person (`docs/pool/items/gov-m3-04-person-card-law-effects.md`, still open: no card a click opens shows a law's effect on that person); approval for officials; anything that reads as a biography rather than a list.

### Where today breaks a ruling

- The history is a list of one-fact lines, not a story, and most relatives have one or two lines (Nov 1).
- Boxes on everything (Nov 5).
- No way to open the card of someone in your room except through the talk box name.
- Ages and the plain sentences are hidden for anyone who isn't family or tied to you: right by the Oct 14 rule, but it leaves strangers' cards thin.

### Questions only he can answer

1. **What you can do from a card.** With Talk gone, is the card read-only, with every action happening in scenes and talks? Or does it carry a few actions, like Call, Visit, Ask for their endorsement or Ask them onto your campaign? (Your Government answers on Oct 29 called the card "where you act"; the Oct 14 mock had Talk, Visit, Call.)
2. **Opening someone in the room.** Clicking a person in the room starts a talk (your Oct 27 ruling), and nobody is clickable without something to say (Nov 1). How should you open the card of someone standing there: their name on hover, right-click, from People only, or from the talk box?
3. **Story or timeline.** You asked for a vertical timeline (Oct 29) and for the life "told like a story" with "more text" (Nov 1). One paragraph of biography under the name with the timeline below it, the timeline alone with fuller sentences, or a short story in paragraphs with no timeline?
4. **How you met.** You allowed it on Oct 27 if worded like a person would say it. Where does it go: the line under the name, the first entry in their history, or with what you share?
5. **What a stranger's card shows.** Today a stranger's card shows no age and no description, by the rule that the rest comes out through what they say and do. Is that right, or should a stranger show what anyone could guess on sight (about how old, what they do)?
6. **Officials' record.** Keep votes, laws sponsored and signed, and positions as for or against? Add approval (the Sept 29 dossier list) or how they voted on bills you care about? Is "Rival" between two officials fine, since it isn't about you?
7. **A law's effect on the person.** When a law reaches someone (a smaller check, a new rule at work), should their card say so in a sentence?
8. **Shape.** A wide card with a full-body standing figure (today), or the tall, narrow card of the Oct 14 mock with a portrait?

---

## 3. People (the relationship web)

### Its job

- MOCKS (Oct 14, his reaction to that pass: "good"): "Built on the old People web: tabs All, Family, Friends, Work, Politics; the chosen group stays in color and the rest dim; lines colored by kind (family gold, household dashed, work steel blue, politics terracotta, others muted); a key; a search box. Clicking a face lights their lines and says in one sentence how you know them. No side info panel."
- His words, Oct 27, 9 p.m.: "There was a people map that had already been made that I had already really liked. There's no reason to try to reinvent it. It had different colors for different people." (OD, Oct 28 01:00 UTC.)

### Rulings in force

- **Restore the map he liked: colors per kind of person, visible lines** (Oct 28, above). Built from the earlier web (`docs/pool/items/screens-people-map-restored.md`).
- **No separate Family tab; family is a filter.** His words: "there shouldn't be a separate family tab. When you can sort by family... The family tab, it's just people in a location. That's not needed." (OD, Oct 28 01:00 UTC.) Today's All, Family, Friends, Work, Politics are filters on one map, which fits.
- **No box around anyone.** His words: "no black box around my guy or anyone else. It should be either a headshot or the people cut out" (OD, Oct 28 01:00 UTC).
- **Click a person, then view that person, and the history is there** (Oct 28, under the person card).
- **The face at the center is the one you made.** Oct 24: "Why are the people not being rendered correctly in the people web? That's a complete regression. Like, this was good at one point... And the person in the web isn't even the person that you characterized." (voice note; built, `docs/pool/items/play-first-11-people-web-uses-created-look.md`.)
- **No closeness marks** (rule 0.1). "Closer this year", "Your five closest are the same as a year ago" and drift marks were removed (`docs/pool/items/play-menus-people-no-closeness.md`).
- **No initials; faces instantly** (rules 0.8, 0.9).
- **Actions start from people, places and scenes, not menu lists** (recorded, Oct 20 menu study, OD).
- **No Talk button** (Oct 27, under the person card). People still has one (see "breaks a ruling").
- **Threads are hidden from players.** Oct 8, 4:24 p.m., on the story director: the threads of people who matter in a life are "hidden from players but visible in dev/observer mode" (memory `story-director-decisions`). Most lives carry about 5 to 10 people who matter (same note, 3:28 p.m.).

### Superseded, and what replaced them

- **A separate Family sheet** showing relatives standing in room pictures, replaced by the Family filter (Oct 28).
- **Marks for who became close and who drifted away** (a crew item from the Oct 25 audit, `docs/pool/items/play-circle-changes-on-screen.md`), removed Oct 30 under the Oct 29 23:00 ruling. ORDER item 57 still describes it as done; it isn't on screen.
- **Square boxes and initials** for people with no figure, replaced by round headshots and empty rings (Oct 28).
- **The mock's bottom-right card** with "You met her at the January 6 council meeting" and "Open card": the README itself says "No side info panel"; replaced by View person (Oct 28).

### What the game shows today

Code: `sheets.people` in `src/bench/play.mjs`; `src/bench/ui/people-web.mjs`; labels `controls.people`; who is in it, `personCard` in `src/bench/card.ts`. Proof: `docs/lanes/proof/confirmer-lane2-path1/*-3-people.jpg` (eight towns), `docs/play-first/shots/play-menus-people-no-closeness/people-web.png` and `people-list.png`, `docs/play-first/shots/play-menus-fixed-panels/1440x900-people.png`.

- **Top:** "People", a search box, a List / Web button, and a tab rail of filters: All, Family, Friends, Work, Politics.
- **Web:** you at the center (your headshot and name), up to **eight** people around you in a ring, each a round headshot ringed in their kind's color with name and relation word underneath ("Sage Carter / father", lowercase); a line from you to each, colored by kind; dashed lines between people who share your home. People outside the chosen filter dim. A key at the bottom: Family, Household, Friends, Work, Politics, Other connections.
- **Clicking a face** selects it; a line under the web reads "Andrew Stuart · father" with a "View person" button, and a "Talk" button if they are in your room.
- **List:** everyone as boxed face cards, three across, four rows a page.
- **Who is in it:** the people you live with, the people in your current room, and your eight closest relationships, ranked by a hidden closeness number. So the web and the list can never show more than those eight plus your household and room.
- **What it looks like in a new life:** in Murray, eight relatives (six uncles) and one man with no relation word; nearly every line is family gold, so the colors barely show; the Friends, Work and Politics filters are mostly empty; the lower third of the panel is empty.

### Records that exist to fill it

Household; family facts with the right relation word; relationships by kind (family, coworker, friend, contact, group, politics) with when and why each last changed; what you share (home, work, past work, school, a campaign); faces; who is in your room; officials and their colleagues; public figures everyone knows (President, governor, your representatives, your mayor), who are real records you can open but appear on People only if you have a relationship.
Missing: the one-sentence "how you know them" on a click (the mock's ask); lines between other people besides your household (the mock drew your mayor and her alderman linked); anyone past the closest eight.

### Where today breaks a ruling

- A Talk button for people in your room, against "no Talk button".
- Two clicks to reach a card (select, then View person) and no "how you know them" sentence.
- A person shown with no relation word ("Charles Newman"), against "what they are to you" (Oct 29 23:00).
- Boxed face cards in the list (Nov 5).
- The eight-person cut is ranked by closeness: no meter shows, but the ranking decides who you see.

### Questions only he can answer

1. **Who belongs on People.** Only people you know personally (today, capped at eight plus your household), everyone you've met, or also the public figures you know of (your mayor, governor, representatives, the President) under Politics, as the Oct 14 mock drew it?
2. **How many on the map at once,** and when there are more: page the ring, shrink the faces, or keep the map for the closest few and the list for everyone? Since no closeness may show, what decides who is on the first page: family first, then by kind, by last contact, alphabetical?
3. **One click or two.** Should clicking a face open their card at once, or light their lines and say in one sentence how you know them (the Oct 14 mock), with the card one more click away?
4. **Talking from People.** Remove the Talk button here too, so talk only starts by clicking someone in the room?
5. **Lines between other people.** Draw how the people you know know each other (your mother and your uncle, the mayor and her alderman), or only your lines plus your household?
6. **Changes over time.** Closeness marks are gone. Should real events show at all: someone moved away, died, or is new at work? On the map, on their card, or only in the Journal?
7. **Is today's map the one you liked?** The crew restored the earlier web from its old code (Oct 28). Look at `docs/play-first/shots/play-menus-people-no-closeness/people-web.png` and say whether that's it.
8. **Web and list both,** or one?

---

## 4. Journal

He has said many times it must read as a story.

### Its job

- His words, Sept 16, 12:18 p.m.: "this is my journal. This doesn't really make sense. It needs to be more in a narrative way... It's literally just a word-for-word account of what I did in 2026. It should say, oh, you know, you ran for governor, you ended up raising this much. You know, maybe this could affect your legacy or something like that... Like a chronicle sorts of sorts." (`docs/reports/owner-record/05-overnight.md`, entry [20].)
- Recorded, Oct 14 morning: "The journal is a dramatized story, not a list of facts. It reads like a memoir: 'When I was seven my dad died; I had no idea how much that would shape my life.' School years are not entries unless something happened in them. Entries are procedural and revised later: an uneventful high school chapter gains 'except for one person' twenty years on, when that friend becomes important. Running, winning, losing, deciding to run are entries. 'The bill passed' is not a chapter about a son. No entry is a lone event with no story around it." (OD, Oct 14 morning; LAW line 70.)

### Rulings in force

- **A story from birth, not sections.** His words, Oct 27, 3:20 p.m.: "how many times do I have to say this journal needs to be written like a story, not individual fucking sections, but written like a story from birth? I mean, but you can't do it because the past is not simulated." (Mac log Oct 27; OD Oct 27 afternoon.)
- **No heading per person; it reads as one story.** His words, Oct 28, on v0.59.0: "saying I started school, and then a random person became county assessor. No. It needs to read like a story. There's no reason to have separate headings for your son Jasper." (`docs/pool/items/director-journal-one-story.md`.) Built rule: chapters are stretches of the life by time and place, never titled after another person; each line joined to the one before by cause, feeling or time.
- **History behind it is simulated, from the birth year, and the journal runs from day one.** Oct 24: "Why is the journal completely empty? Again, your life is supposed to be simulated." (voice note.) Oct 26: "My brother Leo was born after me. What the hell kind of entry is that? Again, there's no history. I keep saying history should be simulated. It shouldn't be blank when it pops up. How many times do I have to say this?" (Mac log Oct 26, line 34.) Oct 27: "people's histories still aren't being simulated for the journal page" (Mac log Oct 27, line 23). His test, recorded Oct 27: "the Journal of a 35-year-old in two seeds" (OD, Oct 27, 5:40 to 6:15 PM Eastern). Rules 0.3 and 0.4.
- **Your own beginnings from day one.** Recorded: "parents, their relationship, siblings, where the family came from and a few remembered moments are kept facts the journal and dossier render from day one." (OD, Oct 14 CTO standing rule; LAW line 69.)
- **Lines carry their subject.** Recorded, Oct 15 evening: "'My father was elected mayor' (the office), 'My daughter Jane was born' (the name), and 'Little did I know' needs what. 'That was a turning point' only when the record shows it was one." (OD; LAW line 71.)
- **First person, "My life."** Sept 24 to 26: "Journal voice: first person 'I' ('My life'); selective chronicle (first job, major work changes, public office)" (memory `latest-owner-decisions-sept24-26`); restated in the register as "first-person 'My life' journal, grounded in records" (OD, Oct 14 night, "Scenes carry the consequential dialogue").
- **Chapters by stretch of life, dates in the prose where they matter, repeats summarized, everyone named by who they are on first mention, nobody the player can't place.** Oct 1, 10:30 p.m., he said he had asked "multiple times" (memory `journal-is-a-story`).
- **Your win or loss is in it the next morning** (ORDER item 4, from his Oct 24 to 26 sittings). A talk that mattered gets a line (OD, Oct 14 night, the CTO's reading of his Q11 answer).
- **The approved look of Oct 14:** MOCKS, "Journal: Approved as is ('solid')." The mock is one cream page headed "My life", "Chapter one · Latimer", and the story in indented paragraphs ("I was born in Latimer in the spring of 2006, the second of Ruth and Earl Spencer's three children. Dad worked nights at the catfish plant on Highway 8...").
- **Its rail icon is redrawn.** Nov 5, his answer "Redo all of them" to redrawing the rail icons after the Journal icon was found to read like talk.

### Superseded, and what replaced them

- **"Routine detail under Record"** (Sept 24 to 26 note), replaced by Oct 14: school years and routine are not entries unless something happened.
- **One line per record with year headers** ("1974", "At 10 · 1984"; "3 more like it followed"), rejected Oct 1 (memory `journal-is-a-story`).
- **Chapters headed by a person or a single event** ("LANA", "MY DAUGHTER VIVIAN" in his Oct 27 game), replaced Oct 28 (above).
- **The cream page inside a framed dark panel** (Oct 14, "solid") versus Nov 5. On Nov 5 he chose the dark panel over "green leather with cream paper" for menus and said "i dont like the boxes being displayted like that." The Journal's paper page is a box of its kind. Whether the Journal keeps its paper, the way News keeps looking like a newspaper, is not ruled (question 1).

### What the game shows today

Code: `sheets.journal` in `src/bench/play.mjs`; `src/bench/ui/journal-page.mjs`; labels `controls.journal`. Proof: `docs/lanes/proof/confirmer-lane1-path6/murray-journal.jpg`, `docs/lanes/proof/lane3-filed-journal.png`, `docs/play-first/shots/play-menus-journal-shared-look/journal.png`, `docs/play-first/shots/play-menus-fixed-panels/1440x900-journal.png`.

- **The page:** a cream page inside the dark panel, "My life", then "Chapter six · Council member · 2027", a short rule, and the chapter's lines as indented paragraphs, one sentence each. Arrows under the page with "6 of 6". It opens on the latest chapter.
- **Chapters** open on your own turns or a relative's and are titled by them: "Chapter two · Commissioner · 2025".
- **What it says.** Murray, chapter six: "I took office as Council member." "Timothy was sworn in as Council member. That wasn't the last I'd see of Timothy." "Dakota was sworn in as Council member. That wasn't the last I'd see of Dakota." The same for Alexis, Yara, Michael and Jenna, then "Patricia took office as Commissioner." "Felix took office as Coroner." Another life: "So I filed to run for Commissioner, with the election set for November 3, 2026." "I turned eighteen." "I gave Susan Ward my word, and I meant it." "I made my mother a promise."
- **The opening chapter** tells parents, siblings, schools and each earner's work from your records (built Oct 27). On Nov 4 one town still showed "my parent" for a father ("I was born in Mentone, Alabama.", `docs/pool/items/words-parent-named-mother-or-father.md`).
- **A new line also pops up bottom right** ("JOURNAL · Andrew Cooper was a friend of mine. He later became a selectman."), which fades or can be closed.
- **No gold timeline on the Journal.** The gold timeline lives on the person card and on You → Your life.

### Records that exist to fill it

The director's moments for you (turns, losses, promises, talks that mattered), your filings, races and results, offices and their acts, household moments, the memoir opening (where the family came from, parents, siblings, schools, earners' work), relatives' and friends' turns told through your relationship with them, links between lines by cause, feeling or time; your history from birth (school stages, jobs, moves, partner, children, a parent's death).
Thin or missing: the years between birth and the start told as a story, with moments; look-backs that revise an early entry ("except for one person") almost never fire, because the journal tells only about one or two lines per person per year (`docs/pool/items/words-journal-revision-none-in-four-places.md`); other people's swearing-ins told as bare lines; the reason behind a moment (what it cost, what it changed).

### Where today breaks a ruling

- Lone events with no story around them, a list of others taking office, and people the player can't place (Oct 14, Oct 1).
- The same closer repeated six times ("That wasn't the last I'd see of...").
- Chapters titled by an office, not by a stretch of life.
- Out of order: "I turned eighteen." after filing.
- The page is a box (Nov 5), if the Journal doesn't keep its paper.

### Questions only he can answer

1. **The look.** Your Oct 14 Journal mock (a cream page of story) was "solid". Today you chose dark panels and no boxes for every menu. Does the Journal keep its own paper page, like News keeps its newspaper, or move onto the dark panel?
2. **Story, timeline, or both.** On Oct 29 you chose a vertical gold timeline for "a history", and it was built on people's cards and on You. Should the Journal also run down the gold timeline (chapters as stretches on the line, the story beside each), or stay story paragraphs paged by chapter, with the timeline only on cards?
3. **How chapters are cut and named.** By stretch of life and place ("Growing up in Latimer", "The plant years", "Running for council"), by age, or by each race and office as today ("Commissioner")?
4. **What fills the chapters that aren't about office:** childhood, school, work, family, moves? Today those years are mostly empty.
5. **Other people's news.** A friend taking office or a cousin's wedding: only when it meant something to you, told through you, or not at all?
6. **Where it opens:** at your latest chapter (today) or at chapter one?
7. **Ideas you raised that were never ruled:** filter the Journal by a person to read back what they did for you ("thirty years ago she helped me", Sept 28); a look back over the whole life when you die, "the kind that makes you say 'I forgot that happened'" (Sept 28); legacy (Sept 16). Any of these now?
8. **The pop-up line** bottom right when something is written: keep it, or only the dot on the rail icon?

---

## Biggest open questions, across all four

1. **Story versus timeline.** He asked for a vertical gold timeline (Oct 29) and for lives "told like a story" (Oct 27, Nov 1). Today the card and You use a timeline of one-line facts; the Journal is paragraphs on a cream page. Which goes where decides three of the four screens.
2. **What you can do from a person.** With the Talk button gone and nobody clickable in a room without something to say, there's no settled way to open someone in front of you or to act from their card.
3. **Who is on People.** Today it's capped at your eight closest plus household, ranked by a hidden closeness number.
4. **You: the third tab, the name, the portrait on the player card** (the Oct 27 "date and time instead of another picture" against today's locked layout).
5. **Paper or panel for the Journal** under the Nov 5 no-boxes look.
6. **Portraits wait on people art,** paused since Nov 3 until he picks a path.

Reference for laying these out: he said on Nov 4 "you don't have to reinvent the wheel. Look at the political process" (memory `player-menus-nov4`). Its menu files on his Mac include a profile and a contacts screen (memory `reference-games-on-mac`).
