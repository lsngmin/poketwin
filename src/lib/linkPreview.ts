import { getPokemon } from '../data/pokemon';
import { decodeAnswers, matchPokemon } from './matching';

// 링크를 X·카카오톡·디스코드에 붙여넣었을 때 보이는 미리보기(제목·설명·그림).
// 사이트는 한 장짜리 앱이라 미리보기 수집기가 화면을 그리지 못해서, Cloudflare Worker(worker/index.ts)가 주소마다 이 값을 페이지에 넣어줘요.
// 그림은 scripts/share-images.py로 만든 public/share 그림을 그대로 써요.
export const SITE = 'https://poketwin.com';
export interface Preview { title: string; description: string; image: string; path: string }

export function previewFor(pathname: string, search: string): Preview | null {
  if (pathname === '/result') {
    const answers = decodeAnswers(new URLSearchParams(search).get('a'));
    if (!answers) return null;
    const { pokemon } = matchPokemon(answers);
    return { title: `나와 닮은 포켓몬은 ${pokemon.name}!`, description: `${pokemon.title} · 너는 어떤 포켓몬일까?`, image: `/share/pokemon-${pokemon.id}.png`, path: `${pathname}${search}` };
  }
  const id = pathname.match(/^\/pokemon\/(\d+)\/?$/)?.[1];
  if (id) {
    const pokemon = getPokemon(Number(id));
    if (!pokemon) return null;
    return { title: `${pokemon.name} · ${pokemon.title}`, description: `${pokemon.tags.map(tag => `#${tag}`).join(' ')} · 나와 닮은 포켓몬도 찾아보세요`, image: `/share/pokemon-${pokemon.id}.png`, path: pathname };
  }
  // 도감 초대 링크만 초대장으로 보여줘요. 관리 링크·궁합 화면 같은 다른 도감 주소는 기본 미리보기 그대로예요.
  if (/^\/t\/[^/]+\/?$/.test(pathname)) {
    return { title: '포켓트윈 도감 초대장', description: '친구가 도감에 초대했어요! 나와 닮은 포켓몬을 찾아 도감을 함께 채워요', image: '/share/invite.png', path: pathname };
  }
  return null;
}
