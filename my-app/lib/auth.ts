import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import prisma from "@/lib/db"; // Assurez-vous d'importer correctement votre client Prisma
import { compare } from "bcryptjs"; // Si vous utilisez bcrypt pour hacher les mots de passe
import { resolveTokenSubject } from "@/lib/domain/session";

export const { handlers, signIn, signOut, auth } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),

    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        try {
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              password: true,
              suspended: true,
            },
          });

          if (!user) {
            console.error("[auth] User not found:", email);
            return null;
          }
          if (user.suspended) {
            console.error("[auth] User is suspended:", email);
            return null;
          }
          if (!user.password) {
            console.error("[auth] User has no password (OAuth account):", email);
            return null;
          }

          const isMatched = await compare(password, user.password);
          if (!isMatched) {
            console.error("[auth] Wrong password for:", email);
            return null;
          }

          return {
            id: user.id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          };
        } catch (err) {
          console.error("[auth] authorize error:", err);
          return null;
        }
      },
    }),
  ],

  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const { email, name, image, id } = user;

          if (!email) {
            console.error("Email is required");
            return false; // Échec de la connexion
          }

          const existingUser = await prisma.user.findUnique({
            where: { email },
            select: { id: true, suspended: true },
          });

          if (existingUser?.suspended) return false;

          if (!existingUser) {
            // Créez un nouvel utilisateur sans mot de passe
            await prisma.user.create({
              data: {
                email,
                firstName: name?.split(" ")[0] || "",
                lastName: name?.split(" ")[1] || "",
                image: image || "",
                authProviderId: id,
              },
            });
          }

          return true; // Connexion réussie
        } catch (error) {
          console.error("Error while creating user:", error);
          return false; // Connexion échouée
        }
      }

      if (account?.provider === "credentials") {
        return true; // Connexion réussie pour les credentials (géré ailleurs dans authorize)
      }

      return false; // Connexion échouée pour les autres fournisseurs
    },
    async jwt({ token, user, account }) {
      // `user` et `account` ne sont fournis qu'au moment de la connexion.
      // La résolution en base n'a donc lieu qu'une fois, et non à chaque
      // rafraîchissement du jeton.
      if (user && account) {
        const { sub, error } = await resolveTokenSubject({
          provider: account.provider,
          user: { id: user.id, email: user.email },
          findUserByEmail: (email) =>
            prisma.user.findUnique({ where: { email }, select: { id: true } }),
        });

        if (sub) {
          token.sub = sub;
        } else {
          console.error("[auth] Résolution de l'identifiant de session impossible:", error);
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub; // Ajoute l'ID utilisateur dans la session
      }
      return session;
    },
  },

  pages: {
    signIn: '/login',
    error: '/login',
  },

  session: {
    strategy: "jwt",
  },

  debug: process.env.NODE_ENV === "development",
});
