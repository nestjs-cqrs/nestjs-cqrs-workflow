import { KogitoClient } from './KogitoClient';
import { of, throwError } from 'rxjs';
import { AxiosResponse } from 'axios';

const mockHttpService = {
  post: jest.fn(),
  delete: jest.fn(),
  get: jest.fn(),
};

describe('KogitoClient', () => {
  let client: KogitoClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new KogitoClient(mockHttpService as any);
  });

  describe('startProcess', () => {
    it('sends POST to /{processId} with variables', async () => {
      const response: Partial<AxiosResponse> = { data: { id: 'pi-123' } };
      mockHttpService.post.mockReturnValue(of(response));

      const result = await client.startProcess('onboarding', { userId: 'u1' });

      expect(mockHttpService.post).toHaveBeenCalledWith('/onboarding', { userId: 'u1' });
      expect(result).toEqual({ id: 'pi-123' });
    });

    it('propagates errors', async () => {
      mockHttpService.post.mockReturnValue(throwError(() => new Error('timeout')));

      await expect(client.startProcess('onboarding', {})).rejects.toThrow('timeout');
    });
  });

  describe('abortProcess', () => {
    it('sends DELETE to /{processId}/{instanceId}', async () => {
      const response: Partial<AxiosResponse> = { data: {} };
      mockHttpService.delete.mockReturnValue(of(response));

      await client.abortProcess('onboarding', 'pi-123');

      expect(mockHttpService.delete).toHaveBeenCalledWith('/onboarding/pi-123');
    });
  });

  describe('signalProcess', () => {
    it('sends POST to /{processId}/{instanceId}/{signal}', async () => {
      const response: Partial<AxiosResponse> = { data: {} };
      mockHttpService.post.mockReturnValue(of(response));

      await client.signalProcess('onboarding', 'pi-123', 'approve', { approved: true });

      expect(mockHttpService.post).toHaveBeenCalledWith(
        '/onboarding/pi-123/approve',
        { approved: true },
      );
    });
  });

  describe('getProcessInstance', () => {
    it('sends GET and returns process instance', async () => {
      const processInstance = { id: 'pi-123', processId: 'onboarding', state: 1, variables: {} };
      const response: Partial<AxiosResponse> = { data: processInstance };
      mockHttpService.get.mockReturnValue(of(response));

      const result = await client.getProcessInstance('onboarding', 'pi-123');

      expect(mockHttpService.get).toHaveBeenCalledWith('/onboarding/pi-123');
      expect(result).toEqual(processInstance);
    });
  });
});
