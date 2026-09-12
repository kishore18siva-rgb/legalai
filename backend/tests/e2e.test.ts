import request from 'supertest';
import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import apiRouter from '../src/routes/api';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);

const validPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

describe('LegalLens Image-First Auto-Scan E2E Test Suite', () => {
  let authToken: string;
  let inspectionId: string;
  let autoScanFields: any[];

  test('1. Authentication: Login as Inspector', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inspector@legallens.gov.in', password: 'Inspector@123' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    authToken = res.body.token;
  });

  test('2. Image-First Auto-Scan: Upload package images & run OCR + AI Extraction', async () => {
    const sampleImagePath = path.join(process.cwd(), 'tests', 'sample_label.png');
    fs.writeFileSync(sampleImagePath, validPngBuffer);

    const res = await request(app)
      .post('/api/inspections/auto-scan')
      .set('Authorization', `Bearer ${authToken}`)
      .field('imageTypes', 'FRONT')
      .field('imageTypes', 'BACK')
      .attach('images', sampleImagePath)
      .attach('images', sampleImagePath);

    expect(res.status).toBe(200);
    expect(res.body.inspectionId).toBeDefined();
    expect(res.body.detectedProduct.category).toBeDefined();
    expect(res.body.imageCoverage.coverageStatus).toBeDefined();
    expect(res.body.extractedFields.length).toBeGreaterThan(0);

    inspectionId = res.body.inspectionId;
    autoScanFields = res.body.extractedFields;
  });

  test('3. User Review & Confirm: Run Deterministic Legal Rule Engine', async () => {
    const res = await request(app)
      .post(`/api/inspections/${inspectionId}/confirm-and-evaluate`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        confirmedProduct: {
          name: 'Britannia Marie Gold Biscuits',
          brand: 'Britannia',
          category: 'Food',
        },
        confirmedFields: autoScanFields,
      });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('COMPLETED');
    expect(res.body.ruleResults.length).toBeGreaterThan(0);
    expect(['PASS', 'FAIL', 'REVIEW', 'NOT_APPLICABLE']).toContain(res.body.overallResult);
  });

  test('4. PDF Report: Generate statutory PDF report', async () => {
    const res = await request(app)
      .get(`/api/inspections/${inspectionId}/report`)
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.reportUrl).toContain('.pdf');
  });

  test('5. Dashboard: Fetch updated analytics', async () => {
    const res = await request(app)
      .get('/api/dashboard')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.totalInspections).toBeGreaterThan(0);
  });
});
