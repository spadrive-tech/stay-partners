import { api, getBanks, getStayBankAccount, getUserProfile, type StayOnboarding } from "./api";

/** The signed-in partner's account (GET /user/get-profile-info). */
export const profileQuery = { queryKey: ["profile"], queryFn: getUserProfile };

export const onboardingQuery = {
  queryKey: ["onboarding"],
  queryFn: () => api<StayOnboarding>("/stay/partners/onboarding"),
};

export const banksQuery = { queryKey: ["banks"], queryFn: getBanks, staleTime: 24 * 60 * 60 * 1000 };

export const bankAccountQuery = { queryKey: ["bank-account"], queryFn: getStayBankAccount };
