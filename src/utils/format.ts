import type { ApprovalDecision, NotificationTone, RideStatus } from "../types";

export function formatDateLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric"
  }).format(new Date(value));
}

export function formatTimeLabel(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(value));
}

export function formatDateTimeLabel(value: string): string {
  return `${formatDateLabel(value)} at ${formatTimeLabel(value)}`;
}

export function formatStatusLabel(status: RideStatus): string {
  switch (status) {
    case "waiting":
      return "Waiting";
    case "driver_on_way":
      return "Driver on the way";
    case "picked_up":
      return "Picked up";
    case "arrived":
      return "Arrived";
    default:
      return status;
  }
}

export function rideStatusTone(status: RideStatus): NotificationTone {
  switch (status) {
    case "waiting":
      return "info";
    case "driver_on_way":
      return "action";
    case "picked_up":
      return "success";
    case "arrived":
      return "success";
    default:
      return "info";
  }
}

export function approvalTone(status: ApprovalDecision): NotificationTone {
  switch (status) {
    case "approved":
      return "success";
    case "denied":
      return "warning";
    case "pending":
      return "action";
    default:
      return "info";
  }
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-US").format(value);
}

export function initials(name: string): string {
  return name
    .split(" ")
    .map(part => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function createId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}
