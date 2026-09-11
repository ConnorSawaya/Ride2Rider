import { Building2, ShieldCheck, UserRound, Users } from "lucide-react";

import { useAppContext } from "../context/AppContext";
import { Badge, ButtonLink, Card, SectionHeading, StatCard } from "../components/ui";

export function GroupsPage() {
  const { state } = useAppContext();

  const totalFamilies = state.groups.reduce((sum, group) => sum + group.families, 0);
  const totalKids = state.groups.reduce((sum, group) => sum + group.kids, 0);
  const totalParents = state.groups.reduce((sum, group) => sum + group.parents, 0);
  const totalDrivers = state.groups.reduce((sum, group) => sum + group.trustedDrivers, 0);

  return (
    <div className="page-stack">
      <section className="dashboard-hero">
        <StatCard label="Families" value={String(totalFamilies)} detail="Active in invite-only groups" icon={<Users size={16} />} />
        <StatCard label="Kids" value={String(totalKids)} detail="Riders across school, sports, and youth groups" icon={<UserRound size={16} />} />
        <StatCard label="Parents" value={String(totalParents)} detail="Approvers, organizers, and backup contacts" icon={<Building2 size={16} />} />
        <StatCard label="Trusted drivers" value={String(totalDrivers)} detail="Approved by group admins or family leads" icon={<ShieldCheck size={16} />} />
      </section>

      <Card>
        <SectionHeading
          eyebrow="Groups"
          title="Invite-only circles keep the product grounded in trust"
          description="This page reframes the app as a private coordination network rather than a generic ride marketplace."
        />

        <div className="tile-grid tile-grid--two">
          {state.groups.map(group => (
            <Card key={group.id} className="group-card">
              <div className="group-card__top">
                <div>
                  <div className="group-card__eyebrow">{group.type}</div>
                  <h3>{group.name}</h3>
                </div>
                <Badge tone={group.approvalStatus === "Admin approved" ? "success" : "warning"}>{group.approvalStatus}</Badge>
              </div>

              <p>{group.description}</p>

              <div className="group-stats">
                <div><span>Families</span><strong>{group.families}</strong></div>
                <div><span>Kids</span><strong>{group.kids}</strong></div>
                <div><span>Parents</span><strong>{group.parents}</strong></div>
                <div><span>Drivers</span><strong>{group.trustedDrivers}</strong></div>
              </div>

              <div className="stack-list">
                <div className="list-row"><strong>Next event</strong><span>{group.nextEvent}</span></div>
                <div className="list-row"><strong>Admin</strong><span>{group.adminName}</span></div>
                <div className="list-row"><strong>Access</strong><span>{group.inviteOnly ? "Invite-only" : "Open"}</span></div>
              </div>

              <div className="member-chip-list">
                {group.members.map(member => (
                  <div key={member.id} className="member-chip">
                    <div>
                      <strong>{member.name}</strong>
                      <span>{member.familyName} · {member.role}</span>
                    </div>
                    {member.badge ? <Badge tone="neutral">{member.badge}</Badge> : null}
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </Card>

      <Card className="landing-cta">
        <div>
          <Badge tone="accent">Admin mode concept</Badge>
          <h2>Schools, teams, and group leads can approve members before any ride board goes live.</h2>
          <p>That makes it easier to explain why the app is trusted, private, and operationally useful in the real world.</p>
        </div>
        <div className="landing-cta__actions">
          <ButtonLink to="/approvals" tone="secondary">Review approvals</ButtonLink>
          <ButtonLink to="/rides/new">Create group ride</ButtonLink>
        </div>
      </Card>
    </div>
  );
}
