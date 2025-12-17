import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "seenHNModal";

const cameFromHackerNews = () => {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("ref")?.toLowerCase() === "hn") return true;
  } catch (_) {
    // ignore malformed search params
  }

  try {
    return (document.referrer || "").includes("news.ycombinator.com");
  } catch (_) {
    return false;
  }
};

export function useHackerNewsNotice({ canShow = true } = {}) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    if (!canShow) return;
    const hasSeen = localStorage.getItem(STORAGE_KEY) === "true";
    if (hasSeen) return;
    if (cameFromHackerNews()) {
      setShouldShow(true);
    }
  }, [canShow]);

  const dismiss = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, "true");
    setShouldShow(false);
  }, []);

  return { shouldShow, dismiss };
}
