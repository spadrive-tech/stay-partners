// Demo mode: an in-browser fake of the Kiataka partner API with sample data.
// Never talks to the real server.
import type { Applicant, AvailabilityDay, Booking, Earning, Listing, Media, Partner, Payout } from "./api";
import yearlyApartment from "@/assets/yearly-apartment.jpg";

export const DEMO_TOKEN = "demo-partner-token";

const iso = (offset: number) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
};
const img = (seed: string) => `https://picsum.photos/seed/${seed}/800/600`;
const photos = (p: string, n: number, roomType?: string): Media[] =>
  Array.from({ length: n }, (_, i) => ({ id: `${p}-m${i}`, url: img(`${p}${i}`), type: "photo", is_cover: i === 0 && !roomType, position: i, ...(roomType ? { room_type: roomType } : {}) }));

const db = {
  partner: {
    id: "demo",
    business_name: "Lekki Comfort Suites",
    contact_person: "Adaeze Okafor",
    phone: "+234 803 123 4567",
    email: "demo@lekkicomfort.ng",
    cac_number: "RC 1234567",
    application_status: "under_review",
    payout_account: { bank_name: "GTBank", account_number: "0123456789", account_name: "Lekki Comfort Suites Ltd" },
    profile_complete: false,
  } as Partner,
  listings: [
    { id: "r1", title: "2-Bedroom Yearly Apartment, Lekki", type: "yearly_rental", apartment_type: "2 bedroom", city: "Lagos", address: "Lekki Phase 1, Lagos", nightly_rate: 0, annual_rent: 3500000, units: 1, status: "live", description: "Bright unfurnished two-bedroom apartment with a balcony and tiled floors.", amenities: ["Parking", "Security"], media: [{ id: "r1-m1", url: yearlyApartment, type: "photo", is_cover: true }], rental_details: { availability: "available", available_from: iso(0), bathrooms: 2, furnished: false, agent_name: "Adaeze Okafor", agent_phone: "+234 803 123 4567", agent_email: "demo@lekkicomfort.ng", applications_enabled: true, inspections_enabled: true, contact_enabled: true, inspection_notes: "Inspections by appointment, Monday to Saturday.", fees: [{ name: "Agency fee", amount: 350000, refundable: false }, { name: "Caution fee", amount: 200000, refundable: true }] } },
    { id: "l1", title: "Deluxe Ocean-View Room", type: "hotel_room", city: "Lagos", address: "12 Admiralty Way, Lekki Phase 1", nightly_rate: 65000, units: 6, status: "live", description: "Bright room with ocean views, king bed and en-suite bathroom.", amenities: ["Wi-Fi", "Air conditioning", "24/7 power", "Breakfast", "Security"], house_rules: "No smoking. Check-in from 2pm.", room_types: [{ name: "Deluxe room", nightly_rate: 65000, max_guests: 2, units: 4 }, { name: "Executive suite", nightly_rate: 95000, max_guests: 3, units: 2 }], media: [...photos("l1", 2), ...photos("l1d", 3, "Deluxe room"), ...photos("l1e", 2, "Executive suite")] },
    { id: "l2", title: "2-Bedroom Shortlet, Ikoyi", type: "shortlet", city: "Lagos", address: "4 Bourdillon Road, Ikoyi", nightly_rate: 120000, units: 1, status: "live", description: "Fully serviced apartment with a modern kitchen and pool access.", amenities: ["Wi-Fi", "Kitchen", "Swimming pool", "Parking", "Smart TV"], house_rules: "No parties.", media: photos("l2", 4) },
    { id: "l3", title: "Executive Suite, Wuse 2", type: "hotel_room", city: "Abuja", address: "21 Aminu Kano Crescent, Wuse 2", nightly_rate: 85000, units: 3, status: "pending_review", description: "Spacious suite with a workspace.", amenities: ["Wi-Fi", "Workspace", "Gym"], room_types: [{ name: "Executive suite", nightly_rate: 85000, max_guests: 3, units: 3 }], media: [...photos("l3", 1), ...photos("l3e", 2, "Executive suite")] },
    { id: "l4", title: "Studio Apartment, Yaba", type: "shortlet", city: "Lagos", address: "8 Herbert Macaulay Way, Yaba", nightly_rate: 40000, units: 2, status: "draft", description: "Cosy studio near the tech hub.", amenities: ["Wi-Fi"], media: [] },
  ] as Listing[],
  bookings: [
    { id: "ra1", reference: "KR-201", request_type: "rental_application", listing_id: "r1", guest_name: "Ngozi Umeh", listing_title: "2-Bedroom Yearly Apartment, Lekki", check_in: iso(15), check_out: "", amount: 3500000, status: "pending", message: "I'm relocating for work and would like to apply for a yearly tenancy.", contact_phone: "+234 803 000 0000", contact_email: "tenant@example.com" },
    { id: "ri1", reference: "KI-202", request_type: "inspection", listing_id: "r1", guest_name: "Kelechi Nwosu", listing_title: "2-Bedroom Yearly Apartment, Lekki", check_in: "", check_out: "", inspection_at: `${iso(3)}T11:00:00`, amount: 0, status: "pending", message: "Can I inspect the apartment on Saturday morning?", contact_phone: "+234 804 000 0000" },
    { id: "b1", reference: "KS-10421", guest_name: "Tunde Bakare", listing_title: "Deluxe Ocean-View Room", check_in: iso(2), check_out: iso(5), amount: 195000, status: "pending" },
    { id: "b2", reference: "KS-10418", guest_name: "Chioma Eze", listing_title: "2-Bedroom Shortlet, Ikoyi", check_in: iso(1), check_out: iso(4), amount: 360000, status: "confirmed" },
    { id: "b3", reference: "KS-10410", guest_name: "Ibrahim Musa", listing_title: "Deluxe Ocean-View Room", check_in: iso(-1), check_out: iso(2), amount: 195000, status: "checked_in" },
    { id: "b4", reference: "KS-10388", guest_name: "Funke Adeyemi", listing_title: "2-Bedroom Shortlet, Ikoyi", check_in: iso(-10), check_out: iso(-7), amount: 360000, status: "completed" },
    { id: "b5", reference: "KS-10377", guest_name: "Emeka Obi", listing_title: "Deluxe Ocean-View Room", check_in: iso(-14), check_out: iso(-12), amount: 130000, status: "cancelled" },
    { id: "b6", reference: "KS-10430", guest_name: "Grace Johnson", listing_title: "Deluxe Ocean-View Room", check_in: iso(6), check_out: iso(8), amount: 130000, status: "pending" },
  ] as Booking[],
  payouts: [
    { id: "p1", amount: 420000, status: "paid", created_at: iso(-20) },
    { id: "p2", amount: 280000, status: "approved", created_at: iso(-5) },
  ] as Payout[],
  availability: {} as Record<string, Record<string, AvailabilityDay["status"]>>,
  balance: 486000,
  applicants: [
    { id: "a1", name: "Ngozi Umeh", occupation: "Product designer, Paystack", photo_url: "https://i.pravatar.cc/400?img=47", listing_id: "l2", listing_title: "2-Bedroom Shortlet, Ikoyi", check_in: iso(9), check_out: iso(16), guests: 2, message: "Hi! My partner and I are in Lagos for a work trip and would love a quiet place close to Ikoyi.", rental_score: 782, verification: { id_verified: true, phone_verified: true, employment_verified: true }, history: { past_stays: 11, average_rating: 4.9, incidents: 0, reviews: [{ host: "Banana Island Homes", rating: 5, comment: "Left the apartment spotless. Very respectful." }, { host: "VI Suites", rating: 5, comment: "Great communication, would host again." }] }, status: "pending" },
    { id: "a2", name: "Kelechi Nwosu", occupation: "Banker, Access Bank", photo_url: "https://i.pravatar.cc/400?img=12", listing_id: "l1", listing_title: "Deluxe Ocean-View Room", check_in: iso(4), check_out: iso(6), guests: 1, message: "Booking for a weekend conference nearby.", rental_score: 701, verification: { id_verified: true, phone_verified: true, employment_verified: false }, history: { past_stays: 4, average_rating: 4.5, incidents: 0, reviews: [{ host: "Lekki Gardens", rating: 4, comment: "Quiet guest, checked out on time." }] }, status: "pending" },
    { id: "a3", name: "Bola Ade", occupation: "Student", photo_url: "https://i.pravatar.cc/400?img=33", listing_id: "l4", listing_title: "Studio Apartment, Yaba", check_in: iso(3), check_out: iso(10), guests: 4, message: "Celebrating with friends this week!", rental_score: 552, verification: { id_verified: true, phone_verified: false, employment_verified: false }, history: { past_stays: 2, average_rating: 3.2, incidents: 1, reviews: [{ host: "Surulere Stays", rating: 3, comment: "Noise complaint from neighbours on the second night." }] }, status: "pending" },
    { id: "a4", name: "Hauwa Bello", occupation: "Doctor, National Hospital", photo_url: "https://i.pravatar.cc/400?img=45", listing_id: "l3", listing_title: "Executive Suite, Wuse 2", check_in: iso(12), check_out: iso(19), guests: 1, message: "Relocating to Abuja and need a calm place for a week while I find an apartment.", rental_score: 758, verification: { id_verified: true, phone_verified: true, employment_verified: true }, history: { past_stays: 7, average_rating: 4.8, incidents: 0, reviews: [] }, status: "pending" },
    { id: "a5", name: "Segun Afolabi", occupation: "Software engineer", photo_url: "https://i.pravatar.cc/400?img=59", listing_id: "l1", listing_title: "Deluxe Ocean-View Room", check_in: iso(-3), check_out: iso(-1), guests: 2, rental_score: 690, verification: { id_verified: true, phone_verified: true, employment_verified: true }, history: { past_stays: 3, average_rating: 4.6, incidents: 0 }, status: "approved" },
  ] as Applicant[],
};

const earnings = (): Earning[] =>
  db.bookings
    .filter((b) => !b.request_type || b.request_type === "booking")
    .filter((b) => b.status === "completed" || b.status === "checked_in" || b.status === "confirmed")
    .map((b) => ({ booking_id: b.id, reference: b.reference, listing_title: b.listing_title, guest_name: b.guest_name, gross: b["amount"], commission: b["amount"] * 0.1, net: b["amount"] * 0.9, date: b.check_in }));

class DemoError extends Error {
  status = 400;
}

export async function demoApi(path: string, method: string, body: unknown, form?: FormData): Promise<unknown> {
  await new Promise((r) => setTimeout(r, 250));
  const [p, qs] = path.split("?");
  const q = new URLSearchParams(qs);
  const b = (body ?? {}) as Record<string, any>;
  const seg = p!.replace("/stays/partner", "").split("/").filter(Boolean);
  const findL = (id: string) => {
    const l = db.listings.find((x) => x.id === id);
    if (!l) throw new DemoError("Listing not found");
    return l;
  };

  if (p === "/stay/partners/banks")
    return {
      data: [
        { bankname: "Access Bank", bankcode: "000014" },
        { bankname: "First Bank of Nigeria", bankcode: "000016" },
        { bankname: "Guaranty Trust Bank", bankcode: "000013" },
        { bankname: "KEYSTONE BANK", bankcode: "000002" },
        { bankname: "Opay", bankcode: "100004" },
        { bankname: "United Bank for Africa", bankcode: "000004" },
        { bankname: "Zenith Bank", bankcode: "000015" },
      ],
    };
  if (p === "/stay/partners/bank-account" || p === "/stay/partners/bank-account/verify") {
    if (method === "POST" || method === "PUT") {
      const num = String(b["account_number"] ?? "");
      if (!/^\d{10}$/.test(num)) throw new DemoError("Account number must be 10 digits");
      db.partner.payout_account = { bank_name: String(b["bank_name"] ?? ""), account_number: num, account_name: "LEKKI COMFORT SUITES LTD" };
      (db.partner as Record<string, unknown>)["payout_bank_code"] = b["bank_code"];
    }
    const a = db.partner.payout_account;
    if (!a?.account_number) return { status: "success", account: null };
    return {
      status: "success",
      account: {
        id: 1,
        bank_code: String((db.partner as Record<string, unknown>)["payout_bank_code"] ?? "000013"),
        bank_name: a.bank_name,
        account_number_masked: `******${a.account_number.slice(-4)}`,
        account_name: a.account_name,
        verification_status: "verified",
        is_active: true,
      },
    };
  }
  if (p === "/stay/partners/wallet")
    return { wallet_id: 1, currency: "NGN", kyc_status: "verified", pending_earnings: 120000, available_earnings: db.balance, reserved_payout: 0, total_paid_out: 1250000, lifetime_earnings: 2123000, refund_liability: 0, payout_eligible: db.balance > 0 };
  if (p === "/stay/partners/bookings") {
    const items = db.bookings.filter((x) => !x.request_type || x.request_type === "booking").map((x) => ({ id: x.id, reference: x.reference, status: x.status, check_in_date: x.check_in, check_out_date: x.check_out, guest_name: x.guest_name, listing_title: x.listing_title, total_amount: x.amount, room_count: 1 }));
    return { items, total: items.length, page: 1, size: 100 };
  }
  if (p === "/stay/partners/wallet/transactions") {
    const items = earnings().map((e, i) => ({ id: i + 1, direction: "credit", amount: e.net, created_at: e.date, description: e.listing_title }));
    return { items, total: items.length, page: 1, size: 100 };
  }
  // ---- Stay partner listings (/stay/partners/listings*) ----
  if (p!.startsWith("/stay/partners/listings")) {
    const parts = p!.replace("/stay/partners/listings", "").split("/").filter(Boolean);
    const stayListings = () => db.listings.filter((l) => l.type !== "yearly_rental");
    if (!parts[0]) {
      if (method === "POST") {
        const l = { id: `l${Date.now()}`, title: "", type: "shortlet", city: "", address: "", nightly_rate: 0, units: 0, status: "draft", media: [] } as unknown as Listing;
        db.listings.unshift(l);
        return { listing_id: l.id, status: "draft", progress: stayProgress(l) };
      }
      const items = stayListings().map((l) => ({
        id: l.id, title: l.title || null, property_type: l.type === "hotel_room" ? "hotel" : "shortlet", status: l.status === "live" ? "published" : l.status,
        total_room_inventory: stayRooms(l).reduce((n, r) => n + r.room_count, 0),
        starting_nightly_rate: stayRooms(l).length ? Math.min(...stayRooms(l).map((r) => r.nightly_rate)) : null,
        progress: stayProgress(l), rejection_reason: null,
        cover_url: l.media?.find((m) => m.is_cover)?.url ?? l.media?.find((m) => m.type === "photo")?.url ?? null,
      }));
      return { items, total: items.length, page: 1, size: 100 };
    }
    const l = findL(parts[0]) as Listing & Record<string, any>;
    const action = parts[1];
    if (!action) return stayDto(l);
    if (action === "details") {
      l.title = b["title"] ?? l.title;
      l.type = b["property_type"] === "hotel" || b["property_type"] === "hotel_room" ? "hotel_room" : "shortlet";
      l.city = b["city"] ?? ""; l["state"] = b["state"] ?? ""; l.address = b["address"] ?? ""; l.description = b["description"] ?? "";
      l.amenities = b["amenity_codes"] ?? [];
      l.house_rules = (b["house_rules"] ?? []).join("\n");
      return stayDto(l);
    }
    if (action === "rooms") {
      const rooms = (b["room_types"] ?? []) as { id?: number; name: string; nightly_rate: number; max_guests: number; room_count: number }[];
      if (l.type === "hotel_room") {
        l.room_types = rooms.map((r) => ({ name: r.name, nightly_rate: Number(r.nightly_rate), max_guests: r.max_guests, units: r.room_count }));
        l.nightly_rate = rooms.length ? Math.min(...rooms.map((r) => Number(r.nightly_rate))) : 0;
        l.units = rooms.reduce((n, r) => n + r.room_count, 0);
      } else if (rooms[0]) {
        l.apartment_type = rooms[0].name; l.nightly_rate = Number(rooms[0].nightly_rate); l.units = rooms[0].room_count;
      }
      l.max_guests = b["max_guests_per_booking"] ?? l.max_guests;
      l.min_nights = b["minimum_nights"] ?? 1;
      l.extra_fees = (b["fees"] ?? []).map((f: any) => ({ name: f.name, amount: Number(f.amount), charge: "per_stay", fee_type: f.fee_type, mandatory: f.is_mandatory }));
      l["_rooms_done"] = true;
      return stayDto(l);
    }
    if (action === "policies") return (l["_policy"] = b), stayDto(l);
    if (action === "availability") return (l["_availability"] = (b["entries"] ?? []).map((e: any, i: number) => ({ ...e, id: i + 1 }))), stayDto(l);
    if (action === "submit") {
      const missing = Object.entries(stayProgress(l)).filter(([k, v]) => k.endsWith("_completed") && !v).map(([k]) => k.replace("_completed", ""));
      if (missing.length) throw new DemoError(`Complete these sections first: ${missing.join(", ")}`);
      l.status = "pending_review";
      return stayDto(l);
    }
    if (action === "images") {
      l.media ??= [];
      const imageId = parts[2];
      if (imageId && method === "DELETE") l.media = l.media.filter((m) => m.id !== imageId);
      else if (imageId && method === "PATCH") {
        if (b["is_primary"]) l.media.forEach((m) => (m.is_cover = m.id === imageId));
        if (typeof b["sort_order"] === "number") {
          const m = l.media.find((x) => x.id === imageId);
          if (m) m.position = b["sort_order"];
          l.media.sort((x, y) => (x.position ?? 0) - (y.position ?? 0));
        }
      } else if (method === "POST" && form) {
        const first = form.get("set_first_as_primary") === "true";
        const files = form.getAll("files").filter((f): f is File => f instanceof File);
        files.forEach((f, i) => l.media!.push({ id: `m${Date.now()}${i}`, url: URL.createObjectURL(f), type: "photo", is_cover: first && i === 0, position: l.media!.length }));
      }
      return stayImages(l);
    }
  }
  if (p === "/stay/partners/onboarding") {
    const drafts = db.listings.filter((l) => l.status === "draft").length;
    const submitted = db.listings.length - drafts;
    const bank = !!db.partner.payout_account?.account_number;
    return {
      business_name: db.partner.business_name,
      onboarding: {
        completed: bank && submitted > 0,
        current_phase: !bank ? "bank_account" : db.listings.length === 0 ? "listing" : submitted === 0 ? "submit_listing" : "completed",
        bank_account_verified: bank,
        has_listing: db.listings.length > 0,
        draft_listing_count: drafts,
        submitted_listing_count: submitted,
      },
    };
  }
  if (seg[0] === "application") {
    const { id_number, id_type, ...rest } = b;
    Object.assign(db.partner, rest, { profile_complete: true });
    return db.partner;
  }
  if (seg[0] === "me") {
    if (method === "PUT") {
      const { current_password, new_password, password, ...rest } = b;
      Object.assign(db.partner, rest);
    }
    return db.partner;
  }
  if (seg[0] === "payout-account") return (db.partner.payout_account = b as any), db.partner;
  if (seg[0] === "summary")
    return {
      total_listings: db.listings.length,
      units_vacant_today: 7,
      upcoming_checkins: db.bookings.filter((x) => x.status === "confirmed" || x.status === "pending").length,
      earnings_this_month: 873000,
      pending_payout_balance: db.balance,
    };
  if (seg[0] === "earnings") return { balance: db.balance, available_balance: db.balance, items: earnings() };
  if (seg[0] === "payouts") {
    if (method === "POST") {
      if (db.balance <= 0) throw new DemoError("No balance available to pay out");
      const po: Payout = { id: `p${Date.now()}`, amount: Number(b["amount"] ?? db.balance), status: "requested", created_at: iso(0) };
      db.payouts.unshift(po);
      db.balance = 0;
      return po;
    }
    return db.payouts;
  }
  if (seg[0] === "landlord" && seg[1] === "tenants") {
    const i = db.bookings.findIndex((x) => x.id === seg[2]);
    const bk = db.bookings[i];
    if (!bk) throw new DemoError("Tenant not found");
    const t = db.applicants[i % db.applicants.length]!;
    return { ...t, id: seg[2], photo_url: undefined, name: bk.guest_name };
  }
  if (seg[0] === "bookings") {
    if (seg[1] && seg[2]) {
      const bk = db.bookings.find((x) => x.id === seg[1]);
      if (bk) bk.status = seg[2] === "accept" ? "confirmed" : "cancelled";
      return bk;
    }
    const st = q.get("status");
    const search = (q.get("search") ?? q.get("q") ?? "").toLowerCase();
    return db.bookings.map((x) => ({ ...x, tenant_id: x.id })).filter(
      (x) =>
        (!st || st === "all" || x.status === st) &&
        (!search || x.guest_name.toLowerCase().includes(search) || x.reference.toLowerCase().includes(search)),
    );
  }
  if (seg[0] === "listings") {
    if (!seg[1]) {
      if (method === "POST") {
        const l: Listing = { ...(b as any), id: `l${Date.now()}`, status: "draft", media: [] };
        db.listings.unshift(l);
        return l;
      }
      return db.listings.map((l) => ({ ...l, cover_url: l.media?.find((m) => m.is_cover)?.url ?? l.media?.[0]?.url }));
    }
    const l = findL(seg[1]);
    const action = seg[2];
    if (!action) {
      if (method === "PUT") Object.assign(l, b);
      return l;
    }
    if (action === "submit") return (l.status = "pending_review"), l;
    if (action === "pause") return (l.status = "draft"), l;
    if (action === "request-removal") return { ok: true };
    if (action === "media") {
      l.media ??= [];
      if (seg[3] === "order") {
        const order: string[] = b["order"] ?? [];
        l.media.sort((a, c) => order.indexOf(a.id) - order.indexOf(c.id));
        return l.media;
      }
      if (seg[3] && seg[4] === "cover") {
        l.media.forEach((m) => (m.is_cover = m.id === seg[3]));
        return l.media;
      }
      if (seg[3] && method === "DELETE") {
        l.media = l.media.filter((m) => m.id !== seg[3]);
        return l.media;
      }
      if (form) {
        const rt = form.get("room_type");
        const roomType = typeof rt === "string" && rt ? rt : undefined;
        for (const f of form.getAll("files[]")) {
          if (f instanceof File)
            l.media.push({ id: `m${Date.now()}${Math.random()}`, url: URL.createObjectURL(f), type: f.type.startsWith("video") ? "video" : "photo", is_cover: l.media.length === 0, ...(roomType ? { room_type: roomType } : {}) });
        }
      }
      return l.media;
    }
    if (action === "availability") {
      const map = (db.availability[l.id] ??= {});
      if (method === "PUT") {
        for (const d of (b["days"] ?? []) as AvailabilityDay[]) map[d.date] = d.status;
        return { ok: true };
      }
      const from = new Date(q.get("from") ?? iso(0));
      const to = new Date(q.get("to") ?? iso(30));
      const days: AvailabilityDay[] = [];
      for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
        const k = d.toISOString().slice(0, 10);
        const n = d.getDate();
        days.push({ date: k, status: map[k] ?? (!["l1", "l2", "l3"].includes(l.id) ? "available" : n % 9 === 0 ? "booked" : n % 13 === 0 ? "blocked" : "available") });
      }
      return { days };
    }
  }
  return { ok: true };
}

// ---- Stay listing demo helpers ----
function stayRooms(l: Listing) {
  if (l.type === "hotel_room") return (l.room_types ?? []).map((r, i) => ({ id: i + 1, name: r.name, nightly_rate: r.nightly_rate, max_guests: r.max_guests, room_count: r.units }));
  return l.nightly_rate > 0 ? [{ id: 1, name: l.apartment_type ?? "Entire apartment", nightly_rate: l.nightly_rate, max_guests: l.max_guests ?? 2, room_count: l.units || 1 }] : [];
}
function stayImages(l: Listing) {
  return (l.media ?? []).filter((m) => m.type === "photo").map((m, i) => ({ id: m.id, url: m.url, is_primary: !!m.is_cover, sort_order: m.position ?? i }));
}
function stayProgress(l: Listing & Record<string, any>) {
  const seeded = l.status !== "draft" || !String(l.id).match(/^l\d{6,}/);
  return {
    details_completed: !!(l.title && l.city && l.address),
    rooms_completed: stayRooms(l).length > 0,
    policies_completed: seeded || !!l["_policy"],
    availability_completed: seeded || !!l["_availability"],
    last_completed_tab: null,
    next_tab: null,
  };
}
function stayDto(l: Listing & Record<string, any>) {
  const pay = l.payment_terms, cancel = l.cancellation, ci = l.check_in;
  const policy = l["_policy"] ?? (pay || cancel || ci
    ? {
        allow_full_payment: pay?.full_payment ?? true, allow_deposit: pay?.deposit ?? false, allow_pay_on_arrival: pay?.pay_on_arrival ?? false,
        deposit_percent: pay?.deposit_percent ?? null, cancellation_allowed: cancel?.allowed ?? true, free_cancellation_days: cancel?.free_until_days ?? 2,
        refund_percentage: cancel?.refund_percent ?? 100, check_in_method: "front_desk", arrival_contact_phone: ci?.contact_phone ?? null,
        check_in_time: ci?.check_in_time ?? "14:00", check_out_time: ci?.check_out_time ?? "12:00", arrival_instructions: ci?.instructions ?? null,
      }
    : null);
  return {
    listing_id: l.id, status: l.status === "live" ? "published" : l.status, title: l.title || null,
    property_type: l.type === "hotel_room" ? "hotel" : "shortlet", city: l.city || null, state: l["state"] || (l.city ? "Lagos" : null), country: "Nigeria",
    address: l.address || null, description: l.description || null, max_guests_per_booking: l.max_guests ?? null, minimum_nights: l.min_nights ?? 1,
    amenities: l.amenities ?? [], house_rules: (l.house_rules ?? "").split("\n").map((r: string) => r.trim()).filter(Boolean),
    room_types: stayRooms(l),
    fees: (l.extra_fees ?? []).map((f, i) => ({ id: i + 1, fee_type: f.fee_type ?? (f.name.toLowerCase().includes("caution") ? "caution" : f.name.toLowerCase().includes("clean") ? "cleaning" : "custom"), name: f.name, amount: f.amount, is_mandatory: f.mandatory ?? true })),
    booking_policy: policy, availability: l["_availability"] ?? [], images: stayImages(l), progress: stayProgress(l),
    rejection_reason: null, submitted_at: null, reviewed_at: null, published_at: null,
  };
}
