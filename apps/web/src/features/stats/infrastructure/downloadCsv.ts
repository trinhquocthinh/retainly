/** Tải chuỗi CSV về máy người dùng. BOM UTF-8 để Excel đọc đúng tiếng Việt. */
export function downloadCsv(fileName: string, csv: string): void {
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();

  // Trả URL ở lượt sau để trình duyệt kịp bắt đầu tải.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
