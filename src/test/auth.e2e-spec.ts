import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../app.module';

describe('AuthController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/api/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: `test${Date.now()}@example.com`,
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body).toHaveProperty('email');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should return 400 for invalid email', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'invalid-email',
          password: 'Password123!',
          name: 'Test User',
        })
        .expect(400);
    });

    it('should return 400 for weak password', () => {
      return request(app.getHttpServer())
        .post('/api/auth/register')
        .send({
          email: 'test@example.com',
          password: '123',
          name: 'Test User',
        })
        .expect(400);
    });
  });

  describe('/api/auth/login (POST)', () => {
    it('should login with valid credentials', async () => {
      // First register a user
      const email = `test${Date.now()}@example.com`;
      const password = 'Password123!';

      await request(app.getHttpServer()).post('/api/auth/register').send({
        email,
        password,
        name: 'Test User',
      });

      // Then try to login
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email,
          password,
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('accessToken');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('should return 401 for invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email: 'nonexistent@example.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
  });

  describe('/api/auth/profile (GET)', () => {
    it('should return 401 without token', () => {
      return request(app.getHttpServer()).get('/api/auth/profile').expect(401);
    });

    it('should return user profile with valid token', async () => {
      // Register and login to get token
      const email = `test${Date.now()}@example.com`;
      const password = 'Password123!';

      await request(app.getHttpServer()).post('/api/auth/register').send({
        email,
        password,
        name: 'Test User',
      });

      const loginRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({
          email,
          password,
        });

      const token = loginRes.body.accessToken;

      return request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${token}`)
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('email', email);
          expect(res.body).not.toHaveProperty('password');
        });
    });
  });
});
