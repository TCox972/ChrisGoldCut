import { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { connectDB } from '@/lib/mongodb';
import User from '@/models/User';
import { rateLimit, getIpFromHeaders } from '@/lib/rate-limit';

// ─── Configuration NextAuth ──────────────────────────────────────────────────
// Déplacée hors de `app/api/auth/[...nextauth]/route.ts` car Next.js App Router
// n'autorise qu'un jeu restreint d'exports dans un route handler (GET, POST,
// config…). Exporter `authOptions` depuis le route casse le type-check.
export const authOptions: NextAuthOptions = {
  // ─── Providers ──────────────────────────────────────────────────────────────
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email:    { label: 'Email',          type: 'email'    },
        password: { label: 'Mot de passe',   type: 'password' },
      },

      async authorize(credentials, req) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email et mot de passe requis.');
        }

        // Anti-brute-force : limite les tentatives de connexion par IP.
        const ip = getIpFromHeaders(req?.headers as Record<string, string> | undefined);
        const rl = rateLimit({ key: `login:${ip}`, limit: 10, windowMs: 5 * 60 * 1000 });
        if (!rl.ok) {
          throw new Error('Trop de tentatives de connexion. Réessayez dans quelques minutes.');
        }

        await connectDB();

        const user = await User.findOne({ email: credentials.email.toLowerCase() });

        // Message volontairement identique pour compte inexistant ET mauvais
        // mot de passe → empêche l'énumération de comptes.
        if (!user) throw new Error('Identifiants incorrects.');

        const isValid = await user.comparePassword(credentials.password);
        if (!isValid) throw new Error('Identifiants incorrects.');

        // Bloque la connexion tant que l'email n'est pas validé.
        // `emailVerified === false` ne concerne que les inscriptions publiques en
        // attente : les comptes plus anciens / créés par l'admin ont le champ à
        // `undefined` et passent donc librement.
        if (user.emailVerified === false) {
          throw new Error('EMAIL_NOT_VERIFIED');
        }

        // L'objet retourné est encodé dans le JWT
        return {
          id:        user._id.toString(),
          email:     user.email,
          name:      `${user.prenom} ${user.nom}`.trim(),
          prenom:    user.prenom,
          role:      user.role,
          telephone: user.telephone,
        };
      },
    }),
  ],

  // ─── Session JWT ────────────────────────────────────────────────────────────
  session: {
    strategy: 'jwt',
    maxAge:   30 * 24 * 60 * 60, // 30 jours
  },

  // ─── Callbacks ──────────────────────────────────────────────────────────────
  callbacks: {
    /** Enrichit le JWT avec les champs personnalisés */
    async jwt({ token, user }) {
      if (user) {
        token.id        = (user as any).id;
        token.role      = (user as any).role;
        token.prenom    = (user as any).prenom;
        token.telephone = (user as any).telephone;
      }
      return token;
    },

    /** Expose les champs JWT dans la session côté client */
    async session({ session, token }) {
      if (token && session.user) {
        (session.user as any).id        = token.id;
        (session.user as any).role      = token.role;
        (session.user as any).prenom    = token.prenom;
        (session.user as any).telephone = token.telephone;
      }
      return session;
    },
  },

  // ─── Pages personnalisées ───────────────────────────────────────────────────
  pages: {
    signIn:   '/connexion',
    error:    '/connexion',   // les erreurs redirigent vers /connexion?error=...
    newUser:  '/inscription',
  },

  // ─── Secret ─────────────────────────────────────────────────────────────────
  secret: process.env.NEXTAUTH_SECRET,

  // ─── Debug (désactiver en prod) ─────────────────────────────────────────────
  debug: process.env.NODE_ENV === 'development',
};
