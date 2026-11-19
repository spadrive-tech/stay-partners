import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, ChevronsUpDown, Landmark, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { ErrorState, LoadingState } from "@/components/portal/shared";
import { replaceStayBankAccount, verifyStayBankAccount, type BankOption, type PayoutAccount, type StayBankAccount } from "@/lib/api";
import { bankAccountQuery, banksQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

/**
 * Payout bank account for Stay partners.
 * Shows the saved account; otherwise (or on "Change") lets the partner pick a bank,
 * enter the 10-digit account number, and verify it. Verification saves the account
 * and returns the account name from the bank.
 *
 * `initial` is kept for compatibility with older callers and is no longer used:
 * the saved account is loaded from GET /stay/partners/bank-account.
 */
export function PayoutAccountForm({
  onSaved,
  note,
}: {
  initial?: PayoutAccount | null | undefined;
  onSaved?: (account: StayBankAccount | null) => void;
  note?: string;
}) {
  const qc = useQueryClient();
  const saved = useQuery(bankAccountQuery);
  const [editing, setEditing] = useState(false);

  if (saved.isLoading) return <LoadingState label="Loading your bank account…" />;
  if (saved.error) return <ErrorState error={saved.error} onRetry={() => saved.refetch()} />;

  const account = saved.data ?? null;

  if (account && !editing) {
    return (
      <div className="space-y-4">
        <SavedAccount account={account} />
        {note && <p className="text-xs text-muted-foreground">{note}</p>}
        <Button type="button" variant="outline" onClick={() => setEditing(true)}>
          Change bank account
        </Button>
      </div>
    );
  }

  return (
    <BankAccountEditor
      replacing={!!account}
      note={note}
      onCancel={account ? () => setEditing(false) : undefined}
      onSaved={(a) => {
        qc.setQueryData(bankAccountQuery.queryKey, a);
        qc.invalidateQueries({ queryKey: bankAccountQuery.queryKey });
        qc.invalidateQueries({ queryKey: ["onboarding"] });
        setEditing(false);
        onSaved?.(a);
      }}
    />
  );
}

function SavedAccount({ account }: { account: StayBankAccount }) {
  const verified = account.verification_status === "verified";
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-muted/40 p-4">
      <Landmark className="mt-0.5 h-5 w-5 text-muted-foreground" />
      <div className="text-sm">
        <div className="font-medium">{account.account_name}</div>
        <div className="text-muted-foreground">
          {account.bank_name} · {account.account_number_masked}
        </div>
        <div className={cn("mt-1 text-xs font-medium", verified ? "text-success" : "text-warning")}>
          {verified ? "✓ Verified" : `Verification ${account.verification_status}`}
        </div>
      </div>
    </div>
  );
}

function BankAccountEditor({
  replacing,
  note,
  onCancel,
  onSaved,
}: {
  replacing: boolean;
  note?: string | undefined;
  onCancel?: (() => void) | undefined;
  onSaved: (account: StayBankAccount | null) => void;
}) {
  const [bank, setBank] = useState<BankOption | null>(null);
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!bank) { toast.error("Choose your bank."); return; }
    if (!/^\d{10}$/.test(accountNumber)) { toast.error("Account number must be 10 digits (NUBAN)."); return; }
    setLoading(true);
    try {
      const input = { bank_code: bank.bankcode, bank_name: bank.bankname, account_number: accountNumber };
      const account = replacing ? await replaceStayBankAccount(input) : await verifyStayBankAccount(input);
      if (account?.account_name) setAccountName(account.account_name);
      toast.success(account?.account_name ? `Bank account verified: ${account.account_name}` : "Bank account saved");
      onSaved(account);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't verify this account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2 sm:col-span-2">
        <Label>Bank name</Label>
        <BankPicker value={bank} onChange={(b) => { setBank(b); setAccountName(""); }} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="account_number">Account number</Label>
        <Input
          id="account_number"
          required
          inputMode="numeric"
          maxLength={10}
          value={accountNumber}
          onChange={(e) => { setAccountNumber(e.target.value.replace(/\D/g, "")); setAccountName(""); }}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="account_name">Account name</Label>
        <Input
          id="account_name"
          readOnly
          aria-readonly
          value={accountName}
          placeholder="Confirmed by your bank"
          className="bg-muted text-muted-foreground"
        />
      </div>
      {note && <p className="text-xs text-muted-foreground sm:col-span-2">{note}</p>}
      <div className="flex gap-3 sm:col-span-2">
        <Button type="submit" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} {loading ? "Verifying…" : "Verify & save"}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}

function BankPicker({ value, onChange }: { value: BankOption | null; onChange: (b: BankOption) => void }) {
  const banks = useQuery(banksQuery);
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-1 text-left text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm"
        >
          <span className={cn("truncate", !value && "text-muted-foreground")}>
            {value ? value.bankname : banks.isLoading ? "Loading banks…" : "Select your bank"}
          </span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
        <Command>
          <CommandInput placeholder="Search banks…" />
          <CommandList>
            {banks.isLoading ? (
              <div className="py-6 text-center text-sm text-muted-foreground">Loading banks…</div>
            ) : banks.error ? (
              <div className="space-y-2 py-6 text-center text-sm">
                <p className="text-muted-foreground">Couldn't load banks.</p>
                <Button type="button" size="sm" variant="outline" onClick={() => banks.refetch()}>Try again</Button>
              </div>
            ) : (
              <>
                <CommandEmpty>No bank found.</CommandEmpty>
                <CommandGroup>
                  {banks.data?.map((b) => (
                    <CommandItem
                      key={b.bankcode}
                      value={`${b.bankname} ${b.bankcode}`}
                      onSelect={() => { onChange(b); setOpen(false); }}
                    >
                      <Check className={cn("h-4 w-4", value?.bankcode === b.bankcode ? "opacity-100" : "opacity-0")} />
                      {b.bankname}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
