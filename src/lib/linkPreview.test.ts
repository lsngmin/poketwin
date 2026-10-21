import { describe, expect, it } from 'vitest';
import { isPrivatePath, previewFor } from './linkPreview';

describe('링크 미리보기', () => {
  it('결과 링크는 답변으로 계산한 포켓몬 그림과 제목을 쓴다', () => {
    const preview = previewFor('/result', '?a=333203222121201')!;
    expect(preview.title).toBe('나와 닮은 포켓몬은 피카츄!');
    expect(preview.image).toBe('/share/pokemon-25.png');
    expect(preview.path).toBe('/result?a=333203222121201');
  });
  it('예전 12자리 결과 링크도 같은 포켓몬으로 보여준다', () => {
    expect(previewFor('/result', '?a=333232222121')!.image).toBe('/share/pokemon-25.png');
  });
  it('포켓몬 화면과 도감 초대는 각자 그림을 쓴다', () => {
    expect(previewFor('/pokemon/94', '')!.title).toContain('팬텀');
    expect(previewFor('/t/78d1169a29', '')!.image).toBe('/share/invite.png');
  });
  it('잘못된 주소나 관리 링크·궁합 화면은 기본 미리보기를 그대로 둔다', () => {
    expect(previewFor('/result', '?a=999')).toBeNull();
    expect(previewFor('/pokemon/999', '')).toBeNull();
    expect(previewFor('/t/78d1169a29/manage', '')).toBeNull();
    expect(previewFor('/t/78d1169a29/vs/trainer/x', '')).toBeNull();
    expect(previewFor('/', '')).toBeNull();
  });
  it('결과·도감 주소만 검색에서 숨긴다', () => {
    expect(isPrivatePath('/result')).toBe(true);
    expect(isPrivatePath('/t/78d1169a29')).toBe(true);
    expect(isPrivatePath('/t/78d1169a29/manage')).toBe(true);
    expect(isPrivatePath('/pokemon/25')).toBe(false);
    expect(isPrivatePath('/')).toBe(false);
    expect(isPrivatePath('/collection')).toBe(false);
  });
});
