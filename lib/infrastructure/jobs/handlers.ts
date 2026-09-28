// Registro dos tipos de job → handler. Um tipo sem handler aqui vai para DEAD
// depois das tentativas, em vez de sumir silenciosamente.
import type { JobHandler } from './runner';
import { ASAAS_WEBHOOK_JOB, processAsaasWebhook } from '@/lib/integrations/asaas/webhook';

export const jobHandlers: Record<string, JobHandler> = {
  [ASAAS_WEBHOOK_JOB]: (payload) => processAsaasWebhook(payload),
};
