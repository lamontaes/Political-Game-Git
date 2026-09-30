# Several life and news behaviors still end in stand-ins

Recorded facts now reach news and public dossiers. Several decisions about
attendance, offers, attention, migration and violence still end in authored
rules rather than the person's own decision. These are the findings for the
CTO's corrected why-chain assignment. Missing real-world causes below are
research questions, not verified mechanisms or approved sizes.

## Where the chains stop

1. **A story gets covered.** A public event enters the newsroom because it
   matches scope and beat. Why that event first? Added editorial weights rank
   it, staffing limits capacity, and a weekly sweep takes one routine item.
   **Finding: stand-in weights and timing.** Recorded staffing is an input,
   but the numeric ranking is not a researched editor decision. Missing:
   audience demand, editor priorities, competing deadlines and reporter access.
   Evidence: `src/simulation/press/desk.ts:1538`.

2. **A resident learns a law story.** Recorded law effects identify its place;
   current household membership and location identify living residents. When
   the outlet publishes, each selected reader receives accurate, high-confidence
   knowledge. **Finding: automatic uptake, without a personal reading decision.**
   Residence establishes reach, not attention. Missing: reading habit, competing
   demands, comprehension and recorded personal stakes. Pew marginal attention
   observations do not approve a per-story probability or joint age/education
   coefficient. Evidence: `src/simulation/press/desk.ts:1244`.

3. **An unmet official has a public record.** The opening establishes offices;
   the dossier displays public events involving their holders without requiring
   acquaintance. Why is the past so short? The measured opening supplies only
   one inauguration entry for each President and VP. **Finding: richer earlier
   history is absent from those projected records.** Missing: prior offices,
   campaigns and public acts produced by canonical writers. Never invent them
   in the dossier. Evidence: `src/presentation/person-dossier.ts:412`.

4. **Neighbors appear at a meeting.** Posted meeting and availability records
   select eligible people; official chairs take priority. Otherwise group
   memberships order attendees, and the first eligible person chairs.
   **Finding: eligibility and group counts substitute for attendance decisions.**
   A civic-participation citation does not establish this exact selection rule.
   Missing: concern about this agenda, invitation, childcare, transport and each
   person's decision. Evidence: `src/simulation/ordinary-meeting-presence.ts:424`.

5. **A life receives another request.** Existing work, school or social records
   make authored kinds eligible. Why this one now? Least-recently offered kinds
   precede a seed/person/date hash tie; caps and a daily refresh create pace.
   **Finding: a dice-like content tie and pacing stand-ins.** Circumstances use
   the same tie pattern, fixed age bands and shift/reciprocity times. Missing:
   an actual requester's unmet need and decision to ask. Evidence:
   `src/simulation/life-opportunities.ts:758`.

6. **Pressure produces migration shares.** Hazards, tax changes, crime and
   unemployment supply recorded causes. Why these shares? Placeholder amounts
   accumulate with fixed decay, then multiply a 2% baseline and normalized
   destination pull. **Finding: aggregate stand-ins, not household move decisions.**
   Missing: available housing, job offers, family ties, moving costs and the
   household's resources and choice. Evidence: `src/simulation/pressure/flows.ts:108`.

7. **Unrest becomes a threat and attack.** Placeholder state anger crosses a
   line, persists, selects a prominent target and accumulates strain to another
   line. **Finding: threshold-driven escalation without an attacker's decision.**
   Missing: an identifiable actor's grievance, organization, opportunity,
   restraint and response to policing. Evidence: `src/simulation/pressure/ladder.ts:393`.

8. **A local event becomes an economic shock.** Actual transferred public money
   or closed jobs supply provenance. Why this intensity? An unresearched
   full-intensity denominator, a jobs-share scale and caps convert those facts.
   **Finding: stand-in magnitudes.** Missing: which people and firms change
   spending, hiring or borrowing because their own balance sheets changed.
   Evidence: `src/simulation/macro-economy/sources.ts:294`.

9. **A ready-made local story appears.** It no longer does: synthetic opening
   archives and scheduled continuations are retired. Canonical law, council,
   business, election and death writers must supply events. **Finding: no
   substitute event fills a producer gap.** Missing coverage must be traced to
   its real writer. Evidence: `src/simulation/living-world/developments.ts:27`.

These chains are source-inferred at `34b797f97b1a4f30ba27683502126feb0367b7b6`.
The official-record finding additionally uses the executed canonical opening
projection recorded in the Team 5 handback; reader serialization was unchanged.
No new simulation, test, calibration or browser acceptance is claimed for this
page. Team 4/CTO own public-history coverage; personal habit awaits approved
research and Teams 1/2/4 contracts. The prior numeric register remains supporting
inventory, not the corrected deliverable. No chain here bottoms out in a newly
verified researched effect size.
