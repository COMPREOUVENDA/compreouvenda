// ─── Masks ────────────────────────────────────────────────────────────────────

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 10) {
    return digits
      .replace(/^(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2');
  }
  return digits
    .replace(/^(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2');
}

export function maskCPF(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  return digits
    .replace(/^(\d{3})(\d)/, '$1.$2')
    .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1-$2');
}

export function maskCNPJ(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2');
}

export function maskCEP(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits.replace(/^(\d{5})(\d)/, '$1-$2');
}

export function maskDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return digits
    .replace(/^(\d{2})(\d)/, '$1/$2')
    .replace(/(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
}

// ─── Validators ───────────────────────────────────────────────────────────────

export function validateCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(digits)) return false;

  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;

  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  return remainder === parseInt(digits[10]);
}

export function validateCNPJ(cnpj: string): boolean {
  const digits = cnpj.replace(/\D/g, '');
  if (digits.length !== 14) return false;
  if (/^(\d)\1{13}$/.test(digits)) return false;

  const calcDigit = (d: string, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) sum += parseInt(d[i]) * weights[i];
    const rem = sum % 11;
    return rem < 2 ? 0 : 11 - rem;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = calcDigit(digits, w1);
  if (d1 !== parseInt(digits[12])) return false;

  const d2 = calcDigit(digits, w2);
  return d2 === parseInt(digits[13]);
}

export function validateEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function validate18Plus(birthDate: string): boolean {
  // expects DD/MM/YYYY
  const parts = birthDate.split('/');
  if (parts.length !== 3) return false;
  const [day, month, year] = parts.map(Number);
  if (!day || !month || !year) return false;
  const dob = new Date(year, month - 1, day);
  if (isNaN(dob.getTime())) return false;
  const now = new Date();
  const age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) {
    return age - 1 >= 18;
  }
  return age >= 18;
}

// ─── Password Strength ────────────────────────────────────────────────────────

export type PasswordStrength = 'fraca' | 'média' | 'forte';

export function getPasswordStrength(password: string): {
  strength: PasswordStrength;
  score: number;
  color: string;
  label: string;
} {
  if (!password) return { strength: 'fraca', score: 0, color: 'bg-gray-200', label: '' };

  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 2) return { strength: 'fraca', score, color: 'bg-red-500', label: 'Fraca' };
  if (score <= 3) return { strength: 'média', score, color: 'bg-yellow-500', label: 'Média' };
  return { strength: 'forte', score, color: 'bg-green-500', label: 'Forte' };
}

// ─── CEP Lookup (Mock) ────────────────────────────────────────────────────────

export interface CepData {
  rua: string;
  bairro: string;
  cidade: string;
  estado: string;
}

const MOCK_CEPS: Record<string, CepData> = {
  '01001000': { rua: 'Praça da Sé', bairro: 'Sé', cidade: 'São Paulo', estado: 'SP' },
  '20040020': { rua: 'Av. Rio Branco', bairro: 'Centro', cidade: 'Rio de Janeiro', estado: 'RJ' },
  '30130000': { rua: 'Av. Afonso Pena', bairro: 'Centro', cidade: 'Belo Horizonte', estado: 'MG' },
  '40020000': { rua: 'Rua Chile', bairro: 'Comércio', cidade: 'Salvador', estado: 'BA' },
  '50010000': { rua: 'Av. Dantas Barreto', bairro: 'Santo Antônio', cidade: 'Recife', estado: 'PE' },
};

export function lookupCep(cep: string): CepData | null {
  const digits = cep.replace(/\D/g, '');
  return MOCK_CEPS[digits] ?? null;
}
