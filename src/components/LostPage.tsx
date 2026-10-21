import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import './LostPage.css';

// 없는 주소나 잘못된 결과 링크로 왔을 때 보여주는 화면입니다.
export function LostPage({ title, text, to, label }: { title: string; text: string; to: string; label: string }) {
  return (
    <section className="lost">
      <img src="/pokemon/54.png" alt="" width="260" height="260" />
      <h1>{title}</h1>
      <p>{text}</p>
      <Link className="poster-button" to={to}>{label}<ArrowRight size={22} strokeWidth={2.6} aria-hidden="true" /></Link>
    </section>
  );
}
