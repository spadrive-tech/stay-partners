import { DEMO_TOKEN, demoApi } from "./demo";
export const API_BASE = "https://api.usekiataka.com";
const TOKEN_KEY = "kiataka_stays_partner_token";
const PARTNER_KEY = "kiataka_stays_partner";

let memToken: string | null = null;
let partnerRaw: string | null = null;
let partnerCache: Partner | null = null;
const listeners = new Set<() => void>();

export const session = {
  getToken(): string | null {
    if (memToken) return memToken;
    if (typeof window === "undefined") return null;
    memToken = window.localStorage.getItem(TOKEN_KEY);
    return memToken;
  },
  getPartner(): Partner | null {
    if (typeof window === "undefined") return null;
    try {
      const raw = window.localStorage.getItem(PARTNER_KEY);
      if (raw !== partnerRaw) {
        partnerRaw = raw;
        partnerCache = raw ? (JSON.parse(raw) as Partner) : null;
      }
      return partnerCache;
    } catch {
      return null;
    }
  },
  set(token: string, partner?: Partner | null) {
    memToken = token;
    window.localStorage.setItem(TOKEN_KEY, token);
    if (partner) window.localStorage.setItem(PARTNER_KEY, JSON.stringify(partner));
    listeners.forEach((l) => l());
  },
  setPartner(partner: Partner) {
    window.localStorage.setItem(PARTNER_KEY, JSON.stringify(partner));
    listeners.forEach((l) => l());
  },
  clear() {
    memToken = null;
    window.localStorage.removeItem(TOKEN_KEY);
    window.localStorage.removeItem(PARTNER_KEY);
    listeners.forEach((l) => l());
  },
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

// ---------- Auth (shared Kiataka auth service) ----------
// Web flow: the backend sets the refresh token as an HttpOnly cookie on login and
// reads it back on /auth/get-refresh-token, so those calls must send cookies.
// The access token (short-lived JWT) is kept in localStorage as before.

export const PARTNER_ROLE = "partner";

export interface LoginResponse {
  access_token: string;
  token_type?: string;
  role?: string;
  status?: string;
  profile_completed?: boolean;
}

const NETWORK_ERROR = "We couldn't reach Kiataka right now. Check your connection and try again.";

async function parse(res: Response): Promise<unknown> {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text;
  }
}

function errorMessage(data: unknown, status: number): string {
  if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    const d = o["detail"];
    if (typeof d === "string") return d;
    if (Array.isArray(d) && d[0] && typeof d[0] === "object" && "msg" in d[0]) return String((d[0] as { msg: unknown }).msg);
    if (d && typeof d === "object" && "message" in d) return String((d as { message: unknown }).message);
    if ("message" in o || "error" in o) return String(o["message"] ?? o["error"]);
  }
  if (typeof data === "string" && data && data.length < 200) return data;
  return `Request failed (${status})`;
}

/** Calls an /auth endpoint with cookies included. Never triggers a refresh. */
async function authFetch<T>(path: string, body: unknown, token?: string | null): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json", "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body ?? {}),
      credentials: "include",
    });
  } catch {
    throw new ApiError(NETWORK_ERROR, 0);
  }
  const data = await parse(res);
  if (!res.ok) throw new ApiError(errorMessage(data, res.status), res.status);
  return data as T;
}

/** Seconds until the JWT expires, or null if it can't be read. */
function secondsLeft(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp - Date.now() / 1000 : null;
  } catch {
    return null;
  }
}

let refreshing: Promise<string | null> | null = null;

/**
 * Gets a new access token using the refresh cookie. Concurrent callers share one
 * request. Resolves to null (and clears the session) if the refresh is rejected.
 */
export function refreshAccessToken(): Promise<string | null> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await authFetch<{ access_token?: string }>("/auth/get-refresh-token", {});
        if (!res?.access_token) throw new ApiError("No access token in refresh response", 401);
        session.set(res.access_token);
        return res.access_token;
      } catch (err) {
        // A network failure shouldn't log the partner out; a rejected refresh should.
        if (err instanceof ApiError && err.status !== 0) session.clear();
        return null;
      } finally {
        refreshing = null;
      }
    })();
  }
  return refreshing;
}

export async function login(email: string, password: string): Promise<LoginResponse> {
  const res = await authFetch<LoginResponse>("/auth/email-login", { email, password, is_mobile: false });
  if (!res?.access_token) throw new ApiError("Sign-in failed. Please try again.", 0);
  if (res.role && res.role !== PARTNER_ROLE) {
    // Valid Kiataka account, wrong app: drop the refresh cookie the login just set.
    await authFetch("/auth/logout", {}, res.access_token).catch(() => undefined);
    throw new ApiError("This account isn't a Kiataka Stays partner account.", 403);
  }
  session.set(res.access_token, typeof res.profile_completed === "boolean" ? { profile_complete: res.profile_completed } : {});
  return res;
}

export async function logout(): Promise<void> {
  const token = session.getToken();
  if (token && token !== DEMO_TOKEN) {
    await authFetch("/auth/logout", {}, token).catch(() => undefined);
  }
  session.clear();
}

// ---------- Invite signup (approved Stay partners) ----------

export const STAY_PARTNER_TYPE = "stay_partner";

export interface InvitePreview {
  first_name?: string | null;
  last_name?: string | null;
  email: string;
  invite_date?: string | null;
  invite_status: "pending" | "accepted" | "revoked" | "expired" | string;
  partner_type?: string | null;
}

export interface PartnerSignupInput {
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  password: string;
}

export const getInvitePreview = (token: string) =>
  api<InvitePreview>(`/auth/invites-preview?token=${encodeURIComponent(token)}`, { auth: false });

/** Registers the invited partner. The backend then emails a verification code. */
export async function partnerSignup(token: string, input: PartnerSignupInput): Promise<{ userId: number | null }> {
  const qs = new URLSearchParams({ partner_invite: token, partner_type: STAY_PARTNER_TYPE });
  const res = await authFetch<Record<string, unknown> | null>(`/auth/signup?${qs.toString()}`, {
    ...input,
    role: PARTNER_ROLE,
  });
  // Tolerate { user_id }, { id }, { user: { id } } or a { data: ... } envelope.
  const r = (res && typeof res === "object" && "data" in res && res["data"] && typeof res["data"] === "object"
    ? (res["data"] as Record<string, unknown>)
    : res) ?? {};
  const user = r["user"] && typeof r["user"] === "object" ? (r["user"] as Record<string, unknown>) : {};
  const raw = r["user_id"] ?? r["id"] ?? user["id"];
  const userId = raw === undefined || raw === null || raw === "" ? null : Number(raw);
  return { userId: Number.isFinite(userId) ? userId : null };
}

/** The backend accepts exactly one of user_id or email: prefer user_id, fall back to email. */
function otpTarget(email?: string, userId?: number): { user_id: number } | { email: string } | Record<string, never> {
  if (userId !== undefined && Number.isFinite(userId)) return { user_id: userId };
  if (email) return { email };
  return {};
}

/**
 * Confirms the signup email. If the backend also signs the partner in
 * (returns an access token), the session is started and true is returned.
 */
export async function verifyEmailOtp(code: string, email?: string, userId?: number): Promise<boolean> {
  const res = await authFetch<Partial<LoginResponse> | null>("/auth/verify-otp", {
    ...otpTarget(email, userId),
    code,
    purpose: "verify_email",
  });
  if (res?.access_token && (!res.role || res.role === PARTNER_ROLE)) {
    session.set(res.access_token, typeof res.profile_completed === "boolean" ? { profile_complete: res.profile_completed } : {});
    return true;
  }
  return false;
}

export const resendEmailOtp = (email?: string, userId?: number) =>
  authFetch("/auth/resend-otp", { ...otpTarget(email, userId), purpose: "verify_email" });

function redirectToLogin() {
  if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
    window.location.assign("/login");
  }
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown; form?: FormData; auth?: boolean; keepSessionOn401?: boolean } = {},
): Promise<T> {
  let token = opts.auth === false ? null : session.getToken();
  if (token === DEMO_TOKEN) {
    return (await demoApi(path, opts.method ?? (opts.body !== undefined || opts.form ? "POST" : "GET"), opts.body, opts.form)) as T;
  }

  // Refresh just before expiry so requests don't bounce off a 401 first.
  if (token) {
    const left = secondsLeft(token);
    if (left !== null && left < 30) token = (await refreshAccessToken()) ?? token;
  }

  const send = async (bearer: string | null): Promise<Response> => {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (bearer) headers["Authorization"] = `Bearer ${bearer}`;
    let body: BodyInit | null = null;
    if (opts.form) body = opts.form;
    else if (opts.body !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(opts.body);
    }
    try {
      return await fetch(`${API_BASE}${path}`, {
        method: opts.method ?? (body ? "POST" : "GET"),
        headers,
        body,
      });
    } catch {
      throw new ApiError(NETWORK_ERROR, 0);
    }
  };

  let res = await send(token);

  // Access token expired or revoked: refresh once and retry.
  if (res.status === 401 && token && !opts.keepSessionOn401) {
    const fresh = await refreshAccessToken();
    if (fresh) {
      res = await send(fresh);
    } else if (!session.getToken()) {
      redirectToLogin();
    }
    if (res.status === 401 && fresh) {
      session.clear();
      redirectToLogin();
    }
  }

  const data = await parse(res);
  if (!res.ok) throw new ApiError(errorMessage(data, res.status), res.status);
  // unwrap { data: ... } envelopes
  if (data && typeof data === "object" && "data" in data && Object.keys(data).length <= 3) {
    return (data as { data: T }).data;
  }
  return data as T;
}

// ---------- Types ----------
export type ApplicationStatus = "approved" | "under_review" | "rejected";
export interface PayoutAccount {
  bank_name: string;
  account_number: string;
  account_name: string;
}
export interface Partner {
  business_type?: "hotel" | "shortlet_operator" | "individual_host" | "house_agent";
  id?: string;
  business_name?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  cac_number?: string;
  application_status?: ApplicationStatus;
  status?: string;
  payout_account?: PayoutAccount | null;
  profile_complete?: boolean;
}
export interface Summary {
  total_listings: number;
  units_vacant_today: number;
  upcoming_checkins: number;
  earnings_this_month: number;
  pending_payout_balance: number;
}
export type ListingStatus = "draft" | "pending_review" | "live" | "suspended";
export interface Media {
  id: string;
  url: string;
  type: "photo" | "video";
  is_cover?: boolean;
  position?: number;
  room_type?: string;
}
export interface Listing {
  id: string;
  title: string;
  type: "hotel_room" | "shortlet" | "yearly_rental";
  annual_rent?: number;
  public_url?: string;
  rental_details?: RentalDetails;
  description?: string;
  city?: string;
  address?: string;
  nightly_rate: number;
  units: number;
  amenities?: string[];
  house_rules?: string;
  status: ListingStatus;
  cover_url?: string;
  media?: Media[];
  suspension_reason?: string;
  max_guests?: number;
  min_nights?: number;
  extra_fees?: ExtraFee[];
  payment_terms?: PaymentTerms;
  cancellation?: CancellationPolicy;
  check_in?: CheckInDetails;
  room_types?: RoomType[];
  apartment_type?: string;
}
export interface ExtraFee { name: string; amount: number; charge: "per_stay" | "per_night"; refundable?: boolean }
export interface RentalDetails {
  availability: "available" | "occupied";
  available_from: string;
  bathrooms: number;
  furnished: boolean;
  agent_name: string;
  agent_phone: string;
  agent_email: string;
  applications_enabled: boolean;
  inspections_enabled: boolean;
  contact_enabled: boolean;
  inspection_notes: string;
  fees: { name: string; amount: number; refundable: boolean }[];
}
export const listingTypeLabel = (type: Listing["type"]) => type === "hotel_room" ? "Hotel room" : type === "yearly_rental" ? "Yearly rental" : "Shortlet";
export const listingPrice = (listing: Listing) => formatNaira(listing.type === "yearly_rental" ? listing.annual_rent : listing.nightly_rate);
export interface PaymentTerms { full_payment: boolean; deposit: boolean; deposit_percent?: number; pay_on_arrival: boolean }
export interface CancellationPolicy { allowed: boolean; free_until_days?: number; refund_percent?: number }
export interface CheckInDetails {
  method: "front_desk" | "meet_host" | "self_check_in" | "key_collection";
  instructions?: string;
  contact_phone?: string;
  check_in_time?: string;
  check_out_time?: string;
}
export interface RoomType { name: string; nightly_rate: number; max_guests: number; units: number }
export type BookingStatus = "pending" | "confirmed" | "checked_in" | "completed" | "cancelled";
export interface Booking {
  request_type?: "booking" | "rental_application" | "inspection";
  listing_id?: string;
  contact_phone?: string;
  contact_email?: string;
  message?: string;
  inspection_at?: string;
  id: string;
  reference: string;
  guest_name: string;
  listing_title: string;
  check_in: string;
  check_out: string;
  amount: number;
  status: BookingStatus;
  tenant_id?: string;
}
export interface Earning {
  booking_id: string;
  reference?: string;
  listing_title?: string;
  guest_name?: string;
  gross: number;
  commission: number;
  net: number;
  date?: string;
}
export interface Payout {
  id: string;
  amount: number;
  status: "requested" | "approved" | "paid" | "rejected";
  created_at: string;
}
export type DayState = "available" | "blocked" | "booked";
export interface AvailabilityDay {
  date: string;
  status: DayState;
  units_available?: number;
}

export function asList<T>(v: unknown, key?: string): T[] {
  if (Array.isArray(v)) return v as T[];
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    for (const k of [key, "items", "results", "data"].filter(Boolean) as string[]) {
      if (Array.isArray(o[k])) return o[k] as T[];
    }
  }
  return [];
}

// ---------- Formatting ----------
const naira = new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 });
export const formatNaira = (n: number | undefined | null) => naira.format(Number(n ?? 0));
export const formatDate = (d: string | Date | undefined) =>
  d ? new Date(d).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }) : "—";

export const SUPPORT_EMAIL = "support@usekiataka.com";
export const AMENITIES = [
  "Wi-Fi",
  "Air conditioning",
  "24/7 power",
  "Parking",
  "Swimming pool",
  "Gym",
  "Kitchen",
  "Smart TV",
  "Security",
  "Housekeeping",
  "Breakfast",
  "Workspace",
];

// Standardised names so every partner lists the same way
export const APARTMENT_TYPES = [
  "Self-contained (studio)",
  "1 bedroom",
  "2 bedroom",
  "3 bedroom",
  "4 bedroom",
  "Duplex",
  "Penthouse",
];
export const HOTEL_ROOM_TYPES = [
  "Standard room",
  "Deluxe room",
  "Twin room",
  "Family room",
  "Executive suite",
  "Luxury suite",
  "Presidential suite",
];

export type ApplicantStatus = "pending" | "approved" | "declined";
export interface Applicant {
  id: string;
  name: string;
  photo_url?: string;
  occupation?: string;
  listing_id?: string;
  listing_title: string;
  check_in: string;
  check_out: string;
  guests?: number;
  message?: string;
  rental_score: number; // out of 850
  verification: { id_verified: boolean; phone_verified: boolean; employment_verified: boolean };
  history: { past_stays: number; average_rating?: number; incidents: number; reviews?: { host: string; rating: number; comment: string }[] };
  status: ApplicantStatus;
}
export function scoreBand(score: number) {
  if (score >= 740) return { label: "Excellent", tone: "text-success" };
  if (score >= 670) return { label: "Good", tone: "text-primary" };
  if (score >= 580) return { label: "Fair", tone: "text-warning-foreground" };
  return { label: "Poor", tone: "text-destructive" };
}

/** Map a /landlord/tenants/{id} response onto Applicant, tolerating common field names. */
export function toApplicant(raw: unknown): Applicant {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r: any = raw ?? {};
  const v = r.verification ?? r.verifications ?? {};
  const h = r.history ?? r.rental_history ?? {};
  const name = r.name ?? r.full_name ?? [r.first_name, r.last_name].filter(Boolean).join(" ");
  return {
    id: String(r.id ?? r.tenant_id ?? ""),
    name: name || "Guest",
    photo_url: r.photo_url ?? r.avatar ?? r.profile_photo ?? undefined,
    occupation: r.occupation ?? r.employer ?? undefined,
    listing_title: r.listing_title ?? "",
    check_in: r.check_in ?? "",
    check_out: r.check_out ?? "",
    guests: r.guests,
    message: r.message,
    rental_score: Number(r.rental_score ?? r.score ?? r.credit_score ?? 0),
    verification: {
      id_verified: !!(v.id_verified ?? v.identity ?? r.id_verified ?? r.is_verified),
      phone_verified: !!(v.phone_verified ?? v.phone ?? r.phone_verified),
      employment_verified: !!(v.employment_verified ?? v.employment ?? r.employment_verified),
    },
    history: {
      past_stays: Number(h.past_stays ?? h.total_rentals ?? r.past_stays ?? 0),
      average_rating: h.average_rating ?? r.average_rating ?? r.rating,
      incidents: Number(h.incidents ?? r.incidents ?? 0),
      reviews: h.reviews ?? r.reviews ?? [],
    },
    status: "pending",
  };
}