import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { compare } from "bcryptjs";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.email, email))
          .limit(1);

        if (!user || !user.isActive) return null;

        // Rate limiting: 5 attempts = 1 hour lockout
        if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
          throw new Error("Conta temporariamente bloqueada. Tente novamente mais tarde.");
        }

        const isValid = await compare(password, user.password);

        if (!isValid) {
          const attempts = (user.loginAttempts ?? 0) + 1;
          const updateData: Record<string, unknown> = { loginAttempts: attempts };
          if (attempts >= 5) {
            updateData.lockedUntil = new Date(Date.now() + 60 * 60 * 1000);
            updateData.loginAttempts = 0;
          }
          await db.update(users).set(updateData).where(eq(users.id, user.id));
          return null;
        }

        // Reset login attempts on success
        await db
          .update(users)
          .set({ loginAttempts: 0, lockedUntil: null })
          .where(eq(users.id, user.id));

        return {
          id: String(user.id),
          name: user.name,
          email: user.email,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        (session.user as any).role = token.role;
      }
      return session;
    },
  },
});
