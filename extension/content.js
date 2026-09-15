// SAFNEX NOVA Extension - Content Script

let isCheckingLink = false;

// Intercept all link clicks
document.addEventListener('click', function(e) {
  // Find closest anchor tag
  const link = e.target.closest('a');

  if (!link || !link.href) return;

  // Skip internal links and special protocols
  if (link.href.startsWith('#') ||
      link.href.startsWith('javascript:') ||
      link.href.startsWith('mailto:') ||
      link.href.startsWith('tel:')) {
    return;
  }

  // Skip if same domain
  try {
    const linkHost = new URL(link.href).hostname;
    const currentHost = window.location.hostname;
    if (linkHost === currentHost) return;
  } catch (err) {
    return;
  }

  // Prevent default navigation
  e.preventDefault();
  e.stopPropagation();

  // Check link safety
  if (!isCheckingLink) {
    checkLinkBeforeNavigate(link.href);
  }
}, true);

async function checkLinkBeforeNavigate(url) {
  isCheckingLink = true;

  // Show loading overlay
  showSafnexPopup(url, { loading: true });

  try {
    // Send to background script for API check
    const response = await new Promise((resolve) => {
      chrome.runtime.sendMessage(
        { action: "checkLink", url },
        resolve
      );
    });

    if (response.success) {
      showSafnexPopup(url, response.result);
    } else {
      showSafnexPopup(url, { error: true });
    }
  } catch (error) {
    console.error("SAFNEX check failed:", error);
    showSafnexPopup(url, { error: true });
  }

  isCheckingLink = false;
}

function showSafnexPopup(url, result) {
  // Remove existing popup
  const existing = document.getElementById('safnex-popup-overlay');
  if (existing) existing.remove();

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'safnex-popup-overlay';
  overlay.className = 'safnex-overlay';

  let content = '';

  if (result.loading) {
    content = `
      <div class="safnex-popup">
        <div class="safnex-header">
          <div class="safnex-logo">🛡️ SAFNEX NOVA</div>
        </div>
        <div class="safnex-body">
          <div class="safnex-spinner"></div>
          <h3>Checking Link Safety...</h3>
          <p class="safnex-url">${escapeHtml(url)}</p>
        </div>
      </div>
    `;
  } else if (result.error) {
    content = `
      <div class="safnex-popup">
        <div class="safnex-header">
          <div class="safnex-logo">🛡️ SAFNEX NOVA</div>
          <button class="safnex-close" onclick="this.closest('.safnex-overlay').remove()">✕</button>
        </div>
        <div class="safnex-body">
          <div class="safnex-icon safnex-warning">⚠️</div>
          <h3>Could Not Check Link</h3>
          <p class="safnex-url">${escapeHtml(url)}</p>
          <div class="safnex-actions">
            <button class="safnex-btn safnex-btn-secondary" onclick="this.closest('.safnex-overlay').remove()">Cancel</button>
            <button class="safnex-btn safnex-btn-primary" onclick="window.location.href='${escapeHtml(url)}'">Visit Anyway</button>
          </div>
        </div>
      </div>
    `;
  } else {
    const riskScore = result.riskScore || 0;
    const riskLevel = result.riskLevel || "UNKNOWN";
    const verdict = result.verdict || "Analysis incomplete";

    let icon = '✓';
    let iconClass = 'safnex-safe';
    let primaryAction = `window.location.href='${escapeHtml(url)}'`;
    let primaryLabel = 'Visit Site';

    if (riskLevel === "HIGH" || riskLevel === "CRITICAL") {
      icon = '⚠️';
      iconClass = 'safnex-danger';
      primaryAction = `window.open('https://safnex-nova.onrender.com/link-detector.html?url=${encodeURIComponent(url)}', '_blank')`;
      primaryLabel = 'Check in SAFNEX';
    } else if (riskLevel === "MEDIUM" || riskLevel === "SUSPICIOUS") {
      icon = '⚠️';
      iconClass = 'safnex-warning';
      primaryAction = `window.location.href='${escapeHtml(url)}'`;
      primaryLabel = 'Visit Anyway';
    }

    const reasons = result.reasons || [];
    const reasonsHtml = reasons.length ?
      `<ul class="safnex-reasons">${reasons.map(r => `<li>${escapeHtml(r)}</li>`).join('')}</ul>` : '';

    content = `
      <div class="safnex-popup">
        <div class="safnex-header">
          <div class="safnex-logo">🛡️ SAFNEX NOVA</div>
          <button class="safnex-close" onclick="this.closest('.safnex-overlay').remove()">✕</button>
        </div>
        <div class="safnex-body">
          <div class="safnex-icon ${iconClass}">${icon}</div>
          <h3>${riskLevel} RISK</h3>
          <div class="safnex-score">Risk Score: ${riskScore}%</div>
          <p class="safnex-verdict">${escapeHtml(verdict)}</p>
          <p class="safnex-url">${escapeHtml(url)}</p>
          ${reasonsHtml}
          <div class="safnex-actions">
            <button class="safnex-btn safnex-btn-secondary" onclick="this.closest('.safnex-overlay').remove()">Cancel</button>
            <button class="safnex-btn safnex-btn-primary" onclick="${primaryAction}">${primaryLabel}</button>
          </div>
          <a href="https://safnex-nova.onrender.com/link-detector.html?url=${encodeURIComponent(url)}" target="_blank" class="safnex-full-report">View Full Report →</a>
        </div>
      </div>
    `;
  }

  overlay.innerHTML = content;
  document.body.appendChild(overlay);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Signal extension is installed
document.documentElement.setAttribute('data-safnex-installed', 'true');
