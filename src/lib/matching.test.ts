import { describe, expect, it } from 'vitest';
import { matchPokemon, decodeAnswers, isAnswers, upgradeLegacy } from './matching';
import { dimensions, questions } from '../data/questions';
import { pokemon } from '../data/pokemon';
import type { ChoiceIndex } from '../types';
describe('포켓몬 매칭', () => {
  it('32개 성향 조합이 각각 고유한 포켓몬에 도달한다', () => {
    const ids = new Set<number>();
    for (let mask = 0; mask < 32; mask++) {
      const code = mask.toString(2).padStart(5, '0');
      const answers = questions.map(q => code[dimensions.findIndex(d => d.key === q.dimension)] === '1' ? 3 : 0) as ChoiceIndex[];
      const result = matchPokemon(answers);
      expect(result.pokemon.code).toBe(code); ids.add(result.pokemon.id);
    }
    expect(ids.size).toBe(32);
  });
  it('성향마다 질문이 3개씩 있고 같은 성향이 연달아 나오지 않는다', () => {
    expect(questions).toHaveLength(15);
    dimensions.forEach(({ key }) => expect(questions.filter(q => q.dimension === key)).toHaveLength(3));
    questions.slice(1).forEach((q, i) => expect(q.dimension).not.toBe(questions[i].dimension));
  });
  it('최소/최대 선택의 성향 점수는 0/100이다', () => {
    expect(Object.values(matchPokemon(Array(15).fill(0)).scores)).toEqual([0, 0, 0, 0, 0]);
    expect(Object.values(matchPokemon(Array(15).fill(3)).scores)).toEqual([100, 100, 100, 100, 100]);
  });
  it('중립 점수는 해당 축의 마지막 선택으로 판정한다', () => {
    // 성향마다 '살짝 아니다(1)'를 두 번 고른 뒤 마지막에 '아주 그렇다(3)'를 고르면 합계가 0이 돼요.
    const seen: Record<string, number> = {};
    const answers = questions.map(q => (seen[q.dimension] = (seen[q.dimension] ?? 0) + 1) === 3 ? 3 : 1) as ChoiceIndex[];
    expect(matchPokemon(answers).code).toBe('11111');
    expect(Object.values(matchPokemon(answers).scores)).toEqual([50, 50, 50, 50, 50]);
  });
  it('미완성/잘못된 답변은 결과를 만들지 않는다', () => {
    expect(() => matchPokemon([0, 1])).toThrow();
    expect(() => matchPokemon(Array(12).fill(0))).toThrow();
    expect(() => matchPokemon(Array(15).fill(4))).toThrow();
    expect(isAnswers(['1'])).toBe(false);
    expect(isAnswers(null)).toBe(false);
    expect(isAnswers(Array(16).fill(0))).toBe(false);
  });
  it('공유 URL의 입력을 검증하고 같은 결과를 복원한다', () => {
    const answers: ChoiceIndex[] = [0, 1, 2, 3, 2, 1, 3, 0, 1, 2, 0, 3, 1, 2, 3];
    expect(matchPokemon(decodeAnswers(answers.join(''))!).pokemon.id).toBe(matchPokemon(answers).pokemon.id);
    expect(decodeAnswers('012')).toBeNull(); expect(decodeAnswers('444444444444444')).toBeNull();
    expect(decodeAnswers('abcdefghijklmno')).toBeNull(); expect(decodeAnswers('0123012301230')).toBeNull();
  });
  it('12문항 시절 링크는 그때 나온 포켓몬을 그대로 보여준다', () => {
    // 옛 코드 → 그때의 포켓몬. 루카리오(1000)는 괴력몬, 옛 뮤(0101)는 폴리곤으로 이어져요.
    const before: Record<string, number> = { '0000': 37, '0001': 132, '0010': 1, '0011': 143, '0100': 54, '0101': 137, '0110': 35, '0111': 133, '1000': 68, '1001': 7, '1010': 39, '1011': 131, '1100': 4, '1101': 94, '1110': 149, '1111': 25 };
    Object.entries(before).forEach(([code, id]) => {
      // 옛 순서는 에너지·호기심·마음·리듬이 네 번씩 돌아가며 나왔어요.
      const old = Array.from({ length: 12 }, (_, i) => code[i % 4] === '1' ? 3 : 0) as ChoiceIndex[];
      expect(matchPokemon(decodeAnswers(old.join(''))!).pokemon.id).toBe(id);
      expect(upgradeLegacy(old)).toHaveLength(15);
    });
    // 섞인 답변도 옛 판정 규칙(동점이면 마지막 답) 그대로 따라가요.
    expect(matchPokemon(decodeAnswers('111111113333')!).pokemon.id).toBe(25);
  });
  it('모든 포켓몬은 유효한 파트너와 고유한 ID/코드를 가진다', () => {
    expect(pokemon).toHaveLength(32);
    expect(new Set(pokemon.map(p => p.id)).size).toBe(32);
    expect(new Set(pokemon.map(p => p.code)).size).toBe(32);
    pokemon.forEach(p => {
      const partner = pokemon.find(candidate => candidate.id === p.partner);
      const clash = pokemon.find(candidate => candidate.id === p.clashPartner);
      expect(partner).toBeDefined();
      expect(clash).toBeDefined();
      expect(new Set([p.id, p.partner, p.clashPartner]).size).toBe(3);
      expect(partner!.partner).toBe(p.id);
      expect(clash!.clashPartner).toBe(p.id);
      // 짝 설명에는 실제 짝의 이름이 들어가야 해요.
      expect(p.partnerReason).toContain(partner!.name);
      expect(p.clashReason).toContain(clash!.name);
      expect(p.moments).toHaveLength(5);
      expect(p.description.split('\n\n')).toHaveLength(2);
    });
  });
});
