# GoldCut — Salon de Coiffure

Site web complet pour le salon GoldCut, développé avec **Next.js 14**, **React**, et **TailwindCSS**.

---

## 🚀 Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Lancer le serveur de développement
npm run dev

# 3. Ouvrir dans le navigateur
# http://localhost:3000
```

---

## 📁 Structure du projet

```
goldcut/
├── app/
│   ├── page.tsx                   # Accueil
│   ├── a-propos/page.tsx          # À propos
│   ├── prestations/page.tsx       # Prestations & tarifs
│   ├── boutique/page.tsx          # Boutique produits
│   ├── panier/page.tsx            # Panier
│   ├── reservation/page.tsx       # Prise de RDV
│   ├── connexion/page.tsx         # Connexion client
│   ├── inscription/page.tsx       # Création de compte
│   ├── compte/
│   │   ├── informations/page.tsx  # Mes informations
│   │   ├── reservations/page.tsx  # Mes réservations
│   │   └── achats/page.tsx        # Mes achats
│   └── admin/
│       ├── reservations/page.tsx  # Gestion des RDV
│       ├── prestations/page.tsx   # Gestion des prestations
│       ├── produits/page.tsx      # Gestion des produits
│       └── clients/page.tsx       # Gestion des clients
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   ├── Footer.tsx
│   │   └── PageHero.tsx
│   ├── ui/
│   │   └── SectionTitle.tsx
│   └── public/
│       ├── ReservationForm.tsx
│       ├── ContactInfo.tsx
│       └── CompteNav.tsx
├── lib/
│   ├── data.ts                    # Données mock (types + données)
│   ├── cart-context.tsx           # State panier
│   └── auth-context.tsx           # State authentification
└── tailwind.config.js
```

---

## 🔑 Comptes de démonstration

| Rôle   | Email                  | Mot de passe |
|--------|------------------------|--------------|
| Client | dupont.b@gmail.com     | password123  |
| Admin  | admin@goldcut.com      | admin123     |

---

## 🎨 Design

- **Palette** : Noir `#111111` + Or `#D4A017` / `#F5C842`
- **Polices** :
  - Cinzel (titres & navigation)
  - Outfit (corps de texte)
  - Dancing Script (logo script)
- **Style** : Luxe / barber shop premium

---

## 📦 Technologies

- Next.js 14 (App Router)
- React 18
- TailwindCSS 3
- TypeScript
- Lucide React (icônes)

---

## 🔧 Prochaines étapes (production)

Pour passer en production, il faudra :

1. **Base de données** : Connecter une BDD (PostgreSQL via Supabase ou PlanetScale)
2. **Authentification** : Remplacer le mock par NextAuth.js ou Clerk
3. **API Routes** : Créer les endpoints `/api/reservations`, `/api/produits`, etc.
4. **Paiement** : Intégrer Stripe pour la boutique
5. **Emails** : Configurer les notifications (Resend ou SendGrid)
6. **Images** : Uploader les vraies photos du salon

---

© 2025 Gold Cut
