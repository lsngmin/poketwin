import { useEffect, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { compatibility, profileOf, subject, withWord } from '../lib/compat';
import { clearPendingJoin, getTeam, joinTeam, linkBack, myTeamCode, readPendingJoin, TeamError, type Team } from '../lib/team';
import { LostPage } from '../components/LostPage';
import { track } from '../lib/analytics';
import './Team.css';

export function TeamJoined() {
  const { code = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const answers = params.get('a') ?? '';
  const [state, setState] = useState<{ team: Team; linked: number } | { error: string } | null>(null);

  useEffect(() => {
    const pending = readPendingJoin();
    if (!profileOf(answers) || !pending || pending.code !== code) { navigate(`/t/${code}`, { replace: true }); return; }
    let cancelled = false;
    (async () => {
      try {
        await joinTeam(code, { name: pending.name, answers });
        clearPendingJoin();
        // 서로 등록: 내 도감이 있으면 이 친구 트레이너도 내 도감에 넣어요.
        const linked = await linkBack().catch(() => 0);
        const team = await getTeam(code);
        const mine = profileOf(answers);
        if (team && mine) track('dex_join', { pokemon_id: mine.pokemon.id, friend_number: team.members.length });
        if (!cancelled) setState(team ? { team, linked } : { error: '도감을 찾지 못했어요.' });
      } catch (err) {
        if (!cancelled) setState({ error: err instanceof TeamError ? err.message : '도감에 등록하지 못했어요. 잠시 후 다시 시도해주세요.' });
      }
    })();
    return () => { cancelled = true; };
  }, [code, answers, navigate]);

  if (!state) return <section className="tm tm-loading" aria-busy="true"><p>도감에 등록하는 중…</p></section>;
  if ('error' in state) return <LostPage title="도감에 등록하지 못했어요" text={state.error} to={`/t/${code}`} label="도감으로 가기" />;

  const { trainer, members } = state.team;
  const myCode = myTeamCode();
  const index = members.findIndex(member => member.is_me);
  const me = members[index];
  const mine = profileOf(answers)!;
  const theirs = profileOf(trainer.answers)!;
  const compat = compatibility(theirs, mine);
  return (
    <section className="tm tm-joined">
      <div className="tm-burst" style={{ '--burst': mine.pokemon.color } as CSSProperties}><img src={`/pokemon/${mine.pokemon.id}.png`} alt={mine.pokemon.name} width="260" height="260" /></div>
      <h1 className="tm-title">{subject(mine.pokemon.name)}<br /><em>도감에 등록됐어요!</em></h1>
      {me && <p className="tm-sub">{me.name}님은 {trainer.name} 트레이너 도감의 {index + 1}번째 친구예요</p>}
      {state.linked > 0 && myCode && (
        <Link className="tm-linked" to={`/t/${myCode}`}>
          {state.linked === 1 ? `서로 등록돼서 ${trainer.name} 트레이너도 내 도감에 들어왔어요` : `서로 등록돼서 친구 ${state.linked}명이 내 도감에 들어왔어요`}
          <ArrowRight size={16} strokeWidth={2.6} aria-hidden="true" />
        </Link>
      )}
      {me && (
        <Link className="tm-card tm-combo" to={`/t/${code}/vs/trainer/${me.id}`}>
          <span className="tm-pair" aria-hidden="true"><img src={`/pokemon/${theirs.pokemon.id}.png`} alt="" /><img src={`/pokemon/${mine.pokemon.id}.png`} alt="" /></span>
          <span className="tm-combo-text"><small>{withWord(trainer.name)}의 궁합</small><strong>{compat.label}</strong></span>
          <b>{compat.score}</b>
        </Link>
      )}
      <div className="tm-actions">
        <Link className="poster-button tm-wide" to={`/t/${code}`}>{trainer.name} 트레이너 도감 보러 가기 <ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" /></Link>
        <Link className="tm-ghost" to={`/result?a=${answers}`}>내 결과 자세히 보기</Link>
        {/* 도감은 한 사람에 하나라서, 이미 있으면 새로 만드는 대신 내 도감으로 보내요. */}
        {myCode
          ? <Link className="tm-text-link" to={`/t/${myCode}`}>내 도감 보러 가기</Link>
          : <Link className="tm-text-link" to={`/trainer/new?a=${answers}`}>나도 도감 만들기</Link>}
      </div>
    </section>
  );
}
