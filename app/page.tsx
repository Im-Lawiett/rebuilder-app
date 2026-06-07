'use client';

import { useEffect } from 'react';
import { BODY_HTML } from './html-content';

export default function Home() {
  useEffect(() => {
    if (document.getElementById('__rebuilder_app_js__')) return;

    const script = document.createElement('script');
    script.id = '__rebuilder_app_js__';
    script.src = '/app.js';
    script.async = false;
    document.body.appendChild(script);

    return () => {
      const el = document.getElementById('__rebuilder_app_js__');
      if (el) el.remove();
    };
  }, []);

  return (
    <div
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: BODY_HTML }}
    />
  );
}
