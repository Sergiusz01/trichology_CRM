"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateActionToken = generateActionToken;
exports.verifyActionToken = verifyActionToken;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const getSecret = () => {
    const secret = process.env.TOKEN_SECRET || process.env.JWT_SECRET;
    if (!secret)
        throw new Error('TOKEN_SECRET (lub JWT_SECRET) nie jest ustawiony');
    return secret;
};
const TOKEN_EXPIRY = '48h';
function generateActionToken(visitId, action) {
    return jsonwebtoken_1.default.sign({ visitId, action }, getSecret(), { expiresIn: TOKEN_EXPIRY });
}
function verifyActionToken(token) {
    const payload = jsonwebtoken_1.default.verify(token, getSecret());
    if (!payload.visitId || !payload.action) {
        throw new Error('Nieprawidłowy format tokenu');
    }
    return { visitId: payload.visitId, action: payload.action };
}
//# sourceMappingURL=appointmentToken.js.map