# Approvals sweep, Nov 5, 2026 (read only)

Gathered Nov 5, about 4:30 p.m. Eastern, after the owner's 3:55 p.m. voice note on the clickable prototype (`cto-notes/menus/prototype/`). Nothing in the repo or Drive was changed. The other files in `menus/specs/` already hold most of the owner's screen words. This file covers what they don't, marked **New**. Lines that repeat them say "(in specs/…)".

His words today (S-bfcf, 2026-11-05T20:55:23Z), the parts this sweep answers:

> "Issues. What? This doesn't cover all the issues. It's supposed to be all the 86 things. I had previously approved how it was done."
> "This includes so many UI elements that I never approved and some that I explicitly disapproved."

Source short names: S-bfcf, S-4a1e, S-01d8 and S-8351 are the local session transcripts (see `drive-and-sessions.md`). OD is `docs/coordination/OWNER-DECISIONS.md`. REG is `docs/coordination/DECISION-REGISTER.md`. Times are Eastern unless marked UTC.

---

## 1. The "86 things"

### What totals 86 (New)

**The bill catalog.** That is `src/core2/data/legislature/bill-catalog.json`, the policies a bill can change, filed under the 18 subject menus the owner accepted on Sept 26. **It held exactly 86 policies from Oct 20 to Oct 28:** 59 policy questions, 15 law amounts and 12 budget lines. Its history, counted from each commit:

| Commit                                                                         | Date (UTC) | Policies   | Questions | Amounts | Budget lines |
| ------------------------------------------------------------------------------ | ---------- | ---------- | --------- | ------- | ------------ |
| 0a917d3f7d (first catalog, M3-01)                                              | Oct 12     | 74         | 59        | 3       | 12           |
| b0d9e4aa4a (public pay floor)                                                  | Oct 14     | 75         | 59        | 4       | 12           |
| **d06d7ed5b6** ("Bills can raise or lower the eleven tax and benefit amounts") | **Oct 20** | **86**     | 59        | 15      | 12           |
| dacb5cebcd (Issues names a tax by who sets it)                                 | Oct 25     | **86**     | 59        | 15      | 12           |
| aa40ade839 (local income tax authority)                                        | Oct 28     | 87 (today) | 59        | 16      | 12           |

- The 15 amounts on Oct 20 were the Medicare tax, Medicaid match, income tax, sales tax, property tax, corporate income tax, estate tax, inheritance tax, SNAP maximum, federal unemployment tax, state unemployment tax, unemployment weekly maximum, Social Security tax, minimum wage and the public pay floor.
- Policies per subject today: Taxes & Public Finance 14, Justice & Public Safety 12, Government & Democracy 10, Labor 7, Healthcare 6, Assistance 6, Energy & Environment 6, Infrastructure 5, Education 5, Housing 5, Business 2, Agriculture 2, Rights 3, Technology 3, Parks 1. Immigration, Defense & Veterans and Foreign Affairs have none. The catalog has 133 topics in all, 45 of them with policies.

**The same 86 on a screen today.** `docs/reports/law-wiring-matrix.json` on main has 89 law rows (59 questions, 18 amounts, 12 budget lines; 89 since its first commit, Oct 20). Its screens field counts:

| Screen                                       | Laws   |
| -------------------------------------------- | ------ |
| Politics → Your office (a seat's draft list) | **86** |
| Politics → Issues                            | 68     |
| News                                         | 52     |
| Calendar                                     | 28     |
| Politics → Budgets                           | 12     |

So 86 of the 89 laws can be drafted from Your office, but only 68 show on Issues. The 21 laws missing from Issues are the 12 budget lines, 8 amounts (corporate income, estate and inheritance taxes, both unemployment taxes, the public pay floor, and the two local authority laws, which show on no screen) and the national work-requirement question. Lane B1's pool audit (S-bfcf, Nov 3, about 1:42 p.m.) reported the same number: "'Your office' counts as seen for 86 of 89, and it only means the bill is on the draft list." It added: "89 isn't everything. 62 of the game's 121 policy questions aren't on the list, including 24 of the 27 federal ones."

**Other candidates, counted. None is 86:**

| List                                                                     | Count                                                                                                                                                                                                              | Where                                                                              |
| ------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Starting-law questions                                                   | 59 (government operations 8, justice 9, fiscal 7, environment 5, labor workforce 5, housing 4, transportation 4, education 3, health 3, technology 3, civil-family 3, agriculture 2, business 2, labor commerce 1) | `data/research/laws/starting-law-2026/question-order.json` and the 14 domain files |
| Campaign issue axes                                                      | 54                                                                                                                                                                                                                 | `data/research/campaigns/issue-axes-2026.json`                                     |
| Law matrix rows                                                          | 89                                                                                                                                                                                                                 | `docs/reports/law-wiring-matrix.json`                                              |
| Policy questions in the game                                             | 121 (per the Lane B1 audit)                                                                                                                                                                                        | not counted directly                                                               |
| Old-engine policy catalog (Sept 23)                                      | 13 domains, 127 issues, 66 propositions                                                                                                                                                                            | `docs/research/requests/which-issues-people-care-about.json`                       |
| Lever table, kinds of bill part                                          | 61                                                                                                                                                                                                                 | `data/research/levers/lever-table.json`                                            |
| The Political Process voter policies ("Policy - Minimum Wage" and so on) | 76                                                                                                                                                                                                                 | TPP files in the scratchpad, `advOptions` and `variables`                          |
| Issues on main, Oct 29 redesign (#6846)                                  | 14 subjects, 69 cards (Puerto Real, Puerto Rico)                                                                                                                                                                   | PR #6846 body                                                                      |
| Issues on main after #6289 (Oct 27)                                      | 68 cards (10 amounts and 58 questions, Carol Stream, Illinois)                                                                                                                                                     | PR #6289 body                                                                      |
| Today's prototype Issues                                                 | 4 subjects, 8 laws                                                                                                                                                                                                 | `prototype/screens-politics.js`, `LAWS`                                            |
| Unrelated                                                                | "Less (86% solid)", a panel option today                                                                                                                                                                           | S-bfcf inline question, 2026-11-05T18:38Z                                          |

**Uncertainty.** No owner message before today says "86" about Issues or laws. I searched every local transcript, OD, REG, prior-rulings, the playtest blocks, the pool and Drive. The 86 in the bill catalog and on Your office is the only exact match. It fits his meaning that Issues should cover everything a law can change, not a sample. It is a match by count, not a record of him naming it.

### What he approved about "how it was done"

1. **Sept 26: the catalog itself** (REG line 235; `docs/design/legislative-content-menus-v1.md`): "Lamontae accepts 'Legislative Content Menus — Proposal V1' (Idea Inbox) as the catalog for bills: 18 subject menus with drill-downs, the shared sections after a topic is chosen... one identity per policy with cross-links, operations (raise, lower, expand, restrict, replace, repeal) inside each subject". The 86 sit under these 18 menus.
2. **Oct 14, 8:29 p.m., on the first pass of mocks** (S-bfcf): "And and the issues, politics, that is unacceptable. Um, they're just being, you know, a text in one color and then a call and res- like a like an Excel sheet." (in specs/drive-and-sessions)
3. **Oct 14, second pass, the Issues mock:** "Law cards grouped by subject, like Democracy 4 and Crusader Kings 3: icon, the law in force in large type, a marker between the two extremes, who can change it, since when." (`docs/ui/mocks/screens-2026-10-14/README.md`; shot `shots/issues.png`). **New: his verbatim reaction**, S-bfcf, 2026-10-15T00:51:21Z (8:51 p.m. Oct 14): "good. push this for the other session". The mock's sample shows only four subjects (Taxes, Health, Economy, Rights and safety) and nine laws. The "marker between the two extremes" is now out under the Nov 5 no-sliders ruling.
4. **Oct 15:** REG line 151, "Issues follows this register, not its mockup". That was the crew's line, and Oct 24 replaced it.
5. **Oct 24:** "go ahead" on law cards per the Oct 14 mock (OD, "Oct 24: rulings"). (in specs/politics)

---

## 2. Any approved Issues layout from Oct 26 to Nov 4

**None found.** Every reaction on record is a rejection, a partial "good start", or an ask for a mock that he never answered.

- **Oct 26, lawmaker run (New, local `cto-notes/playtest/2026-10-26-1.md` lines 176 to 183).** The CTO logged "Issues: 10 entries total, 4 per page... 10 of the 89 laws shown". His words: "Yeah, why does it say continue on issues? There's no, what do you mean issues? I mean, you know what? I assume this comes from the political process, but it isn't explained... I'm not even sure if that should be in the game as is."
- **Oct 27:** #6289 merged, putting every question's law on Issues (68 cards). This was crew work, not an owner approval.
- **Oct 28, #21** (`docs/coordination/playtest/2026-10-28-1.md`): "what are these and why these four? ... A good start, no more." (in specs/politics)
- **Oct 29, 6:30 p.m.:** "redesign all the menu screens", with framed plates and a tab rail (OD 22:45 UTC). The CTO then built Issues as #6846, merged Oct 30 03:09 UTC: 14 subjects on a rail, cards paged on a plate, "the cards follow the Oct 14 Issues mock". **There is no owner approval of #6846 on record.**
- **Nov 1, 5:40 p.m.** (OD Nov 1 22:25 UTC, second batch): "I kind of see the vision here, though. I don't like how it's just laid out and a bunch of cards... I click on it and then it gives me no information about it. Give me options for what shows." (in specs/politics)
- **Nov 1, 6:30 p.m.:** the law page "like a bill... Get me a mock." Mocks were made (`docs/mocks/2026-11-01/` on branch `play-first/mocks-issues-budgets`). No answer is on record.
- **Nov 5 (New, inline answers, S-bfcf).** At 1:41 p.m. the CTO offered "Issues (Recommended)" as the next screen. He answered "let's do general ui stuff." At 2:44 p.m. it was offered again ("Issues screen (Recommended)"). He picked "More general UI". So Issues was never mocked with him before the prototype.

---

## 3. Campaign board and campaign money

**What he set** (oldest first):

- **Sept 23** (Codex handoff quoting him; prior-rulings/elections R23): "The owner does not want to choose every expense. Signs, postage and travel are implied. At most the player picks a mix such as TV versus print versus signs."
- **Oct 6** (prior-rulings/elections R6): "Campaign money scales like real life with the place; raised from people you know. You usually start alone; recruit friends, family, volunteers; hire a manager only if you can afford it."
- **Oct 20** (OD): "no 'Today' list of acts... the Campaigns tab shows standing and polls only." From "Why money exists": "savings let a person quit a job to campaign". From the rivals ruling: "A rich or self-funding candidate leans on paid ads and staff".
- **Oct 27, 5 p.m.** (OD): "One board, I'll have to see it explicitly... there should be some kind of inbox with media requests or building a campaign team... the political process has some kind of manager. I would like to be able to do that. Maybe you meet someone, maybe it's your significant other or your best friend." Also: "The owner sees the board before more is asked."
- **Oct 28, #19 and #35** (playtest block): remove the repeated "No one has filed" rows. Campaigns should be the real races on the coming ballot, clickable. After filing, the raised/spent/volunteers/doors line, the row of action buttons and "Where the race stands" all go ("The menu needs a redesign").
- **Oct 29, 5:40 p.m.** (OD): "it's raising money and stuff like that that needs to be decided for A."
- **Nov 1, 6:30 p.m.** (OD): the tutorial at first filing: "Now, you'll need money... this is what you can spend money [on]. You can get TV ads."
- **Nov 5, about 1 p.m.:** the campaign board appears once you've filed, and an Elections tab is always there (RULINGS-nov5 #1).

**Nov 4 board mock** (`docs/mocks/2026-11-04/campaign-board.html`, Lane 4). It has a poll, money ($1,240 of $1,900 raised), signatures, "What the race turns on", an Inbox (debate, interview, donor, yard signs) and Your team (manager, treasurer). **No owner reaction to it is on record** in S-bfcf from Nov 4 to Nov 5. Today: "Campaign, again, you've got enough feedback right now to redo that because that's terrible." Also: "Campaign money, sure, that can be more in-depth."

**Moving personal money into a campaign (New):**

- No owner ruling before today. His words today are a "maybe": "maybe I should start as the political process does it and have that money be transferable into your campaign."
- **The Political Process does do this.** Its campaign menu (`campMenu`) has a "Donate Personal Funds" action: "Select an amount of money to donate from your personal savings." This corrects the line in `calendar-money-news-travel-talk.md` that says TPP has no personal money and shows only Campaign Funds and Salary.
- **The old engine had it too.** PR #572 (Sept 23, Codex handoff, Drive `1tJBoGQyrSbPR7ZAkbF7RjNbHEa9YKkXwzKrA6iINJmU`) added "the candidate's own money" with "$500, $1,000 and $5,000 buttons on the campaign screen". It listed own money, candidate loans, party money, public financing, bank loans, leftover funds and outside spending as the money sources. That was crew work, not his ruling, and that engine was removed Oct 12.

---

## 4. Government screen

**Approved or asked for:**

- **Sept 26, 2:53 p.m.:** the president and vice president screen, "clicking them and seeing their record". (in specs/drive-and-sessions)
- **New, Sept 29, 11:15 a.m. (S-4a1e, 15:15:04Z), on the opening's president card:** "also, I told you that on the dossier, it should show she's the president. I should know like stuff about her. More details. Okay, there, there's no information here." The CTO ruling from that sitting was: "The President's dossier is nearly empty... show what the world records... The same applies to every officeholder's dossier." (prior-rulings/screens #9)
- **Sept 29, 11:30 a.m.:** portraits beside each seat or district. (in specs/drive-and-sessions)
- **Oct 14, second pass, the Government mock** ("good", see 1.3): "Each body: chamber picture, party split bar, members with party, recent votes as yes/no bars, what's coming up, the executive." The executive there was one line: "Mayor Ida Banks, Democrat, since July 2021".
- **Oct 28, #12:** "No initials in circles anywhere in the game. Pictures: headshots or body shots." #18: the Leaders list (President, Vice President, Speaker) is "printed text out of order".
- **Oct 29, 6:10 p.m.** (OD 22:10 UTC), recorded as his answers: a big chamber shows "a half-circle seat chart of party-colored dots, your own members and the leaders as face cards". Also: "The Judicial tab shows the judges who exist in the world as read-only cards."

**Disapproved:**

- **Oct 14, 8:10 p.m.:** "I do not like this Sonnet [Senate] chart. I'm not even sure where this would be used at... I'm just not sure what the government seats one would be used for... I don't know what the Senate seating chart is for." (in specs/drive-and-sessions; it conflicts with the Oct 29 half-circle answer)
- **Oct 28, #17:** "No measuring bar with a 1 for the Republican governor; there is one governor."
- **Oct 29, 7 p.m.** (OD 23:00 UTC), on the closeness bar: "you need to find a different way to display stuff other than bars like that. No, this is not that kind of game." **The CTO narrowed this.** OD records: "Bars that count things a record holds (a roll call's yes and no votes, money) are not this ruling; the Oct 14 mock's vote bars stay unless the owner says otherwise."
- **Nov 5, about 1 p.m.:** no sliders; "I like data being shown." (RULINGS-nov5 #2)
- **Today:** "there's this green bar and stuff. No, I said that's not what I want." **New, what the green bar is:** the prototype colors a vote's yes share `--yes:#4d6e3f` (green; `prototype/base.css` line 2). So the green bar is the recent-votes yes/no bar, the one OD Oct 29 kept "unless the owner says otherwise". His "I said" most likely points back to Oct 29's "other than bars like that". The CTO's narrowing of that line is what today's words reject.
- **Today, also:** "There's like no information on the executive. Like, why is there not a picture of the president? Maybe the vice president and stuff you know about them and their priorities... there's no pictures of judges. Again, there's weird bar graphs." In the prototype, the federal Executive is a name, approval and stats with no portrait, and Judicial is one sentence with no judges.

---

## 5. Calendar, Journal, Money, You

### Calendar

- **Oct 4, Kit 13 approved controls (New, the only approved checkbox style):** "Checkboxes: gold outline; checked = gold check." (`docs/ui/kit13/APPROVED-2026-10-04.md`). The prototype's calendar kind toggles are native browser checkboxes tinted with `accent-color:#c9a85a` (`prototype/base.css` lines 15 and 16). That isn't the Kit 13 control, which fits today's "those checkboxes are not an approved style". Nothing on record approves checkboxes as the calendar's hide control. Nov 1 said only "color code those things... And be able to hide them if you want."
- **Oct 14:** "it needs to be less than a square... maybe when you open the calendar, it's the January one and then the coming up... once you click on a day... something pops up in between". The second-pass mock was called "good". It has no hide toggles.
- **Oct 26** (playtest block): "no skip to a future day". Today: "there's no way to go to future months. I'm just stuck in January."
- Nov 1 birthdays and color coding: (in specs/calendar-money-news-travel-talk)

### Journal

- **Oct 14:** "I feel like the design up top on the journal, it's a little, it's too ornate." Then "my life, that's solid." The second-pass Journal mock (`page/shot/journal.html`) is one page: "My life / Chapter one · Latimer", then prose paragraphs. **It has no page numbers, no "What you want" and no "write in your journal".**
- **Oct 27:** "written like a story from birth". (in specs)
- **Oct 29:** the vertical gold-line timeline "paged by chapter of life" was ruled for a person's history (OD 22:45 UTC). The prototype reused it as the Journal's chapter rail. Today: "I don't mind this rail on the left kind of acting as chapters for your story. I don't like the way it's displayed."
- **"What you want" (New, never approved):** no owner word anywhere asks for the player's wants or ambition on the Journal. The nearest is Oct 9, about traits driving people ("Ambition needs to, traits need to decide how people see the world"), which isn't a screen ruling. Today: "I don't know where this what you want came from the journal. No."
- **Page numbers:** today, "I don't like the page one and stuff. Like, no, just fill up the page." Nothing earlier approved them. The "6 of 6" pager on main was crew work.

### Money

- **Oct 14 (S-bfcf 00:10Z):** "here I'll approve like the budget and that that goes for any kind of you know that kind of balancing thing. I approve that one." The second-pass Money mock (big cash figure, six months of balances as bars, a ring of where the month went, owned and owed cards) was in the pass he called "good".
- **Oct 20** (OD, "Why money exists"): "Keeping a life afloat... runs in the background and just has to make sense; it is not a budgeting game and needs no great depth."
- **Today (overrides Oct 14 for Money):** "the money with the graphs and stuff, that's terrible. I don't like anything on this screen other than the X amount of money in your account. And I don't like your share this month. No, that's too in-depth." Also: "about 6 weeks of bills... remove all of that from player facing stuff... That's dev talk."

### You (the player's own screen)

- **Oct 14, first pass:** "The traits thing, no, I, I don't, I don't like that at all." The second pass used trait icons (Stubborn, Curious, Slow to anger, Loyal) and "Your views" cards, in the pass he called "good".
- **Oct 27, 3:20 p.m.:** "It needs to be a plain version of what this person's like". (in specs/you-people-journal)
- **Today:** "I don't like the you think through problems before you say anything about it and stuff. It needs to be told, it needs to be written in a different way. Same thing with what you think... Give me other options of what to display on this screen." Also "hella dead space", and "Until Dawn vibes" from the portrait. On Work and study: "Thursday's off since January 16th... Raj approved it... Forty hours a week, nights... that's too in depth."

### After today's note (New, S-bfcf inline answers, 2026-11-05T21:07Z)

- On the "How it's doing" tab he said he "never approved": he picked "Keep it, call it Metrics (Recommended)". The tab stays, under the name Metrics.
- Faces for the mock: "Paint mock stand-ins (Recommended)".

---

## Searched and not found

- **"86" about issues or laws** before today: not in any local transcript (S-4a1e, S-8351, S-01d8, S-bfcf and its helpers, the Runtime-Proof and Default-Project sessions), OD, REG, prior-rulings, the playtest blocks (Oct 26, 27, 28), Kit 13, ORDER.md, LAW.md or the pool. Drive full-text searches for "86 issues/policies/laws/topics" and "seen for 86 of 89" found nothing relevant. The Drive hits were "86 source lanes" (a research inventory), "86 chambers require germane amendments" and PR #86.
- **An owner approval of an Issues screen or mock after Oct 24:** none.
- **An owner reaction to the Nov 4 campaign board mock:** none in S-bfcf. Sessions on the owner's second account (Oct 29 to Nov 2) aren't on this Mac. OD is the only record of them.
- **An earlier owner ruling on moving personal money into a campaign:** none.
