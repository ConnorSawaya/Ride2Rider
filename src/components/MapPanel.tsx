import { useEffect } from "react";
import { divIcon } from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";

import { useAppContext } from "../context/AppContext";
import type { Ride } from "../types";
import { formatDateTimeLabel, formatStatusLabel } from "../utils/format";

function createMarker(kind: "driver" | "pickup" | "destination", status: string) {
  return divIcon({
    className: "",
    html: `<div class="map-marker map-marker--${kind} map-marker--${status}"><span></span></div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11]
  });
}

function MapViewport({ lat, lng, zoom }: { lat: number; lng: number; zoom: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([lat, lng], zoom, { animate: true });
  }, [lat, lng, map, zoom]);

  return null;
}

interface MapPanelProps {
  rides: Ride[];
  selectedRideId?: string;
  onSelectRide?: (rideId: string) => void;
  interactive?: boolean;
  height?: number;
}

export function MapPanel({ rides, selectedRideId, onSelectRide, interactive = true, height = 440 }: MapPanelProps) {
  const {
    state: { theme }
  } = useAppContext();
  const selectedRide = rides.find(ride => ride.id === selectedRideId) ?? rides[0];

  if (!selectedRide) {
    return <div className="map-panel map-panel--empty" />;
  }

  const tileUrl =
    theme === "dark"
      ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
      : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const attribution =
    theme === "dark"
      ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

  return (
    <div className="map-panel" style={{ height }}>
      <MapContainer
        center={[selectedRide.destinationCoords.lat, selectedRide.destinationCoords.lng]}
        zoom={12}
        scrollWheelZoom={interactive}
        dragging={interactive}
        touchZoom={interactive}
        doubleClickZoom={interactive}
        zoomControl={interactive}
        attributionControl={interactive}
        className="leaflet-frame"
      >
        <TileLayer attribution={attribution} url={tileUrl} />
        <MapViewport lat={selectedRide.destinationCoords.lat} lng={selectedRide.destinationCoords.lng} zoom={selectedRideId ? 13 : 11} />

        {rides.map(ride => (
          <Marker
            key={`${ride.id}-driver`}
            position={[ride.driverPosition.lat, ride.driverPosition.lng]}
            icon={createMarker("driver", ride.status)}
            eventHandlers={{ click: () => onSelectRide?.(ride.id) }}
          >
            <Popup>
              <div className="map-popup">
                <strong>{ride.title}</strong>
                <div>{ride.driverPosition.label}</div>
                <div>{ride.driverPosition.eta}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {rides.map(ride => (
          <Marker
            key={`${ride.id}-destination`}
            position={[ride.destinationCoords.lat, ride.destinationCoords.lng]}
            icon={createMarker("destination", ride.status)}
            eventHandlers={{ click: () => onSelectRide?.(ride.id) }}
          >
            <Popup>
              <div className="map-popup">
                <strong>{ride.destinationName}</strong>
                <div>{ride.title}</div>
                <div>{formatStatusLabel(ride.status)}</div>
                <div>{formatDateTimeLabel(ride.date)}</div>
              </div>
            </Popup>
          </Marker>
        ))}

        {rides.flatMap(ride =>
          ride.pickupSpots.map(spot => (
            <Marker
              key={spot.id}
              position={[spot.lat, spot.lng]}
              icon={createMarker("pickup", spot.status)}
              eventHandlers={{ click: () => onSelectRide?.(ride.id) }}
            >
              <Popup>
                <div className="map-popup">
                  <strong>{spot.label}</strong>
                  <div>{ride.title}</div>
                  <div>{spot.timeWindow}</div>
                  <div>{spot.passengerIds.length} riders assigned</div>
                </div>
              </Popup>
            </Marker>
          ))
        )}
      </MapContainer>
    </div>
  );
}
