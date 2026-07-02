'use client';
import { useState } from 'react';

const usd = (n) => '$' + Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function PreviewTable({ rows, total }) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, 15);

  return (
    <div className="sheetprev">
      <table>
        <thead>
          <tr>
            <th>Unit</th><th>Resident</th><th className="num">Electric</th><th className="num">Water</th>
            <th>Service start</th><th>Service end</th><th>Charge date</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {shown.map((r, i) => (
            <tr key={i}>
              <td>{r.unit}</td><td>{r.resident}</td>
              <td className="num">{usd(r.electric)}</td><td className="num">{usd(r.water)}</td>
              <td>{r.serviceStart}</td><td>{r.serviceEnd}</td><td>{r.chargeDate}</td>
              <td><span className={/^ok$/i.test(r.status) ? 'sst ok' : 'sst flag'}>{r.status}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="sheetprev-foot">
        {expanded ? `Showing all ${total} rows` : `Showing 15 of ${total} rows`}
        {total > 15 && (
          <button className="linkbtn" onClick={() => setExpanded((v) => !v)}>
            {expanded ? 'Show less' : `Show all ${total} rows`}
          </button>
        )}
      </div>
    </div>
  );
}
