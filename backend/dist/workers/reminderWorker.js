"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const reminderWorker_1 = require("../services/reminderWorker");
const logger_1 = require("../utils/logger");
logger_1.logger.info('Reminder worker process starting');
(0, reminderWorker_1.startReminderWorker)();
//# sourceMappingURL=reminderWorker.js.map