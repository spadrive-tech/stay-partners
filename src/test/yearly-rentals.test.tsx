import { describe, expect, it } from "vitest";
import { listingPrice, listingTypeLabel, type Listing } from "@/lib/api";
import { demoApi } from "@/lib/demo";
import { listingShareUrl } from "@/components/portal/ShareListing";

// Yearly rentals are hidden while the Stay backend supports hotels and shortlets only.
describe("Listing basics", () => {
  it("prices Stay listings by their nightly rate", () => {
    expect(listingPrice({ type: "shortlet", nightly_rate: 65000 } as Listing)).toBe("₦65,000");
    expect(listingPrice({ type: "shortlet", nightly_rate: 0 } as Listing)).toBe("—");
    expect(listingTypeLabel("yearly_rental")).toBe("Yearly rental");
  });
  it("does not invent share links", () => {
    expect(listingShareUrl({ id: "r1", type: "yearly_rental" } as Listing)).toBeNull();
    expect(listingShareUrl({ id: "r1", type: "yearly_rental", public_url: "https://usekiataka.com/rentals/r1" } as Listing)).toBe("https://usekiataka.com/rentals/r1");
  });
  it("demo mode refuses the retired /stays/partner endpoints instead of faking them", async () => {
    await expect(demoApi("/stays/partner/me", "GET", undefined)).rejects.toThrow(/doesn't support/);
    await expect(demoApi("/stays/partner/application", "POST", {})).rejects.toThrow(/doesn't support/);
  });
});
