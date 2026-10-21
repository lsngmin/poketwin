import { useEffect, useRef, useState } from 'react';
import type { CSSProperties, KeyboardEvent, PointerEvent } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { getPokemon } from '../data/pokemon';
import { PokemonCard } from './PokemonCard';
import './HeroCarousel.css';

const cards = [143, 25, 133, 7, 4].map(id => getPokemon(id)!);
const wrap = (index: number) => (index + cards.length) % cards.length;

export function HeroCarousel() {
  const [active, setActive] = useState(1);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [interacting, setInteracting] = useState(false);
  const [drag, setDrag] = useState(0);
  const [visible, setVisible] = useState(false);
  const [pageVisible, setPageVisible] = useState(!document.hidden);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [announcement, setAnnouncement] = useState('');
  const viewport = useRef<HTMLDivElement>(null);
  const previousButton = useRef<HTMLButtonElement>(null);
  const nextButton = useRef<HTMLButtonElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number; dragging: boolean } | null>(null);
  const suppressClick = useRef(false);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updateMotion = () => setReducedMotion(query.matches);
    const updateVisibility = () => setPageVisible(!document.hidden);
    const observer = new IntersectionObserver(
      ([entry]) => setVisible(entry.isIntersecting),
      { threshold: 0.2 },
    );
    if (viewport.current) observer.observe(viewport.current);
    query.addEventListener('change', updateMotion);
    document.addEventListener('visibilitychange', updateVisibility);
    return () => {
      observer.disconnect();
      query.removeEventListener('change', updateMotion);
      document.removeEventListener('visibilitychange', updateVisibility);
    };
  }, []);

  useEffect(() => {
    if (!visible || !pageVisible || reducedMotion || hovered || focused || interacting) return;
    const timer = window.setTimeout(() => setActive(index => wrap(index + 1)), 3200);
    return () => window.clearTimeout(timer);
  }, [active, visible, pageVisible, reducedMotion, hovered, focused, interacting]);

  function select(index: number) {
    const next = wrap(index);
    setActive(next);
    setAnnouncement(`${cards.length}마리 중 ${next + 1}번째, ${cards[next].name}`);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const forward = event.key === 'ArrowRight';
    (forward ? nextButton : previousButton).current?.focus({ preventScroll: true });
    select(active + (forward ? 1 : -1));
  }

  function startDrag(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || !event.isPrimary) return;
    suppressClick.current = false;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, dragging: false };
    setInteracting(true);
  }

  function moveDrag(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    const dy = event.clientY - current.y;
    if (!current.dragging && Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 10) {
      gesture.current = null;
      setInteracting(false);
      return;
    }
    if (!current.dragging && Math.abs(dx) > 8) {
      current.dragging = true;
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    if (current.dragging) setDrag(Math.max(-100, Math.min(100, dx * 0.5)));
  }

  function finishDrag(event: PointerEvent<HTMLDivElement>) {
    const current = gesture.current;
    if (!current || current.id !== event.pointerId) return;
    const dx = event.clientX - current.x;
    gesture.current = null;
    setInteracting(false);
    setDrag(0);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (current.dragging) {
      suppressClick.current = true;
      if (Math.abs(dx) > 35 && event.type !== 'pointercancel') select(active + (dx < 0 ? 1 : -1));
    }
  }

  return (
    <div
      className="hero-carousel"
      role="region"
      aria-roledescription="캐러셀"
      aria-label="포켓몬 미리보기"
      onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }}
      onPointerLeave={event => {
        if (event.pointerType === 'mouse') setHovered(false);
        if (gesture.current && !gesture.current.dragging) {
          gesture.current = null;
          setInteracting(false);
        }
      }}
      onFocusCapture={() => setFocused(true)}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false);
      }}
      onKeyDown={handleKeyDown}
      onClickCapture={event => {
        if (suppressClick.current) {
          event.preventDefault();
          event.stopPropagation();
          suppressClick.current = false;
        }
      }}
    >
      <div
        ref={viewport}
        className={`hero-carousel-viewport${drag ? ' is-dragging' : ''}`}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        onDragStart={event => event.preventDefault()}
      >
        <div className="hero-carousel-track">
          {cards.map((pokemon, index) => {
            let offset = wrap(index - active);
            if (offset > Math.floor(cards.length / 2)) offset -= cards.length;
            const hidden = Math.abs(offset) > 1;
            return (
              <div
                key={pokemon.id}
                className="hero-carousel-card"
                data-active={offset === 0}
                aria-hidden={hidden}
                inert={hidden}
                style={{
                  '--slide-offset': offset,
                  '--slide-scale': offset === 0 ? 1 : 0.9,
                  '--slide-rotate': `${offset * 5}deg`,
                  '--slide-drag': `${drag}px`,
                  opacity: hidden ? 0 : 1,
                  zIndex: 3 - Math.abs(offset),
                } as CSSProperties}
              >
                <PokemonCard
                  pokemon={pokemon}
                  featured
                  poster
                  ariaLabel={offset === 0 ? `${pokemon.name} 성향 보기` : `${pokemon.name} 카드 선택`}
                  onClick={event => {
                    if (offset !== 0) {
                      event.preventDefault();
                      select(index);
                    }
                  }}
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="hero-carousel-controls">
        <button ref={previousButton} type="button" aria-label="이전 포켓몬" onClick={() => select(active - 1)}>
          <ArrowLeft size={19} strokeWidth={2.6} aria-hidden="true" />
        </button>
        <span className="hero-carousel-position" aria-hidden="true">
          <strong>{String(active + 1).padStart(2, '0')}</strong> / {String(cards.length).padStart(2, '0')}
        </span>
        <button ref={nextButton} type="button" aria-label="다음 포켓몬" onClick={() => select(active + 1)}>
          <ArrowRight size={19} strokeWidth={2.6} aria-hidden="true" />
        </button>
      </div>
      <span className="sr-only" aria-live="polite" aria-atomic="true">{announcement}</span>
    </div>
  );
}
