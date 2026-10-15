import { Link } from "@tanstack/react-router";

export function Nav() {
  const cls = "nav-link";
  return (
    <header className="topbar">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <span className="brand">▣ Almoxarifado</span>
        <nav className="flex gap-1">
          <Link to="/" className={cls} activeOptions={{ exact: true }} activeProps={{ className: "nav-link nav-active" }}>Banco de Dados</Link>
          <Link to="/entrada" className={cls} activeProps={{ className: "nav-link nav-active" }}>Entrada</Link>
          <Link to="/saida" className={cls} activeProps={{ className: "nav-link nav-active" }}>Saída</Link>
        </nav>
      </div>
    </header>
  );
}
