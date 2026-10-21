import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { claimTeam, forgetManageKey, getTeam, readManageKey, rememberTeam, teamEnabled, teamParty, TeamError, type Team } from '../lib/team';
import { dexOwners } from '../components/TeamParty';
import { LostPage } from '../components/LostPage';
import { TrainerCard } from '../components/TrainerCard';
import { track } from '../lib/analytics';
import './Team.css';

// 도감 관리 링크를 연 화면: 이 브라우저를 도감 주인으로 바꿀지 한 번 묻고 가져와요.
export function TeamManage() {
  const { code = '' } = useParams();
  const navigate = useNavigate();
  const [key] = useState(readManageKey);
  const [team, setTeam] = useState<Team | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!teamEnabled || !key) return;
    getTeam(code).then(setTeam).catch(err => setError(err instanceof TeamError ? err.message : '도감을 불러오지 못했어요.'));
  }, [code, key]);
  if (!teamEnabled) return <LostPage title="지금은 도감을 가져올 수 없어요" text="잠시 후 다시 시도해주세요." to="/" label="홈으로 돌아가기" />;
  if (!key) return <LostPage title="도감 관리 링크가 올바르지 않아요" text="링크를 끝까지 복사했는지 확인하고 다시 열어주세요." to="/" label="홈으로 돌아가기" />;
  if (team === undefined && !error) return <section className="tm tm-loading" aria-busy="true"><p>도감을 불러오는 중…</p></section>;
  if (team === null) return <LostPage title="도감을 찾지 못했어요" text="도감이 삭제되었거나 링크가 바뀌었을 수 있어요." to="/" label="홈으로 돌아가기" />;
  // 이미 이 브라우저가 주인이면 바로 도감으로 가요.
  if (team?.trainer.is_owner) { rememberTeam(code); forgetManageKey(); return <Navigate to={`/t/${code}`} replace />; }

  const claim = async () => {
    setBusy(true); setError('');
    try {
      const success = await claimTeam(code, key);
      track('manage_claim', { success });
      if (success) { forgetManageKey(); navigate(`/t/${code}`, { replace: true }); return; }
      setError('도감 관리 링크가 이 도감과 맞지 않아요, 링크를 다시 확인해주세요');
    } catch (err) { setError(err instanceof TeamError ? err.message : '도감을 가져오지 못했어요, 잠시 후 다시 시도해주세요'); }
    setBusy(false);
  };
  return (
    <section className="tm">
      <span className="eyebrow">도감 관리 링크</span>
      {team ? (
        <>
          <h1 className="tm-title">{team.trainer.name} 트레이너의<br /><em>도감을 가져올까요?</em></h1>
          <div className="tm-invite-card"><TrainerCard trainer={team.trainer} partyCount={teamParty(team).length} found={dexOwners(team).size} /></div>
        </>
      ) : <h1 className="tm-title">내 도감을<br /><em>가져올까요?</em></h1>}
      <p className="tm-claim">이 브라우저에서 대표 파티를 바꾸고 친구를 관리할 수 있게 돼요. 전에 쓰던 브라우저에서는 더 이상 관리할 수 없어요</p>
      <button type="button" className="poster-button tm-wide" disabled={busy} onClick={claim}>{busy ? '가져오는 중…' : <>이 브라우저로 가져오기 <ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" /></>}</button>
      {error && <p className="tm-error" role="alert">{error}</p>}
      <p className="tm-note">도감 관리 링크는 나만 간직하세요<br />이 링크를 가진 사람은 누구나 도감을 가져갈 수 있어요</p>
    </section>
  );
}
