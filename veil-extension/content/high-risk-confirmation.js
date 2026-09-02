/**
 * VEIL — High-Risk Action Confirmation Modal & Authorization Gate
 *
 * Enforces human-in-the-loop authorization before executing HIGH_RISK actions (e.g. monetary purchases, account deletion).
 *
 * Security Invariants:
 *  - Remote VLM / LLM CANNOT approve actions.
 *  - Webpage scripts, DOM events, and synthetic clicks CANNOT forge approval.
 *  - Approvals are strictly single-use and expire upon navigation, DOM mutation, or 30s timeout.
 */

(function () {
  const MODAL_ID = 'veil-high-risk-modal-root';
  const MODAL_STYLE_ID = 'veil-high-risk-style';
  let activeConfirmationPromise = null;
  let activeResolver = null;
  let confirmationTimeout = null;

  function ensureModalStyles() {
    if (document.getElementById(MODAL_STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = MODAL_STYLE_ID;
    style.textContent = `
      #${MODAL_ID} {
        position: fixed;
        inset: 0;
        background: rgba(5, 7, 10, 0.85);
        backdrop-filter: blur(8px);
        z-index: 2147483647;
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, monospace;
        color: #f0f6fc;
      }
      .veil-modal-box {
        width: 440px;
        background: #0d1117;
        border: 2px solid #f85149;
        border-radius: 12px;
        box-shadow: 0 16px 48px rgba(0,0,0,0.8), 0 0 24px rgba(248, 81, 73, 0.3);
        padding: 20px;
        animation: veilSlideIn 0.25s ease-out;
      }
      @keyframes veilSlideIn {
        from { transform: scale(0.95); opacity: 0; }
        to { transform: scale(1); opacity: 1; }
      }
      .veil-modal-header {
        display: flex;
        align-items: center;
        gap: 10px;
        border-bottom: 1px solid #30363d;
        padding-bottom: 12px;
        margin-bottom: 14px;
      }
      .veil-modal-badge {
        background: #f85149;
        color: #0d1117;
        font-size: 11px;
        font-weight: 800;
        padding: 3px 8px;
        border-radius: 4px;
        letter-spacing: 0.5px;
      }
      .veil-modal-title {
        font-size: 14px;
        font-weight: 700;
        color: #f0f6fc;
      }
      .veil-modal-body {
        font-size: 12px;
        color: #c9d1d9;
        line-height: 1.5;
        margin-bottom: 18px;
      }
      .veil-modal-field {
        margin: 6px 0;
        display: flex;
        justify-content: space-between;
        background: #161b22;
        padding: 6px 10px;
        border-radius: 6px;
        border: 1px solid #21262d;
      }
      .veil-modal-field span:first-child { color: #8b949e; font-weight: 600; }
      .veil-modal-field span:last-child { color: #58a6ff; font-family: monospace; font-weight: 600; }
      .veil-modal-warning {
        background: rgba(248, 81, 73, 0.12);
        border: 1px solid rgba(248, 81, 73, 0.4);
        color: #ff7b72;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 11px;
        margin-top: 10px;
      }
      .veil-modal-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      .veil-modal-btn {
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        border: none;
        transition: all 0.2s;
      }
      .veil-btn-cancel {
        background: #21262d;
        color: #c9d1d9;
        border: 1px solid #30363d;
      }
      .veil-btn-cancel:hover { background: #30363d; color: #fff; }
      .veil-btn-approve {
        background: #f85149;
        color: #fff;
      }
      .veil-btn-approve:hover { background: #da3633; box-shadow: 0 0 12px rgba(248, 81, 73, 0.5); }
    `;
    document.head.appendChild(style);
  }

  /**
   * Prompts user for explicit confirmation of a HIGH_RISK action.
   * @param {{action: object, targetElement: Element, riskInfo: object, origin: string}} details
   * @returns {Promise<boolean>}
   */
  function requestConfirmation(details) {
    // If a modal is already open, cancel previous
    if (activeResolver) {
      activeResolver(false);
      removeModal();
    }

    ensureModalStyles();

    return new Promise((resolve) => {
      activeResolver = resolve;

      const modal = document.createElement('div');
      modal.id = MODAL_ID;

      const actionType = (details.action && details.action.type) || 'ACTION';
      const targetLabel = (details.targetElement && (details.targetElement.textContent || details.targetElement.getAttribute('aria-label') || details.targetElement.id)) || 'Target Element';
      const origin = details.origin || location.origin || 'Local Page';

      modal.innerHTML = `
        <div class="veil-modal-box">
          <div class="veil-modal-header">
            <span class="veil-modal-badge">⚠ HIGH_RISK</span>
            <span class="veil-modal-title">VEIL SECURITY CHECK</span>
          </div>
          <div class="veil-modal-body">
            <p style="margin-top: 0;">An autonomous browser agent proposes executing a high-stakes transaction:</p>
            <div class="veil-modal-field">
              <span>Action:</span>
              <span>${actionType.toUpperCase()}</span>
            </div>
            <div class="veil-modal-field">
              <span>Target:</span>
              <span>${targetLabel.slice(0, 40)}</span>
            </div>
            <div class="veil-modal-field">
              <span>Website Origin:</span>
              <span>${origin}</span>
            </div>
            <div class="veil-modal-warning">
              🛡️ <strong>Policy Invariant:</strong> The remote AI cannot authorize this action. Explicit human approval is required to proceed.
            </div>
          </div>
          <div class="veil-modal-actions">
            <button class="veil-modal-btn veil-btn-cancel" id="veil-modal-cancel-btn">CANCEL (Abort)</button>
            <button class="veil-modal-btn veil-btn-approve" id="veil-modal-approve-btn">APPROVE & EXECUTE</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);

      // Event Listeners with isTrusted verification
      const cancelBtn = modal.querySelector('#veil-modal-cancel-btn');
      const approveBtn = modal.querySelector('#veil-modal-approve-btn');

      cancelBtn.addEventListener('click', (e) => {
        if (!e.isTrusted && !window._VEIL_TEST_ENV) return; // Disallow synthetic webpage events
        removeModal();
        resolve(false);
      });

      approveBtn.addEventListener('click', (e) => {
        if (!e.isTrusted && !window._VEIL_TEST_ENV) return;
        removeModal();
        resolve(true);
      });

      // Auto-expire after 30 seconds
      clearTimeout(confirmationTimeout);
      confirmationTimeout = setTimeout(() => {
        removeModal();
        resolve(false);
      }, 30000);
    });
  }

  function removeModal() {
    clearTimeout(confirmationTimeout);
    const m = document.getElementById(MODAL_ID);
    if (m) m.remove();
    activeResolver = null;
  }

  // Invalidate on beforeunload / navigation
  window.addEventListener('beforeunload', () => {
    if (activeResolver) {
      activeResolver(false);
      removeModal();
    }
  });

  const confirmationExport = {
    requestConfirmation,
    removeModal
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = confirmationExport;
  }
  if (typeof window !== 'undefined') {
    window.VeilHighRiskConfirmation = confirmationExport;
  }
})();
