// Verificação do cookie do painel no proxy (mesma implementação do servidor).
import { verifyAdminToken } from './admin-session';

export function verifyAuthCookieEdge(value: string | undefined) {
  return verifyAdminToken(value);
}
