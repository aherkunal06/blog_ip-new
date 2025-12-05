/**
 * Strip HTML tags from text
 */
export function stripHtml(html: string | null | undefined): string {
  if (!html) return "";
  
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, "");
  
  // Decode HTML entities
  const entities: { [key: string]: string } = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™',
  };
  
  text = text.replace(/&[#\w]+;/g, (entity) => {
    return entities[entity] || entity;
  });
  
  // Clean up whitespace
  text = text.replace(/\s+/g, ' ').trim();
  
  return text;
}

/**
 * Truncate text to a specific length
 */
export function truncateText(text: string, maxLength: number): string {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
}

