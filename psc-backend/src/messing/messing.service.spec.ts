import { Test, TestingModule } from '@nestjs/testing';
import { MessingService } from './messing.service';

describe('MessingService', () => {
  let service: MessingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MessingService],
    }).compile();

    service = module.get<MessingService>(MessingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
