import PageLegale from "../components/PageLegale.js";
import { LEGAL, v } from "../../lib/legal.js";

export const metadata = { title: "Mentions légales — KaizenServer" };

export default function MentionsLegales() {
  return (
    <PageLegale surtitre="Informations" titre="Mentions légales" majLe={LEGAL.majLe}>
      <h2>Éditeur du site</h2>
      <p>
        {LEGAL.nomCommercial} est un service de <b>{v(LEGAL.structure)}</b>{LEGAL.nomUsage ? ` (${LEGAL.nomUsage})` : ""}, {v(LEGAL.formeJuridique)} au capital de {v(LEGAL.capital)}.<br />
        SIREN : {LEGAL.siren} · {v(LEGAL.rcs)}{LEGAL.siret ? ` · SIRET : ${LEGAL.siret}` : ""}<br />
        Siège social : {v(LEGAL.adresse)}<br />
        TVA : {v(LEGAL.tva)}<br />
        E-mail : {LEGAL.email} · Téléphone : {v(LEGAL.telephone)}<br />
        Responsable de la publication : {v(LEGAL.responsablePublication)}<br />
      </p>
      <h2>Hébergement</h2>
      <p>{LEGAL.hebergeur}</p>
      <h2>Propriété intellectuelle</h2>
      <p>Les textes, illustrations (dont les personnages Kai, Mia, Bip et Server), logos et éléments du site sont la propriété de {LEGAL.nomCommercial}. Toute reproduction sans autorisation est interdite.</p>
      <h2>Données personnelles</h2>
      <p>Voir notre <a className="lien-cyan" href="/confidentialite">politique de confidentialité</a>.</p>
    </PageLegale>
  );
}
