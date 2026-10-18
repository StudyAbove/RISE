// Opens Canvas with ?rise=open so the Rise pop-ups appear right away.
document.getElementById('open-canvas').addEventListener('click', (event) => {
  event.preventDefault();
  chrome.tabs.create({ url: `${self.RISE_CONFIG.canvasUrl}/?rise=open` });
});
