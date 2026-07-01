/**
 * Script de seed — peuple la base MongoDB avec les données initiales.
 * Lancer avec : npm run seed
 *
 * ⚠️  Nécessite que MONGODB_URI soit défini dans .env.local
 */

import 'dotenv/config';
import mongoose from 'mongoose';

// ─── Import des modèles ───────────────────────────────────────────────────────
// (chemins relatifs depuis scripts/)
import '../models/User';
import '../models/Prestation';
import '../models/Produit';
import '../models/Reservation';

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI manquant dans .env.local');
  process.exit(1);
}

// ─── Données ──────────────────────────────────────────────────────────────────

const users = [
  {
    prenom: 'Christopher', nom: 'GoldCut',
    email: 'admin@goldcut.com', password: 'admin123',
    telephone: '0696102030', role: 'admin',
  },
  {
    prenom: 'Bernard', nom: 'Dupont',
    email: 'dupont.b@gmail.com', password: 'password123',
    telephone: '0696303030', role: 'client',
  },
  {
    prenom: 'Albert', nom: 'Martin',
    email: 'a.martin@gmail.com', password: 'password123',
    telephone: '0696101010', role: 'client',
  },
];

const prestations = [
  { categorie: 'Coupes',   nom: 'Coupe simple',          duree: '30 min', prix: 25 },
  { categorie: 'Coupes',   nom: 'Coupe et barbe',         duree: '1 h',    prix: 30 },
  { categorie: 'Coupes',   nom: 'Coupe barbe et soin',    duree: '1 h',    prix: 40 },
  { categorie: 'Coupes',   nom: 'Contour laser',          duree: '15 min', prix: 10 },
  { categorie: 'Coupes',   nom: 'Coupe enfant',           duree: '30 min', prix: 25 },
  { categorie: 'Dégradés', nom: 'Dégradé simple',         duree: '30 min', prix: 22 },
  { categorie: 'Dégradés', nom: 'Dégradé et barbe',       duree: '1 h',    prix: 28 },
  { categorie: 'Barbe',    nom: 'Boule à zéro et barbe',  duree: '30 min', prix: 25 },
  { categorie: 'Barbe',    nom: 'Barbe et soin',          duree: '30 min', prix: 25 },
  { categorie: 'Barbe',    nom: 'Barbe seule',            duree: '15 min', prix: 5  },
  { categorie: 'Soins',    nom: 'Shampooing et soin',     duree: '15 min', prix: 20 },
  { categorie: 'Soins',    nom: 'Soin visage et barbe',   duree: '45 min', prix: 25 },
  { categorie: 'Soins',    nom: 'Soin visage',            duree: '30 min', prix: 15 },
  { categorie: 'Soins',    nom: 'Soin barbe',             duree: '30 min', prix: 15 },
  { categorie: 'Soins',    nom: 'Relaxation',             duree: '1 h',    prix: 35 },
  { categorie: 'Soins',    nom: 'Shampooing',             duree: '15 min', prix: 5  },
];

const produits = [
  { categorie: 'Barbe',       nom: 'Shampooing barbe',      description: '200 ml', prix: 20 },
  { categorie: 'Barbe',       nom: 'Sérum pour barbe',      description: '60 ml',  prix: 22 },
  { categorie: 'Barbe',       nom: 'Crème de barbe',        description: '30 ml',  prix: 20 },
  { categorie: 'Barbe',       nom: 'Huile de barbe élixir', description: '40 ml',  prix: 30 },
  { categorie: 'Barbe',       nom: 'Leave-in pour barbe',   description: '150 ml', prix: 25 },
  { categorie: 'Accessoires', nom: 'Brosse à barbe',        description: 'Unité',  prix: 7  },
  { categorie: 'Cheveux',     nom: 'Shampoing cheveux',     description: '250 ml', prix: 18 },
  { categorie: 'Cheveux',     nom: 'Après-shampoing',       description: '250 ml', prix: 18 },
];

// ─── Seed ─────────────────────────────────────────────────────────────────────
async function seed() {
  console.log('🔗  Connexion à MongoDB Atlas...');
  await mongoose.connect(MONGODB_URI);
  console.log('✅  Connecté.\n');

  const UserModel        = mongoose.model('User');
  const PrestationModel  = mongoose.model('Prestation');
  const ProduitModel     = mongoose.model('Produit');

  // Nettoyage
  await Promise.all([
    UserModel.deleteMany({}),
    PrestationModel.deleteMany({}),
    ProduitModel.deleteMany({}),
  ]);
  console.log('🗑️   Collections vidées.');

  // Insertion
  for (const u of users) {
    await UserModel.create(u);   // le hook pre-save hash le password
    console.log(`👤  User créé : ${u.email}`);
  }

  await PrestationModel.insertMany(prestations);
  console.log(`✂️   ${prestations.length} prestations insérées.`);

  await ProduitModel.insertMany(produits);
  console.log(`📦  ${produits.length} produits insérés.`);

  console.log('\n🎉  Seed terminé avec succès !');
  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error('❌  Erreur seed :', err);
  process.exit(1);
});
