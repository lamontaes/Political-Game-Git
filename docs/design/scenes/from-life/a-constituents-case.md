# Episode: a resident brings a personal case to the office (office hours, district office)

Slug `a-constituents-case`. Types: `office-hours`. Season: holding office. Calibration only: nothing here ships as player text; no real name or quoted line is in any bank.

## Sources read (for calibration)

Opened in full:

1. A Texas state senator's casework policy and guide, Senate District 9 (https://senate.texas.gov/members/d09/pdf/Senate-District-9-Casework-Guide.pdf, read Oct 27, 2026). Staff "assign a staff member" and "initiate an inquiry with the relevant state agency"; "most cases are resolved within 1-3 weeks." The office is "an intermediary" and cannot "force a state agency to act" or give legal advice, but "can help you identify the right office to contact." It needs a signed release form; "if this form is not completed within 30 days, our office will close your case."
2. NYC Council General Welfare hearing, Mar 17, 2025 (https://citymeetings.nyc/city-council/2025-03-17-1000-am-committee-on-general-welfare/chapter/council-member-raises-concerns-about-home-base-responsiveness). A member's office reported an illegally evicted constituent to a city provider on Feb 3; no answer until Mar 7. The commissioner called it "not acceptable" and promised to follow up on that client.
3. Ideastream, "When in need of city services, Clevelanders call council members more often than City Hall," Jul 27, 2022 (https://ideastream.org/news/government-politics/2022-07-27/when-in-need-of-city-services-clevelanders-call-council-members-more-often-than-city-hall). One ward office got over 1,000 requests in 110 days, most (garbage bins, vacant lots) not council's job; the member had to "cajole city service departments to respond."

Seen only as search summaries (not opened):

4. News 12 Bronx, Jun 5, 2025 (https://bronx.news12.com/council-member-eric-dinowitz-runs-for-reelection-in-district-11): a council member says the office has "closed thousands of constituent cases," from stop signs to keeping heat on to preventing evictions. Page opened, but only that one line was returned.
5. Calgary ward office page and a Windsor councillor item (311 request number first, then the office checks the request). Search summary only; Canadian, context only.
6. Philadelphia Inquirer, Mar 12, 2020 (search summary only): council could not stop evictions or utility cutoffs; it pressed courts and utilities, and the water department then paused shutoffs.

## Fact packet (what happens, in substance)

- **Who:** a resident of the district, with a case from their own life: lost job and rent due, an eviction notice, a shutoff notice, a benefits claim stuck, a pothole or a neighbor's code violation. The official is a council member or a state legislator; a staffer usually takes the intake.
- **Trigger:** the resident has tried the ordinary route (311, a claim line, the landlord) and is stuck, so they come to the office. Often the thing is not the office's to fix.
- **What they ask for:** a call to the agency, a letter, someone to push a stalled claim, or just "tell me who to talk to."
- **What the office can do:** open an inquiry with the agency; refer to the right office or a legal aid line; write a letter; explain the thing is private or another level's (landlord, county, federal); in rare cases move policy later. It cannot order an agency or give legal advice.
- **Intake:** the resident signs a release; staff log the case, name an owner, and note the agency and claim number.
- **The official's stance (four):** take it on, refer it, explain what cannot be done, or promise and stall.
- **Tracking and close:** the case stays open while the agency has it; most close in a few weeks; one with no paperwork back closes after 30 days; the agency's slow answer can be raised in a hearing.
- **What changes after:** the resident's view of the office; sometimes the agency's answer; a pattern of the same case becomes an ordinance idea.

## Ask the engine

| Packet line                                                                            | Record? / fires?                                                                                                                                                                                                                                                                                                                                       | Files                                                                                                          |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Resident with a case                                                                   | Exists for two causes only: no job with thin savings, and pay under the minimum wage (`problemOf`). Eviction, shutoff, benefits, pothole, code: no record.                                                                                                                                                                                             | `src/core2/modules/constituent-cases.ts`                                                                       |
| Trigger: tried the ordinary route first                                                | No record. They come when severity beats effort (`leanedYes`); nothing says what they tried.                                                                                                                                                                                                                                                           | same, `bringCases`                                                                                             |
| Comes to the official they know best                                                   | Exists: `office.approached` (id `office-approached:case:<person>:<date>`, facts `caseId`, `officialId`, `constituentId`, `problem`) written by `bringCase`; `office-hours` fires on it (`causeFacts officialId is subject`, binds constituent and you). Lines exist for purpose `constituent-help`.                                                    | same ~l.405; `src/director/data/situation-types.json` key `office-hours`; `data/english/parts/scene-talk.json` |
| Same event written by a second path                                                    | `approach` in life.ts emits `office.approached` for a drive and a public organization's staff; it is not a case, but it also fires the type (cast may be a staffer).                                                                                                                                                                                   | `src/core2/modules/life.ts` ~l.453                                                                             |
| Asks for a call, letter or push                                                        | Not asked as a request. The case carries a `makeCase` argument (topic, desired change) to the official, nothing about the form of help.                                                                                                                                                                                                                | `constituent-cases.ts` `bringCase`, `data/constituent-cases/problem-questions.json`                            |
| Office can refer, call, letter, explain                                                | Only two outcomes with effects: wage case "help" calls `raiseOne` (pay raised to the floor); job case "help" calls `recordReferral` (jobs engine reads it when an employer picks). "Decline" is `turned-away`. No agency record for a call.                                                                                                            | `resolve`, `wage-floor.ts`, `jobs.ts` `recordReferral` l.2154                                                  |
| Does a promise to call an agency write anything an agency or the resident later reads? | The promise in the scene: no. A `scene.reply` is not tied to `handleCase`; only the desk acts (`office-day-state.ts`, `office-day-acts.ts`) decide a case. The decision itself: yes, `touchImpression` moves the resident's view (ballot reads it) and the two effects above. Nothing is written for "I will call", and no agency has a reply to read. | `constituent-cases.ts` `resolve`; `src/core2/office-day-acts.ts` l.503                                         |
| Intake, owner, release                                                                 | Partial: `CaseRow` has `opened`, `respondBy`, `handledBy`, `stafferId`, `outcome`. No claim number, no agency field.                                                                                                                                                                                                                                   | `CaseRow`                                                                                                      |
| Tracked and closed                                                                     | Exists: `case-due` on the calendar; past the date the office or staffer decides (`officeHandles`, `staffDecision`). No "closed for silence" and no follow-up when the agency is slow.                                                                                                                                                                  | same                                                                                                           |
| After: view of the office, pattern to ordinance                                        | View: exists (`constituent-case` impression). Pattern to an ordinance idea: no record.                                                                                                                                                                                                                                                                 | `touchImpression`, `campaigns`                                                                                 |

## Gaps

| Gap                                                                                                                                         | Kind                            |
| ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| Cases only for jobless and underpaid; no eviction, shutoff, benefits, code or road case, though housing, jobs and the utility records exist | engine (housing, jobs, offices) |
| The scene's reply stance is not tied to `handleCase`: promise, refer, decline and stall write nothing on the case                           | producer (lead director)        |
| No agency side: a referral or call has no receiving record, no answer date, no "slow agency"                                                | engine (offices)                |
| No form of help on the case row (call, letter, referral, explanation) or agency/claim reference                                             | engine (offices)                |
| Close on silence and "promise and stall" (case sits past its date) are not visible to the resident or the scene                             | engine (offices), producer      |
| The resident never says what they already tried                                                                                             | lines, producer (cast fact)     |
| Repeat cases in one area never reach the ordinance step                                                                                     | engine (offices, laws)          |

## Lines the bank needs

The resident by the case (several per top trait and per tie to the player; opener from the `problem` fact, worded):

- Job and rent: out of work, savings thin, asks for any word with an employer.
- Pay: working but paid under the legal wage, asks the office to press the employer.
- Eviction or shutoff notice: what the notice says, how many days left, asks for a call.
- Stalled claim: waited weeks, asks who to push.
- Pothole or neighbor's property: tried 311, asks the office to chase it.

Four replies for the official (four stances, each with a version by trait and by the resident's closeness):

- **Take it on:** "I'll have my office open it with them today; sign the release."
- **Refer it:** names the right office or legal aid line and why it is theirs.
- **Explain what can't be done:** a private landlord, another level of government, a court matter; says what the office cannot order.
- **Promise and stall:** warm, no date, no owner.

## Other lives the same scene covers

- A resident of a Cleveland ward with a vacant-lot and garbage-bin complaint that the council member could only press the department about (Ideastream, Jul 27, 2022).
- A constituent stuck on a city benefit program after an eviction, whose member's office reported it and waited a month for an answer (NYC hearing, Mar 17, 2025).
