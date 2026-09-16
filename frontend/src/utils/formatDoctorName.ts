/**
 * Formats a clinician or doctor name cleanly with exactly ONE "Dr." prefix.
 * Strips all duplicate variations like "Dr. Dr.", "Dr. dr.", "dr.", "Dr", etc.
 */
export const formatClinicianName = (name?: string): string => {
  if (!name) return 'Staff Clinician';
  const trimmed = name.trim();
  if (trimmed.includes('Chief Medical Officer') || trimmed.includes('Admin')) {
    return trimmed;
  }
  // Strip any repeated leading variations of "dr", "dr.", "dr ", "dr-" case-insensitively
  const cleaned = trimmed.replace(/^(dr[\.\s\-]*)+/i, '').trim();
  if (!cleaned) return 'Staff Clinician';
  return `Dr. ${cleaned.charAt(0).toUpperCase() + cleaned.slice(1)}`;
};
