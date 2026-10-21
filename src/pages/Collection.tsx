import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigationType, useSearchParams } from 'react-router-dom';
import { Search, X } from 'lucide-react';
import { pokemon } from '../data/pokemon';
import { PokemonCard } from '../components/PokemonCard';
import { collectionPlace } from '../lib/collectionPlace';
import './Collection.css';
const filters = ['전체', '노말', '불꽃', '물', '풀', '전기', '에스퍼', '땅', '비행', '격투', '페어리', '고스트', '드래곤', '벌레', '바위'];
export function Collection() {
  // 검색어와 타입은 주소에 담아서, 포켓몬을 보고 돌아와도 그대로 남아요.
  const [params, setParams] = useSearchParams();
  const query = params.get('q') ?? '';
  const type = params.get('type');
  const filter = type && filters.includes(type) ? type : '전체';
  const update = (next: { q?: string; type?: string }) => {
    const merged = { q: query, type: filter, ...next };
    const search = new URLSearchParams();
    if (merged.q) search.set('q', merged.q);
    if (merged.type !== '전체') search.set('type', merged.type);
    setParams(search, { replace: true });
  };
  const setQuery = (q: string) => update({ q });
  const setFilter = (type: string) => update({ type });
  // 보던 자리를 기억해 두고, 포켓몬 화면에서 돌아오면 그 자리로 스크롤해요.
  // 레이아웃이 페이지를 맨 위로 올린 다음에 움직이도록 한 프레임 뒤에, 부드러운 스크롤 없이 바로 옮겨요.
  const { search, state } = useLocation();
  const returning = useNavigationType() === 'POP' || (state as { restore?: boolean } | null)?.restore === true;
  // 되돌릴 자리는 처음 그릴 때 한 번만 정해요. 같은 검색으로 돌아왔을 때만 그 자리로 가요.
  const [restoreY] = useState(() => returning && collectionPlace.search === search ? collectionPlace.y : null);
  useEffect(() => { collectionPlace.search = search; }, [search]);
  useEffect(() => {
    const frame = restoreY === null ? 0 : requestAnimationFrame(() => window.scrollTo({ top: restoreY, behavior: 'instant' }));
    const remember = () => { collectionPlace.y = window.scrollY; };
    window.addEventListener('scroll', remember, { passive: true });
    return () => { cancelAnimationFrame(frame); window.removeEventListener('scroll', remember); };
  }, [restoreY]);
  const results = useMemo(() => pokemon.filter(p => (filter === '전체' || p.type.includes(filter)) && `${p.name} ${p.english} ${p.tags.join(' ')} ${p.id}`.toLowerCase().includes(query.trim().toLowerCase())), [query, filter]);
  return (
    <section className="section collection-page">
      <div className="cl-intro">
        <h1>모두 다르게,<br /><em>모두 특별하게</em></h1>
        <p>나와 닮은 친구도, 나와 다른 친구도.<br />포켓몬 속에 담긴 서른두 가지 매력을 만나보세요.</p>
      </div>
      <div className="cl-search">
        <Search size={20} strokeWidth={2.4} aria-hidden="true" />
        <input aria-label="포켓몬 검색" placeholder="이름이나 성격으로 찾아보세요" value={query} onChange={event => setQuery(event.target.value)} />
        {query && <button aria-label="검색 지우기" onClick={() => setQuery('')}><X size={18} strokeWidth={2.6} /></button>}
      </div>
      <div className="cl-filters" aria-label="타입 필터">
        {filters.map(type => <button key={type} aria-pressed={filter === type} onClick={() => setFilter(type)} className={filter === type ? 'active' : ''}>{type}</button>)}
      </div>
      <div className="cl-count" aria-live="polite">총 <strong>{results.length}</strong>마리의 친구</div>
      {results.length
        ? <div className="cl-grid">{results.map(p => <PokemonCard key={p.id} pokemon={p} poster />)}</div>
        : <div className="cl-empty">
            <Search size={32} strokeWidth={2.4} aria-hidden="true" />
            <h2>아직 만나지 못한 친구인가 봐요</h2>
            <p>다른 이름이나 타입으로 다시 찾아보세요.</p>
            <button className="cl-reset" onClick={() => { setQuery(''); setFilter('전체'); }}>모든 포켓몬 보기</button>
          </div>}
    </section>
  );
}
