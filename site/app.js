const $ = (id) => document.getElementById(id);
const audio = $('audio');
let catalog, voices = [], recordings = {}, current = null, queue = [], queueIndex = -1;
let sequential = false, playbackToken = 0;
let favorites;
try { favorites = new Set(JSON.parse(localStorage.getItem('voice-auditions:favorites') || '[]')); }
catch { favorites = new Set(); }
const durationLabel = (seconds) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
const escape = (text) => String(text).replace(/[&<>"']/g, c => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[c]));
function filteredVoices() {
  const search = $('search').value.trim().toLowerCase();
  const result = voices.filter(v => (!search || `${v.id} ${v.name}`.toLowerCase().includes(search)) &&
    (!$('gender').value || v.gender === $('gender').value) &&
    (!$('accent').value || v.accent === $('accent').value) &&
    (!$('language').value || v.language === $('language').value) &&
    (!$('favorites-only').checked || favorites.has(v.id)));
  const comparators = {
    audition: (a, b) => a.order - b.order,
    name: (a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id),
    duration: (a, b) => (recordings[a.id]?.duration ?? Infinity) - (recordings[b.id]?.duration ?? Infinity) || a.order - b.order,
    accent: (a, b) => a.accent.localeCompare(b.accent) || a.name.localeCompare(b.name)
  };
  return result.sort(comparators[$('sort').value]);
}
function render() {
  const visible = filteredVoices();
  $('results').textContent = `${visible.length} of ${voices.length} voices · ${visible.filter(v => recordings[v.id]).length} ready to audition`;
  $('empty').hidden = visible.length !== 0;
  $('play-all').disabled = $('lucky').disabled = !visible.some(v => recordings[v.id]);
  $('play-all').innerHTML = `<span aria-hidden="true">▶</span> ${visible.length === voices.length ? 'Play all voices' : `Play ${visible.length} ${visible.length === 1 ? 'voice' : 'voices'}`}`;
  $('voice-grid').innerHTML = visible.map(v => {
    const recording = recordings[v.id];
    const playing = current?.id === v.id && !audio.paused;
    const saved = favorites.has(v.id);
    return `<article class="voice-card${current?.id === v.id ? ' is-current' : ''}" data-voice="${escape(v.id)}" data-gender="${escape(v.gender)}" data-group="${escape(v.group)}">
      <div class="card-top"><span class="voice-avatar" aria-hidden="true">${escape(v.name[0])}</span><div class="card-identity"><h3>${escape(v.name)}</h3><span class="preset-id">${escape(v.id)}</span></div><button class="favorite-button" data-favorite="${escape(v.id)}" aria-label="${saved ? 'Remove' : 'Save'} ${escape(v.name)} (${escape(v.id)}) ${saved ? 'from' : 'to'} favorites" aria-pressed="${saved}">${saved ? '♥' : '♡'}</button></div>
      <div class="card-tags"><span class="tag">${escape(v.gender)}</span><span class="tag">${escape(v.accent)}</span>${v.group === 'World voices' ? '<span class="tag">World voice</span>' : ''}</div>
      <p class="card-note">${v.group === 'World voices' ? 'Experimental English reading' : `${escape(v.accent)} English · recorded locally`}</p>
      <div class="card-bottom"><span class="card-duration">${recording ? `${durationLabel(recording.duration)} · MP3` : 'Recording pending'}</span><button class="voice-play" data-play="${escape(v.id)}" aria-label="${playing ? 'Pause' : 'Play'} ${escape(v.name)} (${escape(v.id)})" ${recording ? '' : 'disabled'}><span class="play-icon" aria-hidden="true">${playing ? 'Ⅱ' : '▶'}</span>${playing ? 'Pause voice' : 'Audition'}</button></div></article>`;
  }).join('');
}
function updatePlaybackUI() {
  document.querySelectorAll('[data-voice]').forEach(card => {
    const v = voices.find(v => v.id === card.dataset.voice);
    const active = current?.id === v.id;
    const playing = active && !audio.paused;
    card.classList.toggle('is-current', active);
    const button = card.querySelector('[data-play]');
    button.setAttribute('aria-label', `${playing ? 'Pause' : 'Play'} ${v.name} (${v.id})`);
    button.innerHTML = `<span class="play-icon" aria-hidden="true">${playing ? 'Ⅱ' : '▶'}</span>${playing ? 'Pause voice' : 'Audition'}`;
  });
  if (current) $('player-status').textContent = `${audio.paused ? 'PAUSED' : 'NOW AUDITIONING'}${sequential ? ` · ${queueIndex + 1} OF ${queue.length}` : ''}`;
  $('previous').disabled = queueIndex <= 0;
  $('next').disabled = queueIndex >= queue.length - 1;
}
async function startVoice(voice) {
  if (!voice || !recordings[voice.id]) return;
  const token = ++playbackToken;
  audio.pause();
  current = voice;
  $('player-dock').hidden = false;
  document.body.classList.add('has-player');
  $('player-name').textContent = voice.name;
  $('player-description').textContent = `${voice.gender} · ${voice.accent} · ${voice.id}`;
  $('playback-message').textContent = '';
  audio.src = voice.audio;
  updatePlaybackUI();
  try { await audio.play(); }
  catch (error) {
    if (token !== playbackToken || error.name === 'AbortError') return;
    sequential = false;
    $('playback-message').textContent = 'Playback could not start. Press play in the player to retry, or choose another voice.';
    updatePlaybackUI();
  }
}
function setQueue(list, selected = 0, auto = false) {
  queue = list.filter(v => recordings[v.id]);
  queueIndex = selected;
  sequential = auto;
  startVoice(queue[queueIndex]);
}
function resetFilters() {
  ['search','gender','accent','language'].forEach(id => $(id).value = '');
  $('sort').value = 'audition';
  $('favorites-only').checked = false;
  render();
}
$('voice-grid').addEventListener('click', event => {
  const favorite = event.target.closest('[data-favorite]');
  if (favorite) {
    const id = favorite.dataset.favorite;
    favorites.has(id) ? favorites.delete(id) : favorites.add(id);
    try { localStorage.setItem('voice-auditions:favorites', JSON.stringify([...favorites])); } catch { /* Session favorites remain usable. */ }
    render();
    document.querySelector(`[data-favorite="${id}"]`)?.focus({preventScroll:true});
    return;
  }
  const button = event.target.closest('[data-play]');
  if (!button) return;
  const id = button.dataset.play;
  if (current?.id === id && !audio.ended) {
    if (audio.paused) audio.play().catch(() => { $('playback-message').textContent = 'Playback unavailable. Try another voice or reload the page.'; });
    else audio.pause();
  } else {
    const list = filteredVoices().filter(v => recordings[v.id]);
    setQueue(list, list.findIndex(v => v.id === id));
  }
});
['search','gender','accent','language','sort','favorites-only'].forEach(id => $(id).addEventListener(id === 'search' ? 'input' : 'change', render));
$('reset').addEventListener('click', resetFilters);
$('empty-reset').addEventListener('click', resetFilters);
$('play-all').addEventListener('click', () => setQueue(filteredVoices(), 0, true));
$('lucky').addEventListener('click', () => {
  const list = filteredVoices().filter(v => recordings[v.id]);
  const candidates = list.length > 1 ? list.filter(v => v.id !== current?.id) : list;
  if (!candidates.length) return;
  const random = new Uint32Array(1); crypto.getRandomValues(random);
  const chosen = candidates[Math.floor(random[0] / 4294967296 * candidates.length)];
  setQueue(list, list.findIndex(v => v.id === chosen.id));
});
$('previous').addEventListener('click', () => { if (queueIndex > 0) startVoice(queue[--queueIndex]); });
$('next').addEventListener('click', () => { if (queueIndex < queue.length - 1) startVoice(queue[++queueIndex]); });
$('stop').addEventListener('click', () => {
  ++playbackToken; sequential = false; audio.pause(); audio.removeAttribute('src'); audio.load();
  current = null; queue = []; queueIndex = -1;
  $('player-dock').hidden = true; document.body.classList.remove('has-player');
  updatePlaybackUI(); $('play-all').focus({preventScroll:true});
});
audio.addEventListener('play', () => { $('playback-message').textContent = ''; updatePlaybackUI(); });
audio.addEventListener('pause', updatePlaybackUI);
audio.addEventListener('ended', () => {
  if (sequential && queueIndex < queue.length - 1) startVoice(queue[++queueIndex]);
  else { sequential = false; updatePlaybackUI(); $('player-status').textContent = 'AUDITION COMPLETE'; }
});
audio.addEventListener('error', () => {
  if (!audio.getAttribute('src')) return;
  sequential = false;
  $('playback-message').textContent = 'This recording could not load. Try another voice or check your connection.';
  updatePlaybackUI();
});
async function load() {
  try {
    const responses = await Promise.all([fetch('voices.json'), fetch('recordings.json')]);
    if (responses.some(r => !r.ok)) throw new Error('Catalog unavailable');
    [catalog, {recordings}] = await Promise.all(responses.map(r => r.json()));
    voices = catalog.voices;
    for (const [id, field] of [['accent','accent'],['language','language']]) {
      [...new Set(voices.map(v => v[field]))].sort().forEach(value => { const option = new Option(value, value); $(id).add(option); });
    }
    const total = Object.values(recordings).reduce((sum, r) => sum + r.duration, 0);
    $('production-note').textContent = `${Object.keys(recordings).length} recorded auditions · ${Math.round(total / 60)} minutes of audio · rate 1.0× · generated on Sunset, our Mac Studio. Technical file checks are separate from listening preference.`;
    render();
  } catch {
    $('results').textContent = 'The cast could not load. Please reload the page or try again shortly.';
    $('voice-grid').innerHTML = '<p class="empty-state">Our casting room is temporarily unavailable. The script and backstage notes are still here to explore.</p>';
  }
}
load();
