/**
 * VEIL — background service worker
 *
 * Holds the most recent stats per tab (content scripts push, popup pulls),
 * and relays toggle commands from the popup to the active tab's content
 * script. No network calls here — phase 1 has no server component yet.
 */

const statsByTab = new Map();

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

  return false;
});

chrome.tabs.onRemoved.addListener((tabId) => statsByTab.delete(tabId));
