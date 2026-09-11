import { useState } from "react";
import { AlertTriangle, CarFront, CheckCircle2, KeyRound, ShieldCheck, Timer, Users } from "lucide-react";
import { useParams } from "react-router-dom";

import { MapPanel } from "../components/MapPanel";
import { useAppContext } from "../context/AppContext";
import { formatDateTimeLabel, formatStatusLabel } from "../utils/format";
import { Badge, Button, ButtonLink, Card, EmptyState, Field, ProgressBar, SectionHeading, TextAreaInput } from "../components/ui";

function progressValue(status: string, pickedCount: number, total: number): number {
  if (status === "waiting") {
    return 22;
  }
  if (status === "driver_on_way") {
    return 42 + (pickedCount / Math.max(total, 1)) * 24;
  }
  if (status === "picked_up") {
    return 78;
  }
  if (status === "arrived") {
    return 100;
  }
  return 0;
}

export function RideDetailPage() {
  const { rideId } = useParams();
  const { state, requestJoinRide, advanceRideStatus, togglePickup, addComment } = useAppContext();
  const [message, setMessage] = useState("");

  const ride = state.rides.find(item => item.id === rideId);

  if (!ride) {
    return (
      <Card>
        <EmptyState
          title="Ride not found"
          description="This ride may have been removed from local demo state. Create a new one or head back to the dashboard."
          action={<ButtonLink to="/dashboard">Back to dashboard</ButtonLink>}
        />
      </Card>
    );
  }

  const driver = state.drivers.find(item => item.id === ride.driverId);
  const pickedCount = ride.passengers.filter(passenger => passenger.pickupStatus === "picked_up").length;
  const completion = progressValue(ride.status, pickedCount, ride.passengers.length);
  const pickupCode = ride.passengers[0]?.confirmationCode ?? "SAFE-000";

  return (
    <div className="page-stack">
      <Card className="detail-hero">
        <div className="detail-hero__top">
          <div>
            <div className="section-heading__eyebrow">{ride.groupName}</div>
            <h2>{ride.title}</h2>
            <p>{ride.notes}</p>
          </div>
          <div className="badge-row">
            <Badge tone="accent">{formatStatusLabel(ride.status)}</Badge>
            <Badge tone="neutral">{ride.boardLabel}</Badge>
            {ride.recurringLabel ? <Badge tone="neutral">{ride.recurringLabel}</Badge> : null}
          </div>
        </div>

        <div className="detail-hero__meta">
          <div>
            <span className="meta-label">Destination</span>
            <strong>{ride.destinationName}</strong>
          </div>
          <div>
            <span className="meta-label">Departure</span>
            <strong>{formatDateTimeLabel(ride.date)}</strong>
          </div>
          <div>
            <span className="meta-label">Seat availability</span>
            <strong>{ride.seatsOpen} open of {ride.seatsTotal}</strong>
          </div>
          <div>
            <span className="meta-label">Progress</span>
            <strong>{ride.progressLabel}</strong>
          </div>
        </div>

        <div className="panel-actions">
          <Button onClick={() => requestJoinRide(ride.id)}>Join / request ride</Button>
          <Button tone="secondary" onClick={() => advanceRideStatus(ride.id)}>
            Advance ride status
          </Button>
        </div>
      </Card>

      <section className="content-grid content-grid--detail">
        <div className="content-grid__main page-stack">
          <Card className="detail-map-card">
            <SectionHeading eyebrow="Map and route" title="Pickup progress" description="The main ride surface combines map context with status signals so the page feels operational, not decorative." />
            <MapPanel rides={[ride]} selectedRideId={ride.id} height={320} />
            <div className="detail-map-card__footer">
              <div>
                <span className="meta-label">Driver position</span>
                <strong>{ride.driverPosition.label}</strong>
              </div>
              <div>
                <span className="meta-label">ETA</span>
                <strong>{ride.driverPosition.eta}</strong>
              </div>
              <div>
                <span className="meta-label">Families nearby</span>
                <strong>{ride.nearbyFamilies}</strong>
              </div>
            </div>
          </Card>

          <Card className="timeline-card">
            <SectionHeading eyebrow="Timeline" title="Ride status history" description="This is the clearest record of what happened, when it happened, and who already approved the ride." />
            <div className="timeline-list">
              {ride.timeline.map(item => (
                <div key={item.id} className="timeline-list__item">
                  <div className="timeline-list__dot" />
                  <div>
                    <div className="timeline-list__top">
                      <strong>{item.label}</strong>
                      <span>{item.time}</span>
                    </div>
                    <p>{item.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="comments-card">
            <SectionHeading eyebrow="Comments and updates" title="Coordinate without a giant text thread" description="Short status updates make the ride feel alive and useful in a hackathon demo." />
            <Field label="Add update">
              <TextAreaInput rows={3} value={message} onChange={event => setMessage(event.target.value)} placeholder="Example: We will be two minutes late to the pickup stop." />
            </Field>
            <div className="panel-actions">
              <Button
                onClick={() => {
                  addComment(ride.id, message);
                  setMessage("");
                }}
              >
                Post update
              </Button>
            </div>

            <div className="comment-list">
              {ride.comments.map(comment => (
                <div key={comment.id} className="comment-item">
                  <div className="comment-item__top">
                    <strong>{comment.author}</strong>
                    <span>{comment.time}</span>
                  </div>
                  <p>{comment.message}</p>
                  <Badge tone={comment.type === "status" ? "neutral" : "accent"}>{comment.type === "status" ? "Status update" : "Comment"}</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="content-grid__side page-stack">
          <Card className="focus-card">
            <SectionHeading eyebrow="Who&apos;s driving?" title={driver?.name ?? "Trusted driver"} description={driver?.notes ?? "Driver record on file"} />
            <div className="driver-card">
              <div className="avatar-pill avatar-pill--large">{driver?.avatar ?? "DR"}</div>
              <div>
                <strong>{driver?.roleTitle}</strong>
                <span>{driver?.verifiedSince}</span>
              </div>
            </div>
            <div className="stack-list">
              <div className="list-row"><ShieldCheck size={15} /> <strong>{driver?.trustScore}/100 trust score</strong></div>
              <div className="list-row"><CarFront size={15} /> <strong>{driver?.vehicle}</strong></div>
              <div className="list-row"><Users size={15} /> <strong>{driver?.approvalsCount} approved rides</strong></div>
            </div>
          </Card>

          <Card className="focus-card">
            <SectionHeading eyebrow="Passenger list" title={`${ride.passengers.length} riders confirmed`} description="Seat count, approvals, and checklist status stay together in one consistent card." />
            <ProgressBar value={completion} />
            <div className="stack-list">
              {ride.passengers.map(passenger => (
                <div key={passenger.id} className="list-row list-row--stacked">
                  <div>
                    <strong>{passenger.name}</strong>
                    <span>{passenger.familyName} · {passenger.ageLabel}</span>
                  </div>
                  <Badge tone={passenger.parentApprovalStatus === "approved" ? "success" : passenger.parentApprovalStatus === "pending" ? "warning" : "danger"}>
                    Parent {passenger.parentApprovalStatus}
                  </Badge>
                </div>
              ))}
            </div>
          </Card>

          <Card className="focus-card">
            <SectionHeading eyebrow="Pickup checklist" title="Confirm each handoff" description="This mocked checklist updates local state and pushes the ride closer to its final status." />
            <div className="stack-list">
              {ride.passengers.map(passenger => (
                <button key={passenger.id} type="button" className="check-row" onClick={() => togglePickup(ride.id, passenger.id)}>
                  <div>
                    <strong>{passenger.name}</strong>
                    <span>{passenger.pickupStatus === "picked_up" ? "Passenger in car" : "Waiting at pickup"}</span>
                  </div>
                  <Badge tone={passenger.pickupStatus === "picked_up" ? "success" : "neutral"}>
                    {passenger.pickupStatus === "picked_up" ? "Picked up" : "Waiting"}
                  </Badge>
                </button>
              ))}
            </div>
          </Card>

          <Card className="focus-card">
            <SectionHeading eyebrow="Emergency details" title="Handoff confidence" description="Simple safety details make the ride detail view feel like a real product instead of a mock screen." />
            <div className="stack-list">
              <div className="list-row"><AlertTriangle size={15} /> <strong>{ride.passengers[0]?.emergencyContact ?? "Parent contact on file"}</strong></div>
              <div className="list-row"><KeyRound size={15} /> <strong>Pickup confirmation code: {pickupCode}</strong></div>
              <div className="list-row"><Timer size={15} /> <strong>{ride.driverPosition.eta}</strong></div>
              <div className="list-row"><CheckCircle2 size={15} /> <strong>{ride.savingsEstimate}</strong></div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
