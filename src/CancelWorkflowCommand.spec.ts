import { CancelWorkflowCommand, CancelWorkflowHandler } from './CancelWorkflowCommand';
import { WorkflowStatus } from './WorkflowStatus.enum';

const mockKogitoClient = {
  startProcess: jest.fn(),
  signalProcess: jest.fn(),
  abortProcess: jest.fn(),
  getProcessInstance: jest.fn(),
};

const mockRepo = {
  findOneBy: jest.fn(),
  save: jest.fn(),
};

describe('CancelWorkflowHandler', () => {
  let handler: CancelWorkflowHandler;

  beforeEach(() => {
    jest.clearAllMocks();
    handler = new CancelWorkflowHandler(mockKogitoClient as any, mockRepo as any);
  });

  it('aborts the Kogito process and marks entity as ABORTED', async () => {
    const instance = {
      id: 'wf-1',
      processDefinitionId: 'onboarding',
      processInstanceId: 'pi-123',
      status: WorkflowStatus.IN_PROGRESS,
      completedAt: null,
    };
    mockRepo.findOneBy.mockResolvedValue(instance);
    mockRepo.save.mockResolvedValue(instance);
    mockKogitoClient.abortProcess.mockResolvedValue(undefined);

    const result = await handler.execute(new CancelWorkflowCommand('wf-1'));

    expect(result.isSuccess).toBe(true);
    expect(mockKogitoClient.abortProcess).toHaveBeenCalledWith('onboarding', 'pi-123');
    expect(instance.status).toBe(WorkflowStatus.ABORTED);
    expect(instance.completedAt).toBeInstanceOf(Date);
  });

  it('returns NotFound for unknown workflow instance', async () => {
    mockRepo.findOneBy.mockResolvedValue(null);

    const result = await handler.execute(new CancelWorkflowCommand('wf-unknown'));

    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('not found');
  });

  it('returns Conflict for already completed workflow', async () => {
    mockRepo.findOneBy.mockResolvedValue({
      id: 'wf-1',
      status: WorkflowStatus.COMPLETED,
    });

    const result = await handler.execute(new CancelWorkflowCommand('wf-1'));

    expect(result.isSuccess).toBe(false);
    expect(result.errorMessage).toContain('already completed');
  });

  it('marks as ABORTED locally even when Kogito is unreachable', async () => {
    const instance = {
      id: 'wf-1',
      processDefinitionId: 'onboarding',
      processInstanceId: 'pi-123',
      status: WorkflowStatus.STARTED,
      completedAt: null,
    };
    mockRepo.findOneBy.mockResolvedValue(instance);
    mockRepo.save.mockResolvedValue(instance);
    mockKogitoClient.abortProcess.mockRejectedValue(new Error('connection refused'));

    const result = await handler.execute(new CancelWorkflowCommand('wf-1'));

    expect(result.isSuccess).toBe(true);
    expect(instance.status).toBe(WorkflowStatus.ABORTED);
  });
});
