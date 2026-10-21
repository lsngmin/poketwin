import { useEffect, useId, useState } from 'react';

// 도감 배지 4개: 에메랄드(4종) → 사파이어(8종) → 루비(16종) → 다이아몬드(32종)
// 친구가 늘수록 이미 있는 포켓몬과 겹치는 일이 많아져서(32종이 고르게 나와도 8종은 친구 약 9명, 16종은 약 21명, 32종은 약 130명),
// 같은 간격 대신 두 배씩 늘려요. 첫 배지는 금방, 마지막 다이아몬드는 '도감 완성'이라는 먼 목표예요.
export interface Badge { id: 'emerald' | 'sapphire' | 'ruby' | 'diamond'; name: string; need: number }
export const BADGES: Badge[] = [
  { id: 'emerald', name: '에메랄드 배지', need: 4 },
  { id: 'sapphire', name: '사파이어 배지', need: 8 },
  { id: 'ruby', name: '루비 배지', need: 16 },
  { id: 'diamond', name: '다이아몬드 배지', need: 32 },
];
export const earnedBadges = (found: number) => BADGES.filter(badge => found >= badge.need).length;

// ── 보석 모양 만들기 ────────────────────────────────────────────────
// 보석마다 실제 커팅을 따라 면을 나누고, 왼쪽 위에서 빛이 들어온다고 보고 면마다 밝기를 정해요.
// 모양과 색은 처음 한 번만 계산해 두고, 화면에서는 그대로 그려요.
type Pt = [number, number];
type Facet = { p: Pt[]; kind: 'star' | 'kite' | 'girdle' | 'step0' | 'step1'; i: number };
const INK = '#14261f';
const FIRE = ['#ffd6ec', '#d8ccff', '#bff1ff', '#d6ffd0', '#fff2bf', '#ffe0cc'];
const rgb = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const mix = (a: string, b: string, t: number) => '#' + rgb(a).map((v, i) => Math.round(v + (rgb(b)[i] - v) * t).toString(16).padStart(2, '0')).join('');
function shade(pal: string[], t: number) {
  const c = Math.max(0, Math.min(1, t)), s = c * (pal.length - 1), i = Math.min(pal.length - 2, Math.floor(s));
  return mix(pal[i], pal[i + 1], s - i);
}
const pts = (list: Pt[]) => list.map(([x, y]) => `${x.toFixed(2)},${y.toFixed(2)}`).join(' ');
const centroid = (list: Pt[]): Pt => list.reduce<Pt>(([sx, sy], [x, y]) => [sx + x / list.length, sy + y / list.length], [0, 0]);
const lit = (list: Pt[]) => { const [x, y] = centroid(list); return .5 + .42 * Math.cos(Math.atan2(y - 32, x - 32) + 2.36); };
function ring(n: number, rx: number, ry: number, rot = 0, squircle = 0): Pt[] {
  return Array.from({ length: n }, (_, i) => {
    const a = rot + i * 2 * Math.PI / n; let c = Math.cos(a), s = Math.sin(a);
    if (squircle) { const p = 2 / squircle; c = Math.sign(c) * Math.abs(c) ** p; s = Math.sign(s) * Math.abs(s) ** p; }
    return [32 + rx * c, 32 + ry * s];
  });
}
// 브릴리언트 컷(사파이어 타원, 루비 쿠션, 다이아몬드 프린세스): 테이블 8각, 스타·연·거들 면
function brilliant(rx: number, ry: number, squircle = 0) {
  const O = ring(16, rx, ry, 0, squircle), T = ring(8, rx * .5, ry * .5, 0, squircle), M = ring(8, rx * .74, ry * .74, Math.PI / 8, squircle);
  const facets: Facet[] = [];
  for (let i = 0; i < 8; i++) {
    const j = (i + 1) % 8, k = (i + 7) % 8;
    facets.push({ p: [T[i], M[i], T[j]], kind: 'star', i });
    facets.push({ p: [T[i], M[k], O[2 * i], M[i]], kind: 'kite', i });
    facets.push({ p: [M[i], O[2 * i], O[2 * i + 1]], kind: 'girdle', i: 2 * i });
    facets.push({ p: [M[i], O[2 * i + 1], O[(2 * i + 2) % 16]], kind: 'girdle', i: 2 * i + 1 });
  }
  return { outline: O, table: T, facets };
}
// 에메랄드 컷: 모서리를 깎은 직사각형을 계단처럼 두 번 안으로 들여요.
function stepCut() {
  const oct = (x1: number, y1: number, x2: number, y2: number, c: number): Pt[] => [[x1 + c, y1], [x2 - c, y1], [x2, y1 + c], [x2, y2 - c], [x2 - c, y2], [x1 + c, y2], [x1, y2 - c], [x1, y1 + c]];
  const A = oct(15, 7, 49, 57, 8), B = oct(19.5, 12, 44.5, 52, 6.4), C = oct(24, 17, 40, 47, 4.6);
  const facets: Facet[] = [];
  [[A, B], [B, C]].forEach(([P, Q], r) => P.forEach((_, i) => { const j = (i + 1) % 8; facets.push({ p: [P[i], P[j], Q[j], Q[i]], kind: r ? 'step1' : 'step0', i }); }));
  return { outline: A, table: C, facets };
}

interface Gem { pal: string[]; metal: [string, string, string]; glow: string; prongs: Pt[]; fire?: boolean; cut: { outline: Pt[]; table: Pt[]; facets: Facet[] } }
const GEMS: Record<Badge['id'], Gem> = {
  emerald: { pal: ['#04361b', '#0b6b35', '#20a85a', '#6ee39a', '#d9ffe6'], metal: ['#ffe1bd', '#d38b4c', '#7a3d17'], glow: '#3ddc84', cut: stepCut(), prongs: [[15, 7], [49, 7], [49, 57], [15, 57]] },
  sapphire: { pal: ['#071a4d', '#103a99', '#2f6fe0', '#7fb2ff', '#e3eeff'], metal: ['#ffffff', '#c9d2dc', '#66727f'], glow: '#4f8dff', cut: brilliant(19.5, 25), prongs: [[32, 6], [51.5, 32], [32, 58], [12.5, 32]] },
  ruby: { pal: ['#3d0410', '#8c0f26', '#d72747', '#ff7d92', '#ffe1e6'], metal: ['#fff5c0', '#f0c43c', '#7d5304'], glow: '#ff4d6d', cut: brilliant(24, 24, 3.2), prongs: [[11, 11], [53, 11], [53, 53], [11, 53]] },
  // 다이아몬드는 프린세스 컷(정사각). 어두운 면과 하얀 면을 번갈아 두고 몇몇 면에 무지개빛(파이어)을 섞어요.
  diamond: { pal: ['#121a30', '#34456f', '#8ea3d4', '#e4ecff', '#ffffff'], metal: ['#ffffff', '#e3e9f0', '#8a96a4'], glow: '#bcd2ff', cut: brilliant(22, 22, 9), fire: true, prongs: [[10.5, 10.5], [53.5, 10.5], [53.5, 53.5], [10.5, 53.5]] },
};
const PAINT = Object.fromEntries(Object.entries(GEMS).map(([key, gem]) => [key, gem.cut.facets.map((f, i) => {
  let t = lit(f.p);
  if (gem.fire) {
    const flip = (f.i + (f.kind === 'kite' ? 1 : 0)) % 2, base = shade(gem.pal, t * .55 + (flip ? .5 : .05));
    return { points: pts(f.p), fill: i % 5 === 2 ? mix(base, FIRE[i % FIRE.length], .7) : base, stroke: '#ffffff', opacity: .9, width: .6 };
  }
  if (f.kind === 'star' || f.kind === 'girdle') t += f.i % 2 ? .18 : -.12;
  if (f.kind === 'kite') t += .08;
  if (f.kind === 'step1') t += .12;
  return { points: pts(f.p), fill: shade(gem.pal, t), stroke: shade(gem.pal, Math.min(1, t + .35)), opacity: .55, width: .5 };
})])) as Record<Badge['id'], { points: string; fill: string; stroke: string; opacity: number; width: number }[]>;

// 움직임 줄이기를 켠 기기에서는 반짝임·빛줄기를 멈춰요.
function useCalm() {
  const [calm, setCalm] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!query) return;
    const update = () => setCalm(query.matches);
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return calm;
}

function Sparkle({ x, y, size, delay }: { x: number; y: number; size: number; delay: number }) {
  const s = size, c = s * .12;
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M0 ${-s}C${c} ${-c} ${c} ${-c} ${s} 0C${c} ${c} ${c} ${c} 0 ${s}C${-c} ${c} ${-c} ${c} ${-s} 0C${-c} ${-c} ${-c} ${-c} 0 ${-s}z`} fill="#fff" opacity="0">
        <animate attributeName="opacity" values="0;1;0" dur="2.6s" begin={`${delay}s`} repeatCount="indefinite" />
        <animateTransform attributeName="transform" type="scale" values="0;1;0" dur="2.6s" begin={`${delay}s`} repeatCount="indefinite" />
      </path>
    </g>
  );
}

// 보석 배지 하나. 받은 배지는 뒤에서 빛나고 빛줄기·반짝임이 지나가요(animate). 못 받은 배지는 같은 커팅의 어두운 원석에 '?'예요.
export function BadgeIcon({ badge, earned, size = 22, animate = false }: { badge: Badge; earned: boolean; size?: number; animate?: boolean }) {
  const uid = useId().replace(/:/g, '');
  const calm = useCalm();
  const move = animate && !calm;
  const gem = GEMS[badge.id], { outline, table } = gem.cut;
  const order = BADGES.indexOf(badge);
  if (!earned) {
    return (
      <svg className="badge-icon locked" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
        <polygon points={pts(outline)} fill="#1f3a30" stroke="#41695a" strokeWidth="1.6" strokeLinejoin="round" />
        {PAINT[badge.id].map(f => <polygon key={f.points} points={f.points} fill="none" stroke="#2f5244" strokeWidth=".7" />)}
        <text x="32" y="37" textAnchor="middle" fontSize="12" fontWeight="900" fill="#76a08d">?</text>
      </svg>
    );
  }
  const [mh, mm, ml] = gem.metal;
  const tablePts = pts(table);
  return (
    <svg className="badge-icon" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true">
      <defs>
        <radialGradient id={`g${uid}`}><stop offset="0" stopColor={gem.glow} stopOpacity=".7" /><stop offset="1" stopColor={gem.glow} stopOpacity="0" /></radialGradient>
        <linearGradient id={`m${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={mh} /><stop offset=".5" stopColor={mm} /><stop offset="1" stopColor={ml} /></linearGradient>
        <linearGradient id={`t${uid}`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={shade(gem.pal, .95)} /><stop offset="1" stopColor={shade(gem.pal, .55)} /></linearGradient>
        {gem.fire && (
          <linearGradient id={`p${uid}`} x1="0" y1="0" x2="1" y2="1">
            {FIRE.map((color, i) => <stop key={color} offset={i / (FIRE.length - 1)} stopColor={color} />)}
            {move && <animateTransform attributeName="gradientTransform" type="rotate" from="0 .5 .5" to="360 .5 .5" dur="4.5s" repeatCount="indefinite" />}
          </linearGradient>
        )}
        <clipPath id={`c${uid}`}><polygon points={pts(outline)} /></clipPath>
      </defs>
      {size >= 40 && <circle cx="32" cy="32" r="31" fill={`url(#g${uid})`}>{move && <animate attributeName="opacity" values=".55;1;.55" dur="3s" repeatCount="indefinite" />}</circle>}
      <polygon points={pts(outline)} fill={`url(#m${uid})`} stroke={INK} strokeWidth="4.2" strokeLinejoin="round" />
      <polygon points={pts(outline)} fill={`url(#m${uid})`} stroke={`url(#m${uid})`} strokeWidth="2.4" strokeLinejoin="round" />
      {gem.prongs.map(([x, y]) => <circle key={`${x}-${y}`} cx={x} cy={y} r="3.1" fill={`url(#m${uid})`} stroke={INK} strokeWidth="1.3" />)}
      {PAINT[badge.id].map(f => <polygon key={f.points} points={f.points} fill={f.fill} stroke={f.stroke} strokeOpacity={f.opacity} strokeWidth={f.width} />)}
      <polygon points={tablePts} fill={`url(#t${uid})`} stroke="#fff" strokeOpacity=".6" strokeWidth=".7" />
      {gem.fire && <polygon points={pts(outline)} fill={`url(#p${uid})`} opacity=".28" style={{ mixBlendMode: 'screen' }} />}
      <g clipPath={`url(#c${uid})`}>
        <polygon points={`${pts(table.slice(0, Math.ceil(table.length / 2)))} ${pts([centroid(table)])}`} fill="#fff" fillOpacity=".22" />
        {move && (
          <rect x="-30" y="-10" width="9" height="90" fill="#fff" fillOpacity=".6" transform="rotate(30 32 32)">
            <animate attributeName="x" values="-30;80;80" keyTimes="0;.25;1" dur="3.8s" begin={`${order * .8}s`} repeatCount="indefinite" />
          </rect>
        )}
      </g>
      {move && <><Sparkle x={47} y={15} size={5.5} delay={order * .7} /><Sparkle x={19} y={46} size={3.6} delay={1.3 + order * .4} /></>}
    </svg>
  );
}

// 트레이너 카드 아래에 펼쳐지는 배지 칸(카드와 같은 진초록): 받은 보석은 반짝이고, 다음 배지까지 남은 종류를 알려줘요.
export function BadgePanel({ id, found }: { id: string; found: number }) {
  const next = BADGES.find(badge => found < badge.need);
  return (
    <section id={id} className="tc-badges" aria-label="도감 배지">
      <p className="tc-badges-head"><b>배지</b></p>
      <ul>
        {BADGES.map(badge => {
          const got = found >= badge.need;
          return (
            <li key={badge.id}>
              <span className="tc-slot"><BadgeIcon badge={badge} earned={got} size={60} animate /></span>
              <span className="sr-only">{badge.name}, {got ? `${badge.need}종 달성` : `${badge.need}종까지 ${badge.need - found}종 남음`}</span>
            </li>
          );
        })}
      </ul>
      <p className="tc-badges-next">{next ? `다음은 ${next.name}예요, 도감을 ${next.need - found}종만 더 채우면 받아요` : '모든 배지를 모았어요, 도감 완성!'}</p>
    </section>
  );
}

// 새 배지를 받은 순간: 도감 주인이 도감을 열었을 때 아직 축하하지 않은 배지가 있으면 한 번 보여줘요.
const SEEN = 'poketwin:badges-seen';
function seenFor(code: string) { try { return Number(JSON.parse(localStorage.getItem(SEEN) || '{}')[code] ?? 0); } catch { return 0; } }
function markSeen(code: string, count: number) {
  try { const all = JSON.parse(localStorage.getItem(SEEN) || '{}'); all[code] = count; localStorage.setItem(SEEN, JSON.stringify(all)); } catch { /* 저장소 미지원 */ }
}
export function NewBadge({ code, found }: { code: string; found: number }) {
  const earned = earnedBadges(found);
  const [shown, setShown] = useState(() => earned > seenFor(code));
  if (!shown || !earned) return null;
  const badge = BADGES[earned - 1], next = BADGES[earned];
  const close = () => { markSeen(code, earned); setShown(false); };
  return (
    <section className="tc-new" role="status" aria-label={`새 배지: ${badge.name}`}>
      <BadgeIcon badge={badge} earned size={112} animate />
      <small>NEW BADGE</small>
      <b>{badge.name}를 받았어요!</b>
      <p>도감 {badge.need}종 달성{next ? ` · ${next.name}까지 ${next.need - found}종` : ' · 도감 완성!'}</p>
      <button type="button" onClick={close}>확인</button>
    </section>
  );
}
