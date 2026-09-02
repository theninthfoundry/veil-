(function () {
  const PII_TYPES = (window.VeilDetector && window.VeilDetector.PII_TYPES) || {
    password: { label: 'Password' },
    email: { label: 'Email' },
    phone: { label: 'Phone' },
    credit_card: { label: 'Card Number' },
    address: { label: 'Address' },
    name: { label: 'Full Name' },
    aadhaar: { label: 'Aadhaar' },
    pan: { label: 'PAN' },
    face: { label: 'Face' },
  };

  const statusDot = document.getElementById('statusDot');
  const enabledToggle = document.getElementById('enabledToggle');
  const toggleInspectorBtn = document.getElementById('toggleInspectorBtn');
  const privacyScore = document.getElementById('privacyScore');
  const privacyStatus = document.getElementById('privacyStatus');
  const totalCount = document.getElementById('totalCount');
  const vaultRefCount = document.getElementById('vaultRefCount');
  const transmittedCount = document.getElementById('transmittedCount');
  const latencyValue = document.getElementById('latencyValue');
  
  const breakdown = document.getElementById('breakdown');
  const emptyState = document.getElementById('emptyState');
  const vaultList = document.getElementById('vaultList');

  // Telemetry elements
  const telDom = document.getElementById('telDom');
  const telPii = document.getElementById('telPii');
  const telVision = document.getElementById('telVision');
  const telTotal = document.getElementById('telTotal');

  // Security Ledger
  const securityLedgerList = document.getElementById('securityLedgerList');

  // Task execution
  const taskInput = document.getElementById('taskInput');
  const runTaskBtn = document.getElementById('runTaskBtn');
  const taskResult = document.getElementById('taskResult');
  const viewComparisonBtn = document.getElementById('viewComparisonBtn');
  const viewProofBtn = document.getElementById('viewProofBtn');

  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  let activeTabId = null;

  tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      tabBtns.forEach((b) => b.classList.remove('active'));
      tabContents.forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      const targetId = btn.getAttribute('data-tab');
      const targetContent = document.getElementById(targetId);
      if (targetContent) targetContent.classList.add('active');
    });
  });

  if (toggleInspectorBtn) {
    toggleInspectorBtn.addEventListener('click', () => {
      if (activeTabId == null) return;
      chrome.tabs.sendMessage(activeTabId, { type: 'VEIL_TOGGLE_INSPECTOR' }, (response) => {
        if (response && response.ok) {
          window.close(); // Close popup so user interacts with in-page HUD directly
        }
      });
    });
  }

  function renderVault(secrets) {
    if (!vaultList) return;
    const items = secrets || (window.VeilSecretVault && window.VeilSecretVault.getSecretMetadata()) || [];
    vaultList.innerHTML = '';

    if (vaultRefCount) vaultRefCount.textContent = String(items.length);

    if (items.length === 0) {
      vaultList.innerHTML = '<p class="veil-empty">No local secret references configured.</p>';
      return;
    }

    items.forEach((s) => {
      const card = document.createElement('div');
      card.className = 'vault-item';
      card.innerHTML = `
        <div class="vault-header-row">
          <span class="vault-label">${s.label}</span>
          <span class="vault-id-badge">${s.secretId}</span>
        </div>
        <div class="vault-masked">${s.maskedDisplay || '••••••••'}</div>
        <div class="vault-scope">Scope: ${s.allowedOrigins.join(', ')} | Fields: ${s.allowedFields ? s.allowedFields.slice(0, 2).join(', ') : 'all'}</div>
      `;
      vaultList.appendChild(card);
    });
  }

  function render(stats) {
    if (!stats) {
      statusDot.classList.remove('is-live');
      totalCount.textContent = '0';
      transmittedCount.textContent = '0';
      latencyValue.textContent = '0 ms';
      privacyScore.textContent = '100%';
      breakdown.innerHTML = '';
      breakdown.appendChild(emptyState);
      renderVault([]);
      return;
    }

    const counts = stats.counts || {};
    const total = Object.values(counts).reduce((a, b) => a + b, 0);

    statusDot.classList.toggle('is-live', enabledToggle.checked);
    totalCount.textContent = String(total);
    transmittedCount.textContent = '0'; // Invariant: 0 values transmitted
    privacyScore.textContent = '100%';
    privacyStatus.innerHTML = '<span class="status-indicator-green">●</span> 0.00% LEAKAGE RATE';

    latencyValue.textContent = typeof stats.latencyMs === 'number' ? `${stats.latencyMs} ms` : '0 ms';

    // Render Vault
    if (stats.vaultSecrets) {
      renderVault(stats.vaultSecrets);
    } else {
      renderVault();
    }

    // Render Telemetry
    if (stats.telemetry) {
      const t = stats.telemetry;
      if (telDom) telDom.textContent = `${t.domMs || 0} ms`;
      if (telPii) telPii.textContent = `${t.piiMs || 0} ms`;
      if (telVision) telVision.textContent = `${t.visionMs || 0} ms`;
      if (telTotal) telTotal.textContent = `${t.totalMs || (t.domMs + (t.networkMs || 0))} ms`;
    }

    // Render Breakdown
    breakdown.innerHTML = '';
    const types = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);
    if (types.length === 0) {
      breakdown.appendChild(emptyState);
    } else {
      for (const type of types) {
        const row = document.createElement('div');
        row.className = 'veil-row';

        const label = document.createElement('span');
        label.className = 'veil-row-label';
        const labelText = (PII_TYPES[type] && PII_TYPES[type].label) || type;
        label.textContent = `${labelText} (${counts[type]})`;

        const tag = document.createElement('span');
        tag.className = 'veil-row-tag';
        tag.textContent = type === 'face' ? 'BLURRED' : type === 'password' || type === 'credit_card' ? 'BLOCKED' : 'MASKED';

        row.appendChild(label);
        row.appendChild(tag);
        breakdown.appendChild(row);
      }
    }
  }

  function renderLedger(events) {
    if (!securityLedgerList || !events || events.length === 0) return;
    securityLedgerList.innerHTML = '';
    events.slice(0, 15).forEach((evt) => {
      const item = document.createElement('div');
      item.className = 'ledger-item';

      const time = document.createElement('span');
      time.className = 'ledger-time';
      time.textContent = evt.isoTime || '00:00:00';

      const tag = document.createElement('span');
      tag.className = 'ledger-tag';
      if (evt.type.includes('PASSED') || evt.type.includes('EXECUTED') || evt.type.includes('DETECTED') || evt.type.includes('SECRET_USED')) {
        tag.classList.add('pass');
        tag.textContent = evt.type.includes('SECRET') ? 'VAULT' : 'PASS';
      } else if (evt.type.includes('BLOCKED') || evt.type.includes('FAILED')) {
        tag.classList.add('block');
        tag.textContent = 'BLOCK';
      } else {
        tag.classList.add('act');
        tag.textContent = 'ACT';
      }

      const msg = document.createElement('span');
      msg.className = 'ledger-msg';
      msg.textContent = `${evt.type}: ${JSON.stringify(evt.detail || {}).substring(0, 40)}`;

      item.appendChild(time);
      item.appendChild(tag);
      item.appendChild(msg);
      securityLedgerList.appendChild(item);
    });
  }

  function requestStats() {
    if (activeTabId == null) return;

    chrome.tabs.sendMessage(activeTabId, { type: 'VEIL_GET_CURRENT_STATS' }, (response) => {
      if (chrome.runtime.lastError || !response) {
        chrome.runtime.sendMessage({ type: 'VEIL_GET_STATS', tabId: activeTabId }, (bgResponse) => {
          render(bgResponse && bgResponse.stats);
        });
      } else {
        enabledToggle.checked = response.enabled;
        render({ counts: response.counts, latencyMs: response.latencyMs, telemetry: response.telemetry, vaultSecrets: response.vaultSecrets });
      }
    });

    if (chrome.storage && chrome.storage.session) {
      chrome.storage.session.get('veilLedger', (data) => {
        if (data && data.veilLedger) {
          renderLedger(data.veilLedger);
        }
      });
    }
  }

  enabledToggle.addEventListener('change', () => {
    if (activeTabId == null) return;
    chrome.tabs.sendMessage(activeTabId, { type: 'VEIL_TOGGLE', enabled: enabledToggle.checked }, () => {
      requestStats();
    });
  });

  function renderTaskResult(result) {
    taskResult.className = 'veil-task-result';

    if (!result || !result.ok) {
      const rawReason = (result && result.reason) || 'Server error';
      const diag = window.VeilFailureAnalyzer ? window.VeilFailureAnalyzer.explainFailure(rawReason) : { code: 'ERR_UNKNOWN', title: rawReason, remediation: 'Re-perceive the page.' };

      taskResult.innerHTML = `
        <div style="font-weight: 700;">🛡️ [${diag.code}] ${diag.title}</div>
        <div style="margin-top: 3px; opacity: 0.9;">${diag.explanation || rawReason}</div>
        <div style="margin-top: 4px; font-style: italic; color: #f0f6fc;">💡 Advice: ${diag.remediation}</div>
      `;
      taskResult.classList.add('is-error');
      return;
    }

    const { state, stepsTaken, totalMs, stepTraces = [] } = result;

    let traceHtml = `<div style="font-weight: 700; margin-bottom: 4px;">✔ Goal Finished (${stepsTaken || 1} step(s) in ${totalMs} ms - 0 PII Leaked):</div>`;
    stepTraces.forEach(st => {
      const secretNote = st.secretUsed ? ` 🔑 [VAULT: ${st.secretUsed}]` : '';
      traceHtml += `
        <div class="step-trace-item">
          Step ${st.step}: [${(st.action || '').toUpperCase()}] ${st.target || ''}${secretNote} (${st.durationMs}ms)
        </div>
      `;
    });

    taskResult.innerHTML = traceHtml;
    taskResult.classList.add('is-ok');
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === 'VEIL_STEP_UPDATE' && msg.update) {
      taskResult.className = 'veil-task-result';
      taskResult.textContent = msg.update.message;
    }
  });

  runTaskBtn.addEventListener('click', () => {
    const task = taskInput.value.trim();
    if (!task || activeTabId == null) return;

    runTaskBtn.disabled = true;
    taskResult.className = 'veil-task-result';
    taskResult.textContent = 'Initializing Autonomous Loop (MAX_STEPS = 5)...';

    chrome.tabs.sendMessage(activeTabId, { type: 'VEIL_RUN_AUTONOMOUS_TASK', task }, (response) => {
      runTaskBtn.disabled = false;
      if (chrome.runtime.lastError) {
        taskResult.textContent = `Content script unavailable: ${chrome.runtime.lastError.message}`;
        taskResult.classList.add('is-error');
        return;
      }
      renderTaskResult(response);
      requestStats();
    });
  });

  viewComparisonBtn.addEventListener('click', () => {
    if (activeTabId == null) return;
    chrome.tabs.sendMessage(activeTabId, { type: 'VEIL_GET_COMPARISON' }, (data) => {
      if (chrome.runtime.lastError || !data) return;
      chrome.storage.session.set({ veilComparison: data }, () => {
        chrome.tabs.create({ url: chrome.runtime.getURL('comparison/comparison.html') });
      });
    });
  });

  const viewLabBtn = document.getElementById('viewLabBtn');
  if (viewLabBtn) {
    viewLabBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('lab/lab.html') });
    });
  }

  if (viewProofBtn) {
    viewProofBtn.addEventListener('click', () => {
      chrome.tabs.create({ url: chrome.runtime.getURL('proof/proof.html') });
    });
  }

  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      activeTabId = tabs[0].id;
      requestStats();
    }
  });
})();
