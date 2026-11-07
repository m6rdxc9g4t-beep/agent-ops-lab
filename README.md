# Agent Ops Lab

Simulations d'interfaces métier pilotées par un agent IA.
Première simulation : **un logiciel de transport (TMS)** où un agent surveille une flotte de camions en France, repère les retards avant qu'ils n'arrivent et propose des actions que l'opérateur approuve ou ignore.

> Inspiré d'un concept vu en vidéo (« A late truck, caught before it's late »), entièrement réécrit avec des données fictives.

## Ce que fait la simulation

- **Réseau routier français simplifié** : 39 plateformes (Rungis, Lyon Corbas, Lille, Marseille Vitrolles…) reliées par les autoroutes et nationales principales.
- **Camions qui roulent vraiment** : vitesse, carburant, temps de conduite avant la pause réglementaire de 45 min, température du groupe froid.
- **Aléas** : accidents, bouchons, travaux, pannes, dérives de température. Leur fréquence se règle dans les paramètres.
- **Agent de dispatch** :
  - **détour** quand un itinéraire bis fait gagner du temps (plus court chemin recalculé en tenant compte du trafic) ;
  - **prévenir le client** quand le retard est inévitable (message pré-rédigé, modifiable) ;
  - **contrôle du groupe froid** quand la température dérive.
- **L'humain valide** : chaque suggestion indique sa confiance, son impact et son raisonnement. Une option d'approbation automatique au-dessus d'un seuil existe. Tout est tracé dans le **journal d'audit**.
- **Scénario d'ouverture** à 08:30 : un accident sur l'A6 entre Auxerre et Beaune menace le camion frigorifique EXP-48291 (Rungis → Lyon). Le détour par la N151 et la N7 sauve le créneau.

## Écrans

| Route | Écran |
| --- | --- |
| `/` | Tableau de bord : indicateurs, brief de l'agent, expédition prioritaire, planning chauffeurs |
| `/dispatch` | File de dispatch, carte, suggestions de l'agent |
| `/suivi` | Suivi en direct de la flotte |
| `/expeditions/[id]` | Fiche expédition, température, historique, partage du lien de suivi |
| `/journal` | Journal d'audit filtrable |
| `/parametres` | Langue (FR, EN, ES, DE), vitesse, niveau d'incidents, réglages de l'agent, graine du scénario |
| `/chauffeur` | Application chauffeur : choix du chauffeur |
| `/chauffeur/[id]` | Écran cabine : prochaine étape, consignes à confirmer, pause, signalement d'un problème, messages |
| `/t/[id]` | Page de suivi envoyée au client : ETA, étapes, carte, température et chauffeur selon les options de partage |

### La boucle complète

1. L'agent propose un détour et l'opérateur l'approuve dans le back-office.
2. Le chauffeur reçoit la consigne dans son application et appuie sur « Bien reçu ». La confirmation remonte dans la fiche expédition.
3. Le chauffeur peut signaler un bouchon, une panne ou un problème de froid. L'agent réagit aussitôt (nouveau détour, contrôle, message client).
4. Le client suit la livraison sur sa page, avec seulement ce que l'opérateur a choisi de partager.

## Lancer en local

```bash
npm install
npm run dev
```

Puis ouvrir http://localhost:3000.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Tailwind CSS 4, branché sur la marque commune de la suite Atelier (Inter embarquée)
- MapLibre GL, avec le fond de carte [OpenFreeMap](https://openfreemap.org). Si les tuiles sont inaccessibles, un fond simplifié hors ligne prend le relais.
- Le moteur de simulation (`src/lib/sim/`) tourne entièrement dans le navigateur. Il n'y a pas de backend.

## Apparence (suite Atelier)

L'interface suit la charte commune v2 « Linear » de la suite Atelier (règles : `Atelier_Deploy/DESIGN.md`) :
structure commune crème en clair (`#f8f4ec`) et bleu nuit en sombre (`#0b1220`), police Inter embarquée, signature d'Ops Lab
(améthyste `#895bd5`, icône Lucide `truck`) réservée à l'accent : bouton principal, sélection, focus,
itinéraire proposé par l'agent. Seuls les états anormaux sont en couleur (à risque, en retard, incident,
validation attendue). Les chiffres clés (indicateurs du tableau de bord, mesures d'une tournée, heures d'arrivée)
sont des cartes de chiffres arrondies : classe `.kpi` de `globals.css`, même forme que `.atelier-kpi` du kit
(trait de 1 px, coins de 12 px, plates), en rangées espacées.

- **Marque commune** : `src/styles/atelier-brand/` contient les copies **verbatim** de
  `Atelier_Projets/design-system/brand/` (`atelier-brand.css`, `atelier-theme.js`, les deux fichiers Inter
  `inter-latin*-wght-normal.woff2` et `LICENSE-Inter.txt`). Ne pas les modifier ici : la source fait foi,
  puis on recopie. `atelier-theme.d.ts` déclare seulement l'import du script comme texte.
- **Thème** : `atelier-theme.js` est lu comme texte (règle Turbopack dans `next.config.ts`) et posé en ligne
  dans `<head>` (`src/components/theme/ThemeScript.tsx`) avant l'affichage. Le choix Système / Clair / Sombre
  (pied de la barre latérale et Paramètres) appelle `window.atelierTheme.set()` : cookie `atelier_theme`
  partagé sur le VPS, sinon `localStorage["atelier:theme"]`.
- **Jetons de l'app** : `src/app/globals.css` branche les couleurs, la police, l'échelle de texte et les rayons
  de Tailwind sur les jetons `--atelier-*`. La carte hors ligne (MapLibre) a sa propre palette crème / bleu nuit
  aux mêmes valeurs, dans `src/components/MapView.tsx` ; les tuiles distantes (OpenFreeMap) gardent leur style.
- **Icônes** : `src/app/icon.svg` (carré arrondi en dégradé de la signature, camion blanc) et `src/app/favicon.ico`
  (16, 32, 48 px) qui en est tiré.

## Structure

```
src/lib/sim/network.ts   réseau routier + plus court chemin (Dijkstra)
src/lib/sim/engine.ts    moteur : camions, incidents, agent, actions
src/lib/i18n/*.ts        traductions (fr = référence typée)
src/lib/store.tsx        contexte React, réglages persistés, formatage
src/components/          coquille, carte, modales, cartes de suggestion, planning…
src/components/theme/    script et sélecteur de thème (préférence commune de la suite)
src/styles/atelier-brand/  marque commune de la suite (copies verbatim)
src/app/                 pages
```

## Limites connues

- La simulation est sauvegardée dans le navigateur (localStorage) toutes les 3 secondes. Au retour, le temps écoulé est rejoué, dans la limite de 3 heures simulées. Elle n'est pas partagée entre appareils : un lien client ouvert sur un autre téléphone montre une autre simulation.
- Les tracés suivent des lignes droites entre plateformes, pas les routes réelles.
- Toutes les entreprises, personnes et immatriculations sont fictives.

## Prochaines simulations

L'idée du dépôt est d'accueillir d'autres secteurs sur le même principe : entrepôt, hôpital, service client…

## Hébergement

- **Vercel** : chaque push sur `main` est déployé automatiquement.
- **VPS de la suite Atelier** : l'app est intégrée à [Atelier_Deploy](https://github.com/m6rdxc9g4t-beep/Atelier_Deploy), section « Sites & tests » du portail, sur `ops.<domaine>`, derrière la connexion du portail. Elle est construite en serveur Next.js autonome (`output: "standalone"`), et `/api/health` sert au voyant du portail.
