import React from "react";
import ReactDOM from "react-dom/client";
import { ClerkProvider, useAuth } from "@clerk/clerk-react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import "./styles/global.css";
import "./styles/components.css";

const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string
);

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string;

const tree = (
  <BrowserRouter>
    <App />
    <Toaster position="bottom-right" />
  </BrowserRouter>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {clerkPubKey ? (
      <ClerkProvider publishableKey={clerkPubKey}>
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          {tree}
        </ConvexProviderWithClerk>
      </ClerkProvider>
    ) : (
      <ConvexProvider client={convex}>
        {tree}
      </ConvexProvider>
    )}
  </React.StrictMode>
);
