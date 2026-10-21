import { partyVibe, type VibeMember } from '../lib/compat';

// 우리 파티 분위기: 이름과 한 줄 설명, 이 파티에서만 나오는 사실만 짧게 보여줘요.
export function PartyVibe({ people }: { people: VibeMember[] }) {
  const vibe = partyVibe(people);
  return (
    <div className="tm-card pv">
      <h3>{vibe.name}</h3>
      <p className="pv-desc">{vibe.description}</p>
      {vibe.facts.length > 0 && <ul className="pv-facts">{vibe.facts.map(fact => <li key={fact}>{fact}</li>)}</ul>}
    </div>
  );
}
