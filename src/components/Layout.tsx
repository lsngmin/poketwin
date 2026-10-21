import { Header } from './Header';
import './Footer.css';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { visit } from '../lib/backTrail';
import { trackPage } from '../lib/analytics';
export function Layout() {
  const location = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const pageTitle = location.pathname === '/' ? '나와 닮은 포켓몬 찾기' : location.pathname === '/quiz' ? '포켓몬 테스트' : location.pathname === '/collection' ? '포켓몬 도감' : location.pathname.startsWith('/result') ? '나의 포켓몬 결과' : location.pathname === '/about' ? '테스트 소개' : location.pathname === '/privacy' ? '개인정보처리방침' : location.pathname === '/trainer/new' ? '트레이너 등록' : location.pathname.startsWith('/t/') ? '트레이너 도감' : location.pathname.startsWith('/pokemon/') ? '포켓몬 성향' : '페이지를 찾을 수 없어요';
    document.title = `${pageTitle} · 포켓트윈`;
    trackPage(location.pathname, document.title);
    document.querySelector<HTMLElement>('#main')?.focus({ preventScroll: true });
  }, [location.pathname]);
  // 포켓몬 화면의 돌아가기 버튼이 출발점을 알 수 있게, 지금 화면을 기억해 둬요.
  useEffect(() => { visit({ pathname: location.pathname, search: location.search, key: location.key }); }, [location.pathname, location.search, location.key]);
  return <><a className="skip-link" href="#main">본문 바로가기</a><Header /><main id="main" tabIndex={-1}><Outlet /></main><footer className="site-footer"><div className="footer-top"><Link to="/" className="footer-brand" aria-label="포켓트윈 홈"><img src="/brand/poketwin-logo-light.png" alt="POKETWIN" width="2172" height="724" /></Link><div><Link to="/collection">포켓몬 도감</Link><Link to="/about">서비스 소개</Link><Link to="/privacy">개인정보처리방침</Link></div></div><div className="footer-bottom"><p>Pokémon and Pokémon character names are trademarks of Nintendo.</p><p>Pokémon content and materials are trademarks and copyrights of Nintendo or its licensors. All rights reserved.</p></div></footer></>;
}
