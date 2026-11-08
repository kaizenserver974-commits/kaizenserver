import "./globals.css";
import Logo from "./components/Logo.js";
import Aide from "./components/Aide.js";
import { EnteteNav, NavBasse } from "./components/Navigation.js";

export const metadata = {
  title: "KaizenServer — créez l'application de vos rêves",
  description: "Décrivez votre idée : KaizenServer vous guide, comme dans un jeu, jusqu'à la commande de votre application. Server, le maître du jeu, vous donne tarif, délai et conseils.",
};

export const viewport = { width: "device-width", initialScale: 1, themeColor: "#06061a" };

export default function RootLayout({ children }) {
  return (
    <html lang="fr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <header className="entete">
          <div className="conteneur entete-in">
            <a href="/" className="marque">
              <Logo />
              <span className="marque-texte"><strong>KAIZENSERVER</strong><small>Créez l'application de vos rêves</small></span>
            </a>
            <EnteteNav />
          </div>
        </header>
        {children}
        <footer className="pied conteneur">
          <p>KaizenServer — chaque idée mérite d'avancer, un pas après l'autre.</p>
          <nav className="pied-liens" aria-label="Informations légales">
            <a href="/mentions-legales">Mentions légales</a>
            <a href="/cgv">Conditions de vente</a>
            <a href="/confidentialite">Confidentialité</a>
          </nav>
        </footer>
        <Aide />
        <NavBasse />
      </body>
    </html>
  );
}
