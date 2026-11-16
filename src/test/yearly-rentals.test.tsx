import { describe, expect, it } from "vitest";
import { listingPrice, listingTypeLabel, type Listing } from "@/lib/api";
import { demoApi } from "@/lib/demo";
import { listingShareUrl } from "@/components/portal/ShareListing";

describe("Yearly rental agents", () => {
  it("prices yearly rentals independently of nightly rates", () => {
    const listing = { type: "yearly_rental", annual_rent: 3500000, nightly_rate: 65000 } as Listing;
    expect(listingPrice(listing)).toBe("₦3,500,000");
    expect(listingTypeLabel(listing.type)).toBe("Yearly rental");
  });
  it("keeps agents in the existing partner application flow", async () => {
    const partner = await demoApi("/stays/partner/application", "POST", { business_type: "house_agent" });
    expect(partner).toMatchObject({ business_type: "house_agent", profile_complete: true });
  });
  it("supports all three requested tenant actions", async () => {
    const listing = await demoApi("/stays/partner/listings/r1", "GET", undefined);
    expect(listing).toMatchObject({ rental_details: { applications_enabled: true, inspections_enabled: true, contact_enabled: true } });
  });
  it("keeps rental applications and inspections within booking requests", async () => {
    const rows = await demoApi("/stays/partner/bookings", "GET", undefined) as { id: string; request_type?: string }[];
    expect(rows.find((r) => r.id === "ra1")?.request_type).toBe("rental_application");
    expect(rows.find((r) => r.id === "ri1")?.request_type).toBe("inspection");
    await demoApi("/stays/partner/bookings/ra1/accept", "POST", undefined);
    const accepted = await demoApi("/stays/partner/bookings?status=confirmed", "GET", undefined) as { id: string }[];
    expect(accepted.some((r) => r.id === "ra1")).toBe(true);
  });
  it("does not invent tenant-app yearly rental links", () => {
    expect(listingShareUrl({ id: "r1", type: "yearly_rental" } as Listing)).toBeNull();
    expect(listingShareUrl({ id: "r1", type: "yearly_rental", public_url: "https://usekiataka.com/rentals/r1" } as Listing)).toBe("https://usekiataka.com/rentals/r1");
  });
});