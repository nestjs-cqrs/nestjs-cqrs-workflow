import { NotFoundException } from '@nestjs/common';
import { WorkflowCallbackController, WorkflowCallbackPayload } from './WorkflowCallbackController';
import { WorkflowStatus } from './WorkflowStatus.enum';
import { Result } from '@turkelk/nestjs-cqrs-kernel';

class TestCommand {
  constructor(public readonly userId: string) {}
}

const mockPipelineExecutor = {
  executeCommand: jest.fn(),
};

const mockRepo = {
  findOneBy: jest.fn(),
  save: jest.fn(),
};

const mockRegistry = {
  resolve: jest.fn(),
};

describe('WorkflowCallbackController', () => {
  let controller: WorkflowCallbackController;

  beforeEach(() => {
    jest.clearAllMocks();
    controller = new WorkflowCallbackController(
      mockPipelineExecutor as any,
      mockRepo as any,
      mockRegistry as any,
    );
  });

  const basePayload: WorkflowCallbackPayload = {
    processInstanceId: 'pi-123',
    processDefinitionId: 'onboarding',
    commandType: 'TestCommand',
    variables: { userId: 'u1' },
    status: 'COMPLETED',
  };

  it('returns 404 for unknown processInstanceId', async () => {
    mockRepo.findOneBy.mockResolvedValue(null);

    await expect(controller.handleCallback(basePayload)).rejects.toThrow(NotFoundException);
  });

  it('returns acknowledged for duplicate callback on completed workflow', async () => {
    mockRepo.findOneBy.mockResolvedValue({
      id: 'wf-1',
      status: WorkflowStatus.COMPLETED,
    });

    const result = await controller.handleCallback(basePayload);

    expect(result).toEqual({ acknowledged: true });
    expect(mockPipelineExecutor.executeCommand).not.toHaveBeenCalled();
  });

  it('re-dispatches command with correct context on callback', async () => {
    const instance = {
      id: 'wf-1',
      status: WorkflowStatus.STARTED,
      commandType: 'TestCommand',
      commandPayload: { userId: 'u1' },
      processVariables: null,
      completedAt: null,
    };
    mockRepo.findOneBy.mockResolvedValue(instance);
    mockRepo.save.mockResolvedValue(instance);
    mockRegistry.resolve.mockReturnValue(TestCommand);
    mockPipelineExecutor.executeCommand.mockResolvedValue(Result.success({ done: true }));

    const result = await controller.handleCallback(basePayload);

    expect(result).toEqual({ acknowledged: true });
    expect(mockPipelineExecutor.executeCommand).toHaveBeenCalledWith(
      expect.any(TestCommand),
      expect.any(Map),
    );
    const context = mockPipelineExecutor.executeCommand.mock.calls[0][1] as Map<string, unknown>;
    expect(context.get('workflow-phase')).toBe('execute');
    expect(context.get('workflow-instance-id')).toBe('wf-1');
    expect(instance.status).toBe(WorkflowStatus.COMPLETED);
  });

  it('updates status to FAILED when handler returns failure', async () => {
    const instance = {
      id: 'wf-1',
      status: WorkflowStatus.STARTED,
      commandType: 'TestCommand',
      commandPayload: { userId: 'u1' },
      processVariables: null,
      completedAt: null,
    };
    mockRepo.findOneBy.mockResolvedValue(instance);
    mockRepo.save.mockResolvedValue(instance);
    mockRegistry.resolve.mockReturnValue(TestCommand);
    mockPipelineExecutor.executeCommand.mockResolvedValue(
      Result.failure('INTERNAL_ERROR' as any, 'handler failed'),
    );

    await controller.handleCallback(basePayload);

    expect(instance.status).toBe(WorkflowStatus.FAILED);
    expect(mockRepo.save).toHaveBeenCalledTimes(2);
  });

  it('sets IN_PROGRESS for intermediate (ACTIVE) callbacks', async () => {
    const instance = {
      id: 'wf-1',
      status: WorkflowStatus.STARTED,
      commandType: 'TestCommand',
      commandPayload: { userId: 'u1' },
      processVariables: null,
      completedAt: null,
    };
    mockRepo.findOneBy.mockResolvedValue(instance);
    mockRepo.save.mockResolvedValue(instance);
    mockRegistry.resolve.mockReturnValue(TestCommand);
    mockPipelineExecutor.executeCommand.mockResolvedValue(Result.success(undefined));

    await controller.handleCallback({ ...basePayload, status: 'ACTIVE' });

    expect(instance.status).toBe(WorkflowStatus.IN_PROGRESS);
    expect(instance.completedAt).toBeNull();
  });
});
