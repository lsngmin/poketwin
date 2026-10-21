import { useCallback, useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowRight, Check, Link as LinkIcon, QrCode, Share2 } from 'lucide-react';
import { questions } from '../data/questions';
import { pokemon } from '../data/pokemon';
import { partyCombos, profileOf, toward, type Combo, type Profile } from '../lib/compat';
import { matchPokemon } from '../lib/matching';
import { clearAnswers, readAnswers } from '../lib/storage';
import { deleteTeam, everyone, FRIEND_LIMIT, getTeam, inviteUrl, linkBack, myTeamCode, rememberInvite, removeMember, setParty, setPendingJoin, TEAM_SIZE, teamEnabled, TeamError, teamParty, toggleSpecies, type Team as TeamData, type TeamMember } from '../lib/team';
import { LostPage } from '../components/LostPage';
import { TrainerCard } from '../components/TrainerCard';
import { PartyVibe } from '../components/PartyVibe';
import { DexGrid, dexOwners, TeamParty } from '../components/TeamParty';
import { openXPost, ShareApps } from '../components/ShareApps';
import { InviteQr } from '../components/InviteQr';
import { ManageLink } from '../components/ManageLink';
import { kakaoEnabled, preloadKakao, shareImageUrl, shareToKakao } from '../lib/kakao';
import { prefetchStory, shareStory } from '../lib/share';
import { track, type ShareMethod } from '../lib/analytics';
import './Team.css';

export function Team() {
  const { code = '' } = useParams();
  const [team, setTeam] = useState<TeamData | null | undefined>(undefined);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    try { setTeam(await getTeam(code)); setError(''); }
    catch (err) { setError(err instanceof TeamError ? err.message : '도감을 불러오지 못했어요.'); }
  }, [code]);
  useEffect(() => { if (teamEnabled) void load(); }, [load]);
  if (!teamEnabled) return <LostPage title="지금은 도감을 볼 수 없어요" text="잠시 후 다시 시도해주세요." to="/" label="홈으로 돌아가기" />;
  if (error) return <LostPage title="도감을 불러오지 못했어요" text={error} to="/" label="홈으로 돌아가기" />;
  if (team === undefined) return <section className="tm tm-loading" aria-busy="true"><p>도감을 불러오는 중…</p></section>;
  if (!team) return <LostPage title="도감을 찾지 못했어요" text="초대 링크가 올바른지, 도감이 삭제되지 않았는지 확인해주세요." to="/" label="홈으로 돌아가기" />;
  const me = team.members.find(member => member.is_me);
  if (!team.trainer.is_owner && !me) return <TeamInvite team={team} />;
  return <TeamHome team={team} me={me} reload={load} />;
}

type Person = { id: string; name: string; profile: Profile };

function TeamHome({ team, me, reload }: { team: TeamData; me?: TeamMember; reload: () => Promise<void> }) {
  const navigate = useNavigate();
  const { trainer, members } = team;
  const owner = trainer.is_owner;
  // 알림은 5초 뒤에 사라져요. 같은 문구를 다시 띄워도 시간이 처음부터 다시 흘러요.
  const [notice, setNoticeState] = useState({ text: '', at: 0 });
  const setNotice = (text: string) => setNoticeState({ text, at: Date.now() });
  useEffect(() => {
    if (!notice.text) return;
    const timer = setTimeout(() => setNoticeState({ text: '', at: 0 }), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  // QR 코드는 버튼을 눌렀을 때만 펼쳐요.
  const [qrOpen, setQrOpen] = useState(false);
  const qrId = useId();
  // 파티를 바꾸는 중에는 화면의 파티(draft)를 먼저 바꾸고, 저장 요청은 순서대로 보내요.
  const [draft, setDraft] = useState<string[] | null>(null);
  const [editMsg, setEditMsg] = useState('');
  const queue = useRef(Promise.resolve());
  const editing = draft !== null;
  const all = everyone(team);
  const party = draft ? draft.flatMap(id => all.filter(person => person.id === id)) : teamParty(team);
  const partyIds = party.map(person => person.id);
  const owners = dexOwners(team);
  const found = owners.size;
  const people: Person[] = party.flatMap(m => { const profile = profileOf(m.answers); return profile ? [{ id: m.id, name: m.name, profile }] : []; });
  const combos = people.length >= 2 ? partyCombos(people) : [];

  const inviteTitle = `${trainer.name} 트레이너의 도감`;
  const inviteText = `${trainer.name} 트레이너의 도감을 채워주세요! 나와 닮은 포켓몬을 찾으면 도감에 등록돼요`;
  const copy = async () => {
    try { await navigator.clipboard.writeText(inviteUrl(trainer.id)); setNotice('초대 링크를 복사했어요! 친구에게 보내보세요'); }
    catch { setNotice('링크 복사가 지원되지 않아요, 주소창의 링크를 복사해주세요'); }
  };
  const share = async () => {
    if (!navigator.share) { await copy(); return; }
    try { await navigator.share({ title: inviteTitle, text: inviteText, url: inviteUrl(trainer.id) }); }
    catch (err) { if (!(err instanceof DOMException && err.name === 'AbortError')) await copy(); }
  };
  // 공유 창이 바로 뜨도록 카카오 SDK와 인스타 스토리용 초대장 그림을 미리 받아 둬요.
  const [storyFile, setStoryFile] = useState<File | null>(null);
  // 서로 등록: 내 도감을 열 때 한 번, 이 브라우저로 등록했던 친구 도감의 트레이너 중 빠진 사람을 넣어요(탭마다 한 번).
  useEffect(() => {
    if (!owner) return;
    const key = `poketwin:linked:${trainer.id}`;
    try { if (sessionStorage.getItem(key)) return; sessionStorage.setItem(key, '1'); } catch { /* 저장소 미지원이면 매번 확인해요 */ }
    linkBack().then(added => {
      if (!added) return;
      setNotice(`서로 등록돼서 친구 ${added}명이 내 도감에 들어왔어요`);
      void reload();
    }).catch(() => { /* 다음에 다시 시도해요 */ });
  }, [owner, trainer.id, reload]);
  useEffect(() => {
    if (!owner) return;
    preloadKakao();
    prefetchStory('/share/story-invite.png', 'poketwin-dex-invite.png').then(setStoryFile).catch(() => { /* 누를 때 다시 받아요 */ });
  }, [owner]);
  const shareKakao = async () => {
    if (!kakaoEnabled) { await share(); return; }
    try {
      // 그림은 scripts/share-images.py로 만든 도감 초대장이에요. 이름은 그림 대신 제목에 넣어요.
      await shareToKakao({
        title: `${trainer.name} 트레이너가 도감에 초대했어요`,
        description: `나와 닮은 포켓몬을 찾아 도감을 함께 채워요 · 지금 ${found}/${pokemon.length}종`,
        imageUrl: shareImageUrl('/share/invite.png'),
        url: inviteUrl(trainer.id),
        buttons: [{ title: '도감에 등록하기', url: inviteUrl(trainer.id) }],
      });
    } catch { setNotice('카카오톡을 열지 못했어요, 잠시 후 다시 시도해주세요'); }
  };
  const shareX = () => openXPost(inviteText, inviteUrl(trainer.id));
  // 인스타그램은 웹에서 링크를 바로 보낼 수 없어서, 스토리용 초대장 그림을 공유 창으로 넘기고 초대 링크는 복사해 둬요.
  // 겉으로는 일반 공유와 같은 창이라, 누르는 순간 무엇을 고르면 되는지 먼저 알려줘요.
  const shareInstagram = async () => {
    setNotice('공유 창에서 Instagram을 골라 스토리에 올려보세요, 링크는 복사해 뒀어요');
    try {
      const file = storyFile ?? await prefetchStory('/share/story-invite.png', 'poketwin-dex-invite.png');
      const outcome = await shareStory(file, inviteUrl(trainer.id));
      if (outcome === 'shared') setNotice('초대 링크도 복사했어요, 스토리에 링크 스티커로 붙여보세요');
      if (outcome === 'saved') setNotice('초대장 그림을 저장하고 초대 링크도 복사했어요, 인스타에 올리고 링크 스티커로 붙여보세요');
    } catch { setNotice('그림을 준비하지 못했어요, 잠시 후 다시 시도해주세요'); }
  };
  const commit = (next: string[]) => {
    setDraft(next);
    queue.current = queue.current
      .then(() => setParty(trainer.id, next))
      .catch(err => setEditMsg(err instanceof TeamError ? err.message : '파티를 저장하지 못했어요, 잠시 후 다시 시도해주세요'));
  };
  const startEditing = () => { setEditMsg(''); setDraft(partyIds); };
  // 파티 칸을 누르면 빠지고, 도감 칸을 누르면 들어가요.
  const removeFromParty = (id: string) => { setEditMsg(''); commit(partyIds.filter(item => item !== id)); };
  const pickSpecies = (speciesId: number) => {
    const result = toggleSpecies(partyIds, (owners.get(speciesId) ?? []).map(person => person.id));
    if (result.full) { setEditMsg('파티가 가득 찼어요, 위 파티에서 하나를 먼저 빼주세요'); return; }
    setEditMsg(''); commit(result.party);
  };
  const finishEditing = async () => { track('party_edit', { party_size: party.length }); await queue.current; await reload(); setDraft(null); setEditMsg(''); };
  // 초대 공유도 누른 수단 그대로 기록해요.
  const tracked = (method: ShareMethod, run: () => unknown) => () => { track('share', { method, content_type: 'dex_invite' }); void run(); };
  const kick = async (member: TeamMember) => {
    if (!window.confirm(`${member.name}님을 도감에서 뺄까요?`)) return;
    try { await removeMember(member.id); await reload(); } catch (err) { setNotice(err instanceof TeamError ? err.message : '도감에서 빼지 못했어요.'); }
  };
  const leave = async () => {
    if (!me || !window.confirm('이 도감에서 나갈까요? 내 이름과 답변이 도감에서 지워져요.')) return;
    try { await removeMember(me.id); await reload(); } catch (err) { setNotice(err instanceof TeamError ? err.message : '도감에서 나가지 못했어요.'); }
  };
  const remove = async () => {
    if (!window.confirm('도감을 삭제할까요? 친구 기록도 모두 지워지고 되돌릴 수 없어요.')) return;
    try { await deleteTeam(trainer.id); navigate('/'); } catch (err) { setNotice(err instanceof TeamError ? err.message : '도감을 삭제하지 못했어요.'); }
  };
  // 빈칸: 파티에 아직 안 넣은 친구가 있으면 고르기, 없으면 친구 초대
  const fillEmpty = all.length > party.length ? startEditing : share;

  return (
    <section className="tm">
      <h1 className="sr-only">{inviteTitle}</h1>
      <TrainerCard trainer={trainer} partyCount={party.length} found={found} />
      {owner && <ManageLink code={trainer.id} variant="notice" />}

      <div className="tm-sec-row">
        <h2 className="tm-sec">대표 파티</h2>
        {owner && !editing && <button type="button" className="tm-sec-link" onClick={startEditing}>파티 바꾸기</button>}
      </div>
      <TeamParty team={team} party={party} onEmpty={owner ? fillEmpty : undefined} onRemove={editing ? removeFromParty : undefined} />

      <div className="tm-sec-row">
        <h2 className="tm-sec">도감</h2>
        <span className="tm-sec-meta">도감 친구 {members.length}명</span>
      </div>
      <DexGrid team={team} picking={editing ? { party: partyIds, onPick: pickSpecies } : undefined} />
      {editing && (
        <div className="dx-editbar">
          <p role="status"><b>{party.length}</b> / {TEAM_SIZE}<span>{editMsg || '파티를 누르면 빠지고, 도감을 누르면 들어가요'}</span></p>
          <button type="button" className="poster-button" onClick={finishEditing}>완료</button>
        </div>
      )}

      {people.length >= 2 && (
        <>
          <h2 className="tm-sec">우리 파티 분위기</h2>
          <PartyVibe people={people} />
        </>
      )}

      {combos.length > 0 && (
        <>
          <h2 className="tm-sec">눈에 띄는 콤비</h2>
          {combos.map(combo => <ComboLink key={combo.kind} code={trainer.id} combo={combo} />)}
        </>
      )}

      {owner ? (
        <div className="tm-actions dx-share">
          <button type="button" className="poster-button tm-wide" onClick={tracked('native', share)}><Share2 size={20} strokeWidth={2.6} aria-hidden="true" /> 내 도감 공유하기</button>
          <ShareApps onKakao={tracked('kakao', shareKakao)} onX={tracked('x', shareX)} onInstagram={tracked('instagram', shareInstagram)}>
            <button type="button" className="share-app plain" onClick={tracked('copy_link', copy)}><span className="share-app-icon"><LinkIcon size={22} strokeWidth={2.6} aria-hidden="true" /></span>링크 복사</button>
            <button type="button" className="share-app plain" aria-expanded={qrOpen} aria-controls={qrId} onClick={() => { if (!qrOpen) track('share', { method: 'qr', content_type: 'dex_invite' }); setQrOpen(open => !open); }}><span className="share-app-icon"><QrCode size={22} strokeWidth={2.6} aria-hidden="true" /></span>QR 코드</button>
          </ShareApps>
          {qrOpen && <InviteQr id={qrId} url={inviteUrl(trainer.id)} />}
        </div>
      ) : (
        <div className="tm-actions">
          {/* 도감은 한 사람에 하나라서, 이미 내 도감이 있으면 새로 만드는 대신 그쪽으로 보내요. */}
          <Link className="poster-button tm-wide" to={myTeamCode() ? `/t/${myTeamCode()}` : me ? `/trainer/new?a=${me.answers}` : '/quiz'}>{myTeamCode() ? '내 도감 보러 가기' : '나도 도감 만들기'} <ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" /></Link>
        </div>
      )}
      <div className="tm-notice" role="status">{notice.text && <span key={notice.at}><Check size={16} strokeWidth={2.6} aria-hidden="true" />{notice.text}</span>}</div>

      <details className="tm-manage">
        <summary>{owner ? '도감 관리' : '도감 설정'}</summary>
        {owner ? (
          <>
            <ManageLink code={trainer.id} variant="menu" />
            {members.length > 0 && <ul>{members.map(member => <li key={member.id}><span>{member.name}</span><button type="button" onClick={() => kick(member)}>도감에서 빼기</button></li>)}</ul>}
            <button type="button" className="tm-danger" onClick={remove}>도감 삭제하기</button>
          </>
        ) : (
          <button type="button" className="tm-danger" onClick={leave}>도감에서 나가기</button>
        )}
      </details>
    </section>
  );
}

// 콤비 카드: 누가 어떤 콤비인지, 왜 그런지 한 줄로 보여주고 누르면 둘의 궁합으로 가요.
function ComboLink({ code, combo }: { code: string; combo: Combo }) {
  const { a, b } = combo;
  return (
    <Link to={`/t/${code}/vs/${a.id}/${b.id}`} className={`tm-card tm-combo pc ${combo.kind}`}>
      <span className="tm-pair" aria-hidden="true"><img src={`/pokemon/${a.profile.pokemon.id}.png`} alt="" /><img src={`/pokemon/${b.profile.pokemon.id}.png`} alt="" /></span>
      <span className="tm-combo-text"><small>{combo.label}</small><strong>{a.name} × {b.name}</strong></span>
      {combo.kind === 'best' ? <b>{combo.tag}<i>점</i></b> : <em className="pc-tag">{combo.tag}</em>}
      <p className="pc-reason">{combo.reason}</p>
    </Link>
  );
}

function TeamInvite({ team }: { team: TeamData }) {
  // 초대 링크로 들어온 사람 수(초대 → 등록 전환율의 분모)
  useEffect(() => { track('dex_invite_view', {}); }, []);
  // 내 도감이 없는 사람은 초대장을 여는 순간 이 도감을 기억해요. 어느 길로 테스트하든 끝나면 이 도감에 등록돼요.
  // 자리가 가득 찬 도감은 기억하지 않아요.
  useEffect(() => { if (!myTeamCode() && team.members.length < FRIEND_LIMIT) rememberInvite(team.trainer.id); }, [team.trainer.id, team.members.length]);
  const navigate = useNavigate();
  const { trainer, members } = team;
  const [name, setName] = useState('');
  const saved = readAnswers();
  const done = saved.length === questions.length ? saved : null;
  const myPokemon = done ? matchPokemon(done).pokemon : null;
  const trimmed = name.trim();
  const full = members.length >= FRIEND_LIMIT;
  // 초대받은 사람은 세 갈래예요.
  // 내 도감이 있으면: 내 트레이너 이름과 포켓몬으로 버튼 한 번에 등록해요(이름을 다시 쓰지 않아요).
  // 도감은 없고 결과만 있으면: 이름만 남기고 그 포켓몬으로 바로 등록해요(내 도감은 등록 뒤에 권해요).
  // 둘 다 없으면: 이름을 남기고 테스트한 뒤 등록해요.
  const myCode = myTeamCode();
  const [myTrainer, setMyTrainer] = useState<{ name: string; answers: string } | null | undefined>(myCode ? undefined : null);
  useEffect(() => {
    if (!myCode) return;
    let cancelled = false;
    getTeam(myCode)
      .then(mine => { if (!cancelled) setMyTrainer(mine?.trainer.is_owner ? { name: mine.trainer.name, answers: mine.trainer.answers } : null); })
      .catch(() => { if (!cancelled) setMyTrainer(null); });
    return () => { cancelled = true; };
  }, [myCode]);
  const myTrainerPokemon = myTrainer ? profileOf(myTrainer.answers)?.pokemon : null;
  const joinAsTrainer = () => {
    if (!myTrainer) return;
    setPendingJoin(trainer.id, myTrainer.name); navigate(`/t/${trainer.id}/joined?a=${myTrainer.answers}`);
  };
  const joinWithSaved = (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed || !done) return;
    setPendingJoin(trainer.id, trimmed); navigate(`/t/${trainer.id}/joined?a=${done.join('')}`);
  };
  const startQuiz = (event: FormEvent) => {
    event.preventDefault();
    if (!trimmed) return;
    setPendingJoin(trainer.id, trimmed); clearAnswers(); navigate('/quiz');
  };
  return (
    <section className="tm">
      <h1 className="tm-title">{trainer.name} 트레이너가<br /><em>도감에 초대</em>했어요</h1>
      <div className="tm-invite-card"><TrainerCard trainer={trainer} partyCount={teamParty(team).length} found={dexOwners(team).size} /></div>
      {full ? (
        <div className="tm-full">
          <p>이 도감은 자리가 가득 찼어요.<br />나만의 도감을 만들어 친구들을 모아보세요.</p>
          <Link className="poster-button tm-wide" to={myTeamCode() ? `/t/${myTeamCode()}` : '/quiz'}>{myTeamCode() ? '내 도감 보러 가기' : '나도 도감 만들기'} <ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" /></Link>
        </div>
      ) : myTrainer === undefined ? (
        <div className="tm-actions"><button type="button" className="poster-button tm-wide" disabled>내 도감 확인 중…</button></div>
      ) : myTrainer && myTrainerPokemon ? (
        <div className="tm-actions">
          <button type="button" className="poster-button tm-wide" onClick={joinAsTrainer}>{myTrainer.name} · {toward(myTrainerPokemon.name)} 등록하기 <ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" /></button>
          <p className="tm-join-note">내 트레이너로 등록되고, {trainer.name} 트레이너도 내 도감에 들어와요</p>
        </div>
      ) : done && myPokemon ? (
        <form onSubmit={joinWithSaved}>
          <label className="tm-field">
            <span>도감에 남길 이름</span>
            <input value={name} maxLength={12} onChange={event => setName(event.target.value)} placeholder="예: 하은" autoComplete="nickname" />
            <small>이미 해 본 테스트 결과로 바로 등록돼요</small>
          </label>
          <button className="poster-button tm-wide" disabled={!trimmed}>{toward(myPokemon.name)} 등록하기 <ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" /></button>
        </form>
      ) : (
        <form onSubmit={startQuiz}>
          <label className="tm-field">
            <span>도감에 남길 이름</span>
            <input value={name} maxLength={12} onChange={event => setName(event.target.value)} placeholder="예: 하은" autoComplete="nickname" />
            <small>{questions.length}개의 질문에 답하면 내 포켓몬으로 도감에 등록돼요</small>
          </label>
          <button className="poster-button tm-wide" disabled={!trimmed}>테스트하고 등록하기 <ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" /></button>
        </form>
      )}
      <p className="tm-note">이메일 가입 없이 이용할 수 있어요<br />내가 만든 도감이라면 도감 관리 링크로 열어주세요</p>
    </section>
  );
}
