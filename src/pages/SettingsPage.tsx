import { Moon, ShieldCheck, Sun, UserRound } from "lucide-react";

import { useAppContext } from "../context/AppContext";
import { Badge, Button, Card, Field, SectionHeading, SwitchField, TextInput } from "../components/ui";

export function SettingsPage() {
  const {
    state,
    setTheme,
    updateNotificationPreference,
    updateProfile,
    updateSafetyPreference
  } = useAppContext();

  return (
    <div className="page-stack">
      <Card>
        <SectionHeading
          eyebrow="Appearance"
          title="Light and dark mode"
          description="The palette is intentionally calm and consistent rather than a quick inverted theme."
        />
        <div className="theme-choice-row">
          <Button tone={state.theme === "light" ? "primary" : "secondary"} onClick={() => setTheme("light")} icon={<Sun size={16} />}>
            Light mode
          </Button>
          <Button tone={state.theme === "dark" ? "primary" : "secondary"} onClick={() => setTheme("dark")} icon={<Moon size={16} />}>
            Dark mode
          </Button>
          <Badge tone="neutral">Saved locally</Badge>
        </div>
      </Card>

      <section className="content-grid content-grid--dashboard">
        <div className="content-grid__main page-stack">
          <Card className="form-card">
            <SectionHeading eyebrow="Profile" title="Family profile" description="Profile fields are editable and persist in local state so the demo feels genuinely interactive." />
            <div className="form-grid">
              <Field label="Family name">
                <TextInput value={state.settings.profile.familyName} onChange={event => updateProfile("familyName", event.target.value)} />
              </Field>
              <Field label="Home base">
                <TextInput value={state.settings.profile.homeBase} onChange={event => updateProfile("homeBase", event.target.value)} />
              </Field>
              <Field label="School / team context">
                <TextInput value={state.settings.profile.school} onChange={event => updateProfile("school", event.target.value)} />
              </Field>
            </div>
          </Card>

          <Card className="form-card">
            <SectionHeading eyebrow="Notification settings" title="How families hear about changes" description="These toggles affect local demo state and are consistent with the rest of the settings UI." />
            <div className="page-stack">
              <SwitchField
                label="Push notifications"
                description="Receive driver arrival, pickup, and destination alerts on this device."
                checked={state.settings.notifications.push}
                onChange={value => updateNotificationPreference("push", value)}
              />
              <SwitchField
                label="Email summaries"
                description="Send ride changes, group invites, and weekly carpool summaries by email."
                checked={state.settings.notifications.email}
                onChange={value => updateNotificationPreference("email", value)}
              />
              <SwitchField
                label="SMS urgent alerts"
                description="Use SMS for curbside arrival and same-day approval reminders."
                checked={state.settings.notifications.sms}
                onChange={value => updateNotificationPreference("sms", value)}
              />
            </div>
          </Card>

          <Card className="form-card">
            <SectionHeading eyebrow="Safety settings" title="Parent-trust defaults" description="These switches reinforce the core product positioning that this is not anonymous ride-hailing." />
            <div className="page-stack">
              <SwitchField
                label="Trusted drivers only"
                description="Hide non-approved driver options from ride creation and seat requests."
                checked={state.settings.safety.trustedDriversOnly}
                onChange={value => updateSafetyPreference("trustedDriversOnly", value)}
              />
              <SwitchField
                label="Pickup code required"
                description="Require a handoff code before each rider is marked onboard."
                checked={state.settings.safety.pickupCodeRequired}
                onChange={value => updateSafetyPreference("pickupCodeRequired", value)}
              />
              <SwitchField
                label="Status sharing"
                description="Show mocked route progress to approved family members only."
                checked={state.settings.safety.statusSharing}
                onChange={value => updateSafetyPreference("statusSharing", value)}
              />
            </div>
          </Card>
        </div>

        <div className="content-grid__side page-stack">
          <Card className="focus-card">
            <SectionHeading eyebrow="Family members" title="Who rides" description="Saved family riders make seat requests faster and more realistic in the demo." />
            <div className="stack-list">
              {state.settings.familyMembers.map(member => (
                <div key={member.id} className="list-row list-row--stacked">
                  <div className="list-row__leading"><UserRound size={15} /></div>
                  <div>
                    <strong>{member.name}</strong>
                    <span>{member.role} · {member.schoolOrTeam}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card className="focus-card">
            <SectionHeading eyebrow="Trusted contacts" title="Emergency and admin contacts" description="These contacts explain how a family, school, or team would trust the product in the real world." />
            <div className="stack-list">
              {state.settings.trustedContacts.map(contact => (
                <div key={contact.id} className="list-row list-row--stacked">
                  <div className="list-row__leading"><ShieldCheck size={15} /></div>
                  <div>
                    <strong>{contact.name}</strong>
                    <span>{contact.relation} · {contact.phone}</span>
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
