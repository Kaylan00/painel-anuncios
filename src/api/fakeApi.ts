import { BULK_RULES, canTransition } from '../features/listings/model/statusRules';
import type { Listing, ListingEdit, ListingStatus } from '../features/listings/model/types';
import { validateEdit } from '../features/listings/model/validation';

export type ApiErrorCode = 'network' | 'server' | 'validation' | 'not_found' | 'conflict';

export class ApiError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
  }
}

export interface BulkResult {
  updated: Listing[];
  failed: Array<{ id: string; reason: string }>;
}

/** Contrato que o restante do app enxerga. Trocar por HTTP de verdade não mexe nos slices. */
export interface ListingsApi {
  fetchListings(): Promise<Listing[]>;
  updateListing(id: string, edit: ListingEdit): Promise<Listing>;
  bulkUpdateStatus(ids: string[], status: ListingStatus): Promise<BulkResult>;
}

export interface SimulationConfig {
  minLatencyMs: number;
  maxLatencyMs: number;
  /** Chance de a requisição inteira falhar. */
  failureRate: number;
  /** Chance de cada item falhar dentro de um lote que deu certo. */
  itemFailureRate: number;
}

export const DEFAULT_SIMULATION: SimulationConfig = {
  minLatencyMs: 250,
  maxLatencyMs: 800,
  failureRate: 0.1,
  itemFailureRate: 0.03,
};

export interface FakeApiOptions extends Partial<SimulationConfig> {
  random?: () => number;
  now?: () => number;
  loadSeed?: () => Promise<Listing[]>;
  /** Por padrão a primeira carga nunca falha, para quem abre a demo ver a lista de cara. */
  failFirstLoad?: boolean;
}

export interface FakeApi extends ListingsApi {
  configure(config: Partial<SimulationConfig>): void;
  getConfig(): SimulationConfig;
}

const DAY = 86_400_000;
const RENEWAL_DAYS = 60;

export function createFakeApi(options: FakeApiOptions = {}): FakeApi {
  const {
    random = Math.random,
    now = Date.now,
    // Import dinâmico: os dados de exemplo ficam num chunk próprio, fora do bundle inicial.
    loadSeed = async () => (await import('./seed')).generateListings(),
    failFirstLoad = false,
    ...initial
  } = options;

  let config: SimulationConfig = { ...DEFAULT_SIMULATION, ...initial };
  let db: Promise<Map<string, Listing>> | undefined;
  let firstLoadDone = failFirstLoad;

  const getDb = () => {
    db ??= loadSeed().then((rows) => new Map(rows.map((row) => [row.id, row])));
    return db;
  };

  const wait = () => {
    const span = config.maxLatencyMs - config.minLatencyMs;
    const ms = config.minLatencyMs + random() * span;
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  };

  const shouldFail = () => random() < config.failureRate;

  const failure = () =>
    random() < 0.5
      ? new ApiError('network', 'Sem resposta do servidor.')
      : new ApiError('server', 'O servidor retornou um erro inesperado.');

  const write = (rows: Map<string, Listing>, row: Listing, changes: Partial<Listing>) => {
    const next: Listing = {
      ...row,
      ...changes,
      version: row.version + 1,
      updatedAt: new Date(now()).toISOString(),
    };
    rows.set(row.id, next);
    return structuredClone(next);
  };

  return {
    configure(next) {
      config = { ...config, ...next };
    },

    getConfig() {
      return { ...config };
    },

    async fetchListings() {
      const fail = firstLoadDone && shouldFail();
      firstLoadDone = true;
      const rows = await getDb();
      const snapshot = structuredClone([...rows.values()]);
      await wait();
      if (fail) throw failure();
      return snapshot;
    },

    /*
     * A decisão e a escrita acontecem na chegada, antes da latência. Assim a ordem
     * no "servidor" é a ordem de envio, mas as respostas podem voltar trocadas,
     * como numa rede real. O campo version existe para tratar esse caso.
     */
    async updateListing(id, edit) {
      const fail = shouldFail();
      const rows = await getDb();

      const settle = (): Listing => {
        if (fail) throw failure();
        const row = rows.get(id);
        if (!row) throw new ApiError('not_found', 'Anúncio não encontrado.');
        if (row.status === 'vendido') throw new ApiError('conflict', 'Anúncio vendido não pode ser editado.');
        const errors = validateEdit(edit);
        const message = errors.title ?? errors.priceCents;
        if (message) throw new ApiError('validation', message);
        const changes = edit.title === undefined ? edit : { ...edit, title: edit.title.trim() };
        return write(rows, row, changes);
      };

      let outcome: { ok: Listing } | { error: unknown };
      try {
        outcome = { ok: settle() };
      } catch (error) {
        outcome = { error };
      }
      await wait();
      if ('error' in outcome) throw outcome.error;
      return outcome.ok;
    },

    async bulkUpdateStatus(ids, status) {
      const fail = shouldFail();
      const rows = await getDb();
      const result: BulkResult = { updated: [], failed: [] };

      if (!fail) {
        for (const id of ids) {
          const row = rows.get(id);
          if (!row) {
            result.failed.push({ id, reason: 'Anúncio não encontrado.' });
          } else if (!canTransition(row.status, status)) {
            result.failed.push({ id, reason: `Não dá para ir de ${row.status} para ${status}.` });
          } else if (random() < config.itemFailureRate) {
            result.failed.push({ id, reason: 'Falha ao salvar este anúncio.' });
          } else {
            // Reativar um anúncio vencido renova o prazo: um dado que só o servidor conhece.
            const renewed =
              row.status === 'expirado' && status === BULK_RULES.reativar.to
                ? { expiresAt: new Date(now() + RENEWAL_DAYS * DAY).toISOString() }
                : {};
            result.updated.push(write(rows, row, { status, ...renewed }));
          }
        }
      }

      await wait();
      if (fail) throw failure();
      return result;
    },
  };
}
