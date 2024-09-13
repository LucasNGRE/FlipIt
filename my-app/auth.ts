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
      // auth.ts

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
        throw new Error("Invalid email or password");
      }
  
      const isMatched = await compare(password, user.password);
  
      if (!isMatched) {
        throw new Error("Password did not match");
      }
  
      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      };
    } catch (error) {
      throw new Error("Authentication failed");
    }
  }
  
    }),
  ],

  // Callbacks pour gérer la session et les JWT
  // auth.ts

// auth.ts

callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        try {
          const { email, name, image, id } = user;
  
          if (!email) {
            console.error("Email is required");
            return false; // Échec de la connexion
          }
  
          // Vérifiez si l'utilisateur existe déjà
          const existingUser = await prisma.user.findUnique({
            where: { email },
          });
  
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
    async session({ session, token }) {
      if (session.user && token.sub) {
        session.user.id = token.sub; // Ajoute l'ID utilisateur dans la session
      }
      return session;
    },
  },
  
  

  // Configurer les pages de connexion personnalisées si nécessaire
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },

  // Activer les sessions JWT
  session: {
    strategy: "jwt",
  },

  // Journalisation pour le débogage
  debug: process.env.NODE_ENV === "development",
});
