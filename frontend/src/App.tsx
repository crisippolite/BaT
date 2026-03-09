import { Routes, Route } from "react-router-dom";
import { Sidebar } from "./components/Sidebar";
import { FeedView } from "./components/FeedView";
import { DetailView } from "./components/DetailView";
import { CompareView } from "./components/CompareView";
import { PreferencesView } from "./components/PreferencesView";
import { MarketView } from "./components/MarketView";

export default function App() {
  return (
    <div className="app-shell">
      <Sidebar />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<FeedView />} />
          <Route path="/auction/:id" element={<DetailView />} />
          <Route path="/compare" element={<CompareView />} />
          <Route path="/preferences" element={<PreferencesView />} />
          <Route path="/market" element={<MarketView />} />
        </Routes>
      </main>
    </div>
  );
}
