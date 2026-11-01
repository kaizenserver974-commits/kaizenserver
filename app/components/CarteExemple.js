export default function CarteExemple({ e }) {
  return (
    <a className="exemple" href={`/nouveau?idee=${encodeURIComponent(e.idee)}`}>
      <div className="mini-ecran" style={{ "--c1": e.c1, "--c2": e.c2 }} aria-hidden="true">
        <i /><i className="l2" />
        <div className="tuiles"><b /><b /><b /><b /></div>
      </div>
      <div><h3>{e.t}</h3><p>{e.s}</p></div>
      <p>{e.idee}</p>
      <span className="lien">Partir de cette idée →</span>
    </a>
  );
}
