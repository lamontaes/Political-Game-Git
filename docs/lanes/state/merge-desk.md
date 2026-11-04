# Merge desk

Merge desk report, Nov 3 and 4, 2026 (cloud session). 161 pull requests merged. Newest state at the top of each section.

**Stopped by the owner, Nov 4, 2:37 p.m. Eastern (relayed by the CTO at 19:41 UTC): 161 pull requests merged in all. Open PRs were left as they are; nothing more merges until a person says to resume.**

## What the owner can play now

Main opens a new game, loads a person and a town, and plays four weeks without a crash (Lane 5's new-game check, now on main and on every pull request). The one check passed on every merge below.

New on Nov 4, from the lanes:

- **Starting a game.** The title screen shows the monuments in their lights. The loading screen plays the world being built: a year counter, the Journal writing itself, headlines and the map filling in. The opening names your governor and the state's chamber leaders over your state's capitol.

- **Filing.**
  - You are offered one council race, and only while filing is open.
  - The clerk and the filing form give the same deadline.
  - Someone stands at every local filing counter, including a county board of elections.
  - On your first filing, the clerk asks if you've run a campaign before and walks a newcomer through it.
  - A town's petition asks for a number of signatures that fits the town.
  - Filing opens weeks before the deadline, not on the game's first day.
  - Officeholders weigh the time the job takes before running again, so more local seats open.
- **Governing.**
  - As mayor, you can sign one ordinance and veto another at your desk.
  - Your office remembers where colleagues stand on your bill.
  - After public comment, a resident who spoke comes to you about the bill.
  - After you vote, a reporter asks why, and the paper quotes you or says you wouldn't comment.
  - A bill's sponsor asks you only about bills that will reach the floor.
  - Governors declare a state of emergency when a federally declared disaster strikes.
- **Campaign and election night.**
  - A yes at the door becomes a vote as the person's stated intent predicts.
  - Every month from filing to election day holds a scene or a Journal line.
  - On election night, once the returns close, a scene shows your own result.
  - A county race is voted on by the whole county, not just your town.
  - A board's at-large seats up on one day are one race, and the top finishers take the seats.
  - The night you win plays as a scene.
  - On the night you lose, the talk at home comes from the relative who worked the race or put money in.
  - Whether you concede or refuse is printed in the race's story, and the winner takes your call gracious or gloating, by their traits; a friend and a rival say different things on the call after the count.
  - Rivals run attack ads on your record that name your real votes.
  - Favors you traded for votes are called in at election time.
- **Family and home.**
  - Relatives and officials at the opening have homes and pay rent, and your home exists before the first card and room appear.
  - Living siblings never share a first name.
  - Relatives who live elsewhere tell you their news.
  - A person's card tells their life as a short story.
  - The calendar shows meetings and holidays, not just birthdays.
  - No menu scrolls: every sheet fits its window, and the paper turns its pages.
  - Journal chapters open only on your own turns or a relative's.
  - A question in everyday talk gets an answer, not just a nod.
  - The Who you are screen says why a grown player has no job, and shows the town's population and this year's moves.
  - A vote ask happens in your chamber and a desk visit at your office, not in a house.
- **Laws and money.**
  - Unemployment benefits use the law's full wage basis.
  - The lobbying ban for officials who leave starts the day they actually leave.
  - A replaced national law is no longer announced as taking effect.
  - Press people's pay and bills add up.
  - A home sale can use an outside lender.
  - When a law takes effect, its scene names the law and what your household paid or got back.

New on Nov 3:

- **The campaign plays as scenes.** An evening of donor calls, a volunteer shift, an endorsement meeting and buying an ad are now scenes you go to, not buttons (#7109, #7111, #7112, #7132).
- **The opening.** The opening address plays in the talk box and as a montage, and the partner at home fits on the couch (#7061, #7105, #7074). The talk after the address has openers by speaker and stance (#7106).
- **Filing.**
  - A closed filing office shows as closed, and the visit plays at its next opening (#7083).
  - The clerk's card in Travel says what you do there (#7087).
  - The first visit to the clerk asks for the papers (#7101).
- **The paper.**
  - A parent's death in last year's paper says who survives them (#7131).
  - No sentence is printed more than three times (#7070).
  - A closing business is told in two connected sentences (#7108).
  - Side-column stories open when clicked (#7095), and the drop cap no longer splits a number (#7096).
  - Last year's races name their district (#7098).
- **Your party** says how it knows what it knows (#7097).
- **Family and elections.**
  - Parents' birthdays now fit each child's birth (#7143).
  - A small edge in a town race moves a few points, not every counted group at once (#7142).
- **Underneath:**
  - Candidates run on the questions more of the town agrees on (#7104).
  - Relatives living elsewhere partner, marry and part (#7082).
  - Medical bills and medical debt follow Medicaid expansion (#7036).
  - The housing-law check redraws a town with no eviction hearings (#7136).
  - A renewal test was fixed (#7099).
  - Four speed folds landed (#7128, #7129, #7102, #7130).
- **For the crew, not on screen:**
  - The lane pages and your Nov 3 rulings (#7139).
  - The pool index is main's alone (#7140).
  - The new-game check (#7141).
  - Stopgaps are kept one file per family (#7144).
  - A pool fix (#7145).
  - A state page (#7146).

## Lane PRs merged on Nov 4 (126), on the owner's word ("You may merge lane PRs that pass the new-game check")

Each had main merged in again, passed `npm run new-game-check` (a town drawn from all 56, a new life, four weeks) and merged pinned to that head.

| PR    | What it does                                                                                                                                                        | Town                                 | Replay number    |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------- |
| #7085 | You are offered one council race, only while filing is open                                                                                                         | North Star, Delaware                 | 12e807f587618187 |
| #7135 | Press people's bills and pay; out-of-town press staff are paid                                                                                                      | Memphis, Tennessee                   | 3d0e53113b24548a |
| #7147 | Relatives and officials at the opening have homes and pay rent                                                                                                      | Langley Park, Maryland               | 7d1e4e25f5705571 |
| #7148 | A home sale can use an outside lender                                                                                                                               | Brandt, Ohio                         | 5c529b0edbe66b00 |
| #7149 | A campaign turn with an empty platform no longer breaks                                                                                                             | Collinsville, Connecticut            | 898bf0f167c66a3b |
| #7150 | The clerk and the filing form give one deadline                                                                                                                     | Braden, Tennessee                    | 337b0a089ffe6a52 |
| #7151 | The night you lose: the talk at home comes from the relative who worked the race                                                                                    | Grand Rapids, Minnesota              | 3e591e88c6f10bdb |
| #7155 | Browser checks play the opening address first                                                                                                                       | Gillis, Louisiana                    | 33b226486f432fa8 |
| #7154 | A town's council petition fits the town                                                                                                                             | Dollars Corner, Washington           | c11455b08d423c3e |
| #7156 | Someone stands at every local filing counter                                                                                                                        | Murphy, Idaho                        | 1d9444cb6c3e1501 |
| #7158 | 16 more browser checks play the opening first                                                                                                                       | Attica, Ohio                         | 640599fa525c0f24 |
| #7159 | Conceding or refusing on the call is printed in the race's story                                                                                                    | Tonyville, California                | 77b02e510da8130c |
| #7160 | The lobbying ban starts on the day an official actually leaves                                                                                                      | Dellwood, Wisconsin                  | 2927a2b80127895b |
| #7157 | Living siblings never share a first name                                                                                                                            | Brighton, Michigan                   | 499a4cc21b9797bc |
| #7153 | Unemployment benefits use the law's full wage basis                                                                                                                 | Rafael Capó, Puerto Rico             | 2c3618fd851aeb24 |
| #7161 | Test workers start with a third of the memory                                                                                                                       | Zebulon, North Carolina              | 05a93e37581589fb |
| #7162 | A national law already replaced is not announced as taking effect                                                                                                   | Trail Creek, Indiana                 | 78bf3a7153541e89 |
| #7163 | A yes at the door becomes a vote as the person's stated intent predicts                                                                                             | Edom, Texas                          | 17542edf9785bf14 |
| #7164 | Governments open with treasuries whose reserves are on the books, sourced or estimated                                                                              | Cairo, West Virginia                 | f54c50c0528dea05 |
| #7165 | A bill's sponsor asks you only about bills that will reach the floor, in one stop per evening                                                                       | Mediapolis, Iowa                     | 057ff7e849d655cf |
| #7166 | A phased minimum wage's cost note counts every step                                                                                                                 | Pascoag, Rhode Island                | ea12de7ce082f713 |
| #7167 | Your office remembers where colleagues stand on your bill, from a talk or your aide's brief                                                                         | Bantam, Connecticut                  | 16b332ecf91efa13 |
| #7168 | Filing opens weeks before the deadline, not on the game's first day                                                                                                 | Rincon, Georgia                      | 655ea866813e93ea |
| #7169 | As mayor, you sign one ordinance and veto another at your desk                                                                                                      | Center Ridge, Arkansas               | 8860661b3b3f3670 |
| #7170 | Governors declare a state of emergency when a federally declared disaster strikes                                                                                   | Frederiksted, U.S. Virgin Islands    | 66d1a94d549de6b8 |
| #7171 | A campaigns test waits for a contest whose filing is open (test only)                                                                                               | Bridgeport, Alabama                  | 51e14ef7daaaace0 |
| #7172 | A worker laid off from a job paid at a legacy rate can be hired again, so a year no longer stops on that hire                                                       | Arnegard, North Dakota               | 0c7b362ef3c9c17e |
| #7174 | Rivals run attack ads on an officeholder's record, naming the real votes                                                                                            | Grover, Wyoming                      | ea7a079c5ea3582d |
| #7175 | Favors traded for votes are called in at election time                                                                                                              | Palm Valley, Florida                 | 86791939a396ec01 |
| #7176 | Dorms, barracks, prisons and nursing homes are rooms outside the rental market; a college town's year runs a third faster                                           | Hillsboro Beach, Florida             | daf3dcca65f27910 |
| #7177 | A crew script opens every county-governed locality and names each one that won't open (no change in play)                                                           | Romeville, Louisiana                 | 8c8e6f57ca3c0234 |
| #7178 | The winner takes your concession call, gracious or gloating by their traits                                                                                         | Pughtown, Pennsylvania               | ba7436a4fd49b389 |
| #7179 | The Journal says you filed to run and when the election is, instead of "So I ran."                                                                                  | Derry, New Hampshire                 | b443b61d2ac8fc53 |
| #7180 | Browser checks that file the player wait for filing to open (no change in play)                                                                                     | Presque Isle Harbor, Michigan        | 95456057cb2df45c |
| #7181 | The counted-eviction test plays Storrs for a year; it fixes a red #7176 left on main (test only)                                                                    | Washington, District of Columbia     | 427412a7e94c6d8d |
| #7182 | The no-dice guard is green on main: the sibling-name pick counts as who exists (guard only)                                                                         | Riverside, Wyoming                   | 3fb1b38d13c583e0 |
| #7183 | A lane state file pushed to main (this page included) no longer turns the release run red (release only)                                                            | Magna, Utah                          | b721fbbd762fc58a |
| #7184 | The talk at home after a loss says what the relative did, not that they are waiting (fixes a red on main)                                                           | Bridgeport, Connecticut              | 812d976f0b55954f |
| #7185 | The Journal says a date the way the director does (fixes a red on main)                                                                                             | Stamford, Connecticut                | 94c07a596249e43d |
| #7186 | A friend and a rival say different things on the call after the count                                                                                               | Pleasant Grove, Alabama              | 59e77f3f5234eec5 |
| #7187 | What you tell a reporter about your bill is in the paper's story of it (main merged in with both sides' imports kept)                                               | Kickapoo Site 1, Kansas              | 1a323bb4802a8fef |
| #7188 | The night's paper prints only news that is still news on its date                                                                                                   | Okauchee Lake, Wisconsin             | c703902b25039143 |
| #7189 | Homes exist before the first new-game card and room                                                                                                                 | Si'ufaga, American Samoa             | 3a2fd883d5e9053f |
| #7103 | On your first filing, the clerk asks if you've run a campaign and walks a newcomer through it                                                                       | Rehobeth, Alabama                    | aa7b08dae2200c3e |
| #7090 | A person's card tells their life as a short story, with lines under the name                                                                                        | Sardis, Mississippi                  | 31403e15b8341f2f |
| #7190 | Lane 5's part of the red guards on main (the families and English guards; guards only)                                                                              | Wilroads Gardens, Kansas             | 56017b096bed5ef5 |
| #7191 | After you vote, a reporter asks why, and the vote's story quotes you or says you wouldn't comment                                                                   | Tryon, Oklahoma                      | 181fe7677c869c88 |
| #7192 | Lane 3's part of the red guards: the scene code keeps its numbers in data and reads press stories through the press module's entry (guards only)                    | Lakeview, Louisiana                  | 2f87205bc844ea8a |
| #7193 | Lane 2's first-minutes proof in eight towns, on main (built, not yet confirmed by a second session; docs only)                                                      | West Hattiesburg, Mississippi        | 5e0307fe27bc0262 |
| #7194 | Lane 4's line of the red families guard: the montage imports people through the people module's entry (guards only)                                                 | Rockwood, Michigan                   | cbce7ff365888bef |
| #7195 | Journal chapters open only on your own turns or a relative's, never titled after someone else                                                                       | Montgomery, Alabama                  | 4a388744cb946666 |
| #7100 | The calendar shows meetings and holidays, not just birthdays (the lane fixed its families-guard defect)                                                             | Tiger, Georgia                       | 6eb0470304598551 |
| #7196 | A question in everyday talk is answered, not just acknowledged                                                                                                      | Stepping Stone, Colorado             | 90f886358d4bfcb3 |
| #7197 | Election night names a district "District 14" and an at-large seat by its state, never a code                                                                       | Cruger, Mississippi                  | 98634737a874e481 |
| #7198 | Someone you met once has their daily log kept three months, not a year; a big town's election year uses 290 MB less memory                                          | Harrisville, Rhode Island            | 3a9f295857e53718 |
| #7199 | A campaign is never silent: every month from filing to election holds a scene or a Journal line                                                                     | Cerrillos Hoyos, Puerto Rico         | 37aae2649c058464 |
| #7200 | People no longer go to a public office nobody works at                                                                                                              | Washington, District of Columbia     | cb36b936901b8d09 |
| #7201 | A release declaration on main that broke the release check everywhere is fixed (release only)                                                                       | Fraser, Colorado                     | 183a975886e2f166 |
| #7202 | Ordinary news at home no longer opens with "asks you to sit down first"                                                                                             | Preston, Minnesota                   | 5aee7c3dc2418614 |
| #7203 | The clerk's race list keeps one row height at three window sizes                                                                                                    | Winterville, North Carolina          | e48693a31ea9dcc0 |
| #7204 | Election night's governor races get their own page, every row reachable on a small screen                                                                           | Belmont, Louisiana                   | 3dc68772291a1212 |
| #7206 | #7204's release note reused a change id and stopped every build; fixed (release only)                                                                               | Amherst Town, Massachusetts          | 13548966e1b1173b |
| #7205 | The Who you are screen says why a grown player has no job, from the household's records                                                                             | Odon, Indiana                        | 1c059c51a4295ea3 |
| #7207 | A vote ask is pictured in your body's chamber and a desk visit at the office, not in a house                                                                        | Donahue, Iowa                        | 2fa377a176aa6d19 |
| #7208 | The Who you are screen shows the town's population and this year's moves (main merged in, both new functions kept beside #7205's)                                   | Green Bank, West Virginia            | 9b13adf9679381d0 |
| #7210 | #7207's patch-note title was too long and stopped builds; fixed (release only)                                                                                      | Fairfield Harbour, North Carolina    | 7a39090c1e10518f |
| #7209 | The moment spacing loop keeps its numbers in data (fixes a red guard on main)                                                                                       | Oakwood, Georgia                     | 607187dde30c724b |
| #7211 | The scene of a law's effect names the law and what your household paid or got back                                                                                  | Wauchula, Florida                    | c888652ad5e1faad |
| #7212 | The loading screen plays the world being built: a year counter, the Journal writing itself, headlines, the map filling in                                           | Addison, Texas                       | 82f2da5b7b85d85a |
| #7213 | The title screen shows the monuments in their lights; the convention and rally pictures are out                                                                     | Great Falls, Virginia                | ffc343633c5a55a2 |
| #7214 | The opening's states part names the governor and the state's chamber leaders over the state's capitol                                                               | Freeburg, Missouri                   | 25be6cc9f39ff981 |
| #7215 | Officeholders weigh the time the job takes before running again, so more local seats open                                                                           | Townsend, Delaware                   | 463d27c505a52ea3 |
| #7216 | Races name their district once, in words ("District 5"), never the padded code                                                                                      | Callender, Iowa                      | 16438f7ac4afdb9e |
| #7217 | An official who returns to office no longer crashes payroll                                                                                                         | Belle, West Virginia                 | 074aa55d65ae6df6 |
| #7218 | After public comment, a resident who spoke comes to the member about the bill                                                                                       | Iron City, Tennessee                 | 70922c48fe9ab091 |
| #7219 | The story director's memory goes into a save and comes back whole                                                                                                   | Miramiguoa Park, Missouri            | d63c7244f4ab0f46 |
| #7220 | The loading screen code takes its person type from the right place (fixes a red check on main)                                                                      | Coral Bay, U.S. Virgin Islands       | 37b8f39ef6fc78d0 |
| #7221 | Skills: speed-work notes on probing the same world speed:year plays (a skills PR; the desk merged it by mistake, as skills PRs are the CTO's; CTO to review)        | Windham, New York                    | 3ecdbe9c4c0cb6b5 |
| #7222 | A government's treasury can open with zero cash                                                                                                                     | Ardmore, South Dakota                | 3e4d8bb963b3999e |
| #7223 | The paper's story of a race keeps who won (and mends #7219's release note)                                                                                          | Dubberly, Louisiana                  | 8c48f7b019ad69a2 |
| #7224 | Three more malformed release notes on main are fixed, so builds pass the release check again (main's wording kept for #7219's note, which #7223 had already mended) | Raceland, Louisiana                  | e22d70ba3bd075ff |
| #7225 | Lane 5's state page as of Nov 4 (docs only)                                                                                                                         | Coral Bay, U.S. Virgin Islands       | c128271393145ada |
| #7226 | The Journal tells your own lost race as yours                                                                                                                       | Chena Ridge, Alaska                  | 44f9944beb13b17b |
| #7227 | A loading test imports the person type from where it lives, so the release build's typecheck passes (test only)                                                     | Woburn, Massachusetts                | db8299c12dd18749 |
| #7229 | A restored world refills once and keeps its news and weekly-contact state                                                                                           | Du Bois, Nebraska                    | c4d3fa6be2410ab2 |
| #7228 | Each Journal line records how it follows the one before (merged after GitHub's sync trouble cleared)                                                                | Oil City, Louisiana                  | 6fd81a2db8501927 |
| #7231 | No menu scrolls: every sheet's pagers fit, Parties' roster sits under the map, the paper fits its front page                                                        | LaBelle, Florida                     | f8dbfede0149471d |
| #7230 | One shared rule decides how a person who heard of a case stands on it (the lane settled its agreement conflict)                                                     | Safford, Arizona                     | 1f52524cb2f18acb |
| #7234 | Reporters weigh concern from local adults in both population tiers (the desk mended its release note: section and title added)                                      | Scircleville, Indiana                | 8c716e8c4e32804c |
| #7232 | On election night, once the returns close, the director stages the scene of your own result                                                                         | Columbia, North Carolina             | 84340e32d40ad92e |
| #7235 | A county race is voted on by the whole county, not just the town                                                                                                    | Tok, Alaska                          | 55025f4e77f84b20 |
| #7236 | The Journal reads on from one entry to the next                                                                                                                     | Paint Rock, Alabama                  | 3de71ff4cfe0d7aa |
| #7237 | A save keeps the causes' drives, groups and giving                                                                                                                  | Pine Point, Minnesota                | 9edffd3c711ad4e7 |
| #7239 | Alabama's towns vote in 2025 and every fourth year after, so a life in an Alabama town can reach an election                                                        | Euharlee, Georgia                    | 7e811532ac75f9f8 |
| #7240 | The Journal tells another person's step into public life through your tie to them                                                                                   | Poynor, Texas                        | b5617774e8803610 |
| #7241 | The Parties roster box is built from the shared screen kit (fixes main's kit-only guard)                                                                            | Freeport, Michigan                   | 8d71c18ed99410b4 |
| #7242 | The executive code reads the filing clerk through the elections entry (fixes main's families guard)                                                                 | Oxbow Estates, Arizona               | 5ad3c74720f243f2 |
| #7243 | A mortgage's balance goes down by the household's own payment                                                                                                       | Chico, Texas                         | d3fb967639c471f1 |
| #7244 | The map says "Storrs", not "Storrs CDP"; the loading screen is full when it says Ready                                                                              | Hazel, Kentucky                      | ab436e8a50f7a7a7 |
| #7245 | The Journal names the person who walked doors for you                                                                                                               | Bancroft, Wisconsin                  | 1ccc470e84b08f10 |
| #7238 | The newspaper turns pages: stories that don't fit the front page are on the next one                                                                                | Shonto, Arizona                      | 13579d6f5f88df6d |
| #7246 | The map reads the town's name through the places entry (fixes main's families guard after #7244)                                                                    | Wauseon, Ohio                        | 5a21bbd547e0df27 |
| #7247 | A person restored from a save decides from their saved traits                                                                                                       | Hallettsville, Texas                 | 5abf7bb42df001ff |
| #7248 | The path check waits for filing to open, so it again reports how far a new life gets (the desk mended its impact-none note)                                         | Carolina, Rhode Island               | b7e21a3d8b5dfae2 |
| #7249 | Draft cards and bill papers read their own body's law and budget                                                                                                    | Port Angeles, Washington             | bb57f2404b5a3964 |
| #7250 | Policy news moves counted adults' views and reporters' questions (both new sections of the Lanes 2–5 agreement kept)                                                | Etowah, Arkansas                     | 0438d22e93ee85fa |
| #7251 | Local sales-tax averages stay within their own state                                                                                                                | Yoder, Wyoming                       | cf541e9ff2d32b61 |
| #7252 | A save from a world with nothing yet to forget loads back as the same world                                                                                         | I Chenchon, Northern Mariana Islands | d9dfe1b55eb382c5 |
| #7253 | A world restored from a save plays 45 days exactly as the saved one did                                                                                             | Herington, Kansas                    | 178b7be2aab4cacd |
| #7255 | A reply that puts a matter off records the talk you now owe                                                                                                         | Maineville, Ohio                     | a716b4dffcde21f5 |
| #7256 | The English guard accepts the town names Rockville Centre and Fairfield Harbour (fixes a red guard on main)                                                         | Stanley, North Dakota                | 477b5e834de1fe4d |
| #7257 | The office-hours check pins its town and plays on by the calendar; Lane 4's review of what reached main unreviewed (checks and docs)                                | Wiggins, Mississippi                 | b2cf68fed4c8b376 |
| #7258 | The night you win plays                                                                                                                                             | Garden City, Colorado                | 72863d4e2efe0dbb |
| #7259 | The Who you are screen names a school only while you are at one                                                                                                     | Le Flore, Oklahoma                   | 140712322f5732a5 |
| #7260 | A debate no longer plays as a string of campaign stops                                                                                                              | Si'ufaga, American Samoa             | 7dd51ce1ca56416d |
| #7261 | Campaign asks are answered in the speaker's own words                                                                                                               | Ames, Texas                          | 388a503fc8ccc7e0 |
| #7262 | Volunteer and endorsement answers are spoken by each person on screen (agreement 3-4)                                                                               | Foster Center, Rhode Island          | 08862fee2ae54c14 |
| #7263 | The scene code's runner-up sort keeps its numbers in data (fixes a red guard on main)                                                                               | Watson, Minnesota                    | a408bf696ceb624e |
| #7265 | The path check prints each candidate's vote share, so a loss in the fixed town says why (the desk mended its impact-none note)                                      | Braintree Town, Massachusetts        | 1e9c28e8fe1b1bce |
| #7266 | Relatives who live elsewhere tell you their news                                                                                                                    | Wilmar, Arkansas                     | 1a5be33148bba045 |
| #7267 | Your grades of which reply follows which line now shape everyday talk                                                                                               | Mertarvik, Alaska                    | 68d2fc592c3ffb49 |
| #7268 | The goodbye test checks real goodbyes again (fixes a red test on main)                                                                                              | South Boardman, Michigan             | 1b54f45e3c631f1a |
| #7269 | A board's at-large seats up on one day are one race, and the top finishers take the seats                                                                           | Chalan Pago-Ordot, Guam              | ea490ed126d81aad |
| #7270 | People weighing an at-large seat count the whole race, so at-large fields are no longer crowded                                                                     | Americus, Georgia                    | 746544e7f7697cf8 |
| #7271 | The filing and campaign-stop test finds its race (fixes a red test on main by draw; test only)                                                                      | Frederiksted, U.S. Virgin Islands    | b47be96fcbb091a9 |
| #7272 | The victory-night test finds its race and follows whoever wins (fixes a red test on main by draw; test only)                                                        | Wallingford Center, Connecticut      | 70258d30414d0104 |

Conflicts resolved mechanically: #7154 (both sides added a parameter and a stopgap row; both kept), and #7153, #7157, #7160, #7162 (Lane 2's state page: main's wording for the one edited line, both sides' log entries kept). Mac builds started after 5, 13, 18, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 91, 96, 102, 107, 113, 118 and 123 of these merges.

## Merged (35), each on the one check with a printed replay number

| PR    | Head checked | Town                                       | Replay number    |
| ----- | ------------ | ------------------------------------------ | ---------------- |
| #7131 | 0e84ebce     | Basin, Montana                             | 381816986        |
| #7070 | cbc14da3     | Sutton, Nebraska                           | 2879315506       |
| #7087 | c792ae44     | Charlotte Amalie, U.S. Virgin Islands      | 1830428778       |
| #7099 | e1234184     | Pryorsburg, Kentucky                       | 3361897564       |
| #7104 | 0c953d12     | Lake Pocotopaug, Connecticut               | 3532575286       |
| #7083 | 5e77d51d     | Glendale, Colorado                         | 3289295414       |
| #7109 | ad065bcd     | Satilla, Georgia                           | 4204054749       |
| #7111 | 9de6616e     | Copiague, New York                         | 3962816521       |
| #7112 | 260c155b     | Blaine, Washington                         | 2178872946       |
| #7132 | be46ad57     | Marksboro, New Jersey                      | 2965442531       |
| #7101 | b17fbd94     | Millport, New York                         | 3714326740       |
| #7108 | 01533a8a     | Arlington, Kansas                          | 3414501943       |
| #7098 | fbfd8115     | Lewisville, Idaho                          | 3504676917       |
| #7106 | c3d85b09     | Foresthill, California                     | 985895113        |
| #7074 | 18fceec3     | Naranjito, Puerto Rico                     | 2454991892       |
| #7061 | c8a3bdf1     | Wilson Creek, Washington                   | 3392040343       |
| #7095 | 0c424f80     | Wasta, South Dakota                        | 3808191865       |
| #7096 | 0de002ef     | Arlington, Wyoming                         | 2531421220       |
| #7036 | 411c077b     | Lytle Creek, California                    | 1431763324       |
| #7129 | b559b84f     | Flora, Mississippi                         | 503723434        |
| #7128 | 422e9af4     | Gold Hill, North Carolina                  | 1964146023       |
| #7102 | 21b8d382     | Haystack, New Mexico                       | 3045101128       |
| #7082 | ee082212     | Madison, Maine                             | 430515595        |
| #7097 | 2f791607     | Williamstown, Vermont                      | 2450965648       |
| #7136 | 5ae882ec     | Woodward, Oklahoma                         | 3882052269       |
| #7105 | cdd04145     | Grant, Montana                             | 1489648838       |
| #7130 | 91c368c4     | Milford, Connecticut                       | 3051628318       |
| #7139 | 3eeba6c2     | Fannett, Texas                             | 2927431095       |
| #7140 | 1170bc04     | Lusk, Wyoming                              | 2604774511       |
| #7141 | 18f09ee0     | New Richmond, Indiana                      | 515872638        |
| #7142 | e95c8fb6     | Mattoon, Wisconsin                         | 671777283        |
| #7143 | bb90b9c7     | Jackson Center, Ohio                       | 3825594030       |
| #7145 | 9987b91d     | Washington, District of Columbia           | 913417393        |
| #7146 | f6ec5d15     | Jewell, Kansas                             | 883464006        |
| #7144 | ab2f00cb     | Braggs, Oklahoma (new-game check, 4 weeks) | 9b8263a376499d47 |

#7130's speed check was rerun first, branch against main, `npm run speed:year -- --seed long-1 --years 4`, one process each: 271.9 s against 272.0 s (years 31, 45, 100 and 96 s on both), so no slowdown. Every check up to #7143 was M0-02 (a 400-person town, the opening days). From #7144 on, the desk runs Lane 5's `npm run new-game-check` (#7141): a town drawn from all 56, a new life, four weeks played.

Mac builds (`release-package.yml` on main) were started after 8, 20, 26 and 34 merges. A dispatch at 14 failed because it ran outside the repository folder; the one at 20 covers it.

## Waiting

- **English guard red on main (Lane 5, Nov 4 13:50 UTC).** The guard reads `docs/lanes/` too, so a lane page that quotes a drawn town's British-spelled name (Rockville Centre, New York; Fairfield Harbour, North Carolina) turns `guards` red on every PR. The fix is #7256, which adds both as exact phrases to the guard's allowlist. For a new one, add the town's full name to `ALLOWED_PHRASES` in `tests/guards/english/allowlist.ts`, not the bare word.

- **Builds publish again (Lane 5, Nov 4 10:45 UTC).** Everything wrong since v0.79.0 is merged: #7224 (three notes), #7227 (the release typecheck). Release run 12148 passed. Release package run 60 built and checked both installers, then GitHub answered 502 when the release was created. Rerunning only the failed job published **v0.80.0** with the Mac `.dmg`/`.zip` and the Windows `.exe` (published 10:45:37 UTC, from 54099d451a).

- **Deterministic validation red on main (Lane 5, Nov 4 06:45 UTC).** Run 41782859788 on ac86b3d128: 3 of 16 guards. Lane 5's part (families: my group-quarters and stopgap files, two new Lane 2 files with no family, ten baseline counts; english: a verbatim study quote) is #7190, which leaves four lines for other lanes, each one line: **Lane 4**, `src/bench/montage.ts` should import `keyPeopleOf` from `../core2/modules/people` (it already re-exports it), not `core2/opening-key-people`; **Lane 1**, `modules/executive.ts` imports `localClerkFor` from inside the elections family (note on its state file); **Lane 3**, `director/purpose-scene.ts` has two bare `0`s at line 563 and imports `PRESS_STORY_EVENT` from `core2/press-desk` (note on its state file). Main is green once #7190 and those four lines land.

- **Release run on main (Lane 5, Nov 4 05:45 UTC), fixed.** The CTO's note: Release failed at "Enforce declarations" on every run since 01:10. Cause: the release check wanted a declaration for any file outside `docs/coordination` and `docs/pool`, so each direct push of a lane state file (`docs/lanes/state/*.md`, this page included) turned the run red. Runs 12086, 12088, 12089 and 12091 failed that way; the range in 12091 was 7497b6035b..44f14801eb, one file, `docs/lanes/state/merge-desk.md`. #7183 (merged) exempts `docs/lanes/` in `scripts/release/transition.ts` and in the workflow's ignored paths, with a test; `release:check` on that range now prints OK. Separately, #7182 (merged) gave the no-dice guard its sibling-name entry, which was red on every branch.

- **#7110** (speed): handed to Lane 5. The test conflict in `campaign-day.test.ts` is not mechanical (main's new donor rule against this branch's payments wrapper).
- **#7105's pool item** (play-m6-01-the-opening) is back to open on main after its done-on-merge run, as the order asked.

## Lanes (all running now)

- **Lane 3:** #7127: merging main in conflicts with #7188 in `src/bench/calendar.ts` (the same still-news rule written two ways); back to Lane 3.
- **48-hour rule:** if a lane goes 48 hours without pushing to one of these, it merges on the one check and its named failure is filed.

## Owner, one click

- **#7233** (skills, from Lane 4: play-first lessons): check passed on head 4f213562c4 after the lane's later push (Crystal, New Mexico); skill tests pass. The CTO's to merge.
- **#7254** (skills, from Lane 5: speed-work on finding what a save misses): check passed on head 4f9accbf52 (Fairview, Kentucky); skill tests pass. The CTO's to merge.
- **#7264** (skills, from Lane 3: words-engine on sorting pairs without bare numbers): check passed on head 4e0fa65b9e (Kenyon, Minnesota, replay 50002018e7f4de9d); skill tests pass 154 of 154. The CTO's to merge.

#6971 is closed and its item is done (the CTO handled it).

- **Make the new-game check the rule.** The required checks on main are still `validate` and `golden-path`, not the one check. To make GitHub match ruling 2: `gh api -X PATCH repos/lamontaes/Political-Game-Git/branches/main/protection/required_status_checks -F strict=false -f 'contexts[]=new game'` (the job's name is `new game`; check the exact name GitHub shows).

## How the desk ran

- **Release notes, from 09:45 UTC Nov 4 (CTO).** After main is merged in, the desk runs `npm run release:check` in pr mode on the PR, and mends the PR's own note if an error names it. Two errors show on every run and hold nothing under ruling 2. This copy's shallow history can't reach the rollout cutoff (Sep 8) to prove the legacy exemption, and the CTO asked the desk not to pull deep history. #7219's note on main also fails, and #7223 carries its mend.
- **GitHub outage, 09:39 to 09:46 UTC Nov 4.** Pushes returned 500 and merges 502, and #7222's merge sat "in progress". The status page showed nothing. Both went through once GitHub recovered. Server errors came back briefly at 09:49 UTC; #7225 merged despite a 502 reply.

- **GitHub access:** `gh auth status` reports the token invalid, but `gh api` works through the proxy as an admin. Merging past the required `validate` and `golden-path` was refused at first by this session's permission layer, and went through once the owner approved it.
- **Shallow clone:** this cloud copy is shallow, and fetching full history breaks off in this environment. The CTO's `git fetch --shallow-since=2026-10-20 origin main` gave real merge bases.
- **Conflicts:**
  - The pool index was regenerated with `npm run pool`.
  - `stopgaps.json` and English bank conflicts kept both sides' new entries, joined by id or key and checked for duplicates.
  - Pool item front matter took main's value, and item notes kept both sides.
