import * as log from 'npmlog';
import { LogLevel } from './types';

const prefix = 'workspace-integrations';

const logger = {
  setLogLevel(level: LogLevel) {
    // @ts-ignore
    log.level = level;
    logger.info(`Log level: ${level}`);
  },

  error(message: string) {
    log.error(prefix, message);
  },

  warn(message: string) {
    log.warn(prefix, message);
  },

  info(message: string) {
    log.info(prefix, message);
  },

  verbose(message: string) {
    log.verbose(prefix, message);
  },
}

export default logger;