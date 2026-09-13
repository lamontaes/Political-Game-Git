# A-owned caller composition proofs

The PEOPLE fresh-candidate browser proof accompanies the A-owned PlayerGame initializer patch. Move `people-fresh-candidate.spec.ts` into `tests/e2e/` only in the composed receiver containing that caller. Its relative imports deliberately target that final location. The B leaf alone does not include the root caller and cannot satisfy fresh-init assertions. Do not weaken those assertions or change legacy decoding to make the leaf run them.
