/**
 * Stay partner listings — adapter between the Kiataka Stay backend
 * (/stay/partners/listings*) and the app's Listing shape.
 *
 * The backend saves a listing in sections: details → rooms (room types, fees,
 * guests, minimum nights) → policies (payment, cancellation, check-in) →
 * availability, then submit. Prices live on room types; a shortlet is saved
 * as a single room type.
 */
import {
  AMENITIES,
  API_BASE,
  api,
  asList,
  type AvailabilityEntry,
  type CancellationPolicy,
  type CheckInDetails,
  type ExtraFee,
  type Listing,
  type ListingProgress,
  type ListingStatus,
  type Media,
  type PaymentTerms,
  type RoomType,
  type Summary,
} from "./api";

const BASE = "/stay/partners/listings";

// ---------- Backend shapes (from real responses + OpenAPI) ----------

type Num = number | string | null | undefined;

export interface StayRoomTypeDTO {
  id?: number;
  name: string;
  nightly_rate: Num;
  max_guests: number;
  room_count: number;
}

export interface StayFeeDTO {
  id?: number;
  fee_type: "cleaning" | "caution" | "custom" | string;
  name: string;
  amount: Num;
  is_mandatory?: boolean;
}

export interface StayPolicyDTO {
  allow_full_payment?: boolean | null;
  allow_deposit?: boolean | null;
  allow_pay_on_arrival?: boolean | null;
  deposit_percent?: Num;
  cancellation_allowed?: boolean | null;
  free_cancellation_days?: number | null;
  refund_percentage?: Num;
  check_in_method?: CheckInDetails["method"] | null;
  arrival_contact_phone?: string | null;
  check_in_time?: string | null;
  check_out_time?: string | null;
  arrival_instructions?: string | null;
}

/** Image objects aren't documented; read the common field names defensively. */
export interface StayImageDTO {
  id: number | string;
  url?: string;
  image_url?: string;
  file_url?: string;
  file_path?: string;
  secure_url?: string;
  is_primary?: boolean;
  sort_order?: number | null;
}

type AmenityDTO = string | { code?: string; name?: string; label?: string };

export interface StayListingDTO {
  listing_id: number;
  status: string;
  title: string | null;
  property_type: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  address: string | null;
  description: string | null;
  max_guests_per_booking: number | null;
  minimum_nights: number | null;
  amenities: AmenityDTO[];
  house_rules: string[];
  room_types: StayRoomTypeDTO[];
  fees: StayFeeDTO[];
  booking_policy: StayPolicyDTO | null;
  availability: AvailabilityEntry[];
  images: StayImageDTO[];
  progress: ListingProgress;
  rejection_reason: string | null;
  submitted_at?: string | null;
  reviewed_at?: string | null;
  published_at?: string | null;
}

export interface StayListingItemDTO {
  id: number;
  title: string | null;
  property_type: string | null;
  status: string;
  total_room_inventory: number;
  starting_nightly_rate: Num;
  progress: ListingProgress;
  rejection_reason: string | null;
  cover_url?: string | null;
  primary_image_url?: string | null;
}

// ---------- Small converters ----------

const toNum = (v: Num) => (v === null || v === undefined || v === "" ? 0 : Number(v));
const hhmm = (t?: string | null) => (t ? t.slice(0, 5) : undefined);

/** published → live (the app's word); everything else passes through. */
export const toAppStatus = (s: string): ListingStatus => (s === "published" ? "live" : (s as ListingStatus));

/** The app has two kinds: hotels (with room types) and shortlet-style apartments. */
export const toAppType = (t: string | null | undefined): Listing["type"] =>
  t === "hotel" || t === "hotel_room" ? "hotel_room" : "shortlet";
export const toStayPropertyType = (t: Listing["type"]) => (t === "hotel_room" ? "hotel" : "shortlet");

/** "Wi-Fi" → "wifi", "Air conditioning" → "air_conditioning", "24/7 power" → "24_7_power". */
export const amenityCode = (label: string) =>
  label.toLowerCase().replace(/wi-fi/g, "wifi").replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const AMENITY_BY_CODE = new Map(AMENITIES.map((a) => [amenityCode(a), a]));
const amenityLabel = (a: AmenityDTO): string => {
  if (typeof a === "string") return AMENITY_BY_CODE.get(a) ?? AMENITY_BY_CODE.get(amenityCode(a)) ?? a;
  const code = a.code ?? "";
  return AMENITY_BY_CODE.get(code) ?? a.name ?? a.label ?? code;
};

/**
 * The API returns paths like "/static/stay/listings/2/abc.png" (served by the API, not this site),
 * so relative paths get the API address in front. Full URLs, data: and blob: URLs pass through.
 */
export function absoluteMediaUrl(path: string | null | undefined): string {
  if (!path) return "";
  if (/^(https?:|data:|blob:)/i.test(path) || path.startsWith("//")) return path;
  return `${API_BASE.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}

export const imageUrl = (img: StayImageDTO) =>
  absoluteMediaUrl(img.url ?? img.image_url ?? img.secure_url ?? img.file_url ?? img.file_path);

export const toMedia = (img: StayImageDTO, index: number): Media => ({
  id: String(img.id),
  url: imageUrl(img),
  type: "photo",
  is_cover: !!img.is_primary,
  position: img.sort_order ?? index,
});

const feeType = (f: ExtraFee): "cleaning" | "caution" | "custom" => {
  if (f.fee_type) return f.fee_type;
  const n = f.name.toLowerCase();
  return n.includes("clean") ? "cleaning" : n.includes("caution") ? "caution" : "custom";
};

// ---------- Backend → app ----------

export function fromStayListing(d: StayListingDTO): Listing {
  const type = toAppType(d.property_type);
  const rooms: RoomType[] = (d.room_types ?? []).map((r) => ({
    ...(r.id !== undefined ? { id: r.id } : {}),
    name: r.name,
    nightly_rate: toNum(r.nightly_rate),
    max_guests: r.max_guests,
    units: r.room_count,
  }));
  const p = d.booking_policy;
  const images = [...(d.images ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
  const first = rooms[0];
  const listing: Listing = {
    id: String(d.listing_id),
    title: d.title ?? "",
    type,
    status: toAppStatus(d.status),
    city: d.city ?? "",
    state: d.state ?? "",
    address: d.address ?? "",
    description: d.description ?? "",
    amenities: (d.amenities ?? []).map(amenityLabel).filter(Boolean),
    house_rules: (d.house_rules ?? []).join("\n"),
    nightly_rate: rooms.length ? Math.min(...rooms.map((r) => r.nightly_rate || Infinity).filter(Number.isFinite)) || 0 : 0,
    units: rooms.reduce((n, r) => n + (r.units || 0), 0),
    room_types: rooms,
    max_guests: d.max_guests_per_booking ?? first?.max_guests ?? 2,
    min_nights: d.minimum_nights ?? 1,
    extra_fees: (d.fees ?? []).map((f) => ({
      ...(f.id !== undefined ? { id: f.id } : {}),
      name: f.name,
      amount: toNum(f.amount),
      charge: "per_stay" as const,
      fee_type: (["cleaning", "caution", "custom"].includes(f.fee_type) ? f.fee_type : "custom") as ExtraFee["fee_type"] & string,
      mandatory: f.is_mandatory ?? true,
    })),
    media: images.map(toMedia),
    progress: d.progress,
    availability_entries: d.availability ?? [],
  };
  if (first && type !== "hotel_room") listing.apartment_type = first.name;
  if (d.rejection_reason) listing.rejection_reason = d.rejection_reason;
  const cover = listing.media?.find((m) => m.is_cover) ?? listing.media?.[0];
  if (cover?.url) listing.cover_url = cover.url;
  if (p) {
    listing.payment_terms = {
      full_payment: p.allow_full_payment ?? true,
      deposit: p.allow_deposit ?? false,
      deposit_percent: p.deposit_percent === null || p.deposit_percent === undefined ? 30 : toNum(p.deposit_percent),
      pay_on_arrival: p.allow_pay_on_arrival ?? false,
    };
    listing.cancellation = {
      allowed: p.cancellation_allowed ?? true,
      free_until_days: p.free_cancellation_days ?? 0,
      refund_percent: p.refund_percentage === null || p.refund_percentage === undefined ? 100 : toNum(p.refund_percentage),
    };
    const ci: CheckInDetails = { method: p.check_in_method ?? "front_desk" };
    const inT = hhmm(p.check_in_time), outT = hhmm(p.check_out_time);
    if (inT) ci.check_in_time = inT;
    if (outT) ci.check_out_time = outT;
    if (p.arrival_contact_phone) ci.contact_phone = p.arrival_contact_phone;
    if (p.arrival_instructions) ci.instructions = p.arrival_instructions;
    listing.check_in = ci;
  }
  return listing;
}

export function fromStayListingItem(d: StayListingItemDTO): Listing {
  const l: Listing = {
    id: String(d.id),
    title: d.title ?? "",
    type: toAppType(d.property_type),
    status: toAppStatus(d.status),
    nightly_rate: toNum(d.starting_nightly_rate),
    units: d.total_room_inventory ?? 0,
    progress: d.progress,
  };
  const cover = absoluteMediaUrl(d.cover_url ?? d.primary_image_url);
  if (cover) l.cover_url = cover;
  if (d.rejection_reason) l.rejection_reason = d.rejection_reason;
  return l;
}

// ---------- Reads ----------

export async function listStayListings(): Promise<Listing[]> {
  const res = await api(`${BASE}?page=1&size=100`);
  return asList<StayListingItemDTO>(res, "items").map(fromStayListingItem);
}

export async function getStayListing(id: string | number): Promise<Listing> {
  return fromStayListing(await api<StayListingDTO>(`${BASE}/${id}`));
}

export const listingQuery = (id: string) => ({ queryKey: ["listing", id], queryFn: () => getStayListing(id) });
export const listingsQuery = { queryKey: ["listings"], queryFn: listStayListings };

// ---------- Writes ----------

/** Creates an empty draft and returns its id. */
export async function createStayListing(): Promise<string> {
  const res = await api<{ listing_id?: number; id?: number }>(BASE, { method: "POST" });
  const id = res?.listing_id ?? res?.id;
  if (id === undefined || id === null) throw new Error("The server didn't return the new listing's id");
  return String(id);
}

export interface DetailsInput {
  title: string;
  type: Listing["type"];
  city: string;
  state?: string | undefined;
  address: string;
  description?: string | undefined;
  amenities?: string[] | undefined;
  house_rules?: string | undefined;
}

export function saveDetails(id: string, v: DetailsInput) {
  return api(`${BASE}/${id}/details`, {
    method: "PUT",
    body: {
      title: v.title.trim(),
      property_type: toStayPropertyType(v.type),
      city: v.city.trim() || null,
      state: v.state?.trim() || null,
      country: "Nigeria",
      address: v.address.trim() || null,
      description: v.description?.trim() || null,
      amenity_codes: (v.amenities ?? []).map(amenityCode),
      house_rules: (v.house_rules ?? "").split("\n").map((r) => r.trim()).filter(Boolean),
    },
  });
}

export interface RoomsInput {
  room_types: RoomType[];
  fees: ExtraFee[];
  max_guests: number;
  min_nights: number;
}

export function saveRooms(id: string, v: RoomsInput) {
  return api(`${BASE}/${id}/rooms`, {
    method: "PUT",
    body: {
      room_types: v.room_types.map((r) => ({
        ...(r.id !== undefined ? { id: r.id } : {}),
        name: r.name.trim(),
        nightly_rate: r.nightly_rate,
        max_guests: r.max_guests,
        room_count: r.units,
      })),
      fees: v.fees.map((f) => ({
        fee_type: feeType(f),
        name: f.name.trim(),
        amount: f.amount,
        is_mandatory: f.mandatory ?? true,
      })),
      max_guests_per_booking: v.max_guests,
      minimum_nights: v.min_nights,
    },
  });
}

export function savePolicies(id: string, pay: PaymentTerms, cancel: CancellationPolicy, ci: CheckInDetails) {
  return api(`${BASE}/${id}/policies`, {
    method: "PUT",
    body: {
      allow_full_payment: pay.full_payment,
      allow_deposit: pay.deposit,
      allow_pay_on_arrival: pay.pay_on_arrival,
      deposit_percent: pay.deposit ? pay.deposit_percent ?? null : null,
      cancellation_allowed: cancel.allowed,
      free_cancellation_days: cancel.allowed ? cancel.free_until_days ?? 0 : null,
      refund_percentage: cancel.allowed ? cancel.refund_percent ?? 100 : null,
      check_in_method: ci.method,
      // Backend accepts 7–15 digits with an optional leading +, so drop spaces, dashes and brackets.
      arrival_contact_phone: ci.contact_phone?.replace(/[\s\-().]/g, "") || null,
      check_in_time: ci.check_in_time || null,
      check_out_time: ci.check_out_time || null,
      arrival_instructions: ci.instructions?.trim() || null,
    },
  });
}

export function saveAvailability(id: string, entries: AvailabilityEntry[]) {
  return api(`${BASE}/${id}/availability`, { method: "PUT", body: { entries } });
}

export function submitStayListing(id: string) {
  return api(`${BASE}/${id}/submit`, { method: "POST" });
}

// ---------- Images ----------

export async function listStayImages(id: string): Promise<Media[]> {
  const res = await api(`${BASE}/${id}/images`);
  return asList<StayImageDTO>(res, "images")
    .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    .map(toMedia);
}

/** multipart: files (repeated) + set_first_as_primary. */
export async function uploadStayImages(id: string, files: File[], setFirstAsPrimary: boolean) {
  const fd = new FormData();
  files.forEach((f) => fd.append("files", f));
  fd.append("set_first_as_primary", String(setFirstAsPrimary));
  return api(`${BASE}/${id}/images`, { form: fd });
}

export function patchStayImage(id: string, imageId: string, patch: { sort_order?: number; is_primary?: boolean }) {
  return api(`${BASE}/${id}/images/${imageId}`, { method: "PATCH", body: patch });
}

export function deleteStayImage(id: string, imageId: string) {
  return api(`${BASE}/${id}/images/${imageId}`, { method: "DELETE" });
}

// ---------- Progress ----------

export const PROGRESS_STEPS: { key: keyof Omit<ListingProgress, "last_completed_tab" | "next_tab">; label: string }[] = [
  { key: "details_completed", label: "Details" },
  { key: "rooms_completed", label: "Rooms & pricing" },
  { key: "policies_completed", label: "Payment & check-in rules" },
  { key: "availability_completed", label: "Availability" },
];

export const missingSteps = (p?: ListingProgress) => (p ? PROGRESS_STEPS.filter((s) => !p[s.key]).map((s) => s.label) : []);

// ---------- Wallet, bookings & dashboard summary ----------

/** GET /stay/partners/wallet (real response, 18 Nov 2026). */
export interface StayWallet {
  wallet_id: number;
  currency: string;
  kyc_status: string;
  pending_earnings: Num;
  available_earnings: Num;
  reserved_payout: Num;
  total_paid_out: Num;
  lifetime_earnings: Num;
  refund_liability: Num;
  payout_eligible: boolean;
}

interface Page<T> { items: T[]; total: number; page: number; size: number }

/** Fetch every page (100 per page) of a paginated Stay endpoint, up to maxPages. */
async function fetchAll<T>(path: string, maxPages = 10): Promise<T[]> {
  const out: T[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await api<Page<T>>(`${path}${path.includes("?") ? "&" : "?"}page=${page}&size=100`);
    const items = asList<T>(res, "items");
    out.push(...items);
    const total = typeof res?.total === "number" ? res.total : out.length;
    if (!items.length || out.length >= total) break;
  }
  return out;
}

export const getStayWallet = () => api<StayWallet>("/stay/partners/wallet");

// Booking and transaction items aren't documented yet (the lists were empty),
// so read the likely field names defensively.
type Loose = Record<string, unknown>;
const pick = (o: Loose, ...keys: string[]) => { for (const k of keys) if (o[k] !== undefined && o[k] !== null) return o[k]; return undefined; };
const dateOnly = (v: unknown) => (typeof v === "string" ? v.slice(0, 10) : "");

export async function getStaySummary(): Promise<Summary> {
  const [listingsRes, wallet, bookings, txns] = await Promise.all([
    api<Page<StayListingItemDTO>>(`${BASE}?page=1&size=100`),
    getStayWallet(),
    fetchAll<Loose>("/stay/partners/bookings").catch(() => [] as Loose[]),
    fetchAll<Loose>("/stay/partners/wallet/transactions", 5).catch(() => [] as Loose[]),
  ]);
  const listings = asList<StayListingItemDTO>(listingsRes, "items");
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + "01";

  // Bookings that hold a room: confirmed or checked in (see stay_bookings.py).
  const active = bookings.filter((b) => {
    const s = String(pick(b, "booking_status", "status") ?? "");
    return s ? s === "confirmed" || s === "checked_in" : true;
  });
  const checkIn = (b: Loose) => dateOnly(pick(b, "check_in", "check_in_date"));
  const checkOut = (b: Loose) => dateOnly(pick(b, "check_out", "check_out_date"));
  const unitsOf = (b: Loose) => Number(pick(b, "rooms", "room_count") ?? 1) || 1;

  const liveUnits = listings
    .filter((l) => l.status === "published")
    .reduce((n, l) => n + (l.total_room_inventory || 0), 0);
  const occupiedTonight = active
    .filter((b) => checkIn(b) && checkIn(b) <= today && (!checkOut(b) || checkOut(b) > today))
    .reduce((n, b) => n + unitsOf(b), 0);

  // Each paid booking posts one "booking_earning_pending" credit (the partner's share after
  // commission). Later ledger moves (pending → available, payouts) would double count.
  const earningsThisMonth = txns
    .filter((t) => dateOnly(pick(t, "created_at")) >= monthStart)
    .filter((t) => t["category"] === "booking_earning_pending" && t["direction"] === "credit")
    .reduce((n, t) => n + toNum(t["amount"] as Num), 0);

  return {
    total_listings: typeof listingsRes?.total === "number" ? listingsRes.total : listings.length,
    units_vacant_today: Math.max(0, liveUnits - occupiedTonight),
    upcoming_checkins: active.filter((b) => checkIn(b) >= today).length,
    earnings_this_month: earningsThisMonth,
    pending_payout_balance: toNum(wallet.available_earnings),
    pending_earnings: toNum(wallet.pending_earnings),
    lifetime_earnings: toNum(wallet.lifetime_earnings),
    payout_eligible: !!wallet.payout_eligible,
    kyc_status: wallet.kyc_status,
  };
}

export const summaryQuery = { queryKey: ["summary"], queryFn: getStaySummary };

// ---------- Bookings (serialize_booking in app/services/stay_bookings.py) ----------

export type StayBookingStatus = "pending_payment" | "confirmed" | "checked_in" | "completed" | "cancelled" | "expired" | "refunded";
export type StayPaymentStatus = "unpaid" | "partially_paid" | "paid" | "failed" | "refunded" | "partially_refunded" | "pay_on_arrival";

export interface StayBooking {
  id: number;
  booking_reference: string;
  tenant_user_id: number;
  partner_user_id: number;
  property_id: number;
  room_type_id: number;
  /** Inclusive check-in date, exclusive check-out date (YYYY-MM-DD). */
  check_in: string;
  check_out: string;
  guests: number;
  rooms: number;
  nights: number;
  nightly_rate: Num;
  accommodation_amount: Num;
  fees_amount: Num;
  total_amount: Num;
  amount_due_now: Num;
  amount_outstanding: Num;
  payment_option: "full_payment" | "deposit" | "pay_on_arrival";
  booking_status: StayBookingStatus;
  payment_status: StayPaymentStatus;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
}

export const listStayBookings = () => fetchAll<StayBooking>("/stay/partners/bookings");
export const bookingsQuery = { queryKey: ["bookings"], queryFn: listStayBookings };
export const completeStayBooking = (id: number) => api<StayBooking>(`/stay/partners/bookings/${id}/complete`, { method: "POST" });

/** The backend allows "complete" for confirmed / checked-in bookings once the check-out date is reached. */
export const canComplete = (b: StayBooking, today = new Date().toISOString().slice(0, 10)) =>
  (b.booking_status === "confirmed" || b.booking_status === "checked_in") && b.check_out <= today;

export const amount = (v: Num) => toNum(v);

// ---------- Ledger (GET /stay/partners/wallet/transactions) ----------

export type LedgerCategory =
  | "booking_earning_pending" | "booking_earning_available" | "commission_deduction" | "refund_reversal" | "refund_liability"
  | "payout_reservation" | "payout_release" | "payout_debit" | "commission_receivable" | "commission_collection";

export interface StayLedgerEntry {
  id: number;
  reference: string;
  category: LedgerCategory;
  direction: "credit" | "debit";
  amount: Num;
  booking_id: number | null;
  payout_id: number | null;
  description: string | null;
  created_at: string;
}

export const listStayLedger = () => fetchAll<StayLedgerEntry>("/stay/partners/wallet/transactions", 5);

export const LEDGER_LABEL: Record<LedgerCategory, string> = {
  booking_earning_pending: "Booking earning (pending)",
  booking_earning_available: "Earning released",
  commission_deduction: "Kiataka commission",
  refund_reversal: "Refund",
  refund_liability: "Refund owed to Kiataka",
  payout_reservation: "Payout requested",
  payout_release: "Payout returned",
  payout_debit: "Paid out",
  commission_receivable: "Commission due (pay on arrival)",
  commission_collection: "Commission collected",
};

// ---------- Payouts (serialize_payout in app/services/stay_payouts.py) ----------

export type StayPayoutStatus = "pending" | "approved" | "processing" | "paid" | "failed" | "rejected" | "cancelled";

export interface StayPayout {
  id: number;
  payout_reference: string;
  amount: Num;
  currency: string;
  status: StayPayoutStatus;
  bank_name: string;
  account_number_masked: string;
  account_name: string;
  transfer_reference: string | null;
  failure_reason: string | null;
  rejection_reason: string | null;
  requested_at: string;
  approved_at: string | null;
  paid_at: string | null;
  updated_at: string;
}

export const listStayPayouts = () => fetchAll<StayPayout>("/stay/partners/payouts", 5);
export const requestStayPayout = (amountNgn: number, bankAccountId: number) =>
  api<StayPayout>("/stay/partners/payouts/request", { body: { amount: amountNgn, bank_account_id: bankAccountId } });
export const cancelStayPayout = (id: number) => api<StayPayout>(`/stay/partners/payouts/${id}/cancel`, { method: "POST" });

/** Default minimum from StayCommissionConfig; the backend's error message wins if it differs. */
export const MIN_PAYOUT = 1000;

// ---------- KYC (POST /stay/partners/kyc) ----------

export interface StayKycInput {
  legal_first_name: string;
  legal_last_name: string;
  /** YYYY-MM-DD */
  date_of_birth: string;
  residential_address: string;
  business_address?: string | null;
  business_phone?: string | null;
  /** 11 digits */
  nin: string;
  /** 11 digits */
  bvn: string;
}

export const submitStayKyc = (v: StayKycInput) =>
  api<{ status: string; kyc_status: string; nin_last4: string | null; bvn_last4: string | null }>("/stay/partners/kyc", {
    body: {
      legal_first_name: v.legal_first_name.trim(),
      legal_last_name: v.legal_last_name.trim(),
      date_of_birth: v.date_of_birth,
      residential_address: v.residential_address.trim(),
      business_address: v.business_address?.trim() || null,
      business_phone: v.business_phone?.replace(/[\s\-().]/g, "") || null,
      nin: v.nin.trim(),
      bvn: v.bvn.trim(),
    },
  });

export const walletQuery = { queryKey: ["wallet"], queryFn: getStayWallet };
