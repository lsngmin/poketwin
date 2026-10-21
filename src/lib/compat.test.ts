import { describe, expect, it } from 'vitest';
import { traitStrength } from '../components/TraitMeter';
import { be, compatibility, pairNotes, partyCombos, partyVibe, profileOf, subject, topic, toward, withWord } from './compat';

// 질문 순서: 에너지·호기심·마음·리듬·시작 ×2, 그다음 에너지·호기심·마음·시작·리듬
const pikachu = profileOf('333203222121201')!;
const opposite = profileOf('000000000000000')!;
const scyther = profileOf('000030000300030')!;

describe('팀 궁합', () => {
  it('같은 사람끼리는 가장 높고, 정반대면 가장 낮은 범위에 든다', () => {
    expect(compatibility(pikachu, pikachu).score).toBe(95);
    const far = compatibility(profileOf('333333333333333')!, opposite);
    expect(far.score).toBe(55);
    expect(far.label).toBe('서로 배우는 사이');
  });
  it('공식 찰떡 파트너면 보너스를 받고 99점을 넘지 않는다', () => {
    const bulbasaur = profileOf('003030030300330')!;
    expect(bulbasaur.pokemon.name).toBe('이상해씨');
    const result = compatibility(pikachu, bulbasaur);
    expect(result.partner).toBe(true);
    expect(result.score).toBeLessThanOrEqual(99);
    expect(result.score).toBeGreaterThan(compatibility(pikachu, opposite).score);
  });
  it('입력 순서와 상관없이 점수가 같다', () => {
    expect(compatibility(pikachu, opposite).score).toBe(compatibility(opposite, pikachu).score);
  });
  it('받침에 맞춰 조사를 붙인다', () => {
    expect(topic('민지')).toBe('민지는');
    expect(topic('지훈')).toBe('지훈은');
    expect(subject('꼬부기')).toBe('꼬부기가');
    expect(subject('잠만보')).toBe('잠만보가');
    expect(subject('팬텀')).toBe('팬텀이');
    expect(topic('Mia')).toBe('Mia는');
    expect(withWord('민지')).toBe('민지와');
    expect(withWord('지훈')).toBe('지훈과');
    expect(toward('피카츄')).toBe('피카츄로');
    expect(toward('잠만보')).toBe('잠만보로');
    expect(toward('팬텀')).toBe('팬텀으로');
    expect(toward('메타몽')).toBe('메타몽으로');
  });
  it('닮은 점과 다른 점을 성향 이름으로 설명한다', () => {
    expect(scyther.pokemon.name).toBe('스라크');
    const notes = pairNotes(pikachu, scyther, '민지', '지수');
    expect(notes.same).toBeNull();
    expect(notes.diff).toContain('민지는');
  });
  it('파티 분위기는 평균이 아니라 몇 명이 어느 쪽인지로 정한다', () => {
    // 아주 활발한 셋과 아주 차분한 셋: 평균은 50이지만 '갈렸다'고 말해요.
    const loud = profileOf('333333333333333')!, calm = profileOf('000000000000000')!;
    const six = [loud, loud, loud, calm, calm, calm].map((profile, i) => ({ id: `p${i}`, name: `친구${i}`, profile }));
    const vibe = partyVibe(six);
    expect(vibe.name).toBe('각자 다른 색의 파티');
    expect(vibe.dims.every(d => d.level === 'split' && d.badge === '반반으로 갈림')).toBe(true);
    expect(vibe.facts.some(fact => fact.includes('반반으로 갈렸어요'))).toBe(true);
  });
  it('모인 성향 두 개로 이름을 짓고, 중심 인물을 알려준다', () => {
    const bulbasaur = profileOf('003030030300330')!;
    const people = [
      { id: 'a', name: '민지', profile: pikachu },
      { id: 'b', name: '하은', profile: bulbasaur },
      { id: 'c', name: '지훈', profile: pikachu },
    ];
    const vibe = partyVibe(people);
    // 셋 다 '따뜻한 공감', 셋 중 둘이 '자유로운 흐름'과 '활발한 교류'
    expect(vibe.dims.find(d => d.key === 'empathy')!.level).toBe('all');
    expect(vibe.name).toMatch(/^.+ 다정한 파티$|^다정하고 .+ 파티$/);
    expect(vibe.facts[0]).toBe("3명 모두 '따뜻한 공감' 쪽이에요");
    expect(vibe.facts.some(fact => fact.endsWith('파티의 중심이에요, 모두와 고르게 닮았어요'))).toBe(true);
  });
  it('두 명이면 모두 같은 쪽이거나 반반이다', () => {
    const vibe = partyVibe([{ id: 'a', name: '민지', profile: pikachu }, { id: 'b', name: '지수', profile: opposite }]);
    expect(vibe.dims.every(d => d.level !== 'most')).toBe(true);
    expect(vibe.facts.some(fact => fact.includes('중심'))).toBe(false);
  });
  it('12문항 시절에 저장된 답변도 같은 포켓몬으로 읽는다', () => {
    expect(pikachu.pokemon.name).toBe('피카츄');
    expect(profileOf('333232222121')!.pokemon.name).toBe('피카츄');
    expect(profileOf('003000300030')!.pokemon.name).toBe('이상해씨');
  });
});

describe('눈에 띄는 콤비', () => {
  const bulbasaur = profileOf('003030030300330')!;
  const vulpix = profileOf('000000000000000')!;
  const loud = profileOf('333333333333333')!;
  it('같은 포켓몬끼리는 베스트가 아니라 쌍둥이 콤비가 된다', () => {
    const combos = partyCombos([
      { id: 'a', name: '민지', profile: pikachu },
      { id: 'b', name: '하은', profile: pikachu },
      { id: 'c', name: '도윤', profile: bulbasaur },
    ]);
    const best = combos.find(c => c.kind === 'best')!;
    expect(best.label).toBe('찰떡 콤비');
    expect(best.reason).toContain('공식 찰떡 파트너');
    const twin = combos.find(c => c.kind === 'twin')!;
    expect([twin.a.name, twin.b.name]).toEqual(['민지', '하은']);
    expect(twin.reason).toBe('둘 다 피카츄예요, 서로를 누구보다 잘 알아요');
  });
  it('정반대 콤비는 성향이 3가지 이상 다를 때만 나오고, 몇 가지가 다른지 알려준다', () => {
    const combos = partyCombos([
      { id: 'a', name: '민지', profile: loud },
      { id: 'b', name: '지수', profile: vulpix },
      { id: 'c', name: '하은', profile: pikachu },
    ]);
    const opposite = combos.find(c => c.kind === 'opposite')!;
    expect([opposite.a.name, opposite.b.name]).toEqual(['민지', '지수']);
    expect(opposite.tag).toBe('다섯 가지 다 달라요');
    expect(opposite.reason).toMatch(/^민지는 .+, 지수는 .+ 쪽이라 서로 채워줘요$/);
    // 비슷한 셋이면 정반대 콤비는 없어요.
    expect(partyCombos([{ id: 'a', name: '민지', profile: pikachu }, { id: 'b', name: '하은', profile: loud }, { id: 'c', name: '도윤', profile: pikachu }]).some(c => c.kind === 'opposite')).toBe(false);
  });
  it('받침에 맞춰 예요/이에요를 붙인다', () => {
    expect(be('피카츄')).toBe('피카츄예요');
    expect(be('식스테일')).toBe('식스테일이에요');
  });
});

describe('성향 막대 강도', () => {
  it('답변 합계 1~2점은 살짝, 3~4점은 꽤, 5~6점은 확실히', () => {
    // 점수 = (합계 + 6) / 12 × 100 반올림
    expect([50, 58, 67, 75, 83, 92, 100].map(traitStrength)).toEqual([1, 1, 1, 2, 2, 3, 3]);
    expect([42, 33, 25, 17, 8, 0].map(traitStrength)).toEqual([1, 1, 2, 2, 3, 3]);
  });
});
