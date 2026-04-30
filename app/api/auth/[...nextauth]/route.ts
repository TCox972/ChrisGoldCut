import NextAuth from 'next-auth';
import { authOptions } from '@/lib/authOptions';

// Next.js App Router n'autorise que des exports précis ici (GET, POST…).
// La configuration vit dans `lib/authOptions.ts`.
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
