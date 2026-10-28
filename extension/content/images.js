import { post } from "./bridge-messages.js";

// ---- pictures: loading images, and Color Lab's own art files ----
export const imgCache = {};
export function loadImg(url) {
  if (!imgCache[url]) {
    imgCache[url] = (String(url).startsWith("ttcl-art:") ? artSrc(url) : Promise.resolve(url)).then(
      (u) =>
        u &&
        new Promise((res) => {
          const i = new Image();
          i.onload = () => res(i);
          i.onerror = () => res(null);
          i.src = u;
        }),
    );
  }
  return imgCache[url];
}
// Color Lab's own pictures are files in the extension (its art folder), read from your PC only when something needs
// one, instead of all being inside this script. The extension's other half hands each file over as a blob.
const artFiles = {},
  artWait = {};
export function artSrc(ref) {
  // 'ttcl-art:<file>' -> a blob: address for it (null if it can't be read)
  const name = String(ref).slice(9);
  if (artFiles[name]) {
    return artFiles[name];
  }
  return (artFiles[name] = new Promise((res) => {
    artWait[name] = res;
    post({ type: "artFile", name });
    setTimeout(() => {
      if (artWait[name]) {
        delete artWait[name];
        delete artFiles[name];
        res(null);
      }
    }, 8000);
  }));
}
window.addEventListener("message", (e) => {
  const d = e.data;
  if (e.source !== window || !d || d.__ttcl !== true || d.dir !== "toPage" || d.type !== "artFile") {
    return;
  }
  const res = artWait[d.name];
  if (!res) {
    return;
  }
  delete artWait[d.name];
  res(d.blob instanceof Blob ? URL.createObjectURL(d.blob) : null);
  if (!(d.blob instanceof Blob)) {
    delete artFiles[d.name];
  }
});
