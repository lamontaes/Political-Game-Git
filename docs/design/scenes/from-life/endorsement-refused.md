# Episode: an endorsement asked for and refused

Season: the campaign's middle. Helper B, Oct 27, for the director lead. Research only: no code. Calibration only: no real name or line ships.

## What the director needs

1. **Trigger.** None exists today. The player's "ask for an endorsement" (`src/bench/campaign.ts`, kind `endorsement`) calls `askForEndorsement` for everyone the candidate knows at once and returns only yes or no per person; nothing is written to the log, for a yes or a no. Played world: Weston, Ohio (3983972), draw `endorse:*` of the helper's probe, filing `filing:contest:seat:gus2025:110832:council:0:2025-11-04:person_00585ab8fd28c534`. The candidate knew 3 people, asked all 3, 0 said yes, and the durable log gained 0 records. Engine item filed: `campaigns-endorsement-ask-answer-record` (lead effects), a record per ask naming the asker, the person asked, the answer, and the reason the engine already computes (their agreement with the asker's platform against each rival's, and the trait lean) but throws away.
2. **Place kind.** The person asked's own place: their home or workplace, or a public place; a phone call when they are far away. The scene is one person at a time, never the sweep.
3. **Cast rule.** The person asked is named by the ask record; they are chosen from the asker's ties by the closeness order `askForSupport` already uses (closest first), with a standing weight: someone whose endorsement moves other people (a union local's officer, a party chair, a former office-holder, a newspaper's editor) is cast before a neighbor. The rival whose platform they prefer is read from the same agreement score, so the scene can name the rival in the refusal.
4. **Outcome record.** The reply writes the answer record (accepted, declined with a reason, asked to come back later) and a relationship contact. Readers: the campaign's reach (a yes already becomes `reach(... "endorsement" ...)` to the endorser's circle); the press engine (`SG-PEOPLE-press-endorsements` is a registered stopgap: a refused endorsement the person says out loud can be a printed story); the rival's campaign (an endorsement they got); the ask-once rule (`endorsementAskedIds`). Declined-with-reason lets the candidate change their platform and ask again, which is the only way a second ask can happen.
5. **Lines.** Drafted below for the words lead; not for the director.

## Real episodes (calibration)

- A large union declined to endorse a presidential candidate in 2024 after asking both for commitments (on not interfering in union campaigns and honoring the right to strike) and not getting them. The refusal is stated as a reason tied to the union's own demands. https://www.scrippsnews.com/politics/path-to-the-white-house/teamsters-union-declines-to-endorse-a-presidential-candidate ; https://gvwire.com/2024/09/18/teamsters-union-declines-to-endorse-trump-or-harris-for-president
- A city's central labor council declined to endorse in a mayoral race at all while several of its member unions endorsed the incumbent: the body stays out, its parts do not. https://www.austinchronicle.com/news/labor-unions-split-on-mayoral-race-13284226/
- A local labor body reportedly rescinded an endorsement of an incumbent councilman at a September meeting, weeks before the election, by report of party sources rather than a statement. https://www.citybeat.com/news/berding-on-the-chopping-block-12159868
- Local newspapers declined to endorse in council races for reasons of conflict (a candidate's spouse works at the paper; the council decides the paper's contract with the city). The reason given is about the endorser's own position, not the candidate. https://www.albertleatribune.com/?p=585326 ; https://beverlyhillscourier.com/2022/05/26/the-courier-will-not-endorse-in-city-council-race

## The moment

The candidate asks one person who matters for their name. The person does not say yes. Three kinds of "no" recur in the sources and each needs a different reply: a no about the candidate's positions (the union wanted commitments it did not get), a no about the endorser's own position (a conflict, a body that stays out while its parts do not), and a "not yet" (waiting for the endorsement meeting). The candidate then chooses: press the point, change the platform and come back, accept it and ask for something smaller, or ask them to keep it quiet.

## What the records give today

| Packet line                          | Record                                     | Fires today                 |
| ------------------------------------ | ------------------------------------------ | --------------------------- |
| the ask                              | none                                       | no                          |
| the answer and its reason            | computed in `askForEndorsement`, not kept  | no                          |
| a yes reaching the circle            | `reach(... "endorsement" ...)`, cause rows | yes, no scene               |
| the person asked is a body's officer | `organizations`, offices                   | exists, not read by the ask |
| the rival preferred                  | `agreementWith` per campaign               | computed, not kept          |

## Gaps

- Engine, filed: `campaigns-endorsement-ask-answer-record` (lead effects).
- Director item filed: `scene-endorsement-refused` (lead director), naming the trigger, place, cast and outcome above.

## Drafted lines for the words lead (bank `scene-talk`, purpose `endorsement-refused`)

Stances for the candidate after "I'm not going to put my name on this": press the point; change the platform and come back; ask for something smaller; ask them to say nothing publicly.

Opening (asked, by top trait, with the reason slot `{reason}`):

- Careful: "I like you, and I still can't. {reason}."
- Blunt: "No. {reason}, and I'd rather you heard it from me."
- Warm: "You've earned a better answer than no. {reason}."
- Guarded: "I'm not going to do that this cycle. {reason}."

Reasons by kind: about the platform ("you and I disagree on {issue}"); about the endorser ("my members haven't voted on it, and I won't speak for them"); a conflict ("the council signs our contract"); a rival ("{opponent} asked first, and kept their word on {issue}").

Candidate replies (four stances): "Tell me what would change it." / "Then I'll come back when I've made {issue} clear." / "Would you at least not stand with {opponent}?" / "I understand. I'd ask you to keep this between us."

Ties: a friend adds "I'm sorry"; a rival says it short; a stranger asks for the platform in writing.
