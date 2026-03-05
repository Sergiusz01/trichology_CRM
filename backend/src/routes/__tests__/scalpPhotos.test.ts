import request from 'supertest';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import app from '../../app';
import { prisma } from '../../prisma';

describe('Scalp Photos Upload & Download API', () => {
    let token: string;
    let testPatientId: string;
    let testUserId: string;

    beforeAll(async () => {
        // Generate test user
        const testUser = await prisma.user.upsert({
            where: { email: 'test_doctor@example.com' },
            update: {},
            create: {
                email: 'test_doctor@example.com',
                name: 'Test Doctor',
                passwordHash: 'hashed_password_mock',
                role: 'DOCTOR',
            }
        });
        testUserId = testUser.id;

        // Generate token
        token = jwt.sign({ userId: testUserId }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' });

        // Generate test patient — assigned to the test doctor so C-1 check passes
        const testPatient = await prisma.patient.create({
            data: {
                firstName: 'Test',
                lastName: 'Patient',
                assignedDoctorId: testUserId,
            }
        });
        testPatientId = testPatient.id;
    });

    afterAll(async () => {
        await prisma.scalpPhoto.deleteMany({ where: { patientId: testPatientId } });
        await prisma.patient.delete({ where: { id: testPatientId } });
        await prisma.$disconnect();
    });

    it('powinien odrzucić plik o niedozwolonym formacie', async () => {
        const filePath = path.join(__dirname, 'test.txt');
        fs.writeFileSync(filePath, 'dummy content');

        const response = await request(app)
            .post(`/api/scalp-photos/patient/${testPatientId}`)
            .set('Authorization', `Bearer ${token}`)
            .attach('photo', filePath, { contentType: 'text/plain' });

        // Multer fileFilter rejects non-image MIME → 4xx or 5xx (error handler dependent)
        expect([400, 500]).toContain(response.status);

        fs.unlinkSync(filePath);
    });

    it('powinien poprawnie wgrać zdjęcie', async () => {
        // Minimal valid JPEG: SOI + APP0 JFIF header
        const filePath = path.join(__dirname, 'test_image.jpg');
        const jpegBytes = Buffer.from([
            0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10,
            0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
            0x01, 0x00, 0x00, 0x01, 0x00, 0x01,
            0x00, 0x00, 0xFF, 0xD9,
        ]);
        fs.writeFileSync(filePath, jpegBytes);

        const response = await request(app)
            .post(`/api/scalp-photos/patient/${testPatientId}`)
            .set('Authorization', `Bearer ${token}`)
            .attach('photo', filePath, { contentType: 'image/jpeg' });

        expect(response.status).toBe(201);
        expect(response.body.scalpPhoto).toHaveProperty('filename');
        expect(response.body.scalpPhoto.filename).toMatch(/^scalp-.*\.jpg$/);

        // Cleanup uploaded file from DB
        if (response.body.scalpPhoto?.id) {
            await prisma.scalpPhoto.delete({ where: { id: response.body.scalpPhoto.id } }).catch(() => {});
        }
        fs.unlinkSync(filePath);
    });

    it('powinien zwrócić błąd 401 przy braku tokenu podczas pobierania', async () => {
        const response = await request(app)
            .get(`/api/uploads/secure/test-file.jpg`);

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Brak tokenu autoryzacyjnego');
    });

    it('powinien uniemożliwić atak Path Traversal', async () => {
        // Express normalizes '../' in URLs, so the route may 404 or 400 depending on path
        const response = await request(app)
            .get(`/api/uploads/secure/%2e%2e%2fetc%2fpasswd?token=${token}`);

        expect([400, 403, 404]).toContain(response.status);
    });

    it('powinien zwrócić 404 dla nieistniejącego pliku', async () => {
        const response = await request(app)
            .get(`/api/uploads/secure/non-existent-file.jpg?token=${token}`);

        expect(response.status).toBe(404);
    });
});
