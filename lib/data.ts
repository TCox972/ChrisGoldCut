// ─── Types ───────────────────────────────────────────────────────────────────

export type Prestation = {
  id: string;
  categorie: string;
  nom: string;
  duree: string;
  prix: number;
};

export type Produit = {
  id: string;
  categorie: string;
  nom: string;
  description: string;
  prix: number;
  image: string;
};

export type Client = {
  id: string;
  prenom: string;
  nom: string;
  email: string;
  telephone: string;
  derniereReservation: string;
};

export type Reservation = {
  id: string;
  numero: string;
  clientId: string;
  clientNom: string;
  prestations: string[];
  date: string;
  heure: string;
  statut: 'a-venir' | 'termine' | 'annule';
  achats: boolean;
};

export type CartItem = {
  produitId: string;
  nom: string;
  description: string;
  image: string;
  prix: number;
  quantite: number;
};

// ─── Mock Data ────────────────────────────────────────────────────────────────

export const prestations: Prestation[] = [
  // Coupes
  { id: 'c1',  categorie: 'Coupes',   nom: 'Coupe simple',       duree: '30 min', prix: 25 },
  { id: 'c2',  categorie: 'Coupes',   nom: 'Coupe et barbe',     duree: '1 h',    prix: 30 },
  { id: 'c3',  categorie: 'Coupes',   nom: 'Coupe barbe et soin',duree: '1 h',    prix: 40 },
  { id: 'c4',  categorie: 'Coupes',   nom: 'Contour laser',      duree: '15 min', prix: 10 },
  { id: 'c5',  categorie: 'Coupes',   nom: 'Coupe enfant',       duree: '30 min', prix: 25 },
  // Dégradés
  { id: 'd1',  categorie: 'Dégradés', nom: 'Dégradé simple',     duree: '30 min', prix: 22 },
  { id: 'd2',  categorie: 'Dégradés', nom: 'Dégradé et barbe',   duree: '1 h',    prix: 28 },
  // Barbe
  { id: 'b1',  categorie: 'Barbe',    nom: 'Boule à zéro et barbe', duree: '30 min', prix: 25 },
  { id: 'b2',  categorie: 'Barbe',    nom: 'Barbe et soin',      duree: '30 min', prix: 25 },
  { id: 'b3',  categorie: 'Barbe',    nom: 'Barbe seule',        duree: '15 min', prix: 5  },
  // Soins
  { id: 's1',  categorie: 'Soins',    nom: 'Shampooing et soin', duree: '15 min', prix: 20 },
  { id: 's2',  categorie: 'Soins',    nom: 'Soin visage et barbe',duree: '45 min',prix: 25 },
  { id: 's3',  categorie: 'Soins',    nom: 'Soin visage',        duree: '30 min', prix: 15 },
  { id: 's4',  categorie: 'Soins',    nom: 'Soin barbe',         duree: '30 min', prix: 15 },
  { id: 's5',  categorie: 'Soins',    nom: 'Relaxation',         duree: '1 h',    prix: 35 },
  { id: 's6',  categorie: 'Soins',    nom: 'Shampooing',         duree: '15 min', prix: 5  },
];

export const produits: Produit[] = [
  { id: 'p1', categorie: 'Barbe',      nom: 'Shampooing barbe',      description: '200 ml', prix: 20, image: 'https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?w=400&q=80' },
  { id: 'p2', categorie: 'Barbe',      nom: 'Sérum pour barbe',      description: '60 ml',  prix: 22, image: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?w=400&q=80' },
  { id: 'p3', categorie: 'Barbe',      nom: 'Crème de barbe',        description: '30 ml',  prix: 20, image: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=400&q=80' },
  { id: 'p4', categorie: 'Barbe',      nom: 'Huile de barbe élixir', description: '40 ml',  prix: 30, image: 'https://images.unsplash.com/photo-1626808642875-0aa545482dfb?w=400&q=80' },
  { id: 'p5', categorie: 'Barbe',      nom: 'Leave-in pour barbe',   description: '150 ml', prix: 25, image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&q=80' },
  { id: 'p6', categorie: 'Accessoires',nom: 'Brosse à barbe',        description: 'Unité',  prix: 7,  image: 'https://images.unsplash.com/photo-1621607512022-6aecc4fed814?w=400&q=80' },
  { id: 'p7', categorie: 'Cheveux',    nom: 'Shampoing cheveux',     description: '250 ml', prix: 18, image: 'https://images.unsplash.com/photo-1598440947619-2c35fc9aa908?w=400&q=80' },
  { id: 'p8', categorie: 'Cheveux',    nom: 'Après-shampoing',       description: '250 ml', prix: 18, image: 'https://images.unsplash.com/photo-1599305090598-fe179d501227?w=400&q=80' },
];

export const clients: Client[] = [
  {
    id: 'cl1', prenom: 'Bernard', nom: 'Dupont',
    email: 'dupont.b@gmail.com', telephone: '06 96 30 30 30',
    derniereReservation: '22 Août 2025',
  },
  {
    id: 'cl2', prenom: 'Albert', nom: 'Martin',
    email: 'a.martin@gmail.com', telephone: '0696 10 10 10',
    derniereReservation: '14 Août 2025',
  },
];

export const reservations: Reservation[] = [
  { id: 'r1', numero: '0001', clientId: 'cl2', clientNom: 'Antoine Dupont', prestations: ['Coupe simple'],          date: '22/08/2025', heure: '10 h 30', statut: 'a-venir',  achats: false },
  { id: 'r2', numero: '0002', clientId: 'cl1', clientNom: 'Bernard Dupont', prestations: ['Coupe simple'],          date: '24/08/2025', heure: '10 h 30', statut: 'a-venir',  achats: true  },
  { id: 'r3', numero: '0003', clientId: 'cl1', clientNom: 'Bernard Dupont', prestations: ['Coupe', 'Shampooing seul'], date: '23/08/2025', heure: '10 h 30', statut: 'a-venir',  achats: false },
  { id: 'r4', numero: '0004', clientId: 'cl2', clientNom: 'Antoine Dupont', prestations: ['Coupe enfant'],          date: '18/08/2025', heure: '09 h 30', statut: 'termine',  achats: false },
];

export const horaires = [
  { jour: 'Lun.',  horaire: 'Fermé' },
  { jour: 'Mar.',  horaire: '9 : 00 - 19 : 00' },
  { jour: 'Mer.',  horaire: '9 : 00 - 19 : 00' },
  { jour: 'Jeu.',  horaire: '9 : 00 - 19 : 00' },
  { jour: 'Ven.',  horaire: '9 : 00 - 19 : 00' },
  { jour: 'Sam.',  horaire: '9 : 00 - 19 : 00' },
  { jour: 'Dim.',  horaire: 'Fermé' },
];
