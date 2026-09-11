import { Bell, CheckCircle2 } from "lucide-react";
import { Link } from "react-router-dom";

import { useAppContext } from "../context/AppContext";
import { Badge, Button, Card, EmptyState, SectionHeading } from "../components/ui";

export function NotificationsPage() {
  const { state, markAllNotificationsRead, markNotificationRead } = useAppContext();
  const unread = state.notifications.filter(notification => !notification.read);
  const earlier = state.notifications.filter(notification => notification.read);

  return (
    <div className="page-stack">
      <Card>
        <SectionHeading
          eyebrow="Notifications"
          title="Short updates that map to real family actions"
          description="Alerts cover driver arrival, parent approval, passenger pickup, ride changes, destination reached, and new group invites."
          action={
            <Button tone="secondary" size="sm" onClick={markAllNotificationsRead}>
              Mark all read
            </Button>
          }
        />

        {state.notifications.length === 0 ? (
          <EmptyState title="No notifications yet" description="Ride activity, approvals, and invites will appear here once the app is in motion." />
        ) : (
          <div className="page-stack">
            <div className="notification-section">
              <h3>Unread</h3>
              <div className="stack-list">
                {unread.map(notification => (
                  <div key={notification.id} className="notification-card">
                    <div className="notification-card__leading"><Bell size={16} /></div>
                    <div className="notification-card__body">
                      <div className="notification-card__top">
                        <strong>{notification.title}</strong>
                        <Badge tone="accent">New</Badge>
                      </div>
                      <p>{notification.body}</p>
                      <span>{notification.time}</span>
                    </div>
                    <div className="notification-card__actions">
                      {notification.rideId ? <Link to={`/rides/${notification.rideId}`}>Open ride</Link> : null}
                      <Button tone="ghost" size="sm" onClick={() => markNotificationRead(notification.id)}>
                        Mark read
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="notification-section">
              <h3>Earlier</h3>
              {earlier.length === 0 ? (
                <EmptyState title="No earlier notifications" description="Once unread items are cleared, older updates will stay here for reference." />
              ) : (
                <div className="stack-list">
                  {earlier.map(notification => (
                    <div key={notification.id} className="notification-card notification-card--read">
                      <div className="notification-card__leading"><CheckCircle2 size={16} /></div>
                      <div className="notification-card__body">
                        <div className="notification-card__top">
                          <strong>{notification.title}</strong>
                          <Badge tone="neutral">Read</Badge>
                        </div>
                        <p>{notification.body}</p>
                        <span>{notification.time}</span>
                      </div>
                      <div className="notification-card__actions">
                        {notification.rideId ? <Link to={`/rides/${notification.rideId}`}>Open ride</Link> : null}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
