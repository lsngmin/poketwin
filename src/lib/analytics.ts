// GA4로 보내는 분석 이벤트를 한곳에 모아요. 포트폴리오에 쓸 지표(퍼널·공유·초대 전환)를 위한 최소한의 기록이에요.
// 원칙: 이름, 답변값, 도감 코드, 관리 링크 값, 익명 로그인 ID는 절대 보내지 않아요.
// 페이지 주소도 답변값(?a=)과 도감 코드를 빼고 화면 종류만 남겨서 보내요. 이벤트 목록은 docs/analytics.md에 있어요.
declare global { interface Window { gtag?: (...args: unknown[]) => void } }

export type ShareMethod = 'kakao' | 'x' | 'instagram' | 'native' | 'copy_link' | 'save_image' | 'qr';
export type ShareContent = 'result' | 'dex_invite' | 'manage_link';

type Events = {
  quiz_start: { via_invite: boolean };
  quiz_progress: { question_number: number };
  quiz_complete: { pokemon_id: number; pokemon_name: string; personality_code: string; via_invite: boolean };
  quiz_retake: { has_dex: boolean };
  share: { method: ShareMethod; content_type: ShareContent; item_id?: string };
  dex_create: { avatar: string; joined_before: boolean };
  dex_invite_view: Record<string, never>;
  dex_join: { pokemon_id: number; friend_number: number };
  dex_entry_open: { pokemon_id: number; owners: number };
  party_edit: { party_size: number };
  manage_claim: { success: boolean };
};

let location = '';

export function track<Name extends keyof Events>(name: Name, params: Events[Name]) {
  try { window.gtag?.('event', name, { ...params, ...(location && { page_location: location }) }); }
  catch { /* 분석이 막혀도 서비스는 그대로 동작해요 */ }
}

// 도감 주소(/t/코드/...)는 코드 대신 화면 종류만 남겨요. 결과·트레이너 등록 주소의 ?a= 답변값은 통째로 빠져요.
export function cleanPath(pathname: string) {
  if (!pathname.startsWith('/t/')) return pathname;
  const sub = pathname.split('/')[3];
  return sub ? `/t/dex/${['joined', 'vs', 'manage'].includes(sub) ? sub : 'other'}` : '/t/dex';
}

// 화면이 바뀔 때마다 레이아웃이 불러요. index.html에서 자동 page_view를 껐기 때문에 여기서 한 번씩 보내요.
export function trackPage(pathname: string, title: string) {
  const path = cleanPath(pathname);
  location = `${window.location.origin}${path}`;
  try {
    // 이후 자동으로 붙는 이벤트(스크롤 등)도 정리된 주소를 쓰게 해요.
    window.gtag?.('set', { page_location: location, page_title: title });
    window.gtag?.('event', 'page_view', { page_location: location, page_title: title, page_path: path });
  } catch { /* 분석이 막혀도 서비스는 그대로 동작해요 */ }
}
