import { Test, TestingModule } from '@nestjs/testing';
import { MessingController } from './messing.controller';

describe('MessingController', () => {
  let controller: MessingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessingController],
    }).compile();

    controller = module.get<MessingController>(MessingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
