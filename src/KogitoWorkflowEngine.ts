import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkflowEngine, WorkflowStartResult } from '@turkelk/nestjs-cqrs-kernel';
import { KogitoClient } from './KogitoClient';
import { WorkflowInstance } from './WorkflowInstance.entity';
import { WorkflowStatus } from './WorkflowStatus.enum';

@Injectable()
export class KogitoWorkflowEngine implements WorkflowEngine {
  private readonly logger = new Logger(KogitoWorkflowEngine.name);

  constructor(
    private readonly kogitoClient: KogitoClient,
    @InjectRepository(WorkflowInstance)
    private readonly workflowInstanceRepo: Repository<WorkflowInstance>,
  ) {}

  async startProcess(
    processDefinitionId: string,
    command: object,
    metadata: { commandType: string; correlationId?: string },
  ): Promise<WorkflowStartResult> {
    const payload = JSON.parse(JSON.stringify(command));

    const { id: processInstanceId } = await this.kogitoClient.startProcess(
      processDefinitionId,
      { ...payload, __commandType: metadata.commandType },
    );

    const instance = this.workflowInstanceRepo.create({
      processDefinitionId,
      processInstanceId,
      commandType: metadata.commandType,
      commandPayload: payload,
      correlationId: metadata.correlationId ?? undefined,
      status: WorkflowStatus.STARTED,
    } as Partial<WorkflowInstance>);

    await this.workflowInstanceRepo.save(instance);

    this.logger.log(
      `Workflow started: ${instance.id} (process: ${processInstanceId}, definition: ${processDefinitionId})`,
    );

    return {
      workflowInstanceId: instance.id,
      processInstanceId,
      status: 'STARTED',
    };
  }

  async signalProcess(
    processInstanceId: string,
    signal: string,
    data?: unknown,
  ): Promise<void> {
    const instance = await this.workflowInstanceRepo.findOneBy({ processInstanceId });
    if (!instance) {
      throw new Error(`WorkflowInstance not found for processInstanceId: ${processInstanceId}`);
    }

    await this.kogitoClient.signalProcess(
      instance.processDefinitionId,
      processInstanceId,
      signal,
      data,
    );
  }

  async abortProcess(processInstanceId: string): Promise<void> {
    const instance = await this.workflowInstanceRepo.findOneBy({ processInstanceId });
    if (!instance) {
      throw new Error(`WorkflowInstance not found for processInstanceId: ${processInstanceId}`);
    }

    await this.kogitoClient.abortProcess(instance.processDefinitionId, processInstanceId);

    instance.status = WorkflowStatus.ABORTED;
    await this.workflowInstanceRepo.save(instance);

    this.logger.log(`Workflow aborted: ${instance.id}`);
  }
}
