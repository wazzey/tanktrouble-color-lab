// Account keys, worked out here in the extension's isolated world (bridge.js).
//
// An account's key is made on this computer from its TankTrouble email, player ID and oldest laboratory message
// (PBKDF2-SHA-256, 300,000 rounds), so every computer the player uses gets the same one. The server keeps only a hash of
// it. An account that has never messaged the laboratory has no key of its own and uses the copy's random key.

const enc = new TextEncoder();
const VAULT = "ttcl_vault"; // { [pid]: { k, fp, moved } } in chrome.storage.local
const ROUNDS = 300000;

const toHex = (bytes) => [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
const sha = async (text) => new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(text)));

export async function readAccountKey(secret, pid) {
  // 64 hex characters, like the copy's random key
  const base = await crypto.subtle.importKey("raw", enc.encode(secret), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode("ttcl-key-v1|" + pid), iterations: ROUNDS },
    base,
    256,
  );
  return toHex(new Uint8Array(bits));
}

const ttCall = (method, params) =>
  fetch(location.origin + "/ajax/", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", method: "tanktrouble." + method, id: 1, params }),
  })
    .then((r) => r.json())
    .then((j) => (j && j.result && j.result.result ? (j.result.data ?? null) : undefined))
    .catch(() => undefined);
export async function readDetails(pid) {
  // { secret, fp } from the account's email, player ID and oldest laboratory message. null without an email or a
  // laboratory message, undefined if TankTrouble didn't answer (tried again later)
  const mail = await ttCall("getEmail", [String(pid)]);
  if (mail === undefined) {
    return undefined;
  }
  const email = String(mail || "")
    .trim()
    .toLowerCase();
  if (!email) {
    return null;
  }
  const top = await ttCall("message.getMessages", [[String(pid)], 0, 1]);
  if (top === undefined) {
    return undefined;
  }
  const total = Number(top && top.totalMessages) || 0;
  if (total < 1) {
    return null;
  }
  const last = total > 1 ? await ttCall("message.getMessages", [[String(pid)], total - 1, 1]) : top;
  if (last === undefined) {
    return undefined;
  }
  const ids = [...((top && top.messages) || []), ...((last && last.messages) || [])]
    .map((m) => Number(m && m.id))
    .filter((n) => n > 0);
  if (!ids.length) {
    return null;
  }
  const secret = "ttcl-acct-v1|" + pid + "|" + email + "|" + Math.min(...ids);
  return { secret, fp: toHex(await sha("fp|" + secret)) };
}

export const readVault = () =>
  new Promise((res) => chrome.storage.local.get(VAULT, (it) => res((it && it[VAULT]) || {})));
export const applyVault = (v) => new Promise((res) => chrome.storage.local.set({ [VAULT]: v }, () => res()));
