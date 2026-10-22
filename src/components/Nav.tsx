import { Link, useLocation } from "@tanstack/react-router";

export function Nav() {
  const cls = "nav-link";
  const saidaAtiva = useLocation().pathname === "/saida-varios";
  return (
    <header className="topbar">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <span className="brand"><b>Almoxarifado</b> <span className="font-light">| Colégio Sinodal São Leopoldo</span></span>
        <nav className="flex flex-wrap gap-2">
          <Link to="/saida" className={`${cls} nav-out${saidaAtiva ? " nav-active" : ""}`} activeProps={{ className: "nav-link nav-out nav-active" }}>Saída</Link>
          <Link to="/entrada" className={`${cls} nav-in`} activeProps={{ className: "nav-link nav-in nav-active" }}>Entrada</Link>
          <Link to="/estoque" className="nav-link nav-stock" activeProps={{ className: "nav-link nav-stock nav-active" }}>Estoque Atual</Link>
          <Link to="/compra" className="nav-link nav-buy" activeProps={{ className: "nav-link nav-buy nav-active" }}>🛒 Solicitar Compra</Link>
          <Link to="/" className={`${cls} nav-data`} activeOptions={{ exact: true }} activeProps={{ className: "nav-link nav-data nav-active" }} aria-label="Banco de Dados" title="Banco de Dados"><span>📝</span><span className="nav-expand">Banco de Dados</span></Link>
        </nav>
      </div>
    </header>
  );
}
