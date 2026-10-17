// Sends a message to the background service worker and resolves with its
// result, or rejects with its error message (and code, when it has one).

/* exported sendToRise */
function sendToRise(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError || !response) {
        reject(new Error("Rise couldn't respond. Reload the page and try again."));
      } else if (response.ok) {
        resolve(response.result);
      } else {
        reject(Object.assign(new Error(response.error), { code: response.code }));
      }
    });
  });
}
