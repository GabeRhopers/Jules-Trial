#!/bin/bash
# Builds everything the SaveMeFromMe composition reads from public/ (all git-ignored, reproducible).
# Usage: bash videos/save-me-from-me/pipeline/prepare-assets.sh <song.mp3>
# Needs: shots/<name>/slow4x frames (slowmo.py), plates/kitchenA-empty.png (inpaint.py), ffmpeg, ImageMagick.
set -e
cd "$(dirname "$0")/../../.."
B=public/broll/save-me-from-me
SONG=$1

# 1. Clips: each slow-motion frame sequence as a 24 fps video, plus a reversed copy (for the healing)
mkdir -p "$B/clips"
for s in kitchenA mirrorA crackA kitchenB mirrorB crackB; do
  ffmpeg -loglevel error -y -framerate 24 -i "$B/shots/$s/slow4x/%05d.png" -c:v libx264 -crf 16 -pix_fmt yuv420p -g 12 "$B/clips/$s.mp4"
  ffmpeg -loglevel error -y -i "$B/clips/$s.mp4" -vf reverse -c:v libx264 -crf 16 -pix_fmt yuv420p -g 12 "$B/clips/$s-rev.mp4"
  echo "clip $s: $(ffprobe -v error -show_entries format=duration -of csv=p=0 "$B/clips/$s.mp4") s"
done

# 2. Film grain: 6 noise tiles, cycled every frame
mkdir -p "$B/grain"
for i in 0 1 2 3 4 5; do
  convert -size 960x540 xc:gray50 -seed $((i + 7)) -attenuate 0.6 +noise Gaussian -colorspace gray "$B/grain/g$i.png"
done

# 3. Song
if [ -n "$SONG" ]; then
  mkdir -p public/audio/save-me-from-me
  cp "$SONG" public/audio/save-me-from-me/song.mp3
fi
echo "assets ready in $B"
