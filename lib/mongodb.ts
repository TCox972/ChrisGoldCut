import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error(
    'Veuillez définir la variable MONGODB_URI dans .env.local\n' +
    'Exemple : mongodb+srv://user:pass@cluster.mongodb.net/goldcut'
  );
}

/**
 * Singleton de connexion Mongoose.
 * En développement Next.js, les modules sont rechargés à chaud —
 * on stocke la promesse dans `global` pour éviter de créer
 * plusieurs connexions simultanées.
 */
declare global {
  // eslint-disable-next-line no-var
  var _mongooseCache: { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null };
}

const cache = global._mongooseCache ?? { conn: null, promise: null };
global._mongooseCache = cache;

export async function connectDB(): Promise<typeof mongoose> {
  if (cache.conn) return cache.conn;

  if (!cache.promise) {
    cache.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false,
    });
  }

  cache.conn = await cache.promise;
  return cache.conn;
}
