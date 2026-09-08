# Prose diagnostics — current main baseline

**0 hard errors. 257 review warnings.**

A hard error is objectively wrong: an ID collision, a slot the record's own
grounding cannot bind, a withheld record with no reason. A review warning is a
place worth an owner's eye and **nothing here is a ban** — a grounded character
may say "something", and a good sentence may contain "rather than". Style lint
that fails a build produces prose written to satisfy a regex, which is a worse
defect than the one it was aimed at.

## Warnings by family

| Family | Count |
| --- | --- |
| vague-referent | 163 |
| and-it-scaffold | 38 |
| rather-than-scaffold | 27 |
| slot-agreement | 12 |
| label-restated-in-description | 9 |
| third-person-player | 8 |

## Repetition

- 1880 templates, 1858 distinct texts.
- 18 exact duplicate groups.
- 23 normalized duplicate groups.
- 12 near-duplicate clusters (Jaccard ≥ 0.72).

Exact duplicate text at two semantic locations is not itself a defect: each
keeps its own ID, and two banks may legitimately both offer "Say nothing".

### Most frequent 3–6 word n-grams

| N-gram | Count | Banks |
| --- | --- | --- |
| `your decision about` | 24 | 1 |
| `came up again` | 19 | 2 |
| `in front of` | 19 | 7 |
| `there is a` | 19 | 5 |
| `decision about the` | 16 | 1 |
| `it is not` | 16 | 3 |
| `you chose to` | 16 | 1 |
| `your decision about the` | 16 | 1 |
| `a long time` | 14 | 4 |
| `asked you to` | 14 | 4 |
| `and it is` | 13 | 5 |
| `proof of income` | 12 | 2 |
| `the shopping and` | 12 | 2 |
| `the two of` | 12 | 3 |
| `of income form` | 11 | 2 |
| `out of the` | 11 | 3 |
| `proof of income form` | 11 | 2 |
| `the bill is` | 10 | 1 |
| `the end of` | 10 | 4 |
| `the two of you` | 10 | 3 |
| `two of you` | 10 | 3 |
| `you did not` | 10 | 4 |
| `at the end` | 9 | 3 |
| `at the end of` | 9 | 3 |
| `came back up` | 9 | 1 |

### Most repeated sentence openings

| Opening | Count |
| --- | --- |
| `your decision about` | 20 |
| `you chose to` | 16 |
| `there is a` | 12 |
| `the bill is` | 10 |
| `you took the` | 9 |
| `say you will` | 8 |
| `the player asked` | 7 |
| `you agreed to` | 7 |
| `it is not` | 6 |
| `the bill has` | 6 |
| `you asked for` | 6 |
| `ask about the` | 5 |
| `say nothing to` | 5 |
| `you asked to` | 5 |
| `you kept your` | 5 |

Every finding with its exact semantic ID is in `lint-findings.json`.
