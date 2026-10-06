# Household reads preserve the recorded month with lower daily CPU

The same recorded month used 2.40% less mean daily process CPU. All 32 accepted actions kept their order, dates, cutoffs and captured appended payloads. Sampled end-of-day heap increased: the mean rose from 1.17 GB to 1.24 GB, and the maximum rose from 1.70 GB to 2.21 GB. This single paired measurement does not establish lower memory use or annual speed acceptance.

## Evidence

[The measured packet](month-proof.json) binds the baseline and candidate sources, execution handles, runner hashes, all 30 daily CPU/heap rows, every action comparison and the prior failed trials. Mean daily CPU fell from 5,547.7166 ms to 5,414.7142 ms. Sampled lookup self time increased, so the whole-run decrease does not establish that those individual functions became faster.

The person index extends recorded groups on append and preserves old groups. Household projections compare their contributing recorded groups after a revision. Revision tokens retain no source arrays. The 41 focused tests cover an independent raw-scan oracle, historical dates, exclusive sequences, corrections, reloads and old Worlds in both reading orders.

## Next step

Review SP-C as one bounded change. SP-D remains a separate later item. Historical annual speed, save size and Continue acceptance remain failed on their retained sources. No merge or build was performed.

## Method

Candidate production source: `84cfe9c46d5f7236f9df9ef417df98256f0d7611`. Baseline: `f88508186b78f526ecf89a420b5fb584171e039a`, retained exec 72328. Candidate exec 21780 exited 0. Ripon, Wisconsin, place 5568175; exact seed and setup are in [the portable input](../../../scripts/dev-lab/session5-history-lookup/ripon-input.json).

The [portable runner](../../../scripts/dev-lab/session5-history-lookup/run.mjs) uses ordinary generated-life Day actions with a 4096 MB heap. Precise coverage is disabled. Sampling and digest accounting are included identically in outer process CPU. Action 0 is Day 1 and is excluded. Day 2 includes the same-date action 1 and action 2. Actions 1–31 form 30 calendar days through February 5. Appended full-field digests preserve IDs, sequence and order; full packets additionally cover changed people definitions in actions 4 and 5. Earlier prefix revisions and other state dictionaries were not captured. Heap measurements are end-of-day observations, not continuous peaks.

Run from the existing measurement checkout, substituting its absolute path and a fresh output directory:

```sh
SESSION5_PROFILE_REPO="$PWD" \
SESSION5_PROFILE_OUTPUT=/tmp/session5-sp-c-new-proof \
SESSION5_PROFILE_INPUT="$PWD/scripts/dev-lab/session5-history-lookup/ripon-input.json" \
SESSION5_PROFILE_SOURCE="$(git rev-parse HEAD)" \
node --max-old-space-size=4096 --import tsx scripts/dev-lab/session5-history-lookup/run.mjs
```

Use the repository storage guard and an exclusive host window. The retained comparison used the already-authorized cloud-storage override because free storage was below the local reserve. No whole World was saved or reloaded. Do not combine this baseline with Session48's separate SP-A baseline.
