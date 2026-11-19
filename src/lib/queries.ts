import { api, getBanks, getStayBankAccount, type Partner, type StayOnboarding } from "./api";

export const meQuery = { queryKey: ["me"], queryFn: () => api<Partner>("/stays/partner/me") };

export const onboardingQuery = {
  queryKey: ["onboarding"],
  queryFn: () => api<StayOnboarding>("/stay/partners/onboarding"),
};

export const banksQuery = { queryKey: ["banks"], queryFn: getBanks, staleTime: 24 * 60 * 60 * 1000 };

export const bankAccountQuery = { queryKey: ["bank-account"], queryFn: getStayBankAccount };