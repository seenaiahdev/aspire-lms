/**
 * Shared utility functions for Aspire LMS backend
 */

/**
 * Sanitizes phone numbers by stripping country codes (+91), role/tag suffixes
 * (:student, :parent, :admin, #tag), trunk prefixes (0), and non-digit characters,
 * returning the normalized 10-digit mobile suffix.
 *
 * @param {string|number|null|undefined} phone
 * @returns {string} Normalized 10-digit mobile suffix (or digits if <10)
 */
function cleanPhoneSuffix(phone) {
  if (phone === null || phone === undefined) return '';
  const str = String(phone).trim();
  if (!str) return '';

  // Strip trailing role suffixes like :student, :parent, #tag
  const base = str.split(/[:#]/)[0].trim();

  // Extract all digit characters
  const digits = base.replace(/\D/g, '');
  if (!digits) return '';

  // Return last 10 digits if 10 or more, otherwise return extracted digits
  return digits.length > 10 ? digits.slice(-10) : digits;
}

module.exports = {
  cleanPhoneSuffix,
};
