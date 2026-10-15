WIP TRANSFER COPY: unfinished evidence; no calibration approval or runtime acceptance. Historical queue is superseded by CTO2:15 and newest routing.

# Team 9 bill numbering primary-source packet

The current starting-number data has source excerpts that are not primary-page reads. Missing chambers defaulting to 1 is existing behavior, not evidence of law. This packet records the primary mechanics verified so far and the legal fields that remain open.

## Scope and source path

Method and scope: this is the CTO's 11:12 p.m. Team 2 W2-9 priority. No build or runtime approval is implied. The source data is `data/research/bill-numbering-starts.json` (OCD-LEG-NUM-002). The Wave 2 day-assignment document did not include the W2-9 prompt; the newer CTO entry supplies the scope.

## Primary mechanics verified

| Jurisdiction | Actual primary-source observation                                                                                                                                                                                                                                                                                                   | Boundaries                                                                                                                                                       |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Federal      | Senate explains H.R./S. bill numbers follow introduction order; H.J.Res./S.J.Res., H.Con.Res./S.Con.Res., H.Res./S.Res. are distinct types. House official _How Our Laws Are Made_ says H.R. number retained throughout all parliamentary stages; companion is similar/identical separately introduced measure in opposite chamber. | Reset/start/reservation rule not yet primary-verified in this pass. Historic explanatory House document is corroboration, not current reserved-number authority. |
| Michigan     | Official legislature PDF: at beginning of each biennial session, House bills consecutively start4001; Senate bills start1; joint resolutions receive a LETTER in both houses.                                                                                                                                                       | Confirms main's MI starts and biennial basis; letter-series numbering needs separate representation. No annual reset.                                            |
| Florida      | Official Senate FAQ: House bills odd1,3,5…; Senate bills even2,4,6… . Companion introduced opposite house, substantially same and identical specific intent/purpose. Linked bill is contingent on another bill, different concept.                                                                                                  | Main starting-number-only schema cannot encode step2. FAQ requires relevant session when searching; exact regular/special reset rule not verified.               |
| North Dakota | Official legislature general-information page: House bills begin1001, Senate begin2001.                                                                                                                                                                                                                                             | Main starts primary-confirmed. Reset/type-specific/reservation rules not yet verified.                                                                           |
| Washington   | Official help page provides bill history, versions, amendments and companion field; official bills page defines two-year legislative biennium starting odd years.                                                                                                                                                                   | CURRENT help page read did NOT state main's1000/5000 ranges. Do not mark those primary-confirmed from the accessible page.                                       |

Primary URLs read:

- https://www.senate.gov/legislative/common/briefing/leg_laws_acts.htm
- https://www.govinfo.gov/content/pkg/CDOC-110hdoc49/pdf/CDOC-110hdoc49.pdf (House _How Our Laws Are Made_,110th Congress)
- https://legislature.mi.gov/documents/publications/HowBillBecomesLaw.pdf (working current path; old main-recorded path did not yield usable PDF)
- https://www.flsenate.gov/Reference/FAQ (questions4,6,7,10)
- https://ndlegis.gov/general-information
- https://leg.wa.gov/bills-meetings-and-session/bills/
- https://leg.wa.gov/bills-meetings-and-session/bills/help-with-bills/

## Actionable Team2 design suggestions, not approval

Persist immutable internal measure ID separately from displayed designation. Number allocation key must carry jurisdiction/body, numbering period/session, originating chamber and measure type; data supplies first value and step or letter series. Allocate once on actual introduction, preserve through referral, amendment, passage, cross-chamber receipt, enactment and history. Opposite-chamber companion gets its own introduction and designation plus an explicit relation; transfer of the same measure does not create a new number. Do not conflate bill number, committee-report number, calendar number, amendment number and public-law/chapter number. Amendments/version labels belong to versions of the same measure.

Preserve old saves/IDs/numbers; no retroactive renumbering or research default overwrite. Missing legal rule is a research gap, never factual assertion that every jurisdiction starts1. Reserved numbers can make introduction order nontrivial; separate reservation/assignment record from naïve maximum+1. No specific federal/state reservation range is approved by this packet.

## Coverage ledger

56-place full coverage is NOT READY. Direct bill-sequence rules were verified only for MI, FL, and ND in this pass (3/56); Washington has partial session and companion evidence. The other 53 places still need primary verification of chamber, type, start, step, reset, special-session, and reservation rules.

The 53 places still needing direct verification are listed here:

- AL, AK, AZ, AR, CA, CO, CT, DE, GA, HI, ID, IL, IN, IA, KS, KY, LA, ME, MD, MA, MN, MS, MO, MT, NE, NV, and NH.
- NJ, NM, NY, NC, OH, OK, OR, PA, RI, SC, SD, TN, TX, UT, VT, VA, WA, WV, WI, WY, DC, PR, GU, VI, AS, and MP.

MI, FL, and ND also need verification of their remaining fields; no place is fully cleared.

Source-access limits: Congress.gov help pages returned a bot challenge, and Connecticut's official LCO page returned a small error response. The Arizona glossary returned HTML rather than a PDF; the guessed Hawaii PDF path also returned HTML. Guam's former .com bill-list path returned an unusable 91-byte response, while the current .gov homepage was accessible but did not provide bill rules.

These are access limits, not missing-law conclusions. I did not infer federal reserved-number rules from resolutions: the inspected 119th Congress S.Res.4, 6, 8, and 9 did not establish one.

## CTO decisions still needed

Confirm desired handling of historical-save designations and source gaps while exact rules are filled. Decide whether full all-place legal completion is the gate for allocator changes. Federal reset/reserved-number authority and territory assembly-prefix rules remain immediate primary-source follow-up. No fabricated national rule and no single-state extrapolation supplied.

## Guam primary-record addendum

Current official https://guamlegislature.gov/bills-page1/ read:38th Legislature records include Bill No.100-38(COR),99-38(COR),98-38(LS),97-38(LS), and1-38(COR). These are observed designation examples, not rule text establishing an unconditional allocator. Chamber-neutral assembly suffix and COR/LS metadata show HB/SB-only formatting cannot cover this jurisdiction. https://guamlegislature.gov/bills-special-sessions/ read: separate special-session bill collection, updated09/14/2026. Reset, suffix meanings, first-number rule and reservation rules require standing-rules verification. Guam remains incomplete in coverage ledger.

## Federal/Florida follow-up, primary rules versus observed records

Federal constitutional January3 authority verified from National Archives: https://www.archives.gov/founding-docs/amendments-11-27 , AmendmentXX sections1-2. Senator/Representative terms end and successors begin at noonJanuary3 in their relevant years; Congress assembles at least annually beginning noonJanuary3 unless law appoints another day. This annual-session rule DOES NOT itself reset bill numbering annually. Exact bill-number reset at a new Congress and reserved-number authority still NOT VERIFIED here. Bot challenges/404-style responses prevented usable Senate glossary/legislative-process pages; tested119th Senate adopted resolutions4-15 contained no verified reservation rule,20 returned unusable response. Do not transform presumed reserved ranges into findings.

Florida current 2024-2026 Senate Rules primary PDF verified: https://www.flsenate.gov/PublishedContent/Reference/Publications/2024-2026SenateRules.pdf . Rule3.10: measures introduced in order Secretary receives them, serially numbered EVEN numbers as introduced, **without differentiation in number as to type**. Thus the earlier generic per-type-counter suggestion requires jurisdiction-specific namespace data: Florida Senate shares a numeric series among types. Rule1.15 Secretary examines legal form before issuing a bill number. Rule3.8 prefiled compliant bills serially numbered in anticipation of next regular session; introduced/read on first day. Rule3.7(3) can use identity/control number until permanent number affixed. Rule3.11 defines companion and permits substitution of an already-passed House companion; substitute remains actual separate measure, not renumbering original.

Observed Florida special-session designation: https://www.flsenate.gov/Session/Bill/2025A/1A reads House Bill1A(2025A), displayHB1-A. This confirms special-session letter in that actual record, not a universal special-session reset statute. Full regular/special reset/start/suffix assignment rule still incomplete. Session identity must be persisted independently of integer designation; ordinary calendarJanuary1 reset would not account for prefiling. No additional legal rule was inferred.
