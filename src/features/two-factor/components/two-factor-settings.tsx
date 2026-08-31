"use client";

import { ShieldCheckIcon, SmartphoneIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

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
import { FormField } from "@/components/forms/form-field";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
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
import type { TwoFactorStatus } from "@/types/two-factor";

interface TwoFactorSettingsProps {
  readonly status: TwoFactorStatus;
}

export function TwoFactorSettings({ status }: TwoFactorSettingsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [emailCode, setEmailCode] = useState("");
  const [emailEnrollStep, setEmailEnrollStep] = useState<"idle" | "verify">("idle");
  const [disableEmailCode, setDisableEmailCode] = useState("");
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
          <section className="border-border rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <ShieldCheckIcon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">Email OTP</h3>
                    <Badge variant={status.emailOtpEnabled ? "success" : "neutral"}>
                      {status.emailOtpEnabled ? "Enabled" : "Off"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    A one-time code is emailed when you sign in.
                  </p>
                </div>
              </div>
            </div>

            {status.emailOtpEnabled ? (
              <div className="mt-4 space-y-3">
                <FormField htmlFor="disable-email-code" label="Turn off email OTP">
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
                      run(async () =>
                        disableEmailOtpAction({
                          method: "EMAIL",
                          code: disableEmailCode,
                        }) as never,
                      )
                    }
                  >
                    Turn off
                  </Button>
                </div>
              </div>
            ) : emailEnrollStep === "verify" ? (
              <div className="mt-4 space-y-3">
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
                    Confirm
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() => setEmailEnrollStep("idle")}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                className="mt-4"
                size="sm"
                disabled={isPending}
                onClick={() =>
                  run(async () => {
                    const result = await requestEnableEmailOtpAction({});
                    if (result.success) {
                      setEmailEnrollStep("verify");
                    }
                    return result;
                  })
                }
              >
                Enable email OTP
              </Button>
            )}
          </section>

          <section className="border-border rounded-xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex gap-3">
                <span className="bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
                  <SmartphoneIcon className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-sm font-semibold">Microsoft Authenticator</h3>
                    <Badge variant={status.authenticatorEnabled ? "success" : "neutral"}>
                      {status.authenticatorEnabled ? "Enabled" : "Off"}
                    </Badge>
                  </div>
                  <p className="text-muted-foreground mt-1 text-sm">
                    Scan a QR code with Microsoft Authenticator or any compatible app.
                  </p>
                </div>
              </div>
            </div>

            {status.authenticatorEnabled ? (
              <div className="mt-4 space-y-3">
                <FormField htmlFor="disable-auth-code" label="Turn off authenticator">
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
                      run(async () =>
                        disableAuthenticatorAction({
                          method: "AUTHENTICATOR",
                          code: disableAuthCode,
                        }) as never,
                      )
                    }
                  >
                    Turn off
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                className="mt-4"
                size="sm"
                disabled={isPending}
                onClick={() =>
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
                  })
                }
              >
                Set up Microsoft Authenticator
              </Button>
            )}
          </section>
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
