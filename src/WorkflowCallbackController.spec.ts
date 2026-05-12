import { ForbiddenException, BadRequestException } from '@nestjs/common';
import { WorkflowCallbackController, WorkflowActionPayload } from './WorkflowCallbackController';

class TestCommand {
  processInstanceId!: string;
  constructor(public readonly userId: string) {}
}

const mockCommandBus = {
  execute: jest.fn(),
};

const mockRegistry = {
  resolveAction: jest.fn(),
};

describe('WorkflowCallbackController', () => {
  let controller: WorkflowCallbackController;

  const basePayload: WorkflowActionPayload = {
    action: 'TestCommand',
    processId: 'onboarding',
    processInstanceId: 'pi-123',
    params: { userId: 'u1' },
  };

  describe('with secret configured', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      controller = new WorkflowCallbackController(
        mockCommandBus as any,
        mockRegistry as any,
        { callbackSecret: 's3cret' },
      );
    });

    it('rejects requests with wrong secret', async () => {
      await expect(
        controller.handleAction('wrong', basePayload),
      ).rejects.toThrow(ForbiddenException);
    });

    it('accepts requests with correct secret', async () => {
      mockRegistry.resolveAction.mockReturnValue(TestCommand);
      mockCommandBus.execute.mockResolvedValue({ ok: true });

      const result = await controller.handleAction('s3cret', basePayload);

      expect(result).toEqual({ ok: true });
    });
  });

  describe('without secret configured', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      controller = new WorkflowCallbackController(
        mockCommandBus as any,
        mockRegistry as any,
        {},
      );
    });

    it('throws BadRequestException for unknown action', async () => {
      mockRegistry.resolveAction.mockReturnValue(undefined);

      await expect(
        controller.handleAction(undefined as any, basePayload),
      ).rejects.toThrow(BadRequestException);
    });

    it('dispatches the resolved command via CommandBus', async () => {
      mockRegistry.resolveAction.mockReturnValue(TestCommand);
      mockCommandBus.execute.mockResolvedValue({ done: true });

      const result = await controller.handleAction(undefined as any, basePayload);

      expect(result).toEqual({ done: true });
      expect(mockRegistry.resolveAction).toHaveBeenCalledWith('TestCommand');
      expect(mockCommandBus.execute).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'u1',
          processInstanceId: 'pi-123',
        }),
      );
    });

    it('constructs command as instance of resolved class', async () => {
      mockRegistry.resolveAction.mockReturnValue(TestCommand);
      mockCommandBus.execute.mockResolvedValue(undefined);

      await controller.handleAction(undefined as any, basePayload);

      const dispatched = mockCommandBus.execute.mock.calls[0][0];
      expect(dispatched).toBeInstanceOf(TestCommand);
    });
  });
});
