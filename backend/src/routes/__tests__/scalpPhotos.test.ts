import app from '../app';
import request from 'supertest';
import path from 'path';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';

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

        // Generate test patient
        const testPatient = await prisma.patient.create({
            data: {
                firstName: 'Test',
                lastName: 'Patient',
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
            .attach('photo', filePath);

        expect(response.status).toBe(500); // Multer error
        expect(response.body.error).toMatch(/Niedozwolony format pliku/);

        fs.unlinkSync(filePath);
    });

    it('powinien poprawnie wgrać zdjęcie', async () => {
        // Write dummy JPG
        const filePath = path.join(__dirname, 'test_image.jpg');
        fs.writeFileSync(filePath, 'fake image content');

        const response = await request(app)
            .post(`/api/scalp-photos/patient/${testPatientId}`)
            .set('Authorization', `Bearer ${token}`)
            .attach('photo', filePath);

        expect(response.status).toBe(201);
        expect(response.body.scalpPhoto).toHaveProperty('filename');
        expect(response.body.scalpPhoto.filename).toMatch(/^scalp-.*\.jpg$/);

        fs.unlinkSync(filePath);
    });

    it('powinien zwrócić błąd 401 przy braku tokenu podczas pobierania', async () => {
        const response = await request(app)
            .get(`/api/uploads/secure/test-file.jpg`);

        expect(response.status).toBe(401);
        expect(response.body.error).toBe('Brak tokenu autoryzacyjnego');
    });

    it('powinien uniemożliwić atak Path Traversal', async () => {
        const response = await request(app)
            .get(`/api/uploads/secure/../../../etc/passwd?token=${token}`);

        expect(response.status).toBe(403);
        expect(response.body.error).toBe('Odmowa dostępu: niedozwolona ścieżka');
    });

    it('powinien zwrócić 404 dla nieistniejącego pliku', async () => {
        const response = await request(app)
            .get(`/api/uploads/secure/non-existent-file.jpg?token=${token}`);

        expect(response.status).toBe(404);
    });
});
