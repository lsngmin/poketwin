import { describe, expect, it } from 'vitest';
import { cleanPath } from './analytics';

describe('분석용 주소 정리', () => {
  it('도감 코드는 빼고 화면 종류만 남긴다', () => {
    expect(cleanPath('/t/78d1169a29')).toBe('/t/dex');
    expect(cleanPath('/t/78d1169a29/joined')).toBe('/t/dex/joined');
    expect(cleanPath('/t/78d1169a29/vs/trainer/0f3a')).toBe('/t/dex/vs');
    expect(cleanPath('/t/78d1169a29/manage')).toBe('/t/dex/manage');
    expect(cleanPath('/t/78d1169a29/anything')).toBe('/t/dex/other');
  });
  it('다른 화면은 경로만 남는다(답변값 같은 쿼리는 애초에 넘기지 않아요)', () => {
    expect(cleanPath('/result')).toBe('/result');
    expect(cleanPath('/pokemon/25')).toBe('/pokemon/25');
    expect(cleanPath('/')).toBe('/');
  });
});
