// Calcola il token di sessione a partire dalla password.
// Cambiando la password, tutte le sessioni precedenti smettono di valere.
export async function sessionToken(password) {
  const data = new TextEncoder().encode("rentri-session:" + password);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}
