// Base de connaissances de l'assistant d'aide (réponses sans IA).
export const QUESTIONS_AIDE = [
  { q: "Comment commander mon application ?", mots: ["commander", "passer commande", "acheter", "lancer"], r: "Cliquez sur « Commander » : décrivez votre idée, répondez aux questions, obtenez le récapitulatif et la maquette, puis remplissez l'étape « Commander ». L'équipe vous recontacte avec un devis précis." },
  { q: "Combien ça coûte ?", mots: ["prix", "coût", "cout", "tarif", "combien", "budget", "cher", "payer"], r: "Le parcours, le récapitulatif et la maquette sont gratuits. Le coût de création dépend de votre projet : comptez souvent de quelques milliers d'euros pour un site vitrine à plusieurs dizaines de milliers pour une application complète. Voyez la page Tarifs, ou obtenez une estimation sur mesure dans le parcours." },
  { q: "La commande m'engage-t-elle ?", mots: ["engage", "engagement", "obligé", "oblige", "annuler", "gratuit"], r: "Non. Commander, c'est demander une étude de votre projet. Vous recevez un devis et vous restez libre de l'accepter ou non." },
  { q: "Combien de temps pour créer mon application ?", mots: ["temps", "délai", "delai", "durée", "duree", "quand", "semaines", "rapide"], r: "En général entre 4 et 16 semaines selon les fonctionnalités. Le récapitulatif vous donne une estimation adaptée, et propose une première version plus rapide si besoin." },
  { q: "Web ou mobile ?", mots: ["mobile", "web", "app store", "android", "iphone", "téléphone", "telephone"], r: "Une application web fonctionne sur ordinateur et téléphone, coûte moins cher et peut évoluer vers le mobile ensuite. Une application mobile est utile pour les notifications ou un usage quotidien." },
  { q: "Où sont mes projets ?", mots: ["projet", "retrouver", "sauvegarde", "perdu", "enregistré", "enregistre"], r: "Vos projets sont enregistrés dans votre navigateur : retrouvez-les dans « Mes projets ». Connectez-vous pour suivre vos commandes, vos devis et vos messages depuis n'importe quel appareil." },
  { q: "Je ne connais rien à la technique", mots: ["technique", "code", "coder", "développement", "developpement", "débutant", "debutant", "rien"], r: "C'est exactement pour vous ! Répondez avec vos mots : Kaizen traduit votre idée en projet clair, et l'équipe s'occupe de la technique." },
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
    : "Je n'ai pas de réponse toute prête à cette question. Le plus simple : lancez votre projet dans « Commander », ou écrivez à l'équipe depuis votre espace (Messages) après votre commande.";
}
