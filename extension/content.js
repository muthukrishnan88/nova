// SAFNEX NOVA Extension - Content Script with Debug Logging

console.log('🛡️ SAFNEX: Content script loaded');

let isCheckingLink = false;

// Intercept all link clicks
document.addEventListener('click', function(e) {
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

  console.log('🛡️ SAFNEX: External link clicked:', link.href);

  // Prevent default navigation
  e.preventDefault();
  e.stopPropagation();

  // Show popup immediately
  if (!isCheckingLink) {
    showSafnexPopup(link.href);
  }
}, true);

function showSafnexPopup(url) {
  console.log('🛡️ SAFNEX: Creating popup for:', url);

  // Remove existing popup
  const existing = document.getElementById('safnex-popup-overlay');
  if (existing) {
    console.log('🛡️ SAFNEX: Removing existing popup');
    existing.remove();
  }

  // Create overlay
  const overlay = document.createElement('div');
  overlay.id = 'safnex-popup-overlay';
  overlay.className = 'safnex-overlay';

  overlay.innerHTML = `
    <div class="safnex-popup">
      <div class="safnex-header">
        <div class="safnex-logo">🛡️ SAFNEX NOVA</div>
        <button class="safnex-close" id="safnex-close-btn">✕</button>
      </div>
      <div class="safnex-body">
        <div class="safnex-icon-simple">🔒</div>
        <h3>Link Protection</h3>
        <p class="safnex-url">${escapeHtml(url)}</p>
        <div class="safnex-actions">
          <button class="safnex-btn safnex-btn-secondary" id="safnex-check-btn">Check Website</button>
          <button class="safnex-btn safnex-btn-primary" id="safnex-open-btn">Open Directly</button>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
  console.log('🛡️ SAFNEX: Popup added to DOM');

  // Attach event listeners with debug logging
  setTimeout(() => {
    const closeBtn = document.getElementById('safnex-close-btn');
    const checkBtn = document.getElementById('safnex-check-btn');
    const openBtn = document.getElementById('safnex-open-btn');

    console.log('🛡️ SAFNEX: Attaching event listeners');
    console.log('  Close button:', closeBtn ? '✓ Found' : '✗ Not found');
    console.log('  Check button:', checkBtn ? '✓ Found' : '✗ Not found');
    console.log('  Open button:', openBtn ? '✓ Found' : '✗ Not found');

    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        console.log('🛡️ SAFNEX: Close button clicked');
        overlay.remove();
      });
    }

    if (checkBtn) {
      checkBtn.addEventListener('click', function() {
        console.log('🛡️ SAFNEX: Check Website button clicked');
        const analyzeUrl = `https://safnex-nova.onrender.com/link-detector.html?url=${encodeURIComponent(url)}`;
        console.log('  Opening:', analyzeUrl);
        window.open(analyzeUrl, '_blank');
      });
    }

    if (openBtn) {
      openBtn.addEventListener('click', function() {
        console.log('🛡️ SAFNEX: Open Directly button clicked');
        console.log('  Navigating to:', url);
        window.location.href = url;
      });
    }

    console.log('🛡️ SAFNEX: All event listeners attached');
  }, 100);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Signal extension is installed
document.documentElement.setAttribute('data-safnex-installed', 'true');
console.log('🛡️ SAFNEX: Extension initialized successfully');
