// ======================================================
// SAFNEX NOVA LINK GUARD
// Content Script
// ======================================================

const SAFNEX_REPORT_URL =
  "https://safnex-nova.onrender.com/link-detector.html";

let isCheckingLink = false;


// ======================================================
// MARK EXTENSION AS INSTALLED
// ======================================================

document.documentElement.setAttribute(
  "data-safnex-installed",
  "true"
);


// ======================================================
// RECEIVE NAVIGATION WARNING FROM BACKGROUND
// ======================================================

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {

    // --------------------------------------------------
    // BACKGROUND NAVIGATION WARNING
    // --------------------------------------------------

    if (request.action === "showWarning") {

      const result =
        request.result || {};

      const url =
        result.url ||
        window.location.href;


      console.log(
        "SAFNEX navigation warning:",
        url,
        result
      );


      showSafnexPopup(
        url,
        result
      );


      sendResponse({
        success: true
      });


      return false;
    }


    // --------------------------------------------------
    // UNKNOWN MESSAGE
    // --------------------------------------------------

    return false;

  }
);


// ======================================================
// PROTECT EXTERNAL LINK CLICKS
// ======================================================

document.addEventListener(
  "click",
  function (event) {

    const link =
      event.target.closest?.("a");


    if (!link) {
      return;
    }


    if (!link.href) {
      return;
    }


    const href =
      link.href;


    // --------------------------------------------------
    // IGNORE SPECIAL LINKS
    // --------------------------------------------------

    if (
      href.startsWith("#") ||
      href.startsWith("javascript:") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("data:")
    ) {

      return;

    }


    // --------------------------------------------------
    // PARSE URL
    // --------------------------------------------------

    let targetURL;


    try {

      targetURL =
        new URL(href);

    }

    catch (error) {

      return;

    }


    // --------------------------------------------------
    // IGNORE CURRENT WEBSITE
    // --------------------------------------------------

    if (
      targetURL.hostname ===
      window.location.hostname
    ) {

      return;

    }


    // --------------------------------------------------
    // IGNORE EXTENSION / INTERNAL URLS
    // --------------------------------------------------

    if (
      targetURL.protocol !== "http:" &&
      targetURL.protocol !== "https:"
    ) {

      return;

    }


    // --------------------------------------------------
    // ALREADY CHECKING
    // --------------------------------------------------

    if (isCheckingLink) {

      return;

    }


    // --------------------------------------------------
    // STOP NORMAL NAVIGATION
    // --------------------------------------------------

    event.preventDefault();

    event.stopPropagation();
    event.stopImmediatePropagation();


    // --------------------------------------------------
    // CHECK LINK
    // --------------------------------------------------

    checkLinkBeforeNavigate(
      href
    );

  },
  true
);


// ======================================================
// CHECK LINK
// ======================================================

async function checkLinkBeforeNavigate(
  url
) {

  isCheckingLink = true;


  // --------------------------------------------------
  // SHOW LOADING
  // --------------------------------------------------

  showSafnexPopup(
    url,
    {
      loading: true
    }
  );


  try {

    const response =
      await sendCheckRequest(
        url
      );


    // ------------------------------------------------
    // SUCCESS
    // ------------------------------------------------

    if (
      response &&
      response.success
    ) {

      showSafnexPopup(
        url,
        response.result || {}
      );

    }


    // ------------------------------------------------
    // ERROR
    // ------------------------------------------------

    else {

      showSafnexPopup(
        url,
        {
          error: true,

          errorMessage:
            response?.error ||
            "Unable to analyze this link."
        }
      );

    }

  }

  catch (error) {

    console.error(
      "SAFNEX check failed:",
      error
    );


    showSafnexPopup(
      url,
      {
        error: true,

        errorMessage:
          error.message ||
          "Unable to analyze this link."
      }
    );

  }

  finally {

    isCheckingLink = false;

  }

}


// ======================================================
// SEND MESSAGE TO BACKGROUND
// ======================================================

function sendCheckRequest(
  url
) {

  return new Promise(
    (resolve) => {

      chrome.runtime.sendMessage(
        {
          action: "checkLink",
          url: url
        },

        function (response) {

          if (
            chrome.runtime.lastError
          ) {

            resolve({

              success: false,

              error:
                chrome.runtime
                  .lastError
                  .message

            });

            return;

          }


          resolve(
            response || {

              success: false,

              error:
                "No response from SAFNEX."

            }
          );

        }
      );

    }
  );

}


// ======================================================
// REMOVE POPUP
// ======================================================

function removePopup() {

  const popup =
    document.getElementById(
      "safnex-popup-overlay"
    );


  if (popup) {

    popup.remove();

  }

}


// ======================================================
// VISIT EXACT WEBSITE
// ======================================================

function visitSite(
  url
) {

  // --------------------------------------------------
  // Close SAFNEX popup
  // --------------------------------------------------

  removePopup();


  // --------------------------------------------------
  // Open exactly the URL checked
  // --------------------------------------------------

  window.location.assign(
    url
  );

}


// ======================================================
// OPEN FULL REPORT
// ======================================================

function openFullReport(
  url
) {

  const reportURL =
    `${SAFNEX_REPORT_URL}?url=${encodeURIComponent(url)}`;


  window.open(
    reportURL,
    "_blank"
  );

}


// ======================================================
// CREATE SAFNEX POPUP
// ======================================================

function showSafnexPopup(
  url,
  result
) {

  // --------------------------------------------------
  // Remove old popup
  // --------------------------------------------------

  removePopup();


  // --------------------------------------------------
  // Create overlay
  // --------------------------------------------------

  const overlay =
    document.createElement(
      "div"
    );


  overlay.id =
    "safnex-popup-overlay";


  overlay.className =
    "safnex-overlay";


  // ==================================================
  // LOADING
  // ==================================================

  if (result.loading) {

    overlay.innerHTML = `

      <div class="safnex-popup">

        <div class="safnex-header">

          <div class="safnex-logo">
            🛡️ SAFNEX NOVA
          </div>

        </div>


        <div class="safnex-body">

          <div class="safnex-spinner"></div>

          <h3>
            Checking Link Safety...
          </h3>


          <p class="safnex-url">
            ${escapeHtml(url)}
          </p>


          <p class="safnex-check-text">
            SAFNEX NOVA is analyzing this link.
          </p>

        </div>

      </div>

    `;


    if (document.body) {

      document.body.appendChild(
        overlay
      );

    }


    return;
  }


  // ==================================================
  // ERROR
  // ==================================================

  if (result.error) {

    overlay.innerHTML = `

      <div class="safnex-popup">

        <div class="safnex-header">

          <div class="safnex-logo">
            🛡️ SAFNEX NOVA
          </div>


          <button
            type="button"
            class="safnex-close"
            data-action="close"
            aria-label="Close"
          >
            ✕
          </button>

        </div>


        <div class="safnex-body">

          <div class="safnex-icon safnex-warning">
            ⚠️
          </div>


          <h3>
            Could Not Check Link
          </h3>


          <p class="safnex-verdict">
            ${escapeHtml(
              result.errorMessage ||
              "The SAFNEX server could not analyze this link."
            )}
          </p>


          <p class="safnex-url">
            ${escapeHtml(url)}
          </p>


          <div class="safnex-actions">

            <button
              type="button"
              class="safnex-btn safnex-btn-secondary"
              data-action="close"
            >
              Cancel
            </button>


            <button
              type="button"
              class="safnex-btn safnex-btn-primary"
              data-action="visit"
            >
              Visit Site
            </button>

          </div>


          <button
            type="button"
            class="safnex-full-report"
            data-action="report"
          >
            View Full Report →
          </button>

        </div>

      </div>

    `;

  }


  // ==================================================
  // NORMAL RESULT
  // ==================================================

  else {

    const riskScore =
      Number(
        result.riskScore ?? 0
      );


    const score =
      Number.isFinite(
        riskScore
      )

        ? Math.max(
            0,
            Math.min(
              100,
              Math.round(
                riskScore
              )
            )
          )

        : 0;


    const riskLevel =
      String(
        result.riskLevel ||
        "UNKNOWN"
      ).toUpperCase();


    const verdict =
      String(
        result.verdict ||
        "Analysis completed."
      );


    const reasons =
      Array.isArray(
        result.reasons
      )

        ? result.reasons

        : [];


    // ------------------------------------------------
    // ICON
    // ------------------------------------------------

    let icon =
      "✓";


    let iconClass =
      "safnex-safe";


    if (
      riskLevel === "HIGH" ||
      riskLevel === "CRITICAL" ||
      score >= 75
    ) {

      icon =
        "⚠️";


      iconClass =
        "safnex-danger";

    }


    else if (
      riskLevel === "MEDIUM" ||
      riskLevel === "SUSPICIOUS" ||
      score >= 40
    ) {

      icon =
        "⚠️";


      iconClass =
        "safnex-warning";

    }


    // ------------------------------------------------
    // DETECTION DETAILS
    // ------------------------------------------------

    const reasonsHTML =
      reasons.length > 0

        ? `

          <div class="safnex-reasons-title">
            Detection Details
          </div>


          <ul class="safnex-reasons">

            ${reasons
              .map(
                (reason) => `

                  <li>
                    ${escapeHtml(
                      String(reason)
                    )}
                  </li>

                `
              )
              .join("")}

          </ul>

        `

        : "";


    // ------------------------------------------------
    // POPUP
    // ------------------------------------------------

    overlay.innerHTML = `

      <div class="safnex-popup">

        <div class="safnex-header">

          <div class="safnex-logo">
            🛡️ SAFNEX NOVA
          </div>


          <button
            type="button"
            class="safnex-close"
            data-action="close"
            aria-label="Close"
          >
            ✕
          </button>

        </div>


        <div class="safnex-body">

          <div
            class="safnex-icon ${iconClass}"
          >
            ${icon}
          </div>


          <h3>
            ${escapeHtml(
              riskLevel
            )} RISK
          </h3>


          <div class="safnex-score">

            Risk Score:

            <strong>
              ${score}%
            </strong>

          </div>


          <p class="safnex-verdict">
            ${escapeHtml(
              verdict
            )}
          </p>


          <p class="safnex-url">
            ${escapeHtml(url)}
          </p>


          ${reasonsHTML}


          <div class="safnex-actions">

            <button
              type="button"
              class="safnex-btn safnex-btn-secondary"
              data-action="close"
            >
              Cancel
            </button>


            <button
              type="button"
              class="safnex-btn safnex-btn-primary"
              data-action="visit"
            >
              Visit Site
            </button>

          </div>


          <button
            type="button"
            class="safnex-full-report"
            data-action="report"
          >
            View Full Report →
          </button>

        </div>

      </div>

    `;

  }


  // ==================================================
  // BUTTON EVENTS
  // ==================================================

  overlay.addEventListener(
    "click",
    function (event) {

      const button =
        event.target.closest?.(
          "[data-action]"
        );


      if (!button) {
        return;
      }


      const action =
        button.dataset.action;


      // ------------------------------------------------
      // CLOSE
      // ------------------------------------------------

      if (
        action === "close"
      ) {

        removePopup();

      }


      // ------------------------------------------------
      // VISIT
      // ------------------------------------------------

      if (
        action === "visit"
      ) {

        visitSite(
          url
        );

      }


      // ------------------------------------------------
      // FULL REPORT
      // ------------------------------------------------

      if (
        action === "report"
      ) {

        openFullReport(
          url
        );

      }

    }
  );


  // ==================================================
  // CLICK OUTSIDE POPUP
  // ==================================================

  overlay.addEventListener(
    "click",
    function (event) {

      if (
        event.target === overlay
      ) {

        removePopup();

      }

    }
  );


  // ==================================================
  // ADD POPUP TO PAGE
  // ==================================================

  if (document.body) {

    document.body.appendChild(
      overlay
    );

  }

}


// ======================================================
// ESCAPE HTML
// ======================================================

function escapeHtml(
  text
) {

  const div =
    document.createElement(
      "div"
    );


  div.textContent =
    text;


  return div.innerHTML;

}


// ======================================================
// REPORT PAGE AUTO ANALYSIS
// ======================================================

function autoAnalyzeReportPage() {

  if (
    window.location.hostname !==
    "safnex-nova.onrender.com"
  ) {

    return;

  }


  if (
    !window.location.pathname.endsWith(
      "/link-detector.html"
    )
  ) {

    return;

  }


  const params =
    new URLSearchParams(
      window.location.search
    );


  const targetURL =
    params.get(
      "url"
    );


  if (!targetURL) {

    return;

  }


  let attempts = 0;

  const maxAttempts = 40;


  const timer =
    setInterval(
      () => {

        attempts++;


        const input =
          document.querySelector(
            "#url, " +
            "#urlInput, " +
            "#linkInput, " +
            "#websiteUrl, " +
            "input[name='url'], " +
            "input[name='link'], " +
            "input[type='url'], " +
            "input[type='text']"
          );


        if (!input) {

          if (
            attempts >=
            maxAttempts
          ) {

            clearInterval(
              timer
            );

          }


          return;

        }


        setNativeInputValue(
          input,
          targetURL
        );


        input.dispatchEvent(
          new Event(
            "input",
            {
              bubbles: true
            }
          )
        );


        input.dispatchEvent(
          new Event(
            "change",
            {
              bubbles: true
            }
          )
        );


        const buttons =
          Array.from(
            document.querySelectorAll(
              "button, input[type='button'], input[type='submit']"
            )
          );


        const analyzeButton =
          buttons.find(
            (button) =>
              /analy[sz]e|check|scan/i.test(
                (
                  button.innerText ||
                  button.value ||
                  button.textContent ||
                  ""
                ).trim()
              )
          );


        if (analyzeButton) {

          clearInterval(
            timer
          );


          setTimeout(
            () => {

              analyzeButton.click();

            },
            500
          );

        }


        if (
          attempts >=
          maxAttempts
        ) {

          clearInterval(
            timer
          );

        }

      },
      300
    );

}


// ======================================================
// SET INPUT VALUE
// ======================================================

function setNativeInputValue(
  input,
  value
) {

  const prototype =
    Object.getPrototypeOf(
      input
    );


  const descriptor =
    Object.getOwnPropertyDescriptor(
      prototype,
      "value"
    );


  if (
    descriptor &&
    descriptor.set
  ) {

    descriptor.set.call(
      input,
      value
    );

  }

  else {

    input.value =
      value;

  }

}


// ======================================================
// START REPORT AUTO ANALYSIS
// ======================================================

autoAnalyzeReportPage();