import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { CSSProperties } from 'react';
import { questions, dimensions } from '../data/questions';
import { getPokemon } from '../data/pokemon';
import { decodeAnswers, matchPokemon } from '../lib/matching';
import { readAnswers, saveAnswers } from '../lib/storage';
import type { ChoiceIndex } from '../types';
import { TraitMeter } from './TraitMeter';
import { track } from '../lib/analytics';
import './QuizPreview.css';

// 피카츄가 나오는 실제 답변 조합이라 막대 값도 실제 계산 결과와 같습니다.
const sample = matchPokemon(decodeAnswers('333203222121201')!);
const partner = getPokemon(sample.pokemon.partner)!;
const first = questions[0];

function start(choice: ChoiceIndex) {
  // 풀던 테스트가 있으면 1번 답만 바꾸고 이어서 풀게 합니다.
  const saved = readAnswers();
  const resuming = saved.length > 0 && saved.length < questions.length;
  if (!resuming) track('quiz_start', { via_invite: false });
  saveAnswers(resuming ? [choice, ...saved.slice(1)] : [choice]);
}

export function QuizPreview() {
  return (
    <section className="section quiz-preview" aria-labelledby="quiz-preview-title">
      <span className="eyebrow">이렇게 진행돼요</span>
      <h2 id="quiz-preview-title">이런 질문에 답하면,<br />이런 포켓몬을 만나요</h2>
      <div className="qp-body">
        <div className="qp-question">
          <p className="qp-scene"><b>Q1</b>{first.scene}</p>
          <h3>{first.title}</h3>
          <div className="qp-options">
            {first.options.map((option, i) => (
              <Link key={option} to="/quiz" onClick={() => start(i as ChoiceIndex)}>
                <span aria-hidden="true">{String.fromCharCode(65 + i)}</span>{option}
              </Link>
            ))}
          </div>
          <p className="qp-hint">하나 고르면 바로 2번 질문으로 이어져요</p>
        </div>
        <div className="qp-connector" aria-hidden="true"><ArrowDown size={20} strokeWidth={2.6} />질문 {questions.length}개를 마치면</div>
        <Link
          to={`/pokemon/${sample.pokemon.id}`}
          className="qp-result"
          style={{ '--qp-color': sample.pokemon.color } as CSSProperties}
          aria-label={`예시 결과, ${sample.pokemon.name} 성향 자세히 보기`}
        >
          <div className="qp-result-head">
            <div>
              <span className="qp-badge">예시 결과</span>
              <strong>{sample.pokemon.name}</strong>
              <p>{sample.pokemon.title}</p>
            </div>
            <img src={`/pokemon/${sample.pokemon.id}.png`} alt="" width="260" height="260" loading="lazy" />
          </div>
          <div className="qp-traits">
            {dimensions.map(({ key, name, low, high }, i) => (
              <TraitMeter key={key} name={name} low={low} high={high} score={sample.scores[key]} highSide={sample.code[i] === '1'} compact />
            ))}
          </div>
          <div className="qp-partner">
            <img src={`/pokemon/${partner.id}.png`} alt="" width="260" height="260" loading="lazy" />
            <span>찰떡 파트너 <b>{partner.name}</b></span>
            <ArrowUpRight className="qp-more" size={20} strokeWidth={2.6} />
          </div>
        </Link>
      </div>
      <p className="qp-footnote">정답은 없어요. 지금의 나에게 가까운 답을 골라요.</p>
    </section>
  );
}
