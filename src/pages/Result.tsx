import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Download, Link as LinkIcon, RotateCcw, Sparkles, Heart, Check, Share2 } from 'lucide-react';
import type { CSSProperties } from 'react';
import { getPokemon, pokemon as allPokemon } from '../data/pokemon';
import { dimensions, questions } from '../data/questions';
import { decodeAnswers, matchPokemon } from '../lib/matching';
import { subject, toward } from '../lib/compat';
import { clearAnswers, readAnswers } from '../lib/storage';
import { prefetchStory, saveResultImage, shareStory } from '../lib/share';
import { kakaoEnabled, preloadKakao, shareImageUrl, shareToKakao } from '../lib/kakao';
import { openXPost, ShareApps } from '../components/ShareApps';
import { LostPage } from '../components/LostPage';
import { TraitMeter } from '../components/TraitMeter';
import { hasTeamSession, myTeamCode, teamEnabled } from '../lib/teamLocal';
import { collectionPlace } from '../lib/collectionPlace';
import { backLabel, tripFor } from '../lib/backTrail';
import { track, type ShareMethod } from '../lib/analytics';
import './Result.css';

const backText = (label: string) => label === '뒤로' ? '뒤로 가기' : `${toward(label)} 돌아가기`;
// 마지막 문장의 온점만 뺍니다.
const unperiod = (text: string) => text.replace(/\.$/, '');
export function Result() {
  const { id } = useParams(); const [params] = useSearchParams();
  const answers = decodeAnswers(params.get('a'));
  const result = !id && answers ? matchPokemon(answers) : null;
  const pokemon = id ? getPokemon(Number(id)) : result?.pokemon;
  const navigate = useNavigate();
  const { key } = useLocation();
  const trip = result ? null : tripFor(key);
  // 이미 테스트를 했거나 도감이 있는 사람에게는 '나도 포켓트윈 찾기' 대신 왔던 곳으로 돌아가는 버튼을 보여줘요.
  // 트레이너 도감이나 내 결과에서 넘어왔거나, 내 도감이 있거나, 끝까지 푼 답변이 남아 있으면 이미 해본 사람이에요.
  const from = trip?.origin.pathname ?? '';
  // 결과 링크에는 결과 주인의 답변이 담겨 있어요. 이 브라우저에서 끝까지 푼 답변과 같을 때만 내 결과로 봐요.
  // 공유받아 들어온 친구에게는 '친구의 결과'로 보여주고, 트레이너 되기도 친구 자신의 답변으로만 이어줘요.
  const saved = readAnswers();
  const myAnswers = saved.length === questions.length ? saved.join('') : null;
  const mine = Boolean(result) && myAnswers === answers?.join('');
  const alreadyTested = !result && (from.startsWith('/t/') || from === '/result' || Boolean(myTeamCode()) || myAnswers !== null);
  const [saving, setSaving] = useState(false);
  // 알림은 5초 뒤에 사라져요. 같은 문구를 다시 띄워도 시간이 처음부터 다시 흘러요.
  const [notice, setNoticeState] = useState({ text: '', at: 0 });
  const setNotice = (text: string) => setNoticeState({ text, at: Date.now() });
  useEffect(() => {
    if (!notice.text) return;
    const timer = setTimeout(() => setNoticeState({ text: '', at: 0 }), 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const [storyFile, setStoryFile] = useState<File | null>(null);
  // 인스타그램 공유는 누르자마자 공유창을 띄워야 해서 스토리 그림을 미리 받아 둡니다. 카카오 SDK도 이때 불러와요.
  // 도감에서 둘러보는 포켓몬 화면에는 공유가 없어서 만들지 않아요.
  const isResult = Boolean(result);
  useEffect(() => {
    if (!pokemon || !isResult) return;
    let cancelled = false;
    setStoryFile(null);
    const timer = window.setTimeout(() => {
      preloadKakao();
      prefetchStory(`/share/story-pokemon-${pokemon.id}.png`, `poketwin-story-${pokemon.english.toLowerCase()}.png`).then(file => { if (!cancelled) setStoryFile(file); }).catch(() => { /* 누를 때 다시 받아요 */ });
    }, 800);
    return () => { cancelled = true; window.clearTimeout(timer); };
  }, [pokemon, isResult]);
  if (!pokemon) return <LostPage title="결과를 찾지 못했어요" text="결과 링크가 올바른지 확인하거나 새로운 모험을 시작해보세요." to="/quiz" label="나의 포켓트윈 찾기" />;
  const partner = getPokemon(pokemon.partner)!;
  const clashPartner = getPokemon(pokemon.clashPartner)!;
  const copy = async () => {
    try { await navigator.clipboard.writeText(window.location.href); setNotice('결과 링크를 복사했어요! 친구에게 보내보세요'); }
    catch { setNotice('링크 복사가 지원되지 않아요, 주소창의 링크를 복사해주세요'); }
  };
  const share = async () => {
    if (!navigator.share) { await copy(); return; }
    try { await navigator.share({ title: `나와 닮은 포켓몬은 ${pokemon.name}!`, text: `${pokemon.title} · 당신의 포켓몬도 찾아보세요.`, url: window.location.href }); }
    catch (error) { if (!(error instanceof DOMException && error.name === 'AbortError')) await copy(); }
  };
  const shareKakao = async () => {
    if (!kakaoEnabled) { await share(); return; }
    const origin = window.location.origin;
    try {
      await shareToKakao({
        title: `나와 닮은 포켓몬은 ${pokemon.name}!`,
        // 설명은 친구가 직접 해보고 싶게 만드는 한 줄만. 포켓몬 소개는 그림 카드에 들어 있어요.
        description: '너는 어떤 포켓몬일까? 질문 15개면 바로 알 수 있어요',
        // 포켓몬마다 scripts/share-images.py로 만든 결과 그림이에요.
        imageUrl: shareImageUrl(`/share/pokemon-${pokemon.id}.png`),
        url: window.location.href,
        buttons: [{ title: '결과 보기', url: window.location.href }, { title: '나도 해보기', url: `${origin}/quiz` }],
      });
    } catch { setNotice('카카오톡을 열지 못했어요, 잠시 후 다시 시도해주세요'); }
  };
  const shareX = () => {
    // 결과 포켓몬과 친구에게 묻는 한 줄만 써요. 소개는 링크 미리보기 카드에 나와요.
    openXPost(`나와 닮은 포켓몬은 ${pokemon.name}!\n너는 어떤 포켓몬일까?`, window.location.href);
  };
  // 공유는 누른 수단 그대로 기록해요(공유 창이 없어 복사로 넘어가도 처음 누른 버튼 기준).
  const tracked = (method: ShareMethod, run: () => unknown) => () => { track('share', { method, content_type: 'result', item_id: String(pokemon.id) }); void run(); };
  // 인스타그램은 웹에서 링크를 바로 보낼 수 없어서, 스토리 그림(9:16)을 공유 창으로 넘기고 결과 링크는 복사해 둬요.
  // 겉으로는 일반 공유와 같은 창이라, 누르는 순간 무엇을 고르면 되는지 먼저 알려줘요.
  const shareInstagram = async () => {
    setNotice('공유 창에서 Instagram을 골라 스토리에 올려보세요, 링크는 복사해 뒀어요');
    try {
      const file = storyFile ?? await prefetchStory(`/share/story-pokemon-${pokemon.id}.png`, `poketwin-story-${pokemon.english.toLowerCase()}.png`);
      const outcome = await shareStory(file, window.location.href);
      if (outcome === 'shared') setNotice('결과 링크도 복사했어요, 스토리에 링크 스티커로 붙여보세요');
      if (outcome === 'saved') setNotice('스토리 그림을 저장하고 결과 링크도 복사했어요, 인스타에 올리고 링크 스티커로 붙여보세요');
    } catch { setNotice('그림을 준비하지 못했어요, 잠시 후 다시 시도해주세요'); }
  };
  const save = async () => { setSaving(true); try { await saveResultImage(pokemon); setNotice('결과 카드를 저장했어요, 다운로드 폴더를 확인해주세요'); } catch { setNotice('이미지를 저장하지 못했어요, 잠시 후 다시 시도해주세요'); } finally { setSaving(false); } };
  return (
    <section className="rp" style={{ '--rp-color': pokemon.color, '--rp-accent': pokemon.accent } as CSSProperties}>
      {/* 둘러보는 포켓몬 화면은 들어오기 전 화면(포켓몬 도감, 트레이너 도감, 내 결과 등)으로 돌아가요.
          파트너를 타고 여러 마리를 넘어와도 한 번에 돌아가고, 공유 링크로 바로 들어왔으면 포켓몬 도감으로 가요. */}
      {!result && (trip
        ? <button type="button" className="rp-back" onClick={() => navigate(-trip.depth)}><ArrowLeft size={18} strokeWidth={2.6} aria-hidden="true" />{backLabel(trip.origin.pathname)}</button>
        : <Link className="rp-back" to={`/collection${collectionPlace.search}`} state={{ restore: true }}><ArrowLeft size={18} strokeWidth={2.6} aria-hidden="true" />포켓몬 도감</Link>)}
      <div className="rp-card">
        <div className="rp-card-top">
          <p>{result ? (mine ? '당신과 닮은 포켓몬은' : '친구와 닮은 포켓몬은') : '이 포켓몬의 매력을 알아봐요'}</p>
          <span className="rp-no">No. {String(pokemon.id).padStart(3, '0')} · {pokemon.type}</span>
        </div>
        <h1>{pokemon.name}<span>{pokemon.english}</span></h1>
        <img className="rp-art" src={`/pokemon/${pokemon.id}.png`} alt={pokemon.name} width="360" height="360" />
        <p className="rp-tagline">{pokemon.title}</p>
        <div className="rp-tags">{pokemon.tags.map(tag => <span key={tag}>#{tag}</span>)}</div>
      </div>
      <div className="rp-copy">
        {pokemon.description.split('\n\n').map(paragraph => <p key={paragraph}>{paragraph}</p>)}
      </div>
      <article className="rp-why">
        <div className="rp-lore">
          <span>도감 메모 · No. {String(pokemon.id).padStart(3, '0')}</span>
          <p>{pokemon.lore}</p>
        </div>
        <p className="rp-likeness">{unperiod(pokemon.likeness)}</p>
      </article>
      {result && (
        <article className="rp-map">
          <h2>{mine ? '내 마음은 이런 모습이에요' : '친구의 마음은 이런 모습이에요'}</h2>
          <div className="rp-traits">
            {dimensions.map(({ key, name, low, high, explanation }, i) => (
              <div className="rp-trait" key={key}>
                <TraitMeter name={name} low={low} high={high} score={result.scores[key]} highSide={result.code[i] === '1'} />
                <p>{unperiod(explanation[result.code[i] === '1' ? 1 : 0])}</p>
              </div>
            ))}
          </div>
        </article>
      )}
      <article className="rp-moments">
        <h2>{pokemon.name}다운 순간</h2>
        <ul>{pokemon.moments.map(moment => <li key={moment}><Check size={18} strokeWidth={3} aria-hidden="true" />{moment}</li>)}</ul>
        <div className="rp-advice">
          <span><Heart size={15} strokeWidth={2.6} aria-hidden="true" />{subject(pokemon.name)} 건네는 한마디</span>
          <p>{unperiod(pokemon.tip)}</p>
        </div>
      </article>
      <Link to={`/pokemon/${partner.id}`} className="rp-partner" style={{ '--partner-color': partner.color } as CSSProperties}>
        <div>
          <span className="rp-partner-label">찰떡 파트너</span>
          <h2>{partner.name}</h2>
          <p>{unperiod(pokemon.partnerReason)}</p>
          <span className="rp-partner-more">친구의 매력 알아보기 <ArrowRight size={17} strokeWidth={2.6} /></span>
        </div>
        <img src={`/pokemon/${partner.id}.png`} width="160" height="160" alt="" />
      </Link>
      <Link to={`/pokemon/${clashPartner.id}`} className="rp-partner rp-partner-clash" style={{ '--partner-color': clashPartner.color } as CSSProperties}>
        <div>
          <span className="rp-partner-label">티격태격 파트너</span>
          <h2>{clashPartner.name}</h2>
          <p>{unperiod(pokemon.clashReason)}</p>
          <span className="rp-partner-more">친구의 매력 알아보기 <ArrowRight size={17} strokeWidth={2.6} /></span>
        </div>
        <img src={`/pokemon/${clashPartner.id}.png`} width="160" height="160" alt="" />
      </Link>
      {result && teamEnabled && (
        <article className="rp-trainer">
          <div>
            <span className="rp-partner-label">트레이너 되기</span>
            <h2>친구들로<br />내 도감을 채워요</h2>
            <p>친구가 내 링크로 테스트하면 도감에 등록돼요, {allPokemon.length}종을 모으고 대표 파티 6마리를 골라보세요</p>
            <Link className="poster-button" to={myTeamCode() ? `/t/${myTeamCode()}` : myAnswers ? `/trainer/new?a=${myAnswers}` : '/quiz'}>{myTeamCode() ? '내 도감 보러 가기' : myAnswers ? '트레이너 되기' : '테스트하고 트레이너 되기'} <ArrowRight size={20} strokeWidth={2.6} aria-hidden="true" /></Link>
          </div>
          <img src="/trainers/red.webp" alt="" width="395" height="560" />
        </article>
      )}
      {/* 공유는 내 테스트 결과에서만. 친구의 결과를 보는 사람과 도감에서 둘러보는 포켓몬은 테스트로 이어줘요. */}
      {result && !mine ? <div className="rp-share">
        <h2>나는 어떤 포켓몬일까요?</h2>
        {!myAnswers && <p>질문 {questions.length}개면 나와 닮은 포켓몬을 찾을 수 있어요</p>}
        <div className="rp-share-actions">
          {myAnswers
            ? <Link className="poster-button" to={`/result?a=${myAnswers}`}>내 결과 보기 <ArrowRight size={20} strokeWidth={2.6} aria-hidden="true" /></Link>
            : <Link className="poster-button" to="/quiz">나도 해보기 <ArrowRight size={20} strokeWidth={2.6} aria-hidden="true" /></Link>}
        </div>
      </div> : result ? <div className="rp-share">
        <h2>나의 작은 발견을 나눠보세요</h2>
        <p>친구는 어떤 포켓몬일까요?</p>
        {/* 트레이너 도감 공유와 같은 모양: 큰 공유 버튼 하나와 아이콘 다섯 개. QR 자리에는 결과 카드 저장이 들어가요. */}
        <div className="rp-share-actions">
          <button type="button" className="poster-button" onClick={tracked('native', share)}><Share2 size={20} strokeWidth={2.6} aria-hidden="true" /> 결과 공유하기</button>
          <ShareApps onKakao={tracked('kakao', shareKakao)} onX={tracked('x', shareX)} onInstagram={tracked('instagram', shareInstagram)}>
            <button type="button" className="share-app plain" onClick={tracked('copy_link', copy)}><span className="share-app-icon"><LinkIcon size={22} strokeWidth={2.6} aria-hidden="true" /></span>링크 복사</button>
            <button type="button" className="share-app plain" disabled={saving} onClick={tracked('save_image', save)}><span className="share-app-icon"><Download size={22} strokeWidth={2.6} aria-hidden="true" /></span>{saving ? '만드는 중…' : '카드 저장'}</button>
          </ShareApps>
        </div>
        <div className="rp-notice" role="status">{notice.text && <span key={notice.at}><Check size={16} strokeWidth={2.6} aria-hidden="true" />{notice.text}</span>}</div>
        <Link className="rp-again" to="/quiz" onClick={() => { track('quiz_retake', { has_dex: Boolean(myTeamCode() || hasTeamSession()) }); clearAnswers(); }}><RotateCcw size={17} strokeWidth={2.6} />다시 해볼래요</Link>
        {/* 다시 풀어도 도감에 저장된 답변은 바뀌지 않아요. 내 도감이 있거나 친구 도감에 등록한 적 있으면 알려줘요. */}
        {teamEnabled && (myTeamCode() || hasTeamSession()) && <p className="rp-again-note">다시 해도 도감에 등록된 내 포켓몬은 그대로예요</p>}
      </div> : alreadyTested
        ? trip && <div className="rp-share"><button type="button" className="rp-again" onClick={() => navigate(-trip.depth)}><ArrowLeft size={17} strokeWidth={2.6} aria-hidden="true" />{backText(backLabel(trip.origin.pathname))}</button></div>
        : <div className="rp-share">
          <Link className="rp-again" to="/quiz" onClick={clearAnswers}><Sparkles size={17} strokeWidth={2.6} />나도 포켓트윈 찾기</Link>
        </div>}
    </section>
  );
}
