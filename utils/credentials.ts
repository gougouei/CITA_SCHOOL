const CHARS_UPPER = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const CHARS_LOWER = "abcdefghijklmnopqrstuvwxyz";
const CHARS_DIGITS = "0123456789";
const CHARS_SPECIAL = "!@#$%^&*()-_=+";

function randomChar(pool: string): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

function shuffleString(str: string): string {
  const arr = str.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join("");
}

export function generatePassword(length = 14): string {
  const required = [
    randomChar(CHARS_UPPER),
    randomChar(CHARS_LOWER),
    randomChar(CHARS_DIGITS),
    randomChar(CHARS_SPECIAL),
  ];

  const allChars = CHARS_UPPER + CHARS_LOWER + CHARS_DIGITS + CHARS_SPECIAL;
  const remaining = Array.from(
    { length: length - required.length },
    () => randomChar(allChars)
  );

  return shuffleString([...required, ...remaining].join(""));
}

export function generateUsername(fullName: string, existingUsernames: string[]): string {
  const normalized = fullName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, "")
    .trim()
    .split(/\s+/);

  const firstName = normalized[0] ?? "user";
  const lastName = normalized[1] ?? "";
  const base = lastName ? `${firstName}.${lastName}` : firstName;

  if (!existingUsernames.includes(base)) return base;

  let suffix = 1;
  while (existingUsernames.includes(`${base}${suffix}`)) suffix++;
  return `${base}${suffix}`;
}
