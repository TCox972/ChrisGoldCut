/**
 * Script one-shot : supprime l'ancien index unique sur BlockedSlot.date
 * Usage : npx tsx scripts/drop-blockedslot-index.ts
 */
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

async function run() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('MONGODB_URI non défini dans .env.local');
    process.exit(1);
  }

  await mongoose.connect(uri);
  console.log('Connecté à MongoDB.');

  const collection = mongoose.connection.collection('blockedslots');

  // Lister les index existants
  const indexes = await collection.indexes();
  console.log('Index actuels :', indexes.map(i => i.name));

  const hasOldIndex = indexes.some(i => i.name === 'date_1');
  if (hasOldIndex) {
    await collection.dropIndex('date_1');
    console.log('Index "date_1" supprimé avec succès.');
  } else {
    console.log('Index "date_1" non trouvé, rien à faire.');
  }

  await mongoose.disconnect();
  console.log('Terminé.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
