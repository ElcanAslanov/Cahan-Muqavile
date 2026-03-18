export function validatePassword(password: string) {
  if (password.length < 8)
    return "Password minimum 8 simvol olmalıdır";

  if (!/[A-Z]/.test(password))
    return "Ən azı 1 böyük hərf olmalıdır";

  if (!/[a-z]/.test(password))
    return "Ən azı 1 kiçik hərf olmalıdır";

  if (!/[0-9]/.test(password))
    return "Ən azı 1 rəqəm olmalıdır";

  if (!/[!@#$%^&*.]/.test(password))
    return "Ən azı 1 simvol (!@#$%^&*.) olmalıdır";

  return null;
}