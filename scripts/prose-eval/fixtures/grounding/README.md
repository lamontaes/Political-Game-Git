# Fresh grounding probes

Synthetic, adversarial development probes for the grounding gate. Every packet
and candidate output here was written for this repair. None of them reproduces,
paraphrases, or encodes any retired blind-evaluation holdout packet — those are
retired and may not appear in the repository in any form.

These are development tests. They are not owner blind prose benchmarks and
carry no taste judgement: a probe that expects PASS asserts only that the
deterministic gate finds no unsupported claim of the enumerated classes.

Format: `expect: PASS`, or `expect: FAIL <rule>` naming the rule that must fire.
