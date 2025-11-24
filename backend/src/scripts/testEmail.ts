import { sendEmail, verifyEmailConnection } from '../services/emailService';
import dotenv from 'dotenv';

dotenv.config();

async function testEmail() {
  console.log('🔍 Sprawdzanie konfiguracji email...\n');

  // Check environment variables
  console.log('📋 Konfiguracja:');
  console.log(`  SMTP_HOST: ${process.env.SMTP_HOST || 'BRAK'}`);
  console.log(`  SMTP_PORT: ${process.env.SMTP_PORT || 'BRAK'}`);
  console.log(`  SMTP_SECURE: ${process.env.SMTP_SECURE || 'BRAK'}`);
  console.log(`  SMTP_USER: ${process.env.SMTP_USER ? '***' : 'BRAK'}`);
  console.log(`  SMTP_PASS: ${process.env.SMTP_PASS ? '***' : 'BRAK'}`);
  console.log(`  EMAIL_FROM: ${process.env.EMAIL_FROM || 'BRAK'}`);
  console.log('');

  // Check if all required variables are set
  const requiredVars = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];
  const missingVars = requiredVars.filter((varName) => !process.env[varName]);

  if (missingVars.length > 0) {
    console.error('❌ Brakujące zmienne środowiskowe:', missingVars.join(', '));
    console.error('   Uzupełnij je w pliku backend/.env');
    process.exit(1);
  }

  // Test connection
  console.log('🔌 Testowanie połączenia z serwerem SMTP...');
  try {
    const isValid = await verifyEmailConnection();
    if (isValid) {
      console.log('✅ Połączenie z serwerem SMTP działa poprawnie!\n');
    } else {
      console.error('❌ Nie można połączyć się z serwerem SMTP');
      console.error('   Sprawdź:');
      console.error('   - Czy serwer SMTP jest dostępny');
      console.error('   - Czy dane logowania są poprawne');
      console.error('   - Czy port nie jest zablokowany przez firewall');
      process.exit(1);
    }
  } catch (error: any) {
    console.error('❌ Błąd połączenia:', error.message);
    console.error('\n💡 Możliwe przyczyny:');
    console.error('   - Nieprawidłowy host lub port');
    console.error('   - Nieprawidłowe dane logowania');
    console.error('   - Problem z konfiguracją SSL/TLS');
    console.error('   - Port zablokowany przez firewall');
    process.exit(1);
  }

  // Test sending email (optional - requires recipient email)
  const testEmail = process.argv[2];
  if (testEmail) {
    console.log(`📧 Wysyłanie testowego emaila do: ${testEmail}...`);
    try {
      await sendEmail({
        to: testEmail,
        subject: 'Test email z systemu trychologicznego',
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>Test email</h2>
            <p>To jest testowy email z systemu zarządzania konsultacjami trychologicznymi.</p>
            <p>Jeśli otrzymałeś tę wiadomość, oznacza to, że konfiguracja email działa poprawnie.</p>
            <p style="margin-top: 20px; color: #666; font-size: 12px;">
              Data wysłania: ${new Date().toLocaleString('pl-PL')}
            </p>
          </div>
        `,
      });
      console.log('✅ Testowy email wysłany pomyślnie!');
    } catch (error: any) {
      console.error('❌ Błąd wysyłania testowego emaila:', error.message);
      process.exit(1);
    }
  } else {
    console.log('\n💡 Aby wysłać testowy email, uruchom:');
    console.log('   npm run test-email <adres-email>');
  }

  console.log('\n✅ Konfiguracja email jest poprawna!');
}

testEmail()
  .catch((error) => {
    console.error('❌ Błąd:', error);
    process.exit(1);
  });

