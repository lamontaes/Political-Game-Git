# Packet: a parent comes to the office about a son in custody

Helper E, scene researcher, Oct 27, 2026. Calibration only: no real name or quoted line ships. Format follows the director lead's request.

## For the director

1. **Trigger.** `justice.imprisoned` (the justice engine writes it when a sentence starts custody; `personIds` is the prisoner, facts `sentenceId`, `custodyMonths`, `releaseDate`). Real record from a played year: Spokane Valley, Washington (place key 5367167), seed `888fd3b49bc5:0`, id `justice.imprisoned:sentence:case:investigation:bribe:2025-02-01:person_19f97ac6427f0d3f:...` (a sentence for a taken bribe, so this scene also follows the corruption episode). Two such records in that year; none in Milford, Massachusetts or Onenoa, American Samoa. Earlier records, `justice.charged` and `justice.bail-set`, also exist for the same person and give a scene before the sentence.
2. **Place kind.** The official's office, at the counter or by phone. The same year in Spokane Valley wrote 339 `office.approached` visits, so the office is already a place residents come to; none of them is about custody.
3. **Cast rule.** The visitor is a living relative of the prisoner (the `kin` fill, from the prisoner's family records) who lives in the official's district. The official is the local member the visit goes to, chosen as `constituent-cases.ts` already chooses (the officials nearest to home). No kin in the district, no scene.
4. **Outcome record.** The reply writes a case on the constituent-cases table with problem `family-in-custody`, referral to what the official can reach (a call to the sheriff or jail, a letter on conditions or bail, the governor's clemency desk when the official is the governor). The justice engine reads the call or letter (visiting access, a bail review) and the official's `view` among kin moves with a cause. Engine item below.
5. **Lines.** Drafted below for the words lead.

## Source

Reason, "Sen. Mike Lee says federal prison hung up on him when he tried to check on inmate", Apr 15, 2026, https://reason.com/2026/04/15/sen-mike-lee-says-federal-prison-hung-up-on-him-when-he-tried-to-check-on-inmate/ . A senator's office took a constituent's call: the family had not reached their incarcerated son for several days. The senator phoned the prison, was hung up on, and said so publicly; the prison service later called that treatment unacceptable. Pattern check (same shape, other lives): congressional casework oral histories (the Moakley Oral History Project, Suffolk University, https://dc.suffolk.edu/moh/28 ) and state house oral histories describe the same weekly call from a parent about a relative in custody.

## Fact packet (substance)

1. A parent has not heard from a son since a hearing; the family cannot find where he is held or when he can be reached.
2. The parent has tried the jail and been passed along. They come to the official because no one else will tell them.
3. They do not ask for the sentence to be undone. They ask for an answer, a visit, a bail review.
4. The official can make a call, send a letter, or say honestly that it is not theirs to fix.
5. What came after: the call is made and answered or not; the parent learns it, and what the official did becomes known in the family's circle.

## Gaps

- Engine, lead `effects`: no custody problem exists in `problemOf`; no referral reaches a jail or the justice engine. Filed `gov-constituent-case-family-in-custody`.
- Director (this packet): `scene-constituent-family-in-custody`.
- The general ending-writer gap is `words-scene-ending-writes-its-record`.

## Lines drafted (for the words lead; scene-standard rule 4)

Visitor opening, by temperament: "I didn't know who else to call." (anxious) / "Nobody at the jail will tell me anything." (hurt) / "I'm not asking for a favor. I'm asking where my son is." (proud).
Statement, by custody stage: charged ("He was arrested on {date}. No one has told us what happens next."), bail set ("They set bail where we can't reach it."), imprisoned ("He is serving {months} months, and we haven't been able to visit.").
Four stances for the official: promise ("I'll call the jail myself today."), ask ("Tell me when you last heard from him."), decline honestly ("This isn't something my office can change, and I won't tell you it is."), refer ("My staff will find out where he is held and call you tomorrow."), plus the lie ("I already spoke to the sheriff.").
The visitor's answers vary by tie: a long-time supporter ("You've always listened."), a past critic ("I know I voted against you. I'm here anyway.").
