# Episode: the party chair asks a member to run for a seat nobody has filed for (party-recruit)

Slug `the-party-asks-you-to-run`. Types: `party-recruit`. Season: before the filing deadline. Calibration only: nothing here ships as player text; no real name or quoted line is in any bank.

## Sources read (for calibration)

Opened in full (fetched Nov 11, 2026):

1. Compass Knox, "Assembling the Field," Mar 3, 2021 (https://compassknox.com/2021/03/03/assembling-the-field/). In a nonpartisan city race, groups recruit and vet candidates: a progressive group recruits and offers endorsements and organizational support; a conservative union's chair seeks candidates who back small government and low taxes and says he has identified some; an independent PAC vets for good-government issues. The county Republicans' outgoing chair says leaders have talked with possible candidates, informally; the county Democrats' chair says the party is not recruiting and typically stays out of city races. Incumbents weigh unfinished projects and their records; one is undecided. Petitions open March 22, filing closes May 20. The article does not describe the pitch itself or how the conversation starts.
2. Indiana Citizen, a report on party chairs and Indianapolis council seats (https://indianacitizen.org/?p=8183). The Democratic chair says two people are being tapped for two districts and the party is working to fill two more; she wants candidates who "roll up their sleeves" and walk neighborhoods. The Republican chair names hopefuls and says the party set a target list of races to chip away at a supermajority. Parties must appoint to vacant seats by a deadline. The article does not describe the ask or how the person decides.

Seen only as search summaries (not opened): a Burlington, Vermont report of a party endorsing one ward candidate and wanting a more active role in city politics; a Fresno forum where a county party chair met candidates.

What neither source gives is the pitch itself or the candidate's side of the decision; those parts of the scene stay estimates.

## Fact packet (what happens, in substance)

- **Who:** a party chair or recruiter, and a member the party thinks would run. In some places the chair only vets, or stays out of nonpartisan races altogether.
- **Trigger:** a seat has no one filed, or a party wants to contest a seat it does not hold, with a filing deadline coming.
- **What the chair asks:** that the member run, naming the seat. The party may offer an endorsement or organizational help.
- **What the member weighs:** their record and unfinished work (for an incumbent), the seat, whether the party's backing matters in a nonpartisan race.
- **What the member answers:** yes, no, or "let me think."
- **What changes after:** a yes is a filing before the deadline; a no leaves the seat to be filled another way (the party may appoint to a vacancy by a date).

## Ask the engine

| Packet line                                 | Record? / fires?                                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Party asks a member to run for a seat       | Exists: the candidacy engine's `party-asked` record names the member, the chair who asks, the party and the seat (`PARTY_ASKED_EVENT` in src/core2/modules/candidacy.ts); the scene's note says the chair comes by the member's home. Fired 2 in the played year in the scene-web report (Wheat Ridge, Colorado, 0884440, seed 0e3f306ea1b7271286ee37f35d841492115e1abb). |
| The member answers yes, no or stalls        | Exists per the type's note: the answer is a scene reply the candidacy engine reads; a yes is the decision to run and the filing follows. Moves: ask, agree, decline, stall, leave. Not re-read in code here.                                                                                                                                                              |
| Offer of endorsement or help                | Not seen in the type's roles or note. Unknown.                                                                                                                                                                                                                                                                                                                            |
| Nonpartisan seats where the party stays out | The type is for a partisan seat with no one filed. A nonpartisan seat's recruiting (groups that vet) has no cause here.                                                                                                                                                                                                                                                   |
| An incumbent weighing unfinished work       | Not seen as a fact of the scene.                                                                                                                                                                                                                                                                                                                                          |

## Gaps

| Gap                                                          | Owner                        |
| ------------------------------------------------------------ | ---------------------------- |
| Nonpartisan seats: no recruiter cause for a group that vets  | engine (candidacy), director |
| The offer of endorsement or help writes nothing              | engine (campaigns)           |
| The member's own reasons (record, unfinished work) not named | lines, producer (cast fact)  |

## Lines the bank needs

For Story to write (builders never write data/english/parts):

- The chair at the member's home: the ask for the named seat, by the chair's traits and tie to the member.
- The member's answers: yes, a firm no, a stall ("let me think"), by trait; an incumbent's version that names a project left unfinished.
- Narration for the deadline that follows a stall.

## Other lives the same scene covers

- A county party chair naming the people tapped for specific council districts while still working to fill others (Indiana Citizen).
- A county leader who had "talked informally" with possible council candidates in a nonpartisan race (Compass Knox).
