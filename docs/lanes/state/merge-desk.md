# Merge desk

Merge desk report, Nov 3, 2026 (cloud session). Newest state at the top of each section.

## What the owner can play now

Main opens a new game, loads a person and a town, and plays four weeks without a crash (Lane 5's new-game check, now on main and on every pull request). The one check passed on every merge below. New tonight:

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

- **#7147** (Lane 2): merging main in conflicts in the lane's own state page. Back to Lane 2.
- **#7110** (speed): handed to Lane 5. The test conflict in `campaign-day.test.ts` is not mechanical (main's new donor rule against this branch's payments wrapper).
- **#7105's pool item** stays open per the order. The done-on-merge run for it was still queued; once it runs, the item has to go back to open. This session was not allowed to cancel that run.

## Lanes (all running now)

- **Lane 1:** #7135 (never gated; last push Nov 2).
- **Lane 3:** #7090, #7103 and #7127 were pushed today, with no "ready" from the lane yet.
- **Lane 4:** #7100 (families guard: `calendar.ts` reaches two core internals; last push Nov 1).
- **48-hour rule:** if a lane goes 48 hours without pushing to one of these, it merges on the one check and its named failure is filed.

## Owner, one click

#6971 is closed and its item is done (the CTO handled it).

- **#7148** (Lane 5, an outside lender in a home sale): check passed on head 90684a67a8; ready to merge (Brattleboro, Vermont, replay 05a0f2cc63c5cb84).
- **#7149** (Lane 5, a campaign turn with an empty platform): check passed on head bcbde26a02; ready to merge (Torreon, New Mexico, replay 587151fadb62ef34).
- **#7150** (Lane 1, one filing deadline from the clerk and the form): check passed on head c6545ef860; ready to merge (Springville, Alabama, replay c1f65e48186db742).
- **#7085** (Lane 1, one council race while filing is open): the lane fixed its send-back and merged main in; check passed on head 082491e773; ready to merge (East Peru, Iowa, replay 5eb4849e175d5965).
- **#7151** (Lane 3, the night you lose: the talk at home comes from the relative who worked the race): check passed on head 3a8a08e2ea; ready to merge (Edgemere, Maryland, replay 20d0ea7a17b0f3bb).
- **#7152** (skills, from Lane 1: two shallow-clone traps for session-start): check passed on head 993b8d3572; ready to merge, and the CTO merges skills PRs (Orason, Texas, replay 6d72516d4eb6336d).
- **#7153** (Lane 2, unemployment benefits use the law's full wage basis): check passed on head bbbd32e463 after the lane's later push; ready to merge (Stockton Bend, Texas, replay 386cad3faa37935b).
- **#7154** (Lane 1, a town's council petition fits the town): check passed on head a38ab6c17b; ready to merge (Maia, American Samoa, replay 374cd62c2796d5da).
- **#7155** (Lane 5, browser checks play the opening address first): check passed on head 1846543caf; ready to merge (Blenheim, South Carolina, replay 49d8003127b8fff0).
- **Make the new-game check the rule.** The required checks on main are still `validate` and `golden-path`, not the one check. To make GitHub match ruling 2: `gh api -X PATCH repos/lamontaes/Political-Game-Git/branches/main/protection/required_status_checks -F strict=false -f 'contexts[]=new game'` (the job's name is `new game`; check the exact name GitHub shows).
- **Merges outside the owner's list.** After your approval, merges in your Nov 3 order went through. Merging lane PRs not on that list (#7085, #7147) was refused as "merge without review". Both turned out to have conflicts anyway. To let the desk keep merging lanes' PRs on the one check, say so in this session.

## How the desk ran

- **GitHub access:** `gh auth status` reports the token invalid, but `gh api` works through the proxy as an admin. Merging past the required `validate` and `golden-path` was refused at first by this session's permission layer, and went through once the owner approved it.
- **Shallow clone:** this cloud copy is shallow, and fetching full history breaks off in this environment. The CTO's `git fetch --shallow-since=2026-10-20 origin main` gave real merge bases.
- **Conflicts:**
  - The pool index was regenerated with `npm run pool`.
  - `stopgaps.json` and English bank conflicts kept both sides' new entries, joined by id or key and checked for duplicates.
  - Pool item front matter took main's value, and item notes kept both sides.
