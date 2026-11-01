import { UNIVERS } from "../lib/jeu.js";

const ATOUTS = [
  { i: "⚡", t: "Maquette en quelques minutes" },
  { i: "🧭", t: "Guidé pas à pas, sans jargon" },
  { i: "💶", t: "Estimation claire et honnête" },
  { i: "🔒", t: "Vos idées restent sur votre appareil" },
];

const CHEMIN = [
  { t: "Décrivez votre idée", d: "Avec vos mots, en une phrase." },
  { t: "Choisissez vos options", d: "Type, fonctionnalités, style." },
  { t: "Kaizen analyse", d: "Il propose et vous ajustez." },
  { t: "Récapitulatif & estimation", d: "Budget, délai, première version." },
  { t: "Maquette cliquable", d: "Voyez votre application." },
  { t: "Suivi jusqu'au lancement", d: "Et ses évolutions." },
];

const EXEMPLES = [
  { t: "App de livraison", s: "Application mobile", c1: "#2ad4ff", c2: "#4f46e5", idee: "Je veux une application de livraison de repas : les clients commandent auprès de restaurants de ma ville et suivent leur livreur en direct." },
  { t: "Plateforme éducative", s: "Application web", c1: "#7b5cff", c2: "#1e1b4b", idee: "Je veux une plateforme de cours en ligne où mes élèves suivent des leçons vidéo, font des quiz et voient leur progression." },
  { t: "Communauté locale", s: "Application mobile", c1: "#d946ef", c2: "#3b0764", idee: "Je veux un réseau social pour les membres de mon association : publications, événements et messagerie entre membres." },
  { t: "Agenda de rendez-vous", s: "Application web", c1: "#34d399", c2: "#064e3b", idee: "Je veux que mes patients réservent leurs rendez-vous en ligne et reçoivent un rappel par SMS la veille." },
];

export default function Accueil() {
  return (
    <main className="conteneur">
      <section className="hero">
        <div>
          <p className="surtitre">De l'idée à l'application</p>
          <h1>Votre idée.<br />Votre application.<br /><span className="degrade">Notre mission.</span></h1>
          <p className="intro">
            Décrivez votre projet : KaizenServer vous pose les bonnes questions, prépare votre cahier des charges,
            estime le budget et vous montre une première maquette. Comme dans un jeu, avec votre avatar.
          </p>
          <div className="atouts">
            {ATOUTS.map((a) => <div key={a.t} className="atout"><span aria-hidden="true">{a.i}</span>{a.t}</div>)}
          </div>
          <div className="actions">
            <a className="btn grand" href="/nouveau">Commencer mon projet →</a>
            <a className="btn secondaire grand" href="#exemples">Voir des exemples</a>
          </div>
        </div>

        <div className="scene-image">
          <img src="/personnages/scene.webp" width="1064" height="680" alt="Kai, Mia et le robot Bip, les personnages de KaizenServer, devant une ville futuriste" fetchPriority="high" />
          <div className="carte-flottante">🏆 Choisissez Kai, Mia ou Bip · <b>et gagnez des badges</b></div>
        </div>
      </section>

      <section className="section" id="comment">
        <div className="section-titre">
          <div><p className="surtitre">Le parcours</p><h2>Comment ça marche</h2></div>
          <a className="btn contour petit" href="/nouveau">Essayer maintenant</a>
        </div>
        <ol className="chemin">
          {CHEMIN.map((e, i) => (
            <li key={e.t}><span className="num">{i + 1}</span><strong>{e.t}</strong><small>{e.d}</small></li>
          ))}
        </ol>
      </section>

      <section className="section" id="exemples">
        <div className="section-titre">
          <div><p className="surtitre">Inspirez-vous</p><h2>Exemples d'idées à lancer</h2></div>
        </div>
        <div className="exemples">
          {EXEMPLES.map((e) => (
            <a key={e.t} className="exemple" href={`/nouveau?idee=${encodeURIComponent(e.idee)}`}>
              <div className="mini-ecran" style={{ "--c1": e.c1, "--c2": e.c2 }} aria-hidden="true">
                <i /><i className="l2" />
                <div className="tuiles"><b /><b /><b /><b /></div>
              </div>
              <div><h3>{e.t}</h3><p>{e.s}</p></div>
              <p>{e.idee}</p>
              <span className="lien">Partir de cette idée →</span>
            </a>
          ))}
        </div>
      </section>

      <section className="section">
        <div className="section-titre">
          <div><p className="surtitre">Mode jeu</p><h2>Choisissez votre univers</h2></div>
        </div>
        <div className="univers-vitrine">
          {UNIVERS.map((u) => (
            <div key={u.id} className="univers-carte" style={{ "--u": u.couleur }}>
              <span aria-hidden="true">{u.icone}</span>
              <h3>{u.nom}</h3>
              <p>{u.accroche}</p>
            </div>
          ))}
        </div>

        <div className="bandeau-cta">
          <div>
            <h2>Prêt à lancer votre idée ?</h2>
            <p className="discret">Créez votre avatar et obtenez votre maquette en quelques minutes.</p>
          </div>
          <a className="btn grand" href="/nouveau">Créer mon projet →</a>
        </div>
      </section>
    </main>
  );
}
