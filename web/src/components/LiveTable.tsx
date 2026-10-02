// Small table for data-dependent answers and live checks (values are engine display strings).
export function LiveTable({ title, cols, rows, note }: { title: string; cols: [string, string][]; rows: Record<string, unknown>[]; note?: string }) {
  return (
    <figure className="live-table">
      <figcaption>{title}</figcaption>
      <div className="table-scroll">
        <table className="rich-table num">
          <thead>
            <tr>{cols.map(([k, l]) => <th key={k}>{l}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>{cols.map(([k]) => <td key={k}>{r[k] == null || r[k] === "" ? "—" : String(r[k])}</td>)}</tr>
            ))}
          </tbody>
        </table>
      </div>
      {note && <p className="muted small">{note}</p>}
    </figure>
  );
}
