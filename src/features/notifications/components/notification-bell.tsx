"use client";

import { BellIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NOTIFICATION_POLL_MS } from "@/constants/notifications";
import {
  listMyNotificationsAction,
  markAllNotificationsReadAction,
  markNotificationReadAction,
} from "@/features/notifications/actions";
import { redirectIfSessionEnded } from "@/lib/session-client";
import { cn } from "@/lib/utils";
import type { NotificationFeed, NotificationItem } from "@/types/notification";
import { formatDateTime } from "@/utils/format";

const EMPTY_FEED: NotificationFeed = { unreadCount: 0, items: [] };

export function NotificationBell() {
  const router = useRouter();
  const [feed, setFeed] = useState<NotificationFeed>(EMPTY_FEED);
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    function refresh() {
      void listMyNotificationsAction({}).then((result) => {
        if (cancelled || redirectIfSessionEnded(result)) {
          return;
        }
        if (result.success) {
          setFeed(result.data);
        }
      });
    }

    refresh();
    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }, NOTIFICATION_POLL_MS);

    function onVisible() {
      if (document.visibilityState === "visible") {
        refresh();
      }
    }

    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  function applyFeed(result: Awaited<ReturnType<typeof listMyNotificationsAction>>) {
    if (redirectIfSessionEnded(result)) {
      return;
    }
    if (result.success) {
      setFeed(result.data);
    }
  }

  function handleOpen(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      void listMyNotificationsAction({}).then(applyFeed);
    }
  }

  function handleSelect(item: NotificationItem) {
    startTransition(async () => {
      if (!item.readAt) {
        applyFeed(await markNotificationReadAction({ publicId: item.publicId }));
      }
      if (item.href) {
        setOpen(false);
        router.push(item.href);
      }
    });
  }

  function handleMarkAll() {
    startTransition(async () => {
      applyFeed(await markAllNotificationsReadAction({}));
    });
  }

  const unreadLabel = feed.unreadCount > 9 ? "9+" : String(feed.unreadCount);

  return (
    <DropdownMenu open={open} onOpenChange={handleOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications" className="relative">
          <BellIcon />
          {feed.unreadCount > 0 ? (
            <span className="bg-destructive text-destructive-foreground absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold">
              {unreadLabel}
            </span>
          ) : null}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 p-0 sm:w-96" align="end">
        <div className="flex items-center justify-between gap-2 px-3 py-2">
          <DropdownMenuLabel className="text-foreground p-0 text-sm font-semibold">
            Notifications
          </DropdownMenuLabel>
          {feed.unreadCount > 0 ? (
            <button
              type="button"
              onClick={handleMarkAll}
              className="text-primary text-xs font-medium hover:underline"
            >
              Mark all as read
            </button>
          ) : null}
        </div>
        <DropdownMenuSeparator className="my-0" />
        {feed.items.length === 0 ? (
          <p className="text-muted-foreground px-3 py-8 text-center text-sm">No notifications yet.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto py-1">
            {feed.items.map((item) => (
              <DropdownMenuItem
                key={item.publicId}
                onSelect={(event) => {
                  event.preventDefault();
                  handleSelect(item);
                }}
                className={cn(
                  "flex cursor-pointer flex-col items-start gap-0.5 rounded-none px-3 py-2.5",
                  !item.readAt && "bg-primary/6",
                )}
              >
                <span className="flex w-full items-center justify-between gap-2">
                  <span className="text-foreground text-sm font-medium">{item.title}</span>
                  {!item.readAt ? (
                    <span className="bg-primary size-1.5 shrink-0 rounded-full" aria-hidden="true" />
                  ) : null}
                </span>
                <span className="text-muted-foreground line-clamp-2 text-xs">{item.body}</span>
                <span className="text-muted-foreground text-[11px]">
                  {formatDateTime(item.createdAt)}
                </span>
              </DropdownMenuItem>
            ))}
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
