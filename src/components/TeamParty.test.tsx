import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { teamParty, toggleSpecies, type Team } from '../lib/teamLocal';
import { DexGrid, dexOwners, TeamParty } from './TeamParty';
import { TrainerCard } from './TrainerCard';
import { BadgePanel, earnedBadges, NewBadge } from './Badges';

// 트레이너는 피카츄, 친구들은 모두 식스테일(00000)이에요.
function fixture(guests: number, isOwner = true, party?: string[] | null): Team {
  return {
    trainer: {
      id: 'test-team', name: '트레이너이름', answers: '333203222121201', party,
      avatar: 'red', created_at: '2026-10-20T00:00:00Z', is_owner: isOwner,
    },
    members: Array.from({ length: guests }, (_, i) => ({
      id: `guest-${i}`, name: `친구${i}`, answers: '000000000000000', is_me: false,
    })),
  };
}

function render(team: Team, onEmpty?: () => void) {
  return renderToStaticMarkup(<MemoryRouter><TeamParty team={team} party={teamParty(team)} onEmpty={onEmpty} /></MemoryRouter>);
}

describe('대표 파티', () => {
  it('파티를 고르기 전에는 트레이너와 먼저 들어온 친구 5명이 들어가요', () => {
    const team = fixture(8);
    expect(teamParty(team).map(p => p.id)).toEqual(['trainer', 'guest-0', 'guest-1', 'guest-2', 'guest-3', 'guest-4']);
    const html = render(team, () => {});
    expect(html.match(/class="tm-slot"/g)).toHaveLength(6);
    expect(html).toContain('href="/result?a=333203222121201"');
    expect(html).toContain('트레이너이름<em> (나)</em>');
    expect(html).toContain('/t/test-team/vs/trainer/guest-0');
  });

  it('고른 순서를 지키고, 도감에서 빠진 친구는 조용히 빠져요', () => {
    const team = fixture(3, true, ['guest-2', 'gone', 'trainer']);
    expect(teamParty(team).map(p => p.id)).toEqual(['guest-2', 'trainer']);
    const html = render(team, () => {});
    expect(html.indexOf('친구2')).toBeLessThan(html.indexOf('트레이너이름'));
    expect(html.match(/<button /g)).toHaveLength(4);
    const card = renderToStaticMarkup(<TrainerCard trainer={team.trainer} partyCount={teamParty(team).length} />);
    expect(card).toContain('대표 파티 2마리, 빈자리 4칸');
  });

  it('트레이너 없이 친구들로만 파티를 꾸릴 수도 있어요', () => {
    expect(teamParty(fixture(2, true, ['guest-0', 'guest-1'])).every(p => !p.is_trainer)).toBe(true);
  });

  it('방문자에게는 빈칸이 버튼이 아니고, 트레이너를 나로 표시하지 않아요', () => {
    const html = render(fixture(0, false));
    expect(html).not.toContain('(나)');
    expect(html).not.toContain('<button');
    expect(html.match(/빈자리/g)).toHaveLength(5);
  });
});

describe('도감', () => {
  it('만난 포켓몬 종류와 마리 수를 센다', () => {
    const owners = dexOwners(fixture(3));
    expect(owners.size).toBe(2);
    expect(owners.get(25)).toHaveLength(1);
    expect(owners.get(37)).toHaveLength(3);
  });

  it('32칸 중 만난 칸만 누를 수 있고, 여럿이면 숫자를 보여준다', () => {
    const html = renderToStaticMarkup(<MemoryRouter><DexGrid team={fixture(3)} defaultExpanded /></MemoryRouter>);
    expect(html.match(/class="dx-cell/g)).toHaveLength(32);
    expect(html.match(/class="dx-cell found"/g)).toHaveLength(2);
    expect(html).toContain('×3');
    expect(html).toContain('No.150, 아직 만나지 못한 포켓몬');
    expect(html).toContain('도감 접기');
  });

  it('처음에는 두 줄만 보이고 펼치기 버튼이 있다', () => {
    const html = renderToStaticMarkup(<MemoryRouter><DexGrid team={fixture(3)} /></MemoryRouter>);
    expect(html.match(/class="dx-cell/g)).toHaveLength(8);
    expect(html.match(/class="dx-cell found"/g)).toHaveLength(2);
    expect(html).not.toContain('No.150');
    expect(html).toMatch(/aria-expanded="false"[^>]*>32종 모두 펼치기/);
  });
});

describe('도감에서 파티 바꾸기', () => {
  it('도감 칸을 누르면 아직 파티에 없는 사람이 들어가고, 모두 들어 있으면 빠진다', () => {
    expect(toggleSpecies(['trainer'], ['guest-0', 'guest-1'])).toEqual({ party: ['trainer', 'guest-0'], full: false });
    expect(toggleSpecies(['trainer', 'guest-0'], ['guest-0', 'guest-1'])).toEqual({ party: ['trainer', 'guest-0', 'guest-1'], full: false });
    expect(toggleSpecies(['trainer', 'guest-0', 'guest-1'], ['guest-0', 'guest-1'])).toEqual({ party: ['trainer'], full: false });
  });

  it('파티가 가득 차면 더 넣지 않는다', () => {
    const party = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(toggleSpecies(party, ['g'])).toEqual({ party, full: true });
  });

  it('바꾸는 중에는 파티 칸이 빼기 버튼이 되고 빈칸은 누를 수 없다', () => {
    const team = fixture(1);
    const html = renderToStaticMarkup(<MemoryRouter><TeamParty team={team} party={teamParty(team)} onEmpty={() => {}} onRemove={() => {}} /></MemoryRouter>);
    expect(html.match(/class="tm-slot removable"/g)).toHaveLength(2);
    expect(html).toContain('친구0, 식스테일, 파티에서 빼기');
    expect(html).not.toContain('href=');
    expect(html).not.toContain('채우기');
  });

  it('바꾸는 중에는 도감 32칸이 모두 보이고 파티에 있는 칸에 표시가 붙는다', () => {
    const team = fixture(3);
    const html = renderToStaticMarkup(<MemoryRouter><DexGrid team={team} picking={{ party: ['guest-1'], onPick: () => {} }} /></MemoryRouter>);
    expect(html.match(/class="dx-cell/g)).toHaveLength(32);
    expect(html).toContain('class="dx-cell found in-party"');
    expect(html).toContain('No.025 피카츄, 1명, 파티에 넣기');
    expect(html).toContain('No.037 식스테일, 3명 중 1명 파티에 있어요');
    expect(html).toContain('×3');
  });

  it('몬스터볼은 파티에 들어간 마리 수만큼만 보인다', () => {
    const team = fixture(3);
    const html = renderToStaticMarkup(<MemoryRouter><DexGrid team={team} picking={{ party: ['guest-0', 'guest-2'], onPick: () => {} }} /></MemoryRouter>);
    const vulpix = html.slice(html.indexOf('No.037'), html.indexOf('</button>', html.indexOf('No.037')));
    expect(vulpix.match(/class="poke-ball"/g)).toHaveLength(2);
    expect(vulpix).not.toContain('poke-ball empty');
    const pikachu = html.slice(html.indexOf('No.025'), html.indexOf('</button>', html.indexOf('No.025')));
    expect(pikachu).not.toContain('poke-ball');
    expect(html).not.toContain('모두 펼치기');
  });
});

describe('도감 배지', () => {
  it('4·8·16·32종에서 하나씩 열린다', () => {
    expect([0, 3, 4, 7, 8, 15, 16, 31, 32].map(earnedBadges)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4]);
  });
  it('카드에는 배지함 버튼이, 펼친 칸에는 다음 배지까지 남은 종류가 보인다', () => {
    const card = renderToStaticMarkup(<TrainerCard trainer={fixture(0).trainer} partyCount={1} found={11} />);
    expect(card).toContain('배지 2개 받음, 배지 칸 펼치기');
    expect(card).toContain('aria-expanded="false"');
    const panel = renderToStaticMarkup(<BadgePanel id="b" found={11} />);
    expect(panel).not.toContain('2 / 4');
    expect(panel).toContain('루비 배지, 16종까지 5종 남음');
    expect(panel).toContain('다음은 루비 배지예요, 도감을 5종만 더 채우면 받아요');
    expect(renderToStaticMarkup(<BadgePanel id="b" found={32} />)).toContain('모든 배지를 모았어요');
  });
  it('아직 축하하지 않은 배지가 있으면 가장 높은 배지를 한 번 보여준다', () => {
    const html = renderToStaticMarkup(<NewBadge code="test-team" found={11} />);
    expect(html).toContain('사파이어 배지를 받았어요!');
    expect(html).toContain('루비 배지까지 5종');
    expect(renderToStaticMarkup(<NewBadge code="test-team" found={3} />)).toBe('');
  });
  it('도감 수를 모르는 화면에는 배지함이 없다', () => {
    expect(renderToStaticMarkup(<TrainerCard trainer={fixture(0).trainer} partyCount={1} />)).not.toContain('tc-badge-toggle');
  });
});
