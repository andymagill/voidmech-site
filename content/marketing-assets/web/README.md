# Home hero video

The home hero (`HeroVideo`, data in `src/content/site-content.ts` → `homeHeroVideo`)
shows a still poster, then fades in one of three silent combat clips picked at random.

- **Poster** (`voidmech-combat-poster.jpg`, committed): bundled by Vite like the screenshots.
- **Clips** (`voidmech-combat-N.mp4`, gitignored): served from the R2 bucket
  `voidmech` (binding `MEDIA`) by `GET /media/:file`.

Why R2 and not static assets: Workers static assets answer `Range` requests with a
full `200`, and Safari/iOS will not play video unless the server returns
`206 Partial Content`. `/media/:file` (`src/lib/endpoints/media.ts`) handles ranges.

## Encoding

The raw captures (`content/marketing-assets/VoidMech-combat-N.mp4`, 40–55 MB, also
gitignored) have black pillarbox bars, and clip 3 has the window title bar, a silent
audio track, and their index at the end of the file. Each encode is cropped to 16:9
game content, stripped of audio, given `faststart` and capped at 1.6 Mbps, which comes
to 6–9 MB per clip.

```sh
# crop=W:H:X:Y per clip
#   1: 1148:646:66:72   2: 1136:640:72:78   3: 1240:698:20:18
ffmpeg -i VoidMech-combat-N.mp4 -an -vf "crop=W:H:X:Y" \
  -c:v libx264 -preset slow -crf 27 -maxrate 1.6M -bufsize 3.2M \
  -profile:v high -pix_fmt yuv420p -movflags +faststart web/voidmech-combat-N.mp4

# Poster: first frame of clip 1, same crop
ffmpeg -i VoidMech-combat-1.mp4 -vf "crop=1148:646:66:72" -frames:v 1 -q:v 4 \
  web/voidmech-combat-poster.jpg
```

For a new capture, find the content box with
`ffmpeg -i in.mp4 -vf "fps=1,cropdetect=limit=16:round=2" -f null -`, then check a
frame by eye for window chrome the detector misses.

## Uploading

Object keys carry the first 8 hex digits of the file's sha256, because responses are
cached as immutable: a re-encode needs a new key. Then update the `src` in
`site-content.ts`.

```sh
cd content/marketing-assets/web
for i in 1 2 3; do
  key="voidmech-combat-$i-$(sha256sum voidmech-combat-$i.mp4 | cut -c1-8).mp4"
  echo "$key"
  npx wrangler r2 object put "voidmech/$key" --file "voidmech-combat-$i.mp4" \
    --content-type video/mp4 --remote   # use --local instead to seed `npm run dev`
done
```

Local dev reads Miniflare's local R2 (`.wrangler/state`), so run the loop once with
`--local`. Until then the hero just shows the poster.
