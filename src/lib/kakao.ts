// 카카오톡 공유: 카카오 JavaScript SDK를 필요할 때만 불러옵니다.
// 키는 공개돼도 되는 JavaScript 키이며, 카카오 개발자 콘솔에 등록한 도메인에서만 작동해요.
interface KakaoLink { mobileWebUrl: string; webUrl: string }
interface KakaoSdk {
  init(key: string): void;
  isInitialized(): boolean;
  Share: { sendDefault(settings: Record<string, unknown>): void };
}
declare global { interface Window { Kakao?: KakaoSdk } }

const KEY = import.meta.env.VITE_KAKAO_JS_KEY as string | undefined;
const SDK_URL = 'https://t1.kakaocdn.net/kakao_js_sdk/2.8.4/kakao.min.js';
export const kakaoEnabled = Boolean(KEY);

// 카카오는 공유 그림을 자기 서버에서 받아 가서, 인터넷에서 열리는 주소여야 해요.
// 개발 서버(localhost·127.0.0.1)에서 보낼 때는 내 컴퓨터 주소라 그림이 비어 보이므로 실제 사이트의 같은 그림을 써요.
const SITE = 'https://poketwin.com';
export const shareImageUrl = (path: string) => `${/^(localhost|127\.0\.0\.1|\[::1\])$/.test(window.location.hostname) ? SITE : window.location.origin}${path}`;

let sdk: Promise<KakaoSdk> | null = null;
function loadKakao() {
  sdk ??= new Promise<KakaoSdk>((resolve, reject) => {
    const ready = () => {
      const kakao = window.Kakao;
      if (!kakao || !KEY) { sdk = null; reject(new Error('카카오 SDK를 불러오지 못했어요.')); return; }
      if (!kakao.isInitialized()) kakao.init(KEY);
      resolve(kakao);
    };
    if (window.Kakao) { ready(); return; }
    const script = document.createElement('script');
    script.src = SDK_URL; script.async = true; script.crossOrigin = 'anonymous';
    script.onload = ready;
    script.onerror = () => { sdk = null; reject(new Error('카카오 SDK를 불러오지 못했어요.')); };
    document.head.appendChild(script);
  });
  return sdk;
}

// 버튼을 누르기 전에 미리 불러두면 공유 창이 바로 떠요.
export function preloadKakao() { if (kakaoEnabled) loadKakao().catch(() => { /* 누를 때 다시 시도 */ }); }

export async function shareToKakao(input: { title: string; description: string; imageUrl: string; url: string; buttons: { title: string; url: string }[] }) {
  const kakao = await loadKakao();
  const link = (url: string): KakaoLink => ({ mobileWebUrl: url, webUrl: url });
  kakao.Share.sendDefault({
    objectType: 'feed',
    // 공유 그림은 모두 1200×600(2:1)이에요. 크기를 알려줘야 메시지에서 잘리지 않고 그대로 보여요.
    content: { title: input.title, description: input.description, imageUrl: input.imageUrl, imageWidth: 1200, imageHeight: 600, link: link(input.url) },
    buttons: input.buttons.map(button => ({ title: button.title, link: link(button.url) })),
  });
}
