(function () {
  const realRows = document.getElementById('realRows');
  const sanitizedRows = document.getElementById('sanitizedRows');
  
  const localFieldCount = document.getElementById('localFieldCount');
  const serverLeakCount = document.getElementById('serverLeakCount');
  
  const metricTotal = document.getElementById('metricTotal');
  const metricRedacted = document.getElementById('metricRedacted');
  const metricTransmitted = document.getElementById('metricTransmitted');
  const metricStatus = document.getElementById('metricStatus');

  function row(label, valueNode, isControl = false, isEmpty = false) {
    const el = document.createElement('div');
    el.className = 'row';

    const l = document.createElement('span');
    l.className = 'row-label';
    l.textContent = label;

    const v = document.createElement('span');
    v.className = 'row-value';
    if (isControl) v.classList.add('control-tag');
    if (isEmpty) v.classList.add('empty-tag');

    if (typeof valueNode === 'string') {
      v.textContent = valueNode;
    } else if (valueNode) {
      v.appendChild(valueNode);
    }

    el.appendChild(l);
    el.appendChild(v);
    return el;
  }

  function redactionBadge() {
    const container = document.createElement('div');
    container.className = 'redaction-bar-container';

    const span = document.createElement('span');
    span.className = 'redaction-bar';
    span.textContent = '████████ [MASKED]';
    span.setAttribute('aria-label', 'redacted');

    container.appendChild(span);
    return container;
  }

  function render(data) {
    realRows.innerHTML = '';
    sanitizedRows.innerHTML = '';

    if (!data || !data.fields || data.fields.length === 0) {
      const emptyLeft = document.createElement('p');
      emptyLeft.className = 'empty-state';
      emptyLeft.textContent = 'No comparison data yet — open a page, then click "View Live Comparison" from the VEIL popup.';
      
      const emptyRight = emptyLeft.cloneNode(true);
      emptyRight.textContent = 'Awaiting active session telemetry...';

      realRows.appendChild(emptyLeft);
      sanitizedRows.appendChild(emptyRight);

      if (localFieldCount) localFieldCount.textContent = '0 Fields Perceived';
      if (serverLeakCount) serverLeakCount.textContent = '0 Raw Values Sent';
      if (metricTotal) metricTotal.textContent = '0';
      if (metricRedacted) metricRedacted.textContent = '0';
      if (metricTransmitted) metricTransmitted.textContent = '0.00%';
      if (metricStatus) metricStatus.textContent = 'READY';
      return;
    }

    let redactedCount = 0;
    const total = data.fields.length;

    data.fields.forEach((field) => {
      const isFormField = field.value !== null;

      // Left Panel: Real values on client
      let realDisplay = '(button/control)';
      let isCtrl = !isFormField;
      let isEmpty = false;

      if (isFormField) {
        if (field.value && field.value.trim()) {
          realDisplay = field.value;
        } else {
          realDisplay = '(empty field)';
          isEmpty = true;
        }
      }

      realRows.appendChild(row(field.label, realDisplay, isCtrl, isEmpty));

      // Right Panel: Sanitized representation for server
      if (isFormField && field.sensitive) {
        redactedCount += 1;
        sanitizedRows.appendChild(row(field.label, redactionBadge(), false, false));
      } else if (isFormField) {
        sanitizedRows.appendChild(row(field.label, '(empty field)', false, true));
      } else {
        sanitizedRows.appendChild(row(field.label, `(action control: <${field.tag}>)`, true, false));
      }
    });

    // Update Summary Header & Footer Metrics
    if (localFieldCount) localFieldCount.textContent = `${total} Elements Active`;
    if (serverLeakCount) serverLeakCount.textContent = `0 Raw Values Transmitted`;
    
    if (metricTotal) metricTotal.textContent = String(total);
    if (metricRedacted) metricRedacted.textContent = String(redactedCount);
    if (metricTransmitted) metricTransmitted.textContent = '0.00%';
    if (metricStatus) metricStatus.textContent = 'PASS';
  }

  // Load from session storage
  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.session) {
    chrome.storage.session.get('veilComparison', (result) => {
      render(result && result.veilComparison);
    });
  } else {
    render(null);
  }
})();
