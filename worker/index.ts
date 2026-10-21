// 포켓트윈 Cloudflare Worker: 정적 파일은 그대로 보내고, 결과·포켓몬·도감 초대 주소의 HTML에만
// 링크 미리보기(og:·twitter:) 값을 그 주소에 맞게 바꿔 넣어요. 실제 화면은 지금처럼 앱이 그려요.
// wrangler.jsonc의 run_worker_first에 적힌 주소에서만 이 코드가 먼저 실행돼요.
import { previewFor, SITE } from '../src/lib/linkPreview';

interface Env { ASSETS: { fetch(request: Request): Promise<Response> } }
interface Element { setAttribute(name: string, value: string): void; setInnerContent(content: string): void }
declare class HTMLRewriter { on(selector: string, handlers: { element(element: Element): void }): HTMLRewriter; transform(response: Response): Response }

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const response = await env.ASSETS.fetch(request);
    if (!(response.headers.get('content-type') ?? '').includes('text/html')) return response;
    const url = new URL(request.url);
    const preview = previewFor(url.pathname, url.search);
    if (!preview) return response;
    const image = `${SITE}${preview.image}`;
    const values: [string, string][] = [
      ['meta[property="og:title"]', preview.title],
      ['meta[name="twitter:title"]', preview.title],
      ['meta[property="og:description"]', preview.description],
      ['meta[name="twitter:description"]', preview.description],
      ['meta[property="og:image"]', image],
      ['meta[name="twitter:image"]', image],
      ['meta[property="og:url"]', `${SITE}${preview.path}`],
    ];
    const rewriter = values.reduce((r, [selector, value]) => r.on(selector, { element(element) { element.setAttribute('content', value); } }), new HTMLRewriter());
    return rewriter.on('title', { element(element) { element.setInnerContent(`${preview.title} · 포켓트윈`); } }).transform(response);
  },
};
