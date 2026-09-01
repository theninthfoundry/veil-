(function () {
  const PII_TYPES = window.VeilDetector.PII_TYPES;

  const statusDot = document.getElementById('statusDot');
  const enabledToggle = document.getElementById('enabledToggle');
  const totalCount = document.getElementById('totalCount');
  const latencyValue = document.getElementById('latencyValue');
  const breakdown = document.getElementById('breakdown');
  const emptyState = document.getElementById('emptyState');

  let activeTabId = null;

  function render(stats) {
    if (!stats) {
      statusDot.classList.remove('is-live');
      totalCount.textContent = '0';
      latencyValue.textContent = '\u2014';
      breakdown.innerHTML = '';
      breakdown.appendChild(emptyState);
      return;
    }

    const counts = stats.counts || {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    statusDot.classList.toggle('is-live', total > 0 && enabledToggle.checked);
    totalCount.textContent = String(total);
    latencyValue.textContent = typeof stats.latencyMs === 'number' ? `${stats.latencyMs} ms` : '\u2014';

    breakdown.innerHTML = '';
    const types = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    if (types.length === 0) {
      breakdown.appendChild(emptyState);
      return;
    }
    for (const type of types) {
      const row = document.createElement('div');
      row.className = 'veil-row';

      const label = document.createElement('span');
      label.className = 'veil-row-label';
      label.textContent = (PII_TYPES[type] && PII_TYPES[type].label) || type;

      const count = document.createElement('span');
      count.className = 'veil-row-count';
      count.textContent = String(counts[type]);

      row.appendChild(label);
      row.appendChild(count);
      breakdown.appendChild(row);
    }
  }

  function requestStats() {
    if (activeTabId == null) return;

    chrome.tabs.sendMessage(activeTabId, { type: 'VEIL_GET_CURRENT_STATS' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        // No content script here (e.g. a chrome:// or extension-store page) —
        // fall back to whatever the background worker last cached.
        chrome.runtime.sendMessage({ type: 'VEIL_GET_STATS', tabId: activeTabId }, (bgResponse) => {
          render(bgResponse && bgResponse.stats);
        });
        return;
      }
      enabledToggle.checked = response.enabled;
      render({ counts: response.counts, latencyMs: response.latencyMs });
    });
  }

  enabledToggle.addEventListener('change', () => {
    if (activeTabId == null) return;
    chrome.tabs.sendMessage(activeTabId, { type: 'VEIL_TOGGLE', enabled: enabledToggle.checked }, () => {
      requestStats();
    });
  });

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      activeTabId = tabs[0].id;
      requestStats();
    }
  });
})();
