export const metadata = { title: "Ressources — KaizenServer" };

const GUIDES = [
  { i: "✍️", t: "Bien décrire son idée", c: ["Commencez par le problème : qu'est-ce qui vous fait perdre du temps ou des clients aujourd'hui ?", "Dites qui utilisera l'application, et l'action la plus importante qu'il doit pouvoir faire.", "Inutile de tout prévoir : une première version simple, testée par de vrais utilisateurs, vaut mieux qu'un grand projet jamais terminé."] },
  { i: "📱", t: "Application web ou mobile ?", c: ["Une application web s'ouvre dans le navigateur, sur ordinateur comme sur téléphone. Elle coûte moins cher et se met à jour instantanément.", "Une application mobile s'installe depuis l'App Store ou Google Play : utile pour les notifications, la caméra ou un usage quotidien.", "Bon réflexe : commencer par le web, puis passer au mobile quand l'usage le justifie."] },
  { i: "🧩", t: "No-code ou sur mesure ?", c: ["Le no-code (Bubble, Glide, Softr…) assemble des briques existantes : rapide et moins cher, idéal pour tester une idée.", "Le sur-mesure est écrit pour vous : plus flexible, plus performant, sans limite d'outil, mais plus long et plus coûteux.", "Kaizen vous montre les deux estimations pour choisir en connaissance de cause."] },
  { i: "💶", t: "Préparer son budget", c: ["Prévoyez la création, mais aussi l'hébergement, les noms de domaine et la maintenance (souvent 10 à 20 % du coût de création par an).", "Réservez une part du budget pour les améliorations après le lancement : ce sont vos utilisateurs qui vous diront quoi améliorer.", "Demandez toujours un devis détaillé, étape par étape."] },
  { i: "🔐", t: "Données personnelles (RGPD)", c: ["Ne collectez que les informations vraiment nécessaires.", "Prévoyez une politique de confidentialité et des mentions légales avant la mise en ligne.", "Les paiements passent par un prestataire spécialisé (Stripe, Mollie…) : l'application ne stocke jamais les numéros de carte."] },
  { i: "🚀", t: "Réussir son lancement", c: ["Faites tester la maquette puis la première version à 5 personnes de votre public.", "Préparez une page de présentation et un moyen simple de vous contacter.", "Mesurez ce qui est vraiment utilisé, puis améliorez pas à pas : c'est l'esprit Kaizen."] },
];

const FAQ = [
  ["Est-ce que c'est payant d'utiliser KaizenServer ?", "Non : décrire votre idée, obtenir le récapitulatif, l'estimation et la maquette est gratuit. Vous ne payez que si vous acceptez un devis."],
  ["La commande m'engage-t-elle ?", "Non. Commander, c'est demander à l'équipe d'étudier votre projet. Vous recevez ensuite un devis précis que vous êtes libre d'accepter ou non."],
  ["Je ne connais rien au développement, est-ce un problème ?", "Pas du tout : KaizenServer est fait pour ça. Vous répondez avec vos mots, sans jargon."],
  ["Où sont enregistrés mes projets ?", "Dans votre navigateur, sur votre appareil. Rien n'est envoyé tant que vous ne commandez pas."],
  ["Combien de temps faut-il pour créer une application ?", "Souvent entre 4 et 16 semaines selon le projet. Le récapitulatif vous donne une estimation adaptée à vos choix."],
];

export default function Ressources() {
  return (
    <main className="conteneur page">
      <p className="surtitre">Ressources</p>
      <h1 className="h-page">Guides pour réussir votre projet</h1>
      <p className="discret">Des conseils simples pour passer de l'idée à une application utile.</p>
      <div className="guides">
        {GUIDES.map((g) => (
          <article key={g.t} className="carte guide">
            <span className="tarif-icone" aria-hidden="true">{g.i}</span>
            <h2>{g.t}</h2>
            <ul>{g.c.map((x) => <li key={x}>{x}</li>)}</ul>
          </article>
        ))}
      </div>
      <section style={{ marginTop: 32 }}>
        <h2>Questions fréquentes</h2>
        <div className="faq">
          {FAQ.map(([q, r]) => (
            <details key={q} className="carte">
              <summary>{q}</summary>
              <p>{r}</p>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
