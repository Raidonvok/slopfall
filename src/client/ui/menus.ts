import { ABILITY_MAX_LEVEL, CHARACTERS, CHARACTER_IDS } from '../../sim/content/characters';
import { BONUSES, PERKS } from '../../sim/content/perks';
import { levelDesc, MAX_WEAPON_LEVEL, WEAPONS } from '../../sim/content/weapons';
import type { GameState, Player, UpgradeOption } from '../../sim/types';
import { drawCharacterBody } from '../render/draw';
import { fmtTime } from '../render/hud';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;

function el(tag: string, cls = '', html = ''): HTMLElement {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

export type ScreenId = 'menu' | 'chars' | 'levelup' | 'pause' | 'over';

export function show(id: ScreenId | null): void {
  for (const s of ['menu', 'chars', 'levelup', 'pause', 'over'] as ScreenId[]) {
    $(`screen-${s}`).classList.toggle('hidden', s !== id);
  }
}

export function portrait(charId: string, size = 192): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d')!;
  g.scale(size / 72, size / 72);
  g.fillStyle = 'rgba(0,0,0,0.35)';
  g.beginPath();
  g.ellipse(32, 60, 16, 5, 0, 0, Math.PI * 2);
  g.fill();
  drawCharacterBody(g, charId, 32, 45, 15, 0.8, 0.25, 0);
  return c;
}

export function buildCharSelect(onPick: (id: string) => void): void {
  const grid = $('char-grid');
  grid.innerHTML = '';
  for (const id of CHARACTER_IDS) {
    const c = CHARACTERS[id];
    const w = WEAPONS[c.weapon];
    const card = el('div', 'char-card');
    card.style.setProperty('--c', c.accent);
    const top = el('div', 'top');
    top.appendChild(portrait(id));
    top.appendChild(el('div', '', `<div class="name">${esc(c.name)}</div><div class="title">${esc(c.title)}</div>`));
    card.appendChild(top);
    card.appendChild(el('div', 'line', `<b>HP</b> ${c.hp} &nbsp; <b>Speed</b> ${c.speed}`));
    card.appendChild(el('div', 'line', `<b>Weapon</b> <span style="color:${w.color}">${w.icon}</span> ${esc(w.name)}`));
    card.appendChild(el('div', 'line', `<b>Passive</b> ${esc(c.passive)}`));
    card.appendChild(el('div', 'ability', `<strong>${esc(c.ability.name)}</strong> · ${c.ability.cd}s<br>${esc(c.ability.desc)}`));
    card.addEventListener('click', () => onPick(id));
    grid.appendChild(card);
  }
}

function optionView(o: UpgradeOption, charId: string): { icon: string; color: string; name: string; tag: string; isNew: boolean; desc: string; evo: string } {
  if (o.kind === 'weapon') {
    const d = WEAPONS[o.id];
    const evo = o.level === MAX_WEAPON_LEVEL
      ? `Max level! Evolves into ${d.evoName} with ${PERKS[d.evoPerk].name} (open a chest)`
      : o.level === 1 ? `Evolution: ${PERKS[d.evoPerk].name}` : '';
    return { icon: d.icon, color: d.color, name: d.name, tag: o.level === 1 ? 'NEW WEAPON' : `LEVEL ${o.level}`, isNew: o.level === 1, desc: levelDesc(d, o.level), evo };
  }
  if (o.kind === 'perk') {
    const d = PERKS[o.id];
    return { icon: d.icon, color: d.color, name: d.name, tag: o.level === 1 ? 'NEW PERK' : `LEVEL ${o.level} / ${d.max}`, isNew: o.level === 1, desc: d.desc, evo: '' };
  }
  if (o.kind === 'ability') {
    const c = CHARACTERS[charId];
    return { icon: '★', color: c.accent, name: c.ability.name, tag: `ABILITY ${o.level} / ${ABILITY_MAX_LEVEL}`, isNew: false, desc: c.ability.upgrade, evo: '' };
  }
  if (o.kind === 'bonus') {
    const d = BONUSES[o.id];
    return { icon: d.icon, color: d.color, name: d.name, tag: `BONUS ×${o.level}`, isNew: false, desc: d.desc, evo: '' };
  }
  return { icon: '✚', color: '#6bff8f', name: 'Restore', tag: 'HEAL', isNew: false, desc: 'Heal 50% of max HP', evo: '' };
}

export function buildLevelUp(choices: UpgradeOption[], charId: string, onChoose: (i: number) => void): void {
  const box = $('levelup-cards');
  box.innerHTML = '';
  choices.forEach((o, i) => {
    const v = optionView(o, charId);
    const card = el('div', 'card');
    card.style.setProperty('--c', v.color);
    card.innerHTML = `
      <div class="icon">${v.icon}</div>
      <div class="cname">${esc(v.name)}</div>
      <div class="tag ${v.isNew ? 'new' : ''}">${v.tag}</div>
      <div class="desc">${esc(v.desc)}</div>
      ${v.evo ? `<div class="evo">${esc(v.evo)}</div>` : ''}
      <div class="key"><kbd>${i + 1}</kbd></div>`;
    card.addEventListener('click', () => onChoose(i));
    box.appendChild(card);
  });
}

const pct = (v: number) => `${v >= 0 ? '+' : ''}${Math.round(v * 100)}%`;

export function buildPause(p: Player): void {
  const st = p.stats;
  const rows: [string, string][] = [
    ['Max HP', `${Math.round(st.maxHp)}`],
    ['Regeneration', `${st.regen.toFixed(1)}/s`],
    ['Armor', `${st.armor}`],
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
  $('pause-stats').innerHTML = rows.map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`).join('');
  const ars = $('pause-arsenal');
  ars.innerHTML = '';
  const c = CHARACTERS[p.charId];
  ars.appendChild(el('div', 'it', `<span class="ic" style="color:${c.accent}">★</span>
    <span>${esc(c.ability.name)}</span><span class="lv">Lv ${p.abilityLevel}/${ABILITY_MAX_LEVEL}</span>`));
  for (const w of p.weapons) {
    const d = WEAPONS[w.id];
    ars.appendChild(el('div', 'it', `<span class="ic" style="color:${d.color}">${d.icon}</span>
      <span class="${w.evolved ? 'evolved' : ''}">${esc(w.evolved ? d.evoName : d.name)}</span>
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

const SRC_NAMES: Record<string, string> = { ability: 'Ability', raise: 'Raised Dead', bomb: 'Bomb' };

export function buildGameOver(s: GameState, p: Player): void {
  const items: [string, string][] = [
    ['Survived', fmtTime(s.time)],
    ['Wave', String(s.wave.n)],
    ['Level', String(p.level)],
    ['Kills', String(p.kills)],
  ];
  $('over-summary').innerHTML = items.map(([k, v]) => `<div><div class="v">${v}</div><div class="k">${k}</div></div>`).join('');
  const rows = Object.entries(p.dmgDealt).sort((a, b) => b[1] - a[1]);
  $('over-damage').innerHTML = rows
    .map(([src, v]) => {
      const w = WEAPONS[src];
      const evolved = p.weapons.find((x) => x.id === src)?.evolved;
      const name = w ? `<span style="color:${w.color}">${w.icon}</span> ${esc(evolved ? w.evoName : w.name)}` : SRC_NAMES[src] ?? src;
      return `<tr><td>${name}</td><td>${Math.round(v).toLocaleString('en-US')}</td></tr>`;
    })
    .join('');
}
