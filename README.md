# Voice Auditions

**54 voices. One delightfully ridiculous script.**

A Broadway-inspired casting room for Kokoro voices, recorded locally on a Mac
Studio and published as a static GitHub Pages site.

**[Enter the casting room →](https://core4ce.github.io/voice-auditions/)**

## What you can do

- Play any voice card, pause, seek, and move to the next or previous voice.
- Filter by preset gender label, accent/background, language, name or ID.
- Sort by audition order, name, recording duration or background.
- Save favorites locally in your browser and audition just those voices.
- **Play All** snapshots the filtered/sorted cast and plays it sequentially.
- **I'm Feeling Lucky** auditions a random voice from the visible cast.

The default order rotates American female → American male → British female →
British male, skips exhausted groups, and places world-language presets last.
All voices read the same four-sentence English body, with identifying introductions
and sign-offs. World presets use English phonemization and are explicitly labeled
experimental: this is not a native-language benchmark or a scientific ranking.

The script tests unusual technical vocabulary, question intonation, comma pauses,
`; however,` transitions, exclamation emphasis and sentence endings. Its nonsense
is an original homage to the turbo-encabulator tradition. The site explains the
history and links to the original film rather than redistributing it.

## Run the website locally

No frontend build step is required. The development server supports audio seeking:

```sh
npm ci
npm run serve
# Open http://localhost:4173
```

Serve over HTTP rather than opening `index.html` as a local file: the gallery
loads its catalog with fetch. The published MP3s work without installing models.

## Record your own cast

[Install and recording instructions](docs/sunset-install.md) cover Apple Silicon,
Python, the pinned MLX-Audio environment, public model downloads, offline synthesis,
resuming, and detached rendering. No paid API or provider credential is required.

```sh
python3 scripts/record-voices.py --dry-run
python3 scripts/record-voices.py
python3 scripts/audition-local-voices.py
```

`site/voices.json` owns the text and voice metadata. `site/recordings.json` records
the measurements and provenance. Raw WAVs and generation logs remain under ignored
`.render/`; finished MP3s are committed under `site/audio/`.

The launch recordings were produced on Sunset, our Mac Studio. All 54 completed,
fully decoded, and matched their output/text hashes after transfer. Their combined
length is **31m17s**, about **22.6 MB** in decimal units. Listening taste and speech
quality remain for you to judge.

## Test

```sh
npm ci
npx playwright install chromium
npm test
# Or use an already-installed Google Chrome:
PLAYWRIGHT_CHANNEL=chrome npm test
```

Browser tests cover filters, favorites, sorting, actual MP3 playback, automatic
queue progression, random selection, missing audio, mobile overflow and keyboard
activation. `TEST_BASE_URL=https://core4ce.github.io/voice-auditions/ npm test`
runs the same checks against the live site. Tests mute their player.

## Publish with GitHub Pages

1. Push this repository to GitHub.
2. In **Settings → Pages**, choose **GitHub Actions** as the source.
3. Run `.github/workflows/pages.yml` or push a change to `main`.

The workflow publishes only `site/`. Assets use relative paths so repository
subpaths work. There is no runtime backend, account system or live synthesis
service. Favorite IDs stay in local storage. Google Fonts is the only external
page resource; no analytics are included.

## Project map

- `site/`: complete static gallery, catalogs and finished audio
- `scripts/`: batch recording and interactive audition commands
- `runtime/`: portable speech wrapper and frozen dependency versions
- `docs/sunset-install.md`: reproducible recording setup
- `docs/adr/0001-static-gallery.md`: architecture and interaction decisions
- `docs/imaginarium/teamwork/launch/`: bounded launch and verification record
- `tests/`: browser acceptance checks

See [credits](site/credits.html) for model, voice-source and film attribution.
Project code and original text are MIT-licensed; upstream tools and model assets
retain their own licenses and are not redistributed here.
