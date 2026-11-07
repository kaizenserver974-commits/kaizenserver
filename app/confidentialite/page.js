import PageLegale from "../components/PageLegale.js";
import { LEGAL, v } from "../../lib/legal.js";

export const metadata = { title: "Politique de confidentialité — KaizenServer" };

export default function Confidentialite() {
  return (
    <PageLegale surtitre="Informations" titre="Politique de confidentialité" majLe={LEGAL.majLe}>
      <h2>Responsable du traitement</h2>
      <p>{v(LEGAL.structure)} ({v(LEGAL.formeJuridique)}), {v(LEGAL.adresse)} — {LEGAL.email}</p>
      <h2>Données collectées et finalités</h2>
      <ul>
        <li><b>Projets en cours de création</b> : enregistrés uniquement dans votre navigateur, rien n'est envoyé tant que vous ne commandez pas.</li>
        <li><b>Commande</b> : nom, e-mail, téléphone (facultatif), entreprise (facultatif), description du projet et pièces jointes — pour étudier votre projet et vous recontacter.</li>
        <li><b>Espace client</b> : e-mail de connexion, offres, messages et liens — pour le suivi de votre projet.</li>
        <li><b>Paiement</b> : traité par Mollie ; nous ne recevons que le statut et le montant du paiement.</li>
      </ul>
      <h2>Base légale et durée</h2>
      <p>Traitements fondés sur votre demande et l'exécution du contrat. Données conservées pendant la durée de la relation, puis jusqu'à 3 ans après le dernier contact ; les pièces comptables 10 ans.</p>
      <h2>Prestataires (sous-traitants)</h2>
      <p>Vercel (hébergement), Supabase (base de données et connexion), Resend (e-mails), Mollie (paiement), OpenAI (assistant et maquettes, si activé — sans vos coordonnées).</p>
      <h2>Vos droits</h2>
      <p>Accès, rectification, effacement, opposition, portabilité : écrivez à {LEGAL.email}. Vous pouvez saisir la CNIL (cnil.fr).</p>
      <h2>Cookies</h2>
      <p>Le site n'utilise pas de cookies publicitaires. Il utilise le stockage de votre navigateur pour vos projets et votre connexion.</p>
    </PageLegale>
  );
}
