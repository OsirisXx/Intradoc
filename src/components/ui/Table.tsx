type TableProps = {
  columns: string[]
  rows: (string | number | JSX.Element)[][]
}

export function Table({ columns, rows }: TableProps) {
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c} style={{
                textAlign: 'left',
                fontSize: 12,
                color: '#94a3b8',
                fontWeight: 600,
                padding: '8px 10px',
                borderBottom: '1px solid rgba(148,163,184,.15)'
              }}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((cell, j) => (
                <td key={j} style={{
                  padding: '10px',
                  fontSize: 14,
                  borderBottom: '1px solid rgba(148,163,184,.08)'
                }}>{cell}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}








