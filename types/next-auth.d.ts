import { DefaultSession, DefaultJWT } from 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id:        string;
      role:      'client' | 'admin' | 'employe';
      prenom:    string;
      telephone: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id:        string;
    role:      'client' | 'admin' | 'employe';
    prenom:    string;
    telephone: string;
  }
}
