"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestIdMiddleware = requestIdMiddleware;
const node_crypto_1 = __importDefault(require("node:crypto"));
const HEADER = 'X-Request-Id';
function requestIdMiddleware(req, res, next) {
    const incoming = req.headers['x-request-id'];
    const id = (typeof incoming === 'string' ? incoming : undefined) || node_crypto_1.default.randomUUID();
    req.requestId = id;
    res.setHeader(HEADER, id);
    next();
}
//# sourceMappingURL=requestId.js.map