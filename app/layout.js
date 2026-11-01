import "./globals.css";
import Logo from "./components/Logo.js";
import Aide from "./components/Aide.js";

export const metadata = {
  title: "KaizenServer — créez l'application de vos rêves",
  description: "Décrivez votre idée : KaizenServer vous guide, comme dans un jeu, jusqu'au projet d'application avec récapitulatif, estimation et maquette.",
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
            <nav className="entete-nav" aria-label="Navigation principale">
              <a href="/">Accueil</a>
              <a href="/nouveau">Commander</a>
              <a href="/exemples">Exemples</a>
              <a href="/tarifs">Tarifs</a>
              <a href="/ressources">Ressources</a>
              <a href="/a-propos">À propos</a>
              <a href="/connexion" className="btn petit contour masque-mobile">Se connecter</a>
              <a href="/nouveau" className="btn petit btn-entete">Créer <span className="masque-mobile">mon projet</span></a>
            </nav>
          </div>
        </header>
        {children}
        <footer className="pied conteneur">KaizenServer — chaque idée mérite d'avancer, un pas après l'autre.</footer>
        <Aide />
        <nav className="nav-basse" aria-label="Navigation mobile">
          <a href="/"><span>🏠</span>Accueil</a>
          <a href="/nouveau" className="principal"><span>✨</span>Commander</a>
          <a href="/projets"><span>📁</span>Projets</a>
          <a href="/espace?onglet=messages"><span>✉️</span>Messages</a>
          <a href="/espace?onglet=devis"><span>🧾</span>Devis</a>
          <a href="/espace"><span>👤</span>Profil</a>
        </nav>
      </body>
    </html>
  );
}
