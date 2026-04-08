import { describe, it, expect } from "vitest";

/**
 * Pure validation function extracted from ReportFilterPanel.tsx
 * Validates: Requirements 2.7
 */
function validateDateRange(fromDate: string, toDate: string): boolean {
  return !!fromDate && !!toDate && fromDate > toDate;
}

describe("validateDateRange", () => {
  it("returns true when fromDate is after toDate", () => {
    expect(validateDateRange("2024-05-10", "2024-05-01")).toBe(true);
  });

  it("returns false when fromDate equals toDate", () => {
    expect(validateDateRange("2024-05-01", "2024-05-01")).toBe(false);
  });

  it("returns false when fromDate is before toDate", () => {
    expect(validateDateRange("2024-05-01", "2024-05-10")).toBe(false);
  });

  it("returns false when fromDate is empty", () => {
    expect(validateDateRange("", "2024-05-10")).toBe(false);
  });

  it("returns false when toDate is empty", () => {
    expect(validateDateRange("2024-05-01", "")).toBe(false);
  });

  it("returns false when both dates are empty", () => {
    expect(validateDateRange("", "")).toBe(false);
  });
});
