import Formulaire from "./Formulaire.js";

const TITRE = "Le monde Kaizen ouvre bientôt — votre application de rêve";
const DESCRIPTION = "Pour votre entreprise ou pour vous : décrivez votre idée d'application, nous la créons pour vous à prix doux. Inscrivez votre projet dès maintenant.";

// Aperçu soigné quand le lien est partagé sur Facebook, Instagram, WhatsApp…
export const metadata = {
  title: TITRE,
  description: DESCRIPTION,
  openGraph: { title: TITRE, description: DESCRIPTION, type: "website", locale: "fr_FR", url: "https://kaizenserver.fr/bientot", siteName: "KaizenServer", images: [{ url: "https://kaizenserver.fr/personnages/scene.webp", width: 1064, height: 680, alt: "Les personnages de KaizenServer" }] },
  twitter: { card: "summary_large_image", title: TITRE, description: DESCRIPTION, images: ["https://kaizenserver.fr/personnages/scene.webp"] },
};

export default function Bientot() {
  return (
    <main className="conteneur page bientot">
      <section className="bientot-hero">
        <div>
          <p className="surtitre">🌍 Bientôt</p>
          <h1 className="h-page">Le monde Kaizen ouvre bientôt pour réaliser <span className="degrade">votre application de rêve</span></h1>
          <p className="intro">Vous avez besoin d'une application <b>pour votre entreprise</b> ou <b>pour vous, personnellement</b> ? Dites-le-nous : <b>nous la créons pour vous, à prix doux</b>.</p>
          <ul className="bientot-points">
            <li>💡 Décrivez votre idée en quelques mots</li>
            <li>👑 Server, le maître du jeu, l'étudie et vous recontacte</li>
            <li>💶 Une proposition claire et économique, sans engagement</li>
          </ul>
        </div>
        <img src="/personnages/scene.webp" alt="Les personnages de KaizenServer" className="bientot-image" />
      </section>
      <Formulaire />
    </main>
  );
}
