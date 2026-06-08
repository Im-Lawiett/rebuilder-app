import { readFileSync } from 'fs';
import { join } from 'path';

export const dynamic = 'force-static';

export default function Home() {
  const html = readFileSync(join(process.cwd(), 'public', 'body.html'), 'utf-8');
  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: html }} />
      {/* defer ensures script runs after HTML parsed but BEFORE DOMContentLoaded fires */}
      {/* eslint-disable-next-line @next/next/no-sync-scripts */}
      <script src="/app.js" defer={true} />
    </>
  );
}
