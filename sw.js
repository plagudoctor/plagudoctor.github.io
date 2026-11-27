// Service worker: receives pushes from the desktop YT Notifier and shows them.

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open("ytn", 1);
    r.onupgradeneeded = () => r.result.createObjectStore("items", { keyPath: "key", autoIncrement: true });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

async function saveItem(item) {
  try {
    const db = await openDB();
    await new Promise((res, rej) => {
      const tx = db.transaction("items", "readwrite");
      tx.objectStore("items").add(item);
      tx.oncomplete = res;
      tx.onerror = () => rej(tx.error);
    });
  } catch (e) { /* history is best-effort */ }
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(self.clients.claim()));

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; }
  catch { data = { title: "YT Notifier", body: event.data ? event.data.text() : "" }; }
  const title = data.title || "YT Notifier";
  const body = data.body || "";
  const url = data.url || "./";

  event.waitUntil((async () => {
    // iOS requires a notification for every push, so always show one.
    await self.registration.showNotification(title, {
      body,
      icon: "icon-192.png",
      badge: "icon-192.png",
      tag: data.id || undefined,
      data: { url },
    });
    await saveItem({ title, body, url, time: Date.now() });
    const wins = await self.clients.matchAll({ type: "window" });
    wins.forEach(w => w.postMessage("new-item"));
  })());
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil(self.clients.openWindow(url));
});
