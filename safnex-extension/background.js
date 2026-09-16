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