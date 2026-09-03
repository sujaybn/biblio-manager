import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";
import { Toaster } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/library/api";

const NAV = [
  { to: "/library", label: "Library" },
  { to: "/reading", label: "Reading" },
  { to: "/wishlist", label: "Wish list" },
  { to: "/notes", label: "Notes" },
  { to: "/lending", label: "Lending" },
  { to: "/stats", label: "Stats" },
  { to: "/backup", label: "Backup" },
] as const;

function NotFoundComponent() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-2 font-display text-2xl">This page isn't on the shelf</h1>
        <Link
          to="/"
          className="mt-6 inline-flex items-center rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-2xl">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong on our side.</p>
        <button
          onClick={() => {
            router.invalidate();
            reset();
          }}
          className="mt-6 rounded-full bg-primary px-5 py-2 text-sm text-primary-foreground"
        >
          Try again
        </button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Shelf & Margin — Your personal library, kept warmly" },
      {
        name: "description",
        content:
          "Catalogue your Kannada and English books, track what you're reading, who borrowed what, your wish list, notes and reviews — in one calm place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Shelf & Margin — Your personal library, kept warmly" },
      { name: "twitter:title", content: "Shelf & Margin — Your personal library, kept warmly" },
      { property: "og:description", content: "Catalogue your Kannada and English books, track what you're reading, who borrowed what, your wish list, notes and reviews — in one calm place." },
      { name: "twitter:description", content: "Catalogue your Kannada and English books, track what you're reading, who borrowed what, your wish list, notes and reviews — in one calm place." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3c341a72-c256-4ee9-8d6c-15af0af8574d/id-preview-76432061--dd1ee43a-f66f-4c5b-8f88-dfed8f267e28.lovable.app-1785770725319.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/3c341a72-c256-4ee9-8d6c-15af0af8574d/id-preview-76432061--dd1ee43a-f66f-4c5b-8f88-dfed8f267e28.lovable.app-1785770725319.png" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;1,400&family=Nunito+Sans:wght@300;400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AppShell />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}

function AppShell() {
  const router = useRouter();
  const { queryClient } = Route.useRouteContext();
  const session = useSession();

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void router.invalidate();
      if (event !== "SIGNED_OUT") void queryClient.invalidateQueries();
    });
    return () => sub.subscription.unsubscribe();
  }, [router, queryClient]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    void router.navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-5 py-3">
          <Link to="/" className="shrink-0">
            <span className="font-display text-[17px] tracking-tight">Shelf &amp; Margin</span>
          </Link>
          {session.userId ? (
            <nav className="flex flex-1 items-center gap-0.5 overflow-x-auto">
              {NAV.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  className="shrink-0 whitespace-nowrap rounded-full px-3 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  activeProps={{ className: "bg-secondary text-foreground" }}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : (
            <div className="flex-1" />
          )}
          {session.loading ? null : session.userId ? (
            <button
              onClick={() => void signOut()}
              className="shrink-0 rounded-full border border-border px-3.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign out
            </button>
          ) : (
            <Link
              to="/auth"
              className="shrink-0 rounded-full bg-primary px-4 py-1.5 text-[13px] text-primary-foreground"
            >
              Sign in
            </Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8">
        <Outlet />
      </main>
    </div>
  );
}
