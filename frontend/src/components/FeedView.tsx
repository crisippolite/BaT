import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AuctionGrid } from "./AuctionGrid";

export function FeedView() {
  const auctions = useQuery(api.auctions.list, { status: "active", limit: 50 });
  const prefs = useQuery(api.preferences.get);

  return (
    <div>
      <div className="feed-header">
        <h1 className="feed-title">Live Auctions</h1>
        <span
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: "var(--text-sm)",
            color: "var(--color-text-muted)",
          }}
        >
          {auctions ? `${auctions.length} active` : "Loading..."}
        </span>
      </div>

      {auctions === undefined ? (
        <div className="loading">Loading auctions...</div>
      ) : (
        <AuctionGrid auctions={auctions} prefsJson={prefs?.prefsJson ?? null} />
      )}
    </div>
  );
}
