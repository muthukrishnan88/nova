// ======================================================
// SAFNEX NOVA LINK GUARD
// Background Service Worker
// ======================================================

const API_URL =
  "https://safnex-nova.onrender.com/api/analyze";


// ======================================================
// EXTENSION INSTALLED
// ======================================================

chrome.runtime.onInstalled.addListener(() => {

  console.log(
    "SAFNEX NOVA Link Guard installed."
  );

  chrome.storage.sync.set({
    enabled: true,
    autoCheck: true
  });

});


// ======================================================
// NAVIGATION CHECK
// Detects browser navigation, including address-bar URLs
// ======================================================

chrome.webNavigation.onBeforeNavigate.addListener(
  async (details) => {

    // Only check the main browser tab
    if (details.frameId !== 0) {
      return;
    }

    const url = details.url;

    // Ignore URLs that SAFNEX should not analyze
    if (!shouldCheckUrl(url)) {
      return;
    }

    try {

      const settings =
        await chrome.storage.sync.get({
          enabled: true,
          autoCheck: true
        });

      if (
        settings.enabled === false ||
        settings.autoCheck === false
      ) {
        return;
      }


      console.log(
        "SAFNEX checking navigation:",
        url
      );


      const result =
        await checkLinkSafety(url);


      console.log(
        "SAFNEX navigation result:",
        result
      );


      // ------------------------------------------------
      // HIGH-RISK URL
      // ------------------------------------------------

      if (
        result.riskLevel === "HIGH" ||
        result.riskLevel === "CRITICAL" ||
        result.riskScore >= 75
      ) {

        // Store result so warning page/content script
        // can display it.
        await chrome.storage.session.set({

          safnexLastCheck: {
            url: url,
            result: result,
            timestamp: Date.now()
          }

        });


        // Tell the current tab to show SAFNEX warning.
        try {

          await chrome.tabs.sendMessage(
            details.tabId,
            {
              action: "showWarning",
              result: result
            }
          );

        }
        catch (error) {

          console.log(
            "SAFNEX warning message could not be sent:",
            error.message
          );

        }

      }

    }
    catch (error) {

      console.error(
        "SAFNEX navigation analysis failed:",
        error
      );

    }

  }
);


// ======================================================
// URL FILTER
// ======================================================

function shouldCheckUrl(url) {

  if (!url) {
    return false;
  }


  // Chrome internal pages
  if (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("view-source:")
  ) {

    return false;
  }


  // Chrome Web Store
  if (
    url.startsWith(
      "https://chromewebstore.google.com/"
    ) ||
    url.startsWith(
      "https://chrome.google.com/webstore/"
    )
  ) {

    return false;
  }


  // Extension pages
  if (
    url.startsWith(
      chrome.runtime.getURL("")
    )
  ) {

    return false;
  }


  // Only HTTP/HTTPS
  if (
    !url.startsWith("http://") &&
    !url.startsWith("https://")
  ) {

    return false;
  }


  return true;

}


// ======================================================
// MESSAGE HANDLER
// ======================================================

chrome.runtime.onMessage.addListener(
  (request, sender, sendResponse) => {

    // --------------------------------------------------
    // LINK CHECK
    // --------------------------------------------------

    if (request.action === "checkLink") {

      if (!request.url) {

        sendResponse({
          success: false,
          error: "No URL provided."
        });

        return false;
      }


      checkLinkSafety(request.url)
        .then((result) => {

          sendResponse({
            success: true,
            result: result
          });

        })
        .catch((error) => {

          console.error(
            "SAFNEX API Error:",
            error
          );

          sendResponse({
            success: false,
            error:
              error.message ||
              "Unable to analyze link."
          });

        });


      // Keep message channel open
      return true;
    }


    // --------------------------------------------------
    // PING
    // --------------------------------------------------

    if (request.action === "ping") {

      sendResponse({
        installed: true,
        version:
          chrome.runtime.getManifest().version
      });

      return false;
    }


    // --------------------------------------------------
    // GET LAST NAVIGATION CHECK
    // --------------------------------------------------

    if (
      request.action ===
      "getLastCheck"
    ) {

      chrome.storage.session.get(
        "safnexLastCheck",
        (data) => {

          sendResponse({
            success: true,
            data:
              data.safnexLastCheck ||
              null
          });

        }
      );

      return true;
    }


    // --------------------------------------------------
    // UNKNOWN ACTION
    // --------------------------------------------------

    sendResponse({
      success: false,
      error: "Unknown action."
    });

    return false;

  }
);


// ======================================================
// CHECK LINK SAFETY
// ======================================================

async function checkLinkSafety(url) {

  const controller =
    new AbortController();


  const timeout =
    setTimeout(() => {

      controller.abort();

    }, 30000);


  try {

    const response =
      await fetch(API_URL, {

        method: "POST",

        headers: {
          "Content-Type":
            "application/json"
        },

        body: JSON.stringify({
          url: url
        }),

        signal: controller.signal

      });


    if (!response.ok) {

      throw new Error(
        `SAFNEX API returned HTTP ${response.status}`
      );

    }


    const data =
      await response.json();


    return normalizeResult(
      data,
      url
    );

  }

  catch (error) {

    if (
      error.name ===
      "AbortError"
    ) {

      throw new Error(
        "Analysis timed out. Please try again."
      );

    }

    throw error;

  }

  finally {

    clearTimeout(timeout);

  }

}


// ======================================================
// NORMALIZE RESULT
// ======================================================

function normalizeResult(
  data,
  url
) {

  const result =
    data || {};


  let riskScore =
    Number(
      result.riskScore ??
      result.score ??
      result.risk_score ??
      0
    );


  if (!Number.isFinite(riskScore)) {

    riskScore = 0;

  }


  riskScore =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(riskScore)
      )
    );


  let riskLevel =
    result.riskLevel ??
    result.risk_level ??
    result.level ??
    "";


  riskLevel =
    String(
      riskLevel
    ).toUpperCase();


  if (!riskLevel) {

    if (riskScore >= 75) {

      riskLevel = "HIGH";

    }
    else if (riskScore >= 40) {

      riskLevel = "MEDIUM";

    }
    else {

      riskLevel = "LOW";

    }

  }


  let verdict =
    result.verdict ??
    result.message ??
    result.result ??
    "";


  if (!verdict) {

    if (
      riskLevel === "HIGH" ||
      riskLevel === "CRITICAL"
    ) {

      verdict =
        "This link shows potentially dangerous indicators.";

    }
    else if (
      riskLevel === "MEDIUM" ||
      riskLevel === "SUSPICIOUS"
    ) {

      verdict =
        "This link requires caution.";

    }
    else {

      verdict =
        "No major suspicious indicators were detected.";

    }

  }


  let reasons =
    result.reasons ??
    result.indicators ??
    result.reasons_found ??
    [];


  if (!Array.isArray(reasons)) {

    reasons = [
      String(reasons)
    ];

  }


  return {

    ...result,

    url: url,

    riskScore: riskScore,

    riskLevel: riskLevel,

    verdict: String(verdict),

    reasons: reasons

  };

}