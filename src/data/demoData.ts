import type { AppState, Group, Ride } from "../types";

function dateAt(daysFromToday: number, hour: number, minute: number): string {
  const value = new Date();
  value.setDate(value.getDate() + daysFromToday);
  value.setHours(hour, minute, 0, 0);
  return value.toISOString();
}

const locationCatalog = [
  { key: "bellarmine", lat: 37.3412, lng: -121.9239 },
  { key: "960 w hedding", lat: 37.3412, lng: -121.9239 },
  { key: "del mar high school", lat: 37.2923, lng: -121.9494 },
  { key: "del mar", lat: 37.2923, lng: -121.9494 },
  { key: "cupertino library", lat: 37.3228, lng: -122.0322 },
  { key: "mitty", lat: 37.2941, lng: -121.9984 },
  { key: "trinity community church", lat: 37.3232, lng: -121.9672 },
  { key: "willow glen", lat: 37.2904, lng: -121.8919 },
  { key: "rose garden", lat: 37.3332, lng: -121.9345 },
  { key: "campbell community center", lat: 37.2872, lng: -121.9445 },
  { key: "almaden valley", lat: 37.2206, lng: -121.8719 },
  { key: "los gatos high", lat: 37.2268, lng: -121.9826 },
  { key: "west valley college", lat: 37.2658, lng: -122.0106 },
  { key: "santa clara convention center", lat: 37.404, lng: -121.9773 },
  { key: "oakridge", lat: 37.2529, lng: -121.8592 },
  { key: "downtown campbell", lat: 37.2875, lng: -121.9498 },
  { key: "berryessa community center", lat: 37.3704, lng: -121.8413 },
  { key: "saratoga", lat: 37.2638, lng: -122.023 },
  { key: "trin", lat: 37.3232, lng: -121.9672 }
];

export function resolveKnownLocation(value: string): { lat: number; lng: number } {
  const normalized = value.trim().toLowerCase();
  const match = locationCatalog.find(entry => normalized.includes(entry.key));

  if (match) {
    return { lat: match.lat, lng: match.lng };
  }

  return { lat: 37.323, lng: -121.955 };
}

const groups: Group[] = [
  {
    id: "g1",
    name: "Bellarmine Morning Circle",
    type: "School carpool",
    inviteOnly: true,
    approvalStatus: "Admin approved",
    families: 9,
    kids: 14,
    parents: 11,
    trustedDrivers: 6,
    nextEvent: "Tomorrow at 7:35 AM",
    description: "Weekday morning drop-off board for Bellarmine families coming from Willow Glen, Rose Garden, and Campbell.",
    adminName: "Maria Alvarez",
    members: [
      { id: "gm1", name: "Elena Parker", familyName: "Parker", role: "Parent", badge: "Board admin" },
      { id: "gm2", name: "Noah Parker", familyName: "Parker", role: "Kid", badge: "Rider" },
      { id: "gm3", name: "Alex Rivera", familyName: "Rivera", role: "Driver", badge: "Trusted driver" },
      { id: "gm4", name: "Claire Bennett", familyName: "Bennett", role: "Kid", badge: "Rider" }
    ]
  },
  {
    id: "g2",
    name: "San Jose Strikers U13",
    type: "Sports team",
    inviteOnly: true,
    approvalStatus: "Admin approved",
    families: 15,
    kids: 18,
    parents: 20,
    trustedDrivers: 8,
    nextEvent: "Today at 4:30 PM",
    description: "Practice and tournament carpooling for Strikers families with pickup zones around Almaden, Campbell, and Willow Glen.",
    adminName: "Coach Elena Ortiz",
    members: [
      { id: "gm5", name: "Priya Shah", familyName: "Shah", role: "Driver", badge: "Trusted driver" },
      { id: "gm6", name: "Mia Santos", familyName: "Santos", role: "Kid", badge: "Goalkeeper" },
      { id: "gm7", name: "James Chen", familyName: "Chen", role: "Parent", badge: "Team parent" }
    ]
  },
  {
    id: "g3",
    name: "West Valley Robotics",
    type: "Club",
    inviteOnly: true,
    approvalStatus: "Pending admin review",
    families: 7,
    kids: 9,
    parents: 9,
    trustedDrivers: 4,
    nextEvent: "Tonight at 6:15 PM",
    description: "Build-night coordination for students heading to the robotics lab from Cupertino, Saratoga, and Campbell.",
    adminName: "Dana Kim",
    members: [
      { id: "gm8", name: "Jordan Kim", familyName: "Kim", role: "Driver", badge: "Mentor parent" },
      { id: "gm9", name: "Lila Chen", familyName: "Chen", role: "Kid", badge: "Rookie team" },
      { id: "gm10", name: "Nina Patel", familyName: "Patel", role: "Parent", badge: "Approval pending" }
    ]
  },
  {
    id: "g4",
    name: "Wednesday Youth Group",
    type: "Church group",
    inviteOnly: true,
    approvalStatus: "Admin approved",
    families: 11,
    kids: 17,
    parents: 14,
    trustedDrivers: 5,
    nextEvent: "Wednesday at 6:45 PM",
    description: "Midweek youth group rides with pickup confirmation codes and parent check-ins.",
    adminName: "Marcus Lee",
    members: [
      { id: "gm11", name: "Marcus Lee", familyName: "Lee", role: "Driver", badge: "Trusted driver" },
      { id: "gm12", name: "Sofia Parker", familyName: "Parker", role: "Kid", badge: "Check-in required" },
      { id: "gm13", name: "Angela Romero", familyName: "Romero", role: "Parent", badge: "Volunteer" }
    ]
  },
  {
    id: "g5",
    name: "Willow Glen Weekend Crew",
    type: "Neighborhood",
    inviteOnly: true,
    approvalStatus: "Admin approved",
    families: 6,
    kids: 10,
    parents: 8,
    trustedDrivers: 4,
    nextEvent: "Saturday at 9:00 AM",
    description: "Friend-group rides for tournaments, museum days, and local meetups.",
    adminName: "Tara Holmes",
    members: [
      { id: "gm14", name: "Tara Holmes", familyName: "Holmes", role: "Parent", badge: "Neighborhood lead" },
      { id: "gm15", name: "Mateo Silva", familyName: "Silva", role: "Kid", badge: "Weekend rider" }
    ]
  }
];

const rides: Ride[] = [
  {
    id: "r1",
    title: "Bellarmine Morning Drop-off",
    destinationName: "Bellarmine College Preparatory",
    destinationAddress: "960 W Hedding St, San Jose, CA 95126",
    destinationCoords: { lat: 37.3412, lng: -121.9239 },
    date: dateAt(0, 7, 35),
    groupId: "g1",
    groupName: "Bellarmine Morning Circle",
    eventType: "School pickup/dropoff",
    recurringLabel: "Weekdays",
    driverId: "d1",
    driverPosition: { lat: 37.3063, lng: -121.9004, label: "Near Minnesota Ave", eta: "6 min to next pickup" },
    status: "driver_on_way",
    seatsTotal: 4,
    seatsOpen: 1,
    notes: "Backpacks go in the trunk. Text only if pickup changes after 7:20 AM.",
    approvalRequired: true,
    trustedDriverRequired: true,
    statusSharing: true,
    safetyScore: 98,
    savingsEstimate: "$46 saved this week in extra solo trips",
    nearbyFamilies: "3 Bellarmine families are leaving from Willow Glen in the next 20 minutes.",
    boardLabel: "Morning board",
    progressLabel: "2 of 3 pickups confirmed",
    pickupSpots: [
      {
        id: "ps1",
        label: "Willow Glen Library",
        address: "1157 Minnesota Ave, San Jose, CA",
        timeWindow: "7:22 - 7:28 AM",
        lat: 37.3029,
        lng: -121.9001,
        passengerIds: ["p1", "p2"],
        status: "driver_on_way"
      },
      {
        id: "ps2",
        label: "Rose Garden corner",
        address: "Naglee Ave & Dana Ave, San Jose, CA",
        timeWindow: "7:30 - 7:34 AM",
        lat: 37.3319,
        lng: -121.9348,
        passengerIds: ["p3"],
        status: "picked_up"
      }
    ],
    passengers: [
      {
        id: "p1",
        name: "Noah Parker",
        familyName: "Parker",
        ageLabel: "Grade 8",
        pickupStatus: "waiting",
        parentApprovalStatus: "approved",
        emergencyContact: "Elena Parker · (408) 555-0133",
        confirmationCode: "HEADING-42"
      },
      {
        id: "p2",
        name: "Owen Alvarez",
        familyName: "Alvarez",
        ageLabel: "Grade 9",
        pickupStatus: "waiting",
        parentApprovalStatus: "approved",
        emergencyContact: "Maria Alvarez · (408) 555-0160",
        confirmationCode: "HEADING-42"
      },
      {
        id: "p3",
        name: "Claire Bennett",
        familyName: "Bennett",
        ageLabel: "Grade 8",
        pickupStatus: "picked_up",
        parentApprovalStatus: "approved",
        emergencyContact: "Rob Bennett · (408) 555-0108",
        confirmationCode: "HEADING-42"
      }
    ],
    timeline: [
      { id: "tl1", label: "Ride created", time: "Yesterday, 8:05 PM", detail: "Alex opened 4 seats for the usual weekday route.", tone: "default" },
      { id: "tl2", label: "Parent approved", time: "Yesterday, 8:41 PM", detail: "All listed riders have verified parent approval.", tone: "success" },
      { id: "tl3", label: "Driver started", time: "Today, 7:16 AM", detail: "Alex marked the route live for group status sharing.", tone: "accent" },
      { id: "tl4", label: "Arrived at pickup", time: "Today, 7:25 AM", detail: "Rose Garden stop reached and pickup confirmed.", tone: "success" }
    ],
    comments: [
      { id: "c1", author: "Alex Rivera", time: "7:18 AM", message: "Traffic is light. Still on time for both stops.", type: "status" },
      { id: "c2", author: "Elena Parker", time: "7:20 AM", message: "Noah has his robotics bag too. Thanks for the extra trunk space.", type: "comment" },
      { id: "c3", author: "Alex Rivera", time: "7:27 AM", message: "Claire is in the car. Heading toward Willow Glen stop now.", type: "status" }
    ],
    smartSuggestions: [
      { id: "sg1", title: "1 seat still open", detail: "Lila Chen is 0.8 miles from the route and usually rides with this board." },
      { id: "sg2", title: "Route is recurring", detail: "Keep this ride as the weekday default for faster parent approvals." }
    ]
  },
  {
    id: "r2",
    title: "Strikers Practice at Del Mar",
    destinationName: "Del Mar High School Practice Field",
    destinationAddress: "1224 Del Mar Ave, San Jose, CA 95128",
    destinationCoords: { lat: 37.2923, lng: -121.9494 },
    date: dateAt(0, 16, 30),
    groupId: "g2",
    groupName: "San Jose Strikers U13",
    eventType: "Sports practice",
    recurringLabel: "Tuesdays and Thursdays",
    driverId: "d2",
    driverPosition: { lat: 37.2514, lng: -121.8627, label: "At home in Almaden", eta: "Leaves in 2 hr" },
    status: "waiting",
    seatsTotal: 5,
    seatsOpen: 2,
    notes: "Bring shin guards and water. Cleats should stay in the gear tote until we arrive.",
    approvalRequired: true,
    trustedDriverRequired: true,
    statusSharing: true,
    safetyScore: 96,
    savingsEstimate: "$31 saved on duplicate practice trips this week",
    nearbyFamilies: "2 Strikers families near Oakridge are going to the same field today.",
    boardLabel: "Practice board",
    progressLabel: "Waiting for final driver approval",
    pickupSpots: [
      {
        id: "ps3",
        label: "Oakridge Park-and-ride",
        address: "Blossom Hill Rd & Winfield Blvd, San Jose, CA",
        timeWindow: "4:02 - 4:10 PM",
        lat: 37.2529,
        lng: -121.8592,
        passengerIds: ["p4", "p5"],
        status: "waiting"
      },
      {
        id: "ps4",
        label: "Campbell Community Center",
        address: "1 W Campbell Ave, Campbell, CA",
        timeWindow: "4:18 - 4:24 PM",
        lat: 37.2872,
        lng: -121.9445,
        passengerIds: ["p6"],
        status: "waiting"
      }
    ],
    passengers: [
      {
        id: "p4",
        name: "Mia Santos",
        familyName: "Santos",
        ageLabel: "Age 12",
        pickupStatus: "waiting",
        parentApprovalStatus: "approved",
        emergencyContact: "Luis Santos · (408) 555-0166",
        confirmationCode: "STRIKE-29"
      },
      {
        id: "p5",
        name: "Evan Chen",
        familyName: "Chen",
        ageLabel: "Age 13",
        pickupStatus: "waiting",
        parentApprovalStatus: "approved",
        emergencyContact: "James Chen · (408) 555-0141",
        confirmationCode: "STRIKE-29"
      },
      {
        id: "p6",
        name: "Noah Parker",
        familyName: "Parker",
        ageLabel: "Age 13",
        pickupStatus: "waiting",
        parentApprovalStatus: "pending",
        emergencyContact: "Elena Parker · (408) 555-0133",
        confirmationCode: "STRIKE-29"
      }
    ],
    timeline: [
      { id: "tl5", label: "Ride created", time: "Today, 11:02 AM", detail: "Priya opened a practice route from Almaden to Del Mar.", tone: "default" },
      { id: "tl6", label: "Parent approved", time: "Today, 11:25 AM", detail: "Two riders already have parent confirmation.", tone: "success" }
    ],
    comments: [
      { id: "c4", author: "Priya Shah", time: "11:07 AM", message: "Happy to take one extra equipment bag if needed.", type: "comment" },
      { id: "c5", author: "Coach Elena Ortiz", time: "11:19 AM", message: "Please arrive by 4:50 for warmups.", type: "status" }
    ],
    smartSuggestions: [
      { id: "sg3", title: "2 seats open near you", detail: "This route matches your usual Tuesday practice ride pattern." },
      { id: "sg4", title: "Shared pickup recommended", detail: "Oakridge stop keeps all three riders within a 4-minute window." }
    ]
  },
  {
    id: "r3",
    title: "Robotics Club Build Night",
    destinationName: "West Valley Robotics Lab",
    destinationAddress: "14000 Fruitvale Ave, Saratoga, CA 95070",
    destinationCoords: { lat: 37.2658, lng: -122.0106 },
    date: dateAt(0, 18, 15),
    groupId: "g3",
    groupName: "West Valley Robotics",
    eventType: "Club meetings",
    recurringLabel: "Weekly build night",
    driverId: "d3",
    driverPosition: { lat: 37.3078, lng: -122.0222, label: "On Stevens Creek", eta: "12 min to destination" },
    status: "picked_up",
    seatsTotal: 4,
    seatsOpen: 1,
    notes: "Laptop chargers and safety goggles checked before loading. One extra seat remains near Cupertino Library.",
    approvalRequired: true,
    trustedDriverRequired: true,
    statusSharing: true,
    safetyScore: 97,
    savingsEstimate: "$24 saved tonight by combining mentor pickups",
    nearbyFamilies: "3 robotics families are heading to the same lab tonight.",
    boardLabel: "Club board",
    progressLabel: "Driver started and first pickup completed",
    pickupSpots: [
      {
        id: "ps5",
        label: "Cupertino Library",
        address: "10800 Torre Ave, Cupertino, CA",
        timeWindow: "5:40 - 5:46 PM",
        lat: 37.3228,
        lng: -122.0322,
        passengerIds: ["p7", "p8"],
        status: "picked_up"
      },
      {
        id: "ps6",
        label: "Saratoga Village",
        address: "14410 Big Basin Way, Saratoga, CA",
        timeWindow: "5:54 - 6:02 PM",
        lat: 37.2638,
        lng: -122.023,
        passengerIds: ["p9"],
        status: "driver_on_way"
      }
    ],
    passengers: [
      {
        id: "p7",
        name: "Lila Chen",
        familyName: "Chen",
        ageLabel: "Grade 7",
        pickupStatus: "picked_up",
        parentApprovalStatus: "approved",
        emergencyContact: "James Chen · (408) 555-0141",
        confirmationCode: "ROBO-73"
      },
      {
        id: "p8",
        name: "Ava Patel",
        familyName: "Patel",
        ageLabel: "Grade 8",
        pickupStatus: "picked_up",
        parentApprovalStatus: "approved",
        emergencyContact: "Nina Patel · (408) 555-0178",
        confirmationCode: "ROBO-73"
      },
      {
        id: "p9",
        name: "Mateo Silva",
        familyName: "Silva",
        ageLabel: "Grade 7",
        pickupStatus: "waiting",
        parentApprovalStatus: "pending",
        emergencyContact: "Tara Holmes · (408) 555-0184",
        confirmationCode: "ROBO-73"
      }
    ],
    timeline: [
      { id: "tl7", label: "Ride created", time: "Yesterday, 6:14 PM", detail: "Jordan scheduled the mentor route for build night.", tone: "default" },
      { id: "tl8", label: "Parent approved", time: "Today, 3:20 PM", detail: "Lila and Ava were cleared by their parents.", tone: "success" },
      { id: "tl9", label: "Driver started", time: "Today, 5:31 PM", detail: "Live ride board activated for club parents.", tone: "accent" },
      { id: "tl10", label: "Passenger picked up", time: "Today, 5:45 PM", detail: "Cupertino Library stop completed.", tone: "success" }
    ],
    comments: [
      { id: "c6", author: "Jordan Kim", time: "5:28 PM", message: "Leaving now. Please have robot bins ready curbside.", type: "status" },
      { id: "c7", author: "Dana Kim", time: "5:41 PM", message: "The lab door will stay open until 6:25.", type: "comment" }
    ],
    smartSuggestions: [
      { id: "sg5", title: "You usually ride with this group", detail: "The Parker and Chen families shared three robotics rides this month." },
      { id: "sg6", title: "One more seat nearby", detail: "Mateo Silva is still waiting on final parent approval from Saratoga Village." }
    ]
  },
  {
    id: "r4",
    title: "Youth Group Wednesday",
    destinationName: "Trinity Community Church",
    destinationAddress: "477 N Mathilda Ave, San Jose, CA 95123",
    destinationCoords: { lat: 37.3232, lng: -121.9672 },
    date: dateAt(1, 18, 45),
    groupId: "g4",
    groupName: "Wednesday Youth Group",
    eventType: "Youth group events",
    recurringLabel: "Every Wednesday",
    driverId: "d4",
    driverPosition: { lat: 37.3232, lng: -121.9672, label: "Driver not live yet", eta: "Sharing starts 30 min before pickup" },
    status: "waiting",
    seatsTotal: 6,
    seatsOpen: 3,
    notes: "Pickup code is required before each rider boards. Group lead will verify arrival at the church.",
    approvalRequired: true,
    trustedDriverRequired: true,
    statusSharing: true,
    safetyScore: 99,
    savingsEstimate: "$52 saved across weekly youth group coordination",
    nearbyFamilies: "4 families from Blossom Valley usually coordinate this route together.",
    boardLabel: "Youth board",
    progressLabel: "Recurring weekly ride ready for approvals",
    pickupSpots: [
      {
        id: "ps7",
        label: "Berryessa Community Center",
        address: "3050 Berryessa Rd, San Jose, CA",
        timeWindow: "6:08 - 6:14 PM",
        lat: 37.3704,
        lng: -121.8413,
        passengerIds: ["p10", "p11"],
        status: "waiting"
      },
      {
        id: "ps8",
        label: "Campbell Community Center",
        address: "1 W Campbell Ave, Campbell, CA",
        timeWindow: "6:20 - 6:27 PM",
        lat: 37.2872,
        lng: -121.9445,
        passengerIds: ["p12"],
        status: "waiting"
      }
    ],
    passengers: [
      {
        id: "p10",
        name: "Sofia Parker",
        familyName: "Parker",
        ageLabel: "Age 11",
        pickupStatus: "waiting",
        parentApprovalStatus: "approved",
        emergencyContact: "Elena Parker · (408) 555-0133",
        confirmationCode: "YOUTH-16"
      },
      {
        id: "p11",
        name: "Ruby Romero",
        familyName: "Romero",
        ageLabel: "Age 12",
        pickupStatus: "waiting",
        parentApprovalStatus: "approved",
        emergencyContact: "Angela Romero · (408) 555-0157",
        confirmationCode: "YOUTH-16"
      },
      {
        id: "p12",
        name: "Kai Holmes",
        familyName: "Holmes",
        ageLabel: "Age 12",
        pickupStatus: "waiting",
        parentApprovalStatus: "pending",
        emergencyContact: "Tara Holmes · (408) 555-0184",
        confirmationCode: "YOUTH-16"
      }
    ],
    timeline: [
      { id: "tl11", label: "Ride created", time: "Today, 9:10 AM", detail: "Marcus reopened the standing Wednesday church route.", tone: "default" },
      { id: "tl12", label: "Parent approved", time: "Today, 9:54 AM", detail: "Two riders already confirmed with pickup code requirement.", tone: "success" }
    ],
    comments: [
      { id: "c8", author: "Marcus Lee", time: "9:16 AM", message: "If anyone needs a second return ride, post here by 3 PM.", type: "comment" }
    ],
    smartSuggestions: [
      { id: "sg7", title: "3 families are going to this event", detail: "Opening one more Campbell stop could fill the remaining seats." }
    ]
  },
  {
    id: "r5",
    title: "Tournament Return Shuttle",
    destinationName: "Willow Glen Neighborhood Drop-off",
    destinationAddress: "Lincoln Ave & Curtner Ave, San Jose, CA",
    destinationCoords: { lat: 37.3021, lng: -121.8994 },
    date: dateAt(0, 20, 5),
    groupId: "g5",
    groupName: "Willow Glen Weekend Crew",
    eventType: "Tournaments",
    driverId: "d2",
    driverPosition: { lat: 37.3021, lng: -121.8994, label: "Destination reached", eta: "Trip complete" },
    status: "arrived",
    seatsTotal: 5,
    seatsOpen: 2,
    notes: "Return ride completed. Players checked out with parents at the neighborhood drop-off.",
    approvalRequired: true,
    trustedDriverRequired: true,
    statusSharing: false,
    safetyScore: 95,
    savingsEstimate: "$18 saved on event-day return trips",
    nearbyFamilies: "Weekend crew usually shares 2 to 3 tournament return rides per month.",
    boardLabel: "Weekend board",
    progressLabel: "Destination reached and riders released",
    pickupSpots: [
      {
        id: "ps9",
        label: "Santa Clara Convention Center",
        address: "5001 Great America Pkwy, Santa Clara, CA",
        timeWindow: "7:15 - 7:25 PM",
        lat: 37.404,
        lng: -121.9773,
        passengerIds: ["p13", "p14", "p15"],
        status: "arrived"
      }
    ],
    passengers: [
      {
        id: "p13",
        name: "Mateo Silva",
        familyName: "Silva",
        ageLabel: "Age 12",
        pickupStatus: "picked_up",
        parentApprovalStatus: "approved",
        emergencyContact: "Tara Holmes · (408) 555-0184",
        confirmationCode: "HOME-55"
      },
      {
        id: "p14",
        name: "Kai Holmes",
        familyName: "Holmes",
        ageLabel: "Age 12",
        pickupStatus: "picked_up",
        parentApprovalStatus: "approved",
        emergencyContact: "Tara Holmes · (408) 555-0184",
        confirmationCode: "HOME-55"
      },
      {
        id: "p15",
        name: "Ava Patel",
        familyName: "Patel",
        ageLabel: "Age 12",
        pickupStatus: "picked_up",
        parentApprovalStatus: "approved",
        emergencyContact: "Nina Patel · (408) 555-0178",
        confirmationCode: "HOME-55"
      }
    ],
    timeline: [
      { id: "tl13", label: "Ride created", time: "Yesterday, 6:20 PM", detail: "Priya scheduled the tournament return route.", tone: "default" },
      { id: "tl14", label: "Driver started", time: "Today, 7:08 PM", detail: "Parents received status sharing updates for the return trip.", tone: "accent" },
      { id: "tl15", label: "Arrived at destination", time: "Today, 8:03 PM", detail: "All riders were released to approved parents at Willow Glen.", tone: "success" }
    ],
    comments: [
      { id: "c9", author: "Priya Shah", time: "8:04 PM", message: "Everyone is dropped off. Great game tonight.", type: "status" }
    ],
    smartSuggestions: [
      { id: "sg8", title: "Recurring event pattern", detail: "Weekend team returns are a strong fit for shared ride boards." }
    ]
  }
];

export const initialState: AppState = {
  theme: "light",
  currentUserName: "Elena Parker",
  currentFamilyName: "Parker",
  currentChildName: "Noah Parker",
  drivers: [
    {
      id: "d1",
      name: "Alex Rivera",
      familyName: "Rivera",
      roleTitle: "Bellarmine parent driver",
      trustScore: 98,
      verifiedSince: "Verified since August 2023",
      approvalsCount: 41,
      vehicle: "Honda Odyssey · 7 seats",
      phone: "(408) 555-0101",
      notes: "Background checked, school pickup badge on file, and two years of group driving history.",
      avatar: "AR",
      groups: ["g1"]
    },
    {
      id: "d2",
      name: "Priya Shah",
      familyName: "Shah",
      roleTitle: "Team parent driver",
      trustScore: 96,
      verifiedSince: "Verified since January 2024",
      approvalsCount: 29,
      vehicle: "Toyota Highlander · 6 seats",
      phone: "(408) 555-0129",
      notes: "Carries sports equipment tote and keeps parent handoff notes updated after every practice.",
      avatar: "PS",
      groups: ["g2", "g5"]
    },
    {
      id: "d3",
      name: "Jordan Kim",
      familyName: "Kim",
      roleTitle: "Mentor parent driver",
      trustScore: 97,
      verifiedSince: "Verified since September 2023",
      approvalsCount: 33,
      vehicle: "Subaru Outback · 5 seats",
      phone: "(408) 555-0215",
      notes: "Coordinates build-night arrival check-ins with the robotics mentor team.",
      avatar: "JK",
      groups: ["g3"]
    },
    {
      id: "d4",
      name: "Marcus Lee",
      familyName: "Lee",
      roleTitle: "Youth group route lead",
      trustScore: 99,
      verifiedSince: "Verified since May 2022",
      approvalsCount: 52,
      vehicle: "Kia Telluride · 7 seats",
      phone: "(408) 555-0189",
      notes: "Uses pickup confirmation codes and arrival handoff checklists for every youth group ride.",
      avatar: "ML",
      groups: ["g4"]
    }
  ],
  rides,
  groups,
  joinRequests: [
    {
      id: "jr1",
      rideId: "r1",
      rideTitle: "Bellarmine Morning Drop-off",
      requestedFor: "Lila Chen",
      familyName: "Chen",
      requestedBy: "James Chen",
      requestedAt: "Today, 6:52 AM",
      parentStatus: "approved",
      driverStatus: "pending",
      seatsRequested: 1,
      note: "Lila is ready at the Willow Glen stop and has the same dismissal plan as last week."
    },
    {
      id: "jr2",
      rideId: "r2",
      rideTitle: "Strikers Practice at Del Mar",
      requestedFor: "Noah Parker",
      familyName: "Parker",
      requestedBy: "Elena Parker",
      requestedAt: "Today, 12:14 PM",
      parentStatus: "pending",
      driverStatus: "approved",
      seatsRequested: 1,
      note: "Noah needs a ride after math club and can meet at the Campbell stop."
    },
    {
      id: "jr3",
      rideId: "r3",
      rideTitle: "Robotics Club Build Night",
      requestedFor: "Mateo Silva",
      familyName: "Silva",
      requestedBy: "Tara Holmes",
      requestedAt: "Today, 4:42 PM",
      parentStatus: "pending",
      driverStatus: "pending",
      seatsRequested: 1,
      note: "Mateo can join only if there is room after the Saratoga stop is confirmed."
    }
  ],
  driverApplications: [
    {
      id: "da1",
      driverId: "d5",
      name: "Carla Nguyen",
      groupName: "San Jose Strikers U13",
      vehicle: "Mazda CX-9 · 6 seats",
      proofLabel: "License and insurance uploaded",
      requestedAt: "Today, 10:48 AM",
      status: "pending"
    },
    {
      id: "da2",
      driverId: "d6",
      name: "Ben Torres",
      groupName: "West Valley Robotics",
      vehicle: "Tesla Model Y · 5 seats",
      proofLabel: "Background check shared by school office",
      requestedAt: "Yesterday, 3:14 PM",
      status: "approved"
    }
  ],
  notifications: [
    {
      id: "n1",
      title: "Driver arrived at Rose Garden stop",
      body: "Alex Rivera confirmed the first pickup for Bellarmine Morning Drop-off.",
      time: "7:27 AM",
      tone: "success",
      read: false,
      rideId: "r1"
    },
    {
      id: "n2",
      title: "Parent approval needed",
      body: "Noah Parker still needs parent approval for Strikers Practice at Del Mar.",
      time: "12:14 PM",
      tone: "action",
      read: false,
      rideId: "r2"
    },
    {
      id: "n3",
      title: "Passenger picked up",
      body: "Lila Chen has been picked up for Robotics Club Build Night.",
      time: "5:45 PM",
      tone: "success",
      read: false,
      rideId: "r3"
    },
    {
      id: "n4",
      title: "Ride changed",
      body: "Priya Shah moved the Campbell pickup window five minutes earlier for practice traffic.",
      time: "11:56 AM",
      tone: "warning",
      read: true,
      rideId: "r2"
    },
    {
      id: "n5",
      title: "Destination reached",
      body: "Tournament Return Shuttle completed and riders were released to approved parents.",
      time: "8:03 PM",
      tone: "success",
      read: true,
      rideId: "r5"
    },
    {
      id: "n6",
      title: "New group invite",
      body: "You were invited to Willow Glen Weekend Crew. Admin review is already complete.",
      time: "Yesterday",
      tone: "info",
      read: true
    }
  ],
  settings: {
    theme: "light",
    profile: {
      familyName: "Parker Family",
      homeBase: "Willow Glen, San Jose",
      school: "Bellarmine + Strikers schedule"
    },
    familyMembers: [
      { id: "fm1", name: "Elena Parker", role: "Parent", schoolOrTeam: "Primary account owner", ageLabel: "Adult" },
      { id: "fm2", name: "Noah Parker", role: "Student rider", schoolOrTeam: "Bellarmine / Strikers U13", ageLabel: "Age 13" },
      { id: "fm3", name: "Sofia Parker", role: "Student rider", schoolOrTeam: "Wednesday Youth Group", ageLabel: "Age 11" }
    ],
    trustedContacts: [
      { id: "tc1", name: "Miguel Parker", relation: "Parent backup", phone: "(408) 555-0134" },
      { id: "tc2", name: "Maria Alvarez", relation: "School carpool admin", phone: "(408) 555-0160" },
      { id: "tc3", name: "Coach Elena Ortiz", relation: "Team coordinator", phone: "(408) 555-0151" }
    ],
    notifications: {
      push: true,
      email: true,
      sms: true
    },
    safety: {
      statusSharing: true,
      pickupCodeRequired: true,
      trustedDriversOnly: true
    }
  }
};
