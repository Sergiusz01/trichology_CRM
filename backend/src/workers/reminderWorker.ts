import { startReminderWorker } from '../services/reminderWorker';
import { logger } from '../utils/logger';

logger.info('Reminder worker process starting');
startReminderWorker();



