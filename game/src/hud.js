// The DOM layer: HUD bars, wave banner, menus and the upgrade draft. The
// canvas draws the world; the DOM draws everything the player reads, so text
// stays crisp at any window size.
export function createHud() {
  const el = (id) => document.getElementById(id);
  const els = {
    lightFill: el('light-fill'),
    lightText: el('light-text'),
    hpFill: el('hp-fill'),
    hpText: el('hp-text'),
    wave: el('wave-label'),
    score: el('score-value'),
    embers: el('ember-value'),
    kills: el('kill-value'),
    dash: el('dash-fill'),
    banner: el('banner'),
    bannerTitle: el('banner-title'),
    bannerSub: el('banner-sub'),
    overlay: el('overlay'),
    overlayTitle: el('overlay-title'),
    overlayCopy: el('overlay-copy'),
    overlayStats: el('overlay-stats'),
    playBtn: el('play'),
    draft: el('draft'),
    draftCards: el('draft-cards'),
    hint: el('hint'),
    mute: el('mute-label'),
  };
  let bannerTimer = 0;

  function showOverlay(kind, data = {}) {
    els.overlay.hidden = false;
    els.draft.hidden = true;
    if (kind === 'start') {
      els.overlayTitle.innerHTML = 'GLOAM<span class="amber">KEEPER</span>';
      els.overlayCopy.textContent = 'Night after night the gloom crawls out of the sea, hungry for the last light on the coast. You are its keeper. Hold the lighthouse through 10 waves — and whatever stirs behind them.';
      els.overlayStats.style.display = 'none';
      els.playBtn.textContent = 'Light the lamp';
    } else if (kind === 'paused') {
      els.overlayTitle.textContent = 'PAUSED';
      els.overlayCopy.textContent = 'The gloom waits. The light holds.';
      els.overlayStats.style.display = 'none';
      els.playBtn.textContent = 'Back to the fight';
    } else if (kind === 'win') {
      els.overlayTitle.innerHTML = 'DAWN <span class="amber">BREAKS</span>';
      els.overlayCopy.textContent = 'The Herald is scattered and the gloom retreats into the sea. The light you kept all night greets the morning.';
      els.overlayStats.style.display = 'block';
      els.overlayStats.textContent = `Score ${data.score} · Wave ${data.wave} · ${data.kills} gloom felled · ${data.embers} embers gathered`;
      els.playBtn.textContent = 'Keep again';
    } else if (kind === 'lose') {
      els.overlayTitle.innerHTML = 'THE LIGHT <span class="amber">GOES OUT</span>';
      els.overlayCopy.textContent = data.reason === 'keeper'
        ? 'The keeper falls, and no hand is left to tend the lamp.'
        : 'The lighthouse gutters and dies. The gloom swallows the shore.';
      els.overlayStats.style.display = 'block';
      els.overlayStats.textContent = `Score ${data.score} · Reached wave ${data.wave} · ${data.kills} gloom felled · ${data.embers} embers gathered`;
      els.playBtn.textContent = 'Try again';
    }
  }

  return {
    setLight(hp, max) {
      const frac = Math.max(0, hp / max);
      els.lightFill.style.width = `${frac * 100}%`;
      els.lightFill.classList.toggle('low', frac < 0.3);
      els.lightText.textContent = `${Math.ceil(hp)} / ${max}`;
    },
    setHp(hp, max) {
      els.hpFill.style.width = `${Math.max(0, hp / max) * 100}%`;
      els.hpText.textContent = `${Math.ceil(hp)}`;
    },
    setWave(wave, total) { els.wave.textContent = `WAVE ${wave} / ${total}`; },
    setScore(score) { els.score.textContent = String(score); },
    setEmbers(n) { els.embers.textContent = String(n); },
    setKills(n) { els.kills.textContent = String(n); },
    setDash(frac) { els.dash.style.width = `${Math.min(1, Math.max(0, frac)) * 100}%`; },
    setHint(text) { els.hint.textContent = text; },
    setMuted(muted) { els.mute.textContent = muted ? 'SOUND OFF [M]' : 'SOUND ON [M]'; },
    banner(title, sub = '', seconds = 2.2) {
      els.bannerTitle.textContent = title;
      els.bannerSub.textContent = sub;
      els.banner.classList.add('on');
      bannerTimer = seconds;
    },
    hideBanner() {
      bannerTimer = 0;
      els.banner.classList.remove('on');
    },
    stepBanner(dt) {
      if (bannerTimer > 0) {
        bannerTimer -= dt;
        if (bannerTimer <= 0) els.banner.classList.remove('on');
      }
    },
    showOverlay,
    hideOverlay() { els.overlay.hidden = true; },
    onPlay(fn) { els.playBtn.addEventListener('click', fn); },
    // The upgrade draft: three cards, clickable or keys 1-3. Returns the
    // chosen upgrade through the callback, then hides itself.
    showDraft(cards, onPick) {
      els.overlay.hidden = true;
      els.draft.hidden = false;
      els.draftCards.innerHTML = '';
      cards.forEach((card, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'card';
        button.innerHTML = `<span class="card-key">${i + 1}</span><span class="card-icon"></span><span class="card-name"></span><span class="card-desc"></span>`;
        button.querySelector('.card-icon').textContent = card.icon;
        button.querySelector('.card-name').textContent = card.name;
        button.querySelector('.card-desc').textContent = card.desc;
        button.addEventListener('click', () => onPick(card));
        els.draftCards.appendChild(button);
      });
    },
    hideDraft() { els.draft.hidden = true; },
    isDraftOpen() { return !els.draft.hidden; },
  };
}
