import { afterEach, describe, expect, it, vi } from "vitest";
import { session } from "@/lib/api";
import {
  absoluteMediaUrl, createStayListing, fromStayListing, fromStayListingItem, listStayListings, saveAvailability, saveDetails,
  savePolicies, saveRooms, submitStayListing, uploadStayImages, type StayListingDTO,
} from "@/lib/stay";

// Real responses from the Stay backend (18 Nov 2026).
const EMPTY_LISTING: StayListingDTO = {
  listing_id: 1, status: "draft", title: null, property_type: null, city: null, state: null, country: "Nigeria", address: null,
  description: null, max_guests_per_booking: null, minimum_nights: 1, amenities: [], house_rules: [], room_types: [], fees: [],
  booking_policy: null, availability: [], images: [],
  progress: { details_completed: false, rooms_completed: false, policies_completed: false, availability_completed: false, last_completed_tab: null, next_tab: "details" },
  rejection_reason: null,
};
const LIST = { items: [{ id: 1, title: null, property_type: null, status: "draft", total_room_inventory: 0, starting_nightly_rate: null, progress: EMPTY_LISTING.progress, created_at: "", updated_at: "", rejection_reason: null }], total: 1, page: 1, size: 20 };

type Call = { url: string; method: string; body: unknown; form?: FormData };
function mockFetch(respond: (c: Call) => unknown) {
  const calls: Call[] = [];
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    const c: Call = { url: url.replace("https://api.usekiataka.com", ""), method: init.method ?? "GET", body: typeof init.body === "string" ? JSON.parse(init.body) : null };
    if (init.body instanceof FormData) c.form = init.body;
    calls.push(c);
    return new Response(JSON.stringify(respond(c) ?? {}), { status: 200 });
  }));
  return calls;
}
const tok = "h." + btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + 3600 })) + ".s";

describe("Stay listings adapter", () => {
  afterEach(() => { vi.unstubAllGlobals(); session.clear(); });

  it("reads an empty draft and a list item", () => {
    const l = fromStayListing(EMPTY_LISTING);
    expect(l).toMatchObject({ id: "1", title: "", type: "shortlet", status: "draft", nightly_rate: 0, units: 0, room_types: [], media: [] });
    expect(fromStayListingItem(LIST.items[0]!)).toMatchObject({ id: "1", status: "draft", units: 0, nightly_rate: 0 });
    expect(fromStayListing({ ...EMPTY_LISTING, status: "published" }).status).toBe("live");
  });

  it("creates a draft with no body and lists items", async () => {
    session.set(tok);
    const calls = mockFetch((c) => (c.method === "POST" ? { listing_id: 7, status: "draft", progress: EMPTY_LISTING.progress } : LIST));
    expect(await createStayListing()).toBe("7");
    expect(calls[0]).toMatchObject({ url: "/stay/partners/listings", method: "POST", body: null });
    expect((await listStayListings())[0]?.id).toBe("1");
  });

  it("sends section payloads that match the OpenAPI schemas", async () => {
    session.set(tok);
    const calls = mockFetch(() => ({}));
    await saveDetails("7", { title: " Ocean Room ", type: "hotel_room", city: "Lagos", state: "Lagos", address: "12 Admiralty Way", description: "Nice", amenities: ["Wi-Fi", "Air conditioning", "24/7 power"], house_rules: "No parties\n\n No smoking " });
    await saveRooms("7", { room_types: [{ id: 3, name: "Deluxe room", nightly_rate: 65000, max_guests: 2, units: 4 }], fees: [{ name: "Caution fee", amount: 20000, charge: "per_stay" }, { name: "Towels", amount: 2000, charge: "per_stay", mandatory: false }], max_guests: 2, min_nights: 1 });
    await savePolicies("7", { full_payment: true, deposit: true, deposit_percent: 30, pay_on_arrival: false }, { allowed: true, free_until_days: 2, refund_percent: 100 }, { method: "front_desk", check_in_time: "14:00", check_out_time: "12:00", contact_phone: "0803", instructions: "" });
    await saveAvailability("7", [{ start_date: "2026-11-18", end_date: "2026-11-20", availability_status: "blocked", source: "partner" }]);
    await submitStayListing("7");

    expect(calls[0]).toEqual({ url: "/stay/partners/listings/7/details", method: "PUT", body: { title: "Ocean Room", property_type: "hotel", city: "Lagos", state: "Lagos", country: "Nigeria", address: "12 Admiralty Way", description: "Nice", amenity_codes: ["wifi", "air_conditioning", "24_7_power"], house_rules: ["No parties", "No smoking"] } });
    expect(calls[1]).toEqual({ url: "/stay/partners/listings/7/rooms", method: "PUT", body: {
      room_types: [{ id: 3, name: "Deluxe room", nightly_rate: 65000, max_guests: 2, room_count: 4 }],
      fees: [{ fee_type: "caution", name: "Caution fee", amount: 20000, is_mandatory: true }, { fee_type: "custom", name: "Towels", amount: 2000, is_mandatory: false }],
      max_guests_per_booking: 2, minimum_nights: 1 } });
    expect(calls[2]).toEqual({ url: "/stay/partners/listings/7/policies", method: "PUT", body: {
      allow_full_payment: true, allow_deposit: true, allow_pay_on_arrival: false, deposit_percent: 30, cancellation_allowed: true,
      free_cancellation_days: 2, refund_percentage: 100, check_in_method: "front_desk", arrival_contact_phone: "0803",
      check_in_time: "14:00", check_out_time: "12:00", arrival_instructions: null } });
    expect(calls[3]?.body).toEqual({ entries: [{ start_date: "2026-11-18", end_date: "2026-11-20", availability_status: "blocked", source: "partner" }] });
    expect(calls[4]).toMatchObject({ url: "/stay/partners/listings/7/submit", method: "POST" });
  });

  it("serves relative image paths from the API", () => {
    expect(absoluteMediaUrl("/static/stay/listings/2/893a.png")).toBe("https://api.usekiataka.com/static/stay/listings/2/893a.png");
    expect(absoluteMediaUrl("static/stay/listings/2/893a.png")).toBe("https://api.usekiataka.com/static/stay/listings/2/893a.png");
    expect(absoluteMediaUrl("https://cdn.x/a.png")).toBe("https://cdn.x/a.png");
    expect(absoluteMediaUrl("blob:http://localhost/123")).toBe("blob:http://localhost/123");
    // Real upload response (18 Nov 2026)
    const l = fromStayListing({ ...EMPTY_LISTING, images: [{ id: 2, file_path: "static/stay/listings/2/893a.png", url: "/static/stay/listings/2/893a.png", sort_order: 1, is_primary: false }] });
    expect(l.media?.[0]?.url).toBe("https://api.usekiataka.com/static/stay/listings/2/893a.png");
  });

  it("uploads images as multipart 'files' with set_first_as_primary", async () => {
    session.set(tok);
    const calls = mockFetch(() => ([]));
    const f1 = new File(["a"], "a.jpg", { type: "image/jpeg" }), f2 = new File(["b"], "b.jpg", { type: "image/jpeg" });
    await uploadStayImages("7", [f1, f2], true);
    expect(calls[0]?.url).toBe("/stay/partners/listings/7/images");
    expect(calls[0]?.form?.getAll("files")).toHaveLength(2);
    expect(calls[0]?.form?.get("set_first_as_primary")).toBe("true");
  });

  it("reads a filled listing back into the editor", () => {
    const l = fromStayListing({
      ...EMPTY_LISTING, title: "Studio, Yaba", property_type: "shortlet", city: "Lagos", state: "Lagos", address: "8 Herbert Macaulay",
      amenities: ["wifi", { code: "air_conditioning", name: "Air conditioning" }], house_rules: ["No parties", "No smoking"],
      room_types: [{ id: 9, name: "Self-contained (studio)", nightly_rate: "40000.00", max_guests: 2, room_count: 2 }],
      fees: [{ id: 1, fee_type: "cleaning", name: "Cleaning fee", amount: "5000.00", is_mandatory: true }],
      booking_policy: { allow_full_payment: true, allow_deposit: false, allow_pay_on_arrival: true, deposit_percent: null, cancellation_allowed: true, free_cancellation_days: 1, refund_percentage: "50.00", check_in_method: "self_check_in", arrival_contact_phone: "0803", check_in_time: "14:00:00", check_out_time: "11:00:00", arrival_instructions: "Gate code 1234" },
      images: [{ id: 5, url: "https://x/b.jpg", is_primary: false, sort_order: 1 }, { id: 4, url: "https://x/a.jpg", is_primary: true, sort_order: 0 }],
    });
    expect(l).toMatchObject({ apartment_type: "Self-contained (studio)", nightly_rate: 40000, units: 2, amenities: ["Wi-Fi", "Air conditioning"], house_rules: "No parties\nNo smoking", cover_url: "https://x/a.jpg" });
    expect(l.extra_fees?.[0]).toMatchObject({ amount: 5000, fee_type: "cleaning", mandatory: true });
    expect(l.check_in).toMatchObject({ method: "self_check_in", check_in_time: "14:00", check_out_time: "11:00", instructions: "Gate code 1234" });
    expect(l.cancellation).toMatchObject({ refund_percent: 50 });
    expect(l.media?.map((m) => m.id)).toEqual(["4", "5"]);
  });
});

describe("Stay dashboard summary", () => {
  afterEach(() => { vi.unstubAllGlobals(); session.clear(); });
  const WALLET = { wallet_id: 1, currency: "NGN", kyc_status: "not_started", pending_earnings: 0, available_earnings: 0, reserved_payout: 0, total_paid_out: 0, lifetime_earnings: 0, refund_liability: 0, payout_eligible: false };
  const EMPTY = { items: [], total: 0, page: 1, size: 20 };

  it("works with the real (empty) wallet, bookings and transactions responses", async () => {
    session.set(tok);
    mockFetch((c) => (c.url.startsWith("/stay/partners/wallet/transactions") ? EMPTY : c.url === "/stay/partners/wallet" ? WALLET : c.url.startsWith("/stay/partners/bookings") ? EMPTY : LIST));
    const { getStaySummary } = await import("@/lib/stay");
    expect(await getStaySummary()).toMatchObject({ total_listings: 1, units_vacant_today: 0, upcoming_checkins: 0, earnings_this_month: 0, pending_payout_balance: 0, payout_eligible: false });
  });

  it("counts live units, guests staying tonight, upcoming check-ins and this month's credits", async () => {
    session.set(tok);
    const d = (offset: number) => { const x = new Date(); x.setDate(x.getDate() + offset); return x.toISOString().slice(0, 10); };
    const listings = { items: [{ ...LIST.items[0], status: "published", total_room_inventory: 5 }, { ...LIST.items[0], id: 2, status: "draft", total_room_inventory: 3 }], total: 2, page: 1, size: 100 };
    const bookings = { items: [
      { id: 1, status: "confirmed", check_in_date: d(-1), check_out_date: d(2), room_count: 2 },
      { id: 2, status: "confirmed", check_in_date: d(3), check_out_date: d(5) },
      { id: 3, status: "cancelled", check_in_date: d(0), check_out_date: d(1) },
    ], total: 3, page: 1, size: 100 };
    const txns = { items: [
      { id: 1, direction: "credit", amount: "50000.00", created_at: `${d(0)}T10:00:00` },
      { id: 2, direction: "debit", amount: "20000.00", created_at: `${d(0)}T11:00:00` },
    ], total: 2, page: 1, size: 100 };
    mockFetch((c) => (c.url.startsWith("/stay/partners/wallet/transactions") ? txns : c.url === "/stay/partners/wallet" ? { ...WALLET, available_earnings: "75000.00", pending_earnings: 10000 } : c.url.startsWith("/stay/partners/bookings") ? bookings : listings));
    const { getStaySummary } = await import("@/lib/stay");
    expect(await getStaySummary()).toMatchObject({ total_listings: 2, units_vacant_today: 3, upcoming_checkins: 1, earnings_this_month: 50000, pending_payout_balance: 75000, pending_earnings: 10000 });
  });
});
