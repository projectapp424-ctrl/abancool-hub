import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Cloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export const Route = createFileRoute("/signup")({
  head: () => ({
    meta: [
      { title: "Create account | Abancool Technology" },
      { name: "description", content: "Open your Abancool Technology client account in minutes." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { signUp, user, loading } = useAuth();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    email: "", password: "", first_name: "", last_name: "", phone: "", company: "", country: "",
  });

  useEffect(() => {
    if (!loading && user) void nav({ to: "/dashboard" });
  }, [user, loading, nav]);

  function up<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.email || !form.password || !form.first_name || !form.last_name) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (form.password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    const { error } = await signUp({ ...form, email: form.email.trim() });
    setBusy(false);
    if (error) toast.error(error);
    else {
      toast.success("Account created. Welcome to Abancool!");
      void nav({ to: "/dashboard" });
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="container-x flex h-16 items-center">
          <Link to="/" className="flex items-center gap-2 font-semibold">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Cloud className="h-4 w-4" />
            </span>
            <span>Abancool</span>
          </Link>
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-xl">
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-elevated)]">
            <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Get instant access to hosting, domains, POS and SMS.
            </p>
            <form onSubmit={onSubmit} className="mt-6 grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="first_name">First name *</Label>
                <Input id="first_name" maxLength={50} value={form.first_name} onChange={(e) => up("first_name", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last name *</Label>
                <Input id="last_name" maxLength={50} value={form.last_name} onChange={(e) => up("last_name", e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" autoComplete="email" maxLength={255} value={form.email} onChange={(e) => up("email", e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="password">Password *</Label>
                <Input id="password" type="password" autoComplete="new-password" value={form.password} onChange={(e) => up("password", e.target.value)} />
                <p className="text-xs text-muted-foreground">Minimum 8 characters.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" maxLength={30} value={form.phone} onChange={(e) => up("phone", e.target.value)} placeholder="+254..." />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country">Country</Label>
                <Input id="country" maxLength={60} value={form.country} onChange={(e) => up("country", e.target.value)} placeholder="Kenya" />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" maxLength={100} value={form.company} onChange={(e) => up("company", e.target.value)} />
              </div>
              <Button type="submit" className="sm:col-span-2" disabled={busy}>
                {busy ? "Creating account..." : "Create account"}
              </Button>
            </form>
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" className="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
