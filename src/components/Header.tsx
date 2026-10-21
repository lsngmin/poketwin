import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { myTeamCode } from '../lib/teamLocal';
import './Header.css';

export function Header() {
  const [open, setOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  useEffect(() => { setOpen(false); }, [pathname]);
  useEffect(() => {
    if (!open) return;
    const closeOutside = (event: PointerEvent) => {
      if (!header.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setOpen(false); toggle.current?.focus(); }
    };
    document.addEventListener('pointerdown', closeOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [open]);

  return <header className="app-header" ref={header}>
    <div className="header-inner">
      <Link to="/" className="header-brand" aria-label="포켓트윈 홈"><img className="header-logo" src="/brand/poketwin-logo-light.png" alt="POKETWIN" width="2172" height="724" /></Link>
      <div className="header-actions">
        <button ref={toggle} className="header-icon" aria-label={open ? '메뉴 닫기' : '메뉴 열기'} aria-expanded={open} aria-controls="header-navigation" onClick={() => setOpen(!open)}>{open ? <X size={22} /> : <Menu size={22} />}</button>
      </div>
      <nav id="header-navigation" className="header-menu" aria-label="사이트 메뉴" hidden={!open} onClick={() => setOpen(false)}>
        {myTeamCode() && <NavLink to={`/t/${myTeamCode()}`}>내 도감</NavLink>}
        <NavLink to="/collection">포켓몬 도감</NavLink>
        <NavLink to="/about">테스트 소개</NavLink>
        <NavLink to="/privacy">개인정보 안내</NavLink>
      </nav>
    </div>
  </header>;
}
