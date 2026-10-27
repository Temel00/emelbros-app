import { BAG_PHOTO_BUCKET } from "@/modules/coffee/lib/photo-url";

/** Storage path for a new bag photo: `<bean_id>/<uuid>.jpg`, never reused. */
export function buildPhotoPath(beanId: string, uuid: string): string {
  return `${beanId}/${uuid}.jpg`;
}

/** The slice of a Supabase client the cleanup needs. */
type PhotoStorageClient = {
  storage: {
    from(bucket: string): {
      remove(paths: string[]): Promise<{ error: { message: string } | null }>;
    };
  };
};

/**
 * Best-effort delete of a bag photo object. Runs after the database write, so
 * a failure only leaves an orphan (accepted, no cron); it never throws.
 */
export async function removePhotoObject(
  supabase: PhotoStorageClient,
  photoPath: string | null,
): Promise<void> {
  if (!photoPath) return;

  try {
    await supabase.storage.from(BAG_PHOTO_BUCKET).remove([photoPath]);
  } catch {
    // Orphaned object; nothing to do.
  }
}
