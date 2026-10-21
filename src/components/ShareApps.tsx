import type { ReactNode } from 'react';
import { InstagramIcon, KakaoIcon, XIcon } from './BrandIcons';
import './ShareApps.css';

// 카카오톡 · X · 인스타그램 공유 버튼 한 줄. 결과 페이지와 트레이너 팀 페이지에서 함께 써요.
// 뒤에 버튼(children)이 더 붙으면 다섯 칸에 맞게 작게 그리고 이름을 줄여요.
export function ShareApps({ onKakao, onX, onInstagram, children }: { onKakao: () => void; onX: () => void; onInstagram: () => void; children?: ReactNode }) {
  return (
    <div className={`share-apps${children ? ' more' : ''}`}>
      <button type="button" className="share-app kakao" onClick={onKakao}><span className="share-app-icon"><KakaoIcon /></span>카카오톡</button>
      <button type="button" className="share-app x" onClick={onX}><span className="share-app-icon"><XIcon /></span>X</button>
      <button type="button" className="share-app insta" onClick={onInstagram} aria-label={children ? '인스타그램' : undefined}><span className="share-app-icon"><InstagramIcon /></span>{children ? '인스타' : '인스타그램'}</button>
      {children}
    </div>
  );
}

// X 글쓰기 창을 열어요. 글은 줄바꿈을 그대로 쓰고, 링크와 해시태그는 X가 글 뒤에 붙여요.
export function openXPost(text: string, url: string, hashtags = ['포켓트윈', '포켓몬테스트']) {
  window.open(`https://x.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${encodeURIComponent(hashtags.join(','))}`, '_blank', 'noopener,noreferrer');
}
