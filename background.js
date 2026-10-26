// Toolbar button / Alt+C: toggle the panel on TankTrouble, or open TankTrouble if elsewhere.
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab || !tab.url || !/^https:\/\/tanktrouble\.com\//.test(tab.url)) {
    chrome.tabs.create({ url: 'https://tanktrouble.com/' });
    return;
  }
  try {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      world: 'MAIN',
      func: () => { if (window.__ttColorLab) window.__ttColorLab.toggle(); }
    });
  } catch (e) { console.warn('Color Lab toggle failed', e); }
});

// "OFF" badge on the toolbar icon while custom colours are paused (per tab)
chrome.runtime.onMessage.addListener((m, sender) => {
  if (!m || m.type !== 'badge' || !sender.tab) return;
  chrome.action.setBadgeText({ tabId: sender.tab.id, text: m.on ? '' : 'OFF' });
  chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: '#cc0000' });
});

// Alt/Option+V as a browser shortcut (so it can be changed at chrome://extensions/shortcuts)
chrome.commands.onCommand.addListener(async (command, tab) => {
  if (command !== 'refresh-tanks' || !tab || !/^https:\/\/tanktrouble\.com\//.test(tab.url || '')) return;
  try {
    await chrome.scripting.executeScript({ target: { tabId: tab.id }, world: 'MAIN', func: () => { if (window.__ttColorLab) window.__ttColorLab.refresh(); } });
  } catch (e) { console.warn('Color Lab refresh failed', e); }
});
