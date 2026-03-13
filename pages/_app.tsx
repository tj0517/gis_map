import type { AppProps } from "next/app"
import { SessionProvider } from "next-auth/react"

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  return (
    <SessionProvider session={session}>
      <style global jsx>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { height: 100%; overflow: hidden; }
        #__next { height: 100%; }
        @keyframes spin { to { transform: rotate(360deg); } }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0f1923; }
        ::-webkit-scrollbar-thumb { background: #1e2f3e; border-radius: 2px; }
        select option { background: #1a2632; }
      `}</style>
      <Component {...pageProps} />
    </SessionProvider>
  )
}
