#!/usr/bin/env bash
# A helper's copy of the repository holding only what its task needs (owner,
# Oct 29: helpers "should immediately delete what they don't need, or even
# more helpfully, only clone what they do need"). A full copy is about 3.3 GB,
# most of it art and the large docs folders; this one is about 1.2 GB, shares
# the main checkout's objects instead of downloading them, and links its
# node_modules instead of installing them. Skill: helper-checkout.
#
#   scripts/storage/helper-checkout.sh new <dir> <branch> [--keep <path>]...
#       A sparse copy at <dir> (outside the main checkout), on <branch>: the
#       remote branch if it exists, otherwise a new branch from origin/main.
#   scripts/storage/helper-checkout.sh narrow <dir> [--keep <path>]...
#       Turns an existing full worktree or clone at <dir> sparse in place;
#       edits and commits are kept.
#
# Run it from the main checkout. --keep brings back a folder that is skipped
# by default (an art helper keeps art, a lane helper keeps public).
set -euo pipefail

SKIP=(art public docs/codex docs/play-first docs/mockups docs/ui docs/screens docs/archive)

usage() {
  sed -n '9,18p' "$0" | sed 's/^# \{0,1\}//'
  exit 2
}

[[ $# -ge 2 ]] || usage
mode=$1
dir=$2
shift 2
branch=""
if [[ $mode == new ]]; then
  [[ $# -ge 1 ]] || usage
  branch=$1
  shift
fi
keep=()
while [[ $# -gt 0 ]]; do
  case $1 in
    --keep)
      keep+=("${2%/}")
      shift 2
      ;;
    *) usage ;;
  esac
done

patterns() {
  echo '/*'
  for skipped in "${SKIP[@]}"; do
    local kept=no
    for wanted in "${keep[@]+"${keep[@]}"}"; do
      [[ $wanted == "$skipped" ]] && kept=yes
    done
    [[ $kept == no ]] && echo "!/$skipped/"
  done
  return 0
}

main=$(git rev-parse --show-toplevel)

case $mode in
  new)
    case $(realpath -m "$dir")/ in
      "$main"/*)
        echo "helper-checkout: put the copy outside the main checkout ($main); test runs there would pick it up" >&2
        exit 1
        ;;
    esac
    [[ ! -e $dir ]] || {
      echo "helper-checkout: $dir already exists" >&2
      exit 1
    }
    url=$(git -C "$main" remote get-url origin)
    git clone --quiet --shared --no-checkout "$main" "$dir"
    git -C "$dir" remote set-url origin "$url"
    patterns | git -C "$dir" sparse-checkout set --no-cone --stdin
    git -C "$dir" fetch --quiet origin main
    if git -C "$dir" fetch --quiet origin "$branch" 2>/dev/null; then
      git -C "$dir" checkout --quiet -B "$branch" FETCH_HEAD
      git -C "$dir" branch --quiet --set-upstream-to "origin/$branch" 2>/dev/null || true
    else
      git -C "$dir" checkout --quiet -B "$branch" origin/main
    fi
    [[ -d $main/node_modules && ! -e $dir/node_modules ]] &&
      ln -s "$main/node_modules" "$dir/node_modules"
    ;;
  narrow)
    patterns | git -C "$dir" sparse-checkout set --no-cone --stdin
    ;;
  *) usage ;;
esac

echo "helper-checkout: $dir on $(git -C "$dir" branch --show-current), $(du -sh --exclude=node_modules "$dir" | cut -f1) on disk; skipped: $(patterns | sed -n 's|^!/||p' | tr '\n' ' ')"
