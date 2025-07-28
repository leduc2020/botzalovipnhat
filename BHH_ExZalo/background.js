function captureRequests() {
  console.log("Initializing captureRequests...");

  try {
    chrome.webRequest.onBeforeRequest.addListener(
      async function (details) {
        try {
          console.log("Intercepted Request:", details.url);

          let url = details.url;
          let imeiFound = false;
          let imeiValue = "Not Found";

          if (url.includes("/api/login/getServerInfo") && url.includes("imei=")) {
            let params = new URLSearchParams(new URL(url).search);
            imeiFound = true;
            imeiValue = params.get("imei");

            console.log("IMEI Found:", imeiValue);
            chrome.runtime.sendMessage({ action: "IMEIValue", imei: imeiValue });
          }

          if (imeiFound && url.includes("chat.zalo.me")) {
            chrome.cookies.getAll({ url: url }, function (cookies) {
              let cookiesDict = {};

              cookies.forEach((cookie) => {
                cookiesDict[cookie.name] = cookie.value;
              });

              let cookieString = Object.entries(cookiesDict)
                .map(([name, value]) => `${name}=${value}`)
                .join("; ");

              console.log("Cookies:", cookieString);
              chrome.runtime.sendMessage({ action: "CookiesValue", cookies: cookieString });
            });
          }

          let userAgent = navigator.userAgent;
          console.log("User-Agent:", userAgent);
          chrome.runtime.sendMessage({ action: "UserAgent", useragent: userAgent });

        } catch (e) {
          console.error("Error processing request:", e);
        }
      },
      { urls: ["<all_urls>"] },
      ["requestBody"]
    );
  } catch (e) {
    console.error("Error initializing captureRequests:", e);
  }
}

captureRequests();
