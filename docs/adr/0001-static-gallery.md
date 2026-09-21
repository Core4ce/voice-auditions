# 0001 — Static gallery, locally produced audio

Status: accepted for the user-authorized launch, 2026-09-21.

The user asked for a GitHub Pages site with voice cards, filters, sorting, a
rotating Play All audition, random selection, technical-passage explanation and
original-sketch history. Recordings must be generated on the Sunset Mac Studio.

Use plain HTML/CSS/JavaScript, one HTML audio element and a JSON voice catalog.
Generate MP3s offline with Kokoro/MLX-Audio and FFmpeg. Keep the catalog, production
script and sanitized per-recording measurements in Git. Publish `site/` as the
GitHub Pages artifact. No build step, server, model download or synthesis occurs
in the browser. Favorite selections stay only in browser local storage.

The catalog provides input text and metadata; the recordings manifest provides
measured output. A file is playable only when its manifest entry exists. Keep
playback in one player to prevent simultaneous voices. Play All snapshots the
currently filtered/sorted voices; changing filters does not unexpectedly interrupt
the current audition. Starting Play All again adopts the new selection.

All presets read the same English body at rate 1.0. The introduction and sign-off
identify the preset. Non-English presets use English phonemization and are
explicitly labeled experimental. This supports comparing timbre on identical text,
not ranking native-language quality or asserting accent accuracy.
