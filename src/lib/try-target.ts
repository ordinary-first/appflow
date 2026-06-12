/**
 * Single source of truth for "what does the Try button do" — feed card
 * (center + bottom CTA) and the app detail page all derive from here.
 * Three hand-rolled copies of this branch had already drifted once
 * (the feed kept sending non-embeddable web apps into the doomed /try
 * iframe while the detail page linked out).
 */

export type TryTargetApp = {
  id: string;
  url: string;
  platform: "web" | "ios" | "android" | "cross_platform";
  embeddable: boolean;
  storeUrls: { ios?: string; android?: string } | null;
};

export type TryTarget = {
  href: string;
  /** External targets open in a new tab and must record try_click themselves
   * (the internal /try page records it inside TryView). */
  external: boolean;
  label: string;
};

export function getTryTargets(app: TryTargetApp): TryTarget[] {
  switch (app.platform) {
    case "web":
      return app.embeddable
        ? [{ href: `/try/${app.id}`, external: false, label: "Try it now" }]
        : // Embedding would land on the blocked-iframe fallback — skip the
          // interstitial and open the real site.
          [{ href: app.url, external: true, label: "Try it now" }];
    case "ios":
      return [
        {
          href: app.storeUrls?.ios ?? app.url,
          external: true,
          label: "Get on App Store",
        },
      ];
    case "android":
      return [
        {
          href: app.storeUrls?.android ?? app.url,
          external: true,
          label: "Get on Google Play",
        },
      ];
    case "cross_platform": {
      const targets: TryTarget[] = [];
      if (app.storeUrls?.ios)
        targets.push({ href: app.storeUrls.ios, external: true, label: "App Store" });
      if (app.storeUrls?.android)
        targets.push({ href: app.storeUrls.android, external: true, label: "Google Play" });
      if (targets.length === 0)
        targets.push({ href: app.url, external: true, label: "Get the app" });
      return targets;
    }
  }
}
