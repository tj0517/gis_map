import { signIn } from "next-auth/react"
import Head from "next/head"

export default function LoginPage() {
  return (
    <>
      <Head>
        <title>UXO WebGIS · SeaClouds</title>
      </Head>
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1923",
        fontFamily: "system-ui, sans-serif",
      }}>
        <div style={{
          background: "#1a2632",
          border: "1px solid #2a3a4a",
          borderRadius: 12,
          padding: "48px 56px",
          textAlign: "center",
          maxWidth: 400,
          width: "100%",
        }}>
          {/* Logo / tytuł */}
          <div style={{ marginBottom: 32 }}>
            <div style={{
              width: 56, height: 56,
              background: "#1F4E79",
              borderRadius: 12,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 16px",
              fontSize: 24,
            }}>
              🌊
            </div>
            <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 500, margin: "0 0 6px" }}>
              UXO Phase 2 · WebGIS
            </h1>
            <p style={{ color: "#6b8099", fontSize: 14, margin: 0 }}>
              SC2503 · SeaClouds sp. z o.o.
            </p>
          </div>

          {/* Przycisk logowania */}
          <button
            onClick={() => signIn("azure-ad", { callbackUrl: "/" })}
            style={{
              width: "100%",
              padding: "12px 24px",
              background: "#0078D4",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 500,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
              <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
              <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
              <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
              <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
            </svg>
            Zaloguj przez Microsoft
          </button>

          <p style={{ color: "#4a6070", fontSize: 12, marginTop: 20 }}>
            Wymagane konto Microsoft autoryzowane przez SeaClouds
          </p>
        </div>
      </div>
    </>
  )
}
