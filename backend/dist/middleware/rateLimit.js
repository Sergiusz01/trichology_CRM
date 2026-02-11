"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLimiter = exports.pdfLimiter = exports.refreshLimiter = exports.authLimiter = exports.apiLimiter = void 0;
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const standard = {
    standardHeaders: true,
    legacyHeaders: false,
};
exports.apiLimiter = (0, express_rate_limit_1.default)({
    ...standard,
    windowMs: 15 * 60 * 1000,
    limit: 300,
});
exports.authLimiter = (0, express_rate_limit_1.default)({
    ...standard,
    windowMs: 15 * 60 * 1000,
    limit: 100, // Zwiększony limit dla logowania
});
exports.refreshLimiter = (0, express_rate_limit_1.default)({
    ...standard,
    windowMs: 15 * 60 * 1000,
    limit: 60,
});
exports.pdfLimiter = (0, express_rate_limit_1.default)({
    ...standard,
    windowMs: 15 * 60 * 1000,
    limit: 20,
});
exports.uploadLimiter = (0, express_rate_limit_1.default)({
    ...standard,
    windowMs: 15 * 60 * 1000,
    limit: 40,
});
//# sourceMappingURL=rateLimit.js.map