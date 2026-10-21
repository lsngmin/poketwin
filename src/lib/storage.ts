import { isAnswers, upgradeLegacy } from './matching';
import type { ChoiceIndex } from '../types';
const KEY = 'pokeme:quiz:v2';
// 12문항 시절(v1)에 끝까지 푼 답변은 새 순서로 옮겨 쓰고, 풀다 만 답변은 순서가 달라 버립니다.
const LEGACY_KEY = 'pokeme:quiz:v1';
function read(key: string): ChoiceIndex[] | null {
  const value: unknown = JSON.parse(localStorage.getItem(key) || 'null');
  return isAnswers(value) ? value : null;
}
export function readAnswers(): ChoiceIndex[] {
  try {
    const current = read(KEY);
    if (current) return current;
    const legacy = read(LEGACY_KEY);
    return legacy?.length === 12 ? upgradeLegacy(legacy) : [];
  } catch { return []; }
}
export function saveAnswers(answers: ChoiceIndex[]) {
  try { localStorage.setItem(KEY, JSON.stringify(answers)); localStorage.removeItem(LEGACY_KEY); } catch { /* 저장 제한 환경에서도 테스트는 계속할 수 있습니다. */ }
}
export function clearAnswers() { try { localStorage.removeItem(KEY); localStorage.removeItem(LEGACY_KEY); } catch { /* 저장소 미지원 환경 */ } }
