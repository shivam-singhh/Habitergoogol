/**
 * Android WebView Bridge helper.
 * Safely detects if the app is running inside an Android WebView
 * that exposes a JavaScript interface named "AndroidBridge".
 */

declare global {
  interface Window {
    AndroidBridge?: {
      subscribe: () => void;
      isPro?: () => boolean;
    };
  }
}

export function isAndroidWebView(): boolean {
  try {
    return typeof window !== "undefined" && !!window.AndroidBridge;
  } catch {
    return false;
  }
}

export function handleUpgrade(): void {
  try {
    if (
      typeof window !== "undefined" &&
      window.AndroidBridge &&
      typeof window.AndroidBridge.subscribe === "function"
    ) {
      window.AndroidBridge.subscribe();
    } else {
      window.location.href = "/pricing";
    }
  } catch {
    window.location.href = "/pricing";
  }
}
