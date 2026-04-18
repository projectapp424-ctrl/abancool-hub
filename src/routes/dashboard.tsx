import { createFileRoute, Outlet, Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, type ComponentType } from "react";
import {
  LayoutDashboard, Boxes, Globe2, Server, Receipt, Wallet, MessageSquare, Store,
  LifeBuoy, UserCircle2, LogOut, Cloud, Menu, Loader2, ShieldCheck,
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarProvider, SidebarTrigger, useSidebar,
} from "@/components/ui/sidebar";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Client Area | Abancool Technology" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DashboardLayout,
});

type DashRoute =
  | "/dashboard" | "/dashboard/services" | "/dashboard/domains" | "/dashboard/hosting"
  | "/dashboard/billing" | "/dashboard/wallet" | "/dashboard/sms" | "/dashboard/pos"
  | "/dashboard/tickets" | "/dashboard/profile";

const navMain: { to: DashRoute; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { to: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { to: "/dashboard/services", label: "My Services", icon: Boxes },
  { to: "/dashboard/domains", label: "Domains", icon: Globe2 },
  { to: "/dashboard/hosting", label: "Hosting", icon: Server },
];
const navBilling: { to: DashRoute; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { to: "/dashboard/billing", label: "Billing", icon: Receipt },
  { to: "/dashboard/wallet", label: "Wallet", icon: Wallet },
];
const navProducts: { to: DashRoute; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { to: "/dashboard/sms", label: "Bulk SMS", icon: MessageSquare },
  { to: "/dashboard/pos", label: "POS Systems", icon: Store },
];
const navAccount: { to: DashRoute; label: string; icon: ComponentType<{ className?: string }> }[] = [
  { to: "/dashboard/tickets", label: "Support", icon: LifeBuoy },
  { to: "/dashboard/profile", label: "Profile", icon: UserCircle2 },
];

function DashboardLayout() {
  const { user, loading, profile, isStaff, signOut } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    if (!loading && !user) void nav({ to: "/login" });
  }, [loading, user, nav]);

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  async function onSignOut() {
    await signOut();
    toast.success("Signed out");
    void nav({ to: "/" });
  }

  const displayName =
    [profile?.first_name, profile?.last_name].filter(Boolean).join(" ") || user.email;

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-secondary/40">
        <DashSidebar onSignOut={onSignOut} />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur">
            <SidebarTrigger className="lg:hidden">
              <Menu className="h-5 w-5" />
            </SidebarTrigger>
            <div className="ml-auto flex items-center gap-3">
              {isStaff && (
                <span className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-2.5 py-1 text-xs font-medium text-primary">
                  <ShieldCheck className="h-3 w-3" /> Staff
                </span>
              )}
              <div className="text-right text-xs leading-tight">
                <div className="font-medium text-foreground">{displayName}</div>
                <div className="text-muted-foreground">{user.email}</div>
              </div>
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {(profile?.first_name?.[0] ?? user.email?.[0] ?? "?").toUpperCase()}
              </div>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}

function DashSidebar({ onSignOut }: { onSignOut: () => void }) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const path = useRouterState({ select: (s) => s.location.pathname });

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link to="/" className={cn("flex items-center gap-2 px-2 py-1 font-semibold", collapsed && "justify-center")}>
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Cloud className="h-4 w-4" />
          </span>
          {!collapsed && <span className="text-base">Abancool</span>}
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <NavGroup label="Main" items={navMain} path={path} />
        <NavGroup label="Billing" items={navBilling} path={path} />
        <NavGroup label="Products" items={navProducts} path={path} />
        <NavGroup label="Account" items={navAccount} path={path} />
      </SidebarContent>
      <SidebarFooter>
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={onSignOut}>
          <LogOut className="h-4 w-4" />
          {!collapsed && <span className="ml-2">Sign out</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}

function NavGroup({
  label, items, path,
}: {
  label: string;
  items: { to: DashRoute; label: string; icon: ComponentType<{ className?: string }> }[];
  path: string;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((it) => {
            const active = it.to === "/dashboard" ? path === "/dashboard" : path.startsWith(it.to);
            return (
              <SidebarMenuItem key={it.to}>
                <SidebarMenuButton asChild isActive={active} tooltip={it.label}>
                  <Link to={it.to}>
                    <it.icon className="h-4 w-4" />
                    <span>{it.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
