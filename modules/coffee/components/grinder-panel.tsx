"use client";

import { LocateFixed } from "lucide-react";

import { Button } from "@/components/ui/button";
import { DeleteProfileButton } from "@/modules/coffee/components/delete-buttons";
import { ProfileFormDialog } from "@/modules/coffee/components/profile-form-dialog";
import type { CoffeeGrindProfileRow } from "@/modules/coffee/queries";
import { useGrinder, type SendStatus } from "@/modules/coffee/lib/use-grinder";

const PHASE_LABEL = {
  sending: "Sending…",
  sent: "Sent",
  accepted: "Accepted, grinding…",
  done: "Done",
  "no-confirmation": "Sent, no confirmation",
  failed: "Failed",
} as const;

function StatusLine({ send }: { send: SendStatus }) {
  const failed = send.phase === "failed";
  return (
    <span
      role={failed ? "alert" : "status"}
      className={
        failed ? "text-sm text-destructive" : "text-sm text-muted-foreground"
      }
    >
      {PHASE_LABEL[send.phase]}
      {failed && send.message ? `: ${send.message}` : ""}
    </span>
  );
}

/** Connection controls and the grind profiles, each with Send to machine. */
export function GrinderPanel({
  beanId,
  profiles,
}: {
  beanId: string;
  profiles: CoffeeGrindProfileRow[];
}) {
  const grinder = useGrinder();
  const connected = grinder.status === "connected";
  const busy =
    grinder.send !== null &&
    ["sending", "sent", "accepted"].includes(grinder.send.phase);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">
          Grind profiles
        </h2>
        <ProfileFormDialog beanId={beanId} />
      </div>

      {!grinder.supported ? (
        <p className="text-sm text-muted-foreground">
          Send to machine needs Web Serial, which this browser doesn&apos;t
          support. Use Chrome or Edge on desktop or Android over HTTPS.
        </p>
      ) : (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground">
            Machine:{" "}
            {connected
              ? "connected"
              : grinder.status === "connecting"
                ? "connecting…"
                : "not connected"}
          </span>
          {connected ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => void grinder.disconnect()}
            >
              Disconnect
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={grinder.status === "connecting"}
              onClick={() => void grinder.connect()}
            >
              Connect
            </Button>
          )}
          {connected && (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => void grinder.sendHome()}
            >
              <LocateFixed aria-hidden />
              Home
            </Button>
          )}
          {grinder.machine && (
            <span className="text-muted-foreground">
              {grinder.machine.position !== null &&
                `Position ${grinder.machine.position} · `}
              {grinder.machine.state}
            </span>
          )}
          {grinder.send?.key === "home" && <StatusLine send={grinder.send} />}
        </div>
      )}

      {grinder.connectError && (
        <p role="alert" className="text-sm text-destructive">
          Couldn&apos;t connect: {grinder.connectError}
        </p>
      )}
      {grinder.notice && (
        <p
          role="alert"
          className="flex items-center justify-between gap-2 rounded-lg border border-destructive/40 p-2 text-sm text-destructive"
        >
          {grinder.notice}
          <Button variant="ghost" size="xs" onClick={grinder.dismissNotice}>
            Dismiss
          </Button>
        </p>
      )}

      {profiles.length === 0 ? (
        <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
          No profiles yet. Add one to start sending grinds.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {profiles.map((profile) => (
            <li
              key={profile.id}
              className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-card-foreground"
            >
              <div className="flex min-w-0 flex-col">
                <span className="font-medium">{profile.label}</span>
                {profile.description && (
                  <span className="text-sm text-muted-foreground">
                    {profile.description}
                  </span>
                )}
                {grinder.send?.key === profile.id && (
                  <StatusLine send={grinder.send} />
                )}
              </div>
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
                <span className="text-lg font-semibold tabular-nums">
                  {profile.grind_size}
                </span>
                <Button
                  size="sm"
                  disabled={!connected || busy}
                  onClick={() =>
                    void grinder.sendGrind(
                      profile.id,
                      Number(profile.grind_size),
                    )
                  }
                >
                  Send to machine
                </Button>
                <ProfileFormDialog beanId={beanId} profile={profile} />
                <DeleteProfileButton
                  beanId={beanId}
                  profileId={profile.id}
                  label={profile.label}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
