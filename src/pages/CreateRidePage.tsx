import { useState, type FormEvent } from "react";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { useAppContext } from "../context/AppContext";
import { Badge, Button, Card, Field, SectionHeading, SelectInput, SwitchField, TextAreaInput, TextInput } from "../components/ui";

function defaultDateValue(): string {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(7, 30, 0, 0);

  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 16);
}

export function CreateRidePage() {
  const navigate = useNavigate();
  const { state, createRide } = useAppContext();

  const [title, setTitle] = useState("Thursday School Drop-off");
  const [destinationName, setDestinationName] = useState("Bellarmine College Preparatory");
  const [destinationAddress, setDestinationAddress] = useState("960 W Hedding St, San Jose, CA 95126");
  const [date, setDate] = useState(defaultDateValue());
  const [seatsTotal, setSeatsTotal] = useState(4);
  const [driverId, setDriverId] = useState(state.drivers[0]?.id ?? "");
  const [groupId, setGroupId] = useState(state.groups[0]?.id ?? "");
  const [notes, setNotes] = useState("Morning route with curbside pickup confirmation. Backpacks can stay in the rear seat.");
  const [recurringLabel, setRecurringLabel] = useState("Weekdays");
  const [approvalRequired, setApprovalRequired] = useState(true);
  const [trustedDriverRequired, setTrustedDriverRequired] = useState(true);
  const [statusSharing, setStatusSharing] = useState(true);
  const [pickupSpots, setPickupSpots] = useState([
    { id: "spot-1", label: "Willow Glen stop", address: "1157 Minnesota Ave, San Jose, CA", timeWindow: "7:20 - 7:28 AM" },
    { id: "spot-2", label: "Rose Garden stop", address: "Naglee Ave & Dana Ave, San Jose, CA", timeWindow: "7:30 - 7:34 AM" }
  ]);

  const addPickupSpot = () => {
    setPickupSpots(current => [
      ...current,
      { id: `spot-${current.length + 1}`, label: "", address: "", timeWindow: "" }
    ]);
  };

  const updatePickupSpot = (id: string, field: "label" | "address" | "timeWindow", value: string) => {
    setPickupSpots(current => current.map(spot => (spot.id === id ? { ...spot, [field]: value } : spot)));
  };

  const removePickupSpot = (id: string) => {
    setPickupSpots(current => current.filter(spot => spot.id !== id));
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const rideId = createRide({
      title,
      destinationName,
      destinationAddress,
      date: new Date(date).toISOString(),
      seatsTotal,
      driverId,
      groupId,
      notes,
      recurringLabel,
      approvalRequired,
      trustedDriverRequired,
      statusSharing,
      pickupSpots: pickupSpots.filter(spot => spot.label && spot.address && spot.timeWindow)
    });

    navigate(`/rides/${rideId}`);
  };

  const selectedDriver = state.drivers.find(driver => driver.id === driverId);
  const selectedGroup = state.groups.find(group => group.id === groupId);

  return (
    <div className="page-stack">
      <section className="content-grid content-grid--form">
        <form className="content-grid__main page-stack" onSubmit={handleSubmit}>
          <Card className="form-card">
            <SectionHeading
              eyebrow="New ride board"
              title="Create a trusted ride from scratch"
              description="Every input here updates local demo state, so the new ride becomes part of the dashboard, map, approvals, and ride detail flow immediately."
            />

            <div className="form-grid">
              <Field label="Ride title">
                <TextInput value={title} onChange={event => setTitle(event.target.value)} placeholder="Friday school drop-off" required />
              </Field>
              <Field label="Destination name">
                <TextInput value={destinationName} onChange={event => setDestinationName(event.target.value)} placeholder="Bellarmine College Preparatory" required />
              </Field>
              <Field label="Destination address">
                <TextInput value={destinationAddress} onChange={event => setDestinationAddress(event.target.value)} placeholder="960 W Hedding St, San Jose, CA" required />
              </Field>
              <Field label="Date and time">
                <TextInput type="datetime-local" value={date} onChange={event => setDate(event.target.value)} required />
              </Field>
              <Field label="Number of seats">
                <TextInput
                  type="number"
                  min={1}
                  max={8}
                  value={seatsTotal}
                  onChange={event => setSeatsTotal(Number(event.target.value))}
                  required
                />
              </Field>
              <Field label="Driver">
                <SelectInput value={driverId} onChange={event => setDriverId(event.target.value)}>
                  {state.drivers.map(driver => (
                    <option key={driver.id} value={driver.id}>
                      {driver.name} · {driver.vehicle}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Group visibility">
                <SelectInput value={groupId} onChange={event => setGroupId(event.target.value)}>
                  {state.groups.map(group => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </SelectInput>
              </Field>
              <Field label="Recurring ride option" description="Leave blank if this is a one-time ride.">
                <TextInput value={recurringLabel} onChange={event => setRecurringLabel(event.target.value)} placeholder="Every Wednesday" />
              </Field>
            </div>

            <Field label="Ride notes" description="Helpful context for families, pickup rules, bags, handoff instructions, or team gear.">
              <TextAreaInput rows={5} value={notes} onChange={event => setNotes(event.target.value)} />
            </Field>
          </Card>

          <Card className="form-card">
            <SectionHeading
              eyebrow="Pickup spots"
              title="Build the pickup plan"
              description="These stops drive the map markers, checklist, and ride timeline after the ride is created."
              action={
                <Button type="button" tone="secondary" size="sm" icon={<Plus size={14} />} onClick={addPickupSpot}>
                  Add stop
                </Button>
              }
            />

            <div className="page-stack">
              {pickupSpots.map(spot => (
                <div key={spot.id} className="pickup-editor">
                  <div className="form-grid form-grid--compact">
                    <Field label="Pickup label">
                      <TextInput value={spot.label} onChange={event => updatePickupSpot(spot.id, "label", event.target.value)} placeholder="Campbell stop" />
                    </Field>
                    <Field label="Address">
                      <TextInput value={spot.address} onChange={event => updatePickupSpot(spot.id, "address", event.target.value)} placeholder="1 W Campbell Ave, Campbell, CA" />
                    </Field>
                    <Field label="Time window">
                      <TextInput value={spot.timeWindow} onChange={event => updatePickupSpot(spot.id, "timeWindow", event.target.value)} placeholder="4:18 - 4:24 PM" />
                    </Field>
                  </div>
                  {pickupSpots.length > 1 ? (
                    <Button type="button" tone="ghost" size="sm" icon={<Trash2 size={14} />} onClick={() => removePickupSpot(spot.id)}>
                      Remove stop
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </Card>

          <Card className="form-card">
            <SectionHeading
              eyebrow="Safety settings"
              title="Set the trust rules"
              description="The MVP is intentionally explicit about how families stay in control of who can drive and who can join."
            />

            <div className="page-stack">
              <SwitchField
                label="Parent approval required"
                description="Kids are only added after a parent approves the ride request."
                checked={approvalRequired}
                onChange={setApprovalRequired}
              />
              <SwitchField
                label="Trusted-driver requirement"
                description="Only approved drivers inside the group can run this ride board."
                checked={trustedDriverRequired}
                onChange={setTrustedDriverRequired}
              />
              <SwitchField
                label="Status sharing"
                description="Share mocked driver progress and destination updates with approved families."
                checked={statusSharing}
                onChange={setStatusSharing}
              />
            </div>
          </Card>

          <div className="panel-actions panel-actions--footer">
            <Button type="submit" icon={<CheckCircle2 size={16} />}>
              Create ride
            </Button>
          </div>
        </form>

        <div className="content-grid__side page-stack">
          <Card className="focus-card">
            <SectionHeading eyebrow="Preview" title="How this ride will feel" description="The side panel uses the same visual system as the rest of the app so the create flow does not feel disconnected." />
            <div className="stack-list">
              <div className="list-row"><strong>{title}</strong><Badge tone="accent">{selectedGroup?.type ?? "Group"}</Badge></div>
              <div className="list-row"><span>Driver</span><strong>{selectedDriver?.name}</strong></div>
              <div className="list-row"><span>Group</span><strong>{selectedGroup?.name}</strong></div>
              <div className="list-row"><span>Seats</span><strong>{seatsTotal}</strong></div>
              <div className="list-row"><span>Pickup stops</span><strong>{pickupSpots.length}</strong></div>
              <div className="list-row"><span>Recurring</span><strong>{recurringLabel || "One-time ride"}</strong></div>
            </div>
          </Card>

          <Card className="focus-card">
            <SectionHeading eyebrow="Trust badges" title="Safety defaults" description="Consistent badges and muted colors keep the flow premium instead of noisy." />
            <div className="badge-row">
              {approvalRequired ? <Badge tone="accent">Parent approval</Badge> : null}
              {trustedDriverRequired ? <Badge tone="accent">Trusted driver</Badge> : null}
              {statusSharing ? <Badge tone="neutral">Status sharing</Badge> : null}
              {recurringLabel ? <Badge tone="neutral">Recurring ride</Badge> : null}
            </div>
            <p className="support-copy">{notes}</p>
          </Card>
        </div>
      </section>
    </div>
  );
}
