import { ETAPES_SIGNET } from "../../lib/signet.js";

export const metadata = { title: "Installer KaizenServer sur votre écran d'accueil", description: "En 3 gestes, gardez KaizenServer à côté de vos applications : iPhone, iPad, Android ou ordinateur." };

export default function Installer() {
  return (
    <main className="conteneur page">
      <div className="installer-tete">
        <img src="/icon-192.png" alt="Icône KaizenServer" width="88" height="88" />
        <div>
          <p className="surtitre">📲 Signet</p>
          <h1 className="h-page">Gardez KaizenServer sur votre écran d'accueil</h1>
          <p className="intro">En 3 gestes, l'icône KaizenServer s'ajoute à côté de vos applications : vous retrouvez votre projet en un toucher.</p>
        </div>
      </div>
      <div className="installer-grille">
        {ETAPES_SIGNET.map((a) => (
          <article key={a.appareil} className="carte installer-carte">
            <h2><span aria-hidden="true">{a.icone}</span> {a.appareil}</h2>
            <ol>{a.etapes.map((e, i) => <li key={i}>{e}</li>)}</ol>
          </article>
        ))}
      </div>
      <div className="actions" style={{ justifyContent: "center", marginTop: 20 }}><a className="btn grand" href="/">Ouvrir KaizenServer</a></div>
    </main>
  );
}
