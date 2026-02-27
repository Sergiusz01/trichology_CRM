export type AppointmentAction = 'confirm' | 'cancel' | 'reschedule';
interface TokenPayload {
    visitId: string;
    action: AppointmentAction;
}
export declare function generateActionToken(visitId: string, action: AppointmentAction): string;
export declare function verifyActionToken(token: string): TokenPayload;
export {};
//# sourceMappingURL=appointmentToken.d.ts.map