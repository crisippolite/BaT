import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useAppStore } from "../stores/appStore";
import { formatPrice } from "../lib/format";
import { ReserveBadge } from "./ReserveBadge";
import { TimeLeft } from "./TimeLeft";
import type { Id } from "../../convex/_generated/dataModel";

export function CompareView() {
  const { compareIds, removeFromCompare, clearCompare } = useAppStore();

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
          <p style={{ color: "var(--color-text-sec)" }}>
            Add auctions from the feed by clicking "Compare" on any card.
          </p>
        </div>
      </div>
    );
  }

  // Define rows with value extraction and best-value logic
  const rows: Array<{
    label: string;
    getValue: (a: (typeof auctions)[0]) => string;
    getNumeric?: (a: (typeof auctions)[0]) => number | null;
    bestIs?: "lowest" | "highest";
  }> = [
    { label: "Year", getValue: (a) => String(a.year ?? "—") },
    {
      label: "Current Bid",
      getValue: (a) => formatPrice(a.currentBid ?? 0),
      getNumeric: (a) => a.currentBid ?? null,
      bestIs: "lowest",
    },
    {
      label: "Predicted Final",
      getValue: (a) =>
        a.prediction ? formatPrice(a.prediction.predictedFinal) : "—",
      getNumeric: (a) => a.prediction?.predictedFinal ?? null,
    },
    {
      label: "P10 (Low)",
      getValue: (a) =>
        a.prediction ? formatPrice(a.prediction.confidenceLow) : "—",
    },
    {
      label: "P90 (High)",
      getValue: (a) =>
        a.prediction ? formatPrice(a.prediction.confidenceHigh) : "—",
    },
    {
      label: "Upside",
      getValue: (a) => {
        if (!a.prediction || !a.currentBid) return "—";
        const upside = a.prediction.predictedFinal - a.currentBid;
        return upside > 0 ? `+${formatPrice(upside)}` : formatPrice(upside);
      },
      getNumeric: (a) => {
        if (!a.prediction || !a.currentBid) return null;
        return a.prediction.predictedFinal - a.currentBid;
      },
      bestIs: "highest",
    },
    {
      label: "Bid Count",
      getValue: (a) => String(a.bidCount ?? 0),
      getNumeric: (a) => a.bidCount ?? null,
      bestIs: "lowest",
    },
    {
      label: "Reserve",
      getValue: () => "",
    },
    {
      label: "Time Left",
      getValue: () => "",
    },
    {
      label: "Location",
      getValue: (a) => a.location ?? "—",
    },
  ];

  // Find best value per row
  function findBest(
    getNumeric: ((a: (typeof auctions)[0]) => number | null) | undefined,
    bestIs: "lowest" | "highest" | undefined
  ): Set<string> {
    if (!getNumeric || !bestIs || auctions.length < 2) return new Set();
    const values = auctions.map((a) => ({ id: a._id, val: getNumeric(a) }));
    const validValues = values.filter((v) => v.val !== null) as Array<{
      id: string;
      val: number;
    }>;
    if (validValues.length < 2) return new Set();
    const best =
      bestIs === "lowest"
        ? Math.min(...validValues.map((v) => v.val))
        : Math.max(...validValues.map((v) => v.val));
    return new Set(validValues.filter((v) => v.val === best).map((v) => v.id));
  }

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "var(--space-6)" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Compare ({compareIds.length})
        </h1>
        <button
          onClick={clearCompare}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            fontSize: "var(--text-sm)",
            fontWeight: 500,
          }}
        >
          Clear all
        </button>
      </div>

      {/* Image row */}
      <div style={{ display: "grid", gridTemplateColumns: `160px repeat(${auctions.length}, 1fr)`, gap: "var(--space-4)", marginBottom: "var(--space-6)" }}>
        <div />
        {auctions.map((a) => (
          <div key={a._id} style={{ position: "relative" }}>
            {a.imageUrl ? (
              <img
                src={a.imageUrl}
                alt={a.title}
                style={{
                  width: "100%",
                  height: 160,
                  objectFit: "cover",
                  borderRadius: "var(--radius-lg)",
                  background: "var(--color-surface-alt)",
                }}
              />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: 160,
                  background: "var(--color-surface-alt)",
                  borderRadius: "var(--radius-lg)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "var(--color-text-muted)",
                  fontSize: "var(--text-sm)",
                }}
              >
                No image
              </div>
            )}
          </div>
        ))}
      </div>

      <table className="compare-table">
        <thead>
          <tr>
            <th style={{ width: 160 }}>Attribute</th>
            {auctions.map((a) => (
              <th key={a._id}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "var(--text-sm)", fontWeight: 600, color: "var(--color-text)", textTransform: "none", letterSpacing: "normal" }}>
                    {a.title}
                  </span>
                  <button
                    onClick={() => removeFromCompare(a._id)}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--color-text-muted)",
                      cursor: "pointer",
                      fontSize: "16px",
                      lineHeight: 1,
                      padding: "2px 4px",
                    }}
                  >
                    ×
                  </button>
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const bestIds = findBest(row.getNumeric, row.bestIs);
            return (
              <tr key={row.label}>
                <td style={{ fontWeight: 500 }}>{row.label}</td>
                {auctions.map((a) => {
                  const isBest = bestIds.has(a._id);

                  // Special rendering for reserve and time-left rows
                  if (row.label === "Reserve") {
                    return (
                      <td key={a._id}>
                        <ReserveBadge status={a.reserveStatus as "met" | "not_met" | "unknown"} />
                      </td>
                    );
                  }
                  if (row.label === "Time Left") {
                    return (
                      <td key={a._id}>
                        <TimeLeft endTime={a.endTime} />
                      </td>
                    );
                  }

                  return (
                    <td
                      key={a._id}
                      className={isBest ? "best" : ""}
                    >
                      {row.getValue(a)}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
