const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_REGEX = /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*]).{8,}$/;

export function validateLoginForm(email: string, password: string): string | null {
  if (!email.trim() || !password.trim()) {
    return 'Email y contraseña son obligatorios';
  }

  if (!EMAIL_REGEX.test(email.trim())) {
    return 'Ingresa un email válido';
  }

  return null;
}

export function validateRegisterForm(input: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}): string | null {
  if (!input.firstName.trim() || !input.lastName.trim()) {
    return 'Nombre y apellido son obligatorios';
  }

  if (!EMAIL_REGEX.test(input.email.trim())) {
    return 'Ingresa un email válido';
  }

  if (!PASSWORD_REGEX.test(input.password)) {
    return 'La contraseña debe tener al menos 8 caracteres, una mayúscula, un número y un carácter especial';
  }

  if (input.password !== input.confirmPassword) {
    return 'Las contraseñas no coinciden';
  }

  return null;
}

