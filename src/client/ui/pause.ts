// Pause screen: stats and arsenal.

import { ABILITY_MAX_LEVEL, CHARACTERS } from '../../sim/content/characters';
import { BONUSES, PERKS } from '../../sim/content/perks';
import { WEAPONS, weaponName } from '../../sim/content/weapons';
import type { Player } from '../../sim/types';
import { byId, el, esc } from './dom';

export const pct = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;

export function buildPause(p: Player): void {
  const st = p.stats;
  const rows: [string, string][] = [
    ['Max HP', `${Math.round(st.maxHp)}`],
    ['Regeneration', `${st.regen.toFixed(1)}/s`],
    ['Armor', `${st.armor}`],
    ['Damage taken', `-${Math.round(st.dr * 100)}%`],
    ['Lifesteal', `${(st.lifesteal * 100).toFixed(1)}%`],
    ['Ignite chance', `${Math.round(st.burn * 100)}%`],
    ['Might', pct(st.might - 1)],
    ['Cooldown', pct(st.cooldown - 1)],
    ['Area', pct(st.area - 1)],
    ['Duration', pct(st.duration - 1)],
    ['Amount', `+${st.amount}`],
    ['Crit chance', `${Math.round(st.crit * 100)}%`],
    ['Move speed', `${Math.round(st.speed)}`],
    ['Pickup range', `${Math.round(st.magnet)}`],
    ['Growth', pct(st.growth - 1)],
  ];
  byId('pause-stats').innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  const ars = byId('pause-arsenal');
  ars.innerHTML = '';
  const c = CHARACTERS[p.charId];
  ars.appendChild(el('div', 'it', `<span class="ic" style="color:${c.accent}">★</span>
    <span>${esc(c.ability.name)}</span><span class="lv">Lv ${p.abilityLevel}/${ABILITY_MAX_LEVEL}</span>`));
  for (const w of p.weapons) {
    const d = WEAPONS[w.id];
    ars.appendChild(el('div', 'it', `<span class="ic" style="color:${d.color}">${d.icon}</span>
      <span class="${w.evolved ? 'evolved' : ''}">${esc(weaponName(w))}</span>
      <span class="lv">Lv ${w.level}</span>`));
  }
  for (const k of p.perks) {
    const d = PERKS[k.id];
    ars.appendChild(el('div', 'it', `<span class="ic" style="color:${d.color}">${d.icon}</span>
      <span>${esc(d.name)}</span><span class="lv">Lv ${k.level}/${d.max}</span>`));
  }
  for (const id in p.bonus) {
    const d = BONUSES[id];
    ars.appendChild(el('div', 'it', `<span class="ic" style="color:${d.color}">${d.icon}</span>
      <span>${esc(d.name)}</span><span class="lv">×${p.bonus[id]}</span>`));
  }
}
