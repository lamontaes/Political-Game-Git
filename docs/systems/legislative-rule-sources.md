# Where the legislative rule packs come from

Every `known` value in `src/simulation/legislature-rule-packs.ts` cites an
instrument. This page records what was actually read, so the `verification`
field on each source can be checked rather than trusted. Kentucky, Nebraska and
Alaska were read on 2026-09-02; Minnesota and Illinois were added on 2026-09-05
(see their sections below, and the note on how they were read).

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
headings and operative language of Uniform Rules 22, 23 and 43.

| Citation        | What it says                                                                                                                 |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Art. II Sec. 15 | Veto; the Governor may strike or reduce items in appropriation bills and returns a vetoed bill to the house of origin.       |
| Art. II Sec. 16 | Action Upon Veto: joint session; three-quarters of the membership for revenue and appropriation bills, two-thirds otherwise. |
| Art. II Sec. 17 | Bills Not Signed: fifteen days in session, twenty out of session, Sundays excepted — and the bill **becomes law**.           |
| Art. II Sec. 18 | Effective Date: ninety days after enactment, unless two-thirds of each house set another date.                               |
| Uniform Rule 23 | Committee Meetings and their notice requirement.                                                                             |
| Uniform Rule 43 | Enrollment after both houses have passed a bill.                                                                             |

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

Left `unknown`: the floor-amendment authority and germaneness standard, referral
and hearing guarantees, conference, the default effective date (Minn. Stat.
§ 645.02, not read), and whether a measure dies at a given adjournment as opposed
to at the end of the biennium.

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

Left `unknown`: the germaneness standard, referral and hearing guarantees,
conference, and the default effective date (Effective Date of Laws Act, 5 ILCS
75, not read). The post-adjournment action window is `not-applicable`: Illinois
runs one flat sixty-day window with no separate post-adjournment period.

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
per scenario and is not a claim about anyone's behaviour. Minnesota and Illinois
declare no committee at all: their chamber rules were not read, so the pack
asserts no committee the sources did not establish.
