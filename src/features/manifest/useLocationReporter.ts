import { useEffect } from 'react';
import { PermissionsAndroid, Platform } from 'react-native';
import Geolocation from '@react-native-community/geolocation';
import BackgroundService from 'react-native-background-actions';
import { api } from '@shared/services/api/httpClient';
import { StorageService } from '@shared/services/storage/asyncStorage';

// Manifest "Find": reports this phone's GPS fix to huginn-external so the owner
// and spouse can see it on a map — 24/7, including when the app is backgrounded
// or closed.
//
// Android: a foreground service (persistent "Sharing location" notification, as
//   the OS requires) runs a loop that reports on a slow interval. Survives the
//   app being backgrounded; may be killed by aggressive OEM battery managers
//   (Xiaomi/Huawei) — the fix there is to disable battery optimization for the
//   app. ponytail: interval polling, not motion-triggered; good enough for "find
//   my spouse", upgrade to transistorsoft if battery/precision ever matters.
// iOS: Always authorization + background location updates; watchPosition with
//   significant-change delivery keeps fixes flowing while suspended.

const REPORT_INTERVAL_MS = 5 * 60 * 1000; // every 5 min

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Effects can re-run (dev strict mode, remounts); start the machinery once.
let started = false;

function reportOnce(): void {
  Geolocation.getCurrentPosition(
    (pos) => {
      void api
        .post('/api/manifest/location', {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy ?? null,
        })
        .catch(() => {
          // Best-effort — a missed fix is fine, the next tick retries.
        });
    },
    () => {
      // GPS error — ignore, retry next tick.
    },
    { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 },
  );
}

// Asked-once flags. `PermissionsAndroid.request` re-prompts on every call while
// a permission is denied, and when a rationale object is passed RN shows its own
// dialog first whenever Android reports a rationale is due — which is every
// launch after one refusal. So: check the real permission state first, and only
// ever ask once per permission. A "no" stays no until the owner turns it on in
// Android settings, which `check()` picks up on the next launch.
const ASKED_FINE_KEY = 'manifest.location.askedFine.v1';
const ASKED_BACKGROUND_KEY = 'manifest.location.askedBackground.v1';

const BACKGROUND_LOCATION = 'android.permission.ACCESS_BACKGROUND_LOCATION' as never;

async function askedBefore(key: string): Promise<boolean> {
  return (await StorageService.getItem<boolean>(key)) === true;
}

async function ensureAndroidPermissions(): Promise<boolean> {
  const granted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );

  let fineGranted = granted;
  if (!fineGranted) {
    // Already asked and still not granted → the answer was no. Stay quiet.
    if (await askedBefore(ASKED_FINE_KEY)) return false;
    await StorageService.setItem(ASKED_FINE_KEY, true);

    const result = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
      {
        title: 'Location',
        message: 'Share your location privately with your partner in Manifest.',
        buttonPositive: 'OK',
        buttonNegative: 'Not now',
      },
    );
    fineGranted = result === PermissionsAndroid.RESULTS.GRANTED;
  }
  if (!fineGranted) return false;

  const ver = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);
  // Android 13+: notification permission for the foreground-service notification.
  // The OS only shows this once on its own, but check anyway so a granted phone
  // never round-trips through the dialog manager.
  if (ver >= 33 && !(await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS))) {
    await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
  }
  // Android 10+: background location must be granted separately ("Allow all the
  // time"). Best-effort — the foreground service still reports while its
  // notification is live even if the user only grants "while using" — so this
  // is asked once and never nagged again.
  if (
    ver >= 29 &&
    !(await PermissionsAndroid.check(BACKGROUND_LOCATION)) &&
    !(await askedBefore(ASKED_BACKGROUND_KEY))
  ) {
    await StorageService.setItem(ASKED_BACKGROUND_KEY, true);
    await PermissionsAndroid.request(BACKGROUND_LOCATION, {
      title: 'Background location',
      message: 'Allow "all the time" so Manifest can share your location even when closed.',
      buttonPositive: 'OK',
      buttonNegative: 'Not now',
    });
  }
  return true;
}

/**
 * Let the owner be asked again after declining — for a "Share my location"
 * action in Manifest. Without this a "no" is final until they change it in
 * Android settings.
 */
export async function resetLocationPermissionPrompt(): Promise<void> {
  await StorageService.removeItem(ASKED_FINE_KEY);
  await StorageService.removeItem(ASKED_BACKGROUND_KEY);
}

async function startAndroid(): Promise<void> {
  if (!(await ensureAndroidPermissions())) return;
  if (BackgroundService.isRunning()) return;

  const task = async () => {
    reportOnce();
    while (BackgroundService.isRunning()) {
      await sleep(REPORT_INTERVAL_MS);
      reportOnce();
    }
  };

  await BackgroundService.start(task, {
    taskName: 'ManifestFind',
    taskTitle: 'Sharing location',
    taskDesc: 'Your location is shared privately with your partner.',
    taskIcon: { name: 'ic_launcher', type: 'mipmap' },
    // Android 14 (targetSdk 34) rejects startForeground() with type "none" and
    // the app dies with InvalidForegroundServiceTypeException. The manifest
    // already declares foregroundServiceType="location"; the runtime call has
    // to repeat it, so the type must be passed here too.
    foregroundServiceType: ['location'],
    // no linkingURI/color needed
  });
}

function startIOS(): void {
  // Always auth + background updates so watchPosition delivers while suspended.
  Geolocation.setRNConfiguration({
    authorizationLevel: 'always',
    skipPermissionRequests: false,
    enableBackgroundLocationUpdates: true,
  });
  Geolocation.requestAuthorization(
    () => {
      reportOnce();
      Geolocation.watchPosition(
        (pos) => {
          void api
            .post('/api/manifest/location', {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              accuracy: pos.coords.accuracy ?? null,
            })
            .catch(() => {});
        },
        () => {},
        {
          enableHighAccuracy: false,
          distanceFilter: 50, // meters between updates
          useSignificantChanges: true, // background-friendly, low battery
        },
      );
    },
    () => {
      // Permission denied — nothing to report.
    },
  );
}

export function useLocationReporter(): void {
  useEffect(() => {
    if (started) return;
    started = true;
    // Deliberately no cleanup: this is meant to run for the app's lifetime (24/7).
    if (Platform.OS === 'android') void startAndroid();
    else if (Platform.OS === 'ios') startIOS();
  }, []);
}
