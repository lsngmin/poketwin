import { dimensions } from '../data/questions';
import type { Dimension } from '../types';
import { decodeAnswers, matchPokemon } from './matching';

export type Profile = ReturnType<typeof matchPokemon>;

export function profileOf(answers: string): Profile | null {
  const decoded = decodeAnswers(answers);
  return decoded ? matchPokemon(decoded) : null;
}

export function compatLabel(score: number) {
  if (score >= 90) return '찰떡궁합';
  if (score >= 80) return '환상의 콤비';
  if (score >= 70) return '좋은 친구';
  if (score >= 60) return '편안한 사이';
  return '서로 배우는 사이';
}

export function gapLabel(gap: number) {
  if (gap <= 12) return '쏙 닮았어요';
  if (gap <= 30) return '비슷해요';
  if (gap <= 55) return '조금 달라요';
  return '정반대';
}

// 다섯 가지 성향 점수가 가까울수록 높고, 공식 찰떡 파트너면 보너스를 줍니다. 55~99점 사이로 나와요.
export function compatibility(a: Profile, b: Profile) {
  const gaps = dimensions.map(({ key }) => Math.abs(a.scores[key] - b.scores[key]));
  const similarity = 100 - gaps.reduce((sum, gap) => sum + gap, 0) / gaps.length;
  const partner = a.pokemon.partner === b.pokemon.id || b.pokemon.partner === a.pokemon.id;
  const score = Math.min(99, Math.round(55 + similarity * 0.4 + (partner ? 12 : 0)));
  return { score, label: compatLabel(score), partner, gaps };
}

// 받침에 맞춰 조사를 붙입니다. 한글이 아닌 이름은 받침이 없는 것으로 봅니다.
function finalConsonant(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code <= 11171 ? code % 28 : 0;
}
export const topic = (word: string) => word + (finalConsonant(word) ? '은' : '는');
export const subject = (word: string) => word + (finalConsonant(word) ? '이' : '가');
export const withWord = (word: string) => word + (finalConsonant(word) ? '과' : '와');
// 'ㄹ' 받침(8)은 '로'를 씁니다.
export const toward = (word: string) => { const final = finalConsonant(word); return word + (final && final !== 8 ? '으로' : '로'); };
export const be = (word: string) => word + (finalConsonant(word) ? '이에요' : '예요');

const side = (profile: Profile, index: number) => {
  const { low, high } = dimensions[index];
  return profile.code[index] === '1' ? high : low;
};

export function pairNotes(a: Profile, b: Profile, nameA: string, nameB: string) {
  const { gaps } = compatibility(a, b);
  const order = gaps.map((gap, index) => ({ gap, index }));
  const same = order.filter(({ index }) => a.code[index] === b.code[index]).sort((x, y) => x.gap - y.gap)[0];
  const diff = order.filter(({ index }) => a.code[index] !== b.code[index]).sort((x, y) => y.gap - x.gap)[0];
  return {
    same: same ? `둘 다 '${side(a, same.index)}' 쪽이에요` : null,
    diff: diff ? `${topic(nameA)} ${side(a, diff.index)}, ${topic(nameB)} ${side(b, diff.index)} 쪽이라 서로 채워줘요` : null,
  };
}

// 파티 분위기: 평균 하나로 뭉뚱그리지 않고, 성향마다 몇 명이 어느 쪽인지 세서
// 한쪽으로 모인 성향으로 이름을 짓고, 갈린 성향·찰떡 파트너·중심 인물을 사실로 덧붙여요.
// 한 줄 설명은 이름과 같은 말을 되풀이하지 않게 써요.
const vibeText: Record<string, [string, string]> = {
  energy: ['혼자만의 시간도 소중히 여기는 파티예요', '함께라면 뭐든 더 신나는 파티예요'],
  curiosity: ['익숙한 즐거움을 오래 아끼는 파티예요', '새로운 곳이라면 일단 떠나는 파티예요'],
  empathy: ['문제가 생기면 바로 답을 찾아내는 파티예요', '서로의 마음을 먼저 살피는 파티예요'],
  flexibility: ['약속을 꼭 지키고 미리 준비하는 파티예요', '그때그때 흐름을 타는 파티예요'],
  action: ['한 번 더 생각하고 움직이는 파티예요', '고민보다 몸이 먼저 나가는 파티예요'],
};
// 파티 이름에 쓰는 말: [이어 쓸 때, 끝낼 때]
const vibeWords: Record<string, [[string, string], [string, string]]> = {
  energy: [['차분하고', '차분한'], ['활발하고', '활발한']],
  curiosity: [['한결같고', '한결같은'], ['모험을 즐기고', '모험을 즐기는']],
  empathy: [['똑 부러지고', '똑 부러지는'], ['다정하고', '다정한']],
  flexibility: [['계획적이고', '계획적인'], ['자유롭고', '자유로운']],
  action: [['신중하고', '신중한'], ['일단 해보고', '일단 해보는']],
};
// 반반으로 갈린 성향에 붙이는 한마디
const splitTip: Record<string, string> = {
  energy: '모일지 쉴지 정할 때 서로 배려가 필요해요',
  curiosity: '새로운 곳과 익숙한 곳 사이에서 고르는 재미가 있어요',
  empathy: '고민이 생기면 해결해줄 친구와 들어줄 친구가 다 있어요',
  flexibility: '약속을 정할 때 계획파와 즉흥파 의견이 나뉠 수 있어요',
  action: '먼저 해보는 친구와 따져보는 친구가 서로를 채워줘요',
};
const MIXED = '성향이 고루 섞여 있어서 서로 다른 눈으로 채워주는 파티예요';

export type VibeLevel = 'all' | 'most' | 'split';
export interface VibeMember { id: string; name: string; profile: Profile }
export interface VibeDimension {
  key: Dimension; name: string; low: string; high: string;
  highCount: number; lowCount: number; level: VibeLevel; side: 0 | 1; badge: string;
  members: { id: string; name: string; score: number; pokemonId: number; color: string; high: boolean }[];
}

// 모두 같은 쪽이면 all, 3분의 2 이상이 같은 쪽이면 most, 나머지는 갈렸다고 봐요.
function levelOf(same: number, total: number): VibeLevel {
  if (same === total) return 'all';
  return total >= 3 && same / total >= 2 / 3 ? 'most' : 'split';
}

export function partyVibe(people: VibeMember[]) {
  const total = people.length;
  const dims: VibeDimension[] = dimensions.map(({ key, name, low, high }, index) => {
    const highCount = people.filter(p => p.profile.code[index] === '1').length;
    const lowCount = total - highCount;
    const side: 0 | 1 = highCount > lowCount ? 1 : highCount < lowCount ? 0 : (people.reduce((sum, p) => sum + p.profile.scores[key], 0) / total >= 50 ? 1 : 0);
    const same = Math.max(highCount, lowCount);
    const level = levelOf(same, total);
    // 칸 안에 쪽별 인원이 이미 보여서, 머리에는 모였는지 갈렸는지만 짧게 적어요.
    const badge = level === 'all' ? '모두 같은 쪽' : level === 'most' ? '한쪽으로 모임' : highCount === lowCount ? '반반으로 갈림' : '골고루 갈림';
    // 어느 쪽인지는 포켓몬 코드로 정해요. 점수가 딱 50이어도 포켓몬과 같은 쪽에 들어가요.
    const members = people.map(p => ({ id: p.id, name: p.name, score: p.profile.scores[key], pokemonId: p.profile.pokemon.id, color: p.profile.pokemon.color, high: p.profile.code[index] === '1' }));
    return { key, name, low, high, highCount, lowCount, level, side, badge, members };
  });
  const tilt = (d: VibeDimension) => Math.abs(d.members.reduce((sum, m) => sum + m.score, 0) / total - 50);
  const agreement = (d: VibeDimension) => Math.max(d.highCount, d.lowCount) / total;
  const gathered = dims.filter(d => d.level !== 'split').sort((a, b) => agreement(b) - agreement(a) || tilt(b) - tilt(a));

  // 이름: 모인 성향 두 개(성향 순서대로 이어 붙임) → 하나 → 없으면 섞임형
  let name = '각자 다른 색의 파티';
  if (gathered.length >= 2) {
    const [a, b] = gathered.slice(0, 2).sort((x, y) => dims.indexOf(x) - dims.indexOf(y));
    name = `${vibeWords[a.key][a.side][0]} ${vibeWords[b.key][b.side][1]} 파티`;
  } else if (gathered.length === 1) {
    name = `${vibeWords[gathered[0].key][gathered[0].side][1]} 파티`;
  }
  const description = gathered.length ? vibeText[gathered[0].key][gathered[0].side] : MIXED;

  const facts: string[] = [];
  const top = gathered[0];
  if (top) {
    const label = top.side ? top.high : top.low;
    facts.push(top.level === 'all' ? `${total}명 모두 '${label}' 쪽이에요` : `${total}명 중 ${Math.max(top.highCount, top.lowCount)}명이 '${label}' 쪽이에요`);
  }
  const split = dims.filter(d => d.level === 'split').sort((a, b) => Math.abs(a.highCount - a.lowCount) - Math.abs(b.highCount - b.lowCount))[0];
  if (split) {
    const [more, less] = [Math.max(split.highCount, split.lowCount), Math.min(split.highCount, split.lowCount)];
    facts.push(`${topic(split.name)} ${more === less ? '반반으로' : `${more} 대 ${less}로`} 갈렸어요, ${splitTip[split.key]}`);
  }
  // 중심: 파티 평균과 가장 가까운 사람
  if (total >= 3) {
    const average = dims.map(d => d.members.reduce((sum, m) => sum + m.score, 0) / total);
    const distance = (p: VibeMember) => dims.reduce((sum, d, i) => sum + Math.abs(p.profile.scores[d.key] - average[i]), 0);
    const center = people.reduce((best, p) => distance(p) < distance(best) ? p : best, people[0]);
    facts.push(`${subject(center.name)} 파티의 중심이에요, 모두와 고르게 닮았어요`);
  }
  return { name, description, facts: facts.slice(0, 4), dims };
}

// 눈에 띄는 콤비: 점수 하나로 줄 세우지 않고, 콤비마다 고른 이유를 함께 보여줘요.
// - 베스트(찰떡) 콤비: 같은 포켓몬끼리는 빼고 궁합 점수가 가장 높은 쌍. 공식 찰떡 파트너면 '찰떡 콤비'
// - 쌍둥이 콤비: 같은 포켓몬끼리
// - 정반대(티격태격) 콤비: 공식 티격태격 파트너가 먼저, 없으면 성향이 3가지 이상 다른 쌍 중 가장 많이 다른 쌍
export type ComboKind = 'best' | 'twin' | 'opposite';
export interface Combo { kind: ComboKind; label: string; a: VibeMember; b: VibeMember; tag: string; reason: string }
const countWord = ['', '한', '두', '세', '네', '다섯'];

export function partyCombos(people: VibeMember[]): Combo[] {
  const pairs = people.flatMap((a, i) => people.slice(i + 1).map(b => {
    const result = compatibility(a.profile, b.profile);
    const differ = dimensions.filter((_, k) => a.profile.code[k] !== b.profile.code[k]).length;
    return { a, b, ...result, differ, twin: a.profile.pokemon.id === b.profile.pokemon.id, clash: a.profile.pokemon.clashPartner === b.profile.pokemon.id };
  }));
  const combos: Combo[] = [];
  const best = pairs.filter(p => !p.twin).sort((x, y) => y.score - x.score || Number(y.partner) - Number(x.partner))[0];
  if (best) {
    const notes = pairNotes(best.a.profile, best.b.profile, best.a.name, best.b.name);
    combos.push({ kind: 'best', label: best.partner ? '찰떡 콤비' : '베스트 콤비', a: best.a, b: best.b, tag: `${best.score}`, reason: best.partner ? '공식 찰떡 파트너예요, 서로에게 없는 걸 채워줘요' : notes.same ?? '말하지 않아도 잘 통하는 사이예요' });
  }
  const twin = pairs.find(p => p.twin);
  if (twin) combos.push({ kind: 'twin', label: '쌍둥이 콤비', a: twin.a, b: twin.b, tag: '같은 포켓몬', reason: `둘 다 ${be(twin.a.profile.pokemon.name)}, 서로를 누구보다 잘 알아요` });
  const opposite = pairs
    .filter(p => p !== best && (p.clash || p.differ >= 3))
    .sort((x, y) => Number(y.clash) - Number(x.clash) || y.differ - x.differ || x.score - y.score)[0];
  if (opposite) {
    const notes = pairNotes(opposite.a.profile, opposite.b.profile, opposite.a.name, opposite.b.name);
    combos.push({
      kind: 'opposite',
      label: opposite.clash ? '티격태격 콤비' : '정반대 콤비',
      a: opposite.a, b: opposite.b,
      tag: opposite.differ === 5 ? '다섯 가지 다 달라요' : `${countWord[opposite.differ]} 가지 달라요`,
      reason: opposite.clash ? '공식 티격태격 파트너예요, 다른 만큼 배울 게 많아요' : notes.diff ?? '서로 다른 점이 많은 사이예요',
    });
  }
  return combos;
}
