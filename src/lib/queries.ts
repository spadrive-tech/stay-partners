import { api, type Partner } from "./api";

export const meQuery = { queryKey: ["me"], queryFn: () => api<Partner>("/stays/partner/me") };
