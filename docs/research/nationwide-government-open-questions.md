# Nationwide government — what is open, and who answers it

Two kinds of gap are mixed together in this lane, and they need different
handling. Where a source has already been identified and nobody has fetched it,
the work is verification and it stays here. Where no source has been identified
at all, the question is research and it goes out.

Everything below is a question, not a decision. Nothing here is settled by
judgment in the meantime, and nothing generated for play is an answer to any
of it.

## Ours to verify — the source is already named

**649 qualification claims sit in `qualification-source-ledger.md` refused for
one reason: "No authority retrieved."** Each one names the provision it rests
on. They span twenty states (NM, NY, NC, ND, OK, PA, RI and SC at 61 each, OR
52, OH 27, MA 17, NJ 17, NH 13, MS 12, MI 8, NV 8, MT 5, MO 1, NE 1). Seven
further claims were checked and found not to say what was claimed; those are
settled and rejected.

So the corpus gap is not that the research was never done. It was done. The
retrieval step was not, and until it is those claims cannot be compiled.

**This is blocked here, not undone.** `npm run source:acquire` returns HTTP 403
from the egress proxy on the first state publisher it reaches, and every state
publisher is on the same footing. It needs a machine that can reach them.

## Out to research — no source has been identified

1. **How long a state senate requires a candidate to have lived in the
   district.** No compiled row states one for any state's senate. A house's
   year is not a measurement of a senate's, so nothing is borrowed and the
   field currently offers nothing at all.

2. **What the forty-two uncompiled legislatures actually are.** Chamber names
   (several states seat an Assembly or a House of Delegates rather than a House
   of Representatives), real seat counts, and term lengths. The game now
   generates a playable legislature for each, which is a rule for play and not
   a finding; these are the findings that would replace it.

3. **When state legislative elections are held.** No legislature pack carries
   election timing of any kind — not a date, not a cycle, not an unknown. There
   is nothing to verify because nothing has been identified.

4. **Which years each state elects its governor.** The current rule runs every
   state on a 2026 reference year. That is wrong for the states that elect in
   odd years, and no source has been identified for the state-by-state cycle.

5. **Which states override a veto in joint session rather than chamber by
   chamber.** One compiled state of nine does (Alaska). The generated profile
   uses the chamber-by-chamber form for every uncompiled state, which is a
   simplification rather than a reading.

6. **Whether the District of Columbia Council belongs in this lane at all.**
   The District is legislated for by one thirteen-member Council, so it has no
   state legislature and is deliberately left without a generated one. Whether
   the Council should be modeled here or as a municipal body is a product
   question, not a research one.
