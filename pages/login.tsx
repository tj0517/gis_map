import { signIn, useSession } from "next-auth/react"
import { useRouter } from "next/router"
import { useEffect, useState } from "react"
import Head from "next/head"

export default function LoginPage() {
  const { status } = useSession()
  const router = useRouter()
  const [signingIn, setSigningIn] = useState(false)

  // Jeśli już zalogowany — przekieruj na mapę
  useEffect(() => {
    if (status === "authenticated") router.push("/")
  }, [status])

  // Błąd z NextAuth (np. ?error=OAuthCallback)
  const error = router.query.error as string | undefined

  const handleSignIn = () => {
    setSigningIn(true)
    signIn("azure-ad", { callbackUrl: "/" })
  }

  if (status === "loading" || status === "authenticated") {
    return (
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#0f1923",
      }}>
        <div style={{
          width: 32, height: 32,
          border: "3px solid #1e2f3e",
          borderTop: "3px solid #378ADD",
          borderRadius: "50%",
          animation: "spin 1s linear infinite",
        }}/>
      </div>
    )
  }

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
            <img src="/SeaClouds_kolo.png" width="120" style={{ marginBottom: 16 }} />
            <h1 style={{ color: "#fff", fontSize: 20, fontWeight: 500, margin: "0 0 6px" }}>
              UXO Phase 2 · WebGIS
            </h1>
            <p style={{ color: "#6b8099", fontSize: 14, margin: 0 }}>
              SC2503 · SeaClouds sp. z o.o.
            </p>
          </div>

          {/* Błąd autoryzacji */}
          {error && (
            <div style={{
              background: "#3a1a1a",
              border: "1px solid #A32D2D",
              borderRadius: 8,
              padding: "10px 16px",
              marginBottom: 20,
              color: "#F09595",
              fontSize: 13,
            }}>
              {error === "OAuthCallback"
                ? "Błąd autoryzacji. Sprawdź konfigurację Azure AD."
                : error === "OAuthSignin"
                ? "Nie udało się rozpocząć logowania."
                : error === "AccessDenied"
                ? "Brak dostępu. Skontaktuj się z administratorem."
                : `Błąd logowania: ${error}`}
            </div>
          )}

          {/* Przycisk logowania */}
          <button
            onClick={handleSignIn}
            disabled={signingIn}
            style={{
              width: "100%",
              padding: "12px 24px",
              background: signingIn ? "#004E8A" : "#0078D4",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 500,
              cursor: signingIn ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: signingIn ? 0.7 : 1,
            }}
          >
            {signingIn ? (
              <>
                <div style={{
                  width: 16, height: 16,
                  border: "2px solid rgba(255,255,255,0.3)",
                  borderTop: "2px solid #fff",
                  borderRadius: "50%",
                  animation: "spin 1s linear infinite",
                }}/>
                Logowanie…
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 21 21" fill="none">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                </svg>
                Zaloguj przez Microsoft
              </>
            )}
          </button>

          <p style={{ color: "#4a6070", fontSize: 12, marginTop: 20 }}>
            Wymagane konto Microsoft autoryzowane przez SeaClouds
          </p>
        </div>
      </div>
    </>
  )
}
