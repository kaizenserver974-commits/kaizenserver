// Idées d'applications proposées en exemple (ce ne sont pas des projets réalisés).
// Chaque idée a sa page (/exemples/<slug>) ; « Partir de cette idée » ouvre le parcours pré-rempli.
export const EXEMPLES_IDEES = [
  {
    slug: "livraison", t: "App de livraison", s: "Application mobile", icone: "🛵", c1: "#2ad4ff", c2: "#4f46e5",
    idee: "Je veux une application de livraison de repas : les clients commandent auprès de restaurants de ma ville et suivent leur livreur en direct.",
    pourQui: "Les habitants qui veulent se faire livrer, les restaurants partenaires et les livreurs.",
    fonctions: ["Catalogue des restaurants et des plats", "Panier et paiement en ligne", "Suivi du livreur en direct sur une carte", "Notifications à chaque étape", "Espace restaurant pour gérer les commandes"],
    ecrans: [["Accueil", "Restaurants proches et promotions"], ["Menu", "Plats, options et ajout au panier"], ["Suivi", "Carte avec le livreur en temps réel"], ["Mes commandes", "Historique et commande à nouveau"]],
  },
  {
    slug: "education", t: "Plateforme éducative", s: "Application web", icone: "🎓", c1: "#7b5cff", c2: "#1e1b4b",
    idee: "Je veux une plateforme de cours en ligne où mes élèves suivent des leçons vidéo, font des quiz et voient leur progression.",
    pourQui: "Les formateurs, les écoles et leurs élèves.",
    fonctions: ["Cours en vidéo classés par modules", "Quiz corrigés automatiquement", "Suivi de la progression de chaque élève", "Certificats de réussite", "Messagerie élève ↔ formateur"],
    ecrans: [["Mes cours", "Modules en cours et à venir"], ["Leçon", "Vidéo, résumé et ressources"], ["Quiz", "Questions et correction immédiate"], ["Progression", "Graphiques et badges obtenus"]],
  },
  {
    slug: "communaute", t: "Communauté locale", s: "Application mobile", icone: "🤝", c1: "#d946ef", c2: "#3b0764",
    idee: "Je veux un réseau social pour les membres de mon association : publications, événements et messagerie entre membres.",
    pourQui: "Les associations, clubs et collectifs qui veulent rassembler leurs membres.",
    fonctions: ["Fil d'actualité des membres", "Agenda des événements avec inscription", "Messagerie privée et groupes", "Annuaire des membres", "Espace administrateur de l'association"],
    ecrans: [["Fil", "Publications, photos et réactions"], ["Événements", "Agenda et inscriptions"], ["Messages", "Conversations et groupes"], ["Profil", "Présentation du membre"]],
  },
  {
    slug: "rendez-vous", t: "Agenda de rendez-vous", s: "Application web", icone: "📅", c1: "#34d399", c2: "#064e3b",
    idee: "Je veux que mes patients réservent leurs rendez-vous en ligne et reçoivent un rappel par SMS la veille.",
    pourQui: "Les professionnels de santé, coiffeurs, coachs… et leurs clients.",
    fonctions: ["Réservation en ligne 24 h/24", "Créneaux selon vos disponibilités", "Rappel automatique par SMS ou e-mail", "Annulation et report en un clic", "Tableau de bord de la journée"],
    ecrans: [["Réserver", "Choix du service et du créneau"], ["Confirmation", "Récapitulatif et ajout au calendrier"], ["Mon agenda", "Journée et semaine du professionnel"], ["Clients", "Fiches et historique des visites"]],
  },
  {
    slug: "boutique", t: "Boutique artisanale", s: "Site e-commerce", icone: "🧺", c1: "#f59e0b", c2: "#78350f",
    idee: "Je veux vendre mes créations artisanales en ligne, gérer mon stock et suivre mes commandes.",
    pourQui: "Les artisans et créateurs qui veulent vendre en ligne.",
    fonctions: ["Catalogue avec photos et variantes", "Paiement en ligne sécurisé", "Gestion du stock", "Suivi des commandes et des envois", "Codes promo et avis clients"],
    ecrans: [["Boutique", "Créations à la une et catégories"], ["Produit", "Photos, description et options"], ["Panier", "Livraison et paiement"], ["Gestion", "Stock et commandes du jour"]],
  },
  {
    slug: "coaching", t: "Coaching sportif", s: "Application mobile", icone: "🏋️", c1: "#ef4444", c2: "#450a0a",
    idee: "Je veux une application pour mes clients de coaching sportif : programmes d'entraînement, suivi des progrès et messagerie avec moi.",
    pourQui: "Les coachs sportifs et leurs clients.",
    fonctions: ["Programmes d'entraînement personnalisés", "Vidéos des exercices", "Suivi des performances et du poids", "Messagerie avec le coach", "Rappels de séance"],
    ecrans: [["Aujourd'hui", "Séance du jour et objectifs"], ["Exercice", "Vidéo, séries et minuteur"], ["Progrès", "Courbes et records"], ["Coach", "Messages et conseils"]],
  },
  {
    slug: "equipe", t: "Gestion d'équipe", s: "Outil interne", icone: "🗂️", c1: "#22d3ee", c2: "#164e63",
    idee: "Je veux un outil pour gérer les plannings, les tâches et les congés de mon équipe de 15 personnes.",
    pourQui: "Les entreprises et responsables d'équipe.",
    fonctions: ["Planning de l'équipe", "Tâches avec responsables et échéances", "Demandes de congés et validation", "Notifications et rappels", "Tableau de bord du responsable"],
    ecrans: [["Planning", "Semaine de l'équipe"], ["Tâches", "À faire, en cours, terminées"], ["Congés", "Demandes et soldes"], ["Tableau de bord", "Charge et absences"]],
  },
  {
    slug: "accompagnement", t: "Accompagnement social", s: "Application web", icone: "🧭", c1: "#a855f7", c2: "#3b0764",
    idee: "Je veux accompagner les personnes que je suis dans leurs démarches, avec des étapes, des rendez-vous et des documents à déposer.",
    pourQui: "Les travailleurs sociaux, associations et structures d'accompagnement.",
    fonctions: ["Parcours de démarches par étapes", "Rendez-vous et rappels", "Dépôt de documents sécurisé", "Messagerie avec l'accompagnant", "Suivi de chaque personne accompagnée"],
    ecrans: [["Mes démarches", "Étapes à suivre et avancement"], ["Documents", "Pièces à déposer et reçues"], ["Rendez-vous", "Prochains rendez-vous"], ["Suivi", "Vue de l'accompagnant"]],
  },
];

export const trouverExemple = (slug) => EXEMPLES_IDEES.find((e) => e.slug === slug);
