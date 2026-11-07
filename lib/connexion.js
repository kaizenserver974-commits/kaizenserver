// Messages d'erreur de connexion (Supabase) traduits pour les clients.
export const MOT_DE_PASSE_MIN = 8;

export function traduireErreur(message) {
  const m = String(message || "");
  if (/invalid login credentials/i.test(m)) return "E-mail ou mot de passe incorrect. Pas encore de mot de passe ? Utilisez « Créer mon compte » ou « Mot de passe oublié ».";
  if (/email not confirmed/i.test(m)) return "Confirmez d'abord votre adresse : ouvrez l'e-mail de confirmation reçu (pensez aux indésirables).";
  if (/already registered|already been registered|user already exists/i.test(m)) return "Un compte existe déjà avec cette adresse. Connectez-vous, ou utilisez « Mot de passe oublié » pour choisir un mot de passe.";
  if (/rate limit|security purposes|seconds/i.test(m)) return "Trop de demandes : attendez quelques minutes avant de réessayer.";
  if (/password should be|weak password|at least/i.test(m)) return `Mot de passe trop faible : au moins ${MOT_DE_PASSE_MIN} caractères, avec des lettres et des chiffres.`;
  if (/same.*password|different from the old/i.test(m)) return "Choisissez un mot de passe différent de l'ancien.";
  if (/signups? not allowed|signup is disabled/i.test(m)) return "Les inscriptions sont désactivées dans Supabase (Authentication → Sign In / Providers).";
  if (/failed to fetch|network/i.test(m)) return "Connexion impossible pour le moment. Vérifiez votre réseau et réessayez.";
  return `Une erreur est survenue. (Détail : ${m || "inconnu"})`;
}

export function verifierMotDePasse(mdp, confirmation) {
  if (String(mdp).length < MOT_DE_PASSE_MIN) return `Le mot de passe doit contenir au moins ${MOT_DE_PASSE_MIN} caractères.`;
  if (!/[A-Za-z]/.test(mdp) || !/[0-9]/.test(mdp)) return "Utilisez au moins une lettre et un chiffre.";
  if (confirmation !== undefined && mdp !== confirmation) return "Les deux mots de passe ne correspondent pas.";
  return "";
}
