import { useId, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { pokemon as allPokemon } from '../data/pokemon';
import { getAvatar } from '../data/trainers';
import { profileOf } from '../lib/compat';
import { TEAM_SIZE, trainerNo, type TeamTrainer } from '../lib/teamLocal';
import { BadgeIcon, BadgePanel, BADGES, earnedBadges, NewBadge } from './Badges';
import './TrainerCard.css';

export function PokeBall({ empty = false }: { empty?: boolean }) {
  return empty
    ? <svg className="poke-ball empty" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="10.4" fill="none" stroke="currentColor" strokeWidth="1.8" /><path d="M1.6 12h7M15.4 12h7" stroke="currentColor" strokeWidth="1.8" /><circle cx="12" cy="12" r="3.4" fill="none" stroke="currentColor" strokeWidth="1.8" /></svg>
    : <svg className="poke-ball" viewBox="0 0 24 24" aria-hidden="true"><path d="M1.6 12a10.4 10.4 0 0 1 20.8 0z" fill="#e5484d" /><path d="M1.6 12a10.4 10.4 0 0 0 20.8 0z" fill="#fff" /><circle cx="12" cy="12" r="10.4" fill="none" stroke="#14261f" strokeWidth="1.8" /><path d="M1.6 12h20.8" stroke="#14261f" strokeWidth="1.8" /><circle cx="12" cy="12" r="3.4" fill="#fff" stroke="#14261f" strokeWidth="1.8" /></svg>;
}

// 게임 속 트레이너 카드: ID, 이름, 나의 포켓몬, 도감, 사진, 대표 파티 몬스터볼 6칸
// 몬스터볼 줄 오른쪽에는 배지함이 있어서, 누르면 카드 아래에 배지 칸이 펼쳐져요(도감 수를 아는 화면에서만).
export function TrainerCard({ trainer, partyCount, found }: { trainer: TeamTrainer; partyCount: number; found?: number }) {
  const avatar = getAvatar(trainer.avatar);
  const pokemon = profileOf(trainer.answers)?.pokemon;
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const earned = found === undefined ? 0 : earnedBadges(found);
  return (
    <>
    <div className="trainer-card">
      <div className="tc-head"><span>ID No. {trainerNo(trainer.id)}</span><PokeBall /></div>
      <div className="tc-body">
        <div>
          <p className="tc-name">{trainer.name}</p>
          <dl>
            <div><dt>나의 포켓몬</dt><dd>{pokemon?.name ?? '-'}</dd></div>
            {found !== undefined && <div><dt>도감</dt><dd>{found} / {allPokemon.length}종</dd></div>}
          </dl>
        </div>
        <div className="tc-photo"><img src={avatar.src} alt={avatar.label} width="395" height="560" /></div>
        <div className="tc-row">
          <div className="tc-balls" role="img" aria-label={`대표 파티 ${partyCount}마리, 빈자리 ${Math.max(0, TEAM_SIZE - partyCount)}칸`}>
            {Array.from({ length: TEAM_SIZE }, (_, i) => <PokeBall key={i} empty={i >= partyCount} />)}
          </div>
          {found !== undefined && (
            <button type="button" className="tc-badge-toggle" aria-expanded={open} aria-controls={panelId} aria-label={`배지 ${earned}개 받음, ${open ? '배지 칸 접기' : '배지 칸 펼치기'}`} onClick={() => setOpen(value => !value)}>
              {BADGES.map(badge => <BadgeIcon key={badge.id} badge={badge} earned={found >= badge.need} size={20} />)}
              <ChevronDown size={15} strokeWidth={2.8} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>
    </div>
    {trainer.is_owner && found !== undefined && <NewBadge code={trainer.id} found={found} />}
    {open && found !== undefined && <BadgePanel id={panelId} found={found} />}
    </>
  );
}
