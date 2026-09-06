# Where the legislative rule packs come from

Every `known` value in `src/simulation/legislature-rule-packs.ts` cites an
instrument. This page records what was actually read, so the `verification`
field on each source can be checked rather than trusted. Kentucky, Nebraska and
Alaska were read on 2026-09-02; Minnesota and Illinois were added on 2026-09-05
(see their sections below, and the note on how they were read); Maryland,
Missouri, Nevada and Ohio were added on 2026-09-06 from each state's own
publisher.

`verified` means the operative text of the cited section was read and says what
the pack claims. `partial` means the instrument and section are the right ones,
but only a heading, table of sections or official summary was checked. Nothing
is marked verified by construction, and a value no source settled stays
`unknown`.

## Kentucky

The two chambers keep separate rule books with overlapping numbering, so the
pack cites each chamber's own rules. A House rule does not establish Senate
procedure even where the two agree.

Read in full (`verified`):

| Citation           | What it says                                                                                                                                                                             |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| House Rule 37      | Committee on Committees; a majority of it has full power to act on matters referred to it.                                                                                               |
| House Rule 38      | Standing committees of the House, including Transportation.                                                                                                                              |
| House Rule 46      | Committee Reports: a bill may be reported with the opinion that it should pass, should pass with a committee amendment, should pass with a committee substitute, or **should not pass**. |
| House Rule 47      | It requires a majority of the committee membership to report a bill; the chair records each member's vote.                                                                               |
| House Rule 54      | Reference of Bills; a House bill amended in the Senate and returned for concurrence goes to the Rules Committee.                                                                         |
| House Rule 58      | Orders of the Day; the Rules Committee decides floor placement.                                                                                                                          |
| House Rule 59      | Final Passage after concurrence.                                                                                                                                                         |
| House Rule 60      | Amendments to Bills.                                                                                                                                                                     |
| Senate Rule 38     | Standing committees of the Senate, including Transportation.                                                                                                                             |
| Senate Rule 46     | Committee Reports, in the same four forms.                                                                                                                                               |
| Senate Rule 47     | Majority and Minority Reports: a majority of the committee membership to report.                                                                                                         |
| Senate Rule 48     | Failure to Report: the remedy where a committee will not report a bill.                                                                                                                  |
| Senate Rule 54     | Reference of Bills within five session days; House-amended Senate bills go to the Rules Committee for concurrence.                                                                       |
| Ky. Const. Sec. 46 | Bills must be reported by committee, printed and read; a majority of all the members elected to each House passes a bill.                                                                |

Checked by heading only (`partial`): House Rule 48, Senate Rules 37, 58 and 60,
and Ky. Const. Secs. 42, 47 and 88.

Corrected from the previous pack:

- House Rules 39 and 41 were being applied to the Senate as well as the House.
  Rule 39 is _Appointment of Committees_ and Rule 41 is the _Rules Committee_;
  neither is the committee-report threshold, which is Rule 47 in both chambers.
- `measuresDieAtAdjournment` was `known true` on the strength of Sec. 42. That
  section fixes session length and does not say what becomes of a pending
  measure, so the value is now `unknown`.
- The default effective-date rule stays unresolved; Sec. 55 is the section to
  review next.

## Nebraska

Read in full (`verified`): the Legislature's own [Lawmaking in
Nebraska](https://nebraskalegislature.gov/about/lawmaking.php) explanation. It
establishes the nine-member Reference Committee and fourteen standing
committees, the twenty-five votes needed to adopt amendments and advance a bill
from General File, and that a bill becomes law if the Governor signs it _or
declines to act_.

Checked by section only (`partial`): Const. Art. III Secs. 10 and 14, Art. IV
Sec. 15, and Legislative Rules 3 and 6.

Corrected from the previous pack:

- The pack said every referred bill is guaranteed a public hearing and told the
  player so. The official explanation says **most** bills, with exceptions for
  a few technical bills. The value is now `unknown` and the player is told most
  bills are heard rather than promised that theirs will be.
- Art. III Sec. 14 was cited as the source of all three floor stages. It
  governs printing, final reading and passage; General File and Select File come
  from the Legislature's rules and its official explanation.
- Gubernatorial inaction was `unknown`. It is not: the bill becomes law.
- `measuresDieAtAdjournment` was `known true` on Art. III Sec. 10. Bills carry
  over within a biennium and die at its end, which is not the same event, and
  this field cannot express the difference, so it is `unknown`.

## Alaska

Read in full (`verified`): Const. Art. II Secs. 15, 16, 17 and 18, and the
headings and operative language of Uniform Rules 22, 23, 35 and 43.

| Citation        | What it says                                                                                                                                                                                                                               |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Art. II Sec. 15 | Veto; the Governor may strike or reduce items in appropriation bills and returns a vetoed bill to the house of origin.                                                                                                                     |
| Art. II Sec. 16 | Action Upon Veto: joint session; three-quarters of the membership for revenue and appropriation bills, two-thirds otherwise.                                                                                                               |
| Art. II Sec. 17 | Bills Not Signed: fifteen days in session, twenty out of session, Sundays excepted — and the bill **becomes law**.                                                                                                                         |
| Art. II Sec. 18 | Effective Date: ninety days after enactment, unless two-thirds of each house set another date.                                                                                                                                             |
| Uniform Rule 23 | Committee Meetings and their notice requirement.                                                                                                                                                                                           |
| Uniform Rule 35 | Amendment: a bill in second reading is subject to amendment; an amendment may not be made to a bill in its third reading, but the bill may be returned to second reading by a majority vote of the full membership for specific amendment. |
| Uniform Rule 43 | Enrollment after both houses have passed a bill.                                                                                                                                                                                           |

Corrected from the previous pack:

- The fifteen- and twenty-day action windows were cited to Sec. 15. They are
  Sec. 17, which also settles inaction — so `inactionOutcomeInSession` is no
  longer `unknown`.
- The default effective date was `unknown`. Sec. 18 establishes it.
- Uniform Rule 22 was cited as the authority for referral and floor amendments.
  It is _Open and Executive Sessions_. Referral now cites the Legislature's own
  process guide and Uniform Rule 20's committee jurisdictions, and the authority
  for floor amendments is `unknown` — so this pack does not permit them, which
  is why the Alaska scenario cannot amend on the floor.
- Alaska third-reading amendability was previously recorded as `unknown`.
  Uniform Rule 35 expressly states that an amendment may not be made to a bill
  in its third reading and requires return to second reading by majority vote of
  the full membership for specific amendment; third reading is therefore a
  sourced `known false` prohibition rather than `unknown`.
- Uniform Rule 44 was cited for committee notice and the report majority. It
  concerns the time limit on introduction; notice is Rule 23.

## Minnesota

Added on 2026-09-05 from the operative text of the Minnesota Constitution,
article IV. Every `known` value in the pack is the constitution's own words; the
chamber-rule layer — committee structure, referral, discharge, conference — was
not read, so those fields stay `unknown` and the pack declares no committee.

Read (`verified`):

| Citation             | What it says                                                                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Minn. Const. § IV.22 | No law is passed unless voted for by a majority of all the members elected to each house.                                                                    |
| Minn. Const. § IV.23 | Governor's approval; three days (Sundays excepted) in session and a fourteen-day post-adjournment window; item veto for appropriations; two-thirds override. |
| Minn. Const. § IV.12 | Sessions run to no more than 120 legislative days per biennium and end after the first Monday following the third Saturday in May.                           |
| Minn. Const. § IV.13 | A majority of each house is a quorum.                                                                                                                        |
| Minn. Const. § IV.18 | Revenue bills originate in the House of Representatives; the Senate may amend as on other bills.                                                             |
| Minn. Const. § IV.19 | A bill is considered on three different days in each house unless two-thirds dispense with the rule.                                                         |
| Minn. Const. § IV.20 | A bill passed by both houses is enrolled and signed by each presiding officer.                                                                               |
| Minn. Const. § IV.7  | Each house determines the rules of its proceedings — the authority under which the unread referral, committee and floor-amendment rules are made.            |

The seat counts are **not** constitutional and are not cited as though they were.
Art. IV, § 2 says the number of members "shall be prescribed by law", and
**Minn. Stat. § 2.021** is the law that prescribes it: the senate is composed of
67 members and the house of representatives of 134. That statute is the pack's
`seatsSource` for both chambers, and both it and the delegating section are
cited.

| Citation            | What it says                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Minn. Const. § IV.2 | The number of members composing each house shall be prescribed by law — the constitution fixes no count of its own. |
| Minn. Stat. § 2.021 | Number of members: the senate is composed of 67 members and the house of representatives of 134.                    |

Left `unknown`: the floor-amendment authority and germaneness standard, **whether
a bill may be amended at third reading**, referral and hearing guarantees,
conference, the default effective date (Minn. Stat. § 645.02, not read), and
whether a measure dies at a given adjournment as opposed to at the end of the
biennium. Origination is split: revenue bills are confined to the House by art.
IV, § 18, and where an _ordinary_ bill may start is unresolved, because no source
read says.

## Illinois

Added on 2026-09-05 from the operative text of the Illinois Constitution of
1970, article IV. Same discipline as Minnesota: constitutional values only, no
committee declared.

Read (`verified`):

| Citation           | What it says                                                                                                                                                             |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ill. Const. § IV.8 | A bill becomes law only with the concurrence of a majority of the members elected to each house; bills originate in either house; read by title on three different days. |
| Ill. Const. § IV.9 | Sixty calendar days to act after presentment; three-fifths of the members elected to override; item veto and a reduction veto (a reduced item restored by a majority).   |
| Ill. Const. § IV.5 | The General Assembly convenes each year on the second Wednesday of January; no fixed adjournment deadline.                                                               |
| Ill. Const. § IV.6 | A majority of the members elected to each house is a quorum; each house determines the rules of its proceedings.                                                         |

Illinois fixes its own seat counts in the constitution, so unlike Minnesota the
seat provenance here is constitutional: **art. IV, § 1** vests the legislative
power in a General Assembly "elected by the electors from 59 Legislative
Districts and 118 Representative Districts."

Left `unknown`: the germaneness standard, **whether a bill may be amended at
third reading**, referral and hearing guarantees, conference, and the default
effective date (Effective Date of Laws Act, 5 ILCS 75, not read). The
post-adjournment action window is `not-applicable`: Illinois runs one flat
sixty-day window with no separate post-adjournment period. Origination is
`known`: art. IV, § 8 says a bill may originate in either house, and no subject
class is confined to one of them.

## The 2026-09-06 wave — Maryland, Missouri, Nevada and Ohio

Four states compiled in one pass from the operative text of each state's own
constitution, retrieved directly from that state's publisher on 2026-09-06.
Unlike the Minnesota and Illinois pass, no search index stood in the way: each
cited section was fetched from the official URL the pack carries, and each
source's `note` holds the words that were read.

| Pack     | Publisher read                                                                                    |
| -------- | ------------------------------------------------------------------------------------------------- |
| Maryland | Maryland State Archives, _Maryland Manual On-Line_, Constitution of Maryland, Articles II and III |
| Missouri | Missouri Revisor of Statutes, Constitution of Missouri, per-section pages                         |
| Nevada   | Nevada Legislature, _The Constitution of the State of Nevada_ (rev. 4/15/2026)                    |
| Ohio     | Ohio Laws (`codes.ohio.gov`), Ohio Constitution, per-section pages                                |

The Maryland text is the State Archives' publication rather than the General
Assembly's, and the pack's `sourceTitle` says so. The rest are the legislature's
or the reviser's own.

The same discipline as Minnesota and Illinois applies throughout: constitutional
values only, no committee declared, and the chamber-rule layer left `unknown`
rather than copied from a neighbour.

### Maryland

| Citation                     | What it says                                                                                                                                                                                                                                                                           |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Md. Const. art. III, § 2     | The Senate consists of forty-seven Senators and the House of Delegates of one hundred forty-one Delegates.                                                                                                                                                                             |
| Md. Const. art. III, § 15(1) | A session may run not longer than ninety days in each year, consecutive unless otherwise provided by law, extendable by thirty more on a three-fifths vote of the membership in each House.                                                                                            |
| Md. Const. art. III, § 19    | Each House determines the rules of its own proceedings — the authority behind the unread referral, committee and amendment rules.                                                                                                                                                      |
| Md. Const. art. III, § 20    | A majority of the whole number of members elected to each House is a quorum.                                                                                                                                                                                                           |
| Md. Const. art. III, § 27(a) | Any bill may originate in either House and be altered, amended or rejected by the other; none may originate in the last thirty-five calendar days of a regular session without two-thirds; three different days of reading.                                                            |
| Md. Const. art. III, § 28    | No bill becomes a Law unless passed in each House by a majority of the whole number of members elected.                                                                                                                                                                                |
| Md. Const. art. III, § 30    | Presentment by the presiding officer of the House of origin; bills presented no later than twenty days after adjournment.                                                                                                                                                              |
| Md. Const. art. III, § 31    | A Law takes effect the first day of June next after the session at which it was passed, unless it declares otherwise.                                                                                                                                                                  |
| Md. Const. art. III, § 52    | Every appropriation is either a Budget Bill or a Supplementary Appropriation Bill.                                                                                                                                                                                                     |
| Md. Const. art. II, § 17     | Veto: three-fifths of the members elected to each House to repass; six days (Sundays excepted) in session; thirty days after presentment for bills presented at or after adjournment; item veto except the Budget Bill; a bill whose return adjournment prevents "shall not be a law". |

Left `unknown`: referral, hearing guarantees, germaneness, whether a bill may be
amended at third reading, conference, and whether a measure dies at adjournment.
Recorded as gaps rather than coerced into a field: the thirty-five-day
origination cutoff, the Budget Bill's separate track, and the pocket veto in
§ 17(b).

### Missouri

| Citation                     | What it says                                                                                                                                                                            |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Mo. Const. art. III, § 3(a)  | The house of representatives consists of one hundred sixty-three members.                                                                                                               |
| Mo. Const. art. III, § 5     | The senate consists of thirty-four members.                                                                                                                                             |
| Mo. Const. art. III, § 20    | Sessions convene the first Wednesday after the first Monday in January; a majority of the elected members of each house is a quorum.                                                    |
| Mo. Const. art. III, § 20(a) | The general assembly adjourns at midnight on May thirtieth; bills left on a calendar after 6:00 p.m. on the first Friday following the second Monday in May are tabled.                 |
| Mo. Const. art. III, § 21    | Bills may originate in either house and be amended or rejected by the other; **no bill may be so amended as to change its original purpose**; three different days of reading by title. |
| Mo. Const. art. III, § 22    | **Every bill shall be referred to a committee of the house in which it is pending**; one-third of the elected members may relieve a committee of a bill.                                |
| Mo. Const. art. III, § 27    | Concurrence, conference reports and final passage all take a majority of the members elected to each house, recorded by yeas and nays.                                                  |
| Mo. Const. art. III, § 29    | No law except an appropriation act takes effect until ninety days after adjournment, absent a two-thirds emergency.                                                                     |
| Mo. Const. art. III, § 30    | Presentment to the governor in person on the day the bill is signed.                                                                                                                    |
| Mo. Const. art. III, § 31    | Fifteen days after presentment in session, forty-five after adjournment or a thirty-day recess; a bill not returned becomes law.                                                        |
| Mo. Const. art. III, § 32    | Two-thirds of the elected members of each house to repass, in a September veto session where the return came late.                                                                      |
| Mo. Const. art. IV, § 26     | Partial veto of appropriation items, but no reduction of free-public-school or debt-service appropriations.                                                                             |

Missouri is the first pack in the corpus whose **referral requirement and
germaneness standard are constitutional** rather than chamber rules, so both are
`known` here and `unknown` everywhere else. Requiring referral is not promising a
hearing, and § 22 promises none, so the hearing guarantee stays `unknown`.

Recorded as gaps: the one-third discharge power, the scheduled veto session, the
May tabling deadline and the § 25 introduction limit, the item-veto carve-outs,
and conference composition (§ 27 fixes only the adoption threshold).

### Nevada

| Citation                 | What it says                                                                                                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nev. Const. art. 4, § 2  | Sessions are biennial, commencing the first Monday of February after the Assembly election, and adjourn sine die not later than midnight at the end of the 120th consecutive calendar day; later action is void.                                  |
| Nev. Const. art. 4, § 5  | The Senate is between one-third and one-half the size of the Assembly, and the Legislature fixes the numbers by law.                                                                                                                              |
| Nev. Const. art. 4, § 6  | Each House determines the rules of its proceedings.                                                                                                                                                                                               |
| Nev. Const. art. 4, § 13 | A majority of all the members elected to each House is a quorum.                                                                                                                                                                                  |
| Nev. Const. art. 4, § 16 | Any bill may originate in either House, and all bills passed by one may be amended in the other.                                                                                                                                                  |
| Nev. Const. art. 4, § 18 | Reading by sections on three several days; a majority of all the members elected to each House to pass; **two-thirds for a bill that creates, generates or increases public revenue**; a majority may instead refer such a measure to the people. |
| Nev. Const. art. 4, § 35 | Two thirds of the members elected to each House to override; five days (Sunday excepted) in session; ten days after final adjournment to file objections with the Secretary of State.                                                             |

Nevada's seat counts carry **no** `seatsSource`. Art. 4, § 5 delegates the
numbers to law, and the law that answers (NRS 218B.100, .250 and .260) creates
the districts by adopting a filed shapefile rather than by stating a count, so no
instrument read for this pack establishes 21 and 42 as numerals. Citing § 18 or
§ 5 for them would name a provision that does not fix them.

The § 18(2) revenue supermajority is the wave's clearest schema gap: the runtime
carries one threshold per floor stage and can confine a subject class by chamber
but not by vote. The ordinary passage rule stays the majority § 18(1) states, and
the supermajority is recorded in `unresolvedGaps` rather than raised into the
general rule or disguised as an origination restriction.

Nevada is also the corpus's first `unknown` item veto. Art. 4, § 35 describes the
return of a whole bill and never mentions an item; that silence is neither a
grant nor a denial, so the pack claims neither.

### Ohio

| Citation                    | What it says                                                                                                                                                                                     |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Ohio Const. art. II, § 1c   | No law goes into effect until ninety days after the governor files it with the secretary of state — the referendum window.                                                                       |
| Ohio Const. art. II, § 1d   | Tax levies, current-expense appropriations and declared emergencies take immediate effect on a two-thirds vote of all the members elected to each branch.                                        |
| Ohio Const. art. II, § 6    | A majority of all the members elected to each House is a quorum.                                                                                                                                 |
| Ohio Const. art. II, § 7    | Each house determines its own rules of proceeding.                                                                                                                                               |
| Ohio Const. art. II, § 8    | First regular session convenes the first Monday of January in the odd-numbered year, second on the same date the following year; no adjournment deadline.                                        |
| Ohio Const. art. II, § 15   | No bill passes without the concurrence of a majority of the members elected to each house; bills may originate in either house; three different days of consideration unless two-thirds suspend. |
| Ohio Const. art. II, § 16   | Three-fifths of the members elected in each house to repass; ten days (Sundays excepted) to act, and ten days after an adjournment that prevents return; item veto for appropriations.           |
| Ohio Const. art. XI, § 2    | Each house district is entitled to a single representative; each senate district to a single senator.                                                                                            |
| Ohio Const. art. XI, § 3(A) | The state's population is divided by ninety-nine and by thirty-three to fix the ratio of representation.                                                                                         |

Ohio's seat provenance is the redistricting article, not the legislative one:
§ 3(A) fixes ninety-nine and thirty-three districts and § 2 gives each district
one member. Both halves of that chain are cited so it can be followed. The § 1d
emergency route is recorded as a gap, because the schema carries one default
effective rule and no field for a class of law that escapes it.

### What this wave deliberately did not do

Texas and Massachusetts were evaluated and left out. Both would have added a
denominator the corpus does not yet have — a veto reconsidered by the members
_present_ — but neither constitution fixes a general passage threshold for an
ordinary bill, and the current Texas House Rules do not state one either. A rule
pack must carry a passage vote for every chamber, so including either state would
have meant inventing the one value the whole corpus exists to avoid inventing.
They stay candidates for a wave that reads chamber rules properly.

## Amendability is read per stage, and per stage it is often unknown

A chamber can be known to amend bills somewhere while nothing read says which
reading does it. Those are two questions and the packs keep them apart:
`AmendmentRule.floorAmendmentsAllowed` is the chamber-level permission, and each
`FloorStageRule.amendable` is the stage-level one. Illinois is the clearest case
— art. IV, § 8 establishes that a bill may be amended, so the chamber-level value
is `known true`, while the stage that takes the amendment is set by chamber rules
that were not read, so the third reading is `unknown`. Minnesota and Alaska are
unresolved at both levels. Kentucky's chambers each have an Amendments to Bills
rule, and Nebraska's Final Reading positively takes no amendment; those stay
`known`. Nothing here turns an absence of evidence into either a permission or a
prohibition.

## How Minnesota and Illinois were read

Direct network egress to `revisor.mn.gov` and `ilga.gov` was blocked by the
build environment's policy, so the operative text of each cited section was read
through an authoritative search index of the official constitution on
2026-09-05 rather than by loading the official URL directly. The canonical
instrument is cited as the source of record, and each source's `note` carries
the operative language that was read, so a `verified` value can still be checked
against the words it claims. Where only a summary was available, or the section
governs a chamber-rule matter, the value stays `unknown`.

## What is a scenario assumption rather than a rule

Committee sizes in the Kentucky, Nebraska and Alaska packs are the scenario's,
and carry `membershipBasis: "scenario-fixture"`. Which committee takes a bill is
likewise the scenario's choice, although the committee names used in Kentucky
are real and appear in each chamber's own Rule 38. How a member votes is authored
per scenario and is not a claim about anyone's behaviour. Minnesota, Illinois, Maryland,
Missouri, Nevada and Ohio declare no committee at all: their chamber rules were
not read, so those packs assert no committee the sources did not establish.
Missouri is worth a second look here — its constitution requires that every bill
be referred to _a_ committee without naming one, so the pack carries the referral
requirement and still declares no committee.
