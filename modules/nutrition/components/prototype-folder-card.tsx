/**
 * PROTOTYPE ONLY — throwaway. Delete when wayfinder #187 resolves.
 *
 * Part of the `dense` flair prototype (#187). Once the tinted produce field
 * became the leader, the open composition question was: how do title + content
 * stay legible and undistracted over a busy background? The owner's answer to
 * react to — a manila-folder-shaped card:
 *
 * - An OPAQUE centred container so the flair never bleeds through the content
 *   and the body text keeps full contrast. The flair now only shows in the
 *   gutter around the folder, framing rather than fighting the content.
 * - The page title rides the folder TAB (top-left), which reads more clearly
 *   as "this screen" than a bare heading floating on the flair did.
 *
 * Presentational + hook-free, so it drops straight into the server page files.
 * Manila tones are prototype-local arbitrary values (not #18 tokens): a win
 * here is what would decide whether they graduate into real surface tokens.
 */

export function PrototypeFolderCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mx-auto w-full max-w-3xl">
      {/* Folder tab — carries the title, connects seamlessly to the body. */}
      <div className="ml-3 inline-flex w-fit items-center rounded-t-xl border border-b-0 border-[#e2d4ad] bg-[#f4ead0] px-5 pb-1.5 pt-2 shadow-sm dark:border-[#43392a] dark:bg-[#2c2519]">
        <h1 className="text-base font-semibold text-foreground">{title}</h1>
      </div>
      {/* Folder body — top-left corner squared so the tab sits flush on it. */}
      <div className="rounded-xl rounded-tl-none border border-[#e2d4ad] bg-[#f4ead0] p-4 shadow-sm dark:border-[#43392a] dark:bg-[#2c2519] sm:p-6">
        {description ? (
          <p className="mb-5 max-w-prose text-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
        {children}
      </div>
    </section>
  );
}
