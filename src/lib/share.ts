import { dimensions } from '../data/questions';
import type { Pokemon } from '../types';

const W = 1080, H = 1350;
const INK = '#254b3d', LIME = '#e6efac', PAPER = '#f7f9ee', MUTED = '#5e6759';
const font = (spec: string) => `${spec} 'Pretendard Variable', Pretendard, sans-serif`;

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// 사이트의 스티커 칩: 흰 바탕, 잉크 테두리. 오른쪽 끝 x를 돌려줍니다.
function chip(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, fill = '#fff', color = INK) {
  ctx.font = font(`800 ${size}px`);
  const w = ctx.measureText(text).width + size * 1.3, h = size * 1.9;
  roundRect(ctx, x, y, w, h, h / 2);
  ctx.fillStyle = fill; ctx.fill();
  ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
  ctx.fillStyle = color; ctx.textBaseline = 'middle'; ctx.fillText(text, x + size * 0.65, y + h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
  return x + w;
}

// 피카츄 같은 밝은 색 위에서도 읽히게 포켓몬 대표색을 어둡게 섞습니다.
function darken(hex: string, amount = 0.75) {
  const n = parseInt(hex.slice(1), 16);
  return `rgb(${Math.round((n >> 16) * amount)}, ${Math.round(((n >> 8) & 255) * amount)}, ${Math.round((n & 255) * amount)})`;
}

function splitTitle(ctx: CanvasRenderingContext2D, title: string, maxWidth: number) {
  if (ctx.measureText(title).width <= maxWidth) return [title];
  const words = title.split(' ');
  let best = [title], bestDiff = Infinity;
  for (let i = 1; i < words.length; i++) {
    const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
    const diff = Math.abs(ctx.measureText(a).width - ctx.measureText(b).width);
    if (diff < bestDiff) { best = [a, b]; bestDiff = diff; }
  }
  return best;
}

// 결과 공유 이미지(1080×1350): 홈 포스터와 같은 잉크 테두리·딱딱한 그림자·굵은 이름·스티커 칩
export async function drawResultCard(pokemon: Pokemon) {
  const canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이 브라우저는 이미지 저장을 지원하지 않아요.');
  const sides = dimensions.map(({ low, high }, i) => pokemon.code[i] === '1' ? high : low);
  const host = window.location.host;
  const texts: [string, string][] = [
    [font('700 38px'), '나와 닮은 포켓몬은'], [font('900 156px'), pokemon.name], [font('800 38px'), pokemon.english],
    [font('900 50px'), pokemon.title], [font('800 34px'), pokemon.tags.map(t => `#${t}`).join('')],
    [font('800 30px'), `No. ${String(pokemon.id).padStart(3, '0')} · ${pokemon.type}${sides.join('')}`],
    [font('700 28px'), '나의 성향'], [font('800 32px'), '나와 닮은 포켓몬 찾기'], [font('700 28px'), host],
  ];
  // 다이내믹 서브셋 폰트라 캔버스에 쓸 글자의 조각을 먼저 받아둡니다.
  await Promise.all(texts.map(([spec, text]) => document.fonts.load(spec, text)));
  const logo = new Image(); logo.src = '/brand/poketwin-logo-light.png';
  const art = new Image(); art.src = `/pokemon/${pokemon.id}.png`;
  await Promise.all([logo.decode(), art.decode()]);

  // 바탕과 로고, 번호 칩
  ctx.fillStyle = PAPER; ctx.fillRect(0, 0, W, H);
  ctx.drawImage(logo, 72, 196, 2004, 310, 64, 60, 300, 46);
  ctx.font = font('800 30px');
  const noText = `No. ${String(pokemon.id).padStart(3, '0')} · ${pokemon.type}`;
  chip(ctx, noText, W - 64 - (ctx.measureText(noText).width + 39), 50, 30);

  // 포켓몬 색 카드: 딱딱한 그림자 → 바탕 → 그림 → 글자 → 테두리
  const card = { x: 56, y: 140, w: 968, h: 910, r: 52 };
  roundRect(ctx, card.x, card.y + 18, card.w, card.h, card.r); ctx.fillStyle = INK; ctx.fill();
  roundRect(ctx, card.x, card.y, card.w, card.h, card.r); ctx.fillStyle = pokemon.color; ctx.fill();
  ctx.save();
  roundRect(ctx, card.x, card.y, card.w, card.h, card.r); ctx.clip();
  ctx.fillStyle = '#ffffff5c'; ctx.beginPath(); ctx.arc(760, 560, 300, 0, Math.PI * 2); ctx.fill();
  ctx.drawImage(art, 430, 230, 620, 620);
  ctx.restore();

  ctx.fillStyle = INK;
  ctx.font = font('700 38px'); ctx.fillText('나와 닮은 포켓몬은', 104, 232);
  ctx.font = font('900 156px');
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '-7px';
  ctx.fillText(pokemon.name, 96, 392);
  if ('letterSpacing' in ctx) (ctx as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = '0px';
  ctx.fillStyle = darken(pokemon.accent); ctx.font = font('800 38px'); ctx.fillText(pokemon.english, 106, 450);

  ctx.fillStyle = INK; ctx.font = font('900 50px');
  const titleLines = splitTitle(ctx, pokemon.title, 860);
  titleLines.forEach((line, i) => ctx.fillText(line, 104, 932 - (titleLines.length - 1 - i) * 62));
  let x = 104;
  for (const tag of pokemon.tags) x = chip(ctx, `#${tag}`, x, 962, 34) + 14;

  roundRect(ctx, card.x, card.y, card.w, card.h, card.r); ctx.lineWidth = 6; ctx.strokeStyle = INK; ctx.stroke();

  // 나의 성향 칩 5개: 한 줄에 들어가도록 글자 크기를 맞춥니다.
  ctx.fillStyle = MUTED; ctx.font = font('700 28px'); ctx.fillText('나의 성향', 64, 1120);
  let size = 30, widths: number[] = [];
  for (; size > 20; size--) {
    ctx.font = font(`800 ${size}px`);
    widths = sides.map(s => ctx.measureText(s).width + size * 1.3);
    if (widths.reduce((a, b) => a + b, 0) + 12 * (sides.length - 1) <= W - 128) break;
  }
  const gap = Math.min(18, (W - 128 - widths.reduce((a, b) => a + b, 0)) / (sides.length - 1));
  x = 64;
  sides.forEach((side, i) => { chip(ctx, side, x, 1140 + (30 - size), size, i % 2 ? '#fff' : LIME); x += widths[i] + gap; });

  // 아래 띠: 사이트 주소
  ctx.fillStyle = INK; ctx.fillRect(0, H - 104, W, 104);
  ctx.fillStyle = LIME; ctx.font = font('800 32px'); ctx.fillText('나와 닮은 포켓몬 찾기', 64, H - 41);
  ctx.fillStyle = '#ffffffcc'; ctx.font = font('700 28px'); ctx.textAlign = 'right'; ctx.fillText(host, W - 64, H - 42); ctx.textAlign = 'left';
  return canvas;
}

export async function resultCardFile(pokemon: Pokemon) {
  const canvas = await drawResultCard(pokemon);
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('이미지를 만들지 못했어요. 다시 시도해주세요.');
  return new File([blob], `poketwin-${pokemon.english.toLowerCase()}.png`, { type: 'image/png' });
}

export function downloadFile(file: File) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = file.name;
  anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 10000);
}

export async function saveResultImage(pokemon: Pokemon) {
  downloadFile(await resultCardFile(pokemon));
}

// 인스타 스토리 공유: scripts/share-images.py로 만든 9:16 그림(public/share/story-*.png)을 휴대폰 공유 창으로 넘기고,
// 같은 순간 링크를 복사해 둬서 스토리의 링크 스티커에 바로 붙일 수 있게 해요.
// 공유 창은 누른 순간에만 열 수 있어서 그림은 화면이 열릴 때 미리 받아 두고(prefetchStory), 복사는 기다리지 않아요.
export async function prefetchStory(path: string, name: string) {
  const response = await fetch(path);
  if (!response.ok) throw new Error('스토리 그림을 받지 못했어요.');
  return new File([await response.blob()], name, { type: 'image/png' });
}
export async function shareStory(file: File, link: string): Promise<'shared' | 'saved' | 'cancelled'> {
  navigator.clipboard?.writeText(link).catch(() => { /* 복사가 막혀도 그림 공유는 계속해요 */ });
  if (navigator.canShare?.({ files: [file] })) {
    try { await navigator.share({ files: [file] }); return 'shared'; }
    catch (error) { if (error instanceof DOMException && error.name === 'AbortError') return 'cancelled'; }
  }
  downloadFile(file);
  return 'saved';
}
