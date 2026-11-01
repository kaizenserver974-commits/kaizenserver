// Base de connaissances de l'assistant d'aide (réponses sans IA).
export const QUESTIONS_AIDE = [
  { q: "Comment commander mon application ?", mots: ["commander", "passer commande", "acheter", "lancer"], r: "Cliquez sur « Commander » : décrivez votre idée, répondez aux questions, obtenez le récapitulatif et la maquette, puis remplissez l'étape « Commander ». L'équipe vous recontacte avec un devis précis." },
  { q: "Combien ça coûte ?", mots: ["prix", "coût", "cout", "tarif", "combien", "budget", "cher", "payer"], r: "Le parcours, le récapitulatif et la maquette sont gratuits. Le tarif de votre application, c'est Server, le maître du jeu, qui vous le donne personnellement après avoir étudié votre commande. Commander ne vous engage à rien." },
  { q: "La commande m'engage-t-elle ?", mots: ["engage", "engagement", "obligé", "oblige", "annuler", "gratuit"], r: "Non. Commander, c'est demander à Server, le maître du jeu, d'étudier votre projet. Vous recevez son offre et restez libre de l'accepter ou non." },
  { q: "Combien de temps pour créer mon application ?", mots: ["temps", "délai", "delai", "durée", "duree", "quand", "semaines", "rapide"], r: "Cela dépend de votre projet : Server, le maître du jeu, vous donne un délai précis dans son offre, après votre commande." },
  { q: "Web ou mobile ?", mots: ["mobile", "web", "app store", "android", "iphone", "téléphone", "telephone"], r: "Une application web fonctionne sur ordinateur et téléphone, coûte moins cher et peut évoluer vers le mobile ensuite. Une application mobile est utile pour les notifications ou un usage quotidien." },
  { q: "Où sont mes projets ?", mots: ["projet", "retrouver", "sauvegarde", "perdu", "enregistré", "enregistre"], r: "Vos projets sont enregistrés dans votre navigateur : retrouvez-les dans « Mes projets ». Connectez-vous pour suivre vos commandes, vos devis et vos messages depuis n'importe quel appareil." },
  { q: "Qui est Server ?", mots: ["server", "maître", "maitre", "qui êtes", "qui etes", "équipe", "equipe", "conseil"], r: "Server, c'est le maître du jeu de KaizenServer : une vraie personne qui étudie chaque projet commandé, fixe le tarif et le délai, vous conseille et suit la création de votre application." },
  { q: "Je ne connais rien à la technique", mots: ["technique", "code", "coder", "développement", "developpement", "débutant", "debutant", "rien"], r: "C'est exactement pour vous ! Répondez avec vos mots : Kaizen traduit votre idée en projet clair, et Server, le maître du jeu, s'occupe de la technique avec vous." },
  { q: "Mes données sont-elles protégées ?", mots: ["données", "donnees", "rgpd", "confidentiel", "sécurité", "securite", "vie privée"], r: "Vos projets restent sur votre appareil tant que vous ne commandez pas. Vos coordonnées servent uniquement à vous recontacter au sujet de votre projet." },
];

const normaliser = (t) => String(t || "").toLowerCase();

export function repondreSansIA(question) {
  const q = normaliser(question);
  let meilleure = null;
  let score = 0;
  for (const item of QUESTIONS_AIDE) {
    const s = item.mots.reduce((acc, m) => acc + (q.includes(m) ? 1 : 0), 0);
    if (s > score) { score = s; meilleure = item; }
  }
  return meilleure
    ? meilleure.r
    : "Je n'ai pas de réponse toute prête à cette question. Le plus simple : lancez votre projet dans « Commander », ou écrivez à Server, le maître du jeu, depuis votre espace après votre commande.";
}
