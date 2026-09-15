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
          <h3>Verifying Link...</h3>
          <p class="safnex-url">${escapeHtml(url)}</p>
        </div>
      </div>
    `;
  } else {
    // Simple professional popup - no risk scores
    content = `
      <div class="safnex-popup">
        <div class="safnex-header">
          <div class="safnex-logo">🛡️ SAFNEX NOVA</div>
          <button class="safnex-close">✕</button>
        </div>
        <div class="safnex-body">
          <div class="safnex-icon-simple">🔒</div>
          <h3>Link Protection</h3>
          <p class="safnex-url">${escapeHtml(url)}</p>
          <div class="safnex-actions">
            <button class="safnex-btn safnex-btn-secondary" data-action="check" data-url="${url}">Check Website</button>
            <button class="safnex-btn safnex-btn-primary" data-action="open" data-url="${url}">Open Directly</button>
          </div>
        </div>
      </div>
    `;
  }

  overlay.innerHTML = content;
  document.body.appendChild(overlay);

  // Attach event listeners (CSP-compliant)
  const closeBtn = overlay.querySelector('.safnex-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => overlay.remove());
  }

  const checkBtn = overlay.querySelector('[data-action="check"]');
  if (checkBtn) {
    const targetUrl = checkBtn.getAttribute('data-url');
    checkBtn.addEventListener('click', () => {
      window.open(`https://safnex-nova.onrender.com/link-detector.html?url=${encodeURIComponent(targetUrl)}`, '_blank');
    });
  }

  const openBtn = overlay.querySelector('[data-action="open"]');
  if (openBtn) {
    const targetUrl = openBtn.getAttribute('data-url');
    openBtn.addEventListener('click', () => {
      window.location.href = targetUrl;
    });
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Signal extension is installed
document.documentElement.setAttribute('data-safnex-installed', 'true');
