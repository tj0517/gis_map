import NextAuth, { NextAuthOptions } from "next-auth"
import AzureADProvider from "next-auth/providers/azure-ad"
import { createClient } from "@supabase/supabase-js"

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: "common",  // Multi-tenant: accepts any Microsoft Entra tenant
      authorization: {
        params: {
          scope: "openid profile email offline_access Files.Read Sites.Read.All",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      // Whitelist check for external users. Only emails in Supabase allowed_users (active=true) can sign in.
      const email = user?.email?.toLowerCase()?.trim()
      if (!email) {
        console.warn("[NextAuth signIn] Denied: no email from provider")
        return false
      }

      // Always allow @seaclouds.eu (internal — home tenant)
      if (email.endsWith("@seaclouds.eu")) {
        console.log(`[NextAuth signIn] Allowed (internal): ${email}`)
        return true
      }

      // External users: must exist in Supabase allowed_users with active=true.
      // Fail closed — deny on any error or miss.
      try {
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
        )
        const { data, error } = await supabase
          .from("allowed_users")
          .select("email, active")
          .eq("email", email)
          .eq("active", true)
          .maybeSingle()

        if (error) {
          console.error(`[NextAuth signIn] Denied: Supabase error for ${email}:`, error.message)
          return false
        }
        if (!data) {
          console.warn(`[NextAuth signIn] Denied (not whitelisted): ${email}`)
          return false
        }

        console.log(`[NextAuth signIn] Allowed (whitelisted): ${email}`)
        return true
      } catch (err) {
        console.error(`[NextAuth signIn] Denied: unexpected error for ${email}:`, err)
        return false
      }
    },
    async jwt({ token, account }) {
      // Zapisz access token przy pierwszym logowaniu
      if (account) {
        token.accessToken = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt = account.expires_at
      }
      return token
    },
    async session({ session, token }) {
      // Przekaż access token do sesji
      session.accessToken = token.accessToken as string
      return session
    },
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  debug: process.env.NODE_ENV === "development",
  secret: process.env.NEXTAUTH_SECRET,
}

export default NextAuth(authOptions)
