// Todos os ícones usam o mesmo traço e herdam a cor do elemento pai.
const drawings = {
  portal: '<path d="M3 21h18M5 20V10a7 7 0 0 1 14 0v10M8 20V10a4 4 0 0 1 8 0v10M9 21l2-4h2l2 4"/><path d="m12 7 .8 1.5L14 9l-1.2.5L12 11l-.8-1.5L10 9l1.2-.5Z"/>',
  grimorio: '<path d="M3 4.5c3.5-.8 6.3-.2 9 1.7 2.7-1.9 5.5-2.5 9-1.7v14c-3.2-.6-6.5.1-9 2-2.5-1.9-5.8-2.6-9-2ZM12 6.2v14M5.8 9c1.1 0 2.3.3 3.3.8M5.8 12.5c1.1 0 2.3.3 3.3.8"/><path d="m16.4 7.8.6 1.9 1.7.6-1.7.7-.6 1.7-.6-1.7-1.6-.7 1.6-.6Z"/>',
  magia: '<path d="M15 4a7.4 7.4 0 1 0 4.6 12.7A8.6 8.6 0 0 1 15 4Z"/><path d="m18.8 4.8.7 2.2 2.1.7-2.1.7-.7 2.2-.7-2.2-2.1-.7 2.1-.7ZM4.1 4v2.4M2.9 5.2h2.4"/>',
  ficha: '<path d="M12 3H5.5A1.5 1.5 0 0 0 4 4.5v15A1.5 1.5 0 0 0 5.5 21h11a1.5 1.5 0 0 0 1.5-1.5V14M7.5 8H11M7.5 12h2M7.5 17.5h4"/><path d="m11.5 14.5.8-3.3 6.5-6.5a1.8 1.8 0 0 1 2.5 2.5l-6.5 6.5ZM17.4 6l2.5 2.5"/>',
  avaliacao: '<path d="m12 2.4 9.1 6.5-3.5 10.6H6.4L2.9 8.9ZM12 7l5 3.6-1.9 5.8H8.9L7 10.6Z"/><path d="M12 2.4V12m9.1-3.1L12 12l5.6 7.5M12 12l-5.6 7.5M12 12 2.9 8.9" opacity=".62"/>',
  filtro: '<circle cx="12" cy="12" r="9"/><path d="m16.2 7.8-2.6 5.8-5.8 2.6 2.6-5.8ZM12 3v1.8M21 12h-1.8M12 21v-1.8M3 12h1.8"/>',
  ideias: '<path d="M8.5 16c0-2.4-3.1-2.9-3.1-6.7a6.6 6.6 0 0 1 13.2 0c0 3.8-3.1 4.3-3.1 6.7ZM9 19h6m-5 2h4M10.2 9l1.8 2 1.8-2M12 11v5"/>',
  config: '<path d="m9.5 3 .6-1h3.8l.6 2.1 1.7.9 2.3-.5 1.9 3.2-1.5 1.7.1 2.1 1.7 1.5-1.3 3.6-2.3.1-1.5 1.4-.3 2.4-3.7 1-1.4-1.8-2-.3-1.9 1.2-2.8-2.6.8-2.2-.6-2-2-1.1.5-3.8 2.2-.6 1.1-1.7-.2-2.3 3.3-1.5Z" transform="translate(1 1) scale(.91)"/><circle cx="12" cy="12" r="3.1"/>',
  moon: '<path d="M19.8 14.8A8.4 8.4 0 0 1 9.2 4.2a8.5 8.5 0 1 0 10.6 10.6Z"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M19 5l-1.5 1.5m-11 11L5 19"/>',
  arrow: '<path d="M4 12h15m-5.7-5.7L19 12l-5.7 5.7"/>',
  spark: '<path d="m12 2.5 2.5 7 7 2.5-7 2.5-2.5 7-2.5-7-7-2.5 7-2.5Z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m5 5 14 14m0-14L5 19"/>',
  bookmark: '<path d="M6 3.5h12v17l-6-4-6 4Z"/>',
  dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><g fill="currentColor" stroke="none"><circle cx="8" cy="8" r="1.3"/><circle cx="16" cy="8" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="8" cy="16" r="1.3"/><circle cx="16" cy="16" r="1.3"/></g>',
  back: '<path d="M20 12H5m5.7 5.7L5 12l5.7-5.7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  pen: '<path d="m4 20 1.1-5.1L16.7 3.3a2.2 2.2 0 0 1 3.1 3.1L8.2 18ZM14.9 5.1 18 8.2"/>',
  trash: '<path d="M3.5 6.5h17M9 6.5V3h6v3.5M6 7l.8 13.2h10.4L18 7M10 10v7m4-7v7"/>',
  copy: '<rect x="8" y="8" width="12" height="13" rx="2"/><path d="M15 8V3H3v13h5"/>',
  download: '<path d="M12 3v12m-4.8-4.8L12 15l4.8-4.8M4 16v4h16v-4"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  star: '<path d="m12 2.5 2.9 6.1 6.6 1-4.8 4.7 1.1 6.6-5.8-3.1-5.8 3.1 1.1-6.6-4.8-4.7 6.6-1Z"/>',
  prism: '<path d="m12 1.6 8.1 10.2L12 22.4 3.9 11.8ZM12 1.6l-2.3 10.2L12 22.4l2.4-10.6ZM3.9 11.8h16.2"/>',
  book: '<path d="M18.5 3.5H7A3 3 0 0 0 4 6.5v12a2.5 2.5 0 0 0 2.5 2.5h12ZM4 18.5A2.5 2.5 0 0 1 6.5 16h12M8 4v12M11 7h4.5"/>',
};

export function icon(name, size = 24) {
  const dimension = Number.isFinite(Number(size)) ? Number(size) : 24;
  const drawing = Object.hasOwn(drawings, name) ? drawings[name] : drawings.prism;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${dimension}" height="${dimension}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${drawing}</svg>`;
}
