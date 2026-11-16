// Wave design: 10 waves, each a composition of kinds plus a spawn interval.
// Difficulty grows three ways at once — more creatures, tougher kinds, and
// more hit points — so the player's upgrades stay necessary, not optional.
export const TOTAL_WAVES = 10;

const WAVES = [
  { skitter: 6 },
  { skitter: 8, crawler: 3 },
  { skitter: 10, crawler: 5, splitter: 1 },
  { skitter: 8, crawler: 7, spitter: 2 },
  { crawler: 9, splitter: 3, skitter: 10 },
  { hulk: 2, crawler: 8, skitter: 12, spitter: 2 },
  { hulk: 3, splitter: 4, crawler: 8, skitter: 10, spitter: 3 },
  { hulk: 4, spitter: 4, splitter: 4, skitter: 14 },
  { hulk: 5, spitter: 5, splitter: 5, crawler: 10, skitter: 12 },
  { herald: 1, hulk: 2, spitter: 3, skitter: 8 },
];

// Hit-point multiplier per wave: gentle early, steep at the end.
export function hpScaleFor(wave) {
  return 1 + (wave - 1) * 0.16;
}

// Seconds between spawns: faster as waves progress, with the boss arriving last.
export function spawnIntervalFor(wave) {
  return Math.max(0.35, 1.05 - wave * 0.07);
}

// Build the spawn queue for a wave: kinds shuffled, boss always last.
export function buildQueue(wave, rng) {
  const comp = WAVES[wave - 1] || WAVES[WAVES.length - 1];
  const queue = [];
  for (const [kind, count] of Object.entries(comp)) {
    for (let i = 0; i < count; i++) queue.push(kind);
  }
  const boss = queue.filter((k) => k === 'herald');
  const rest = rng.shuffle(queue.filter((k) => k !== 'herald'));
  return [...rest, ...boss];
}

export function waveCount(wave) {
  const comp = WAVES[wave - 1] || WAVES[WAVES.length - 1];
  return Object.values(comp).reduce((n, c) => n + c, 0);
}

export function waveName(wave) {
  if (wave === TOTAL_WAVES) return 'THE HERALD STIRS';
  if (wave === 1) return 'FIRST GLOOM';
  const names = [
    '', '', 'THICKENING DARK', 'WHISPERS', 'TEETH IN THE TIDE',
    'HEAVY SHADOWS', 'THE SPLITTING', 'GREEN EYES', 'NEARLY DAWN', '',
  ];
  return names[wave] || `WAVE ${wave}`;
}
