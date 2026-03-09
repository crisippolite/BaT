import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAppStore } from "../stores/appStore";
import { formatPrice } from "../lib/format";
import type { Id } from "../../convex/_generated/dataModel";

export function CompareView() {
  const { compareIds, removeFromCompare, clearCompare } = useAppStore();

  // Fetch each auction in the compare list
  const auctionQueries = compareIds.map((id) =>
    // eslint-disable-next-line react-hooks/rules-of-hooks
    useQuery(api.auctions.getById, { id: id as Id<"auctions"> })
  );

  const auctions = auctionQueries.filter(
    (a): a is NonNullable<typeof a> => a !== undefined && a !== null
  );

  if (compareIds.length === 0) {
    return (
      <div>
        <h1 className="page-title">Compare Auctions</h1>
        <div className="empty-state">
          <div className="empty-state-title">No auctions to compare</div>
          <p>Add auctions from the feed to compare them side by side.</p>
        </div>
      </div>
    );
  }

  const rows = [
    { label: "Year", key: "year" },
    { label: "Current Bid", key: "currentBid", format: formatPrice },
    { label: "Predicted Final", key: "predictedFinal" },
    { label: "Bid Count", key: "bidCount" },
    { label: "Reserve", key: "reserveStatus" },
    { label: "Location", key: "location" },
  ];

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-5)" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Compare ({compareIds.length})
        </h1>
        <button
          onClick={clearCompare}
          style={{
            background: "none",
            border: "1px solid var(--color-border)",
            borderRadius: "var(--radius-md)",
            padding: "6px 12px",
            fontSize: "var(--text-sm)",
            color: "var(--color-text-sec)",
            cursor: "pointer",
          }}
        >
          Clear all
        </button>
      </div>

      <table className="compare-table">
        <thead>
          <tr>
            <th>Attribute</th>
            {auctions.map((a) => (
              <th key={a._id}>
                {a.title}
                <button
                  onClick={() => removeFromCompare(a._id)}
                  style={{
                    marginLeft: 8,
                    background: "none",
                    border: "none",
                    color: "var(--color-text-muted)",
                    cursor: "pointer",
                    fontSize: "var(--text-xs)",
                  }}
                >
                  Remove
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td style={{ fontWeight: 500 }}>{row.label}</td>
              {auctions.map((a) => {
                let value: string;
                if (row.key === "predictedFinal") {
                  value = a.prediction
                    ? formatPrice(a.prediction.predictedFinal)
                    : "—";
                } else {
                  const raw = (a as Record<string, unknown>)[row.key];
                  value = row.format
                    ? row.format(Number(raw) || 0)
                    : String(raw ?? "—");
                }
                return <td key={a._id}>{value}</td>;
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
