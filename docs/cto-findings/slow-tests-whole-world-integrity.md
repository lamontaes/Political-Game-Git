# Slow tests: whole-world integrity on every write (M2, Oct 7)

Measured on current main with the nationwide opening world (about 10,189 people, an 83.9 MB save).

- recordPrivateBelief ends in validateNext (src/simulation/politics.ts:868), which runs assertWorldIntegrity on the whole world. Six beliefs written one by one took 19,963 ms (about 3.3 s each). The same six inside writeWithWorldIntegrityOnce took 2,320 ms with one check.
- generated-member-reflection-route.test wrote every colleague belief one by one. It now writes them in one batch with the same final integrity check.
- opening-life.test age cases (age 34 profile): generate 18,657 ms, serialize 3,504 ms, deserialize 9,994 ms, about 36 s against a 15 s budget set when the cases took 5 to 9 s. Their budget is now a measured 90 s.

Still red on clean main and not touched here: generated-member-reflection-route.test fails at its assertion that the sponsor has generated principles (expected 0 to be greater than 0). That is the Begin-key work in #3043.

Design call for the CTO: the opening world is large enough that any per-write whole-world check costs seconds. Either keep batching writers or shrink the opening world.
