/**
 * Gỡ cú pháp Markdown còn sót trong văn bản bóc tách.
 * Panel nguồn là chỗ để đọc và bôi đen: một đường link dài giữa câu vừa che mất
 * nội dung, vừa dính vào đoạn người dùng quét để làm mặt trả lời.
 */
function cleanArticleBlock(block: string): string {
  return (
    block
      .replace(/^#{1,6}\s+/, '')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
      // Link chú thích của Wikipedia để lại đường dẫn trần trong ngoặc đơn.
      .replace(/\(https?:\/\/[^)\s]*\)/g, '')
      // Dấu nhấn bị escape (`\*`, `\_`) là chữ thật, không phải cú pháp — giữ lại.
      .replace(/(?<!\\)[*_`]{1,3}/g, '')
      // Bộ bóc tách escape mọi dấu câu ASCII theo CommonMark, vd. "G5\." → "G5.".
      .replace(/\\([!-/:-@[-`{-~])/g, '$1')
      .trim()
  );
}

/** Cắt Markdown đã bóc tách thành các đoạn để hiển thị. */
export function toParagraphs(cleanText: string): string[] {
  return cleanText
    .split(/\n{2,}/)
    .map(cleanArticleBlock)
    .filter((block) => block.length > 0);
}
