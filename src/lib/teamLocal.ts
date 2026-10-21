import type { TrainerAvatar } from '../data/trainers';

// supabase를 불러오지 않는 가벼운 부분. 홈·퀴즈·결과 화면은 이 파일만 씁니다.
export const teamEnabled = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
// 대표 파티는 6마리, 도감에는 친구를 300명까지 받아요.
export const TEAM_SIZE = 6;
export const FRIEND_LIMIT = 300;

export interface TeamTrainer { id: string; name: string; answers: string; avatar: TrainerAvatar; party?: string[] | null; created_at: string; is_owner: boolean }
export interface TeamMember { id: string; name: string; answers: string; is_me: boolean }
export interface Team { trainer: TeamTrainer; members: TeamMember[] }
export type PartyMember = TeamMember & { is_trainer: boolean };

// 트레이너 본인은 'trainer'라는 id로 친구들과 같은 목록에 섞어 씁니다.
export const TRAINER_SLOT = 'trainer';
export function everyone({ trainer, members }: Team): PartyMember[] {
  return [
    { id: TRAINER_SLOT, name: trainer.name, answers: trainer.answers, is_me: trainer.is_owner, is_trainer: true },
    ...members.map(member => ({ ...member, is_trainer: false })),
  ];
}

// 트레이너가 고른 대표 파티. 아직 고르지 않았으면 트레이너와 먼저 들어온 친구 5명이에요.
// 도감에서 빠진 친구는 파티에서도 조용히 빠집니다.
export function teamParty(team: Team): PartyMember[] {
  const all = everyone(team);
  if (!team.trainer.party) return all.slice(0, TEAM_SIZE);
  return team.trainer.party.flatMap(id => all.filter(person => person.id === id)).slice(0, TEAM_SIZE);
}

// 도감 칸을 눌렀을 때: 그 포켓몬인 사람 중 아직 파티에 없는 첫 사람을 넣어요.
// 모두 파티에 있으면 그 포켓몬을 파티에서 빼고, 파티가 가득 찼으면 그대로 둬요.
export function toggleSpecies(party: string[], ownerIds: string[]): { party: string[]; full: boolean } {
  const next = ownerIds.find(id => !party.includes(id));
  if (!next) return { party: party.filter(id => !ownerIds.includes(id)), full: false };
  if (party.length >= TEAM_SIZE) return { party, full: true };
  return { party: [...party, next], full: false };
}

// 이 브라우저에 도감용 익명 로그인 기록이 있는지(supabase-js가 sb-…-auth-token으로 저장해요).
// 결과 화면은 supabase를 불러오지 않고 이걸로 '도감을 써본 적 있는지'만 봐요.
export function hasTeamSession() {
  try { return Object.keys(localStorage).some(key => /^sb-.+-auth-token$/.test(key)); } catch { return false; }
}

// 내가 만든 도감은 헤더에서 바로 가도록 브라우저에 기억해 둡니다.
const MY_TEAM = 'poketwin:my-team';
export function myTeamCode() { try { return localStorage.getItem(MY_TEAM); } catch { return null; } }
export function rememberTeam(code: string) { try { localStorage.setItem(MY_TEAM, code); } catch { /* 저장소 미지원 */ } }
export function forgetTeam(code: string) { try { if (localStorage.getItem(MY_TEAM) === code) localStorage.removeItem(MY_TEAM); } catch { /* 저장소 미지원 */ } }

// 초대장에서 이름을 적고 테스트로 넘어간 동안, 어느 도감에 등록할지 기억해 둡니다.
const PENDING_JOIN = 'poketwin:pending-join';
export function setPendingJoin(code: string, name: string) { try { localStorage.setItem(PENDING_JOIN, JSON.stringify({ code, name, at: Date.now() })); } catch { /* 저장소 미지원 */ } }
// 한 시간이 지난 초대는 잊어서, 나중에 혼자 푼 테스트가 엉뚱한 도감에 들어가지 않게 합니다.
export function readPendingJoin(): { code: string; name: string } | null {
  try {
    const value = JSON.parse(localStorage.getItem(PENDING_JOIN) || 'null') as { code?: unknown; name?: unknown; at?: unknown } | null;
    if (!value || typeof value.code !== 'string' || typeof value.name !== 'string' || typeof value.at !== 'number') return null;
    return Date.now() - value.at < 60 * 60 * 1000 ? { code: value.code, name: value.name } : null;
  } catch { return null; }
}
export function clearPendingJoin() { try { localStorage.removeItem(PENDING_JOIN); } catch { /* 저장소 미지원 */ } }

export const inviteUrl = (code: string) => `${window.location.origin}/t/${encodeURIComponent(code)}`;

// 도감 관리 링크: 나만 간직하는 링크. 비밀 값은 주소의 # 뒤에 둬서 서버 요청에 실리지 않아요.
// index.html의 작은 스크립트가 분석 태그보다 먼저 # 뒤 값을 sessionStorage로 옮기고 주소창에서 지워요.
export const manageUrl = (code: string, key: string) => `${window.location.origin}/t/${encodeURIComponent(code)}/manage#${key}`;
const MANAGE_KEY = 'poketwin:manage-key';
export const isManageKey = (value: unknown): value is string => typeof value === 'string' && /^[0-9a-f]{32}$/.test(value);
export function readManageKey(): string | null {
  const fromHash = window.location.hash.slice(1);
  if (isManageKey(fromHash)) return fromHash;
  try { const saved = sessionStorage.getItem(MANAGE_KEY); return isManageKey(saved) ? saved : null; } catch { return null; }
}
export function forgetManageKey() { try { sessionStorage.removeItem(MANAGE_KEY); } catch { /* 저장소 미지원 */ } }

// 도감을 만든 뒤 '관리 링크를 저장해두세요' 안내를 한 번만 보여줘요.
const MANAGE_NOTICE = 'poketwin:manage-notice';
export function manageNoticeDone(code: string) { try { return localStorage.getItem(MANAGE_NOTICE) === code; } catch { return false; } }
export function finishManageNotice(code: string) { try { localStorage.setItem(MANAGE_NOTICE, code); } catch { /* 저장소 미지원 */ } }
export const trainerNo = (code: string) => code.slice(0, 6).toUpperCase();
