#!/bin/sh
# Re-mines every bank OPUS-WORDS builds from its shapes, in one pass over the
# corpus. The corpus stays outside the repository (see
# docs/research/english-corpus/README.md).
#   scripts/english-corpus/mine-all.sh <corpus-dir>
set -e
corpus="$1"
here="$(dirname "$0")"
root="$here/../.."
python3 -I "$here/mine-shapes.py" --many "$root/data/english/parts" \
  "$root/docs/research/english-corpus" "$corpus" "$here"/shapes/*.json
npx prettier --write "$root"/data/english/parts/*.json "$root"/docs/research/english-corpus/*.json > /dev/null
