import PageLegale from "../components/PageLegale.js";
import { LEGAL, v } from "../../lib/legal.js";

export const metadata = { title: "Conditions générales de vente — KaizenServer" };

export default function CGV() {
  return (
    <PageLegale surtitre="Informations" titre="Conditions générales de vente" majLe={LEGAL.majLe}>
      <h2>1. Objet</h2>
      <p>Les présentes conditions encadrent les prestations de conception et de réalisation d'applications proposées par {LEGAL.nomCommercial} ({v(LEGAL.structure)}, SIRET/RNA {v(LEGAL.siret)}), ci-après « Server ».</p>
      <h2>2. Parcours gratuit et commande</h2>
      <p>La description du projet, le récapitulatif et la maquette sont gratuits et sans engagement. La « commande » est une demande d'étude : elle n'engage pas le client à payer.</p>
      <h2>3. Offre et prix</h2>
      <p>Après étude, Server envoie une offre personnalisée dans l'espace client : contenu, prix en euros, délai indicatif et, le cas échéant, montant de l'acompte. {LEGAL.tva || "[Régime de TVA à compléter]"}. Le contrat est formé lorsque le client accepte l'offre depuis son espace.</p>
      <h2>4. Paiement</h2>
      <p>Le paiement en ligne est sécurisé par notre prestataire Mollie (carte bancaire, Apple Pay, virement…). {LEGAL.nomCommercial} n'a jamais accès à vos données de carte. L'acompte éventuel est dû à l'acceptation de l'offre ; le solde selon les modalités indiquées dans l'offre.</p>
      <h2>5. Réalisation et livraison</h2>
      <p>Server réalise l'application selon l'offre acceptée et tient le client informé dans son espace. Les délais sont indicatifs. L'application est livrée sous forme de liens (application web, fichiers ou accès) disponibles dans l'espace client.</p>
      <h2>6. Publication sur les stores</h2>
      <p>La publication sur Google Play, l'App Store ou toute autre plateforme n'est pas incluse : elle est réalisée par le client avec son propre compte développeur, et à ses frais. Server fournit les éléments et conseils nécessaires.</p>
      <h2>7. Droit de rétractation</h2>
      <p>Le client consommateur dispose d'un délai de 14 jours à compter de l'acceptation de l'offre pour se rétracter, sauf s'il demande expressément le commencement de la prestation avant la fin de ce délai et reconnaît perdre son droit de rétractation une fois la prestation pleinement exécutée (art. L221-28 du Code de la consommation). En cas de rétractation après un début d'exécution demandé, les sommes correspondant au travail réalisé restent dues.</p>
      <h2>8. Propriété</h2>
      <p>Après paiement complet, le client dispose des droits d'utilisation de son application tels que précisés dans l'offre.</p>
      <h2>9. Réclamations et médiation</h2>
      <p>Contact : {LEGAL.email}. En cas de litige, le client consommateur peut recourir gratuitement au médiateur de la consommation : {v(LEGAL.mediateur)}.</p>
      <h2>10. Droit applicable</h2>
      <p>Les présentes conditions sont soumises au droit français.</p>
    </PageLegale>
  );
}
