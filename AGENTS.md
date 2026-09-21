# Voice Auditions

Standalone repository for a static GitHub Pages voice audition gallery and local
Apple Silicon recording pipeline. Keep this repository separate from its parent.

- The human approved a Broadway-inspired light visual theme, 54 Kokoro voices,
  gender/accent/language filtering, sorting, Play All and I'm Feeling Lucky.
- `site/voices.json` is the recording text and voice metadata source of truth.
  English voices rotate af, am, bf, bm with exhausted groups skipped; others follow.
- Generate production audio on Sunset, not the interactive workstation. Preserve
  raw audio remotely; publish only finished MP3s and sanitized provenance.
- `site/recordings.json` records measurements; never invent a successful recording.
- The English passage is deliberately an original turbo-encabulator homage.
  Non-English presets reading English are labeled experimental, not native-language
  demonstrations. Metadata labels describe model presets, not real people.
- Site is plain HTML/CSS/JavaScript, with no runtime service, account, tracking or
  synthesis API. All URLs must work under a GitHub Pages repository subpath.
- Test real playback, queue/filter behavior, responsive layout and keyboard access.
- Follow `docs/imaginarium/teamwork/launch/process-flow.json` for launch evidence.
- Commit exact intended files. Preserve others' work. Publication is authorized
  by the human for this project; do not expand to other repos or services.
