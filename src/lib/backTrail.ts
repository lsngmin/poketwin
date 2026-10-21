// 포켓몬 화면의 "← 돌아가기"가 어디로 갈지 정해요.
// 포켓몬 화면에 들어오기 직전의 화면(출발점)과 거기서 포켓몬 화면을 몇 장 넘어왔는지 기억해 두고,
// 그만큼 브라우저 기록을 되돌려서 출발점을 떠날 때 모습 그대로 돌아가요.
type Place = { pathname: string; search: string; key: string };
export type Trip = { origin: Place; depth: number };

let last: Place | null = null;
const trips = new Map<string, Trip | null>();

// 화면이 바뀔 때마다 레이아웃이 불러요. 다음 화면은 이걸 "직전 화면"으로 봐요.
export function visit(place: Place) { last = place; }

// 이 기록(key)에 들어온 포켓몬 화면의 출발점. 공유 링크로 바로 들어왔거나 새로고침했으면 없어요.
export function tripFor(key: string): Trip | null {
  if (!trips.has(key)) {
    const before = last && last.key !== key ? last : null;
    const chained = before && trips.get(before.key);
    trips.set(key, chained ? { origin: chained.origin, depth: chained.depth + 1 }
      : before && !before.pathname.startsWith('/pokemon/') ? { origin: before, depth: 1 } : null);
  }
  return trips.get(key) ?? null;
}

export function backLabel(pathname: string) {
  if (pathname === '/collection') return '포켓몬 도감';
  if (pathname.startsWith('/t/')) return '트레이너 도감';
  if (pathname === '/result') return '내 결과';
  if (pathname === '/') return '홈';
  return '뒤로';
}
