import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { questions } from '../data/questions';
import { clearAnswers, readAnswers } from '../lib/storage';
import './FinalCta.css';

export function FinalCta() {
  const saved = readAnswers();
  const continuing = saved.length > 0 && saved.length < questions.length;
  return (
    <section className="final-cta" aria-labelledby="final-cta-title">
      <img className="final-cta-mew" src="/pokemon/151.png" alt="" width="260" height="260" loading="lazy" decoding="async" draggable="false" />
      <p className="final-cta-kicker">구경은 여기까지</p>
      <h2 id="final-cta-title">이제<br /><em>내 차례!</em></h2>
      <p className="final-cta-text">{questions.length}개의 질문으로<br />나와 꼭 닮은 포켓몬을 만나요</p>
      <Link to="/quiz" className="final-cta-button" onClick={() => { if (!continuing) clearAnswers(); }}>
        {continuing ? `이어서 찾기 · ${saved.length}/${questions.length}` : '나의 포켓트윈 찾기'}
        <ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" />
      </Link>
    </section>
  );
}
