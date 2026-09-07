"use client";

import {
  CheckCircle2Icon,
  CircleOffIcon,
  ShieldCheckIcon,
  SmartphoneIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition, type ReactNode } from "react";
import { toast } from "sonner";

import { FormField } from "@/components/forms/form-field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  beginAuthenticatorEnrollmentAction,
  confirmAuthenticatorEnrollmentAction,
  confirmEnableEmailOtpAction,
  disableAuthenticatorAction,
  disableEmailOtpAction,
  requestDisableAuthenticatorAction,
  requestDisableEmailOtpAction,
  requestEnableEmailOtpAction,
} from "@/features/two-factor/actions";
import { cn } from "@/lib/utils";
import type { TwoFactorStatus } from "@/types/two-factor";

interface TwoFactorSettingsProps {
  readonly status: TwoFactorStatus;
}

function MethodStatusBadge({ enabled }: { readonly enabled: boolean }) {
  return (
    <Badge variant={enabled ? "success" : "neutral"} className="gap-1.5">
      {enabled ? (
        <CheckCircle2Icon className="size-3" aria-hidden="true" />
      ) : (
        <CircleOffIcon className="size-3" aria-hidden="true" />
      )}
      {enabled ? "Enabled" : "Disabled"}
    </Badge>
  );
}

function MethodIconShell({
  enabled,
  children,
}: {
  readonly enabled: boolean;
  readonly children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-xl",
        enabled
          ? "bg-success/15 text-success ring-1 ring-success/25"
          : "bg-muted text-muted-foreground ring-1 ring-border",
      )}
    >
      {children}
    </span>
  );
}

function MethodCard({
  enabled,
  children,
}: {
  readonly enabled: boolean;
  readonly children: ReactNode;
}) {
  return (
    <section
      className={cn(
        "rounded-xl border p-4 transition-colors",
        enabled ? "border-success/35 bg-success/6" : "border-border bg-muted/30",
      )}
    >
      {children}
    </section>
  );
}

export function TwoFactorSettings({ status }: TwoFactorSettingsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [emailCode, setEmailCode] = useState("");
  const [emailEnrollStep, setEmailEnrollStep] = useState<"idle" | "verify">("idle");
  const [disableEmailOpen, setDisableEmailOpen] = useState(false);
  const [disableEmailCode, setDisableEmailCode] = useState("");
  const [disableAuthOpen, setDisableAuthOpen] = useState(false);
  const [disableAuthCode, setDisableAuthCode] = useState("");
  const [authSetupOpen, setAuthSetupOpen] = useState(false);
  const [authChallengeId, setAuthChallengeId] = useState<string | null>(null);
  const [authQrDataUrl, setAuthQrDataUrl] = useState<string | null>(null);
  const [authManualSecret, setAuthManualSecret] = useState<string | null>(null);
  const [authCode, setAuthCode] = useState("");

  const run = (task: () => Promise<{ success: boolean; message?: string }>) => {
    startTransition(async () => {
      const result = await task();
      if (!result.success) {
        toast.error(result.message);
        return;
      }
      router.refresh();
    });
  };

  function onEmailToggle(next: boolean) {
    if (next) {
      setDisableEmailOpen(false);
      setDisableEmailCode("");
      run(async () => {
        const result = await requestEnableEmailOtpAction({});
        if (result.success) {
          setEmailEnrollStep("verify");
        }
        return result;
      });
      return;
    }

    setEmailEnrollStep("idle");
    setEmailCode("");
    setDisableEmailOpen(true);
    setDisableEmailCode("");
  }

  function onAuthenticatorToggle(next: boolean) {
    if (next) {
      setDisableAuthOpen(false);
      setDisableAuthCode("");
      startTransition(async () => {
        const result = await beginAuthenticatorEnrollmentAction({});
        if (!result.success) {
          toast.error(result.message);
          return;
        }

        setAuthChallengeId(result.data.challengePublicId);
        setAuthQrDataUrl(result.data.qrDataUrl);
        setAuthManualSecret(result.data.manualSecret);
        setAuthCode("");
        setAuthSetupOpen(true);
      });
      return;
    }

    setDisableAuthOpen(true);
    setDisableAuthCode("");
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Two-factor authentication</CardTitle>
          <CardDescription>
            Add a second step at sign-in with an email code or Microsoft Authenticator.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <MethodCard enabled={status.emailOtpEnabled}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <MethodIconShell enabled={status.emailOtpEnabled}>
                  <ShieldCheckIcon className="size-5" aria-hidden="true" />
                </MethodIconShell>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">Email OTP</h3>
                    <MethodStatusBadge enabled={status.emailOtpEnabled} />
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    A one-time code is emailed when you sign in.
                  </p>
                </div>
              </div>
              <Switch
                checked={status.emailOtpEnabled}
                disabled={isPending}
                onCheckedChange={onEmailToggle}
                aria-label="Toggle email OTP"
              />
            </div>

            {status.emailOtpEnabled && disableEmailOpen ? (
              <div className="border-border mt-4 space-y-3 border-t pt-4">
                <FormField htmlFor="disable-email-code" label="Enter code to turn off email OTP">
                  <Input
                    id="disable-email-code"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={disableEmailCode}
                    onChange={(event) => setDisableEmailCode(event.target.value)}
                    disabled={isPending}
                  />
                </FormField>
                <div className="flex flex-wrap gap-2">
                  {status.authenticatorEnabled ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        run(async () => requestDisableEmailOtpAction({}) as never)
                      }
                    >
                      Send email code
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isPending || disableEmailCode.length !== 6}
                    onClick={() =>
                      run(async () => {
                        const result = await disableEmailOtpAction({
                          method: "EMAIL",
                          code: disableEmailCode,
                        });
                        if (result.success) {
                          setDisableEmailOpen(false);
                          setDisableEmailCode("");
                        }
                        return result;
                      })
                    }
                  >
                    Confirm turn off
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      setDisableEmailOpen(false);
                      setDisableEmailCode("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            {!status.emailOtpEnabled && emailEnrollStep === "verify" ? (
              <div className="border-border mt-4 space-y-3 border-t pt-4">
                <FormField htmlFor="email-enroll-code" label="Verification code">
                  <Input
                    id="email-enroll-code"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={emailCode}
                    onChange={(event) => setEmailCode(event.target.value)}
                    disabled={isPending}
                  />
                </FormField>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    disabled={isPending || emailCode.length !== 6}
                    onClick={() =>
                      run(async () => {
                        const result = await confirmEnableEmailOtpAction({ code: emailCode });
                        if (result.success) {
                          setEmailEnrollStep("idle");
                          setEmailCode("");
                        }
                        return result;
                      })
                    }
                  >
                    Confirm enable
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      setEmailEnrollStep("idle");
                      setEmailCode("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </MethodCard>

          <MethodCard enabled={status.authenticatorEnabled}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 gap-3">
                <MethodIconShell enabled={status.authenticatorEnabled}>
                  <SmartphoneIcon className="size-5" aria-hidden="true" />
                </MethodIconShell>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">Microsoft Authenticator</h3>
                    <MethodStatusBadge enabled={status.authenticatorEnabled} />
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Scan a QR code with Microsoft Authenticator or any compatible app.
                  </p>
                </div>
              </div>
              <Switch
                checked={status.authenticatorEnabled}
                disabled={isPending}
                onCheckedChange={onAuthenticatorToggle}
                aria-label="Toggle Microsoft Authenticator"
              />
            </div>

            {status.authenticatorEnabled && disableAuthOpen ? (
              <div className="border-border mt-4 space-y-3 border-t pt-4">
                <FormField htmlFor="disable-auth-code" label="Enter code to turn off authenticator">
                  <Input
                    id="disable-auth-code"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="000000"
                    value={disableAuthCode}
                    onChange={(event) => setDisableAuthCode(event.target.value)}
                    disabled={isPending}
                  />
                </FormField>
                <div className="flex flex-wrap gap-2">
                  {status.emailOtpEnabled ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isPending}
                      onClick={() =>
                        run(async () => requestDisableAuthenticatorAction({}) as never)
                      }
                    >
                      Send email code
                    </Button>
                  ) : null}
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={isPending || disableAuthCode.length !== 6}
                    onClick={() =>
                      run(async () => {
                        const result = await disableAuthenticatorAction({
                          method: "AUTHENTICATOR",
                          code: disableAuthCode,
                        });
                        if (result.success) {
                          setDisableAuthOpen(false);
                          setDisableAuthCode("");
                        }
                        return result;
                      })
                    }
                  >
                    Confirm turn off
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => {
                      setDisableAuthOpen(false);
                      setDisableAuthCode("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}
          </MethodCard>
        </CardContent>
      </Card>

      <Dialog open={authSetupOpen} onOpenChange={setAuthSetupOpen}>
        <DialogContent size="md">
          <DialogHeader>
            <DialogTitle>Scan with Microsoft Authenticator</DialogTitle>
            <DialogDescription>
              Add this account in your authenticator app, then enter the 6-digit code to finish.
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {authQrDataUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={authQrDataUrl}
                alt="QR code for Microsoft Authenticator"
                className="mx-auto rounded-lg border"
              />
            ) : null}
            {authManualSecret ? (
              <p className="text-muted-foreground break-all text-center text-xs">
                Manual key: <span className="text-foreground font-mono">{authManualSecret}</span>
              </p>
            ) : null}
            <FormField htmlFor="auth-enroll-code" label="Authenticator code">
              <Input
                id="auth-enroll-code"
                inputMode="numeric"
                maxLength={6}
                placeholder="000000"
                value={authCode}
                onChange={(event) => setAuthCode(event.target.value)}
                disabled={isPending}
              />
            </FormField>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setAuthSetupOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              disabled={isPending || !authChallengeId || authCode.length !== 6}
              onClick={() =>
                run(async () => {
                  const result = await confirmAuthenticatorEnrollmentAction({
                    challengePublicId: authChallengeId!,
                    code: authCode,
                  });
                  if (result.success) {
                    setAuthSetupOpen(false);
                  }
                  return result;
                })
              }
            >
              {isPending ? <Spinner label="Saving" /> : "Enable"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
