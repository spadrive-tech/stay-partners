import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { describeListing } from "@/lib/describe.functions";
import type { ListingInput } from "./ListingForm";

export function DescriptionAssistant({ values, onUse }: { values: ListingInput & { type: "hotel_room" | "shortlet" }; onUse: (text: string) => void }) {
  const run = useServerFn(describeListing);
  const [open, setOpen] = useState(false);
  const [tone, setTone] = useState("warm and welcoming");
  const [notes, setNotes] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);

  async function generate() {
    if (!values.title.trim()) {
      toast.error("Add a title first so the assistant knows what to write about.");
      return;
    }
    setLoading(true);
    try {
      const r = await run({
        data: {
          title: values.title,
          type: values.type,
          city: values.city || undefined,
          address: values.address || undefined,
          nightly_rate: values.nightly_rate || undefined,
          units: values.units || undefined,
          amenities: values.amenities,
          house_rules: values.house_rules || undefined,
          notes: notes || undefined,
          tone,
        },
      });
      if (r.error) toast.error(r.error);
      else setDraft(r.text);
    } catch {
      toast.error("Couldn't generate a description right now.");
    } finally {
      setLoading(false);
    }
  }

  if (!open)
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Sparkles className="h-4 w-4" /> Write with AI
      </Button>
    );

  return (
    <div className="space-y-4 rounded-lg border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <Sparkles className="h-4 w-4" /> AI description assistant
      </div>
      <p className="text-xs text-muted-foreground">Uses the title, type, city, amenities and house rules you've filled in above.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Tone</Label>
          <Select value={tone} onValueChange={setTone}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="warm and welcoming">Warm & welcoming</SelectItem>
              <SelectItem value="luxurious and refined">Luxurious</SelectItem>
              <SelectItem value="professional, suited to business travellers">Business</SelectItem>
              <SelectItem value="short and to the point">Short & simple</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label>Anything else guests should know? (optional)</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. 5 minutes from Lekki toll gate, newly renovated, rooftop lounge" />
        </div>
      </div>
      <Button type="button" onClick={generate} disabled={loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
        {draft ? "Regenerate" : "Generate description"}
      </Button>
      {draft && (
        <div className="space-y-2">
          <Label>Review and edit</Label>
          <Textarea rows={8} value={draft} onChange={(e) => setDraft(e.target.value)} />
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={() => { onUse(draft); setOpen(false); setDraft(""); toast.success("Description added — remember to save."); }}>
              Use this description
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  );
}
