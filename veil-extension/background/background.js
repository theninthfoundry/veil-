/**
 * VEIL — background service worker
 *
 * Holds the most recent stats per tab (content scripts push, popup pulls),
 * and performs the one network call this extension makes: POST /act to the
 * local server, with the already-sanitized context the content script built.
 * This runs from the service worker rather than the content script so it's
 * never subject to the page's own CSP.
 */

const SERVER_URL = 'http://127.0.0.1:8000/act';

const statsByTab = new Map();

async function callServer(task, context) {
  const res = await fetch(SERVER_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task, page: context }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`server responded ${res.status}: ${body.slice(0, 200)}`);
  }
  return res.json();
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'VEIL_STATS' && sender.tab) {
    statsByTab.set(sender.tab.id, message.payload);
    return false;
  }

  if (message.type === 'VEIL_GET_STATS') {
    const stats = statsByTab.get(message.tabId) || null;
    sendResponse({ stats });
    return true;
  }

  if (message.type === 'VEIL_RUN_TASK_SERVER_CALL') {
    callServer(message.task, message.context)
      .then((action) => sendResponse({ ok: true, action }))
      .catch((err) => sendResponse({ ok: false, error: String(err && err.message ? err.message : err) }));
    return true; // keep the message channel open for the async response
  }

  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => statsByTab.delete(tabId));
