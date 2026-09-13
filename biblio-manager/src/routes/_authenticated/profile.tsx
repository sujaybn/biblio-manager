import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/library/api";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Account — Shelf & Margin" },
      { name: "description", content: "Manage your account and password." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const session = useSession();
  const [provider, setProvider] = useState<string | null>(null);
  const [loadingProvider, setLoadingProvider] = useState(true);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(({ data }) => {
      if (!active) return;
      setProvider(data.user?.app_metadata?.provider ?? null);
      setLoadingProvider(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const hasPassword = provider === "email";

  async function changePassword(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Password should be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      toast.error("Those two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated.");
      setPassword("");
      setConfirm("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update your password.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg pb-12">
      <p className="eyebrow">Account</p>
      <h1 className="mt-1.5 font-display text-3xl">Your account</h1>

      <div className="paper mt-7 p-6">
        <h2 className="font-display text-lg">Signed in as</h2>
        <p className="mt-2 text-sm text-muted-foreground">{session.email ?? "…"}</p>
        {!loadingProvider && (
          <p className="mt-1 text-[12.5px] text-muted-foreground">
            Signed in with {provider === "google" ? "Google" : "email and password"}.
          </p>
        )}
      </div>

      <div className="paper mt-5 p-6">
        <h2 className="font-display text-lg">Password</h2>
        {loadingProvider ? (
          <p className="mt-3 text-sm text-muted-foreground">Checking your account…</p>
        ) : hasPassword ? (
          <form onSubmit={changePassword} className="mt-4 space-y-4">
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-1.5 rounded-xl"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="confirm-password">Confirm new password</Label>
              <Input
                id="confirm-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="mt-1.5 rounded-xl"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </div>
            <Button type="submit" className="rounded-full px-6" disabled={busy}>
              {busy ? "Updating…" : "Update password"}
            </Button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            You signed in with Google, so there's no separate password for this app — manage your
            sign-in through your Google account instead.
          </p>
        )}
      </div>
    </div>
  );
}