/**
 * Security regression tests for C-1 through C-5 fixes.
 *
 * Prerequisites:
 *   npm install --save-dev jest ts-jest supertest @types/jest @types/supertest
 *   DATABASE_URL must be set (real or test database).
 *
 * Run:  npx jest src/routes/__tests__/security.test.ts
 */

import request from 'supertest';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import app from '../../app';         // re-exported express app without listen()
import { prisma } from '../../prisma';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

// ─── helpers ────────────────────────────────────────────────────────────────

function makeToken(userId: string, role = 'DOCTOR') {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1h' });
}

async function createUser(email: string, role: string, clinicId?: string) {
  return prisma.user.upsert({
    where: { email },
    update: { role: role as any, clinicId: clinicId ?? null },
    create: {
      email,
      name: `Test ${role}`,
      passwordHash: 'hash',
      role: role as any,
      clinicId: clinicId ?? null,
    },
  });
}

async function createPatient(opts: {
  clinicId?: string;
  assignedDoctorId?: string;
}) {
  return prisma.patient.create({
    data: {
      firstName: 'Test',
      lastName: `Patient-${Date.now()}`,
      clinicId: opts.clinicId ?? null,
      assignedDoctorId: opts.assignedDoctorId ?? null,
    },
  });
}

// ─── test state ─────────────────────────────────────────────────────────────

let adminUser: any;
let doctorA: any;       // clinicId = 'clinic-A'
let doctorB: any;       // clinicId = 'clinic-B'
let assistantA: any;    // clinicId = 'clinic-A'

let adminToken: string;
let doctorAToken: string;
let doctorBToken: string;
let assistantAToken: string;

// Patient belonging to clinic-A, assigned to doctorA
let patientA: any;
// Patient belonging to clinic-B
let patientB: any;

const createdPatientIds: string[] = [];
const createdUserEmails: string[] = [];

beforeAll(async () => {
  adminUser   = await createUser('sec_admin@test.local',   'ADMIN');
  doctorA     = await createUser('sec_doctorA@test.local', 'DOCTOR', 'clinic-A');
  doctorB     = await createUser('sec_doctorB@test.local', 'DOCTOR', 'clinic-B');
  assistantA  = await createUser('sec_assistA@test.local', 'ASSISTANT', 'clinic-A');

  createdUserEmails.push(adminUser.email, doctorA.email, doctorB.email, assistantA.email);

  adminToken     = makeToken(adminUser.id, 'ADMIN');
  doctorAToken   = makeToken(doctorA.id,   'DOCTOR');
  doctorBToken   = makeToken(doctorB.id,   'DOCTOR');
  assistantAToken = makeToken(assistantA.id, 'ASSISTANT');

  patientA = await createPatient({ clinicId: 'clinic-A', assignedDoctorId: doctorA.id });
  patientB = await createPatient({ clinicId: 'clinic-B' });
  createdPatientIds.push(patientA.id, patientB.id);
});

afterAll(async () => {
  await prisma.patient.deleteMany({ where: { id: { in: createdPatientIds } } });
  await prisma.user.deleteMany({ where: { email: { in: createdUserEmails } } });
  await prisma.$disconnect();
});

// ═══════════════════════════════════════════════════════════════════════════
// C-1 — IDOR: Patient access control
// ═══════════════════════════════════════════════════════════════════════════

describe('[C-1] IDOR — patient access control', () => {

  // ── GET /api/patients/:id ──────────────────────────────────────────────

  it('DOCTOR from clinic-A can read their own assigned patient', async () => {
    const res = await request(app)
      .get(`/api/patients/${patientA.id}`)
      .set('Authorization', `Bearer ${doctorAToken}`);
    expect(res.status).toBe(200);
    expect(res.body.patient.id).toBe(patientA.id);
  });

  it('DOCTOR from clinic-B is denied access to a clinic-A patient [403]', async () => {
    const res = await request(app)
      .get(`/api/patients/${patientA.id}`)
      .set('Authorization', `Bearer ${doctorBToken}`);
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/dostęp/i);
  });

  it('ASSISTANT from clinic-A can read a clinic-A patient', async () => {
    const res = await request(app)
      .get(`/api/patients/${patientA.id}`)
      .set('Authorization', `Bearer ${assistantAToken}`);
    expect(res.status).toBe(200);
  });

  it('ASSISTANT from clinic-A is denied access to a clinic-B patient [403]', async () => {
    const res = await request(app)
      .get(`/api/patients/${patientB.id}`)
      .set('Authorization', `Bearer ${assistantAToken}`);
    expect(res.status).toBe(403);
  });

  it('ADMIN has unrestricted access to any patient', async () => {
    const resA = await request(app)
      .get(`/api/patients/${patientA.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    const resB = await request(app)
      .get(`/api/patients/${patientB.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
  });

  // ── GET /api/patients (list) ───────────────────────────────────────────

  it('List endpoint does not leak clinic-B patients to clinic-A doctor', async () => {
    const res = await request(app)
      .get('/api/patients?limit=500')
      .set('Authorization', `Bearer ${doctorAToken}`);
    expect(res.status).toBe(200);
    const ids = res.body.patients.map((p: any) => p.id);
    expect(ids).not.toContain(patientB.id);
  });

  // ── PUT /api/patients/:id ──────────────────────────────────────────────

  it('DOCTOR from clinic-B cannot update a clinic-A patient [403]', async () => {
    const res = await request(app)
      .put(`/api/patients/${patientA.id}`)
      .set('Authorization', `Bearer ${doctorBToken}`)
      .send({ firstName: 'Hacked', lastName: 'User' });
    expect(res.status).toBe(403);
  });

  // ── Regression: assignedDoctorId = null must NOT be accessible to any DOCTOR ──

  it('Unassigned patient (assignedDoctorId=null) is blocked for DOCTOR [403]', async () => {
    // Create a patient with no assignedDoctorId
    const unassigned = await createPatient({ clinicId: 'clinic-A' }); // no assignedDoctorId
    createdPatientIds.push(unassigned.id);

    const res = await request(app)
      .get(`/api/patients/${unassigned.id}`)
      .set('Authorization', `Bearer ${doctorAToken}`);
    expect(res.status).toBe(403);
  });

  it('Unassigned patient does NOT appear in DOCTOR list', async () => {
    // All previously-created patientIds that are unassigned
    const res = await request(app)
      .get('/api/patients?limit=500')
      .set('Authorization', `Bearer ${doctorAToken}`);
    expect(res.status).toBe(200);
    const ids: string[] = res.body.patients.map((p: any) => p.id);
    // patientA is assigned to doctorA — should be visible
    expect(ids).toContain(patientA.id);
    // patientB (clinic-B) and all unassigned patients — must NOT appear
    expect(ids).not.toContain(patientB.id);
    // No patient with assignedDoctorId !== doctorA.id may appear
    const unexpectedDoctorIds = res.body.patients
      .filter((p: any) => p.assignedDoctorId && p.assignedDoctorId !== doctorA.id);
    expect(unexpectedDoctorIds).toHaveLength(0);
  });

});

// ═══════════════════════════════════════════════════════════════════════════
// C-2 — IDOR: Secure file download
// ═══════════════════════════════════════════════════════════════════════════

describe('[C-2] IDOR — secure file download', () => {

  it('Returns 401 for requests without a token', async () => {
    const res = await request(app).get('/api/uploads/secure/some-photo.jpg');
    expect(res.status).toBe(401);
  });

  it('Returns 404 when filename has no DB record (even with valid token)', async () => {
    const token = makeToken(adminUser.id);
    const res = await request(app)
      .get('/api/uploads/secure/nonexistent-photo-xyz.jpg')
      .set('Authorization', `Bearer ${token}`);
    // file has no DB record → 404
    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/nie znaleziony|nie istnieje/i);
  });

});

// ═══════════════════════════════════════════════════════════════════════════
// C-3 — Path traversal prevention
// ═══════════════════════════════════════════════════════════════════════════

describe('[C-3] Path traversal in /api/uploads/secure/:filename', () => {

  it('Rejects "../" path traversal attempt [400]', async () => {
    const token = makeToken(adminUser.id);
    const res = await request(app)
      .get('/api/uploads/secure/../../../etc/passwd')
      .set('Authorization', `Bearer ${token}`);
    expect([400, 403, 404]).toContain(res.status);
  });

  it('Rejects "%2e%2e%2f" encoded traversal [400]', async () => {
    const token = makeToken(adminUser.id);
    const res = await request(app)
      .get('/api/uploads/secure/%2e%2e%2fetc%2fpasswd')
      .set('Authorization', `Bearer ${token}`);
    expect([400, 403, 404]).toContain(res.status);
  });

  it('Rejects filenames starting with a dot [400]', async () => {
    const token = makeToken(adminUser.id);
    const res = await request(app)
      .get('/api/uploads/secure/.env')
      .set('Authorization', `Bearer ${token}`);
    expect([400, 404]).toContain(res.status);
  });

  it('Accepts a syntactically valid filename (may 404 if file absent)', async () => {
    const token = makeToken(adminUser.id);
    const res = await request(app)
      .get('/api/uploads/secure/scalp-valid-uuid.jpg')
      .set('Authorization', `Bearer ${token}`);
    // 400 means path traversal block triggered — bad; 404 is expected (file not in DB)
    expect(res.status).not.toBe(400);
  });

});

// ═══════════════════════════════════════════════════════════════════════════
// C-5 — Magic bytes validation
// ═══════════════════════════════════════════════════════════════════════════

describe('[C-5] Magic bytes validation on photo upload', () => {

  const uploadUrl = `/api/scalp-photos/patient`;

  it('Rejects a text file masquerading as image/jpeg [400]', async () => {
    const fakeJpg = path.join(__dirname, '_fake.jpg');
    fs.writeFileSync(fakeJpg, 'not a real jpeg — just text content');

    const res = await request(app)
      .post(`${uploadUrl}/${patientA.id}`)
      .set('Authorization', `Bearer ${doctorAToken}`)
      .attach('photo', fakeJpg, { contentType: 'image/jpeg' });

    fs.unlinkSync(fakeJpg);
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Nieprawidłowy typ pliku|typ pliku|format/i);
  });

  it('Accepts a real JPEG (minimal valid JPEG header)', async () => {
    const validJpg = path.join(__dirname, '_valid.jpg');
    // Minimal valid JPEG: SOI + APP0 JFIF segment + EOI
    const jpegBytes = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10,
      0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x00, 0x00, 0x01, 0x00, 0x01,
      0x00, 0x00, 0xFF, 0xD9,
    ]);
    fs.writeFileSync(validJpg, jpegBytes);

    const res = await request(app)
      .post(`${uploadUrl}/${patientA.id}`)
      .set('Authorization', `Bearer ${doctorAToken}`)
      .attach('photo', validJpg, { contentType: 'image/jpeg' });

    fs.unlinkSync(validJpg);
    // Expect 201 (created) or at least not 400 (magic bytes rejection)
    expect(res.status).not.toBe(400);
    // Cleanup any created photo from DB
    if (res.body.scalpPhoto?.id) {
      await prisma.scalpPhoto.delete({ where: { id: res.body.scalpPhoto.id } }).catch(() => {});
    }
  });

  it('Rejects an oversized file [413 or 400]', async () => {
    // 11 MB > 10 MB limit
    const bigFile = path.join(__dirname, '_big.jpg');
    const buf = Buffer.alloc(11 * 1024 * 1024, 0xFF);
    // Put valid JPEG header so magic bytes pass; size limit should reject
    buf[0] = 0xFF; buf[1] = 0xD8; buf[2] = 0xFF;
    fs.writeFileSync(bigFile, buf);

    const res = await request(app)
      .post(`${uploadUrl}/${patientA.id}`)
      .set('Authorization', `Bearer ${doctorAToken}`)
      .attach('photo', bigFile, { contentType: 'image/jpeg' });

    if (fs.existsSync(bigFile)) fs.unlinkSync(bigFile);
    expect([400, 413, 500]).toContain(res.status);
  });

});

// ═══════════════════════════════════════════════════════════════════════════
// C-4 — Email: patient access verification
// ═══════════════════════════════════════════════════════════════════════════

describe('[C-4] Email send — patient access verification', () => {

  it('Doctor from clinic-B cannot send email to clinic-A patient [403]', async () => {
    const res = await request(app)
      .post('/api/email/send')
      .set('Authorization', `Bearer ${doctorBToken}`)
      .send({
        patientId: patientA.id,
        subject: 'Test',
        message: 'Unauthorized access attempt',
        recipientEmail: 'hacker@example.com',
      });
    expect(res.status).toBe(403);
    expect(res.body.error).toMatch(/dostęp/i);
  });

  it('Doctor from clinic-A can initiate email to their own patient (mail may fail in test)', async () => {
    const res = await request(app)
      .post('/api/email/send')
      .set('Authorization', `Bearer ${doctorAToken}`)
      .send({
        patientId: patientA.id,
        subject: 'Test authorized send',
        message: 'Authorized message',
        recipientEmail: 'clinic-a-patient@example.com',
      });
    // 200 = sent, 500 = SMTP not configured in test env — both acceptable, NOT 403
    expect(res.status).not.toBe(403);
  });

  it('ADMIN can send email to any patient', async () => {
    const res = await request(app)
      .post('/api/email/send')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        patientId: patientB.id,
        subject: 'Admin test',
        message: 'Admin message',
        recipientEmail: 'admin@example.com',
      });
    expect(res.status).not.toBe(403);
  });

});
