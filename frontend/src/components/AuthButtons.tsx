import { UserButton, SignInButton, useUser } from "@clerk/clerk-react";

const clerkEnabled = !!import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

/**
 * Auth UI for the sidebar. Safe to render even without ClerkProvider —
 * returns null if Clerk is not configured.
 */
export function AuthButtons() {
  if (!clerkEnabled) return null;
  return <AuthButtonsInner />;
}

function AuthButtonsInner() {
  const { isSignedIn, user } = useUser();

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        paddingTop: "var(--space-4)",
        borderTop: "1px solid var(--color-border)",
      }}
    >
      {isSignedIn ? (
        <>
          <UserButton afterSignOutUrl="/" />
          <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-sec)" }}>
            {user?.firstName ?? user?.emailAddresses[0]?.emailAddress}
          </span>
        </>
      ) : (
        <SignInButton mode="modal">
          <button
            style={{
              background: "var(--color-orange)",
              color: "white",
              border: "none",
              borderRadius: "var(--radius-md)",
              padding: "6px 16px",
              fontSize: "var(--text-sm)",
              fontWeight: 600,
              cursor: "pointer",
              width: "100%",
            }}
          >
            Sign In
          </button>
        </SignInButton>
      )}
    </div>
  );
}

/**
 * Sign-in prompt banner for preferences page.
 */
export function SignInBanner() {
  if (!clerkEnabled) return null;
  return <SignInBannerInner />;
}

function SignInBannerInner() {
  const { isSignedIn } = useUser();

  if (isSignedIn) return null;

  return (
    <div
      style={{
        background: "var(--color-surface)",
        border: "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding: "var(--space-4)",
        marginBottom: "var(--space-5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <span style={{ fontSize: "var(--text-sm)", color: "var(--color-text-sec)" }}>
        Sign in to save preferences across devices
      </span>
      <SignInButton mode="modal">
        <button
          style={{
            background: "var(--color-orange)",
            color: "white",
            border: "none",
            borderRadius: "var(--radius-md)",
            padding: "6px 16px",
            fontSize: "var(--text-sm)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Sign In
        </button>
      </SignInButton>
    </div>
  );
}
