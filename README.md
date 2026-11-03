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
- Tailwind CSS 4
- MapLibre GL, avec le fond de carte [OpenFreeMap](https://openfreemap.org). Si les tuiles sont inaccessibles, un fond simplifié hors ligne prend le relais.
- Le moteur de simulation (`src/lib/sim/`) tourne entièrement dans le navigateur. Il n'y a pas de backend.

## Structure

```
src/lib/sim/network.ts   réseau routier + plus court chemin (Dijkstra)
src/lib/sim/engine.ts    moteur : camions, incidents, agent, actions
src/lib/i18n/*.ts        traductions (fr = référence typée)
src/lib/store.tsx        contexte React, réglages persistés, formatage
src/components/          carte, modales, cartes de suggestion, planning…
src/app/                 pages
```

## Limites connues

- La simulation est sauvegardée dans le navigateur (localStorage) toutes les 3 secondes. Au retour, le temps écoulé est rejoué, dans la limite de 3 heures simulées. Elle n'est pas partagée entre appareils : un lien client ouvert sur un autre téléphone montre une autre simulation.
- Les tracés suivent des lignes droites entre plateformes, pas les routes réelles.
- Toutes les entreprises, personnes et immatriculations sont fictives.

## Prochaines simulations

L'idée du dépôt est d'accueillir d'autres secteurs sur le même principe : entrepôt, hôpital, service client…

## Installer sur un VPS (OVH ou autre)

Sur un VPS Debian ou Ubuntu, en root :

```bash
curl -fsSL https://raw.githubusercontent.com/m6rdxc9g4t-beep/agent-ops-lab/main/deploy/ovh/install.sh | sudo bash
```

Avec un nom de domaine en HTTPS : faites d'abord pointer le domaine vers l'IP du VPS (enregistrement **A** dans la zone DNS OVH), puis lancez :

```bash
curl -fsSL https://raw.githubusercontent.com/m6rdxc9g4t-beep/agent-ops-lab/main/deploy/ovh/install.sh | sudo DOMAIN=ops.mondomaine.fr bash
```

Le script installe Node.js 22 et Caddy (certificat HTTPS automatique), compile l'application, la lance en service systemd et vérifie GitHub toutes les 2 minutes pour la redéployer à chaque push sur `main`. Il peut être relancé sans risque.

Commandes utiles :

```bash
systemctl status agent-ops-lab              # état de l'application
journalctl -u agent-ops-lab -f              # journal de l'application
journalctl -u agent-ops-lab-update -n 50    # journal des mises à jour
sudo agent-ops-lab-update                   # forcer une mise à jour
```
