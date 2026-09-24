# The game is mostly built, and its pieces stop one join short of each other

Seven product decisions from you, listed first below, unblock connections
that are otherwise ready to build. Your suspicion is largely right: laws,
public money, elections, people and services exist as working parts, but
three missing links stop most of the political game. Automatic bills carry
no operative text, so laws change nothing. Every government account opens
empty, so funded programs cannot pay. In 92 of 101 state legislative
chambers, an election winner never takes the seat. Several finished
connections wait in unmerged pull requests. Four areas of your wheel have no
model of their own. Code can take over body fit, collars and pose structure
from image generation, but not painted views, hair or hands.

## What you need to decide

1. **When a law's money becomes available.** Today a state bill's money can
   be spent the day it is enacted, while the rest of the same bill waits 90
   days. Pick one: money at enactment, or money on the effective date.
2. **How national unemployment changes local hiring.** Every town posts jobs
   with the same fixed 35% weekly chance, whatever the unemployment rate. The
   joining code is small; the size of the effect needs your rule or a
   research answer.
3. **A starting size for each public service.** A funded program cannot
   deliver anything until the game knows how much of the service exists. A
   labeled game-profile baseline per state would let funded services, school
   repairs and broadband programs report real results.
4. **A parent's savings when you play a child.** The pushed Codex work pays
   a parent's recorded wages while a child plays. Parents still have no
   starting balance, and the project rule that unknown is not zero means that
   balance needs your decision.
5. **Whether players can start a family.** The birth and adoption steps
   already run on the clock. Only the button to propose one is missing.
6. **Whether cities and counties can change their own election and office
   rules.** Your September 24, 2026 decision covers local taxes, spending and
   ordinary rules. Councils still refuse charter changes, which it did not
   name.
7. **Whether code may rotate limbs to change a pose.** Decision D-079
   forbids rotating garments today. Without rotation, every new pose needs
   new generated art.

Two smaller calls: whether developer-only screens should stop shipping inside
the player app, and whether to delete the zero-reference code listed under
"Dead code".

## The three breaks that stop the most play

Claims in this report were measured, by reading the code at the cited line
or by counting with a script, unless marked "inferred".

### Laws change nothing because automatic bills carry no clauses

When Congress or a state legislature files a bill on its own, the bill
records only a policy question and a yes or no answer
(`member-agenda.ts:166-190`). No clause says what the law does. D.C. Council
acts pick the question and the answer at random
(`dc-council-sittings.ts:155-158`).

The step that turns an enacted bill into
a change is a single shared gateway, and it works
(`enacted-law-effects.ts:143-181`). It finds nothing to act on. The
one exception is Alaska's "Village Transit Support" bill, which gets money
clauses (`legislative-clock.ts:1423`).

So, for the player, an automatic law changes only which bill gets filed
next. The code that works out which laws are in force is read by nobody but
the two bill producers (`member-agenda.ts:141`). Members' voting records do
reach later elections, so a yes or no bill still affects a campaign
(`campaigns.ts:398`).

A bill the player drafts does carry real clauses
(`legislation-docket.ts:976`). The drafting catalog has 20 families, 43
variants and 8 kinds of instrument, counted by script. Only one kind, the
appropriation, has anything that acts on it. The other seven are recorded as
"not modeled" (`enacted-law-effects.ts:305`).

Even an appropriation reaches a program only in a state. Federal, city and
D.C. money clauses stop at an early exit (`program-governing.ts:119-123`).

The earlier defects on this route still hold on current main:

- D.C. statehood can be enacted and repealed again and again, because
  nothing reads that question to change D.C.'s status
  (`policy-pack-us-federal-positions.ts:352`).
- Every state bill goes to the chamber's first committee
  (`legislative-clock.ts:539-540`). Kentucky's rules list only one
  committee, Transportation (`legislature-rule-packs.ts:368-370`).
- Paid transit is the only law whose estimated benefit later becomes a
  measured result. The general version of that step exists but is never put
  on the clock (`policy-semantics.ts:564`).

### Public money never moves because every government account starts at $0

Every link from a law to a delivered service exists. An enacted state
appropriation opens a matter on the governor's desk
(`state-governing.ts:1975`). An NPC governor decides it, the state commits
the money, and monthly installments fall due (`public-program.ts:814`).
Completed payments feed the economy model (`macro-economy/sources.ts:210`).

None of it runs, because each government account opens at $0
(`tax-policy.ts:109-120`). The only ordinary money coming in is tax on an
activity the player declares by hand (`tax-work.ts:95`). The other inflow is
a fine from an ethics finding, paid into the state's account
(`finding-consequences.ts:328`).

Only Alaska is given any tax power, in the game's hand-made tax-power file
(`tax-policy.ts:54`). Wages, rent, home purchases and errands are never
taxed; no code records them as taxable (inferred from finding no writer
besides the hand declaration). So each installment refuses with "An
appropriation is not cash" (`public-program.ts:839-840`). For the same
reason, public spending never reaches the economy model (inferred from the
empty accounts).

The Budget screen never shows program records. Its revenue, spending and
debt graphs read a second set of figures that nothing in ordinary play
writes, so they always say "unavailable" (`budget-economy.ts:16-20`;
inferred from finding no writer).

An open pull request adds payroll withholding for Social Security and
Medicare into the federal account (#571). It would be the first ordinary
income. It now conflicts with main in three files.

### Most legislative winners never take their seat

In the playtest report you supplied, Curtis won a Kentucky House race with 65.5%
of the vote. The generated District 98 member kept the seat, and Curtis cast
none of 1,384 recorded votes. The cause is general.

The campaign screen asks for a district only when a state's rules require
the candidate to have lived in the district (`candidacy.ts:313`). Otherwise
the filing carries no district (`CampaignWorkspace.tsx:208`). When the term
starts, the list of seat holders keeps only terms with a district, so the
winner is dropped and the generated member keeps serving
(`state-legislature-opening.ts:844`).

A script over all 50 states and Puerto Rico found which chambers ask for a
district. Alabama, Alaska, Nebraska and Ohio do in every chamber;
Massachusetts and Minnesota only in the House. In the other 45 legislatures,
no chamber asks. That leaves 92 of 101 chambers where a winner is never
seated. D.C., Guam, the U.S. Virgin Islands, American Samoa and the Northern
Mariana Islands have no state-style legislature to run for.

The fix is small. When a contest has no district, use the winner's recorded
home district (`district-residence.ts:301`). Because the change only reads
saved records, it also repairs existing saves like Curtis's (inferred).

## What is built but not connected

Each row names a finished part and the one missing link. Size S is a few
lines in one place, M a few files, L new modeling.

| System      | Built part                                       | Where it stops                                                                                 | Evidence                            | Smallest join                                                                                | Size |
| ----------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------- | ---- |
| Law         | Clause compiler the player's drafting uses       | Automatic bills never call it                                                                  | member-agenda.ts:190                | Call it after each automatic filing, starting with state money questions                     | M    |
| Law         | Nine written state bills                         | No yes or no answer, so they never count as law in force                                       | legislative-clock.ts:1420           | Add the answer at filing                                                                     | S    |
| Law         | Laws that change seats, terms and qualifications | The reader is live; the writer is called only by tests                                         | enacted-rule-changes.ts:405         | Let the docket file that clause                                                              | S    |
| Law         | Policy provisions in state constitutions         | Ignored when deciding what law is in force                                                     | policy-provisions.ts:85             | Count them, ranked above ordinary laws                                                       | S    |
| Money       | Tax collection, accounts, programs, installments | No ordinary tax base                                                                           | tax-policy.ts:374                   | Record settled wages as taxable; widen tax powers                                            | M    |
| Money       | Program installments                             | The account history calls them "unclassified" and hides the balance                            | modeled-account-history.ts:170      | Classify them; show programs on Budget                                                       | S    |
| Services    | Public service panel                             | Service size is declared only in tests, so nothing is delivered                                | public-program.ts:347               | Declare a baseline when money is adopted (decision 3)                                        | S-M  |
| Services    | Executive incident panel                         | Reads incident records play never writes                                                       | incident-response.ts:183            | List known disasters and crime reports                                                       | M    |
| Work        | Job market                                       | Closed under 18, though its minimum age is 16                                                  | life-opportunities.ts:521           | Run it from 16                                                                               | S    |
| Work        | Unemployment and price index                     | Never reach openings, wages or living costs                                                    | job-market.ts:679                   | Read them as the crime model does                                                            | S    |
| Basic needs | Sourced state housing costs                      | Used only by a test                                                                            | regional-measures.ts:135            | Scale living costs by them                                                                   | S    |
| Basic needs | Housing-conditions screen logic                  | Nothing calls it                                                                               | housing-conditions.ts:60            | Show it with home purchase                                                                   | S    |
| Elections   | Winner seating                                   | Winner dropped without a district                                                              | state-legislature-opening.ts:844    | Use the recorded home district                                                               | S    |
| Elections   | Kentucky's seated chamber of 100                 | Bargaining seats numbered stand-ins instead                                                    | legislative-bargaining-world.ts:585 | Seat bargaining from the real chamber                                                        | S-M  |
| Elections   | Bargaining over drafted bills                    | Refused in 48 of 51; only Kentucky, Nebraska and Alaska allow it                               | legislative-bargaining-world.ts:140 | Open it after the row above                                                                  | M    |
| People      | Death notices and the grief scene                | Relatives never learn of a death                                                               | people-bereavement.ts:90            | Send notices each day (#589 does this)                                                       | S    |
| People      | Birth and adoption on the clock                  | No screen proposes a plan                                                                      | people-family-plan.ts:179           | Add the action in Contacts (decision 5)                                                      | S-M  |
| People      | Belief formation                                 | Used only by the demo                                                                          | political-belief-formation.ts:80    | Let people think over bills they meet, starting from principles they hold (#528 builds part) | M    |
| People      | Press stories                                    | Only the story's subjects, colleagues and party organizers read them                           | press/desk.ts:1192                  | Record ordinary readers                                                                      | S    |
| People      | Personality and goals                            | Ignored in household, school and neighborhood replies                                          | run-b-conversation.ts:1313          | Add them to that decision                                                                    | S-M  |
| People      | Money-stress record                              | Called only by tests                                                                           | resource-pressure.ts:38             | Record it when a bill goes unpaid                                                            | M    |
| Clock       | Stop at a job's reply or start date              | The calendar's "until" button, waits inside a legislative session, and watch-only mode skip it | time-command.ts:231                 | Use the same stop                                                                            | S    |
| Clock       | Pay, mortgage and living costs                   | Settle after the clock moves, in the screen, not on the clock                                  | life-opportunities.ts:515           | Settle them each day                                                                         | S-M  |
| Screens     | Campaign district                                | Saved, never shown                                                                             | campaign-projection.ts:496          | Show it                                                                                      | S    |
| Screens     | D.C. representation                              | Shows a U.S. Senate row                                                                        | politics-government.ts:929          | Handle D.C. as the orientation screen does                                                   | S    |

## Your wheel, category by category

The eight categories and the subcategory labels visible on the U.S. News
wheel you sent. "Model" means the game keeps state for it. "Clock" means
something changes it as days pass. "Law" means an enacted law or budget can
reach it. "Person" means a character can feel it.

| Category                               | Model                                      | Clock               | Law                                              | Screen         | Person                    | Evidence                                   | Verdict                                        |
| -------------------------------------- | ------------------------------------------ | ------------------- | ------------------------------------------------ | -------------- | ------------------------- | ------------------------------------------ | ---------------------------------------------- |
| Health: Healthcare                     | No                                         | No                  | Named only                                       | No             | No                        | policy-pack-us-state-and-local.ts:78       | Needs a small model                            |
| Health: Mortality & Longevity          | Yes                                        | Yes                 | No                                               | Yes            | Yes                       | crisis/mortality.ts:46                     | Works; injuries only, ordinary illness refused |
| Governance                             | Yes                                        | Yes                 | Yes                                              | Yes            | Partly                    | enacted-law-effects.ts:143                 | Works, with the three breaks above             |
| Economic Development                   | National figures and eight town businesses | Monthly             | Only through public payments, which never happen | Yes            | Wages                     | local-economy.ts:59                        | Joins above; no innovation model               |
| Culture & Tourism: Global Influence    | International crises only                  | Yes                 | No                                               | Crisis notices | Injury                    | policy-pack-us-state-and-local.ts:129      | Culture and tourism need a model               |
| Civic Health: Public Safety            | Crime reports and arrests                  | Monthly             | No; policing and law are listed as unread causes | Journal, news  | The victim knows          | crime/causes.ts:68                         | Link policing once services deliver            |
| Civic Health: Social Cohesion          | Quarterly pressure and unrest              | Yes                 | No                                               | Events         | Moves between states      | migration/review.ts:180                    | Works, on placeholder weights                  |
| Opportunity: Labor Market              | Employers, listings, pay                   | Weekly, 18 and over | No                                               | Jobs           | Yes                       | job-market.ts:679                          | Joins above                                    |
| Opportunity: Business Environment      | Town businesses                            | Monthly             | Named only                                       | No             | No                        | policy-pack-us-state-and-local.ts:105      | Thin                                           |
| Natural Environment: Natural Amenities | Storm hazards only                         | Storms              | Named only                                       | No             | Storm harm                | policy-pack-us-state-and-local.ts:114      | Needs a small model                            |
| Infrastructure: Transportation         | Transit service and paid hours             | Yes                 | Alaska only                                      | Transit desk   | No; commutes are withheld | life-circumstances.ts:95                   | Extend past Alaska; riders need a model        |
| Infrastructure: Digital Connectivity   | No                                         | No                  | Named only                                       | No             | No                        | legislation-infrastructure-families.ts:737 | Needs a small model                            |
| Infrastructure: Basic Needs            | Living costs, groceries, mortgages         | Monthly             | No                                               | Home purchase  | Money charged             | cost-of-living.ts:51                       | Flat national placeholder; joins above         |

Healthcare access, digital connectivity, culture and tourism, and the
natural environment beyond storms have no model of their own. Shipped policy
content names each, so a player can file a bill about Medicaid or broadband
that has nothing behind it.

One false record needs fixing before any delivery is shown. A funded program
that delivered nothing still writes "Maintenance delivered."
(`public-program.ts:1118-1123`).

## Two of the same thing

Each job below has more than one live implementation.

| Job                                | Copies                                                                                                                                          | Evidence                         | Which one play uses                                                                               |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------- |
| When a law takes effect            | Four rules: a 90-day default, a separate 90 in taxes that stops the game on a mismatch, money on enactment day, and D.C.'s congressional review | program-governing.ts:125         | All four; they disagree (decision 1)                                                              |
| Paying out public money            | Program installments; transit payments                                                                                                          | public-fiscal.ts:168             | Both, split so money is not counted twice                                                         |
| Turning a law into a world change  | The enactment gateway; turning a bill's estimated benefit into a measured result; the transit funding reader                                    | policy-semantics.ts:564          | All three; only the first is general                                                              |
| Choosing which bill a member files | Two near-identical copies for Congress and states; a coin flip for D.C.; a random member for written bills                                      | legislative-clock.ts:1383        | All four                                                                                          |
| Economy model                      | National series; a second metric-based model                                                                                                    | economy.ts:57                    | National series; the second is used only by tests                                                 |
| Public finances                    | Account ledger; revenue and spending figures                                                                                                    | world-metrics.ts:317             | Ledger; the Budget graphs read the unwritten figures                                              |
| Rent                               | Flat $1,500 living cost; sourced rent on the Economy panel; sourced state housing costs                                                         | cost-of-living.ts:51             | Flat cost is charged, sourced rent is shown, and they disagree about inflation                    |
| Pay at one employer                | $2,800 monthly staff pay; weekly job-market pay                                                                                                 | local-economy.ts:59              | Both                                                                                              |
| Legislative seats                  | Generated members; numbered stand-in seats                                                                                                      | legislation-scenarios.ts:707     | Members for votes; stand-ins for bargaining, every time                                           |
| Legislative election calendar      | Two calendars                                                                                                                                   | legislative-election-rules.ts:96 | One; the other is used only by tests                                                              |
| A person's view on a policy        | Principles, private beliefs, public positions, campaign promises, legislative promises                                                          | types.ts:3924                    | Votes read two; the Journal reads three that play never writes, so those Journal parts stay empty |
| Personality                        | Three sets of traits in one record                                                                                                              | life-personality.ts:36           | Different decisions read different sets                                                           |
| Incidents                          | Incident records; crime reports; disaster records                                                                                               | production-catalog.ts:127        | Play writes the last two; the executive panel reads the first                                     |
| Repairing old saves                | A five-step import; the same five plus mortality on Day; one step on opening a browser save                                                     | ordinary-life.ts:427             | A browser save stays unrepaired until the first Day press                                         |
| Moving time                        | The Day and Week command; ten screens that move the clock directly                                                                              | legislation-session.ts:204       | All; deadline stops apply only to the command                                                     |
| Who represents you                 | The government screen; the orientation screen                                                                                                   | world-orientation.ts:303         | Both; only orientation handles D.C.                                                               |
| Journal screen                     | Current Journal; an older Journal screen                                                                                                        | ShellWorkspaces.tsx:1869         | Current; the older one has no caller                                                              |
| Tax powers                         | A hand-made Alaska-only file; the sourced state and local fiscal records                                                                        | tax-policy.ts:54                 | The Alaska file                                                                                   |

## Dead code

Of 1,267 non-test TypeScript files, the player app loads 982, developer
pages load 5 more, and 280 are loaded by no page. Of those 280, scripts
import 126, and the source scripts load 96 more data-import modules from a
directory listing. The remaining 58 are loaded by nothing; 6 of them hold
only type definitions. The rest include the multi-part bill filing screens,
political reflection, regional issues and a second save store. Five imported data sets have no consumer at all: household
microdata, federal campaign finance, federal courts, disaster declarations
and judicial office selection.

Inside the player app, 396 exported functions are never used outside their
own file, by name search. Tests call 264 of them; 132 have no caller. The
ones worth reviving are the writers this report already names.

These have zero references anywhere and are deletion candidates: the older
Journal screen, an unused scene action menu, the map preview page, and a
second copy of the council rules. So are the second legislative election
calendar, several person-identity helpers, an unused childhood time skip and
an unimported file of Congress procedure. Check string-keyed registries
before deleting, because the search was by name.

One end-to-end test imports files that no longer exist
(`playable29-material.spec.ts:3`). The batch-play driver presses time skips of
14, 30 and 90 days that no player control offers
(`mass-play/driver.ts:750-765`). Its evidence comes from routes players
cannot reach.

## Branches and pull requests

From a full-history comparison with main and GitHub's record of all 681 pull
requests: there are 519 branches, and 354 are fully merged. Of the 165 with
commits main lacks, 12 have an open pull request. Another 105 have only a
closed, unmerged one, 36 have none, and 4 gained commits after merging. The
last 8 carry only changes main already has. The appendix file beside this
report lists all 165.

These finished pieces are waiting and still merge cleanly into main:

- a death has a cause, and the clock stops at the player's own death (#639)
- college answers after a wait and starts in the fall (#628)
- batch play records how the country changes (#584)
- very rich people in the player's state can offer campaign money (#581)
- four pushed copies of the Codex work with no pull request: news reads,
  bereavement replies, a parent's pay while a child plays, and governor
  succession

These are waiting but now conflict with main: death notices (#589), payroll
taxes (#571), public-funds misuse (#587), governor casework (#576), the "let
time pass" refusal line (#579), Puerto Rico names (#570), your dialogue
decisions (#564), and the childhood and belief bundle (#528).

The three law branches collide. The pushed copy of Codex's legislative route
is an older version of Team B's work. Team B's and Team C's published
branches each merge cleanly into main alone. They conflict with each other,
and with that older copy, in the legislative clock and the campaign setup.
They need one receiving branch, not three merges. Team A's branch and the
CTO's renderer branch are not on GitHub.

## Could code fix what image generation keeps getting wrong

Partly, and most of the engine already exists. The repository's records name
the defects that keep coming back, and code already handles several:

| Recurring defect                                                            | Evidence                                     | Handled today by                                                                                                  |
| --------------------------------------------------------------------------- | -------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Green fringe on cut-out edges                                               | edge-despill.ts:8                            | Code: a fixed edge cleanup, no redraw                                                                             |
| Clothes the wrong width for the body; body outlines differ by 15% to 21%    | docs/systems/garment-morphology-fit.md       | Code: a simple fit works; a row-by-row fit is measured but cannot be drawn                                        |
| Neck and collar seams                                                       | docs/plans/active/systemic-modular-repair.md | Offline code: masks give the neck to the body and the jaw to the head; a collar split separates collar from torso |
| Anatomy drifting toward the generator's habits; feet and seats not touching | pose-control-plate.ts:9                      | Code: fixed pose guides go into generation, and contact points are measured                                       |
| Sleeves and arms                                                            | docs/systems/arm-and-sleeve-measurement.md   | Measured only; an arm drawn into the torso cannot be separated                                                    |
| Hair not turning with the face; textured hair; hands                        | docs/plans/active/systemic-modular-repair.md | Refused; the project rules say a flip or rotation is not a painted view                                           |

The parts a code-driven art engine needs are already here. They cover
layered character composition, clothing fit, a body rig with landmarks,
pose families of 18 landmarks each, recoloring that keeps edges exact,
downscale-only resizing and edge cleanup. A drawer that makes characters
from shapes also exists. All 46 character parts the released game draws
today are its placeholder drawings, because no generated art has been
approved (`character-catalog-approvals.json`).

The workable split is the one the appearance kit rules already describe.
Code owns placement, clothing width, collar over neck, color, edges and pose
structure. Generation paints only the detailed masters, on one fixed body
template.

Three pieces are missing:

1. A way to draw the row-by-row clothing fit the game already computes.
2. Arm and sleeve changes. These need arms delivered as separate layers.
3. Rotating limbs at their joints, so a pose changes without new art
   (decision 7).

Code should not take over painted views, curls and other textured hair, or
hands and fingers. A detail code draws is new art and still needs your
approval like any other candidate.

The smallest proof uses one knit top that the fit report already marks as
reusable on the lean and heavy bodies. Draw it row by row, and capture a
before-and-after pair in the character proof view. The original image and
its fingerprint stay untouched, and nothing is approved. The next proof
would apply the existing collar split to one candidate top the same way.

Two art findings affect every build. An ordinary build packs every tracked
image outside the masters folder, about 400 MB, including unapproved
candidates and quality sheets (`bundled-art.ts:17-26`). An installed art
snapshot can never replace the character catalog, because the game builds
that catalog in rather than reading it from the snapshot
(`visual-integration.ts:4`).

The file that limits taxes to Alaska was made by hand. Its documentation
names a generator script that does not exist in the repository or its
history (`tax-policy-and-collection.md:19`). Writing that script from the
fiscal records already here is the route to taxes outside Alaska.

## What happens next

The joins below are ranked by what a player would notice first, with the
lane that owns each under the September 24, 2026 dispatch.

1. Seat election winners by recorded home district (Team B). S.
2. Give government accounts ordinary income: land payroll taxes (#571),
   record wages as taxable, then widen tax powers (Team C).
3. Automatic state bills carry money clauses through the existing compiler,
   and councils may fund services (Team A, then Team C).
4. Declare service baselines and remove the false "Maintenance delivered."
   record (Team C, after decision 3).
5. Land the ready pull requests that merge cleanly; update the conflicted
   ones in the order above.
6. Deaths reach relatives (#589); readers form views (#528, plus ordinary
   readers of the news).
7. Show the campaign district and fix D.C.'s representation rows. S each.
8. Make every way of moving time stop at job deadlines, and settle pay
   as each day passes.
9. Combine the three law branches on one receiving branch before anyone
   verifies them.
10. Delete the confirmed dead code in one separate change.

This audit changed no game code.

## Method

Read-only audit of main at `48f2a55af`, checked again at `c59daf596`, which
differs only in the wording of an election loss. Eight parallel reviewers
traced law, money, people, clock, elections, services, screens and art, each
citing a file and line; the district and art claims were re-checked by hand.
Import reach came from an esbuild graph of each page entry. Unused exports
came from a whole-word name search, which can miss string-keyed use. The
district count came from a script calling the game's own district rule for
each jurisdiction. No tests, builds or browser sessions were run. Curtis's
playtest numbers come from the report you supplied, measured at `ac894486`; the
code path behind them is unchanged since then.
