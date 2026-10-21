import { useEffect, useState } from 'react';

// 초대 링크 QR 코드. QR을 만드는 코드는 처음 펼칠 때만 불러와요.
export function InviteQr({ id, url }: { id: string; url: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    import('qrcode')
      .then(({ toString }) => toString(url, { type: 'svg', margin: 2, errorCorrectionLevel: 'M', color: { dark: '#254b3d', light: '#ffffff' } }))
      .then(svg => { if (alive) setSrc(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`); })
      .catch(() => { /* QR을 못 만들어도 링크 복사와 공유는 그대로 쓸 수 있어요. */ });
    return () => { alive = false; };
  }, [url]);
  return (
    <div id={id} className="dx-qr">
      <div className="dx-qr-code">{src && <img src={src} alt="초대 링크 QR 코드" width="104" height="104" />}</div>
      <p><strong>카메라로 찍어 초대해요</strong>친구가 찍으면 바로 초대 화면이 열리고, 테스트하면 내 도감에 등록돼요</p>
    </div>
  );
}
