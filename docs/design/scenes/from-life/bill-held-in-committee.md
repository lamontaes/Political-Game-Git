# Episode: a bill is held in committee without a hearing

Slug `bill-held-in-committee`. Scene builder C, Oct 27, 2026. Pool item `words-scene-bill-held-in-committee`. Calibration only: no real name or quoted line is in any player-facing file.

## Sources (read for substance, nothing copied)

1. Local and state news of bills that died when a committee chair declined to schedule them: a state senate marijuana-decriminalization bill (Indiana), a housing-discrimination bill (Indiana), an alcohol bill on tribal land (Navajo Times), an Oklahoma Senate minority complaint that one chair can kill a bill by not hearing it. Found by search Oct 27: theweedblog.com (Indiana decriminalization), news.yahoo.com (Indiana housing bill dies without hearing), oksenate.gov press release "state senate graveyard good legislation", navajotimes.com "Alcohol bill dies in committee".
2. Explainers of the pigeonhole: policyrisk.com and legalclarity.org (a chair who does nothing kills a bill without a recorded vote; no member has to vote against it), idahoradio.com on chairmen's drawers, civilbeat.org on Hawaii's 2025 term-limit bills referred but never scheduled.

## Packet (the moment)

1. A member files a bill. The presiding officer refers it to a subject committee.
2. The committee's chair weighs the bill against their own view and temperament and does not schedule it. No vote is taken; the bill is held and the session moves on.
3. The sponsor learns of it from the posted agenda (their bill is not on it), not from the chair.
4. The sponsor goes to the chair's office and asks for a hearing. The chair does not say no outright. They say the calendar is full, or that the bill needs work, or that it can come back next session.
5. The sponsor asks a committee member (often one of the chair's own party, or a friend) to press the chair.
6. That member has a choice: press a chair they must work with all session, trade the favor for something of their own, or say it is not theirs to push.
7. The press runs a line or two saying the bill "died in committee" and the sponsor said they would try again.
8. After: a favor owed to whoever pressed, or a strain with the chair; the bill's fate is on the record as held.

## What the game's records say

Played world, three places drawn from seed `probe-c-1` (Merizo, Guam; Hart, Michigan; Asharoken, New York; 120 days from the start), and seed `probe-c-2` (Aguilar, Colorado; Christiansted, U.S. Virgin Islands; Snowflake, Arizona; 365 days):

| Packet line               | Record                                                                                                                                | Fires today?                                                                                                      |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| 1 bill filed and referred | `bill` row, `committee:` stage                                                                                                        | yes, no scene needed                                                                                              |
| 2 chair holds it          | `committee:<bill>:<chamber>` kind `bill-held-in-committee`, facts `billId`, `chair`, `committee`; `personIds` the committee's members | record exists; **no situation type reads it** (25, 11 and 32 holds a year in the `probe-c-2` places; zero scenes) |
| 3 sponsor learns          | the record does not name the sponsor                                                                                                  | **record gap** (filed: `laws-hold-record-names-the-sponsor`, lead laws-effects)                                   |
| 4 sponsor asks chair      | needs sponsor cast from the bill, chair as the person asked                                                                           | new producer `bill-held-chair` (this PR)                                                                          |
| 5-6 sponsor asks a member | the same record names every committee member                                                                                          | new producer `bill-held-member` (this PR)                                                                         |
| 7 press line              | press engine reads `news: false` for a hold                                                                                           | gap: the hold is not news (`news: heard`); filed with the sponsor item                                            |
| 8 outcome                 | `scene.reply` record and the tie it moves                                                                                             | exists; the chair re-listing the bill from a reply is a gap, filed with the same item                             |

## Producers and what they cover

`bill-held-chair` (the person asked is the committee's chair; the sponsor asks for a hearing) and `bill-held-member` (the person asked is another member of the committee; the sponsor asks them to press the chair). Both cast the sponsor from the bill the hold record names; neither names a state, city or committee.

Two other episodes the same producers now cover:

- A county board's chair of the budget committee keeps a commissioner's ordinance off the agenda; the commissioner asks a fellow commissioner to speak to the chair. The hold record is the same; the town is any county.
- A state senate chair of a rules committee sits on a House-passed bill; its sponsor in the other chamber asks the chair. The type is chamber-blind.

Not covered here (own episodes): the chair's own reasons said aloud at a hearing (`words-hearing-chair-question`), a discharge petition, and the sponsor being the subject of the hold (needs the sponsor on the record).
