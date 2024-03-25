#!/bin/bash

out="reports"

while ssleep 60; do
  # Powergrid
  name="$out/$(date '+%Y%m%d-%H%M%S').json"
  mkdir -p "$(dirname "$name")"
  echo "$name"
  deno run --allow-net bin/grid.ts > "$name"
  # NEEB
  name="$out/$(date '+%Y%m%d-%H%M%S').neeb.json"
  curl -o "$name" "https://power.northernpowergrid.com/Powercut_API/rest/powercuts/getall"
done

# vim:ts=2:sw=2:sts=2:et:ft=sh

