import { PrismaClient } from '@cinton/db';

export async function generateCaseNumber(prisma: PrismaClient): Promise<string> {
  const currentYear = new Date().getFullYear();
  const twoDigitYear = currentYear % 100;

  // Atomic increment using raw SQL to prevent race conditions
  const result = await prisma.$queryRaw<{ last_number: number }[]>`
    INSERT INTO case_number_sequences (id, year, last_number, updated_at)
    VALUES (gen_random_uuid(), ${twoDigitYear}, 1, NOW())
    ON CONFLICT (year) DO UPDATE SET
      last_number = case_number_sequences.last_number + 1,
      updated_at = NOW()
    RETURNING last_number
  `;

  const lastNumber = result[0].last_number;
  const paddedNumber = String(lastNumber).padStart(5, '0');

  return `${twoDigitYear}-${paddedNumber}`;
}
