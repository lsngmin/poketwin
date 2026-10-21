import { Fragment, useId, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronUp, X } from 'lucide-react';
import { pokemon } from '../data/pokemon';
import { compatibility, profileOf } from '../lib/compat';
import { everyone, TEAM_SIZE, type PartyMember, type Team } from '../lib/teamLocal';
import { PokeBall } from './TrainerCard';
import { track } from '../lib/analytics';

const no = (id: number) => String(id).padStart(3, '0');
// 트레이너는 자기 결과로, 친구는 트레이너와의 궁합으로 이어집니다.
const personLink = (team: Team, person: PartyMember) => person.is_trainer ? `/result?a=${person.answers}` : `/t/${team.trainer.id}/vs/trainer/${person.id}`;

// 대표 파티 6칸. 빈칸을 누르면 주인은 파티를 고르거나 친구를 초대해요.
// 파티를 바꾸는 중(onRemove)에는 칸을 누르면 그 포켓몬이 파티에서 빠져요.
export function TeamParty({ team, party, onEmpty, onRemove }: { team: Team; party: PartyMember[]; onEmpty?: () => void; onRemove?: (id: string) => void }) {
  const trainerProfile = profileOf(team.trainer.answers)!;
  return (
    <div className="tm-party">
      {Array.from({ length: TEAM_SIZE }, (_, i) => {
        const member = party[i];
        const profile = member && profileOf(member.answers);
        if (member && profile) {
          const style = { '--slot-color': profile.pokemon.color } as CSSProperties;
          const body = (
            <>
              <img src={`/pokemon/${profile.pokemon.id}.png`} alt="" width="260" height="260" loading="lazy" />
              <strong>{member.name}{member.is_me && <em> (나)</em>}</strong>
              <small>{profile.pokemon.name}</small>
            </>
          );
          if (onRemove) return (
            <button key={member.id} type="button" className="tm-slot removable" style={style} aria-label={`${member.name}, ${profile.pokemon.name}, 파티에서 빼기`} onClick={() => onRemove(member.id)}>
              <span className="tm-remove" aria-hidden="true"><X size={14} strokeWidth={3.2} /></span>
              {body}
            </button>
          );
          const score = member.is_trainer ? null : compatibility(trainerProfile, profile).score;
          return (
            <Link
              key={member.id}
              to={personLink(team, member)}
              className="tm-slot"
              style={style}
              aria-label={`${member.name}, ${profile.pokemon.name}, ${member.is_trainer ? '트레이너의 포켓몬, 결과 보기' : `트레이너와의 궁합 ${score}점`}`}
            >
              <span className="tm-score">{member.is_trainer ? '트레이너' : score}</span>
              {body}
            </Link>
          );
        }
        return onEmpty && !onRemove
          ? <button key={`empty-${i}`} type="button" className="tm-slot empty" onClick={onEmpty}><span aria-hidden="true">+</span>채우기</button>
          : <div key={`empty-${i}`} className="tm-slot empty"><span aria-hidden="true">+</span>빈자리</div>;
      })}
    </div>
  );
}

// 32종 도감: 만난 포켓몬은 색과 그림으로, 아직 못 만난 포켓몬은 실루엣으로 보여요.
// 칸을 누르면 그 줄 바로 아래에 누가 그 포켓몬인지 펼쳐집니다.
// 처음에는 두 줄만 보이고, 아래 버튼으로 32칸 전체를 펼치거나 접어요.
// 파티를 바꾸는 중(picking)에는 32칸을 모두 펼치고, 만난 칸을 누르면 그 포켓몬이 파티에 들어가요.
const COLUMNS = 4;
const PREVIEW = COLUMNS * 2;
const species = [...pokemon].sort((a, b) => a.id - b.id);
export function dexOwners(team: Team) {
  const owners = new Map<number, PartyMember[]>();
  everyone(team).forEach(person => {
    const id = profileOf(person.answers)?.pokemon.id;
    if (id) owners.set(id, [...(owners.get(id) ?? []), person]);
  });
  return owners;
}

// 파티를 바꾸는 중에는 파티에 들어간 마리 수만큼 몬스터볼을 보여줘요.
// 볼이 너무 많아지면(5마리 이상) 볼 하나와 숫자로 줄여요.
function DexBalls({ inParty }: { inParty: number }) {
  if (!inParty) return null;
  return (
    <span className="dx-balls" aria-hidden="true">
      {inParty <= 4
        ? Array.from({ length: inParty }, (_, k) => <PokeBall key={k} />)
        : <><PokeBall /><b>×{inParty}</b></>}
    </span>
  );
}

export function DexGrid({ team, defaultExpanded = false, picking }: { team: Team; defaultExpanded?: boolean; picking?: { party: string[]; onPick: (speciesId: number) => void } }) {
  const owners = dexOwners(team);
  const [open, setOpen] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const gridId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const openIndex = species.findIndex(p => p.id === open);
  const rowEnd = openIndex < 0 ? -1 : Math.min(species.length, (Math.floor(openIndex / COLUMNS) + 1) * COLUMNS) - 1;
  const shown = open === null ? null : species[openIndex];
  const visible = expanded || picking ? species : species.slice(0, PREVIEW);
  const toggle = () => {
    if (!expanded) return setExpanded(true);
    // 접힌 칸의 설명은 닫고, 길이가 줄어든 뒤에도 버튼이 화면에 남도록 따라갑니다.
    if (openIndex >= PREVIEW) setOpen(null);
    setExpanded(false);
    requestAnimationFrame(() => toggleRef.current?.scrollIntoView({ block: 'nearest' }));
  };
  return (
    <>
      <div className={`dx-grid${picking ? ' picking' : ''}`} id={gridId}>
        {visible.map((p, i) => {
          const found = owners.get(p.id);
          const inParty = picking && found ? found.filter(person => picking.party.includes(person.id)).length : 0;
          const cell = found
            ? (
              <button
                type="button"
                className={`dx-cell found${inParty ? ' in-party' : ''}`}
                style={{ '--cell-color': p.color } as CSSProperties}
                aria-expanded={picking ? undefined : open === p.id}
                aria-pressed={picking ? inParty > 0 : undefined}
                aria-label={`No.${no(p.id)} ${p.name}, ${found.length}명${picking ? (inParty ? ` 중 ${inParty}명 파티에 있어요` : ', 파티에 넣기') : ''}`}
                onClick={() => {
                  if (picking) return picking.onPick(p.id);
                  if (open !== p.id) track('dex_entry_open', { pokemon_id: p.id, owners: found.length });
                  setOpen(open === p.id ? null : p.id);
                }}
              >
                {picking && <DexBalls inParty={inParty} />}
                {found.length > 1 && <span className="dx-count">×{found.length}</span>}
                <img src={`/pokemon/${p.id}.png`} alt="" width="260" height="260" loading="lazy" />
                <span>{p.name}</span>
              </button>
            )
            : (
              <div className="dx-cell" role="img" aria-label={`No.${no(p.id)}, 아직 만나지 못한 포켓몬`}>
                <img src={`/pokemon/${p.id}.png`} alt="" width="260" height="260" loading="lazy" draggable="false" />
                <span>No.{no(p.id)}</span>
              </div>
            );
          return (
            <Fragment key={p.id}>
              {cell}
              {!picking && i === rowEnd && shown && (
                <div className="dx-detail" style={{ '--cell-color': shown.color } as CSSProperties}>
                  <div className="dx-detail-head">
                    <img src={`/pokemon/${shown.id}.png`} alt="" width="260" height="260" />
                    <div><small>No.{no(shown.id)}</small><strong>{shown.name}</strong><p>{shown.title}</p></div>
                  </div>
                  <ul>{owners.get(shown.id)!.map(person => <li key={person.id}><Link to={personLink(team, person)}>{person.name}{person.is_me && ' (나)'}</Link></li>)}</ul>
                  <Link className="dx-detail-more" to={`/pokemon/${shown.id}`}>{shown.name} 알아보기 <ArrowRight size={16} strokeWidth={2.6} aria-hidden="true" /></Link>
                </div>
              )}
            </Fragment>
          );
        })}
      </div>
      {!picking && <button ref={toggleRef} type="button" className="tm-ghost dx-toggle" aria-expanded={expanded} aria-controls={gridId} onClick={toggle}>
        {expanded
          ? <>도감 접기 <ChevronUp size={18} strokeWidth={2.6} aria-hidden="true" /></>
          : <>{species.length}종 모두 펼치기 <ChevronDown size={18} strokeWidth={2.6} aria-hidden="true" /></>}
      </button>}
    </>
  );
}
