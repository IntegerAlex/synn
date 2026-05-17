import { describe, expect, it, vi } from "vitest";
import { calculateBackoffDelay } from "@/lib/utils/fetchWithBackoff";

describe("calculateBackoffDelay", () => {
  it("returns base delay for first attempt", () => {
    // Mock random to 0 to eliminate jitter
    vi.spyOn(Math, "random").mockReturnValue(0);
    const delay = calculateBackoffDelay(0, { baseDelay: 1000, jitter: 0 });
    expect(delay).toBe(1000);
    vi.restoreAllMocks();
  });

  it("doubles delay with each attempt", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const delay0 = calculateBackoffDelay(0, { baseDelay: 1000, jitter: 0 });
    const delay1 = calculateBackoffDelay(1, { baseDelay: 1000, jitter: 0 });
    const delay2 = calculateBackoffDelay(2, { baseDelay: 1000, jitter: 0 });
    expect(delay0).toBe(1000);
    expect(delay1).toBe(2000);
    expect(delay2).toBe(4000);
    vi.restoreAllMocks();
  });

  it("caps at maxDelay", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const delay = calculateBackoffDelay(10, {
      baseDelay: 1000,
      maxDelay: 5000,
      jitter: 0,
    });
    expect(delay).toBe(5000);
    vi.restoreAllMocks();
  });

  it("adds jitter to delay", () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const delay = calculateBackoffDelay(0, {
      baseDelay: 1000,
      jitter: 0.2,
    });
    // Base 1000 + jitter (1000 * 0.2 * 0.5) = 1100
    expect(delay).toBe(1100);
    vi.restoreAllMocks();
  });

  it("uses default options", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    const delay = calculateBackoffDelay(0);
    // Default: baseDelay=1000, jitter=0.1, random=0 so jitter=0
    expect(delay).toBe(1000);
    vi.restoreAllMocks();
  });
});
