import { readFileSync } from 'fs';
import { join } from 'path';
import Script from 'next/script';

export const dynamic = 'force-static';

export default function Home() {
  const html = readFileSync(join(process.cwd(), 'public', 'body.html'), 'utf-8');
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      <Script src="/app.js" strategy="afterInteractive" />
    </>
  );
}
