import { notFound } from "next/navigation";
import { EXEMPLES_IDEES, trouverExemple } from "../../../lib/exemples.js";

export function generateStaticParams() {
  return EXEMPLES_IDEES.map((e) => ({ slug: e.slug }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const e = trouverExemple(slug);
  return e ? { title: `${e.t} — Exemple d'application — KaizenServer`, description: e.idee } : {};
}

// Page d'un exemple d'idée : à quoi ressemblerait l'application, puis le parcours pré-rempli.
export default async function Exemple({ params }) {
  const { slug } = await params;
  const e = trouverExemple(slug);
  if (!e) notFound();
  const autres = EXEMPLES_IDEES.filter((x) => x.slug !== e.slug).slice(0, 3);
  const commencer = `/nouveau?idee=${encodeURIComponent(e.idee)}`;
  return (
    <main className="conteneur page exemple-detail" style={{ "--c1": e.c1, "--c2": e.c2 }}>
      <a className="lien-cyan" href="/exemples">← Tous les exemples</a>
      <section className="exemple-entete">
        <div className="exemple-icone" aria-hidden="true">{e.icone}</div>
        <div>
          <p className="surtitre">{e.s}</p>
          <h1 className="h-page">{e.t}</h1>
          <p className="exemple-idee">« {e.idee} »</p>
          <a className="btn grand" href={commencer}>Partir de cette idée →</a>
        </div>
      </section>

      <div className="grille-2">
        <section className="carte">
          <h2>👥 Pour qui ?</h2>
          <p>{e.pourQui}</p>
          <h2 style={{ marginTop: 18 }}>⚙️ Ce que fait l'application</h2>
          <ul className="liste-fonctions">{e.fonctions.map((f) => <li key={f}>{f}</li>)}</ul>
        </section>
        <section className="carte">
          <h2>📱 Les écrans principaux</h2>
          <div className="ecrans-exemple">
            {e.ecrans.map(([nom, detail]) => (
              <div key={nom} className="ecran-exemple">
                <div className="mini-tel" aria-hidden="true"><i /><i className="l2" /><b /><b /><b /></div>
                <div><strong>{nom}</strong><p>{detail}</p></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="bandeau-cta">
        <div><h2>Cette idée ressemble à la vôtre ?</h2><p className="discret">Le parcours s'ouvre avec cette description déjà remplie : adaptez-la, choisissez vos fonctionnalités, et Server s'occupe du reste.</p></div>
        <a className="btn grand" href={commencer}>Partir de cette idée →</a>
      </section>

      <h2 style={{ marginTop: 28 }}>D'autres exemples</h2>
      <div className="autres-exemples">
        {autres.map((x) => <a key={x.slug} className="carte autre-exemple" href={`/exemples/${x.slug}`}><span aria-hidden="true">{x.icone}</span><div><strong>{x.t}</strong><p className="discret">{x.s}</p></div></a>)}
      </div>
    </main>
  );
}
