interface KintoneUrlParts {
  domain: string;
  pathParts: string[];
  isMobile: boolean;
  queryParams: URLSearchParams;
  hash: string;
}

function parseKintoneUrl(url: URL): KintoneUrlParts | null {
  if (!url.pathname.startsWith("/k/")) {
    return null;
  }

  const pathParts = url.pathname.split("/");
  const isMobile = pathParts[2] === "m";

  return {
    domain: url.origin,
    pathParts,
    isMobile,
    queryParams: new URLSearchParams(url.search),
    hash: url.hash,
  };
}

function convertMobileToPC(urlParts: KintoneUrlParts): string {
  const { domain, pathParts, queryParams } = urlParts;

  // Remove 'm' from path (mobile indicator)
  pathParts.splice(2, 1);

  // Handle app URLs with record parameter
  if (pathParts.length >= 4 && pathParts[3] === "show") {
    const recordId = queryParams.get("record");

    if (recordId) {
      // Remove record from query params
      queryParams.delete("record");
      const otherParams = queryParams.toString();

      // Build URL with record as hash
      let newUrl = `${domain}${pathParts.join("/")}`;
      if (otherParams) {
        newUrl += `?${otherParams}`;
      }
      newUrl += `#record=${recordId}`;
      return newUrl;
    } else {
      // No record parameter, keep all query params
      return `${domain}${pathParts.join("/")}${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
    }
  }

  // Handle space/thread URLs
  else if (pathParts[2] === "space") {
    const hashPath = pathParts.slice(2).join("/");
    const queryString = queryParams.toString();
    return `${domain}/k/#/${hashPath}${queryString ? `?${queryString}` : ""}`;
  }

  // Handle assigned URL: /k/m/assigned -> /k/#/portal
  else if (pathParts[2] === "assigned") {
    return `${domain}/k/#/portal`;
  }

  // Handle other URLs (app list, etc.)
  else {
    const queryString = queryParams.toString();
    return `${domain}${pathParts.join("/")}${queryString ? `?${queryString}` : ""}`;
  }
}

function convertPCToMobile(url: URL, urlParts: KintoneUrlParts): string {
  const { domain, pathParts, hash } = urlParts;

  // Handle hash-based URLs (#/space/1/thread/1, #/portal)
  if (hash.startsWith("#/")) {
    const hashPath = hash.substring(2); // Remove #/

    // Portal URL: #/portal -> /k/m/
    // Notification URL: #/ntf/... -> /k/m/
    if (hashPath === "portal" || hashPath.startsWith("ntf/")) {
      return `${domain}/k/m/`;
    }

    return `${domain}/k/m/${hashPath}`;
  }

  // Handle app URLs with hash record parameter
  else if (hash.includes("record=")) {
    // Insert 'm' after /k/
    pathParts.splice(2, 0, "m");
    const recordMatch = hash.match(/record=(\d+)/);

    if (recordMatch) {
      // Convert hash to query parameter
      // Note: Other query parameters are removed per specification
      return `${domain}${pathParts.join("/")}?record=${recordMatch[1]}`;
    } else {
      return `${domain}${pathParts.join("/")}`;
    }
  }

  // Handle regular paths
  else {
    // Insert 'm' after /k/
    pathParts.splice(2, 0, "m");
    return `${domain}${pathParts.join("/")}${url.search}${hash}`;
  }
}

// Handle extension icon clicks
chrome.action.onClicked.addListener((tab: chrome.tabs.Tab) => {
  if (!tab.url || !tab.id) {
    return;
  }

  const url = new URL(tab.url);
  const urlParts = parseKintoneUrl(url);

  if (!urlParts) {
    return;
  }

  const newUrl = urlParts.isMobile ? convertMobileToPC(urlParts) : convertPCToMobile(url, urlParts);

  if (newUrl) {
    chrome.tabs.update(tab.id, { url: newUrl });
  }
});