// SAFNEX NOVA Extension - Background Service Worker

const API_URL = "https://safnex-nova.onrender.com/api/analyze";
// For local testing: "http://localhost:3000/api/analyze"

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "checkLink") {
    checkLinkSafety(request.url)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep channel open for async response
  }

  if (request.action === "ping") {
    sendResponse({ installed: true });
    return true;
  }
});

async function checkLinkSafety(url) {
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      throw new Error("API request failed");
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("SAFNEX link check error:", error);
    throw error;
  }
}

// Extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("SAFNEX NOVA Link Guard installed");

  // Set default settings
  chrome.storage.sync.set({
    enabled: true,
    autoCheck: true
  });
});
