import { estimer, euros } from "../../lib/moteur.js";

export const metadata = { title: "Tarifs — KaizenServer" };

// Les fourchettes sont calculées par le même moteur que le parcours,
// sur trois projets types : elles restent cohérentes avec les estimations.
const PROFILS = [
  {
    nom: "Site vitrine", icone: "🌐", pour: "Présenter votre activité et être contacté.",
    projet: { typeId: "vitrine", plateforme: "web", style: "sobre", fonctionnalites: ["pages_presentation", "formulaire_contact", "galerie", "avis"] },
  },
  {
    nom: "Application essentielle", icone: "📅", pour: "Une action principale bien faite : réserver, s'inscrire, suivre…", conseil: true,
    projet: { typeId: "reservation", plateforme: "web", style: "sobre", fonctionnalites: ["comptes", "calendrier", "reservation", "rappels", "tableau_admin"] },
  },
  {
    nom: "Application complète", icone: "🚀", pour: "Web et mobile, paiement, messagerie, espace administrateur.",
    projet: { typeId: "boutique", plateforme: "les_deux", style: "moderne", fonctionnalites: ["comptes", "catalogue", "panier", "paiement", "suivi_commandes", "messagerie", "notifications", "tableau_admin"] },
  },
];

const INCLUS = [
  "Analyse de votre idée et récapitulatif du projet",
  "Estimation transparente et proposition de première version",
  "Maquette cliquable de votre application",
  "Commande sans engagement : vous recevez un devis précis avant tout paiement",
];

export default function Tarifs() {
  return (
    <main className="conteneur page">
      <p className="surtitre">Tarifs</p>
      <h1 className="h-page">Des prix clairs, avant de vous engager</h1>
      <p className="discret">Chaque projet est unique : le parcours calcule une estimation adaptée à vos choix. Voici des ordres de grandeur pour trois types de projets.</p>

      <div className="tarifs">
        {PROFILS.map((p) => {
          const e = estimer({ ...p.projet, personnalisees: [], budget: "plus_20k", delai: "libre" });
          return (
            <article key={p.nom} className={`carte tarif ${p.conseil ? "mise-en-avant" : ""}`}>
              {p.conseil && <span className="badge">Le plus demandé</span>}
              <span className="tarif-icone" aria-hidden="true">{p.icone}</span>
              <h2>{p.nom}</h2>
              <p className="discret">{p.pour}</p>
              <p className="prix">{euros(e.complet.coutMin)} – {euros(e.complet.coutMax)}</p>
              <p className="discret">sur mesure · environ {e.complet.semaines} semaines</p>
              <p className="prix-nocode">ou {euros(e.nocode.coutMin)} – {euros(e.nocode.coutMax)} en no-code</p>
              <a className={`btn ${p.conseil ? "" : "secondaire"}`} href="/nouveau">Estimer mon projet</a>
            </article>
          );
        })}
      </div>

      <section className="carte" style={{ marginTop: 24 }}>
        <h2 style={{ marginTop: 0 }}>Gratuit avec KaizenServer</h2>
        <ul className="liste-cochee">{INCLUS.map((t) => <li key={t}>{t}</li>)}</ul>
        <p className="note">Ordres de grandeur indicatifs, calculés sur la base d'un développeur indépendant à environ 450 €/jour. Le prix final est fixé dans le devis, après échange sur votre projet.</p>
      </section>
    </main>
  );
}
