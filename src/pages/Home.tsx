import { ArrowRight, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getPokemon, pokemon } from '../data/pokemon';
import { PokemonCard } from '../components/PokemonCard';
import { HeroCarousel } from '../components/HeroCarousel';
import { QuizPreview } from '../components/QuizPreview';
import { FinalCta } from '../components/FinalCta';
import { questions } from '../data/questions';
import { readAnswers, clearAnswers } from '../lib/storage';
import { myTeamCode } from '../lib/teamLocal';
export function Home() {
  const saved = readAnswers();
  const continuing = saved.length > 0 && saved.length < questions.length;
  // 이 브라우저에서 트레이너가 된 적이 있으면 트레이너 카드로 바로 가고, 테스트는 아래 링크로 다시 할 수 있어요.
  const team = myTeamCode();
  const quizLabel = continuing ? `이어서 찾기 · ${saved.length}/${questions.length}` : team ? '테스트 다시 하기' : '나의 포켓트윈 찾기';
  const startQuiz = () => { if (!continuing) clearAnswers(); };
  return <><section className="hero"><div className="hero-copy"><p className="hero-kicker">성격으로 찾는 포켓트윈</p><h1><span>나랑<img src="/pokemon/132.png" alt="" width="260" height="260" /></span> <span><img src="/pokemon/39.png" alt="" width="260" height="260" /><em>닮은</em></span> <span>포켓몬은</span> <span>누구<b>?</b><img src="/pokemon/54.png" alt="" width="260" height="260" /></span></h1><p className="hero-description">느긋한 잠만보부터 호기심 많은 이브이까지,<br />{questions.length}개의 질문으로 만나는 또 다른 나</p></div>{team
    ? <><Link to={`/t/${encodeURIComponent(team)}`} className="button hero-button hero-button-squish">내 트레이너 카드 보기<ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" /></Link><Link to="/quiz" className="hero-sub-link" onClick={startQuiz}>{quizLabel}</Link></>
    : <Link to="/quiz" className="button hero-button hero-button-squish" onClick={startQuiz}>{quizLabel}<ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" /></Link>}<HeroCarousel /></section><section id="discover" className="section discover-section"><div className="section-heading"><div><span className="eyebrow">포켓몬 미리보기</span><h2>이런 친구들이 기다리고 있어요.</h2><p>서로 다른 매력, 모두 사랑스러운 {pokemon.length}마리의 포켓몬.</p></div><Link className="text-link" to="/collection">도감 모두 보기 <ArrowUpRight size={17} /></Link></div><div className="preview-grid">{[1, 4, 7, 94].map(id => <PokemonCard key={id} pokemon={getPokemon(id)!} poster />)}</div></section><QuizPreview /><FinalCta /></>;
}
