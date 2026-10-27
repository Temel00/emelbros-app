"use client";

import { useRouter } from "next/navigation";
import { Camera, ImagePlus, Pencil, Plus } from "lucide-react";
import { useEffect, useId, useRef, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { createClient } from "@/platform/supabase/client";
import {
  createBeanAction,
  setBeanPhotoAction,
  updateBeanAction,
} from "@/modules/coffee/actions";
import {
  buildPhotoPath,
  removePhotoObject,
} from "@/modules/coffee/lib/photo-storage";
import {
  resizePhoto,
  type ResizedPhoto,
} from "@/modules/coffee/lib/photo-resize";
import { BAG_PHOTO_BUCKET } from "@/modules/coffee/lib/photo-url";
import { ROAST_LEVELS } from "@/modules/coffee/lib/validation";
import type { CoffeeBeanRow } from "@/modules/coffee/queries";

/** Add bean (no `bean`) or Edit bean (with `bean`) in a dialog. */
export function BeanFormDialog({ bean }: { bean?: CoffeeBeanRow }) {
  const [open, setOpen] = useState(false);
  const editing = bean !== undefined;

  return (
    <DialogRoot open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          editing ? (
            <Button variant="outline" size="sm">
              <Pencil data-icon="inline-start" />
              Edit
            </Button>
          ) : (
            <Button size="sm">
              <Plus data-icon="inline-start" />
              Add bean
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? "Edit bean" : "Add bean"}</DialogTitle>
        </DialogHeader>
        <BeanForm bean={bean} onDone={() => setOpen(false)} />
      </DialogContent>
    </DialogRoot>
  );
}

// Rendered only while the dialog is open, so its state resets on each open.
function BeanForm({
  bean,
  onDone,
}: {
  bean?: CoffeeBeanRow;
  onDone: () => void;
}) {
  const router = useRouter();
  const nameId = useId();
  const roasterId = useId();
  const originId = useId();
  const roastId = useId();
  const notesId = useId();

  const [name, setName] = useState(bean?.name ?? "");
  const [roaster, setRoaster] = useState(bean?.roaster ?? "");
  const [origin, setOrigin] = useState(bean?.origin ?? "");
  const [roastLevel, setRoastLevel] = useState(bean?.roast_level ?? "");
  const [notes, setNotes] = useState(bean?.notes ?? "");
  const [photo, setPhoto] = useState<ResizedPhoto | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  // Set once the bean row exists, so a retry after a failed photo upload
  // updates it instead of creating a second bean.
  const [savedId, setSavedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Revoke the preview blob URL when it is replaced or the form unmounts.
  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  async function handlePick(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setError(null);
    setProcessing(true);
    try {
      const resized = await resizePhoto(file);
      setPhoto(resized);
      setPreview(URL.createObjectURL(resized.blob));
    } catch {
      setError("Could not read that photo. Try another.");
    } finally {
      setProcessing(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const fields = { name, roaster, origin, notes, roastLevel };
        let beanId = bean?.id ?? savedId;
        if (beanId) {
          const result = await updateBeanAction(beanId, fields);
          if (result.error !== undefined) {
            setError(result.error);
            return;
          }
        } else {
          const result = await createBeanAction(fields);
          if (result.error !== undefined || !result.id) {
            setError(result.error ?? "Something went wrong");
            return;
          }
          beanId = result.id;
          setSavedId(beanId);
        }

        if (photo) {
          const failure = await uploadPhoto(beanId, photo);
          if (failure) {
            setError(`Bean saved, but the photo failed to upload: ${failure}`);
            return;
          }
        }

        onDone();
        if (!bean) router.push(`/coffee/${beanId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 pt-2">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={nameId}>Name</Label>
        <Input
          id={nameId}
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={roasterId}>Roaster</Label>
        <Input
          id={roasterId}
          value={roaster}
          onChange={(e) => setRoaster(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={originId}>Origin</Label>
        <Input
          id={originId}
          value={origin}
          onChange={(e) => setOrigin(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={roastId}>Roast level</Label>
        <Select
          id={roastId}
          value={roastLevel}
          onChange={(e) => setRoastLevel(e.target.value)}
        >
          <option value="">Not set</option>
          {ROAST_LEVELS.map((level) => (
            <option key={level} value={level}>
              {level}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={notesId}>Notes</Label>
        <textarea
          id={notesId}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          className="w-full rounded-lg border-2 border-input bg-transparent px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Bag photo</Label>
        <div className="flex items-center gap-3">
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element -- local blob preview, nothing to optimise
            <img
              src={preview}
              alt="Selected bag photo"
              className="h-24 w-[54px] rounded-md object-cover"
            />
          )}
          <div className="flex flex-col gap-2">
            <PhotoPicker
              label={photo || bean?.photo_path ? "Retake photo" : "Take photo"}
              icon={<Camera data-icon="inline-start" />}
              capture
              disabled={processing || pending}
              onChange={handlePick}
            />
            <PhotoPicker
              label="Choose from library"
              icon={<ImagePlus data-icon="inline-start" />}
              disabled={processing || pending}
              onChange={handlePick}
            />
          </div>
        </div>
        {processing && (
          <p className="text-sm text-muted-foreground">Processing photo�</p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter>
        <Button
          type="submit"
          disabled={pending || processing || name.trim() === ""}
        >
          {bean ? "Save" : "Add"}
        </Button>
      </DialogFooter>
    </form>
  );
}

/** A button that opens a hidden image file input (camera or library). */
function PhotoPicker({
  label,
  icon,
  capture,
  disabled,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  capture?: boolean;
  disabled: boolean;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const ref = useRef<HTMLInputElement>(null);

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture={capture ? "environment" : undefined}
        onChange={onChange}
        className="hidden"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={disabled}
        onClick={() => ref.current?.click()}
      >
        {icon}
        {label}
      </Button>
    </>
  );
}

/**
 * Uploads the resized photo to a fresh `<bean_id>/<uuid>.jpg` object and
 * points the bean at it. Returns an error message, or `null` on success. If
 * recording it fails, the uploaded object is removed again.
 */
async function uploadPhoto(
  beanId: string,
  photo: ResizedPhoto,
): Promise<string | null> {
  const supabase = createClient();
  const path = buildPhotoPath(beanId, crypto.randomUUID());

  const { error } = await supabase.storage
    .from(BAG_PHOTO_BUCKET)
    .upload(path, photo.blob, { contentType: "image/jpeg", upsert: false });
  if (error) return error.message;

  try {
    const result = await setBeanPhotoAction(beanId, {
      path,
      blur: photo.blurDataUrl,
    });
    if (result.error === undefined) return null;
    await removePhotoObject(supabase, path);
    return result.error;
  } catch (err) {
    await removePhotoObject(supabase, path);
    return err instanceof Error ? err.message : "Something went wrong";
  }
}
