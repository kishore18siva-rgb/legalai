import request from 'supertest';
import express from 'express';
import cors from 'cors';
import apiRouter from '../src/routes/api';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api', apiRouter);

describe('LegalLens Authentication & RBAC Suite', () => {
  let adminToken: string;
  let reviewerToken: string;
  let inspectorToken: string;
  let newInspectorEmail = `inspector_${Date.now()}@legallens.gov.in`;
  let newEmpNumber = `EMP-${Date.now()}`;
  let newPhone = `98${Math.floor(10000000 + Math.random() * 90000000)}`;

  test('1. Login with Valid Provisioned Credentials', async () => {
    // Admin Login
    const adminRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@legallens.gov.in', password: 'Admin@123456' });
    expect(adminRes.status).toBe(200);
    expect(adminRes.body.token).toBeDefined();
    expect(adminRes.body.user.role).toBe('SYSTEM_ADMINISTRATOR');
    adminToken = adminRes.body.token;

    // Reviewer Login
    const revRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'reviewer@legallens.gov.in', password: 'Admin@123456' });
    expect(revRes.status).toBe(200);
    expect(revRes.body.token).toBeDefined();
    expect(revRes.body.user.role).toBe('SENIOR_LEGAL_OFFICER');
    reviewerToken = revRes.body.token;

    // Inspector Login
    const insRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'inspector@legallens.gov.in', password: 'Inspector@123' });
    expect(insRes.status).toBe(200);
    expect(insRes.body.token).toBeDefined();
    expect(insRes.body.user.role).toBe('COMPLIANCE_OFFICER');
    inspectorToken = insRes.body.token;
  });

  test('2. Rejection of Invalid Credentials', async () => {
    // Incorrect Password
    const badPassRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@legallens.gov.in', password: 'WrongPassword123' });
    expect(badPassRes.status).toBe(401);
    expect(badPassRes.body.error).toBe('Invalid email or password.');

    // Non-existent Email
    const badEmailRes = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nonexistent@legallens.gov.in', password: 'Admin@123456' });
    expect(badEmailRes.status).toBe(401);
    expect(badEmailRes.body.error).toBe('Invalid email or password.');
  });

  test('3. New Inspector Registration & Forced Role Enforcement', async () => {
    // Register new inspector with attempt to pass role = SYSTEM_ADMINISTRATOR
    const regRes = await request(app)
      .post('/api/auth/register/inspector')
      .send({
        name: 'Officer Rajesh Kumar',
        email: newInspectorEmail,
        phoneNumber: newPhone,
        employeeNumber: newEmpNumber,
        password: 'Password@123',
        confirmPassword: 'Password@123',
        role: 'SYSTEM_ADMINISTRATOR', // Client attempting role privilege escalation
      });

    expect(regRes.status).toBe(201);
    expect(regRes.body.user).toBeDefined();
    // FORCED ROLE CHECK
    expect(regRes.body.user.role).toBe('COMPLIANCE_OFFICER');
  });

  test('4. Login with Newly Registered Inspector Account', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: newInspectorEmail, password: 'Password@123' });

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
    expect(loginRes.body.user.email).toBe(newInspectorEmail);
    expect(loginRes.body.user.role).toBe('COMPLIANCE_OFFICER');
  });

  test('5. Rejection of Duplicate Email and Employee Number', async () => {
    // Duplicate Email
    const dupEmailRes = await request(app)
      .post('/api/auth/register/inspector')
      .send({
        name: 'Officer Duplicate',
        email: newInspectorEmail,
        phoneNumber: '+91 99999 88888',
        employeeNumber: 'EMP-UNIQUE-999',
        password: 'Password@123',
        confirmPassword: 'Password@123',
      });
    expect(dupEmailRes.status).toBe(409);
    expect(dupEmailRes.body.error).toContain('email address already exists');

    // Duplicate Employee Number
    const dupEmpRes = await request(app)
      .post('/api/auth/register/inspector')
      .send({
        name: 'Officer Duplicate 2',
        email: `another_${Date.now()}@legallens.gov.in`,
        phoneNumber: '+91 99999 77777',
        employeeNumber: newEmpNumber,
        password: 'Password@123',
        confirmPassword: 'Password@123',
      });
    expect(dupEmpRes.status).toBe(409);
    expect(dupEmpRes.body.error).toContain('Employee Number already exists');
  });

  test('6. Password Confirmation & Complexity Validation', async () => {
    // Password Mismatch
    const mismatchRes = await request(app)
      .post('/api/auth/register/inspector')
      .send({
        name: 'Officer Test',
        email: `test_${Date.now()}@legallens.gov.in`,
        phoneNumber: '+91 98765 43210',
        employeeNumber: `EMP-${Date.now()}`,
        password: 'Password@123',
        confirmPassword: 'DifferentPassword@123',
      });
    expect(mismatchRes.status).toBe(400);
    expect(mismatchRes.body.error).toContain('do not match');

    // Weak Password
    const weakRes = await request(app)
      .post('/api/auth/register/inspector')
      .send({
        name: 'Officer Test',
        email: `test_${Date.now()}@legallens.gov.in`,
        phoneNumber: '+91 98765 43210',
        employeeNumber: `EMP-${Date.now()}`,
        password: 'weak',
        confirmPassword: 'weak',
      });
    expect(weakRes.status).toBe(400);
    expect(weakRes.body.error).toContain('Password must be at least 8 characters');
  });

  test('7. Protected Endpoint RBAC Enforcement', async () => {
    // Unauthenticated request
    const unauthRes = await request(app).get('/api/auth/me');
    expect(unauthRes.status).toBe(401);

    // Inspector attempting to access System Administrator User Management endpoint
    const forbiddenRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${inspectorToken}`);
    expect(forbiddenRes.status).toBe(403);

    // System Administrator accessing User Management
    const adminAccessRes = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(adminAccessRes.status).toBe(200);
    expect(adminAccessRes.body.users.length).toBeGreaterThan(0);
  });
});
