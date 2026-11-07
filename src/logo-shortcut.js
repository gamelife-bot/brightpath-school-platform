/**
 * Brand navigation: single tap opens the public landing page,
 * five consecutive taps open the owner login route.
 * This is a navigation shortcut, never authentication or authorization.
 */
export function enableBrandShortcut({ homeUrl, ownerUrl }) {
  let count = 0;
  let lastTap = 0;
  let navigateTimer = null;
  let resetTimer = null;
  const isHome = () => {
    const current = new URL(window.location.href);
    const home = new URL(homeUrl, window.location.origin);
    const root = home.pathname.replace(/home\/$/, "");
    return current.pathname === home.pathname || current.pathname === root;
  };

  document.addEventListener("click", (event) => {
    const logo = event.target?.closest?.("a.brand-home, a.mark-logo");
    if (!logo || event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;

    // Keyboard navigation keeps normal link behavior.
    if (event.detail === 0) return;

    event.preventDefault();
    const now = Date.now();
    count = now - lastTap <= 1800 ? count + 1 : 1;
    lastTap = now;

    window.clearTimeout(resetTimer);
    window.clearTimeout(navigateTimer);
    if (count >= 5) {
      count = 0;
      window.location.assign(ownerUrl);
      return;
    }

    resetTimer = window.setTimeout(() => { count = 0; }, 1800);
    // On the homepage, stay put so repeated taps can be counted.
    // From a private portal, allow a brief window for a five-tap shortcut.
    if (!isHome()) {
      navigateTimer = window.setTimeout(() => {
        count = 0;
        window.location.assign(homeUrl);
      }, 1250);
    }
  });
}
