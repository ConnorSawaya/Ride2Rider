import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode
} from "react";

import { initialState, resolveKnownLocation } from "../data/demoData";
import type {
  AppState,
  ApprovalDecision,
  CreateRideInput,
  NotificationItem,
  Passenger,
  Ride,
  RideStatus,
  Theme
} from "../types";
import { createId } from "../utils/format";
import { createSafeStorage } from "../utils/safeStorage";

const STORAGE_KEY = "ride2rider-demo-state";
const demoStorage = createSafeStorage();

type JoinRequestTarget = "parent" | "driver";

type Action =
  | { type: "SET_THEME"; theme: Theme }
  | { type: "UPDATE_PROFILE"; field: "familyName" | "homeBase" | "school"; value: string }
  | { type: "UPDATE_NOTIFICATION_PREFERENCE"; field: "push" | "email" | "sms"; value: boolean }
  | { type: "UPDATE_SAFETY_PREFERENCE"; field: "statusSharing" | "pickupCodeRequired" | "trustedDriversOnly"; value: boolean }
  | { type: "CREATE_RIDE"; ride: Ride; notification: NotificationItem }
  | { type: "REQUEST_JOIN_RIDE"; rideId: string }
  | { type: "RESOLVE_JOIN_REQUEST"; requestId: string; target: JoinRequestTarget; decision: ApprovalDecision }
  | { type: "RESOLVE_DRIVER_APPLICATION"; applicationId: string; decision: ApprovalDecision }
  | { type: "TOGGLE_PICKUP"; rideId: string; passengerId: string }
  | { type: "ADVANCE_RIDE_STATUS"; rideId: string }
  | { type: "ADD_COMMENT"; rideId: string; message: string }
  | { type: "MARK_NOTIFICATION_READ"; notificationId: string }
  | { type: "MARK_ALL_NOTIFICATIONS_READ" };

interface AppContextValue {
  state: AppState;
  setTheme: (theme: Theme) => void;
  createRide: (input: CreateRideInput) => string;
  requestJoinRide: (rideId: string) => void;
  resolveJoinRequest: (requestId: string, target: JoinRequestTarget, decision: ApprovalDecision) => void;
  resolveDriverApplication: (applicationId: string, decision: ApprovalDecision) => void;
  togglePickup: (rideId: string, passengerId: string) => void;
  advanceRideStatus: (rideId: string) => void;
  addComment: (rideId: string, message: string) => void;
  updateProfile: (field: "familyName" | "homeBase" | "school", value: string) => void;
  updateNotificationPreference: (field: "push" | "email" | "sms", value: boolean) => void;
  updateSafetyPreference: (field: "statusSharing" | "pickupCodeRequired" | "trustedDriversOnly", value: boolean) => void;
  markNotificationRead: (notificationId: string) => void;
  markAllNotificationsRead: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

function cloneInitialState(): AppState {
  return JSON.parse(JSON.stringify(initialState)) as AppState;
}

function addNotification(state: AppState, notification: NotificationItem): AppState {
  return {
    ...state,
    notifications: [notification, ...state.notifications]
  };
}

function updateRide(state: AppState, rideId: string, updater: (ride: Ride) => Ride): AppState {
  return {
    ...state,
    rides: state.rides.map(ride => (ride.id === rideId ? syncRide(updater(ride)) : ride))
  };
}

function syncRide(ride: Ride): Ride {
  const passengerStatusById = new Map(ride.passengers.map(passenger => [passenger.id, passenger.pickupStatus]));
  const pickedUpCount = ride.passengers.filter(passenger => passenger.pickupStatus === "picked_up").length;

  const pickupSpots = ride.pickupSpots.map(spot => {
    const allPicked = spot.passengerIds.length > 0 && spot.passengerIds.every(id => passengerStatusById.get(id) === "picked_up");
    const anyPicked = spot.passengerIds.some(id => passengerStatusById.get(id) === "picked_up");

    let status: RideStatus = ride.status;

    if (ride.status === "arrived") {
      status = "arrived";
    } else if (allPicked) {
      status = "picked_up";
    } else if (anyPicked || ride.status === "driver_on_way") {
      status = "driver_on_way";
    } else {
      status = "waiting";
    }

    return { ...spot, status };
  });

  let progressLabel = ride.progressLabel;

  if (ride.status === "waiting") {
    progressLabel = `${ride.passengers.length} riders planned across ${ride.pickupSpots.length} stops`;
  }
  if (ride.status === "driver_on_way") {
    progressLabel = `${pickedUpCount} of ${ride.passengers.length} riders picked up so far`;
  }
  if (ride.status === "picked_up") {
    progressLabel = `${pickedUpCount} riders in the car and heading to ${ride.destinationName}`;
  }
  if (ride.status === "arrived") {
    progressLabel = "Destination reached and riders released to approved adults";
  }

  return {
    ...ride,
    pickupSpots,
    progressLabel
  };
}

function nextRideStatus(status: RideStatus): RideStatus {
  switch (status) {
    case "waiting":
      return "driver_on_way";
    case "driver_on_way":
      return "picked_up";
    case "picked_up":
      return "arrived";
    case "arrived":
      return "arrived";
    default:
      return "waiting";
  }
}

function statusTimelineLabel(status: RideStatus): { label: string; detail: string } {
  switch (status) {
    case "driver_on_way":
      return { label: "Driver started", detail: "Live status sharing is active for approved families." };
    case "picked_up":
      return { label: "Passenger picked up", detail: "Pickup checklist is complete and the route is heading to the destination." };
    case "arrived":
      return { label: "Arrived at destination", detail: "Destination reached and riders are ready for handoff." };
    case "waiting":
    default:
      return { label: "Ride created", detail: "Ride board opened for the group." };
  }
}

function currentTimeLabel(): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date());
}

function createNotification(title: string, body: string, tone: NotificationItem["tone"], rideId?: string): NotificationItem {
  return {
    id: createId("note"),
    title,
    body,
    time: currentTimeLabel(),
    tone,
    read: false,
    rideId
  };
}

function buildNewPassenger(name: string, familyName: string, requestedBy: string): Passenger {
  return {
    id: createId("passenger"),
    name,
    familyName,
    ageLabel: "Approved rider",
    pickupStatus: "waiting",
    parentApprovalStatus: "approved",
    emergencyContact: `${requestedBy} · Contact on file`,
    confirmationCode: `SAFE-${Math.floor(100 + Math.random() * 900)}`
  };
}

function appReducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "SET_THEME":
      return {
        ...state,
        theme: action.theme,
        settings: {
          ...state.settings,
          theme: action.theme
        }
      };
    case "UPDATE_PROFILE":
      return {
        ...state,
        settings: {
          ...state.settings,
          profile: {
            ...state.settings.profile,
            [action.field]: action.value
          }
        }
      };
    case "UPDATE_NOTIFICATION_PREFERENCE":
      return {
        ...state,
        settings: {
          ...state.settings,
          notifications: {
            ...state.settings.notifications,
            [action.field]: action.value
          }
        }
      };
    case "UPDATE_SAFETY_PREFERENCE":
      return {
        ...state,
        settings: {
          ...state.settings,
          safety: {
            ...state.settings.safety,
            [action.field]: action.value
          }
        }
      };
    case "CREATE_RIDE":
      return addNotification(
        {
          ...state,
          rides: [syncRide(action.ride), ...state.rides]
        },
        action.notification
      );
    case "REQUEST_JOIN_RIDE": {
      const ride = state.rides.find(item => item.id === action.rideId);
      if (!ride || ride.seatsOpen < 1) {
        return addNotification(
          state,
          createNotification(
            "No seats available",
            "This ride board is currently full. Try another group ride or create a new one.",
            "warning",
            action.rideId
          )
        );
      }

      const duplicateRequest = state.joinRequests.some(
        request => request.rideId === action.rideId && request.requestedFor === state.currentChildName && request.driverStatus !== "denied" && request.parentStatus !== "denied"
      );

      if (duplicateRequest || ride.passengers.some(passenger => passenger.name === state.currentChildName)) {
        return addNotification(
          state,
          createNotification(
            "Ride request already active",
            `${state.currentChildName} is already listed on this ride board or waiting for approval.`,
            "info",
            action.rideId
          )
        );
      }

      const requestId = createId("request");
      const request = {
        id: requestId,
        rideId: ride.id,
        rideTitle: ride.title,
        requestedFor: state.currentChildName,
        familyName: state.currentFamilyName,
        requestedBy: state.currentUserName,
        requestedAt: currentTimeLabel(),
        parentStatus: "pending" as const,
        driverStatus: "pending" as const,
        seatsRequested: 1,
        note: `${state.currentChildName} can meet at the nearest planned stop.`
      };

      const nextState = updateRide(
        {
          ...state,
          joinRequests: [request, ...state.joinRequests]
        },
        ride.id,
        currentRide => ({
          ...currentRide,
          comments: [
            {
              id: createId("comment"),
              author: state.currentUserName,
              time: currentTimeLabel(),
              message: `${state.currentChildName} requested a seat on this ride board.`,
              type: "status"
            },
            ...currentRide.comments
          ]
        })
      );

      return addNotification(
        nextState,
        createNotification(
          "Ride request sent",
          `${state.currentChildName} is now waiting for parent and driver approval on ${ride.title}.`,
          "action",
          ride.id
        )
      );
    }
    case "RESOLVE_JOIN_REQUEST": {
      const previousRequest = state.joinRequests.find(request => request.id === action.requestId);
      if (!previousRequest) {
        return state;
      }

      const nextRequests = state.joinRequests.map(request => {
        if (request.id !== action.requestId) {
          return request;
        }

        return action.target === "parent"
          ? { ...request, parentStatus: action.decision }
          : { ...request, driverStatus: action.decision };
      });

      const nextRequest = nextRequests.find(request => request.id === action.requestId);
      if (!nextRequest) {
        return state;
      }

      let nextState: AppState = {
        ...state,
        joinRequests: nextRequests
      };

      const decisionLabel = action.target === "parent" ? "Parent approval" : "Driver approval";

      nextState = updateRide(nextState, previousRequest.rideId, ride => ({
        ...ride,
        comments: [
          {
            id: createId("comment"),
            author: action.target === "parent" ? state.currentUserName : "Trusted driver team",
            time: currentTimeLabel(),
            message: `${decisionLabel} ${action.decision} for ${previousRequest.requestedFor}.`,
            type: "status"
          },
          ...ride.comments
        ]
      }));

      nextState = addNotification(
        nextState,
        createNotification(
          `${decisionLabel} ${action.decision}`,
          `${previousRequest.requestedFor} on ${previousRequest.rideTitle} is now marked ${action.decision}.`,
          action.decision === "approved" ? "success" : action.decision === "denied" ? "warning" : "action",
          previousRequest.rideId
        )
      );

      const becameFullyApproved =
        previousRequest.parentStatus !== "approved" || previousRequest.driverStatus !== "approved"
          ? nextRequest.parentStatus === "approved" && nextRequest.driverStatus === "approved"
          : false;

      if (becameFullyApproved) {
        nextState = updateRide(nextState, previousRequest.rideId, ride => {
          if (ride.seatsOpen < 1 || ride.passengers.some(passenger => passenger.name === nextRequest.requestedFor)) {
            return ride;
          }

          return {
            ...ride,
            seatsOpen: Math.max(0, ride.seatsOpen - nextRequest.seatsRequested),
            passengers: [...ride.passengers, buildNewPassenger(nextRequest.requestedFor, nextRequest.familyName, nextRequest.requestedBy)],
            timeline: [
              {
                id: createId("timeline"),
                label: "Parent approved",
                time: currentTimeLabel(),
                detail: `${nextRequest.requestedFor} was cleared by both the parent and the driver.`,
                tone: "success"
              },
              ...ride.timeline
            ],
            comments: [
              {
                id: createId("comment"),
                author: "Ride2Rider",
                time: currentTimeLabel(),
                message: `${nextRequest.requestedFor} has been added to the passenger list.`,
                type: "status"
              },
              ...ride.comments
            ]
          };
        });

        nextState = addNotification(
          nextState,
          createNotification(
            "Passenger added to ride",
            `${nextRequest.requestedFor} is now confirmed for ${nextRequest.rideTitle}.`,
            "success",
            nextRequest.rideId
          )
        );
      }

      return nextState;
    }
    case "RESOLVE_DRIVER_APPLICATION": {
      const application = state.driverApplications.find(item => item.id === action.applicationId);
      if (!application) {
        return state;
      }

      return addNotification(
        {
          ...state,
          driverApplications: state.driverApplications.map(item =>
            item.id === action.applicationId ? { ...item, status: action.decision } : item
          )
        },
        createNotification(
          `Driver application ${action.decision}`,
          `${application.name} for ${application.groupName} is now ${action.decision}.`,
          action.decision === "approved" ? "success" : "warning"
        )
      );
    }
    case "TOGGLE_PICKUP": {
      const ride = state.rides.find(item => item.id === action.rideId);
      const passenger = ride?.passengers.find(item => item.id === action.passengerId);
      if (!ride || !passenger) {
        return state;
      }

      const nextState = updateRide(state, action.rideId, currentRide => {
        const nextPassengers = currentRide.passengers.map(currentPassenger =>
          currentPassenger.id === action.passengerId
            ? {
                ...currentPassenger,
                pickupStatus: (currentPassenger.pickupStatus === "picked_up" ? "waiting" : "picked_up") as Passenger["pickupStatus"]
              }
            : currentPassenger
        );

        const pickedUpCount = nextPassengers.filter(item => item.pickupStatus === "picked_up").length;
        const nextStatus = pickedUpCount === currentRide.passengers.length ? "picked_up" : currentRide.status;

        return {
          ...currentRide,
          status: nextStatus,
          passengers: nextPassengers,
          timeline: [
            {
              id: createId("timeline"),
              label: nextPassengers.find(item => item.id === action.passengerId)?.pickupStatus === "picked_up" ? "Passenger picked up" : "Pickup reset",
              time: currentTimeLabel(),
              detail: `${passenger.name} is now marked as ${nextPassengers.find(item => item.id === action.passengerId)?.pickupStatus}.`,
              tone: "success"
            },
            ...currentRide.timeline
          ],
          comments: [
            {
              id: createId("comment"),
              author: "Ride2Rider",
              time: currentTimeLabel(),
              message: `${passenger.name} pickup status changed to ${nextPassengers.find(item => item.id === action.passengerId)?.pickupStatus}.`,
              type: "status"
            },
            ...currentRide.comments
          ]
        };
      });

      return addNotification(
        nextState,
        createNotification(
          "Pickup checklist updated",
          `${passenger.name} was updated on ${ride.title}.`,
          "success",
          ride.id
        )
      );
    }
    case "ADVANCE_RIDE_STATUS": {
      const ride = state.rides.find(item => item.id === action.rideId);
      if (!ride) {
        return state;
      }

      const nextStatus = nextRideStatus(ride.status);
      const statusEvent = statusTimelineLabel(nextStatus);

      let nextState = updateRide(state, action.rideId, currentRide => ({
        ...currentRide,
        status: nextStatus,
        driverPosition:
          nextStatus === "arrived"
            ? {
                lat: currentRide.destinationCoords.lat,
                lng: currentRide.destinationCoords.lng,
                label: "Destination reached",
                eta: "Trip complete"
              }
            : currentRide.driverPosition,
        timeline: [
          {
            id: createId("timeline"),
            label: statusEvent.label,
            time: currentTimeLabel(),
            detail: statusEvent.detail,
            tone: nextStatus === "arrived" ? "success" : "accent"
          },
          ...currentRide.timeline
        ],
        comments: [
          {
            id: createId("comment"),
            author: "Ride2Rider",
            time: currentTimeLabel(),
            message: `${currentRide.title} is now marked ${nextStatus.split("_").join(" ")}.`,
            type: "status"
          },
          ...currentRide.comments
        ]
      }));

      nextState = addNotification(
        nextState,
        createNotification(
          "Ride status updated",
          `${ride.title} is now ${nextStatus.split("_").join(" ")}.`,
          nextStatus === "arrived" ? "success" : "action",
          ride.id
        )
      );

      return nextState;
    }
    case "ADD_COMMENT": {
      if (!action.message.trim()) {
        return state;
      }

      return updateRide(state, action.rideId, ride => ({
        ...ride,
        comments: [
          {
            id: createId("comment"),
            author: state.currentUserName,
            time: currentTimeLabel(),
            message: action.message.trim(),
            type: "comment"
          },
          ...ride.comments
        ]
      }));
    }
    case "MARK_NOTIFICATION_READ":
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.notificationId ? { ...notification, read: true } : notification
        )
      };
    case "MARK_ALL_NOTIFICATIONS_READ":
      return {
        ...state,
        notifications: state.notifications.map(notification => ({ ...notification, read: true }))
      };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined, () => {
    if (typeof window === "undefined") {
      return cloneInitialState();
    }

    const stored = demoStorage.getItem(STORAGE_KEY);

    if (!stored) {
      return cloneInitialState();
    }

    try {
      return JSON.parse(stored) as AppState;
    } catch {
      return cloneInitialState();
    }
  });

  useEffect(() => {
    demoStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    document.documentElement.dataset.theme = state.theme;
    document.documentElement.style.colorScheme = state.theme;
  }, [state.theme]);

  const value: AppContextValue = {
    state,
    setTheme: theme => dispatch({ type: "SET_THEME", theme }),
    createRide: input => {
      const driver = state.drivers.find(item => item.id === input.driverId) ?? state.drivers[0];
      const group = state.groups.find(item => item.id === input.groupId) ?? state.groups[0];
      const destinationCoords = resolveKnownLocation(`${input.destinationName} ${input.destinationAddress}`);
      const rideId = createId("ride");

      const pickupSpots = input.pickupSpots.map((spot, index) => {
        const point = resolveKnownLocation(spot.address || spot.label);
        return {
          id: createId("pickup"),
          label: spot.label,
          address: spot.address,
          timeWindow: spot.timeWindow,
          lat: point.lat + index * 0.0025,
          lng: point.lng - index * 0.0025,
          passengerIds: [] as string[],
          status: "waiting" as const
        };
      });

      dispatch({
        type: "CREATE_RIDE",
        ride: {
          id: rideId,
          title: input.title,
          destinationName: input.destinationName,
          destinationAddress: input.destinationAddress,
          destinationCoords,
          date: input.date,
          groupId: group.id,
          groupName: group.name,
          eventType: group.type,
          recurringLabel: input.recurringLabel || undefined,
          driverId: driver.id,
          driverPosition: {
            lat: pickupSpots[0]?.lat ?? destinationCoords.lat,
            lng: pickupSpots[0]?.lng ?? destinationCoords.lng,
            label: "Driver will go live before pickup",
            eta: "Status sharing starts 30 min before ride"
          },
          status: "waiting",
          seatsTotal: input.seatsTotal,
          seatsOpen: input.seatsTotal,
          notes: input.notes,
          approvalRequired: input.approvalRequired,
          trustedDriverRequired: input.trustedDriverRequired,
          statusSharing: input.statusSharing,
          safetyScore: driver.trustScore,
          savingsEstimate: "$0 saved yet - first ride on this board",
          nearbyFamilies: "Nearby group suggestions will appear after families request seats.",
          boardLabel: `${group.type} board`,
          progressLabel: "Waiting for the first join request",
          pickupSpots,
          passengers: [],
          timeline: [
            {
              id: createId("timeline"),
              label: "Ride created",
              time: currentTimeLabel(),
              detail: `${input.title} was posted for ${group.name}.`,
              tone: "accent"
            }
          ],
          comments: [
            {
              id: createId("comment"),
              author: state.currentUserName,
              time: currentTimeLabel(),
              message: "Ride board created and ready for family approvals.",
              type: "status"
            }
          ],
          smartSuggestions: [
            {
              id: createId("suggestion"),
              title: "Share this board early",
              detail: "Posting rides the day before usually leads to faster parent approvals and fuller seat matching."
            }
          ]
        },
        notification: createNotification(
          "New ride created",
          `${input.title} is now live for ${group.name}.`,
          "success",
          rideId
        )
      });

      return rideId;
    },
    requestJoinRide: rideId => dispatch({ type: "REQUEST_JOIN_RIDE", rideId }),
    resolveJoinRequest: (requestId, target, decision) =>
      dispatch({ type: "RESOLVE_JOIN_REQUEST", requestId, target, decision }),
    resolveDriverApplication: (applicationId, decision) =>
      dispatch({ type: "RESOLVE_DRIVER_APPLICATION", applicationId, decision }),
    togglePickup: (rideId, passengerId) => dispatch({ type: "TOGGLE_PICKUP", rideId, passengerId }),
    advanceRideStatus: rideId => dispatch({ type: "ADVANCE_RIDE_STATUS", rideId }),
    addComment: (rideId, message) => dispatch({ type: "ADD_COMMENT", rideId, message }),
    updateProfile: (field, value) => dispatch({ type: "UPDATE_PROFILE", field, value }),
    updateNotificationPreference: (field, value) =>
      dispatch({ type: "UPDATE_NOTIFICATION_PREFERENCE", field, value }),
    updateSafetyPreference: (field, value) => dispatch({ type: "UPDATE_SAFETY_PREFERENCE", field, value }),
    markNotificationRead: notificationId => dispatch({ type: "MARK_NOTIFICATION_READ", notificationId }),
    markAllNotificationsRead: () => dispatch({ type: "MARK_ALL_NOTIFICATIONS_READ" })
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext(): AppContextValue {
  const context = useContext(AppContext);

  if (!context) {
    throw new Error("useAppContext must be used within AppProvider");
  }

  return context;
}
