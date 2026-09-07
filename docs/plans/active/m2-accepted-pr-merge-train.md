# M2 accepted PR merge train

Authorization: M2 Drive `1VEr2BvmOc9Ai58iYBQh3ocnwY9R6dXuU8FQhXM0MidQ`, activated by the owner after M1 acceptance and merge.

Order follows the latest owner instruction: #113, #114, #116, #117, #111.

For each accepted head, merge live main ordinarily into the existing remote PR branch, retain current-main ownership tests, preserve feature blobs, regenerate combined source artifacts where needed, run focused regressions and full validation, then require exact-head CI before Ready and ordinary merge. Stop for semantic conflicts or failed CI; no broad re-audits.

Initial main: `a93b8f9da2b76d69123abc6b37b4b196f9d0d5db`.
PR #113 accepted head: `4adfd7849bd081ad0e302953d679a60b53686976`.

LEARN: verify feature-owned blobs separately from shared generated surfaces; a clean automatic merge does not prove the canonical ownership test was retained.
