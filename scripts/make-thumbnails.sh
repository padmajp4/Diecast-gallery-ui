#!/usr/bin/env bash
# Create 480px thumbnails for photos that were added before thumbnails existed.
# Run inside a clone of your image repo (GITHUB_REPO), then commit + push:
#
#   cd diecast-images && bash /path/to/scripts/make-thumbnails.sh && git add images/cars/thumbs && git commit -m "Thumbnails" && git push
#
# Needs ImageMagick (brew install imagemagick / apt install imagemagick).
set -euo pipefail
cd images/cars
mkdir -p thumbs
made=0
for f in *.webp *.jpg *.jpeg *.png; do
  [ -f "$f" ] || continue
  case "$f" in set-logo-*) continue ;; esac   # set logos don't need thumbnails
  [ -f "thumbs/$f" ] && continue
  magick "$f" -auto-orient -resize '480x480>' -strip -quality 72 "thumbs/$f"
  made=$((made + 1))
done
echo "Created $made thumbnail(s) in images/cars/thumbs/"
