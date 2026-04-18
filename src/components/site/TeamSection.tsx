import { Linkedin, Mail } from "lucide-react";
import labanImg from "@/assets/team-laban-panda-khisa.jpg";

type Member = {
  name: string;
  role: string;
  group: "leadership" | "engineering";
  image?: string;
  initials: string;
};

const team: Member[] = [
  // Leadership — CEO down to lower staff
  { name: "To be announced", role: "Chief Executive Officer (CEO)", group: "leadership", initials: "CE" },
  { name: "To be announced", role: "Chief Technology Officer (CTO)", group: "leadership", initials: "CT" },
  { name: "To be announced", role: "Chief Operations Officer (COO)", group: "leadership", initials: "CO" },
  { name: "To be announced", role: "Head of Sales & Marketing", group: "leadership", initials: "SM" },
  { name: "To be announced", role: "Head of Customer Support", group: "leadership", initials: "CS" },
  { name: "To be announced", role: "Finance & Administration", group: "leadership", initials: "FA" },

  // Engineering — senior down to junior
  { name: "Laban Panda Khisa", role: "Senior Developer", group: "engineering", image: labanImg, initials: "LP" },
  { name: "To be announced", role: "Mid-level Developer", group: "engineering", initials: "MD" },
  { name: "To be announced", role: "Junior Developer", group: "engineering", initials: "JD" },
];

export function TeamSection() {
  const leadership = team.filter((m) => m.group === "leadership");
  const engineering = team.filter((m) => m.group === "engineering");

  return (
    <section className="border-t border-border bg-secondary/30 py-20">
      <div className="container-x">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Our Team</p>
          <h2 className="mt-3 text-3xl font-bold md:text-4xl">The people behind Abancool</h2>
          <p className="mt-3 text-muted-foreground">
            From leadership to engineering — a focused team building reliable infrastructure
            for African businesses.
          </p>
        </div>

        <div className="mt-14">
          <h3 className="mb-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Leadership
          </h3>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {leadership.map((m) => (
              <MemberCard key={m.role} member={m} />
            ))}
          </div>
        </div>

        <div className="mt-14">
          <h3 className="mb-6 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Engineering
          </h3>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {engineering.map((m) => (
              <MemberCard key={m.role} member={m} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function MemberCard({ member }: { member: Member }) {
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-elevated)]">
      <div className="flex items-center gap-4">
        {member.image ? (
          <img
            src={member.image}
            alt={`${member.name} — ${member.role}`}
            loading="lazy"
            width={64}
            height={64}
            className="h-16 w-16 rounded-xl object-cover ring-1 ring-border"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary-soft text-base font-semibold text-primary ring-1 ring-border">
            {member.initials}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-semibold text-foreground">{member.name}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{member.role}</div>
          <div className="mt-2 flex gap-2 text-muted-foreground">
            <Mail className="h-3.5 w-3.5" />
            <Linkedin className="h-3.5 w-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
}
