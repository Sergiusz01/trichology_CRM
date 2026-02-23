import express from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { prisma } from '../prisma';
import puppeteer from 'puppeteer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Helper functions for formatting dates and money
const formatDate = (date: Date) => date.toLocaleDateString('pl-PL');
const formatCurrency = (amount: number | string) => {
    return Number(amount).toLocaleString('pl-PL', { style: 'currency', currency: 'PLN' });
};

router.get('/monthly', authenticate, async (req: AuthRequest, res, next) => {
    try {
        const { month } = req.query; // Expected: YYYY-MM

        if (!month || typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month)) {
            return res.status(400).json({ error: 'Nieprawidłowy format miesiąca (oczekiwany YYYY-MM)' });
        }

        const startDate = new Date(`${month}-01T00:00:00.000Z`);
        const endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 23, 59, 59, 999);

        // Fetch visits within this month
        const visits = await prisma.visit.findMany({
            where: {
                data: {
                    gte: startDate,
                    lte: endDate
                },
                status: 'ODBYTA' // Consider only completed visits for revenue/reports generally
            },
            include: {
                patient: {
                    select: { firstName: true, lastName: true }
                }
            },
            orderBy: { data: 'asc' }
        });

        const totalVisits = visits.length;
        const totalRevenue = visits.reduce((sum, v) => sum + (v.cena ? Number(v.cena) : 0), 0);

        // Generate HTML for the PDF
        const htmlTemplate = `
            <!DOCTYPE html>
            <html lang="pl">
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
                        color: #333;
                        line-height: 1.6;
                        margin: 0;
                        padding: 40px;
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 40px;
                        border-bottom: 2px solid #2563EB;
                        padding-bottom: 20px;
                    }
                    .header h1 {
                        color: #1e3a8a;
                        margin: 0;
                        font-size: 28px;
                    }
                    .header p {
                        margin: 5px 0 0 0;
                        color: #64748b;
                        font-size: 16px;
                    }
                    .summary {
                        background-color: #f8fafc;
                        border: 1px solid #e2e8f0;
                        border-radius: 8px;
                        padding: 20px;
                        margin-bottom: 40px;
                        display: flex;
                        justify-content: space-around;
                    }
                    .summary-box {
                        text-align: center;
                    }
                    .summary-box .label {
                        font-size: 14px;
                        color: #64748b;
                        text-transform: uppercase;
                        letter-spacing: 0.05em;
                    }
                    .summary-box .value {
                        font-size: 24px;
                        font-weight: bold;
                        color: #0f172a;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 20px;
                    }
                    th, td {
                        padding: 12px 15px;
                        text-align: left;
                        border-bottom: 1px solid #e2e8f0;
                    }
                    th {
                        background-color: #f1f5f9;
                        color: #334155;
                        font-weight: 600;
                        text-transform: uppercase;
                        font-size: 13px;
                    }
                    tr:nth-child(even) {
                        background-color: #f8fafc;
                    }
                    .footer {
                        margin-top: 50px;
                        text-align: center;
                        font-size: 12px;
                        color: #94a3b8;
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>Raport Miesięczny CRM</h1>
                    <p>Za miesiąc: ${month}</p>
                </div>
                
                <div class="summary">
                    <div class="summary-box">
                        <div class="label">Odbyte Wizyty</div>
                        <div class="value">${totalVisits}</div>
                    </div>
                    <div class="summary-box">
                        <div class="label">Suma Przychodu</div>
                        <div class="value">${formatCurrency(totalRevenue)}</div>
                    </div>
                </div>

                <h3>Zestawienie wizyt</h3>
                <table>
                    <thead>
                        <tr>
                            <th>Data</th>
                            <th>Pacjent</th>
                            <th>Rodzaj Zabiegu</th>
                            <th>Przychód</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${visits.map(v => `
                            <tr>
                                <td>${formatDate(v.data)}</td>
                                <td>${v.patient.firstName} ${v.patient.lastName}</td>
                                <td>${v.rodzajZabiegu}</td>
                                <td>${v.cena ? formatCurrency(Number(v.cena)) : '-'}</td>
                            </tr>
                        `).join('')}
                        ${visits.length === 0 ? '<tr><td colspan="4" style="text-align: center;">Brak wizyt w tym miesiącu</td></tr>' : ''}
                    </tbody>
                </table>

                <div class="footer">
                    Wygenerowano systemowo w: Trichology CRM &copy; ${new Date().getFullYear()}
                </div>
            </body>
            </html>
        `;

        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });
        const page = await browser.newPage();
        await page.setContent(htmlTemplate, { waitUntil: 'networkidle0' });

        const pdfBuffer = await page.pdf({
            format: 'A4',
            printBackground: true,
            margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' }
        });

        await browser.close();

        res.contentType('application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="Raport_${month}.pdf"`);
        res.send(pdfBuffer);

    } catch (err) {
        console.error('Błąd generatora PDF:', err);
        next(err);
    }
});

export default router;
