export type Theme = "light" | "dark";

export type RideStatus = "waiting" | "driver_on_way" | "picked_up" | "arrived";

export type ApprovalDecision = "pending" | "approved" | "denied";

export type NotificationTone = "info" | "action" | "success" | "warning";

export interface DriverProfile {
  id: string;
  name: string;
  familyName: string;
  roleTitle: string;
  trustScore: number;
  verifiedSince: string;
  approvalsCount: number;
  vehicle: string;
  phone: string;
  notes: string;
  avatar: string;
  groups: string[];
}

export interface Passenger {
  id: string;
  name: string;
  familyName: string;
  ageLabel: string;
  pickupStatus: "waiting" | "picked_up";
  parentApprovalStatus: ApprovalDecision;
  emergencyContact: string;
  confirmationCode: string;
}

export interface PickupSpot {
  id: string;
  label: string;
  address: string;
  timeWindow: string;
  lat: number;
  lng: number;
  passengerIds: string[];
  status: RideStatus;
}

export interface RideTimelineItem {
  id: string;
  label: string;
  time: string;
  detail: string;
  tone?: "default" | "accent" | "success" | "warning";
}

export interface RideComment {
  id: string;
  author: string;
  time: string;
  message: string;
  type: "comment" | "status";
}

export interface RideSuggestion {
  id: string;
  title: string;
  detail: string;
}

export interface Ride {
  id: string;
  title: string;
  destinationName: string;
  destinationAddress: string;
  destinationCoords: { lat: number; lng: number };
  date: string;
  groupId: string;
  groupName: string;
  eventType: string;
  recurringLabel?: string;
  driverId: string;
  driverPosition: { lat: number; lng: number; label: string; eta: string };
  status: RideStatus;
  seatsTotal: number;
  seatsOpen: number;
  notes: string;
  approvalRequired: boolean;
  trustedDriverRequired: boolean;
  statusSharing: boolean;
  safetyScore: number;
  savingsEstimate: string;
  nearbyFamilies: string;
  boardLabel: string;
  progressLabel: string;
  pickupSpots: PickupSpot[];
  passengers: Passenger[];
  timeline: RideTimelineItem[];
  comments: RideComment[];
  smartSuggestions: RideSuggestion[];
}

export interface GroupMember {
  id: string;
  name: string;
  familyName: string;
  role: "Parent" | "Kid" | "Driver";
  badge?: string;
}

export interface Group {
  id: string;
  name: string;
  type: string;
  inviteOnly: boolean;
  approvalStatus: string;
  families: number;
  kids: number;
  parents: number;
  trustedDrivers: number;
  nextEvent: string;
  description: string;
  adminName: string;
  members: GroupMember[];
}

export interface JoinRequest {
  id: string;
  rideId: string;
  rideTitle: string;
  requestedFor: string;
  familyName: string;
  requestedBy: string;
  requestedAt: string;
  parentStatus: ApprovalDecision;
  driverStatus: ApprovalDecision;
  seatsRequested: number;
  note: string;
}

export interface DriverApplication {
  id: string;
  driverId: string;
  name: string;
  groupName: string;
  vehicle: string;
  proofLabel: string;
  requestedAt: string;
  status: ApprovalDecision;
}

export interface NotificationItem {
  id: string;
  title: string;
  body: string;
  time: string;
  tone: NotificationTone;
  read: boolean;
  rideId?: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  role: string;
  schoolOrTeam: string;
  ageLabel: string;
}

export interface TrustedContact {
  id: string;
  name: string;
  relation: string;
  phone: string;
}

export interface AppSettings {
  theme: Theme;
  profile: {
    familyName: string;
    homeBase: string;
    school: string;
  };
  familyMembers: FamilyMember[];
  trustedContacts: TrustedContact[];
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  safety: {
    statusSharing: boolean;
    pickupCodeRequired: boolean;
    trustedDriversOnly: boolean;
  };
}

export interface AppState {
  theme: Theme;
  currentUserName: string;
  currentFamilyName: string;
  currentChildName: string;
  drivers: DriverProfile[];
  rides: Ride[];
  groups: Group[];
  joinRequests: JoinRequest[];
  driverApplications: DriverApplication[];
  notifications: NotificationItem[];
  settings: AppSettings;
}

export interface CreateRideInput {
  title: string;
  destinationName: string;
  destinationAddress: string;
  date: string;
  seatsTotal: number;
  driverId: string;
  groupId: string;
  notes: string;
  recurringLabel: string;
  approvalRequired: boolean;
  trustedDriverRequired: boolean;
  statusSharing: boolean;
  pickupSpots: Array<{ label: string; address: string; timeWindow: string }>;
}
