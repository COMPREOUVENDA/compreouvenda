import type { SupabaseClient } from '@supabase/supabase-js';

export type MatchType = 'cpf' | 'cnpj' | 'email_similar' | 'phone' | 'ip_address';

export interface DuplicateMatch {
  matchedUserId: string;
  matchedUserName: string;
  matchedUserEmail: string;
  matchType: MatchType;
  matchValue: string;
}

export interface DuplicateDetectionResult {
  hasDuplicates: boolean;
  matches: DuplicateMatch[];
}

/** Levenshtein distance between two strings */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[m][n];
}

/** Normalize phone: keep only digits */
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '');
}

/** Normalize document: keep only digits */
function normalizeDocument(doc: string): string {
  return doc.replace(/\D/g, '');
}

export async function detectDuplicates(
  supabase: SupabaseClient,
  userId: string
): Promise<DuplicateDetectionResult> {
  const matches: DuplicateMatch[] = [];

  // Fetch target user
  const { data: targetUser, error } = await supabase
    .from('users')
    .select('id, email, phone, document, registration_ip, name')
    .eq('id', userId)
    .single();

  if (error || !targetUser) return { hasDuplicates: false, matches: [] };

  // Fetch all other users
  const { data: allUsers } = await supabase
    .from('users')
    .select('id, email, phone, document, registration_ip, name')
    .neq('id', userId)
    .not('status', 'eq', 'blocked');

  if (!allUsers || allUsers.length === 0) return { hasDuplicates: false, matches: [] };

  for (const user of allUsers) {
    // Match by CPF/CNPJ document
    if (targetUser.document && user.document) {
      const targetDoc = normalizeDocument(targetUser.document);
      const userDoc = normalizeDocument(user.document);
      if (targetDoc.length >= 11 && targetDoc === userDoc) {
        const matchType: MatchType = targetDoc.length === 14 ? 'cnpj' : 'cpf';
        matches.push({
          matchedUserId: user.id,
          matchedUserName: user.name,
          matchedUserEmail: user.email,
          matchType,
          matchValue: targetUser.document,
        });
        continue;
      }
    }

    // Match by phone
    if (targetUser.phone && user.phone) {
      const targetPhone = normalizePhone(targetUser.phone);
      const userPhone = normalizePhone(user.phone);
      if (targetPhone.length >= 10 && targetPhone === userPhone) {
        matches.push({
          matchedUserId: user.id,
          matchedUserName: user.name,
          matchedUserEmail: user.email,
          matchType: 'phone',
          matchValue: targetUser.phone,
        });
        continue;
      }
    }

    // Match by registration IP
    if (
      targetUser.registration_ip &&
      user.registration_ip &&
      targetUser.registration_ip === user.registration_ip
    ) {
      matches.push({
        matchedUserId: user.id,
        matchedUserName: user.name,
        matchedUserEmail: user.email,
        matchType: 'ip_address',
        matchValue: targetUser.registration_ip,
      });
      continue;
    }

    // Match by similar email (Levenshtein distance <= 2, ignoring identical)
    if (targetUser.email && user.email && targetUser.email !== user.email) {
      const dist = levenshteinDistance(
        targetUser.email.toLowerCase(),
        user.email.toLowerCase()
      );
      if (dist <= 2) {
        matches.push({
          matchedUserId: user.id,
          matchedUserName: user.name,
          matchedUserEmail: user.email,
          matchType: 'email_similar',
          matchValue: user.email,
        });
      }
    }
  }

  // Persist new matches to duplicate_detection_log
  if (matches.length > 0) {
    const logsToInsert = matches.map((m) => ({
      user_id: userId,
      matched_user_id: m.matchedUserId,
      match_type: m.matchType,
      match_value: m.matchValue,
    }));

    // Upsert: avoid duplicate log entries (best effort)
    await supabase
      .from('duplicate_detection_log')
      .upsert(logsToInsert, { ignoreDuplicates: true });

    // Lower trust score and set verification to pending
    await supabase
      .from('users')
      .update({
        trust_score: 0,
        verification_status: 'pending',
      })
      .eq('id', userId);
  }

  return {
    hasDuplicates: matches.length > 0,
    matches,
  };
}
