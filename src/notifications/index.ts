import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { planReminders } from '@/domain/reminders';
import type { Settings } from '@/domain/settings';
import { deviceZone } from '@/domain/time';
import type { DateKey } from '@/domain/types';
import i18n from '@/i18n';

/** Local notifications only: no push token is ever requested. */
export const MORNING_CHANNEL = 'morning';
export const EVENING_CHANNEL = 'evening';
export const MORNING_CATEGORY = 'morning';
export const LOG_ACTION = 'log';

export function configureNotificationHandler(): void {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
}

/** Channels and categories carry translated labels, so refresh them when the language changes. */
export async function configureChannels(): Promise<void> {
  const t = i18n.t.bind(i18n);
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(MORNING_CHANNEL, {
      name: t('notifications.morningTitle'),
      description: t('notifications.channelDescription'),
      importance: Notifications.AndroidImportance.DEFAULT,
      enableVibrate: false,
      showBadge: false,
    });
    await Notifications.setNotificationChannelAsync(EVENING_CHANNEL, {
      name: t('notifications.eveningTitle'),
      description: t('notifications.channelDescription'),
      importance: Notifications.AndroidImportance.LOW,
      sound: null,
      enableVibrate: false,
      showBadge: false,
    });
  }
  await Notifications.setNotificationCategoryAsync(MORNING_CATEGORY, [
    {
      identifier: LOG_ACTION,
      buttonTitle: t('notifications.morningAction'),
      options: { opensAppToForeground: true },
    },
  ]);
}

export type PermissionState = 'granted' | 'denied' | 'undetermined';

export async function getPermission(): Promise<PermissionState> {
  const p = await Notifications.getPermissionsAsync();
  if (p.granted || p.ios?.status === Notifications.IosAuthorizationStatus.PROVISIONAL)
    return 'granted';
  return p.canAskAgain ? 'undetermined' : 'denied';
}

export async function requestPermission(): Promise<PermissionState> {
  await configureChannels();
  const p = await Notifications.requestPermissionsAsync({
    ios: { allowAlert: true, allowSound: true, allowBadge: false },
  });
  return p.granted ? 'granted' : p.canAskAgain ? 'undetermined' : 'denied';
}

/**
 * Replaces every scheduled reminder. Called on launch, when the app returns
 * to the foreground (catches time-zone changes), after saving a night and
 * when reminder settings change.
 */
let queue: Promise<unknown> = Promise.resolve();

/** Runs sync jobs one after the other so an older run never undoes a newer one. */
export function syncReminders(
  settings: Settings,
  loggedDates: ReadonlySet<DateKey>,
): Promise<number> {
  const job = queue.then(() => runSync(settings, loggedDates));
  queue = job.catch(() => undefined);
  return job;
}

export function cancelReminders(): Promise<void> {
  const job = queue.then(() => Notifications.cancelAllScheduledNotificationsAsync());
  queue = job.catch(() => undefined);
  return job;
}

async function runSync(settings: Settings, loggedDates: ReadonlySet<DateKey>): Promise<number> {
  await Notifications.cancelAllScheduledNotificationsAsync();
  if ((await getPermission()) !== 'granted') return 0;
  const t = i18n.t.bind(i18n);
  const now = Date.now();
  const requests: Notifications.NotificationRequestInput[] = [];
  if (settings.morningReminder.enabled) {
    for (const r of planReminders({
      now,
      clock: settings.morningReminder.clock,
      zone: deviceZone,
      skip: loggedDates,
    })) {
      requests.push({
        identifier: `morning-${r.date}`,
        content: {
          title: t('notifications.morningTitle'),
          body: t('notifications.morningBody'),
          categoryIdentifier: MORNING_CATEGORY,
          data: { url: `/entry?date=${r.date}` },
          sound: 'default',
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: r.at,
          channelId: MORNING_CHANNEL,
        },
      });
    }
  }
  if (settings.eveningReminder.enabled) {
    for (const r of planReminders({
      now,
      clock: settings.eveningReminder.clock,
      zone: deviceZone,
    })) {
      requests.push({
        identifier: `evening-${r.date}`,
        content: {
          title: t('notifications.eveningTitle'),
          body: t('notifications.eveningBody'),
          sound: false,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: r.at,
          channelId: EVENING_CHANNEL,
        },
      });
    }
  }
  for (const req of requests) await Notifications.scheduleNotificationAsync(req);
  return requests.length;
}

/** URL to open for a notification response, if any. */
export function responseUrl(response: Notifications.NotificationResponse): string | null {
  const url = response.notification.request.content.data?.url;
  return typeof url === 'string' && url.startsWith('/') ? url : null;
}
