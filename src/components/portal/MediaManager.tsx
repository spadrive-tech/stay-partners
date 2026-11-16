import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { GripVertical, Loader2, Star, Trash2, Upload, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, type Media } from "@/lib/api";
import { cn } from "@/lib/utils";

const MAX_PHOTOS = 15;
const MAX_VIDEOS = 3;
const GENERAL = "__general__";

export function MediaManager({ listingId, media, roomTypes }: { listingId: string; media: Media[]; roomTypes?: string[] | undefined }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<Media[]>(() => [...media].sort((a, b) => (a.position ?? 0) - (b.position ?? 0)));
  const [uploading, setUploading] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [uploadTarget, setUploadTarget] = useState<string>(GENERAL);
  const base = `/stays/partner/listings/${listingId}/media`;
  const refresh = () => qc.invalidateQueries({ queryKey: ["listing", listingId] });

  const grouped = roomTypes?.length
    ? [GENERAL, ...roomTypes].map((rt) => ({
        key: rt,
        label: rt === GENERAL ? "Whole property" : rt,
        items: items.filter((m) => (rt === GENERAL ? !m.room_type : m.room_type === rt)),
      }))
    : [{ key: GENERAL, label: "", items }];

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const list = Array.from(files);
    const scope = items.filter((m) => (uploadTarget === GENERAL ? !m.room_type : m.room_type === uploadTarget));
    const photos = scope.filter((m) => m.type === "photo").length;
    const videos = scope.filter((m) => m.type === "video").length;
    const newPhotos = list.filter((f) => f.type.startsWith("image/")).length;
    const newVideos = list.filter((f) => f.type.startsWith("video/")).length;
    if (photos + newPhotos > MAX_PHOTOS) { toast.error(`Up to ${MAX_PHOTOS} photos per section.`); return; }
    if (videos + newVideos > MAX_VIDEOS) { toast.error(`Up to ${MAX_VIDEOS} videos per section.`); return; }
    const fd = new FormData();
    list.forEach((f) => fd.append("files[]", f));
    if (uploadTarget !== GENERAL) fd.append("room_type", uploadTarget);
    setUploading(true);
    try {
      const res = await api<Media[] | { media: Media[] }>(base, { form: fd });
      const added = Array.isArray(res) ? res : (res?.media ?? []);
      setItems((p) => [...p, ...added]);
      toast.success("Media uploaded");
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  }

  async function saveOrder(next: Media[]) {
    setItems(next);
    try {
      await api(`${base}/order`, { method: "PUT", body: { order: next.map((m) => m.id) } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save order");
    }
  }

  async function setCover(id: string) {
    try {
      await api(`${base}/${id}/cover`, { method: "POST" });
      setItems((p) => p.map((m) => ({ ...m, is_cover: m.id === id })));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't set cover");
    }
  }

  async function remove(id: string) {
    if (!confirm("Delete this file?")) return;
    try {
      await api(`${base}/${id}`, { method: "DELETE" });
      setItems((p) => p.filter((m) => m.id !== id));
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't delete");
    }
  }

  function pickFiles(target: string) {
    setUploadTarget(target);
    // wait a tick so uploadTarget is set before the file dialog resolves
    setTimeout(() => input.current?.click(), 0);
  }

  return (
    <div className="space-y-8">
      <input ref={input} type="file" multiple accept="image/*,video/*" className="hidden" onChange={(e) => upload(e.target.files)} />
      {grouped.map((g) => {
        const photos = g.items.filter((m) => m.type === "photo").length;
        const videos = g.items.filter((m) => m.type === "video").length;
        return (
          <section key={g.key} className={cn(g.key !== GENERAL && "rounded-xl border p-5")}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                {g.label && <h3 className="font-semibold">{g.label}</h3>}
                <p className="text-sm text-muted-foreground">
                  {photos}/{MAX_PHOTOS} photos · {videos}/{MAX_VIDEOS} videos · drag to reorder
                </p>
              </div>
              <Button onClick={() => pickFiles(g.key)} disabled={uploading}>
                {uploading && uploadTarget === g.key ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload photos or videos
              </Button>
            </div>
            {g.items.length === 0 ? (
              <button
                onClick={() => pickFiles(g.key)}
                className="mt-4 flex w-full flex-col items-center rounded-xl border-2 border-dashed py-10 text-sm text-muted-foreground hover:border-primary hover:text-primary"
              >
                <Upload className="mb-2 h-6 w-6" /> Add your first photos — the first one becomes your cover.
              </button>
            ) : (
              <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {g.items.map((m) => {
                  const i = items.findIndex((x) => x.id === m.id);
                  return (
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
                      {m.type === "video" ? (
                        <div className="relative h-full w-full">
                          <video src={m.url} className="h-full w-full object-cover" muted />
                          <Video className="absolute left-2 top-2 h-4 w-4 text-primary-foreground drop-shadow" />
                        </div>
                      ) : (
                        <img src={m.url} alt="" className="h-full w-full object-cover" />
                      )}
                      {m.is_cover && <span className="absolute left-2 top-2 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">COVER</span>}
                      <GripVertical className="absolute right-2 top-2 h-4 w-4 text-primary-foreground opacity-0 drop-shadow group-hover:opacity-100" />
                      <div className="absolute inset-x-0 bottom-0 flex justify-end gap-1 bg-gradient-to-t from-foreground/60 p-2 opacity-0 transition group-hover:opacity-100">
                        {m.type === "photo" && !m.is_cover && (
                          <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => setCover(m.id)} title="Set as cover">
                            <Star className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => remove(m.id)} title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
