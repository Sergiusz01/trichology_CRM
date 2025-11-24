import nodemailer from 'nodemailer';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
  }>;
}

let transporter: nodemailer.Transporter | null = null;

const createTransporter = (): nodemailer.Transporter => {
  if (transporter) {
    return transporter;
  }

  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secureValue = process.env.SMTP_SECURE?.toLowerCase();
  
  // Port 465 = SSL/TLS (secure: true), Port 587 = STARTTLS (secure: false, requireTLS: true)
  // If port is 587, always use STARTTLS regardless of SMTP_SECURE value
  const isSecure = port === 465 || (secureValue === 'true' && port !== 587);
  const requireTLS = port === 587 || (!isSecure && secureValue !== 'false');

  const smtpConfig: any = {
    host: process.env.SMTP_HOST,
    port: port,
    secure: isSecure,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };

  // Add TLS options for STARTTLS (port 587)
  if (requireTLS && !isSecure) {
    smtpConfig.requireTLS = true;
    smtpConfig.tls = {
      rejectUnauthorized: false, // Allow self-signed certificates if needed
    };
  }

  transporter = nodemailer.createTransport(smtpConfig);

  return transporter;
};

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  const emailTransporter = createTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'noreply@trichology-clinic.pl',
    to: options.to,
    subject: options.subject,
    html: options.html,
    attachments: options.attachments,
  };

  try {
    await emailTransporter.sendMail(mailOptions);
    console.log(`Email wysłany do: ${options.to}`);
  } catch (error) {
    console.error('Błąd wysyłania email:', error);
    throw error;
  }
};

export const verifyEmailConnection = async (): Promise<boolean> => {
  try {
    const emailTransporter = createTransporter();
    await emailTransporter.verify();
    return true;
  } catch (error) {
    console.error('Błąd weryfikacji połączenia email:', error);
    return false;
  }
};


