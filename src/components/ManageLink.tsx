import { useEffect, useState } from 'react';
import { Check, Copy, Send, X } from 'lucide-react';
import { finishManageNotice, getManageKey, manageNoticeDone, manageUrl } from '../lib/team';
import { track } from '../lib/analytics';

// 도감 관리 링크: 다른 브라우저·새 휴대폰에서도 내 도감을 다시 관리할 수 있게 나만 간직하는 링크예요.
// notice는 도감 위쪽에 한 번 뜨는 안내 카드(닫거나 저장하면 다시 안 떠요), menu는 '도감 관리' 안에 늘 있는 칸이에요.
// 휴대폰에서는 '나에게 보내기'로 카카오톡 나와의 채팅이나 메모에 바로 넣을 수 있어요.
export function ManageLink({ code, variant }: { code: string; variant: 'notice' | 'menu' }) {
  const [hidden, setHidden] = useState(() => variant === 'notice' && manageNoticeDone(code));
  const [key, setKey] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  // ×를 누르면 바로 사라지지 않고, 링크가 어디 있는지 알려주는 한 줄로 잠깐 바뀌어요.
  const [closed, setClosed] = useState(false);
  // 복사가 막힌 브라우저(일부 앱 안 브라우저)에서는 링크를 직접 보여줘서 길게 눌러 복사하게 해요.
  const [manual, setManual] = useState(false);
  useEffect(() => {
    if (hidden) return;
    let alive = true;
    getManageKey(code).then(value => { if (alive) setKey(value); }).catch(() => { /* SQL을 아직 실행하지 않았으면 안 보여요 */ });
    return () => { alive = false; };
  }, [code, hidden]);
  useEffect(() => {
    if (!closed) return;
    const timer = setTimeout(() => setHidden(true), 8000);
    return () => clearTimeout(timer);
  }, [closed]);
  if (hidden || !key) return null;
  // 공유 창이 없는 브라우저(대부분의 컴퓨터)에서는 '나에게 보내기'가 복사와 똑같아서 복사 하나만 보여줘요.
  const canShare = typeof navigator.share === 'function';
  const url = manageUrl(code, key);
  const saved = () => { if (variant === 'notice') finishManageNotice(code); };
  const copy = async () => {
    track('share', { method: 'copy_link', content_type: 'manage_link' });
    try { await navigator.clipboard.writeText(url); setStatus('복사했어요, 메모나 나와의 채팅에 붙여넣어 두세요'); saved(); }
    catch { setManual(true); setStatus('여기서는 자동 복사가 안 돼요, 아래 링크를 길게 눌러 복사해주세요'); }
  };
  const send = async () => {
    if (!navigator.share) { await copy(); return; }
    track('share', { method: 'native', content_type: 'manage_link' });
    try { await navigator.share({ title: '내 도감 관리 링크', text: '포켓트윈 도감 관리 링크예요, 나만 간직하세요', url }); setStatus('보냈어요, 이 링크는 나만 간직하세요'); saved(); }
    catch (err) { if (!(err instanceof DOMException && err.name === 'AbortError')) await copy(); }
  };
  const close = () => { finishManageNotice(code); setClosed(true); };
  // 맨 아래 '도감 관리'를 펼치고 그 자리로 내려가요.
  const openMenu = () => {
    const menu = document.querySelector<HTMLDetailsElement>('.tm-manage');
    if (!menu) return;
    menu.open = true;
    menu.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setHidden(true);
  };
  if (closed) return (
    <p className="ml-closed" role="status">
      도감 관리 링크는 맨 아래 ‘도감 관리’에서 언제든 다시 꺼낼 수 있어요
      <button type="button" onClick={openMenu}>바로 보기</button>
    </p>
  );
  return (
    <aside className={`ml ${variant}`} aria-label="도감 관리 링크">
      {variant === 'notice' && <button type="button" className="ml-close" aria-label="안내 닫기" onClick={close}><X size={18} strokeWidth={2.8} /></button>}
      <strong>{variant === 'notice' ? '도감 관리 링크를 저장해두세요' : '도감 관리 링크'}</strong>
      <p>{variant === 'notice'
        ? '도감은 지금 이 브라우저에 연결돼 있어요. 카카오톡 안 브라우저나 다른 휴대폰에서도 내 도감을 관리하려면 이 링크가 필요해요'
        : '다른 휴대폰이나 브라우저에서 이 링크를 열면 내 도감을 다시 관리할 수 있어요'}</p>
      <div className={`ml-actions${canShare ? '' : ' single'}`}>
        {canShare && <button type="button" className="poster-button" onClick={send}><Send size={18} strokeWidth={2.6} aria-hidden="true" /> 나에게 보내기</button>}
        <button type="button" className={canShare ? 'tm-ghost' : 'poster-button'} onClick={copy}><Copy size={17} strokeWidth={2.6} aria-hidden="true" /> {canShare ? '링크 복사' : '도감 관리 링크 복사'}</button>
      </div>
      {manual && <input className="ml-url" readOnly value={url} aria-label="도감 관리 링크" onFocus={event => event.currentTarget.select()} />}
      <p className="ml-status" role="status">{status && <><Check size={15} strokeWidth={2.8} aria-hidden="true" />{status}</>}</p>
      <small>친구에게는 초대 링크를 보내고, 이 링크는 나만 간직하세요</small>
    </aside>
  );
}
