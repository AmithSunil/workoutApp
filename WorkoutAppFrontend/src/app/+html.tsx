import { ScrollViewStyleReset } from 'expo-router/html';
import type { PropsWithChildren } from 'react';

/**
 * Web-only document shell (expo-router static export). Makes the web build an
 * installable PWA: manifest + icons in /public, and the Apple tags iOS reads on
 * "Add to Home Screen". viewport-fit=cover is what lets safe-area insets work.
 * ponytail: no service worker -- Chrome installs without one and there is no
 * stale-cache problem to manage. Add one when offline use is wanted.
 */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: 'body{background-color:#F4F5F7}' }} />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F4F5F7" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Corda" />
      </head>
      <body>{children}</body>
    </html>
  );
}
