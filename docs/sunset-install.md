# Local recording on Apple Silicon

The published recordings were synthesized on **Sunset, a Mac Studio**, using
MLX-Audio 0.5.3, MLX 0.32.2 and Kokoro-82M-bf16. The browser site is static;
visitors do not need Python or a model. These instructions rebuild the audio.

## Install an isolated runtime

Use an Apple Silicon Mac with Metal support, Python 3.12, `uv`, and FFmpeg with
`libmp3lame`. Our verified host ran macOS 26.5.2 and FFmpeg 8.1.2. Reserve several
GiB for packages, models, intermediate WAV files and outputs. From the repo root:

```sh
# If these tools are not already installed, install them using your preferred
# package manager. With Homebrew:
brew install uv ffmpeg
uv venv --python 3.12 runtime/tts-kokoro/.venv
uv pip install --python runtime/tts-kokoro/.venv/bin/python \
  -r runtime/requirements-tts.txt
```

`requirements-tts.txt` freezes the verified environment, including the English
spaCy model. Install downloads use public package servers. No provider key,
account, inference server or paid API is needed.

Download the exact public model revisions and voice tensors used by this run:

```sh
export HF_HOME="$PWD/runtime/tts-kokoro/cache/huggingface"
runtime/tts-kokoro/.venv/bin/python - <<'PY'
from pathlib import Path
from huggingface_hub import snapshot_download
for repo, revision, patterns in [
    ('mlx-community/Kokoro-82M-bf16',
     'a71e4d38b236d968966a2002c4c895dbd12b1c3c', None),
    ('prince-canuma/Kokoro-82M',
     'e02c9eada7ce7416798af36b190a8a2dd2ecd566', ['voices/*.safetensors']),
]:
    snapshot = Path(snapshot_download(repo, revision=revision, allow_patterns=patterns))
    # The offline runtime resolves main; pin it inside this isolated cache.
    refs = snapshot.parent.parent / 'refs'
    refs.mkdir(exist_ok=True)
    (refs / 'main').write_text(revision)
PY
runtime/speak --voices
runtime/speak --no-play -v af_heart -o .render-smoke.wav 'Hello from the studio.'
```

The wrapper subsequently sets offline mode by default. Alternatively, copy an
existing public model `hub/` cache, preserving symlinks, into the same path.
Do not copy Hugging Face tokens or other account files.

## Record or resume

```sh
python3 scripts/record-voices.py --dry-run
python3 scripts/record-voices.py
# One selected voice:
python3 scripts/record-voices.py --voice af_heart
# Playback is a separate, explicit action:
python3 scripts/audition-local-voices.py
```

The authoritative text and rotation are in `site/voices.json`. Every recording
contains its personalized introduction, the same four-sentence passage, and a
personalized closing. British presets use language code `b`; all others use `a`.
World presets deliberately read **English** using English phonemization. These
samples do not demonstrate native-language fluency or representative native
pronunciation.

Rendering is sequential. A process lock prevents two writers in one checkout.
`.render/` contains per-input logs and raw WAV files; `site/audio/` contains mono
96-kbit MP3s. Each new MP3 is fully decoded before it is published to its final
path. `site/recordings.json` records duration, bytes, output and text hashes,
input hash, engine/package versions, model snapshot revisions, producer and
verification status. Files are committed separately from private runtime state.

Rerunning verifies the existing output hash and skips unchanged successes. The
cache key includes text, voice, phonemization language, rate, model/revisions,
package versions, wrapper hash and encoder settings/version. A changed passage
invalidates its recordings. Failed presets are logged and cause a nonzero exit;
no substitute voice is used. Rerun the same command to resume.

For a detached run on a machine where `tmux` is already installed:

```sh
tmux new-session -d -s voice-record \
  'python3 scripts/record-voices.py > recording.log 2>&1; echo $? > recording.exit'
tail -n 3 recording.log
cat recording.exit  # Present after completion; 0 means success.
```

`--speak /path/to/speak` can reuse an isolated installation; its sibling
`tts-kokoro/` must contain the runtime and cache. `--producer-host Sunset` was
used for the original host label. Do not label a different computer as Sunset.
No audio is played during generation. Manim is not needed for this audition site.

## Original production verification

All 54 presets completed on Sunset with zero failures. The final MP3s total
1,877.02979 seconds (31 minutes 17 seconds) and 22,581,918 bytes. Each file was
fully decoded on the producer and again after transfer; all output hashes and
input-text hashes matched the catalog. An immediate resume skipped all 54
unchanged recordings. No audio playback occurred during production verification;
human listening preference and pronunciation acceptance remain separate.

## Sources and licenses

- [MLX-Audio](https://github.com/Blaizzy/mlx-audio): MIT; Apple Silicon speech runtime.
- [MLX](https://github.com/ml-explore/mlx): MIT; local array and Metal compute runtime.
- [Kokoro model card](https://huggingface.co/hexgrad/Kokoro-82M): Apache-2.0
  weights, upstream model details and training-data acknowledgments.
- [MLX model conversion](https://huggingface.co/mlx-community/Kokoro-82M-bf16)
  and [voice tensor cache](https://huggingface.co/prince-canuma/Kokoro-82M):
  exact snapshot IDs are above and in the recording manifest.
- [Misaki](https://github.com/hexgrad/misaki): Apache-2.0 text-to-phoneme handling.
- [FFmpeg licensing](https://ffmpeg.org/legal.html): LGPL/GPL depends on build
  options. This repository invokes an independently installed FFmpeg executable;
  it does not redistribute FFmpeg, Python dependencies, model weights or voices.

The pin file records all installed Python dependencies; their own upstream
licenses continue to apply. Model licensing is not a claim that the synthesized
output reproduces a particular real speaker. No custom voice cloning was used.
