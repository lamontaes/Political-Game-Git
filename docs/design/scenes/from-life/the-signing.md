# Episode: the signing, with the people it was written for in the room (the executive's desk or a ceremony room)

Slug `the-signing`. Types: `bill-signed`. Season: holding office. Calibration only: no real name or words ship; none are in any bank. Related, not repeated: `executive-order-voting-rights` (an order, one guest, no sponsor). This one is a bill or ordinance passed by a body, and the room is the sponsor, the people it was written for, an advocate and a skeptic.

## Sources read (for calibration)

Opened in full (fetched pages):

1. Fox News, Oct 29, 2015, https://www.foxnews.com/politics/north-carolina-gov-pat-mccrory-signs-into-law-bill-targeting-sanctuary-cities : a governor signed a bill at a sheriff's office with the sheriff and local officials present; he "passed out pens and shook hands" and left the 20-minute ceremony without taking questions. A civil-liberties group had asked for a veto and protesters stood outside his residence.
2. KJZZ, May 2, 2023, https://www.kjzz.org/2023-05-02/content-1845764-hobbs-signs-bill-extending-funding-az-schools-deaf-and-blind : a governor signed four years of school funding for the state's schools for the deaf and blind (the plan had been eight) and wrote lawmakers asking for the full eight years next session, saying the school's community had met "a lack of respect."
3. Hoodline, Sept 9, 2025, https://hoodline.com/2025/09/philadelphia-mayor-signs-new-ordinance-to-target-gun-violence-through-straw-purchase-prevention/ : a mayor signed a council member's ordinance with the police commissioner beside them, then named the penalties for dealers who do not post warnings ($2,000 a day). The page names no funding.
4. Yahoo News, Apr 8, 2021, https://www.yahoo.com/news/mexico-governor-signs-civil-rights-150400274.html : a governor signed a state civil rights act; an advocate called it a highlight of 20 years' work; critics said it raised costs for taxpayers. The page does not say who was in the room.
5. Fox6 Milwaukee, Nov 22, 2024, https://www.fox6now.com/news/mayor-johnson-honor-alderman-brostoff-ceremonial-signing : a mayor signed two files of a late alderman and honored him. Only the mayor is named as present.

Seen only as search summaries (not opened): Spokane's "Ban the Address" ordinance signing (April 2025, a council member's measure); New Jersey's immigration bills signed with sponsors and advocates; Maine's 2010s anti-drug bill signed with a funding caveat (page returned 403).

## Fact packet (what happens, in substance)

- A body passes a bill or ordinance; its sponsor worked it for a session or more.
- The executive signs it with people in the room: the sponsor, someone it was written for, an advocate, sometimes the official who must carry it out.
- Pens are handed out, hands shaken; who was invited is the message (sources 1, 3).
- The executive says what the law is for in a line, and sometimes names a penalty or a date (source 3).
- The sponsor thanks the people who pushed; the executive credits the body.
- The resident it was written for says what it will mean for their street, school or shop.
- A skeptic, in or outside the room, says it will cost too much or will not be enforced (sources 1, 4).
- An ask comes at or after the signing: the next bill (source 2, the executive asks the body), money, or who will enforce it.
- The executive answers one of four ways: will do the next step, credits others, tempers what it will do, or declines.
- The signing may be thin: an executive who leaves without questions (source 1) or signs with a funding caveat (source 2).
- What changes: the law is in force from a date, a line in the paper, and the ask stays open for the next session.

## Ask the engine

| Packet line                                                    | Engine answer                                                                                                                         | Files                                                                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Body passes, sponsor worked it                                 | Record exists; the sponsor is the bill's `sponsorId`.                                                                                 | `src/core2/modules/legislature.ts` (bills table)                                                                          |
| Executive signs                                                | Record exists and the type fires: `executive-action:<bill id>` (`action: signed`, `executiveId`) casts sponsor, signer, press.        | `legislature.ts:3913`, `src/director/data/situation-types.json` (`bill-signed`), `src/director/government-scenes.test.ts` |
| People in the room (resident, advocate, official who enforces) | No record; the type has only `sponsor`, `signer`, `press`.                                                                            | `situation-types.json`                                                                                                    |
| Pens and the guest list                                        | No record.                                                                                                                            | none                                                                                                                      |
| Executive says what it is for                                  | Exists and fires: the signer opens with `announce-result`.                                                                            | `situation-types.json`                                                                                                    |
| Sponsor thanks                                                 | Exists and fires (`thank`).                                                                                                           | `situation-types.json`                                                                                                    |
| Resident it was written for                                    | Record exists (counted adults a law reaches, `fillInPerson`); nothing fires.                                                          | `docs/design/scenes/from-life/executive-order-voting-rights.md`                                                           |
| Skeptic                                                        | Record exists (the floor vote's `nay` members, `opponent` role in `civic-roles.ts:160`); nothing fires here.                          | `civic-roles.ts`                                                                                                          |
| The ask                                                        | Exists as `signing-ask` (asker signer, asked sponsor, stake bill). It runs the wrong way: the executive asks the sponsor to go first. | `scene-talk.json` (purpose `signing-ask`)                                                                                 |
| Executive's answer in four stances                             | Partly: bank has agree, refuse, bargain, ask, confront on the sponsor's side; none for the executive answering a request.             | `scene-talk.json`                                                                                                         |
| Thin signing (no questions)                                    | No record of whether the executive took questions.                                                                                    | none                                                                                                                      |
| Ask stays open for next session                                | Exists for the bill, but nothing keeps a named ask (next bill, money, enforcement).                                                   | `tag` `honor`, endpoint `bill`                                                                                            |

## Gaps

1. **Lines + producer (lead director):** the `signing-ask` bank has the executive as the asker. In the sources the ask is made to the executive after the signing, by the sponsor, the resident or an advocate.
2. **Producer (lead director):** `bill-signed` casts only sponsor, signer, press. Add the resident the bill reaches (filled in from the counted pool), a nay voter as skeptic, and an advocate from the bill's organized supporters, where each record exists.
3. **Engine (legislature):** no record of what a bill asks next: a follow-up bill, a funding level, the enforcing office. The executive's answer cannot write back without it.
4. **Engine (executive):** no record that the executive signed with a caveat or declined questions; both are the executive's choice to read.
5. **Engine (press):** no record of who was invited or that pens were handed out; the press role is a reporter, not a guest list.
6. **Lines (lead director):** the sponsor, resident and skeptic lines below, with the four executive answers.

## Lines the bank needs (substance for the words line; versions by top trait and tie to the player)

- **Sponsor** (proud, tired, careful, jealous of credit): thanks the one who pushed it; names a piece that was cut; asks for the next bill while the room is warm.
- **Resident**: says the street, school or shop the law reaches in a sentence; asks how they will know it is working.
- **Skeptic**: asks who pays and who checks; says they will be watching the first year.
- **Executive replies** (to the ask):
  - Commit to the next step: names the step and when, and what it takes from the asker.
  - Credit others: gives the body, the sponsor and the people in the room the credit, and does not promise.
  - Temper expectations: names what it will not do on day one and what the money allows.
  - Decline: says no for now, with a reason from the budget or the law in force, and leaves a door.

## Other lives the same scene covers

- A mayor signing a council member's warning-sign ordinance beside the police commissioner, then naming the daily penalty (Hoodline, Sept 9, 2025, above).
- A governor signing a funding bill short of what the school's families sought, and writing the legislature for the full amount next session (KJZZ, May 2, 2023, above).
