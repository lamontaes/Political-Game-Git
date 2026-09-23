#!/usr/bin/env bash
# Mass play, continuously, on fresh main.
#
# Each round brings the newest origin/main into this branch (a merge, never a
# reset), reinstalls only when the lockfile changed, then plays one batch of
# games sized to finish in about 15 minutes. Every batch folder records the
# main commit it ran on. Stop with: touch <out>/STOP
#
#   scripts/playtest/mass-play/continuous.sh <out-dir> [games-per-round] [years] [mix]
set -u
out=${1:?output folder}
games=${2:-60}
years=${3:-0.5}
mix=${4:-short}
mkdir -p "$out"
round=0
while [ ! -e "$out/STOP" ]; do
  round=$((round + 1))
  lock_before=$(git hash-object package-lock.json)
  if git fetch -q origin main; then
    if [ -z "$(git status --porcelain --untracked-files=no)" ]; then
      git merge -q --no-edit origin/main >/dev/null 2>&1 || {
        git merge --abort >/dev/null 2>&1
        echo "round $round: merge of origin/main conflicted; playing on the previous head" >>"$out/rounds.log"
      }
    else
      echo "round $round: working tree has edits; not merging main this round" >>"$out/rounds.log"
    fi
  fi
  [ "$(git hash-object package-lock.json)" != "$lock_before" ] && npm ci --ignore-scripts >/dev/null 2>&1
  main_sha=$(git rev-parse --short origin/main)
  head_sha=$(git rev-parse --short HEAD)
  dir="$out/round-$(printf %03d $round)-main-$main_sha"
  mkdir -p "$dir"
  echo "main $main_sha head $head_sha started $(date -u +%FT%TZ)" >"$dir/MAIN"
  MASS_PLAY_MAIN="$main_sha" node --import tsx scripts/playtest/mass-play/run.ts --games "$games" --workers 4 \
    --years "$years" --mix "$mix" --wall 600000 --out "$dir" \
    --seed "r$round-$main_sha" >"$dir/run.log" 2>&1
  echo "finished $(date -u +%FT%TZ)" >>"$dir/MAIN"
  echo "round $round: main $main_sha, $(wc -l <"$dir/games.jsonl" 2>/dev/null || echo 0) games" >>"$out/rounds.log"
done
