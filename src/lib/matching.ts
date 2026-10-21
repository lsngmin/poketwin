import { questions, dimensions } from '../data/questions';
import { pokemon } from '../data/pokemon';
import type { ChoiceIndex, Scores } from '../types';

const weights = [-2, -1, 1, 2] as const;
export function isAnswers(value: unknown): value is ChoiceIndex[] {
  return Array.isArray(value) && value.length <= questions.length && value.every(n => Number.isInteger(n) && n >= 0 && n <= 3);
}
// 중립(0점)은 마지막 답변의 방향을 사용합니다. 같은 답변은 항상 같은 결과입니다.
function side(picks: number[]) {
  const total = picks.reduce((sum, weight) => sum + weight, 0);
  return (total !== 0 ? total : picks[picks.length - 1]) > 0 ? '1' : '0';
}
export function matchPokemon(answers: ChoiceIndex[]) {
  if (!isAnswers(answers) || answers.length !== questions.length) throw new Error(`${questions.length}개의 답변이 필요합니다.`);
  const picks = (key: string) => questions.flatMap((q, index) => q.dimension === key ? [weights[answers[index]]] : []);
  const code = dimensions.map(({ key }) => side(picks(key))).join('');
  const scores = Object.fromEntries(dimensions.map(({ key }) => {
    const list = picks(key); const max = list.length * 2;
    return [key, Math.round((list.reduce((sum, weight) => sum + weight, 0) + max) / (max * 2) * 100)];
  })) as Scores;
  return { pokemon: pokemon.find(p => p.code === code)!, scores, code };
}

// 12문항 시절의 링크와 저장된 답변도 열리도록, 그때 나왔던 포켓몬이 그대로 나오게 '시작하는 방식' 답을 살짝 채워 넣어요.
// 그때의 네 성향 코드 → 지금 그 포켓몬의 다섯 번째 자리(루카리오 자리는 괴력몬, 옛 뮤 자리는 폴리곤으로 이어져요).
const legacyAction: Record<string, boolean> = { '0010': true, '0011': true, '0101': true, '1000': true, '1010': true, '1100': true };
export function upgradeLegacy(old: ChoiceIndex[]): ChoiceIndex[] {
  const code = dimensions.slice(0, 4).map(({ key }) => side(questions.filter(q => q.id <= 12 && q.dimension === key).map(q => weights[old[q.id - 1]]))).join('');
  const fill: ChoiceIndex[] = legacyAction[code] ? [2, 1, 2] : [1, 2, 1];
  return questions.map(q => q.id <= 12 ? old[q.id - 1] : fill.shift()!);
}
export function decodeAnswers(value: string | null): ChoiceIndex[] | null {
  if (!value || !/^([0-3]{12}|[0-3]{15})$/.test(value)) return null;
  const answers = Array.from(value, Number) as ChoiceIndex[];
  return answers.length === 12 ? upgradeLegacy(answers) : answers;
}
