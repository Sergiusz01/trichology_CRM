interface EmailOptions {
    to: string;
    subject: string;
    html: string;
    attachments?: Array<{
        filename: string;
        content: Buffer | string;
    }>;
}
export declare const sendEmail: (options: EmailOptions) => Promise<void>;
export declare const verifyEmailConnection: () => Promise<boolean>;
export {};
//# sourceMappingURL=emailService.d.ts.map