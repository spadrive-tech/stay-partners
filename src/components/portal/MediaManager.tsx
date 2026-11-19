import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GripVertical, Loader2, Star, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Media } from "@/lib/api";
import { deleteStayImage, listStayImages, patchStayImage, uploadStayImages } from "@/lib/stay";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 15;

/**
 * Listing photos (images only):
 * POST   /stay/partners/listings/{id}/images            upload (files[], set_first_as_primary)
 * PATCH  /stay/partners/listings/{id}/images/{imageId}  { is_primary } or { sort_order }
 * DELETE /stay/partners/listings/{id}/images/{imageId}
 */
export function MediaManager({ listingId, media }: { listingId: string; media: Media[]; roomTypes?: string[] | undefined }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Media[]>(() => [...media].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["listing", listingId] });
    qc.invalidateQueries({ queryKey: ["listings"] });
  };

  async function reload() {
    try {
      setItems(await listStayImages(listingId));
    } catch {
      /* keep what we have; the listing refetch will catch up */
    }
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (list.length < files.length) toast.error("Only photos can be uploaded.");
    if (!list.length) return;
    if (items.length + list.length > MAX_PHOTOS) { toast.error(`Up to ${MAX_PHOTOS} photos per listing.`); return; }
    setUploading(true);
    try {
      await uploadStayImages(listingId, list, items.length === 0);
      await reload();
      toast.success(list.length === 1 ? "Photo uploaded" : `${list.length} photos uploaded`);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  async function saveOrder(next: Media[]) {
    const prev = items;
    setItems(next.map((m, i) => ({ ...m, position: i })));
    try {
      // Only send the photos whose position actually changed.
      await Promise.all(
        next.map((m, i) => (prev.findIndex((p) => p.id === m.id) !== i ? patchStayImage(listingId, m.id, { sort_order: i }) : null)),
      );
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save order");
      setItems(prev);
    }
  }

  async function setCover(id: string) {
    try {
      await patchStayImage(listingId, id, { is_primary: true });
      setItems((p) => p.map((m) => ({ ...m, is_cover: m.id === id })));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't set cover");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this photo?")) return;
    try {
      await deleteStayImage(listingId, id);
      setItems((p) => p.filter((m) => m.id !== id));
      await reload();
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete");
    }
  }

  return (
    <div className="space-y-8">
      <input ref={input} type="file" multiple accept="image/*" className="hidden" onChange={(e) => upload(e.target.files)} />
      <section>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {items.length}/{MAX_PHOTOS} photos · drag to reorder
          </p>
          <Button onClick={() => input.current?.click()} disabled={uploading || items.length >= MAX_PHOTOS}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload photos
          </Button>
        </div>
        {items.length === 0 ? (
          <button
            onClick={() => input.current?.click()}
            disabled={uploading}
            className="mt-4 flex w-full flex-col items-center rounded-xl border-2 border-dashed py-10 text-sm text-muted-foreground hover:border-primary hover:text-primary"
          >
            {uploading ? <Loader2 className="mb-2 h-6 w-6 animate-spin" /> : <Upload className="mb-2 h-6 w-6" />} Add your first photos — the first one becomes your cover.
          </button>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {items.map((m, i) => (
              <div
                key={m.id}
                draggable
                onDragStart={() => setDragIdx(i)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => {
                  if (dragIdx === null || dragIdx === i) return;
                  const next = [...items];
                  const [moved] = next.splice(dragIdx, 1);
                  if (moved) next.splice(i, 0, moved);
                  setDragIdx(null);
                  saveOrder(next);
                }}
                className={cn("group relative aspect-square cursor-grab overflow-hidden rounded-lg border bg-muted", dragIdx === i && "opacity-50", m.is_cover && "ring-2 ring-primary")}
              >
                <img src={m.url} alt="" className="h-full w-full object-cover" />
                {m.is_cover && <span className="absolute left-2 top-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">COVER</span>}
                <GripVertical className="absolute right-2 top-2 h-4 w-4 text-primary-foreground opacity-0 drop-shadow group-hover:opacity-100" />
                <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-foreground/60 p-2 opacity-0 transition group-hover:opacity-100">
                  {!m.is_cover && (
                    <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => setCover(m.id)} title="Set as cover">
                      <Star className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => remove(m.id)} title="Delete">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
