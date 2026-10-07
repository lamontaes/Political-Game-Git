# generated-member-reflection-route.test slowdown (M2 bisect, Oct 7)

Test: src/simulation/living-world/generated-member-reflection-route.test.ts. Good at 81df1d654 (Sept 28), slow on current main.

Test-only run per step, limit 240 s (log: step, exit code, seconds):

- 2b28298d5 rc=1 62 s
- 0173000b5 rc=0 56 s
- 53c003a64 rc=1 46 s
- 712d6aa53 rc=1 49 s
- 948c9deb0 rc=124 240 s (timeout)
- 024005b19 rc=0 44 s
- 7a35ceb18 rc=1 168 s
- d15b49bb9 rc=1 13 s
- 7a3791342 rc=1 183 s

Result: git bisect could not isolate one commit. Many middle commits fail for other reasons (13 s and 46 s failures are not slowdowns), and the run ended with only skipped commits left. The suspect range is the work that seated every state legislature and council. Earliest candidate in it is 13b8af915 "Seat every legislature and council: #685's seats, openings and seated-world work", followed by the index and light-Day commits (2cb6ad5ef, c9260637c, bf5654c93, d4b13cea3).

Likely cause (inferred, not measured): once every legislature and council is seated, the generated world holds many more members and seats, so a test that builds a new game and reaches a member's reflection pays for the whole seated world. The follow-up index commits reduced the cost but did not return it to 4.7 s.

Next step for the CTO: time the test on 13b8af915 against its parent to confirm, then decide whether the test should build a smaller world. No producer was changed.
