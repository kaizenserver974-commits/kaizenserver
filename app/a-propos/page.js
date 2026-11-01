export const metadata = { title: "À propos — KaizenServer" };

const VALEURS = [
  { i: "🌱", t: "Kaizen, pas à pas", d: "« Kaizen » signifie amélioration continue en japonais. On commence petit, on teste, on améliore : votre application grandit avec vos utilisateurs." },
  { i: "🔎", t: "Transparence", d: "Estimations calculées et expliquées, devis détaillé avant tout paiement, aucun engagement caché." },
  { i: "🤝", t: "Accompagnement", d: "De l'idée à la mise en ligne, puis pendant les évolutions : vous n'êtes jamais seul face à la technique." },
  { i: "🎮", t: "Accessible à tous", d: "Un parcours guidé, comme un jeu, pour que chacun puisse donner vie à son idée sans connaître le développement." },
];

export default function APropos() {
  return (
    <main className="conteneur page">
      <section className="apropos">
        <div>
          <p className="surtitre">À propos</p>
          <h1 className="h-page">Rendre la création d'applications accessible à tous</h1>
          <p className="intro">
            Beaucoup de bonnes idées ne voient jamais le jour parce que la technique fait peur. KaizenServer transforme votre idée en
            projet clair : besoin, fonctionnalités, budget, maquette. Puis nous construisons l'application avec vous.
          </p>
          <div className="actions">
            <a className="btn grand" href="/nouveau">Commander mon application →</a>
            <a className="btn secondaire grand" href="/ressources">Lire nos guides</a>
          </div>
        </div>
        <img src="/personnages/scene.webp" alt="Kai, Mia et Bip, les personnages de KaizenServer" className="apropos-image" />
      </section>
      <div className="guides">
        {VALEURS.map((v) => (
          <article key={v.t} className="carte guide">
            <span className="tarif-icone" aria-hidden="true">{v.i}</span>
            <h2>{v.t}</h2>
            <p className="discret">{v.d}</p>
          </article>
        ))}
      </div>
    </main>
  );
}
