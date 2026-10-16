type Level = 'debug' | 'info' | 'warn' | 'error';

export interface Logger {
  debug(message: string, meta?: Record<string, unknown>): void;
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

const ORDER: Record<Level, number> = { debug: 10, info: 20, warn: 30, error: 40 };

/**
 * Structured single-line JSON logs. Render's log viewer indexes these well,
 * and `jq` works on them locally. No pretty-printing in production.
 */
export const logger: Logger = (() => {
  const threshold = ORDER[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? ORDER.info;

  const emit = (lvl: Level, message: string, meta?: Record<string, unknown>): void => {
    if (ORDER[lvl] < threshold) return;
    const line = JSON.stringify({ t: new Date().toISOString(), lvl, msg: message, ...(meta ?? {}) });
    if (lvl === 'error') process.stderr.write(`${line}\n`);
    else process.stdout.write(`${line}\n`);
  };

  return {
    debug: (m, meta) => emit('debug', m, meta),
    info: (m, meta) => emit('info', m, meta),
    warn: (m, meta) => emit('warn', m, meta),
    error: (m, meta) => emit('error', m, meta),
  };
})();
