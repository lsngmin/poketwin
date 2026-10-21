import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { clearPendingJoin, readPendingJoin, rememberInvite, setPendingJoin } from './teamLocal';

// 브라우저 저장소 대신 쓰는 간단한 메모리 저장소
beforeEach(() => {
  const store = new Map<string, string>();
  vi.stubGlobal('localStorage', {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => { store.set(key, value); },
    removeItem: (key: string) => { store.delete(key); },
  });
});
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });

describe('초대받은 도감 기억하기', () => {
  it('초대장을 열기만 해도 이름 없이 그 도감을 기억해요', () => {
    rememberInvite('abc');
    expect(readPendingJoin()).toEqual({ code: 'abc', name: '' });
  });

  it('같은 도감에 이미 이름을 남겼으면 지우지 않아요', () => {
    setPendingJoin('abc', '민지');
    rememberInvite('abc');
    expect(readPendingJoin()).toEqual({ code: 'abc', name: '민지' });
  });

  it('다른 도감 초대장을 열면 그 도감으로 바뀌어요', () => {
    setPendingJoin('abc', '민지');
    rememberInvite('xyz');
    expect(readPendingJoin()).toEqual({ code: 'xyz', name: '' });
  });

  it('하루가 지나면 잊어요', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-21T10:00:00Z'));
    rememberInvite('abc');
    vi.setSystemTime(new Date('2026-10-22T09:59:00Z'));
    expect(readPendingJoin()?.code).toBe('abc');
    vi.setSystemTime(new Date('2026-10-22T10:00:01Z'));
    expect(readPendingJoin()).toBeNull();
    clearPendingJoin();
  });
});
