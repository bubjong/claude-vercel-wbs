'use client';

import { useState } from 'react';
import { CacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { ChakraProvider, defaultSystem } from '@chakra-ui/react';

// Next.js App Router(Streaming SSR) + Emotion 조합에서 발생하는 hydration mismatch를 막기 위해
// Emotion이 SSR 단계에서 모은 CSS를 React 트리가 아니라 <head>로 inject한다.
export function Provider({ children }: { children: React.ReactNode }) {
  const [cache] = useState(() => {
    const c = createCache({ key: 'css' });
    c.compat = true;
    return c;
  });

  useServerInsertedHTML(() => (
    <style
      data-emotion={`${cache.key} ${Object.keys(cache.inserted).join(' ')}`}
      dangerouslySetInnerHTML={{
        __html: Object.values(cache.inserted).join(' '),
      }}
    />
  ));

  return (
    <CacheProvider value={cache}>
      <ChakraProvider value={defaultSystem}>{children}</ChakraProvider>
    </CacheProvider>
  );
}
