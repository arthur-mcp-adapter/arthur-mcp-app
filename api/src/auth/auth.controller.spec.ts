import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  describe('providers', () => {
    it('reports the deployment mode', () => {
      expect(controller.providers()).toEqual({ selfHosted: expect.any(Boolean) });
    });
  });
});
