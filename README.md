# KaizenServer — de l'idée à l'application

Kaizen guide une personne qui ne connaît rien au développement, de son idée jusqu'au projet d'application :

1. **Idée** : la personne décrit son idée avec ses mots.
2. **Précision du besoin** : type d'application, support, fonctionnalités, public, style, budget et délai. Kaizen propose, la personne choisit.
3. **Récapitulatif** : cahier des charges simplifié (utilisateurs, parcours, écrans, première version et « plus tard », données, points d'attention) et **estimation** coût/délai.
4. **Maquette cliquable** : aperçu visuel de l'application (ordinateur / téléphone), téléchargeable.
5. **Commande** : la personne choisit une formule (première version, projet complet, no-code, ou « j'en parle d'abord »), laisse ses coordonnées et envoie sa commande. Vous la recevez par e-mail avec un numéro (`KZ-AAAAMMJJ-XXXX`), et le client reçoit une confirmation. Ce n'est pas un paiement : vous le recontactez avec un devis.
6. **Suivi** : frise Idée → Cadrage → Maquette → Développement → Mise en ligne → Évolution, conseils à chaque étape, journal et ajout d'évolutions.

## Espace client et espace équipe

- **Se connecter** (`/connexion`) : lien de connexion par e-mail, sans mot de passe (Supabase Auth).
- **Mon espace** (`/espace`) : commandes avec frise de suivi, **devis** à accepter ou refuser, **messages** avec l'équipe (pastille de non-lus), profil.
- **Espace équipe** (`/admin`, réservé aux adresses de `KAIZEN_ADMIN_EMAILS`) : liste des commandes, détail du projet, changement de statut (avec e-mail au client), création de devis, réponses aux messages.
- Chaque action prévient l'autre partie par e-mail (Resend).

Mise en place :
1. Créez un projet Supabase, puis exécutez `supabase/schema.sql` dans SQL Editor.
2. Dans Supabase > Authentication > URL Configuration, ajoutez l'adresse du site (par exemple `https://votre-site.fr/espace`) aux URL de redirection.
3. Renseignez les variables Supabase et `KAIZEN_ADMIN_EMAILS` dans Vercel.

Les tables sont protégées par RLS sans politique : le navigateur ne lit jamais la base, tout passe par les routes serveur, qui vérifient l'identité de la personne.

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

## Principes

- **Les chiffres ne sont jamais inventés par l'IA.** L'estimation est calculée par `lib/moteur.js` (450 €/jour indicatifs) et l'application propose automatiquement une première version qui tient dans le budget, en gardant toujours l'action principale.
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
