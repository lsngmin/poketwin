import { describe, expect, it } from 'vitest';
import { backLabel, tripFor, visit } from './backTrail';

const place = (pathname: string, key: string, search = '') => ({ pathname, search, key });

describe('포켓몬 화면에서 돌아가기', () => {
  // 실제 화면처럼, 포켓몬 화면이 먼저 그려지며 출발점을 정하고(tripFor) 그다음 레이아웃이 기억해요(visit).
  it('트레이너 도감에서 들어와 파트너를 두 번 넘어가도 트레이너 도감으로 한 번에 돌아가요', () => {
    visit(place('/t/abc', 'team'));
    expect(tripFor('p1')).toEqual({ origin: place('/t/abc', 'team'), depth: 1 });
    visit(place('/pokemon/25', 'p1'));
    expect(tripFor('p2')?.depth).toBe(2);
    visit(place('/pokemon/1', 'p2'));
    expect(tripFor('p3')).toEqual({ origin: place('/t/abc', 'team'), depth: 3 });
  });

  it('파트너를 타고 넘어가면 넘어온 만큼 되돌아가요', () => {
    visit(place('/collection', 'list', '?type=물'));
    expect(tripFor('a')?.depth).toBe(1);
    visit(place('/pokemon/7', 'a'));
    expect(tripFor('b')).toEqual({ origin: place('/collection', 'list', '?type=물'), depth: 2 });
    visit(place('/pokemon/8', 'b'));
    expect(tripFor('c')?.depth).toBe(3);
    // 뒤로 가기로 다시 온 화면은 처음 정해 둔 출발점을 그대로 써요.
    expect(tripFor('a')?.depth).toBe(1);
  });

  it('공유 링크로 바로 들어온 포켓몬 화면과, 거기서 넘어간 화면은 출발점이 없어요', () => {
    visit(place('/pokemon/150', 'direct'));
    expect(tripFor('next')).toBeNull();
  });

  it('출발점마다 이름을 붙여요', () => {
    expect(backLabel('/collection')).toBe('포켓몬 도감');
    expect(backLabel('/t/abc')).toBe('트레이너 도감');
    expect(backLabel('/result')).toBe('내 결과');
    expect(backLabel('/')).toBe('홈');
  });
});
