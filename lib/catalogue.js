// Catalogue métier de Kaizen : types d'applications, fonctionnalités,
// styles, budgets et délais. Sert à la fois de référentiel pour l'IA
// et de moteur de secours quand aucune clé IA n'est configurée.

export const TYPES = [
  {
    id: "reservation",
    coeur: "reservation", // fonctionnalité indispensable : l'action principale
    label: "Réservation / rendez-vous",
    description: "Vos clients choisissent un créneau et réservent en ligne.",
    mots: ["réserv", "reserv", "rendez", "rdv", "créneau", "creneau", "agenda", "planning", "séance", "seance", "cours", "location"],
    fonctionnalites: ["comptes", "calendrier", "reservation", "rappels", "paiement", "tableau_admin"],
  },
  {
    id: "accompagnement",
    coeur: "parcours", // fonctionnalité indispensable : l'action principale
    label: "Accompagnement de clients",
    description: "Suivre des personnes dans un parcours (coaching, aide, formation).",
    mots: ["accompagn", "coach", "suivi", "suivre", "client", "bénéficiaire", "beneficiaire", "parcours", "patient", "élève", "eleve", "formation"],
    fonctionnalites: ["comptes", "profil_client", "parcours", "messagerie", "documents", "tableau_admin"],
  },
  {
    id: "boutique",
    coeur: "catalogue", // fonctionnalité indispensable : l'action principale
    label: "Boutique / vente en ligne",
    description: "Présenter et vendre des produits ou des services.",
    mots: ["vend", "boutique", "produit", "commande", "panier", "shop", "e-commerce", "ecommerce", "magasin", "livraison"],
    fonctionnalites: ["catalogue", "panier", "paiement", "comptes", "suivi_commandes", "tableau_admin"],
  },
  {
    id: "communaute",
    coeur: "fil_actualite", // fonctionnalité indispensable : l'action principale
    label: "Communauté / réseau",
    description: "Faire échanger des membres entre eux.",
    mots: ["communauté", "communaute", "membre", "réseau", "reseau", "forum", "échange", "echange", "association", "groupe", "entraide"],
    fonctionnalites: ["comptes", "profil_client", "messagerie", "fil_actualite", "evenements", "notifications"],
  },
  {
    id: "gestion",
    coeur: "listes_donnees", // fonctionnalité indispensable : l'action principale
    label: "Outil de gestion interne",
    description: "Organiser votre activité : stocks, équipes, tâches, chiffres.",
    mots: ["gérer", "gerer", "gestion", "stock", "inventaire", "équipe", "equipe", "tâche", "tache", "facture", "devis", "suivi d'activité", "interne"],
    fonctionnalites: ["comptes", "tableau_bord", "listes_donnees", "export", "roles", "notifications"],
  },
  {
    id: "education",
    coeur: "parcours", // fonctionnalité indispensable : l'action principale
    label: "Éducation / e-learning",
    description: "Cours en ligne, quiz et suivi de progression.",
    mots: ["cours en ligne", "élève", "eleve", "étudiant", "etudiant", "formation", "leçon", "lecon", "quiz", "e-learning", "apprendre", "école", "ecole"],
    fonctionnalites: ["comptes", "parcours", "documents", "tableau_bord", "notifications"],
  },
  {
    id: "sante",
    coeur: "reservation", // fonctionnalité indispensable : l'action principale
    label: "Santé / bien-être",
    description: "Rendez-vous, suivi et conseils pour patients ou clients.",
    mots: ["santé", "sante", "patient", "médical", "medical", "bien-être", "bien etre", "thérapeute", "therapeute", "kiné", "kine", "nutrition", "sport", "yoga", "méditation"],
    fonctionnalites: ["comptes", "calendrier", "reservation", "rappels", "documents", "messagerie"],
  },
  {
    id: "vitrine",
    coeur: "pages_presentation", // fonctionnalité indispensable : l'action principale
    label: "Site vitrine / présentation",
    description: "Présenter votre activité et être contacté.",
    mots: ["vitrine", "présenter", "presenter", "présentation", "portfolio", "site", "contact", "visibilité", "visibilite"],
    fonctionnalites: ["pages_presentation", "formulaire_contact", "galerie", "avis"],
  },
  {
    id: "autre",
    coeur: "tableau_bord", // fonctionnalité indispensable : l'action principale
    label: "Autre / je ne sais pas encore",
    description: "Kaizen vous aidera à préciser.",
    mots: [],
    fonctionnalites: ["comptes", "tableau_bord", "notifications"],
  },
];

// complexite : 1 = simple, 2 = moyen, 3 = avancé (sert à l'estimation)
export const FONCTIONNALITES = [
  { id: "comptes", label: "Comptes utilisateurs (inscription / connexion)", complexite: 2, ecran: "Connexion" },
  { id: "profil_client", label: "Fiche ou profil de chaque personne", complexite: 1, ecran: "Profil" },
  { id: "calendrier", label: "Calendrier des disponibilités", complexite: 2, ecran: "Calendrier" },
  { id: "reservation", label: "Réservation en ligne d'un créneau", complexite: 2, ecran: "Réserver" },
  { id: "rappels", label: "Rappels automatiques (e-mail / SMS)", complexite: 2, ecran: null },
  { id: "paiement", label: "Paiement en ligne", complexite: 3, ecran: "Paiement" },
  { id: "tableau_admin", label: "Espace administrateur", complexite: 2, ecran: "Administration" },
  { id: "parcours", label: "Parcours par étapes avec progression", complexite: 2, ecran: "Mon parcours" },
  { id: "messagerie", label: "Messagerie entre utilisateurs", complexite: 3, ecran: "Messages" },
  { id: "documents", label: "Dépôt et partage de documents", complexite: 2, ecran: "Documents" },
  { id: "catalogue", label: "Catalogue de produits / services", complexite: 1, ecran: "Catalogue" },
  { id: "panier", label: "Panier et commande", complexite: 2, ecran: "Panier" },
  { id: "suivi_commandes", label: "Suivi des commandes", complexite: 2, ecran: "Mes commandes" },
  { id: "fil_actualite", label: "Fil d'actualité / publications", complexite: 2, ecran: "Actualités" },
  { id: "evenements", label: "Agenda d'événements", complexite: 1, ecran: "Événements" },
  { id: "notifications", label: "Notifications", complexite: 2, ecran: null },
  { id: "tableau_bord", label: "Tableau de bord avec chiffres clés", complexite: 2, ecran: "Tableau de bord" },
  { id: "listes_donnees", label: "Listes et fiches (clients, stock, tâches…)", complexite: 1, ecran: "Fiches" },
  { id: "export", label: "Export PDF / Excel", complexite: 1, ecran: null },
  { id: "roles", label: "Rôles et droits (admin, équipe…)", complexite: 2, ecran: null },
  { id: "pages_presentation", label: "Pages de présentation", complexite: 1, ecran: "Accueil" },
  { id: "formulaire_contact", label: "Formulaire de contact", complexite: 1, ecran: "Contact" },
  { id: "galerie", label: "Galerie photos", complexite: 1, ecran: "Galerie" },
  { id: "avis", label: "Avis clients", complexite: 1, ecran: "Avis" },
  { id: "ia_assistant", label: "Assistant intelligent (IA)", complexite: 3, ecran: "Assistant" },
  { id: "geolocalisation", label: "Carte / géolocalisation", complexite: 2, ecran: "Carte" },
];

export const PLATEFORMES = [
  { id: "web", label: "Site web / application web", detail: "Accessible depuis un navigateur, sur ordinateur et téléphone.", base: 8 },
  { id: "mobile", label: "Application mobile", detail: "À installer depuis l'App Store / Google Play.", base: 14 },
  { id: "les_deux", label: "Les deux", detail: "Web + application mobile.", base: 20 },
];

export const STYLES = [
  { id: "sobre", label: "Sobre et professionnel", couleur: "#1f3a5f", fond: "#f6f8fb", police: "Inter, Arial, sans-serif" },
  { id: "chaleureux", label: "Chaleureux et humain", couleur: "#c2603a", fond: "#fbf6f1", police: "Georgia, serif" },
  { id: "moderne", label: "Moderne et coloré", couleur: "#6d3fe0", fond: "#f7f5ff", police: "Inter, Arial, sans-serif" },
  { id: "luxe", label: "Haut de gamme", couleur: "#1a1a1a", fond: "#f8f6f0", police: "Georgia, serif", supplement: 3 },
  { id: "nature", label: "Doux et naturel", couleur: "#2f7a55", fond: "#f3f8f4", police: "Inter, Arial, sans-serif" },
];

export const BUDGETS = [
  { id: "moins_2k", label: "Moins de 2 000 €", max: 2000 },
  { id: "2k_5k", label: "2 000 à 5 000 €", max: 5000 },
  { id: "5k_10k", label: "5 000 à 10 000 €", max: 10000 },
  { id: "10k_20k", label: "10 000 à 20 000 €", max: 20000 },
  { id: "plus_20k", label: "Plus de 20 000 €", max: Infinity },
  { id: "inconnu", label: "Je ne sais pas", max: null },
];

export const DELAIS = [
  { id: "moins_1m", label: "Moins d'un mois", semaines: 4 },
  { id: "1_3m", label: "1 à 3 mois", semaines: 12 },
  { id: "3_6m", label: "3 à 6 mois", semaines: 26 },
  { id: "libre", label: "Pas pressé", semaines: null },
];

export const PRIORITES = [
  { id: "faible", label: "Faible", icone: "🟡", detail: "Quand ce sera possible" },
  { id: "moyenne", label: "Moyenne", icone: "🔵", detail: "Dans les prochains mois" },
  { id: "elevee", label: "Élevée", icone: "🔴", detail: "C'est important pour mon activité" },
  { id: "urgente", label: "Urgente", icone: "🟣", detail: "J'en ai besoin au plus vite" },
];

export const ETAPES_SUIVI = [
  { id: "idee", label: "Idée" },
  { id: "cadrage", label: "Cadrage" },
  { id: "maquette", label: "Maquette" },
  { id: "developpement", label: "Développement" },
  { id: "mise_en_ligne", label: "Mise en ligne" },
  { id: "evolution", label: "Évolution" },
];

export const trouver = (liste, id) => liste.find((e) => e.id === id) || null;

export function fonctionnalite(id) {
  return trouver(FONCTIONNALITES, id);
}
