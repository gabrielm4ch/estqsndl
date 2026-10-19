import { Link } from "@tanstack/react-router";

export function Nav() {
  const cls = "nav-link";
  return (
    <header className="topbar">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <span className="brand">▣ Almoxarifado</span>
        <nav className="flex flex-wrap gap-2">
          <Link to="/saida" className={`${cls} nav-out`} activeProps={{ className: "nav-link nav-out nav-active" }}>Saída</Link>
          <Link to="/entrada" className={`${cls} nav-in`} activeProps={{ className: "nav-link nav-in nav-active" }}>Entrada</Link>
          <Link to="/compra" className="nav-link nav-buy" activeProps={{ className: "nav-link nav-buy nav-active" }}>🛒 Solicitar Compra</Link>
          <Link to="/" className={`${cls} nav-data`} activeOptions={{ exact: true }} activeProps={{ className: "nav-link nav-data nav-active" }}>Banco de Dados 📝</Link>
        </nav>
      </div>
    </header>
  );
}
