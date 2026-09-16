// ======================================================
// SAFNEX NOVA POPUP
// ======================================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const dashboardButton =
      document.getElementById(
        "openDashboard"
      );


    const settingsButton =
      document.getElementById(
        "openSettings"
      );


    // ==================================================
    // OPEN SAFNEX WEBSITE
    // ==================================================

    if (dashboardButton) {

      dashboardButton.addEventListener(
        "click",
        () => {

          chrome.tabs.create({

            url:
              "https://safnex-nova.onrender.com/home.html"

          });

        }
      );

    }


    // ==================================================
    // OPEN CHROME EXTENSION SETTINGS
    // ==================================================

    if (settingsButton) {

      settingsButton.addEventListener(
        "click",
        () => {

          chrome.tabs.create({

            url:
              "chrome://extensions/?id=" +
              chrome.runtime.id

          });

        }
      );

    }

  }
);