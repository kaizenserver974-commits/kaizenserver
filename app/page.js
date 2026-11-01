import CarteExemple from "./components/CarteExemple.js";
import { EXEMPLES_IDEES } from "../lib/exemples.js";
import { UNIVERS } from "../lib/jeu.js";

const ATOUTS = [
  { i: "⚡", t: "Maquette en quelques minutes" },
  { i: "🧭", t: "Guidé pas à pas, sans jargon" },
  { i: "💶", t: "Estimation claire et honnête" },
  { i: "🔒", t: "Vos idées restent sur votre appareil" },
];

const CHEMIN = [
  { t: "Décrivez votre idée", d: "Avec vos mots, en une phrase." },
  { t: "Choisissez vos options", d: "Type, fonctionnalités, style, budget." },
  { t: "Nous analysons votre projet", d: "Récapitulatif, estimation et maquette." },
  { t: "Nous vous proposons un devis", d: "Après votre commande, sans engagement." },
  { t: "Nous créons votre application", d: "Avec un suivi à chaque étape." },
  { t: "Vous lancez votre succès", d: "Et l'application évolue avec vous." },
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
            <a className="btn grand" href="/nouveau">Commander mon application →</a>
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
          <a className="btn contour petit" href="/exemples">Voir plus</a>
        </div>
        <div className="exemples">
          {EXEMPLES_IDEES.slice(0, 4).map((e) => <CarteExemple key={e.t} e={e} />)}
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
            <h2>Prêt à commander votre application ?</h2>
            <p className="discret">Décrivez votre idée, voyez la maquette, puis commandez en quelques clics. Ce n'est pas un paiement : on vous recontacte avec un devis.</p>
          </div>
          <a className="btn grand" href="/nouveau">Commander mon application →</a>
        </div>
      </section>
    </main>
  );
}
