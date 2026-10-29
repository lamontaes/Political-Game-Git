#!/usr/bin/env bash
# A helper's copy of the repository holding only what its task needs (owner,
# Oct 29: helpers "should immediately delete what they don't need, or even
# more helpfully, only clone what they do need"). A full copy is about 3.3 GB,
# two thirds of it images (art, docs, public); this one skips image files
# everywhere and keeps every folder, so code, data, notes and every check
# still read what they need. It shares the main checkout's git objects
# instead of downloading them, and links its node_modules instead of
# installing them. Skill: helper-checkout.
#
#   scripts/storage/helper-checkout.sh new <dir> <branch> [--keep-images]
#       A sparse copy at <dir> (outside the main checkout), on <branch>: the
#       remote branch if it exists, otherwise a new branch from origin/main.
#   scripts/storage/helper-checkout.sh narrow <dir> [--keep-images]
#       Turns an existing full worktree or clone at <dir> sparse in place;
#       edits and commits are kept.
#
# Run it from the main checkout. --keep-images is for a helper whose task is
# the pictures themselves (art, people, screens).
set -euo pipefail

IMAGES=(png jpg jpeg webp gif psd)

usage() {
  sed -n '10,20p' "$0" | sed 's/^# \{0,1\}//'
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
images=no
while [[ $# -gt 0 ]]; do
  case $1 in
    --keep-images)
      images=yes
      shift
      ;;
    *) usage ;;
  esac
done

patterns() {
  echo '/*'
  [[ $images == yes ]] && return 0
  for kind in "${IMAGES[@]}"; do
    echo "!*.$kind"
    echo "!*.${kind^^}"
  done
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
    if git -C "$main" fetch --quiet origin "$branch" 2>/dev/null; then
      start=$(git -C "$main" rev-parse FETCH_HEAD)
      remote=yes
    else
      git -C "$main" fetch --quiet origin main
      start=$(git -C "$main" rev-parse FETCH_HEAD)
      remote=no
    fi
    if [[ $(git -C "$main" rev-parse --is-shallow-repository) == true ]]; then
      # A clone of a shallow repository copies every pack instead of sharing
      # them (a 3.7 GB copy, found by the words session on Oct 29); a worktree
      # shares the object store either way.
      git -C "$main" worktree add --quiet --no-checkout -B "$branch" "$dir" "$start"
      patterns | git -C "$dir" sparse-checkout set --no-cone --stdin
      git -C "$dir" checkout --quiet "$branch"
    else
      url=$(git -C "$main" remote get-url origin)
      git clone --quiet --shared --no-checkout "$main" "$dir"
      git -C "$dir" remote set-url origin "$url"
      patterns | git -C "$dir" sparse-checkout set --no-cone --stdin
      git -C "$dir" checkout --quiet -B "$branch" "$start"
    fi
    if [[ $remote == yes ]]; then
      git -C "$dir" fetch --quiet origin "$branch" 2>/dev/null &&
        git -C "$dir" branch --quiet --set-upstream-to "origin/$branch" 2>/dev/null || true
    fi
    [[ -d $main/node_modules && ! -e $dir/node_modules ]] &&
      ln -s "$main/node_modules" "$dir/node_modules"
    ;;
  narrow)
    patterns | git -C "$dir" sparse-checkout set --no-cone --stdin
    ;;
  *) usage ;;
esac

echo "helper-checkout: $dir on $(git -C "$dir" branch --show-current), $(du -sh --exclude=node_modules "$dir" | cut -f1) on disk; $([[ $images == yes ]] && echo "images kept" || echo "image files skipped (${IMAGES[*]})")"
