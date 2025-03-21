import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import prisma from "@/lib/db"; // Assurez-vous d'importer correctement votre client Prisma
import { compare } from "bcryptjs"; // Si vous utilisez bcrypt pour hacher les mots de passe

export const { handlers, signIn, signOut, auth } = NextAuth({
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

        if (!email || !password) {
          throw new Error("Please provide both email & password");
        }

        try {
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
              password: true,
            },
          });

          if (!user || !user.password) {
            console.error("Utilisateur non trouvé ou mot de passe manquant");
            throw new Error("Invalid email or password");
          }

          const isMatched = await compare(password, user.password);

          if (!isMatched) {
            console.error("Mot de passe incorrect pour l'utilisateur", email);
            throw new Error("Password did not match");
          }

          return {
            id: user.id.toString(),
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
          };
        } catch (error) {
          console.error("Authentication failed", error);
          throw new Error("Authentication failed");
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
          });

          if (!existingUser) {
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

          return true;
        } catch (error) {
          console.error("Error while creating user:", error);
          return false;
        }
      }

      if (account?.provider === "credentials") {
        return true; // Connexion réussie pour les credentials
      }

      return false; // Connexion échouée pour les autres fournisseurs
    },
    async jwt({ token, user }) {
      if (user) {
        token.sub = user.id;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub;
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
