import { PromptsController } from './prompts.controller';
import { PromptsService } from './prompts.service';

describe('PromptsController', () => {
  const service = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<PromptsService>;

  let controller: PromptsController;
  const req = { user: { userId: 'owner-1' } } as any;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new PromptsController(service);
  });

  it('delegates list requests', async () => {
    const prompts = [{ id: 'prompt-1' }];
    service.findAll.mockResolvedValue(prompts as any);

    await expect(controller.findAll(req)).resolves.toBe(prompts);
  });

  it('delegates read requests', async () => {
    const prompt = { id: 'prompt-1' };
    service.findById.mockResolvedValue(prompt as any);

    await expect(controller.findById('prompt-1')).resolves.toBe(prompt);
    expect(service.findById).toHaveBeenCalledWith('prompt-1');
  });

  it('delegates create requests', async () => {
    const dto = { name: 'Prompt', content: 'Body' };
    service.create.mockResolvedValue({ id: 'prompt-1', ...dto } as any);

    await controller.create(req, dto);

    expect(service.create).toHaveBeenCalledWith(dto, 'owner-1');
  });

  it('delegates update requests', async () => {
    const dto = { name: 'Updated' };
    service.update.mockResolvedValue({ id: 'prompt-1', ...dto } as any);

    await controller.update('prompt-1', dto);

    expect(service.update).toHaveBeenCalledWith('prompt-1', dto);
  });

  it('delegates delete requests', async () => {
    service.delete.mockResolvedValue(undefined);

    await controller.delete('prompt-1');

    expect(service.delete).toHaveBeenCalledWith('prompt-1');
  });
});
