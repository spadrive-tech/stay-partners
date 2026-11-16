import { useState } from "react";
import { toast } from "sonner";
import { Copy, MessageCircle, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { type Listing } from "@/lib/api";

// Public booking link opened by the Kiataka tenant app (deep link). Confirm path with the tenant app team.
export const TENANT_APP_BASE = "https://usekiataka.com/stays";

export function listingShareUrl(l: Listing) {
  if (l.public_url) {
    try { const url = new URL(l.public_url); if (url.protocol === "https:") return url.href; } catch { /* invalid public URL */ }
  }
  if (l.type === "yearly_rental") return null;
  return `${TENANT_APP_BASE}/${l.id}`;
}

export function ShareListing({ listing }: { listing: Listing }) {
  const [open, setOpen] = useState(false);
  const url = listingShareUrl(listing);
  const live = listing.status === "live";
  const text = `${listing.type === "yearly_rental" ? "View" : "Book"} ${listing.title} on Kiataka: ${url ?? ""}`;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually");
    }
  };
  const nativeShare = async () => {
    if (!url) return;
    try {
      await navigator.share({ title: listing.title, text: `Book ${listing.title} on Kiataka`, url });
    } catch {
      /* cancelled */
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Share2 className="h-4 w-4" /> Share
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share this listing</DialogTitle>
          <DialogDescription>
            {listing.type === "yearly_rental" ? "Share your apartment with prospective tenants." : "Share your hotel or shortlet with prospective guests."}
          </DialogDescription>
        </DialogHeader>
        {!live && (
          <p className="rounded-lg bg-warning/10 p-3 text-sm text-warning-foreground">
            This listing isn't live yet. Guests can only book once Kiataka approves it.
          </p>
        )}
        {!url ? <p className="text-sm text-muted-foreground">A tenant-app link hasn't been provided for this apartment yet.</p> : <><div className="flex gap-2">
          <Input readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
          <Button onClick={copy}>
            <Copy className="h-4 w-4" /> Copy
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <a href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
          </Button>
          {typeof navigator !== "undefined" && "share" in navigator && (
            <Button variant="outline" onClick={nativeShare}>
              <Share2 className="h-4 w-4" /> More options
            </Button>
          )}
        </div></>}
      </DialogContent>
    </Dialog>
  );
}
