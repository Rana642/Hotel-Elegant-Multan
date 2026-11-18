import { GET as llmsGET } from '../llms.txt/route';

// Markdown representation of the homepage. next.config rewrites "/" here
// when a client sends "Accept: text/markdown" (agents ask for this to save
// tokens versus HTML).
export const revalidate = 3600;

export async function GET() {
  const res = await llmsGET();
  return new Response(await res.text(), {
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      Vary: 'Accept',
    },
  });
}
