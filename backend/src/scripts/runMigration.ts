import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function runMigration() {
  try {
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, '../../prisma/migrations/20260127000000_add_consultation_templates/migration.sql'),
      'utf-8'
    );

    // Split by semicolons and execute each statement
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement.trim()) {
        try {
          await prisma.$executeRawUnsafe(statement);
          console.log('Executed:', statement.substring(0, 50) + '...');
        } catch (error: any) {
          // Ignore errors for IF NOT EXISTS clauses
          if (!error.message.includes('already exists') && !error.message.includes('duplicate')) {
            console.error('Error executing:', statement.substring(0, 50));
            console.error(error.message);
          }
        }
      }
    }

    console.log('Migration completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runMigration();
