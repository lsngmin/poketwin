import './TraitMeter.css';

const words = ['살짝', '꽤', '확실히'] as const;

// 성향마다 질문이 3개뿐이라 퍼센트 대신 한쪽으로 기운 정도를 3단계로 보여줍니다.
// 점수 0~100을 답변 합계(-6~+6)로 되돌려, 1~2점은 살짝 · 3~4점은 꽤 · 5~6점은 확실히.
export function traitStrength(score: number): 1 | 2 | 3 {
  const total = Math.round(score * 12 / 100) - 6;
  return Math.max(1, Math.ceil(Math.abs(total) / 2)) as 1 | 2 | 3;
}

// 가운데에서 바깥으로 채우는 6칸 막대(왼쪽 3칸 · 오른쪽 3칸). 가운데 칸이 없어 늘 한쪽으로 기울어요.
export function TraitMeter({ name, low, high, score, highSide, compact = false }: { name: string; low: string; high: string; score: number; highSide: boolean; compact?: boolean }) {
  const level = traitStrength(score);
  const label = `${words[level - 1]} ${highSide ? high : low}`;
  return (
    <div className={`trm${compact ? ' compact' : ''}`}>
      <div className="trm-head"><strong>{name}</strong><span>{label}</span></div>
      <div className="trm-blocks" role="img" aria-label={`${name}: ${label}`}>
        {[2, 1, 0].map(i => <i key={`l${i}`} className={!highSide && i < level ? 'on' : undefined} />)}
        <span className="trm-mid" />
        {[0, 1, 2].map(i => <i key={`r${i}`} className={highSide && i < level ? 'on' : undefined} />)}
      </div>
      {!compact && <div className="trm-ends"><span>{low}</span><span>{high}</span></div>}
    </div>
  );
}
