import CarteExemple from "../components/CarteExemple.js";
import { EXEMPLES_IDEES } from "../../lib/exemples.js";

export const metadata = { title: "Exemples d'idées — KaizenServer" };

export default function Exemples() {
  return (
    <main className="conteneur page">
      <p className="surtitre">Inspirez-vous</p>
      <h1 className="h-page">Exemples d'idées à lancer</h1>
      <p className="discret">Choisissez une idée proche de la vôtre : le parcours s'ouvre avec la description déjà remplie, vous n'avez plus qu'à l'adapter.</p>
      <div className="exemples" style={{ marginTop: 20 }}>
        {EXEMPLES_IDEES.map((e) => <CarteExemple key={e.t} e={e} />)}
      </div>
      <div className="bandeau-cta">
        <div><h2>Votre idée n'est pas dans la liste ?</h2><p className="discret">Décrivez-la avec vos mots, Kaizen s'occupe du reste.</p></div>
        <a className="btn grand" href="/nouveau">Commander mon application →</a>
      </div>
    </main>
  );
}
