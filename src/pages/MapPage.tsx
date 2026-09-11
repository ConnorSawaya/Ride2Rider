import { useState } from "react";
import { CarFront, MapPinned, ShieldCheck, Users } from "lucide-react";

import { MapPanel } from "../components/MapPanel";
import { useAppContext } from "../context/AppContext";
import type { RideStatus } from "../types";
import { formatDateTimeLabel, formatStatusLabel } from "../utils/format";
import { Badge, Button, ButtonLink, Card, EmptyState, SectionHeading } from "../components/ui";

const filters: Array<{ value: "all" | RideStatus; label: string }> = [
  { value: "all", label: "All rides" },
  { value: "waiting", label: "Waiting" },
  { value: "driver_on_way", label: "Driver on the way" },
  { value: "picked_up", label: "Picked up" },
  { value: "arrived", label: "Arrived" }
];

export function MapPage() {
  const { state, requestJoinRide } = useAppContext();
  const [filter, setFilter] = useState<"all" | RideStatus>("all");
  const visibleRides = state.rides.filter(ride => (filter === "all" ? true : ride.status === filter));
  const [selectedRideId, setSelectedRideId] = useState(visibleRides[0]?.id ?? state.rides[0]?.id ?? "");
  const selectedRide = visibleRides.find(ride => ride.id === selectedRideId) ?? visibleRides[0];

  if (!selectedRide) {
    return (
      <Card>
        <EmptyState title="No rides for this filter" description="Try another status filter or create a new ride board to populate the map." />
      </Card>
    );
  }

  const selectedDriver = state.drivers.find(driver => driver.id === selectedRide.driverId);

  return (
    <div className="page-stack">
      <Card className="map-toolbar">
        <SectionHeading
          eyebrow="Map-centered experience"
          title="Pickup progress and destination confidence"
          description="Driver location is simulated in this MVP, but the map is wired like a real product surface rather than a placeholder screenshot."
        />

        <div className="filter-row">
          {filters.map(item => (
            <Button key={item.value} tone={filter === item.value ? "primary" : "secondary"} size="sm" onClick={() => setFilter(item.value)}>
              {item.label}
            </Button>
          ))}
        </div>
      </Card>

      <section className="content-grid content-grid--map">
        <Card className="map-stage">
          <MapPanel rides={visibleRides} selectedRideId={selectedRide?.id} onSelectRide={setSelectedRideId} height={560} />
        </Card>

        <div className="content-grid__side page-stack">
          <Card className="focus-card">
            <SectionHeading eyebrow="Selected ride" title={selectedRide.title} description={selectedRide.progressLabel} />
            <div className="focus-card__row">
              <span>Status</span>
              <Badge tone={selectedRide.status === "arrived" ? "success" : selectedRide.status === "waiting" ? "neutral" : "accent"}>
                {formatStatusLabel(selectedRide.status)}
              </Badge>
            </div>
            <div className="focus-card__row">
              <span>Driver</span>
              <strong>{selectedDriver?.name}</strong>
            </div>
            <div className="focus-card__row">
              <span>Driver position</span>
              <strong>{selectedRide.driverPosition.label}</strong>
            </div>
            <div className="focus-card__row">
              <span>Arrival ETA</span>
              <strong>{selectedRide.driverPosition.eta}</strong>
            </div>
            <div className="focus-card__row">
              <span>Nearby families</span>
              <strong>{selectedRide.nearbyFamilies}</strong>
            </div>
            <div className="panel-actions">
              <Button onClick={() => requestJoinRide(selectedRide.id)} fullWidth>
                Request seat
              </Button>
              <ButtonLink to={`/rides/${selectedRide.id}`} tone="secondary" fullWidth>
                Open ride detail
              </ButtonLink>
            </div>
          </Card>

          <Card className="focus-card">
            <SectionHeading eyebrow="Ride legend" title="Meaningful map pins" description="Statuses are intentionally simple so the demo reads clearly in the first few seconds." />
            <div className="stack-list">
              <div className="list-row"><span className="legend-dot legend-dot--waiting" /> <strong>Waiting</strong> <span>Ride posted, pickup not started</span></div>
              <div className="list-row"><span className="legend-dot legend-dot--driver_on_way" /> <strong>Driver on the way</strong> <span>Driver is moving toward the next pickup</span></div>
              <div className="list-row"><span className="legend-dot legend-dot--picked_up" /> <strong>Picked up</strong> <span>Passenger is already in the car</span></div>
              <div className="list-row"><span className="legend-dot legend-dot--arrived" /> <strong>Arrived</strong> <span>Destination or handoff is complete</span></div>
            </div>
          </Card>

          <Card className="focus-card">
            <SectionHeading eyebrow="Ride list" title="Boards on the map" description="Every item here is connected to the same shared ride, button, badge, and spacing system." />
            <div className="stack-list">
              {visibleRides.map(ride => (
                <button key={ride.id} type="button" className="ride-picker" onClick={() => setSelectedRideId(ride.id)}>
                  <div>
                    <strong>{ride.title}</strong>
                    <span>{formatDateTimeLabel(ride.date)}</span>
                  </div>
                  <Badge tone={ride.status === "arrived" ? "success" : ride.status === "waiting" ? "neutral" : "accent"}>
                    {formatStatusLabel(ride.status)}
                  </Badge>
                </button>
              ))}
            </div>
          </Card>

          <Card className="focus-card">
            <SectionHeading eyebrow="Trust snapshot" title="Who&apos;s driving?" description="This gives the app a more credible startup feel than a bare map with anonymous pins." />
            <div className="stack-list">
              <div className="list-row list-row--stacked">
                <div className="list-row__leading avatar-pill">{selectedDriver?.avatar ?? "DR"}</div>
                <div>
                  <strong>{selectedDriver?.name}</strong>
                  <span>{selectedDriver?.roleTitle}</span>
                </div>
              </div>
              <div className="list-row"><CarFront size={15} /> <strong>{selectedDriver?.vehicle}</strong></div>
              <div className="list-row"><ShieldCheck size={15} /> <strong>{selectedDriver?.trustScore}/100 trust score</strong></div>
              <div className="list-row"><Users size={15} /> <strong>{selectedRide.seatsOpen} seats still open</strong></div>
              <div className="list-row"><MapPinned size={15} /> <strong>{selectedRide.pickupSpots.length} pickup spots</strong></div>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}
