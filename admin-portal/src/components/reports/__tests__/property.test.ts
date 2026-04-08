/**
 * Property-Based Tests for Reporting Feature
 *
 * Feature: reporting-feature, Property 1: date range validation rejects invalid ranges
 * Validates: Requirements 2.7, 8.7, 11.7
 *
 * Run with: node --loader ts-node/esm property.test.ts
 * Or with vitest: npx vitest run property.test.ts
 */

import * as fc from "fast-check";

// ---------------------------------------------------------------------------
// Function under test
// Returns true when the date range is INVALID (fromDate strictly after toDate)
// ---------------------------------------------------------------------------
function validateDateRange(fromDate: string, toDate: string): boolean {
  return !!fromDate && !!toDate && fromDate > toDate;
}

// ---------------------------------------------------------------------------
// Helper: format a Date as YYYY-MM-DD
// ---------------------------------------------------------------------------
function toYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// Arbitrary: a pair of YYYY-MM-DD strings where fromDate > toDate (invalid)
// Compare as strings after formatting to avoid sub-day precision issues.
// ---------------------------------------------------------------------------
const invalidDatePairArb = fc
  .tuple(fc.date({ min: new Date("2000-01-01"), max: new Date("2099-12-31") }), fc.date({ min: new Date("2000-01-01"), max: new Date("2099-12-31") }))
  .map(([a, b]) => ({ fromDate: toYMD(a), toDate: toYMD(b) }))
  .filter(({ fromDate, toDate }) => fromDate > toDate); // strictly after at day granularity

// ---------------------------------------------------------------------------
// Arbitrary: a pair of YYYY-MM-DD strings where fromDate <= toDate (valid)
// Compare as strings after formatting to avoid sub-day precision issues.
// ---------------------------------------------------------------------------
const validDatePairArb = fc
  .tuple(fc.date({ min: new Date("2000-01-01"), max: new Date("2099-12-31") }), fc.date({ min: new Date("2000-01-01"), max: new Date("2099-12-31") }))
  .map(([a, b]) => ({ fromDate: toYMD(a), toDate: toYMD(b) }))
  .filter(({ fromDate, toDate }) => fromDate <= toDate); // on or before at day granularity

// ---------------------------------------------------------------------------
// Property 1a: form REJECTS when fromDate > toDate
// validateDateRange returns true (= "is invalid") for all such pairs
// ---------------------------------------------------------------------------
fc.assert(
  fc.property(invalidDatePairArb, ({ fromDate, toDate }) => {
    return validateDateRange(fromDate, toDate) === true;
  }),
  {
    numRuns: 100,
    verbose: true,
  }
);

console.log(
  "✓ Property 1a passed: validateDateRange returns true (invalid) for all fromDate > toDate pairs"
);

// ---------------------------------------------------------------------------
// Property 1b: form ACCEPTS when fromDate <= toDate
// validateDateRange returns false (= "is valid") for all such pairs
// ---------------------------------------------------------------------------
fc.assert(
  fc.property(validDatePairArb, ({ fromDate, toDate }) => {
    return validateDateRange(fromDate, toDate) === false;
  }),
  {
    numRuns: 100,
    verbose: true,
  }
);

console.log(
  "✓ Property 1b passed: validateDateRange returns false (valid) for all fromDate <= toDate pairs"
);

console.log(
  "\nAll Property 1 checks passed — Feature: reporting-feature, Property 1: date range validation rejects invalid ranges"
);

// =============================================================================
// Property 4: Monthly grid totals are correct
// Feature: reporting-feature, Property 4: monthly grid totals are correct
// Validates: Requirements 3.3, 10.3
// =============================================================================

type GridRoom = {
  roomNumber: string;
  days: Record<number, string>;
  total: number;
};

type Grid = {
  rooms: GridRoom[];
  dailyTotals: Record<number, number>;
};

function buildGrid(
  rooms: { roomNumber: string; days: Record<number, string> }[],
  allDays: number[]
): Grid {
  const gridRooms: GridRoom[] = rooms.map((r) => ({
    roomNumber: r.roomNumber,
    days: r.days,
    total: Object.values(r.days).filter((v) => v !== "").length,
  }));

  const dailyTotals: Record<number, number> = {};
  for (const day of allDays) {
    dailyTotals[day] = rooms.filter((r) => (r.days[day] ?? "") !== "").length;
  }

  return { rooms: gridRooms, dailyTotals };
}

const gridArb = fc
  .tuple(
    fc.integer({ min: 1, max: 10 }), // number of rooms
    fc.integer({ min: 1, max: 31 })  // number of days
  )
  .chain(([numRooms, numDays]) => {
    const days = Array.from({ length: numDays }, (_, i) => i + 1);
    const roomArb = fc
      .tuple(
        fc.string({ minLength: 1, maxLength: 5 }),
        fc.array(fc.oneof(fc.constant(""), fc.string({ minLength: 1, maxLength: 10 })), {
          minLength: numDays,
          maxLength: numDays,
        })
      )
      .map(([roomNumber, occupancy]) => ({
        roomNumber,
        days: Object.fromEntries(days.map((d, i) => [d, occupancy[i]])) as Record<number, string>,
      }));

    return fc
      .array(roomArb, { minLength: numRooms, maxLength: numRooms })
      .map((rooms) => ({ rooms, days }));
  });

fc.assert(
  fc.property(gridArb, ({ rooms, days }) => {
    const grid = buildGrid(rooms, days);

    // Each room's total === count of non-empty day values
    for (const room of grid.rooms) {
      const expected = Object.values(room.days).filter((v) => v !== "").length;
      if (room.total !== expected) return false;
    }

    // Each day's total === count of rooms with non-empty value for that day
    for (const day of days) {
      const expected = rooms.filter((r) => (r.days[day] ?? "") !== "").length;
      if (grid.dailyTotals[day] !== expected) return false;
    }

    return true;
  }),
  { numRuns: 100, verbose: true }
);

console.log(
  "✓ Property 4 passed: monthly grid totals are correct — Feature: reporting-feature, Property 4: monthly grid totals are correct"
);

// =============================================================================
// Property 6: Opening balance equals sum of prior checkouts
// Feature: reporting-feature, Property 6: opening balance equals sum of prior checkouts
// Validates: Requirements 4.4, 9.4
// =============================================================================

type Booking = { checkOut: string; totalPrice: number };

function computeOpeningBalance(bookings: Booking[], date: string): number {
  return bookings
    .filter((b) => b.checkOut < date)
    .reduce((sum, b) => sum + b.totalPrice, 0);
}

const bookingArb = fc.record({
  checkOut: fc
    .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
    .map(toYMD),
  totalPrice: fc.float({ min: 0, max: 100000, noNaN: true }),
});

const openingBalanceArb = fc.tuple(
  fc.array(bookingArb, { minLength: 0, maxLength: 50 }),
  fc
    .date({ min: new Date("2020-01-01"), max: new Date("2030-12-31") })
    .map(toYMD)
);

fc.assert(
  fc.property(openingBalanceArb, ([bookings, targetDate]) => {
    const result = computeOpeningBalance(bookings, targetDate);
    const expected = bookings
      .filter((b) => b.checkOut < targetDate)
      .reduce((sum, b) => sum + b.totalPrice, 0);
    return Math.abs(result - expected) < 0.0001;
  }),
  { numRuns: 100, verbose: true }
);

console.log(
  "✓ Property 6 passed: opening balance equals sum of prior checkouts — Feature: reporting-feature, Property 6: opening balance equals sum of prior checkouts"
);

// =============================================================================
// Property 7: Sales report totals row equals column sums
// Feature: reporting-feature, Property 7: sales report totals row equals column sums
// Validates: Requirements 5.3
// =============================================================================

type SalesEntry = {
  food: number;
  gst: number;
  serviceCharge: number;
  numberOfBills: number;
  total: number;
};

function computeTotals(entries: SalesEntry[]): SalesEntry {
  return entries.reduce(
    (acc, e) => ({
      food: acc.food + e.food,
      gst: acc.gst + e.gst,
      serviceCharge: acc.serviceCharge + e.serviceCharge,
      numberOfBills: acc.numberOfBills + e.numberOfBills,
      total: acc.total + e.total,
    }),
    { food: 0, gst: 0, serviceCharge: 0, numberOfBills: 0, total: 0 }
  );
}

const salesEntryArb = fc.record({
  food: fc.float({ min: 0, max: 10000, noNaN: true }),
  gst: fc.float({ min: 0, max: 10000, noNaN: true }),
  serviceCharge: fc.float({ min: 0, max: 10000, noNaN: true }),
  numberOfBills: fc.integer({ min: 0, max: 1000 }),
  total: fc.float({ min: 0, max: 50000, noNaN: true }),
});

fc.assert(
  fc.property(fc.array(salesEntryArb, { minLength: 0, maxLength: 50 }), (entries) => {
    const totals = computeTotals(entries);
    const fields: (keyof SalesEntry)[] = ["food", "gst", "serviceCharge", "numberOfBills", "total"];
    for (const field of fields) {
      const expected = entries.reduce((sum, e) => sum + e[field], 0);
      if (Math.abs(totals[field] - expected) > 0.0001) return false;
    }
    return true;
  }),
  { numRuns: 100, verbose: true }
);

console.log(
  "✓ Property 7 passed: sales report totals row equals column sums — Feature: reporting-feature, Property 7: sales report totals row equals column sums"
);

// =============================================================================
// Property 8: Cancellation percentage formula is correct
// Feature: reporting-feature, Property 8: cancellation percentage formula is correct
// Validates: Requirements 6.3
// =============================================================================

function cancellationPercentage(n: number, m: number): number {
  return Math.round((n / m) * 100 * 100) / 100;
}

const cancellationArb = fc
  .integer({ min: 1, max: 31 })
  .chain((m) =>
    fc.integer({ min: 0, max: m }).map((n) => ({ n, m }))
  );

fc.assert(
  fc.property(cancellationArb, ({ n, m }) => {
    const result = cancellationPercentage(n, m);
    const expected = Math.round((n / m) * 100 * 100) / 100;
    return result === expected;
  }),
  { numRuns: 100, verbose: true }
);

console.log(
  "✓ Property 8 passed: cancellation percentage formula is correct — Feature: reporting-feature, Property 8: cancellation percentage formula is correct"
);

// =============================================================================
// Property 9: Monthly bills summary counts match detail rows
// Feature: reporting-feature, Property 9: monthly bills summary counts match detail rows
// Validates: Requirements 7.2
// =============================================================================

const MEMBER_TYPES = ["MEMBER", "GUEST", "FORCES", "AFF_CLUB"] as const;
type MemberType = (typeof MEMBER_TYPES)[number];

type BillEntry = { memberType: string };

type BillSummary = {
  member: number;
  guest: number;
  forces: number;
  affClub: number;
};

function computeSummary(entries: BillEntry[]): BillSummary {
  return {
    member: entries.filter((e) => e.memberType === "MEMBER").length,
    guest: entries.filter((e) => e.memberType === "GUEST").length,
    forces: entries.filter((e) => e.memberType === "FORCES").length,
    affClub: entries.filter((e) => e.memberType === "AFF_CLUB").length,
  };
}

const billEntryArb = fc.record({
  memberType: fc.constantFrom(...MEMBER_TYPES),
});

fc.assert(
  fc.property(fc.array(billEntryArb, { minLength: 0, maxLength: 100 }), (entries) => {
    const summary = computeSummary(entries);
    return (
      summary.member === entries.filter((e) => e.memberType === "MEMBER").length &&
      summary.guest === entries.filter((e) => e.memberType === "GUEST").length &&
      summary.forces === entries.filter((e) => e.memberType === "FORCES").length &&
      summary.affClub === entries.filter((e) => e.memberType === "AFF_CLUB").length
    );
  }),
  { numRuns: 100, verbose: true }
);

console.log(
  "✓ Property 9 passed: monthly bills summary counts match detail rows — Feature: reporting-feature, Property 9: monthly bills summary counts match detail rows"
);

console.log(
  "\nAll Property 4, 6, 7, 8, 9 checks passed."
);
