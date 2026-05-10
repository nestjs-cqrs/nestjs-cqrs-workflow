import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

export interface KogitoProcessInstance {
  id: string;
  processId: string;
  state: number;
  variables: Record<string, unknown>;
}

@Injectable()
export class KogitoClient {
  private readonly logger = new Logger(KogitoClient.name);

  constructor(private readonly httpService: HttpService) {}

  async startProcess(
    processId: string,
    variables: Record<string, unknown>,
  ): Promise<{ id: string }> {
    const { data } = await firstValueFrom(
      this.httpService.post<{ id: string }>(
        `/${processId}`,
        variables,
      ),
    );
    this.logger.log(`Started process ${processId}, instance: ${data.id}`);
    return data;
  }

  async signalProcess(
    processId: string,
    instanceId: string,
    signal: string,
    data?: unknown,
  ): Promise<void> {
    await firstValueFrom(
      this.httpService.post(
        `/${processId}/${instanceId}/${signal}`,
        data ?? {},
      ),
    );
    this.logger.log(`Signaled process ${processId}/${instanceId} with ${signal}`);
  }

  async abortProcess(processId: string, instanceId: string): Promise<void> {
    await firstValueFrom(
      this.httpService.delete(`/${processId}/${instanceId}`),
    );
    this.logger.log(`Aborted process ${processId}/${instanceId}`);
  }

  async getProcessInstance(
    processId: string,
    instanceId: string,
  ): Promise<KogitoProcessInstance> {
    const { data } = await firstValueFrom(
      this.httpService.get<KogitoProcessInstance>(
        `/${processId}/${instanceId}`,
      ),
    );
    return data;
  }
}
