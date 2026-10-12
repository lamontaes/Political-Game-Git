#!/bin/sh
# Re-mines every bank OPUS-WORDS builds from its shapes. The corpus stays
# outside the repository (see docs/research/english-corpus/README.md).
#   scripts/english-corpus/mine-all.sh <corpus-dir>
set -e
corpus="$1"
here="$(dirname "$0")"
root="$here/../.."
for shapes in "$here"/shapes/*.json; do
  bank="$(basename "$shapes" .json)"
  python3 -I "$here/mine-shapes.py" "$shapes" "$corpus" \
    "$root/docs/research/english-corpus/not-attested-$bank.json" \
    > "$root/data/english/parts/$bank.json"
done
npx prettier --write "$root"/data/english/parts/*.json "$root"/docs/research/english-corpus/*.json > /dev/null
