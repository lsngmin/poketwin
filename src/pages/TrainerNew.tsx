import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowRight, Check } from 'lucide-react';
import { trainerAvatars, type TrainerAvatar } from '../data/trainers';
import { decodeAnswers } from '../lib/matching';
import { questions } from '../data/questions';
import { readAnswers } from '../lib/storage';
import { createTeam, hasTeamSession, linkBack, myTeamCode, teamEnabled, TeamError } from '../lib/team';
import { LostPage } from '../components/LostPage';
import { track } from '../lib/analytics';
import './Team.css';

export function TrainerNew() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const saved = readAnswers();
  const answers = decodeAnswers(params.get('a')) ?? (saved.length === questions.length ? saved : null);
  const [avatar, setAvatar] = useState<TrainerAvatar>('red');
  // 내 도감 없이 익명 로그인 기록만 있으면 친구 도감에 먼저 등록했던 사람이에요(바이럴 계수 계산용).
  const [joinedBefore] = useState(() => hasTeamSession() && !myTeamCode());
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  if (!teamEnabled) return <LostPage title="지금은 트레이너를 만들 수 없어요" text="잠시 후 다시 시도해주세요." to="/" label="홈으로 돌아가기" />;
  // 도감은 한 사람(이 브라우저)에 하나예요. 이미 있으면 새로 만들지 않고 내 도감으로 보내요.
  const existing = myTeamCode();
  if (existing) return (
    <section className="tm">
      <h1 className="tm-title">이미 내 도감이<br /><em>있어요</em></h1>
      <p className="tm-sub">도감은 한 사람에 하나씩이에요. 새 친구들은 내 도감 초대 링크로 모아보세요.</p>
      <div className="tm-actions">
        <Link className="poster-button tm-wide" to={`/t/${existing}`}>내 도감 보러 가기 <ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" /></Link>
      </div>
    </section>
  );
  if (!answers) return <LostPage title="먼저 나의 포켓몬을 찾아주세요" text="테스트에서 만난 포켓몬이 트레이너의 포켓몬이 돼요." to="/quiz" label="나의 포켓트윈 찾기" />;
  const trimmed = name.trim();
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || busy) return;
    setBusy(true); setError('');
    try {
      const code = await createTeam({ name: trimmed, answers: answers.join(''), avatar });
      track('dex_create', { avatar, joined_before: joinedBefore });
      // 서로 등록: 먼저 등록했던 친구 도감의 트레이너들이 새 도감에 처음부터 들어 있게 해요.
      if (joinedBefore) await linkBack().catch(() => 0);
      navigate(`/t/${code}`);
    }
    catch (err) { setError(err instanceof TeamError ? err.message : '트레이너를 만들지 못했어요. 잠시 후 다시 시도해주세요.'); setBusy(false); }
  };
  return (
    <section className="tm">
      <h1 className="tm-title">함께할 트레이너를<br /><em>골라주세요</em></h1>
      <form onSubmit={submit}>
        <fieldset className="tm-picks">
          <legend className="sr-only">트레이너</legend>
          {trainerAvatars.map(option => (
            <label key={option.id} className={`tm-pick${avatar === option.id ? ' on' : ''}`}>
              <input type="radio" name="avatar" value={option.id} checked={avatar === option.id} onChange={() => setAvatar(option.id)} />
              <img src={option.src} alt={option.label} width="395" height="560" />
              {avatar === option.id && <span className="tm-pick-check" aria-hidden="true"><Check size={15} strokeWidth={3.2} /></span>}
            </label>
          ))}
        </fieldset>
        <label className="tm-field">
          <span className="sr-only">트레이너 이름</span>
          <input value={name} maxLength={12} onChange={event => setName(event.target.value)} placeholder="트레이너 이름" autoComplete="nickname" />
        </label>
        {error && <p className="tm-error" role="alert">{error}</p>}
        <button className="poster-button tm-wide" disabled={!trimmed || busy}>{busy ? '만드는 중…' : <>이 트레이너로 시작하기 <ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" /></>}</button>
      </form>
      <p className="tm-note">도감은 지금 쓰는 브라우저에 연결돼요<br />만든 뒤 나오는 도감 관리 링크를 꼭 저장해두세요</p>
    </section>
  );
}
