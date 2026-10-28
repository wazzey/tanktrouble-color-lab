// Messages to the extension's other half (bridge.js), which handles storage and the look server
// Messages to the extension's other half (bridge.js), which handles storage and the look server
export const post = (msg) => window.postMessage(Object.assign({ __ttcl: true, dir: "toExt" }, msg), location.origin);
