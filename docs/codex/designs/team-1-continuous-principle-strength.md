# Principle strength follows a recorded life

The proposed change makes strength a continuous saved quantity formed from a
person's dated experience. It removes the four-step producer and consumer
conversion. The independent officeholder split can remove the seeded draw
first without changing weights. The numeric design below is for CTO review;
no new weights or schema have been implemented.

## Numbered design for CTO

1. **Separate direction from strength.** A principle still has endorsement,
   rejection or conflict. Add a finite continuous strength to its canonical
   append-only record, with a declared unit and range. Proposal: keep the
   existing consumer scale's upper bound of four while allowing every value
   within the domain. This is a compatibility proposal, not measured human
   strength. CTO must approve the domain and interpretation before coding it.
   Do not turn epistemic confidence, attention or party identity into strength.

2. **Read supported, dated evidence.** Use actual family and confidant
   relationships, participation, work, residence, ownership and lived events.
   Each contribution must identify its source records, start/end dates and
   the historical cutoff. A party label is evidence of affiliation, not proof
   of a person's private belief. Missing duration or depth stays unavailable
   as an input; it is not assumed to be a short or weak experience. The
   current birth-cohort and town-size cues are descriptive group references
   with authored individual pulls; the ledger makes that limitation explicit.

3. **Distinguish duration, depth and reinforcement.** Duration comes from
   actual recorded intervals. Depth comes from recorded participation or
   stakes, not a job-title coefficient. Reinforcement comes from distinct
   relevant experiences. One event echoed in a story, conversation and later
   recap must not count as three experiences. Opposing evidence must also
   remain visible. Do not invent a half-life, linear daily increment,
   reinforcement coefficient or saturation curve. Those equations and units
   require a separate CTO decision or approved research.

4. **Preserve historical and saved identity.** Write a new versioned principle
   record when supported evidence changes the result. Preserve prior records,
   source IDs, supersession and historical date/sequence cutoffs. Do not
   rewrite old categorical convictions into invented continuous measurements.
   Proposed compatibility: existing saved records retain their categorical
   consumer behavior until an authorized life producer writes a supported
   successor. Mark this as legacy ordinal behavior in the ledger. The
   player's choices remain authoritative and are never silently re-formed.

5. **Connect actual consumers.** `principledLeaning` must read saved continuous
   strength directly when present. Agenda ranking, proposal backing, bill
   votes and Senate objection tests must consume the same signed score.
   Existing filing and importance thresholds currently use the ordinal scale;
   changing the domain without reconciling them would change outcomes by
   accident. Team 2 owns those thresholds and consent work. Keep flexible
   negotiation, conflict, epistemic confidence and strength separate. A new
   field with no consumer change would not deliver the feature.

6. **Validate before accepting.** Prove distinct strengths can produce distinct
   scores without four-step rounding; actual dated reinforcement changes the
   saved strength; duplicate source exposure does not; unsupported lives gain
   no invented belief; player and legacy records survive; save/load and older
   historical reads remain stable. Then prove the actual officeholder caller
   reaches agenda/vote consumers. Full simulations follow integration on main.
   New equations must be tested at zero, opposition, domain boundaries and
   repeated experience without presenting authored bounds as survey estimates.

7. **Decisions and ownership still needed.** CTO must decide the strength
   domain, duration/depth evidence contract, combination/saturation rule,
   conflict treatment and legacy transition. Team 9 can research measured
   reinforcement and attitude persistence, with populations and units, but
   descriptive demographic averages cannot choose an individual belief.
   Shared `PrincipleRecord`/input, canonical writer validation, history append,
   integrity and consumer hunks need exact coordinator claims before edits.
   No broad types/history/world claim is requested here. Team 1 owns formation
   and its officeholder caller; Team 2 owns the governance consumers.

## Source and status

Reviewed PR1152 at `0a13f1393f0225d4f238b109064923c4c4023abb` and main at
`1d8556c563415ae6fa261148ed64fbad35928996`. Main already contains the life
writer and canonical fact provenance. The four source/test files in the
PR1152 delta have no law-effect import or required law schema addition.
The original PR remains preserved because its ancestry includes the held
law branch; an independent replacement branch avoids rewriting that history.

This design is proposed. Continuous-strength implementation and runtime
acceptance are NOT RUN. Existing pull weights, formation thresholds and
conviction steps remain authored values pending the decisions above.
