import { lazy, StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Quiz } from './pages/Quiz';
import { Collection } from './pages/Collection';
import { Result } from './pages/Result';
import { About, Privacy, NotFound } from './pages/Info';
// 팀 화면은 supabase-js를 쓰므로 필요할 때만 불러옵니다.
const TrainerNew = lazy(() => import('./pages/TrainerNew').then(m => ({ default: m.TrainerNew })));
const Team = lazy(() => import('./pages/Team').then(m => ({ default: m.Team })));
const TeamJoined = lazy(() => import('./pages/TeamJoined').then(m => ({ default: m.TeamJoined })));
const TeamVs = lazy(() => import('./pages/TeamVs').then(m => ({ default: m.TeamVs })));
const TeamManage = lazy(() => import('./pages/TeamManage').then(m => ({ default: m.TeamManage })));
const loading = <section className="tm-route-loading" aria-busy="true" />;
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import './styles.css';
// 기존 공유 링크도 새 경로로 연결합니다.
if (window.location.hash.startsWith('#/')) {
  const legacy = new URL(window.location.hash.slice(1), window.location.origin);
  if (legacy.origin === window.location.origin) {
    window.history.replaceState(null, '', legacy.pathname + legacy.search + legacy.hash);
  }
}
createRoot(document.getElementById('root')!).render(<StrictMode><BrowserRouter><Routes><Route element={<Layout />}><Route index element={<Home />} /><Route path="quiz" element={<Quiz />} /><Route path="collection" element={<Collection />} /><Route path="result" element={<Result />} /><Route path="pokemon/:id" element={<Result />} /><Route path="trainer/new" element={<Suspense fallback={loading}><TrainerNew /></Suspense>} /><Route path="t/:code" element={<Suspense fallback={loading}><Team /></Suspense>} /><Route path="t/:code/joined" element={<Suspense fallback={loading}><TeamJoined /></Suspense>} /><Route path="t/:code/manage" element={<Suspense fallback={loading}><TeamManage /></Suspense>} /><Route path="t/:code/vs/:a/:b" element={<Suspense fallback={loading}><TeamVs /></Suspense>} /><Route path="about" element={<About />} /><Route path="privacy" element={<Privacy />} /><Route path="*" element={<NotFound />} /></Route></Routes></BrowserRouter></StrictMode>);
