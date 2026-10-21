import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { dimensions } from '../data/questions';
import { compatibility, gapLabel, pairNotes, profileOf, topic, withWord } from '../lib/compat';
import { getTeam, teamEnabled, TeamError, type Team } from '../lib/team';
import { LostPage } from '../components/LostPage';
import './Team.css';

const summary: Record<string, string> = {
  '찰떡궁합': '말하지 않아도 마음이 통하는 사이예요.',
  '환상의 콤비': '함께하면 서로의 좋은 점이 더 잘 보여요.',
  '좋은 친구': '편하게 기대고, 가끔은 서로에게 배우는 사이예요.',
  '편안한 사이': '다른 점이 있어서 오히려 대화가 즐거운 사이예요.',
  '서로 배우는 사이': '서로에게 없는 걸 가진, 배울 점 많은 사이예요.',
};

export function TeamVs() {
  const { code = '', a = '', b = '' } = useParams();
  const [team, setTeam] = useState<Team | null | undefined>(undefined);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!teamEnabled) return;
    getTeam(code).then(setTeam).catch(err => setError(err instanceof TeamError ? err.message : '도감을 불러오지 못했어요.'));
  }, [code]);
  if (!teamEnabled) return <LostPage title="지금은 궁합을 볼 수 없어요" text="잠시 후 다시 시도해주세요." to="/" label="홈으로 돌아가기" />;
  if (error) return <LostPage title="궁합을 불러오지 못했어요" text={error} to={`/t/${code}`} label="도감으로 가기" />;
  if (team === undefined) return <section className="tm tm-loading" aria-busy="true"><p>궁합을 계산하는 중…</p></section>;
  const find = (id: string) => {
    if (!team) return null;
    const person = id === 'trainer' ? team.trainer : team.members.find(member => member.id === id);
    const profile = person && profileOf(person.answers);
    return person && profile ? { name: person.name, profile } : null;
  };
  const left = find(a), right = find(b);
  if (!left || !right) return <LostPage title="궁합을 찾지 못했어요" text="친구가 도감에서 나갔거나 링크가 바뀌었을 수 있어요." to={`/t/${code}`} label="도감으로 가기" />;

  const result = compatibility(left.profile, right.profile);
  const notes = pairNotes(left.profile, right.profile, left.name, right.name);
  const colors = { '--left': left.profile.pokemon.color, '--right': right.profile.pokemon.color } as CSSProperties;
  return (
    <section className="tm tm-vs" style={colors}>
      <Link className="tm-back" to={`/t/${code}`}><ArrowLeft size={18} strokeWidth={2.6} /> 도감으로 돌아가기</Link>
      <h1 className="sr-only">{withWord(left.name)} {right.name}의 궁합</h1>
      <div className="tm-card tm-versus">
        {[left, right].map(person => (
          <figure key={person.name + person.profile.pokemon.id}>
            <img src={`/pokemon/${person.profile.pokemon.id}.png`} alt="" width="260" height="260" />
            <figcaption>{person.name}<span>{person.profile.pokemon.name}</span></figcaption>
          </figure>
        ))}
        <span className="tm-x" aria-hidden="true">×</span>
      </div>
      <div className="tm-score-big">
        <b>{result.score}</b><span>{result.label}</span>
        {result.partner && <span className="tm-partner-chip">공식 찰떡 파트너</span>}
      </div>
      <p className="tm-summary">{result.partner ? `${topic(left.profile.pokemon.name)} ${right.profile.pokemon.name}의 공식 찰떡 파트너예요. ` : ''}{summary[result.label]}</p>
      <div className="tm-legend"><span><i className="left" />{left.name}</span><span><i className="right" />{right.name}</span></div>
      <div className="tm-card tm-compare">
        {dimensions.map(({ key, name, low, high }, i) => (
          <div key={key}>
            <div className="tm-cmp-head">{name}<span>{gapLabel(result.gaps[i])}</span></div>
            <div className="tm-track"><span className="dot right" style={{ left: `${right.profile.scores[key]}%` }} /><span className="dot left" style={{ left: `${left.profile.scores[key]}%` }} /></div>
            <div className="tm-ends"><span>{low}</span><span>{high}</span></div>
          </div>
        ))}
      </div>
      {notes.same && <p className="tm-note-row same"><b>닮은 점</b>{notes.same}</p>}
      {notes.diff && <p className="tm-note-row diff"><b>다른 점</b>{notes.diff}</p>}
    </section>
  );
}
