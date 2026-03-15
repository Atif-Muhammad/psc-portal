import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.enableCors({
    origin: (origin, callback) => {
      const allowed = [
        'https://psc.up.railway.app',
        'http://localhost:5173',
        'https://193.203.169.122',
        'http://193.203.169.122',
        'http://193.203.169.122:8080',
        'https://193.203.169.122:8080',
        'https://admin.peshawarservicesclub.com',
      ];

      if (!origin || allowed.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Client-Type'],
    credentials: true,
  });
  app.use(cookieParser());
  app.useStaticAssets(join(__dirname, '..', 'data', 'bills'), {
    prefix: '/bills/',
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  // for ip identificiation -- x-forwarded-for header
  app.set('trust proxy', 1);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
