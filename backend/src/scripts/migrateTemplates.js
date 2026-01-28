const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

async function migrate() {
  try {
    const sqlPath = path.join(__dirname, '../../prisma/migrations/20260127000000_add_consultation_templates/migration.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');
    
    // Split by semicolons, but handle DO blocks carefully
    const statements = [];
    let current = '';
    let inDoBlock = false;
    
    for (const line of sql.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--')) continue;
      
      current += line + '\n';
      
      if (trimmed.includes('DO $$')) {
        inDoBlock = true;
      }
      if (inDoBlock && trimmed.includes('$$;')) {
        inDoBlock = false;
        statements.push(current.trim());
        current = '';
      } else if (!inDoBlock && trimmed.endsWith(';')) {
        statements.push(current.trim());
        current = '';
      }
    }
    
    for (const stmt of statements) {
      if (!stmt) continue;
      try {
        await prisma.$executeRawUnsafe(stmt);
        console.log('✓ Executed:', stmt.substring(0, 80).replace(/\n/g, ' '));
      } catch (error) {
        if (error.message.includes('already exists') || 
            error.message.includes('duplicate') ||
            error.message.includes('does not exist')) {
          console.log('⊘ Skipped (already exists):', stmt.substring(0, 60).replace(/\n/g, ' '));
        } else {
          console.error('✗ Error:', error.message);
          console.error('Statement:', stmt.substring(0, 100));
        }
      }
    }
    
    console.log('\n✓ Migration completed');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

migrate();
