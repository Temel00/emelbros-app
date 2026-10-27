export const BAG_PHOTO_BUCKET = "coffee-bag-photos";

/**
 * Public URL of a bean's bag photo, or `null` when it has none. The bucket is
 * public, so this is plain string assembly (same as Supabase's `getPublicUrl`)
 * and works in server and client code alike. `photoPath` is the opaque
 * `coffee_bean.photo_path`.
 */
export function getPhotoUrl(photoPath: string | null): string | null {
  if (!photoPath) return null;

  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");

  const encoded = photoPath.split("/").map(encodeURIComponent).join("/");
  return `${base.replace(/\/$/, "")}/storage/v1/object/public/${BAG_PHOTO_BUCKET}/${encoded}`;
}
