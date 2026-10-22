import { useMemo, useState } from "react";
import { apagarRegistros } from "@/lib/store";

type Reg = { id: string; data: string; label: string };
const ts = (d: string) => new Date(d.length === 10 ? d + "T00:00:00" : d).getTime();

/** Opção discreta para apagar registros de histórico, por seleção ou período. */
export function ApagarHistorico({ colecao, registros }: { colecao: "entradas" | "saidas" | "solicitacoes"; registros: Reg[] }) {
  const [aberto, setAberto] = useState(false);
  const [sel, setSel] = useState<string[]>([]);
  const [de, setDe] = useState("");
  const [ate, setAte] = useState("");
  const lista = useMemo(() => [...registros].sort((a, b) => b.data.localeCompare(a.data)), [registros]);
  const marcarPeriodo = () => {
    const ini = de ? new Date(de + "T00:00:00").getTime() : -Infinity;
    const fim = ate ? new Date(ate + "T23:59:59.999").getTime() : Infinity;
    setSel(lista.filter((r) => { const t = ts(r.data); return t >= ini && t <= fim; }).map((r) => r.id));
  };
  const apagar = () => {
    if (!sel.length || !window.confirm(`Apagar ${sel.length} registro(s) do histórico? Esta ação não pode ser desfeita.`)) return;
    apagarRegistros(colecao, sel);
    setSel([]);
  };
  if (!aberto) return <button type="button" className="mt-2 text-xs text-muted-foreground opacity-40 hover:opacity-100 hover:underline" onClick={() => setAberto(true)}>apagar registros</button>;
  return (
    <div className="mt-3 rounded border p-3 text-xs text-muted-foreground">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col">De<input type="date" className="input h-8 text-xs" value={de} onChange={(e) => setDe(e.target.value)} /></label>
        <label className="flex flex-col">Até<input type="date" className="input h-8 text-xs" value={ate} onChange={(e) => setAte(e.target.value)} /></label>
        <button type="button" className="underline" onClick={marcarPeriodo}>selecionar período</button>
        <button type="button" className="underline" onClick={() => setSel(sel.length === lista.length ? [] : lista.map((r) => r.id))}>{sel.length === lista.length && lista.length ? "desmarcar todos" : "selecionar todos"}</button>
        <button type="button" className="text-destructive underline disabled:opacity-40" disabled={!sel.length} onClick={apagar}>apagar selecionados ({sel.length})</button>
        <button type="button" className="ml-auto underline" onClick={() => { setAberto(false); setSel([]); }}>fechar</button>
      </div>
      <div className="mt-2 max-h-48 overflow-y-auto">
        {lista.length === 0 && <p>Nenhum registro.</p>}
        {lista.map((r) => (
          <label key={r.id} className="flex items-center gap-2 py-0.5">
            <input type="checkbox" checked={sel.includes(r.id)} onChange={(e) => setSel(e.target.checked ? [...sel, r.id] : sel.filter((x) => x !== r.id))} />
            {r.label}
          </label>
        ))}
      </div>
    </div>
  );
}
