export default function PageLegale({ surtitre, titre, children, majLe }) {
  return (
    <main className="conteneur page">
      <article className="carte legal">
        <p className="surtitre">{surtitre}</p>
        <h1 className="h-page">{titre}</h1>
        {majLe && <p className="note">Dernière mise à jour : {majLe}</p>}
        {children}
      </article>
    </main>
  );
}
