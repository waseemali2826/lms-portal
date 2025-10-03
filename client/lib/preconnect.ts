export function preconnect(href: string, crossOrigin: boolean = true) {
  try {
    const head = document.head || document.getElementsByTagName("head")[0];
    if (!head) return;
    const exists = head.querySelector(`link[rel=preconnect][href="${href}"]`);
    if (!exists) {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = href;
      if (crossOrigin) link.crossOrigin = "";
      head.appendChild(link);
    }
    const existsDns = head.querySelector(
      `link[rel=dns-prefetch][href="${href}"]`,
    );
    if (!existsDns) {
      const link2 = document.createElement("link");
      link2.rel = "dns-prefetch";
      link2.href = href;
      head.appendChild(link2);
    }
  } catch {
    // noop
  }
}
