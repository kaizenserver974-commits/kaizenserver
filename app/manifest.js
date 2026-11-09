// Signet / application sur l'écran d'accueil (téléphone, tablette, ordinateur).
export default function manifest() {
  return {
    name: "KaizenServer — créez l'application de vos rêves",
    short_name: "KaizenServer",
    description: "Décrivez votre idée : KaizenServer vous guide jusqu'à votre application.",
    start_url: "/",
    display: "standalone",
    background_color: "#06061a",
    theme_color: "#06061a",
    lang: "fr",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
