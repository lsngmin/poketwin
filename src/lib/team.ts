import { createClient } from '@supabase/supabase-js';
import type { TrainerAvatar } from '../data/trainers';
import { forgetTeam, isManageKey, rememberTeam, type Team } from './teamLocal';

export * from './teamLocal';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const client = url && key ? createClient(url, key) : null;

export class TeamError extends Error {
  constructor(public code: 'unavailable' | 'full' | 'failed', message: string) { super(message); }
}

function db() {
  if (!client) throw new TeamError('unavailable', '지금은 도감 기능을 쓸 수 없어요.');
  return client;
}

// 가입 없이 익명 로그인으로 "이 브라우저"를 구분합니다. 세션은 supabase-js가 브라우저에 보관해요.
async function currentUserId() {
  const supabase = db();
  const { data } = await supabase.auth.getSession();
  if (data.session) {
    // DB를 초기화했거나 계정이 지워졌으면 브라우저에 남은 로그인은 더 이상 쓸 수 없어요.
    // 서버가 '없는 계정'이라고 답할 때만 지우고 새로 로그인해요. 인터넷이 잠깐 끊긴 경우엔 그대로 써요.
    const { data: user, error } = await supabase.auth.getUser();
    if (!error && user.user) return user.user.id;
    const status = (error as { status?: number } | null)?.status;
    if (!status || ![401, 403, 404].includes(status)) return data.session.user.id;
    await supabase.auth.signOut({ scope: 'local' });
  }
  const { data: signed, error } = await supabase.auth.signInAnonymously();
  if (error || !signed.user) throw new TeamError('failed', '잠시 후 다시 시도해주세요.');
  return signed.user.id;
}

export async function getTeam(code: string): Promise<Team | null> {
  const { data, error } = await db().rpc('get_team', { team_code: code });
  if (error) throw new TeamError('failed', '도감을 불러오지 못했어요. 잠시 후 다시 시도해주세요.');
  if (data?.trainer) return data as Team;
  // 지워진 도감이면 헤더의 '내 도감' 기억도 지워서 없는 도감으로 안내하지 않게 해요.
  forgetTeam(code);
  return null;
}

export async function createTeam(input: { name: string; answers: string; avatar: TrainerAvatar }) {
  await currentUserId();
  const { data, error } = await db().from('trainers').insert(input).select('id').single();
  if (error || !data) throw new TeamError('failed', '트레이너를 만들지 못했어요. 잠시 후 다시 시도해주세요.');
  rememberTeam(data.id);
  return data.id as string;
}

export async function joinTeam(code: string, input: { name: string; answers: string }) {
  const userId = await currentUserId();
  const { error } = await db().from('members').upsert({ trainer_id: code, user_id: userId, ...input }, { onConflict: 'trainer_id,user_id' });
  if (error) {
    if (error.message.includes('team is full')) throw new TeamError('full', '이 도감은 이미 가득 찼어요.');
    throw new TeamError('failed', '도감에 등록하지 못했어요. 잠시 후 다시 시도해주세요.');
  }
}

export async function removeMember(memberId: string) {
  const { error } = await db().from('members').delete().eq('id', memberId);
  if (error) throw new TeamError('failed', '도감에서 빼지 못했어요.');
}

export async function deleteTeam(code: string) {
  const { error } = await db().from('trainers').delete().eq('id', code);
  if (error) throw new TeamError('failed', '도감을 삭제하지 못했어요.');
  forgetTeam(code);
}

// 대표 파티 6자리. 'trainer'는 트레이너 본인, 나머지는 친구 id예요. 바뀐 행이 없으면 주인이 아닌 거라 실패로 봅니다.
export async function setParty(code: string, party: string[]) {
  const { data, error } = await db().from('trainers').update({ party }).eq('id', code).select('id');
  if (error || !data?.length) throw new TeamError('failed', '파티를 저장하지 못했어요. 잠시 후 다시 시도해주세요.');
}

// 도감 관리 링크에 넣을 값. 주인만 자기 도감 행에서 읽을 수 있고, 아직 SQL을 실행하지 않았으면 null이에요.
export async function getManageKey(code: string) {
  const { data, error } = await db().from('trainers').select('manage_key').eq('id', code).maybeSingle();
  return !error && isManageKey(data?.manage_key) ? data.manage_key : null;
}

// 도감 관리 링크로 지금 브라우저를 도감 주인으로 바꿔요. 값이 틀리면 false예요.
export async function claimTeam(code: string, key: string) {
  await currentUserId();
  const { data, error } = await db().rpc('claim_team', { team_code: code, manage: key });
  if (error) throw new TeamError('failed', '도감을 가져오지 못했어요. 잠시 후 다시 시도해주세요.');
  if (data === true) rememberTeam(code);
  return data === true;
}

// 서로 등록: 이 브라우저로 등록한 친구 도감의 트레이너들을 내 도감에 넣어요. 새로 들어간 수를 돌려줘요.
// 로그인한 적 없는 브라우저에서는 새 계정을 만들지 않고 0을 돌려줘요. SQL을 아직 실행하지 않았어도 0이에요.
export async function linkBack() {
  const { data: session } = await db().auth.getSession();
  if (!session.session) return 0;
  const { data, error } = await db().rpc('link_back');
  return !error && typeof data === 'number' ? data : 0;
}
