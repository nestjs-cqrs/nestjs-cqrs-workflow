import { Controller, Post, Body, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PipelineExecutor } from '@turkelk/nestjs-cqrs-kernel';
import { WorkflowInstance } from './WorkflowInstance.entity';
import { WorkflowStatus } from './WorkflowStatus.enum';
import { WorkflowCommandRegistry } from './WorkflowCommandRegistry';

export interface WorkflowCallbackPayload {
  processInstanceId: string;
  processDefinitionId: string;
  commandType: string;
  nodeId?: string;
  variables: Record<string, unknown>;
  status: 'ACTIVE' | 'COMPLETED' | 'ERROR';
}

@Controller('workflows')
export class WorkflowCallbackController {
  private readonly logger = new Logger(WorkflowCallbackController.name);

  constructor(
    private readonly pipelineExecutor: PipelineExecutor,
    @InjectRepository(WorkflowInstance)
    private readonly workflowInstanceRepo: Repository<WorkflowInstance>,
    private readonly commandRegistry: WorkflowCommandRegistry,
  ) {}

  @Post('callback')
  async handleCallback(@Body() payload: WorkflowCallbackPayload): Promise<{ acknowledged: boolean }> {
    const instance = await this.workflowInstanceRepo.findOneBy({
      processInstanceId: payload.processInstanceId,
    });

    if (!instance) {
      this.logger.warn(
        `Callback received for unknown processInstanceId: ${payload.processInstanceId}`,
      );
      throw new NotFoundException(
        `WorkflowInstance not found for processInstanceId: ${payload.processInstanceId}`,
      );
    }

    if (instance.status === WorkflowStatus.COMPLETED || instance.status === WorkflowStatus.ABORTED) {
      this.logger.debug(
        `Duplicate callback for workflow ${instance.id} (status: ${instance.status}), ignoring`,
      );
      return { acknowledged: true };
    }

    const commandType = payload.commandType || instance.commandType;
    const CommandClass = this.commandRegistry.resolve(commandType);

    if (!CommandClass) {
      this.logger.error(`Cannot resolve command class for type: ${commandType}`);
      throw new NotFoundException(`Unknown command type: ${commandType}`);
    }

    const commandPayload = { ...instance.commandPayload, ...payload.variables };
    const command = Object.assign(Object.create(CommandClass.prototype), commandPayload);

    const isFinale = payload.status === 'COMPLETED';

    instance.status = isFinale ? WorkflowStatus.COMPLETED : WorkflowStatus.IN_PROGRESS;
    instance.processVariables = payload.variables;
    if (isFinale) {
      instance.completedAt = new Date();
    }
    await this.workflowInstanceRepo.save(instance);

    const context = new Map<string, unknown>([
      ['workflow-phase', 'execute'],
      ['workflow-instance-id', instance.id],
      ['workflow-node-id', payload.nodeId],
    ]);

    const result = await this.pipelineExecutor.executeCommand(command, context);

    if (!result.isSuccess) {
      instance.status = WorkflowStatus.FAILED;
      await this.workflowInstanceRepo.save(instance);
      this.logger.error(
        `Workflow callback handler failed for ${instance.id}: ${result.errorMessage}`,
      );
    }

    return { acknowledged: true };
  }
}
