# KaizenServer — de l'idée à l'application

Kaizen guide une personne qui ne connaît rien au développement, de son idée jusqu'au projet d'application :

1. **Idée** : la personne décrit son idée avec ses mots.
2. **Précision du besoin** : type d'application, support, fonctionnalités, public, style, budget et délai. Kaizen propose, la personne choisit.
3. **Récapitulatif** : cahier des charges simplifié (utilisateurs, parcours, écrans, première version et « plus tard », données, points d'attention). **Aucun tarif ni délai automatique** : c'est Server, le maître du jeu, qui les donne.
4. **Maquette cliquable** : aperçu visuel de l'application (ordinateur / téléphone), téléchargeable.
5. **Commande** : la personne choisit une formule (première version, projet complet, no-code, ou « j'en parle d'abord »), laisse ses coordonnées et envoie sa commande. Vous la recevez par e-mail avec un numéro (`KZ-AAAAMMJJ-XXXX`), et le client reçoit une confirmation. Ce n'est pas un paiement : vous le recontactez avec un devis.
6. **Suivi** : frise Idée → Cadrage → Maquette → Développement → Mise en ligne → Évolution, conseils à chaque étape, journal et ajout d'évolutions.

## Espace client et espace équipe

- **Se connecter** (`/connexion`) : lien de connexion par e-mail, sans mot de passe (Supabase Auth).
- **Mon espace** (`/espace`) : commandes avec frise de suivi, **devis** à accepter ou refuser, **messages** avec l'équipe (pastille de non-lus), profil.
- **Espace Server** (`/admin`, réservé aux adresses de `KAIZEN_ADMIN_EMAILS`) : liste des commandes, détail du projet, repère interne, changement de statut (avec e-mail au client), envoi d'offres, messages et conseils.
- Chaque action prévient l'autre partie par e-mail (Resend).

Mise en place :
1. Créez un projet Supabase, puis exécutez `supabase/schema.sql` dans SQL Editor.
2. Dans Supabase > Authentication > URL Configuration, ajoutez l'adresse du site (par exemple `https://votre-site.fr/espace`) aux URL de redirection.
3. Renseignez les variables Supabase et `KAIZEN_ADMIN_EMAILS` dans Vercel.

Les tables sont protégées par RLS sans politique : le navigateur ne lit jamais la base, tout passe par les routes serveur, qui vérifient l'identité de la personne.

## Plusieurs projets dans l'Espace Server

- **+ Nouveau projet** : Server crée lui-même un projet pour un client venu hors du site (nom de l'application, client, e-mail, description). Le client le suit en se connectant avec cet e-mail.
- **Liens et accès** de chaque projet :
  - 🔗 **partagés avec le client** (application web, téléchargement Android ou iPhone, Google Play, App Store, maquette), visibles dans son espace, avec un e-mail optionnel ;
  - 🔒 **accès privés** de Server (code source, Supabase, Vercel ou Netlify), jamais envoyés au client.
  - Seules les adresses sont enregistrées, jamais de mot de passe.
- **Publication sur les stores** : non incluse. Le client publie avec son propre compte développeur, et Server lui fournit l'application et les liens.

## Maquettes dans l'Espace Server

- La maquette créée par le client dans le parcours est **envoyée avec sa commande** et enregistrée (table `kaizen_maquettes`).
- Dans `/admin`, chaque projet a un bloc **🖼️ Maquette** : voir, régénérer, télécharger. Pour un projet créé à la main, **« Générer la maquette avec l'IA »** crée d'abord le récapitulatif, puis la maquette.
- Le client voit aussi la maquette dans son espace.
- Avec `OPENAI_API_KEY`, l'IA dessine une maquette sur mesure. Sans clé, la maquette est construite à partir d'un modèle.

## Avis sur la maquette et pièces d'or

- À l'étape Maquette, le client peut **accepter la maquette** ou **demander une modification** (couleurs, écrans, textes…) : l'IA redessine la maquette selon son avis.
- **Chaque modification coûte 30 pièces.** Les pièces sont gagnées dans le jeu ; en mode classique, le client démarre avec 60 pièces.
- **Recharge** par Mollie : 30 pièces = 2,99 €, 60 = 3,99 €, 80 = 4,99 €. Les packs se modifient dans `lib/pieces.js`. Chaque achat n'est crédité qu'une fois, et toujours après vérification du paiement chez Mollie (table `kaizen_achats_pieces`).
- Les avis et l'acceptation sont envoyés avec la commande, et visibles dans l'Espace Server et dans l'e-mail.

## Paiement en ligne (Mollie)

Quand Server envoie son offre, il choisit la part à payer en ligne : rien, acompte de 30 % ou 50 %, ou la totalité. Une fois l'offre acceptée, le client voit le bouton **« Payer l'acompte… »** et il est redirigé vers la page de paiement sécurisée de Mollie.
- Mollie prévient le site (`/api/paiement/webhook`). Le statut est toujours **relu chez Mollie**, jamais pris tel quel. Les paiements en attente sont aussi revérifiés à l'ouverture des espaces, au cas où le webhook n'est pas passé.
- Paiement reçu : e-mail à Server et au client, et la mention « ✅ Paiement reçu » apparaît dans les deux espaces.
- Activation : ajoutez `MOLLIE_API_KEY` dans Vercel (clé `test_…` pour essayer, puis `live_…`), puis exécutez à nouveau `supabase/schema.sql`, qui ajoute la table `kaizen_paiements`.
- Si le compte Mollie appartient à une autre structure (La Yonne Finance), créez-y un **profil de site web dédié à KaizenServer** et utilisez la clé de ce profil.

## Pages légales

`/mentions-legales`, `/cgv` et `/confidentialite`, avec des liens en bas de chaque page. **À compléter** dans `lib/legal.js` : structure, SIRET, adresse, régime de TVA, médiateur de la consommation… Tant qu'une valeur manque, elle s'affiche « [à compléter] ». Mollie contrôle ces pages avant d'activer les paiements réels. Faites-les relire par un professionnel si besoin.

## Aide

La bulle **« Besoin d'aide ? »** (Bip) répond aux questions fréquentes. Avec `OPENAI_API_KEY`, elle répond librement, en restant sur les informations du site.

## Design

Thème néon sombre (violet, cyan, magenta), logo hexagonal « K », navigation basse sur mobile. Les avatars sont des illustrations SVG générées dans le code (`app/components/Avatar.js`) : forme (personnage ou robot), peau, coiffure, couleurs des cheveux, des yeux et de la tenue, accessoires, et 5 personnages prêts à jouer.

Sur la page d'accueil, les exemples d'idées ouvrent le parcours avec l'idée déjà remplie. À la fin du récapitulatif, la personne peut copier son dossier, le télécharger en PDF, ou l'envoyer par e-mail si la variable `NEXT_PUBLIC_KAIZEN_EMAIL` est configurée.

## Personnages

Les personnages illustrés **Kai** (garçon), **Mia** (fille) et **Bip** (robot) viennent de la maquette KaizenServer fournie par le porteur du projet. Ils se trouvent dans `public/personnages/` : portraits pour les avatars ronds, bustes pour les cartes de choix, et la scène d'accueil. Pour des images plus nettes, remplacez ces fichiers par les originaux en haute définition, en gardant les mêmes noms. La carte « Créer le mien » ouvre le créateur d'avatar dessiné.

## Mode jeu

Au début de chaque projet, la personne choisit :
- **un univers** parmi 4 : Quête du royaume 🏰, Mission galactique 🚀, Enquête mystère 🔎, Expédition océan 🌊 ;
- **un avatar** parmi 12, et son nom de joueur.

Chaque étape du parcours devient un **niveau** de l'univers (par exemple « Le village » puis « La croisée des chemins »). Un narrateur, l'avatar, raconte chaque niveau. Chaque choix fait gagner des points (pièces d'or, étoiles, indices ou perles). La personne monte de niveau et débloque **10 badges** : de Visionnaire jusqu'à Légende (application en ligne) et Maître Kaizen (évolution). Une récompense n'est gagnée qu'une fois. On peut changer d'univers ou d'avatar à tout moment sans perdre ses points, ou choisir le **mode classique** sans jeu. Le tout est défini dans `lib/jeu.js`.

## Le rôle de Server, le maître du jeu

**Server** est le maître du jeu de KaizenServer : c'est le porteur du projet, une vraie personne. **C'est lui seul qui donne les tarifs, les délais et les conseils.**
- Le site ne montre **jamais** de prix ni de délai calculés au client : pas de page Tarifs, pas d'estimation dans le récapitulatif ou la commande. L'assistant IA a aussi pour consigne de n'en donner aucun.
- Après la commande, Server étudie le projet dans son espace (`/admin`) :
  - il envoie son **offre** (tarif, délai, détails), que le client accepte ou refuse ;
  - il envoie des **messages** ou des **💡 conseils du maître du jeu** ;
  - il fait avancer le **statut** de la commande.
- Un **repère interne** calculé par le moteur aide Server à préparer son offre. Il est visible **uniquement** dans l'espace Server.
- Dans le jeu, Server est le personnage du maître du jeu : il a son avatar couronné (`public/personnages/server.svg`), apparaît dans les récits des niveaux « Commander » et « Suivi », et signe les messages et les offres.

## Principes

- **Aucun chiffre n'est montré au client.** `lib/moteur.js` calcule seulement un repère interne pour Server et propose une première version qui tient compte du budget annoncé, en gardant toujours l'action principale.
- **Fonctionne sans IA.** Sans `OPENAI_API_KEY`, un moteur de règles produit l'analyse, le récapitulatif et une maquette à partir d'un gabarit. Avec la clé, l'IA rédige des textes et une maquette sur mesure, et Kaizen revient au moteur de règles en cas d'erreur.
- **Maquette isolée.** Elle s'affiche dans une iframe `sandbox` sans accès aux données ni au réseau du site.
- **V1 sans compte.** Les projets sont enregistrés dans le navigateur (`localStorage`).

## Lancer en local

```bash
npm install
cp .env.example .env.local   # facultatif : ajouter OPENAI_API_KEY
npm run dev                  # http://localhost:3000
npm test                     # tests du moteur
```

## Mettre en ligne (Vercel)

1. Créer un dépôt GitHub `kaizen` et y copier le contenu de ce dossier.
2. Dans Vercel : *Add New → Project*, importer le dépôt (framework Next.js détecté).
3. Variables pour **activer les commandes** : `RESEND_API_KEY` (clé Resend), `KAIZEN_EMAIL` (votre adresse, qui reçoit les commandes) et `KAIZEN_EMAIL_FROM` (expéditeur d'un domaine vérifié dans Resend). Sans elles, le site affiche honnêtement que la commande en ligne n'est pas activée et propose de copier ou télécharger le dossier.
4. Autres variables : `OPENAI_API_KEY` (facultatif), `OPENAI_MODEL` (facultatif, défaut `gpt-5-mini`), `NEXT_PUBLIC_KAIZEN_EMAIL` (facultatif : adresse qui reçoit les demandes).

## Structure

- `app/page.js` : accueil · `app/nouveau/page.js` : parcours guidé · `app/projets/page.js` : mes projets
- `app/api/analyser` · `app/api/recapitulatif` · `app/api/maquette` : routes IA avec repli
- `lib/catalogue.js` : types, fonctionnalités, styles, budgets, délais
- `lib/moteur.js` : estimation, règles de secours, gabarit de maquette, validation
- `lib/ia.js` : appel OpenAI (sortie JSON structurée)

## Prochaines étapes envisagées

- Comptes et sauvegarde Supabase (retrouver ses projets partout, suivi par l'équipe Kaizen).
- Espace administrateur : recevoir les projets validés, envoyer un devis, échanger avec le porteur de projet.
- Export du cahier des charges en PDF soigné.
- Plus tard, génération d'une base de code de départ à partir du récapitulatif validé.

## Captures

![Espace client](docs/captures/espace-commandes.png)
![Messages](docs/captures/espace-messages.png)
![Espace équipe](docs/captures/espace-equipe.png)
![Aide](docs/captures/aide-bip.png)
![Commande](docs/captures/commande-formulaire.png)
![Confirmation](docs/captures/commande-confirmation.png)
![Accueil](docs/captures/personnages-accueil.png)
![Choix du personnage](docs/captures/personnages-choix.png)
![En jeu](docs/captures/personnages-jeu.png)
![Accueil](docs/captures/neon-accueil.png)
![Avatar](docs/captures/neon-avatar.png)
![Récapitulatif](docs/captures/neon-recapitulatif.png)
![Choix de l'aventure](docs/captures/jeu-choix-avatar.png)
![Récompense](docs/captures/jeu-recompense.png)
![Type](docs/captures/type.png)
![Récapitulatif](docs/captures/recapitulatif.png)
![Maquette téléphone](docs/captures/maquette-telephone.png)
