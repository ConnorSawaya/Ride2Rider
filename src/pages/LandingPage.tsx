import { useState } from "react";
import {
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  MapPinned,
  Shield,
  Users
} from "lucide-react";

import { MapPanel } from "../components/MapPanel";
import { useAppContext } from "../context/AppContext";
import { formatDateTimeLabel, formatStatusLabel } from "../utils/format";
import { Badge, ButtonLink, Card, SectionHeading, StatCard, cx } from "../components/ui";

const useCases = [
  "School pickup and drop-off",
  "Sports practice carpools",
  "Club meetings and build nights",
  "Youth group events",
  "Tournament coordination",
  "Friend group meetups"
];

const trustPoints = [
  {
    title: "Invite-only groups",
    description: "Ride boards exist inside approved school, team, club, church, or neighborhood circles only."
  },
  {
    title: "Parent approval required",
    description: "Kids are never added to a ride until a parent and a trusted driver both approve the request."
  },
  {
    title: "Trusted drivers only",
    description: "Every driver in the MVP uses a group-based approval flow instead of public ride matching."
  },
  {
    title: "Pickup code and handoff",
    description: "Families can use a mock confirmation code and arrival timeline to reduce confusion at pickup."
  }
];

export function LandingPage() {
  const { state } = useAppContext();
  const featuredRides = state.rides.slice(0, 3);
  const [selectedRideId, setSelectedRideId] = useState(featuredRides[0]?.id);
  const selectedRide = featuredRides.find(ride => ride.id === selectedRideId) ?? featuredRides[0];

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="brand">
          <div className="brand__mark">R</div>
          <div>
            <div className="brand__name">Ride2Rider</div>
            <div className="brand__sub">Private family ride coordination</div>
          </div>
        </div>

        <div className="landing-header__actions">
          <ButtonLink to="/dashboard" tone="secondary" size="sm">
            View Demo
          </ButtonLink>
          <ButtonLink to="/rides/new" size="sm">
            Create Ride
          </ButtonLink>
        </div>
      </header>

      <section className="hero-grid">
        <div className="hero-copy">
          <Badge tone="accent">Trusted group carpooling for families</Badge>
          <h1 className="hero-copy__title">
            Coordinate school, sports, clubs, and youth rides without turning kids into public ride requests.
          </h1>
          <p className="hero-copy__description">
            Ride2Rider helps approved families organize pickups, approve passengers, track ride progress, and reduce the daily back-and-forth around transportation.
          </p>

          <div className="hero-copy__actions">
            <ButtonLink to="/dashboard" icon={<ArrowRight size={16} />}>
              View Demo
            </ButtonLink>
            <ButtonLink to="/rides/new" tone="secondary" icon={<CalendarDays size={16} />}>
              Create Ride
            </ButtonLink>
          </div>

          <div className="hero-stats">
            <StatCard label="Invite-only groups" value="5" detail="School, sports, club, church, and neighborhood circles" icon={<Users size={16} />} />
            <StatCard label="Trusted drivers" value="23" detail="Mocked family-approved drivers across active groups" icon={<Shield size={16} />} />
            <StatCard label="Open seats today" value="9" detail="Live boards across upcoming rides in this demo" icon={<CheckCircle2 size={16} />} />
          </div>
        </div>

        <Card className="hero-map-card">
          <div className="hero-map-card__top">
            <div>
              <div className="hero-map-card__eyebrow">Today&apos;s live board preview</div>
              <h2>{selectedRide?.title}</h2>
            </div>
            <Badge tone="neutral">Simulated map</Badge>
          </div>

          <MapPanel rides={featuredRides} selectedRideId={selectedRideId} onSelectRide={setSelectedRideId} interactive={false} height={360} />

          <div className="hero-map-card__footer">
            <div className="hero-ride-list">
              {featuredRides.map(ride => (
                <button
                  key={ride.id}
                  type="button"
                  className={cx("hero-ride-item", ride.id === selectedRideId && "hero-ride-item--active")}
                  onClick={() => setSelectedRideId(ride.id)}
                >
                  <div>
                    <strong>{ride.title}</strong>
                    <span>{ride.groupName}</span>
                  </div>
                  <Badge tone="neutral">{formatStatusLabel(ride.status)}</Badge>
                </button>
              ))}
            </div>

            {selectedRide ? (
              <div className="hero-map-summary">
                <div>
                  <span className="meta-label">Next ride</span>
                  <strong>{formatDateTimeLabel(selectedRide.date)}</strong>
                </div>
                <div>
                  <span className="meta-label">Trust check</span>
                  <strong>{selectedRide.safetyScore}/100 safety score</strong>
                </div>
                <div>
                  <span className="meta-label">Nearby match</span>
                  <strong>{selectedRide.nearbyFamilies}</strong>
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      </section>

      <section className="section-block">
        <SectionHeading
          eyebrow="Use cases"
          title="Built for real family transportation moments"
          description="From morning school routes to tournament weekends, Ride2Rider is designed around trusted group coordination rather than anonymous ride-hailing."
        />

        <div className="tile-grid tile-grid--three">
          {useCases.map(item => (
            <Card key={item} className="feature-tile">
              <div className="feature-tile__icon">
                <MapPinned size={16} />
              </div>
              <h3>{item}</h3>
              <p>
                Approved families can share a ride board, keep pickup notes clear, and coordinate seats without switching between group texts.
              </p>
            </Card>
          ))}
        </div>
      </section>

      <section className="section-block">
        <SectionHeading
          eyebrow="Safety framing"
          title="Everything is designed to feel trusted, not public"
          description="The product makes it clear that rides happen inside pre-approved communities. No random drivers, no open marketplace, and no anonymous booking flow."
        />

        <div className="tile-grid tile-grid--four">
          {trustPoints.map(point => (
            <Card key={point.title} className="trust-tile">
              <Badge tone="accent">Safety</Badge>
              <h3>{point.title}</h3>
              <p>{point.description}</p>
            </Card>
          ))}
        </div>
      </section>

      <section className="section-block">
        <SectionHeading
          eyebrow="Product flow"
          title="What a Tuesday pickup actually looks like"
          description="The MVP focuses on the operational details that make family carpooling feel calm instead of chaotic."
        />

        <div className="story-grid">
          <Card className="story-card">
            <Badge tone="neutral">1. Open a board</Badge>
            <h3>Create a ride with trust rules already attached</h3>
            <p>Choose the group, set the driver, define seats, add pickup windows, and turn on parent approval plus status sharing.</p>
          </Card>
          <Card className="story-card">
            <Badge tone="neutral">2. Approve riders</Badge>
            <h3>Parents and drivers both clear the passenger list</h3>
            <p>Join requests stay pending until both sides approve. That keeps the ride board accurate before anyone arrives curbside.</p>
          </Card>
          <Card className="story-card">
            <Badge tone="neutral">3. Track the handoff</Badge>
            <h3>Use the map, timeline, and pickup code to reduce confusion</h3>
            <p>Families get a simple status tracker, pickup checklist, and destination confirmation without pretending to be public ride-hailing.</p>
          </Card>
        </div>
      </section>

      <Card className="landing-cta">
        <div>
          <Badge tone="accent">Hackathon-ready MVP</Badge>
          <h2>Show a calm, premium, parent-trust product in the first 30 seconds.</h2>
          <p>The demo includes live ride boards, requests, approvals, comments, settings, and a consistent dark mode design system.</p>
        </div>
        <div className="landing-cta__actions">
          <ButtonLink to="/dashboard" tone="secondary">
            Explore Demo
          </ButtonLink>
          <ButtonLink to="/rides/new">Open Create Ride</ButtonLink>
        </div>
      </Card>
    </div>
  );
}
