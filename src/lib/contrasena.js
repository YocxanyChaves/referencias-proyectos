// Mismos requisitos que la configuración de contraseñas de Supabase (Authentication → Policies).
export const REQUISITOS_CONTRASENA = [
  { texto: 'Al menos 8 caracteres', cumple: (p) => p.length >= 8 },
  { texto: 'Una letra minúscula', cumple: (p) => /[a-z]/.test(p) },
  { texto: 'Una letra mayúscula', cumple: (p) => /[A-Z]/.test(p) },
  { texto: 'Un número', cumple: (p) => /[0-9]/.test(p) },
]
