// Shared field-level validation helpers for form modals across every module.

// Deliberately simple (not RFC5322-exhaustive): requires a local part, an
// "@", and a domain with at least one dot -- catches the actual mistake
// users make (typing a name with no "@") without rejecting valid addresses.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Phone numbers: only digits and the punctuation people actually type
// (+, -, spaces, parentheses). No letters allowed anywhere.
const PHONE_ALLOWED_RE = /^[0-9+\-\s()]+$/;
const PHONE_HAS_LETTERS_RE = /[a-zA-Z]/;

export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && EMAIL_RE.test(trimmed);
}

export function emailError(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Email wajib diisi";
  if (!trimmed.includes("@")) return "Email harus mengandung karakter @";
  if (!EMAIL_RE.test(trimmed)) return "Format email tidak valid";
  return undefined;
}

export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && !PHONE_HAS_LETTERS_RE.test(trimmed) && PHONE_ALLOWED_RE.test(trimmed);
}

export function phoneError(value: string): string | undefined {
  const trimmed = value.trim();
  if (!trimmed) return "Nomor telepon wajib diisi";
  if (PHONE_HAS_LETTERS_RE.test(trimmed)) return "Nomor telepon tidak boleh mengandung huruf";
  if (!PHONE_ALLOWED_RE.test(trimmed)) return "Nomor telepon hanya boleh berisi angka dan +, -, spasi, ( )";
  return undefined;
}

// Strips any character a phone-number field shouldn't contain -- used as an
// onChange filter so letters can't even be typed in the first place.
export function sanitizePhoneInput(value: string): string {
  return value.replace(/[^0-9+\-\s()]/g, "");
}
