import { KogitoWorkflowEngine } from './KogitoWorkflowEngine';
import { WorkflowStatus } from './WorkflowStatus.enum';

const mockKogitoClient = {
  startProcess: jest.fn(),
  signalProcess: jest.fn(),
  abortProcess: jest.fn(),
  getProcessInstance: jest.fn(),
};

const mockRepo = {
  create: jest.fn(),
  save: jest.fn(),
  findOneBy: jest.fn(),
};

describe('KogitoWorkflowEngine', () => {
  let engine: KogitoWorkflowEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    engine = new KogitoWorkflowEngine(mockKogitoClient as any, mockRepo as any);
  });

  describe('startProcess', () => {
    it('starts a Kogito process and persists a WorkflowInstance', async () => {
      mockKogitoClient.startProcess.mockResolvedValue({ id: 'pi-abc' });
      mockRepo.create.mockReturnValue({ id: 'wf-1', processInstanceId: 'pi-abc' });
      mockRepo.save.mockResolvedValue({ id: 'wf-1', processInstanceId: 'pi-abc' });

      const command = { userId: 'u1', email: 'test@example.com' };
      const result = await engine.startProcess('user-onboarding', command, {
        commandType: 'OnboardUserCommand',
        correlationId: 'corr-1',
      });

      expect(mockKogitoClient.startProcess).toHaveBeenCalledWith('user-onboarding', {
        userId: 'u1',
        email: 'test@example.com',
        __commandType: 'OnboardUserCommand',
      });
      expect(mockRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          processDefinitionId: 'user-onboarding',
          processInstanceId: 'pi-abc',
          commandType: 'OnboardUserCommand',
          correlationId: 'corr-1',
          status: WorkflowStatus.STARTED,
        }),
      );
      expect(mockRepo.save).toHaveBeenCalled();
      expect(result).toEqual({
        workflowInstanceId: 'wf-1',
        processInstanceId: 'pi-abc',
        status: 'STARTED',
      });
    });

    it('propagates Kogito errors without persisting', async () => {
      mockKogitoClient.startProcess.mockRejectedValue(new Error('connection refused'));

      await expect(
        engine.startProcess('process-1', {}, { commandType: 'Cmd' }),
      ).rejects.toThrow('connection refused');

      expect(mockRepo.create).not.toHaveBeenCalled();
    });
  });

  describe('abortProcess', () => {
    it('aborts in Kogito and updates entity', async () => {
      const instance = {
        id: 'wf-1',
        processDefinitionId: 'onboarding',
        processInstanceId: 'pi-abc',
        status: WorkflowStatus.IN_PROGRESS,
      };
      mockRepo.findOneBy.mockResolvedValue(instance);
      mockRepo.save.mockResolvedValue(instance);
      mockKogitoClient.abortProcess.mockResolvedValue(undefined);

      await engine.abortProcess('pi-abc');

      expect(mockKogitoClient.abortProcess).toHaveBeenCalledWith('onboarding', 'pi-abc');
      expect(instance.status).toBe(WorkflowStatus.ABORTED);
      expect(mockRepo.save).toHaveBeenCalledWith(instance);
    });

    it('throws if workflow instance not found', async () => {
      mockRepo.findOneBy.mockResolvedValue(null);

      await expect(engine.abortProcess('pi-unknown')).rejects.toThrow(
        'WorkflowInstance not found',
      );
    });
  });
});
