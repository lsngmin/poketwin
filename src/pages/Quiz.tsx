import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, RotateCcw } from 'lucide-react';
import { questions } from '../data/questions';
import { readAnswers, saveAnswers, clearAnswers } from '../lib/storage';
import { readPendingJoin } from '../lib/teamLocal';
import { matchPokemon } from '../lib/matching';
import { track } from '../lib/analytics';
import type { ChoiceIndex } from '../types';
import './Quiz.css';
export function Quiz() {
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<ChoiceIndex[]>(readAnswers);
  const [index, setIndex] = useState(() => Math.min(readAnswers().length, questions.length - 1));
  const [resetPrompt, setResetPrompt] = useState(false);
  const title = useRef<HTMLHeadingElement>(null);
  const question = questions[index];
  const selected = answers[index];
  useEffect(() => { title.current?.focus({ preventScroll: true }); }, [index]);
  const choose = (choice: ChoiceIndex) => {
    // 처음 고른 답이 곧 테스트 시작이에요. 홈 미리보기에서 시작했다면 거기서 이미 보냈어요.
    if (answers.length === 0) track('quiz_start', { via_invite: Boolean(readPendingJoin()) });
    const next = [...answers]; next[index] = choice; setAnswers(next); saveAnswers(next);
  };
  const next = () => {
    if (selected === undefined) return;
    track('quiz_progress', { question_number: index + 1 });
    if (index === questions.length - 1) {
      const pending = readPendingJoin();
      const { pokemon, code } = matchPokemon(answers);
      track('quiz_complete', { pokemon_id: pokemon.id, pokemon_name: pokemon.name, personality_code: code, via_invite: Boolean(pending) });
      navigate(pending ? `/t/${pending.code}/joined?a=${answers.join('')}` : `/result?a=${answers.join('')}`);
    }
    else setIndex(index + 1);
  };
  return (
    <section className="qz">
      <div className="qz-toolbar">
        <Link to="/"><ArrowLeft size={18} strokeWidth={2.6} /> 홈으로</Link>
        <button onClick={() => setResetPrompt(!resetPrompt)}><RotateCcw size={16} strokeWidth={2.6} /> 처음부터</button>
      </div>
      {resetPrompt && (
        <div className="qz-reset" role="alert">
          <p>지금까지 선택한 답변을 지우고 다시 시작할까요?</p>
          <div>
            <button className="qz-reset-yes" onClick={() => { clearAnswers(); setAnswers([]); setIndex(0); setResetPrompt(false); }}>다시 시작</button>
            <button onClick={() => setResetPrompt(false)}>계속 풀기</button>
          </div>
        </div>
      )}
      <div className="qz-progress-head">
        <strong>{String(index + 1).padStart(2, '0')}<span> / {questions.length}</span></strong>
        <span>나를 알아가는 작은 모험</span>
      </div>
      <div className="qz-progress" role="progressbar" aria-valuenow={index + 1} aria-valuemin={0} aria-valuemax={questions.length} aria-label="현재 질문">
        <i style={{ width: `${(index + 1) / questions.length * 100}%` }} />
      </div>
      <div className="qz-card" key={question.id}>
        <p className="qz-scene"><b>Q{index + 1}</b>{question.scene}</p>
        <h1 ref={title} tabIndex={-1}>{question.title}</h1>
        <p className="qz-hint">가장 나다운 모습에 가까운 답을 골라주세요.</p>
        <fieldset className="qz-options">
          <legend className="sr-only">{question.title}</legend>
          {question.options.map((option, i) => (
            <label key={option} className={`qz-option ${selected === i ? 'selected' : ''}`}>
              <input type="radio" name={`question-${question.id}`} value={i} checked={selected === i} onChange={() => choose(i as ChoiceIndex)} />
              <span className="qz-letter" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
              <span className="qz-text">{option}</span>
              {selected === i && <Check className="qz-check" size={20} strokeWidth={3} aria-hidden="true" />}
            </label>
          ))}
        </fieldset>
      </div>
      <div className="qz-actions">
        <button className="qz-prev" disabled={index === 0} onClick={() => setIndex(index - 1)}><ArrowLeft size={18} strokeWidth={2.6} /> 이전 질문</button>
        <button className="qz-next" disabled={selected === undefined} onClick={next}>{index === questions.length - 1 ? '내 포켓트윈 만나기' : '다음 질문'}<ArrowRight size={20} strokeWidth={2.6} /></button>
      </div>
      <p className="qz-footnote">정답은 없어요. 지금의 나를 가볍게 떠올려보세요.</p>
    </section>
  );
}
