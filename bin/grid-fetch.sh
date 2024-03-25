#!/bin/bash

out="reports"

while ssleep 60; do
  name="$out/$(date '+%Y%m%d-%H%M%S').json"
  mkdir -p "$(dirname "$name")"
  echo "$name"
  deno run --allow-net bin/grid.ts > "$name"
done

# vim:ts=2:sw=2:sts=2:et:ft=sh

