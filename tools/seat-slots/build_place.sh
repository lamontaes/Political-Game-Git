#!/usr/bin/env bash
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
exec python3 "$HERE/rebuild_room.py" "${1:?Usage: build_place.sh PLACE NEW_BUILD_DIRECTORY}" "${2:?Missing build directory}"
