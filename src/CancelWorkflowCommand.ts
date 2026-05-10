import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result, ErrorType } from '@turkelk/nestjs-cqrs-kernel';
import { KogitoClient } from './KogitoClient';
import { WorkflowInstance } from './WorkflowInstance.entity';
import { WorkflowStatus } from './WorkflowStatus.enum';
import { Logger } from '@nestjs/common';

export class CancelWorkflowCommand {
  constructor(public readonly workflowInstanceId: string) {}
}

@CommandHandler(CancelWorkflowCommand)
export class CancelWorkflowHandler implements ICommandHandler<CancelWorkflowCommand> {
  private readonly logger = new Logger(CancelWorkflowHandler.name);

  constructor(
    private readonly kogitoClient: KogitoClient,
    @InjectRepository(WorkflowInstance)
    private readonly workflowInstanceRepo: Repository<WorkflowInstance>,
  ) {}

  async execute(cmd: CancelWorkflowCommand): Promise<Result<void>> {
    const instance = await this.workflowInstanceRepo.findOneBy({
      id: cmd.workflowInstanceId,
    });

    if (!instance) {
      return Result.notFound(`WorkflowInstance not found: ${cmd.workflowInstanceId}`);
    }

    if (instance.status === WorkflowStatus.COMPLETED) {
      return Result.conflict('Workflow already completed');
    }

    if (instance.status === WorkflowStatus.ABORTED) {
      return Result.conflict('Workflow already aborted');
    }

    try {
      await this.kogitoClient.abortProcess(
        instance.processDefinitionId,
        instance.processInstanceId,
      );
    } catch (error: any) {
      this.logger.warn(
        `Failed to abort Kogito process ${instance.processInstanceId}, marking as aborted locally: ${error.message}`,
      );
    }

    instance.status = WorkflowStatus.ABORTED;
    instance.completedAt = new Date();
    await this.workflowInstanceRepo.save(instance);

    this.logger.log(`Workflow cancelled: ${instance.id}`);

    return Result.success(undefined);
  }
}
