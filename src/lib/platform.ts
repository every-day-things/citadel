export const isDesktop = () => {
  return "__TAURI__" in window && window.__TAURI__;
};
