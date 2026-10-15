export async function exportarPDF(titulo: string, subtitulo: string, head: string[], body: (string | number)[][]) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text(titulo, 14, 16);
  doc.setFontSize(10);
  doc.text(subtitulo, 14, 23);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, 14, 29);
  autoTable(doc, { head: [head], body, startY: 34, styles: { fontSize: 9 }, headStyles: { fillColor: [40, 52, 70] } });
  doc.save(`${titulo.toLowerCase().replace(/\s+/g, "-")}.pdf`);
}
