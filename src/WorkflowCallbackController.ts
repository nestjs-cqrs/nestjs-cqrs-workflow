import {
  Controller,
  Post,
  Body,
  Headers,
  Logger,
  ForbiddenException,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import { WorkflowCommandRegistry } from './WorkflowCommandRegistry';

export interface WorkflowActionPayload {
  action: string;
  processId: string;
  processInstanceId: string;
  params: Record<string, any>;
}

@Controller('workflows')
export class WorkflowCallbackController {
  private readonly logger = new Logger(WorkflowCallbackController.name);
  private readonly sharedSecret: string;

  constructor(
    private readonly commandBus: CommandBus,
    private readonly commandRegistry: WorkflowCommandRegistry,
    @Inject('WORKFLOW_MODULE_OPTIONS') options: { callbackSecret?: string },
  ) {
    this.sharedSecret = options.callbackSecret ?? '';
  }

  @Post('action')
  async handleAction(
    @Headers('x-workflow-secret') secret: string,
    @Body() payload: WorkflowActionPayload,
  ) {
    if (this.sharedSecret && secret !== this.sharedSecret) {
      throw new ForbiddenException('Invalid workflow secret');
    }

    const CommandClass = this.commandRegistry.resolveAction(payload.action);
    if (!CommandClass) {
      throw new BadRequestException(`Unknown command: ${payload.action}`);
    }

    this.logger.log(
      { action: payload.action, processInstanceId: payload.processInstanceId },
      'Workflow action received',
    );

    const command = Object.assign(
      Object.create(CommandClass.prototype),
      payload.params,
      { processInstanceId: payload.processInstanceId },
    );

    return this.commandBus.execute(command);
  }
}
