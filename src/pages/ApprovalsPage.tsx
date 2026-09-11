import { CheckCircle2, ShieldCheck, XCircle } from "lucide-react";

import { useAppContext } from "../context/AppContext";
import { Badge, Button, Card, EmptyState, SectionHeading } from "../components/ui";

export function ApprovalsPage() {
  const { state, resolveDriverApplication, resolveJoinRequest } = useAppContext();

  const pendingRequests = state.joinRequests.filter(
    request => request.parentStatus === "pending" || request.driverStatus === "pending"
  );
  const resolvedRequests = state.joinRequests.filter(
    request => request.parentStatus !== "pending" && request.driverStatus !== "pending"
  );
  const pendingDriverApplications = state.driverApplications.filter(item => item.status === "pending");

  return (
    <div className="page-stack">
      <Card>
        <SectionHeading
          eyebrow="Approvals"
          title="Parent and driver checks before the passenger list changes"
          description="These screens are a big part of what keeps the product from feeling like a public ride-sharing app."
        />

        {pendingRequests.length === 0 ? (
          <EmptyState title="No pending ride requests" description="All rider approvals are cleared. New join requests will appear here as families ask for seats." />
        ) : (
          <div className="approval-grid">
            {pendingRequests.map(request => (
              <Card key={request.id} className="approval-card">
                <div className="approval-card__top">
                  <div>
                    <div className="approval-card__eyebrow">Ride request</div>
                    <h3>{request.requestedFor}</h3>
                  </div>
                  <Badge tone="warning">Pending</Badge>
                </div>

                <p>{request.note}</p>

                <div className="stack-list">
                  <div className="list-row"><strong>Ride</strong><span>{request.rideTitle}</span></div>
                  <div className="list-row"><strong>Requested by</strong><span>{request.requestedBy}</span></div>
                  <div className="list-row"><strong>Time</strong><span>{request.requestedAt}</span></div>
                </div>

                <div className="badge-row">
                  <Badge tone={request.parentStatus === "approved" ? "success" : request.parentStatus === "pending" ? "warning" : "danger"}>
                    Parent {request.parentStatus}
                  </Badge>
                  <Badge tone={request.driverStatus === "approved" ? "success" : request.driverStatus === "pending" ? "warning" : "danger"}>
                    Driver {request.driverStatus}
                  </Badge>
                  <Badge tone="neutral">Trusted group only</Badge>
                </div>

                <div className="approval-actions">
                  {request.parentStatus === "pending" ? (
                    <Button size="sm" tone="secondary" icon={<CheckCircle2 size={14} />} onClick={() => resolveJoinRequest(request.id, "parent", "approved")}>
                      Approve parent
                    </Button>
                  ) : null}
                  {request.driverStatus === "pending" ? (
                    <Button size="sm" icon={<ShieldCheck size={14} />} onClick={() => resolveJoinRequest(request.id, "driver", "approved")}>
                      Approve driver
                    </Button>
                  ) : null}
                  <Button size="sm" tone="ghost" icon={<XCircle size={14} />} onClick={() => resolveJoinRequest(request.id, request.parentStatus === "pending" ? "parent" : "driver", "denied")}>
                    Deny
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <section className="content-grid content-grid--dashboard">
        <div className="content-grid__main page-stack">
          <Card>
            <SectionHeading
              eyebrow="Trusted driver approvals"
              title="Driver applications"
              description="The driver approval concept is part of the product story even before a real verification backend is wired in."
            />

            {pendingDriverApplications.length === 0 ? (
              <EmptyState title="No pending driver applications" description="All demo driver applications are resolved right now." />
            ) : (
              <div className="approval-grid">
                {pendingDriverApplications.map(application => (
                  <Card key={application.id} className="approval-card">
                    <div className="approval-card__top">
                      <div>
                        <div className="approval-card__eyebrow">Driver application</div>
                        <h3>{application.name}</h3>
                      </div>
                      <Badge tone="warning">Pending review</Badge>
                    </div>

                    <div className="stack-list">
                      <div className="list-row"><strong>Group</strong><span>{application.groupName}</span></div>
                      <div className="list-row"><strong>Vehicle</strong><span>{application.vehicle}</span></div>
                      <div className="list-row"><strong>Proof</strong><span>{application.proofLabel}</span></div>
                      <div className="list-row"><strong>Requested</strong><span>{application.requestedAt}</span></div>
                    </div>

                    <div className="approval-actions">
                      <Button size="sm" onClick={() => resolveDriverApplication(application.id, "approved")}>Approve driver</Button>
                      <Button size="sm" tone="ghost" onClick={() => resolveDriverApplication(application.id, "denied")}>Deny</Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="content-grid__side page-stack">
          <Card className="focus-card">
            <SectionHeading eyebrow="Resolved" title="Recently cleared requests" description="Keeping resolved items visible helps the app feel operational instead of static." />
            <div className="stack-list">
              {resolvedRequests.slice(0, 4).map(request => (
                <div key={request.id} className="list-row list-row--stacked">
                  <div>
                    <strong>{request.requestedFor}</strong>
                    <span>{request.rideTitle}</span>
                  </div>
                  <Badge tone={request.parentStatus === "denied" || request.driverStatus === "denied" ? "danger" : "success"}>
                    {request.parentStatus === "denied" || request.driverStatus === "denied" ? "Denied" : "Approved"}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
