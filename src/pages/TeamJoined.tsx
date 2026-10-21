import { useCallback, useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { compatibility, profileOf, subject, withWord } from '../lib/compat';
import { clearPendingJoin, getTeam, joinTeam, linkBack, myTeamCode, readPendingJoin, setPendingJoin, TeamError, type Team } from '../lib/team';
import { LostPage } from '../components/LostPage';
import { track } from '../lib/analytics';
import './Team.css';

type State = { team: Team; linked: number } | { ask: Team } | { error: string } | null;

export function TeamJoined() {
  const { code = '' } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const answers = params.get('a') ?? '';
  const [state, setState] = useState<State>(null);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const register = useCallback(async (joinName: string): Promise<State> => {
    try {
      await joinTeam(code, { name: joinName, answers });
      clearPendingJoin();
      // 서로 등록: 내 도감이 있으면 이 친구 트레이너도 내 도감에 넣어요.
      const linked = await linkBack().catch(() => 0);
      const team = await getTeam(code);
      const mine = profileOf(answers);
      if (team && mine) track('dex_join', { pokemon_id: mine.pokemon.id, friend_number: team.members.length });
      return team ? { team, linked } : { error: '도감을 찾지 못했어요.' };
    } catch (err) {
      return { error: err instanceof TeamError ? err.message : '도감에 등록하지 못했어요. 잠시 후 다시 시도해주세요.' };
    }
  }, [code, answers]);

  // 이름을 이미 남겼으면 바로 등록하고, 초대장만 열고 다른 길로 테스트했으면 여기서 이름만 받아요.
  useEffect(() => {
    const pending = readPendingJoin();
    if (!profileOf(answers) || !pending || pending.code !== code) { navigate(`/t/${code}`, { replace: true }); return; }
    let cancelled = false;
    const done = (next: State) => { if (!cancelled) setState(next); };
    if (pending.name) register(pending.name).then(done);
    else getTeam(code).then(team => done(team ? { ask: team } : { error: '도감을 찾지 못했어요.' })).catch(() => done({ error: '도감을 불러오지 못했어요. 잠시 후 다시 시도해주세요.' }));
    return () => { cancelled = true; };
  }, [code, answers, navigate, register]);

  const trimmed = name.trim();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || busy) return;
    setBusy(true);
    setPendingJoin(code, trimmed);
    setState(await register(trimmed));
  };

  if (!state) return <section className="tm tm-loading" aria-busy="true"><p>도감에 등록하는 중…</p></section>;
  if ('error' in state) return <LostPage title="도감에 등록하지 못했어요" text={state.error} to={`/t/${code}`} label="도감으로 가기" />;

  const mine = profileOf(answers)!;
  if ('ask' in state) {
    const { trainer } = state.ask;
    return (
      <section className="tm tm-joined">
        <div className="tm-burst" style={{ '--burst': mine.pokemon.color } as CSSProperties}><img src={`/pokemon/${mine.pokemon.id}.png`} alt={mine.pokemon.name} width="260" height="260" /></div>
        <h1 className="tm-title">{subject(mine.pokemon.name)}<br /><em>나왔어요!</em></h1>
        <p className="tm-sub">{trainer.name} 트레이너 도감에 남길 이름만 알려주세요</p>
        <form onSubmit={submit}>
          <label className="tm-field">
            <span>도감에 남길 이름</span>
            <input value={name} maxLength={12} onChange={event => setName(event.target.value)} placeholder="예: 하은" autoComplete="nickname" />
          </label>
          <button className="poster-button tm-wide" disabled={!trimmed || busy}>{busy ? '등록하는 중…' : <>{trainer.name} 트레이너 도감에 등록하기 <ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" /></>}</button>
        </form>
        <div className="tm-actions">
          <Link className="tm-text-link" to={`/result?a=${answers}`} onClick={clearPendingJoin}>등록하지 않고 내 결과 보기</Link>
        </div>
      </section>
    );
  }

  const { trainer, members } = state.team;
  const myCode = myTeamCode();
  const index = members.findIndex(member => member.is_me);
  const me = members[index];
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
        {/* 도감은 한 사람에 하나라서, 이미 있으면 내 도감으로 보내고 없으면 등록한 지금 만들기를 권해요. */}
        {myCode
          ? <Link className="tm-text-link" to={`/t/${myCode}`}>내 도감 보러 가기</Link>
          : <>
              <Link className="tm-ghost" to={`/trainer/new?a=${answers}`}>나도 내 도감 만들기</Link>
              <p className="tm-join-note">만들면 {trainer.name} 트레이너도 내 도감에 들어와요</p>
            </>}
      </div>
    </section>
  );
}
