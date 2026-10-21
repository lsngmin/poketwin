// 검색엔진과 AI(대형 언어 모델) 크롤러가 읽는 파일 세 개를 빌드할 때 만들어요.
//   robots.txt  : 검색엔진과 주요 LLM 크롤러를 모두 허용하고, 사이트맵 위치를 알려요.
//   sitemap.xml : 누구나 볼 수 있는 공개 페이지 목록. 결과(?a=)·도감(/t/)처럼 개인 링크는 넣지 않아요.
//   llms.txt    : AI가 사이트를 한 번에 이해하도록 쓴 소개(https://llmstxt.org 형식).
// 포켓몬·질문 데이터에서 바로 만들어서, 포켓몬이나 질문이 바뀌어도 따로 고칠 필요가 없어요.
import type { Plugin } from 'vite';
import { pokemon } from '../src/data/pokemon';
import { dimensions, questions } from '../src/data/questions';
import { SITE } from '../src/lib/linkPreview';

const species = [...pokemon].sort((a, b) => a.id - b.id);
const pages = [
  { path: '/', title: '홈', note: '테스트를 시작하는 첫 화면' },
  { path: '/quiz', title: '테스트', note: `질문 ${questions.length}개에 답하는 성향 테스트` },
  { path: '/collection', title: '포켓몬 도감', note: `${pokemon.length}종 포켓몬의 성향과 파트너 조합` },
  { path: '/about', title: '테스트 소개', note: '테스트 방식, 결과 공유, 트레이너 도감 안내' },
  { path: '/privacy', title: '개인정보 처리방침', note: '저장하는 정보와 보관·삭제 방법' },
];

// 검색엔진은 모두(*) 허용하고, LLM 크롤러는 이름을 하나씩 적어 학습·검색·답변용 모두 허용한다고 분명히 해요.
const llmBots = [
  'GPTBot', 'OAI-SearchBot', 'ChatGPT-User',
  'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'anthropic-ai',
  'Google-Extended', 'Applebot-Extended',
  'PerplexityBot', 'Perplexity-User',
  'meta-externalagent', 'Amazonbot', 'CCBot', 'cohere-ai', 'MistralAI-User', 'DuckAssistBot',
];

function robots() {
  return [
    '# 포켓트윈 크롤링 규칙: 검색엔진과 대형 언어 모델(LLM) 크롤러를 모두 허용해요.',
    '# 사이트 소개는 /llms.txt, 공개 페이지 목록은 /sitemap.xml에 있어요.',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    '# 대형 언어 모델(LLM) 크롤러: 학습·검색·답변용 모두 허용',
    ...llmBots.map(bot => `User-agent: ${bot}`),
    'Allow: /',
    '',
    `Sitemap: ${SITE}/sitemap.xml`,
    '',
  ].join('\n');
}

function sitemap() {
  const paths = ['/', '/quiz', '/collection', ...species.map(p => `/pokemon/${p.id}`), '/about', '/privacy'];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...paths.map(path => `  <url><loc>${SITE}${path}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
}

function llms() {
  const perDimension = questions.length / dimensions.length;
  return [
    '# 포켓트윈',
    '',
    `> ${questions.length}개의 일상 질문으로 나와 닮은 포켓몬을 찾는 성향 테스트예요. 다섯 가지 성향의 조합으로 ${pokemon.length}종 포켓몬 중 하나와 이어지고, 결과를 친구와 나누거나 친구들로 트레이너 도감을 채우며 서로의 궁합을 볼 수 있어요.`,
    '',
    '포켓트윈은 Pokémon 공식 서비스와 제휴하지 않은 팬 프로젝트예요. 테스트 결과는 게임의 공식 성격 설정, 능력치, 타입 상성과 관계가 없어요. 회원가입 없이 무료로 이용할 수 있어요.',
    '',
    '## 테스트 방식',
    '',
    `- 질문은 ${questions.length}개이고, 성향 하나를 ${perDimension}개 질문으로 살펴봐요. 같은 답을 고르면 언제나 같은 결과가 나와요.`,
    '- 다섯 가지 성향과 양쪽 끝:',
    ...dimensions.map(d => `  - ${d.name}: ${d.low} ↔ ${d.high}`),
    `- 다섯 성향이 각각 어느 쪽인지(2×2×2×2×2 = ${2 ** dimensions.length}가지 조합)에 따라 포켓몬 한 종이 정해져요.`,
    '- 결과 화면에는 닮은 포켓몬, 다섯 성향의 정도, 찰떡 파트너와 티격태격 파트너가 나와요.',
    '- 트레이너 도감: 테스트를 마친 사람이 도감을 만들고 초대 링크를 보내면, 친구의 포켓몬이 도감에 하나씩 모여요.',
    '',
    '## 주요 페이지',
    '',
    ...pages.map(p => `- [${p.title}](${SITE}${p.path}): ${p.note}`),
    '',
    `## 포켓몬 ${pokemon.length}종`,
    '',
    ...species.map(p => `- [${p.name}](${SITE}/pokemon/${p.id}) (${p.type}): ${p.title} · ${p.tags.map(tag => `#${tag}`).join(' ')}`),
    '',
  ].join('\n');
}

const files: Record<string, { type: string; body: () => string }> = {
  'robots.txt': { type: 'text/plain; charset=utf-8', body: robots },
  'sitemap.xml': { type: 'application/xml; charset=utf-8', body: sitemap },
  'llms.txt': { type: 'text/plain; charset=utf-8', body: llms },
};

export function seoFiles(): Plugin {
  return {
    name: 'poketwin-seo-files',
    // 개발 서버에서도 같은 주소로 확인할 수 있게 해요.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const file = files[(req.url ?? '').split('?')[0].slice(1)];
        if (!file) return next();
        res.setHeader('Content-Type', file.type);
        res.end(file.body());
      });
    },
    generateBundle() {
      for (const [fileName, file] of Object.entries(files)) this.emitFile({ type: 'asset', fileName, source: file.body() });
    },
  };
}
