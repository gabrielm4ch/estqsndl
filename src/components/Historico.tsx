import { useMemo, useState } from "react";
import { exportarPDF } from "@/lib/pdf";

const toInput = (d: Date) => {
  const z = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return z.toISOString().slice(0, 10);
};

export function Historico({ titulo, botao, head, rows }: {
  titulo: string; botao: string; head: string[];
  rows: { data: string; cells: (string | number)[] }[];
}) {
  const [aberto, setAberto] = useState(false);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");

  const sorted = useMemo(() => [...rows].sort((a, b) => b.data.localeCompare(a.data)), [rows]);
  const visiveis = useMemo(() => {
    if (!aberto) return sorted.slice(0, 5);
    const ini = de ? new Date(de + "T00:00:00").getTime() : -Infinity;
    const fim = ate ? new Date(ate + "T23:59:59.999").getTime() : Infinity;
    return sorted.filter((r) => { const t = new Date(r.data).getTime(); return t >= ini && t <= fim; });
  }, [sorted, aberto, de, ate]);

  const abrir = () => {
    if (aberto) return setAberto(false);
    const hoje = new Date();
    setAte(toInput(hoje));
    setDe(toInput(new Date(hoje.getTime() - 30 * 864e5)));
    setAberto(true);
  };

  const periodo = aberto
    ? `Período: ${de ? new Date(de + "T00:00").toLocaleDateString("pt-BR") : "início"} até ${ate ? new Date(ate + "T00:00").toLocaleDateString("pt-BR") : "hoje"}`
    : "Últimas 5 movimentações";

  return (
    <section className="panel">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="panel-title">{titulo}</h2>
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-ghost" onClick={abrir}>{aberto ? "Mostrar só últimas 5" : botao}</button>
          <button className="btn btn-ghost" onClick={() => exportarPDF(titulo, periodo, head, visiveis.map((r) => r.cells))}>Exportar PDF</button>
        </div>
      </div>
      {aberto && (
        <div className="mt-4 flex flex-wrap gap-4">
          <label className="field">De:<input type="date" className="input" value={de} onChange={(e) => setDe(e.target.value)} /></label>
          <label className="field">Até:<input type="date" className="input" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
        </div>
      )}
      <p className="mt-3 text-sm text-muted-foreground">{periodo} · {visiveis.length} registro(s)</p>
      <div className="mt-3 overflow-x-auto">
        <table className="tbl">
          <thead><tr>{head.map((h) => <th key={h}>{h}</th>)}</tr></thead>
          <tbody>
            {visiveis.length === 0 && <tr><td colSpan={head.length} className="text-muted-foreground">Nenhum registro.</td></tr>}
            {visiveis.map((r, i) => <tr key={i}>{r.cells.map((c, j) => <td key={j}>{c}</td>)}</tr>)}
          </tbody>
        </table>
      </div>
    </section>
  );
}
