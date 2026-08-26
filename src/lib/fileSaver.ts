// Native browser file saver - zero SSR dependencies
export const saveBlobFile = (blob: Blob, filename: string): void => {
  if (typeof window === 'undefined') return;
  const url = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.style.display = 'none';
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    window.URL.revokeObjectURL(url);
    if (anchor.parentNode) {
      anchor.parentNode.removeChild(anchor);
    }
  }, 100);
};
