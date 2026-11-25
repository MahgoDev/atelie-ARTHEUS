// Identificador público do cliente Web. Também pode ser informado em Meu Acervo.
export const GOOGLE_CLIENT_ID = '';
export const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export const validClientId = value => /^[0-9]+-[a-z0-9_-]+\.apps\.googleusercontent\.com$/i.test(value) || /^\d+\.apps\.googleusercontent\.com$/.test(value);
