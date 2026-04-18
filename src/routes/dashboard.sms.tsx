import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare } from "lucide-react";
import { PageHeader, PanelCard, EmptyState } from "@/components/dashboard/Shell";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/sms")({
  component: SmsPage,
});

function SmsPage() {
  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Bulk SMS"
        description="Send branded SMS, manage contacts and track delivery."
        actions={<Button disabled><MessageSquare className="mr-1 h-4 w-4" />New campaign</Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "SMS credits", value: "0" },
          { label: "Contacts", value: "0" },
          { label: "Sender IDs", value: "0" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
            <div className="text-xs uppercase text-muted-foreground">{s.label}</div>
            <div className="mt-2 text-2xl font-bold">{s.value}</div>
          </div>
        ))}
      </div>

      <PanelCard title="Campaigns" description="Recent SMS campaigns">
        <EmptyState
          icon={<MessageSquare className="h-5 w-5" />}
          title="SMS gateway coming soon"
          description="The bulk SMS console connects to our gateway in the next phase. Buy a credit pack now to get going as soon as it launches."
          action={<Button asChild><Link to="/bulk-sms">Buy SMS credits</Link></Button>}
        />
      </PanelCard>
    </div>
  );
}
