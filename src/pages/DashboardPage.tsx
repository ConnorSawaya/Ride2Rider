import {
  ArrowRight,
  Bell,
  CarFront,
  Compass,
  Plus,
  ShieldCheck,
  UserPlus,
  Users
} from "lucide-react";
import { Link } from "react-router-dom";

import { useAppContext } from "../context/AppContext";
import { formatDateTimeLabel, formatStatusLabel } from "../utils/format";
import { Badge, Button, ButtonLink, Card, EmptyState, ProgressBar, SectionHeading, StatCard } from "../components/ui";

export function DashboardPage() {
  const { state, requestJoinRide } = useAppContext();

  const ridesToday = state.rides.filter(ride => new Date(ride.date).getDate() === new Date().getDate());
  const upcomingRides = [...state.rides]
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .slice(0, 4);
  const activeRide = state.rides.find(ride => ride.status === "driver_on_way" || ride.status === "picked_up") ?? state.rides[0];
  const pendingApprovals = state.joinRequests.filter(
    request => request.parentStatus === "pending" || request.driverStatus === "pending"
  );
  const openSeats = state.rides.reduce((total, ride) => total + ride.seatsOpen, 0);
  const suggestionCards = state.rides.flatMap(ride => ride.smartSuggestions.map(suggestion => ({ ...suggestion, rideId: ride.id }))).slice(0, 3);

  return (
    <div className="page-stack">
      <section className="dashboard-hero">
        <Card className="overview-card overview-card--wide">
          <div className="overview-card__header">
            <div>
              <div className="section-heading__eyebrow">Today&apos;s transportation overview</div>
              <h2>Everything families need before the first pickup.</h2>
              <p>Open seats, active rides, approvals, and route confidence are all visible without feeling like a generic operations dashboard.</p>
            </div>
            <Badge tone="accent">Parent-trust mode</Badge>
          </div>

          <div className="overview-card__metrics">
            <StatCard label="Rides today" value={String(ridesToday.length)} detail="School, practice, club, and return boards" icon={<CarFront size={16} />} />
            <StatCard label="Open seats" value={String(openSeats)} detail="Across current demo groups" icon={<Users size={16} />} />
            <StatCard label="Pending approvals" value={String(pendingApprovals.length)} detail="Passenger or driver checks still waiting" icon={<ShieldCheck size={16} />} />
          </div>

          <div className="timeline-strip">
            {ridesToday.slice(0, 4).map(ride => (
              <div key={ride.id} className="timeline-strip__item">
                <span className="timeline-strip__time">{formatDateTimeLabel(ride.date).split(" at ")[1]}</span>
                <strong>{ride.title}</strong>
                <span>{formatStatusLabel(ride.status)}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card className="overview-card">
          <SectionHeading eyebrow="Quick actions" title="Move fast" description="Every core action in the MVP is one click away." />
          <div className="quick-actions">
            <ButtonLink to="/rides/new" icon={<Plus size={16} />} fullWidth>
              Create ride
            </ButtonLink>
            <ButtonLink to="/map" tone="secondary" icon={<Compass size={16} />} fullWidth>
              View map
            </ButtonLink>
            <ButtonLink to="/groups" tone="secondary" icon={<UserPlus size={16} />} fullWidth>
              Invite family
            </ButtonLink>
            <ButtonLink to="/approvals" tone="secondary" icon={<ShieldCheck size={16} />} fullWidth>
              Review approvals
            </ButtonLink>
          </div>
        </Card>
      </section>

      <section className="content-grid content-grid--dashboard">
        <div className="content-grid__main page-stack">
          <SectionHeading
            eyebrow="Ride boards"
            title="Upcoming and active rides"
            description="Consistent ride cards keep seat count, trust details, and next actions readable on desktop and mobile."
          />

          <div className="ride-board-list">
            {upcomingRides.map(ride => {
              const driver = state.drivers.find(item => item.id === ride.driverId);
              return (
                <Card key={ride.id} className="ride-board-card">
                  <div className="ride-board-card__top">
                    <div>
                      <div className="ride-board-card__eyebrow">{ride.groupName}</div>
                      <Link to={`/rides/${ride.id}`} className="ride-board-card__title-link">
                        {ride.title}
                      </Link>
                    </div>
                    <Badge tone={ride.status === "arrived" ? "success" : ride.status === "waiting" ? "neutral" : "accent"}>
                      {formatStatusLabel(ride.status)}
                    </Badge>
                  </div>

                  <div className="ride-board-card__meta">
                    <span>{formatDateTimeLabel(ride.date)}</span>
                    <span>{ride.destinationName}</span>
                    <span>{ride.seatsOpen} seats open</span>
                  </div>

                  <p className="ride-board-card__notes">{ride.nearbyFamilies}</p>

                  <div className="ride-board-card__footer">
                    <div className="driver-inline">
                      <div className="avatar-pill">{driver?.avatar ?? "DR"}</div>
                      <div>
                        <strong>{driver?.name}</strong>
                        <span>{driver?.vehicle}</span>
                      </div>
                    </div>

                    <div className="ride-board-card__actions">
                      <ButtonLink to={`/rides/${ride.id}`} tone="secondary" size="sm" icon={<ArrowRight size={14} />}>
                        View
                      </ButtonLink>
                      <Button size="sm" onClick={() => requestJoinRide(ride.id)}>
                        Join ride
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        <div className="content-grid__side page-stack">
          <Card className="focus-card">
            <SectionHeading eyebrow="Active ride" title={activeRide.title} description={activeRide.progressLabel} />
            <div className="focus-card__row">
              <span>Status</span>
              <Badge tone="accent">{formatStatusLabel(activeRide.status)}</Badge>
            </div>
            <div className="focus-card__row">
              <span>Driver ETA</span>
              <strong>{activeRide.driverPosition.eta}</strong>
            </div>
            <div className="focus-card__row">
              <span>Seat availability</span>
              <strong>{activeRide.seatsOpen} open</strong>
            </div>
            <ProgressBar value={activeRide.status === "driver_on_way" ? 58 : activeRide.status === "picked_up" ? 82 : 24} />
            <ButtonLink to={`/rides/${activeRide.id}`} tone="secondary" fullWidth>
              Open ride detail
            </ButtonLink>
          </Card>

          <Card className="focus-card">
            <SectionHeading eyebrow="Pending approvals" title="Clear the queue" description="Approvals keep the passenger list trustworthy before anyone gets in the car." />
            {pendingApprovals.length === 0 ? (
              <EmptyState title="No pending approvals" description="All current requests are cleared. New ride requests will show up here." />
            ) : (
              <div className="stack-list">
                {pendingApprovals.slice(0, 3).map(request => (
                  <div key={request.id} className="list-row">
                    <div>
                      <strong>{request.requestedFor}</strong>
                      <span>{request.rideTitle}</span>
                    </div>
                    <Badge tone="warning">
                      {request.parentStatus === "pending" ? "Parent pending" : request.driverStatus === "pending" ? "Driver pending" : "Ready"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
            <ButtonLink to="/approvals" tone="secondary" fullWidth>
              Review all approvals
            </ButtonLink>
          </Card>

          <Card className="focus-card">
            <SectionHeading eyebrow="Smart suggestions" title="Next best ride moves" description="Simple product cues make the demo feel more like a focused startup than a static template." />
            <div className="stack-list">
              {suggestionCards.map(suggestion => (
                <Link key={suggestion.id} to={`/rides/${suggestion.rideId}`} className="suggestion-link">
                  <strong>{suggestion.title}</strong>
                  <span>{suggestion.detail}</span>
                </Link>
              ))}
            </div>
          </Card>

          <Card className="focus-card">
            <SectionHeading eyebrow="Notifications" title="Recent alerts" description="Status updates stay short, readable, and clearly tied to a real ride event." />
            <div className="stack-list">
              {state.notifications.slice(0, 3).map(notification => (
                <div key={notification.id} className="list-row list-row--stacked">
                  <div className="list-row__leading">
                    <Bell size={15} />
                  </div>
                  <div>
                    <strong>{notification.title}</strong>
                    <span>{notification.body}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
