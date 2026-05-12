import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { getWorkflowMetadata } from '@turkelk/nestjs-cqrs-kernel';

type CommandConstructor = new (...args: any[]) => object;

@Injectable()
export class WorkflowCommandRegistry implements OnModuleInit {
  private readonly logger = new Logger(WorkflowCommandRegistry.name);
  private readonly workflowCommands = new Map<string, CommandConstructor>();
  private readonly allCommands = new Map<string, CommandConstructor>();

  constructor(private readonly modulesContainer: ModulesContainer) {}

  onModuleInit() {
    this.modulesContainer.forEach((module) => {
      module.providers.forEach((wrapper) => {
        const { instance } = wrapper;
        if (!instance || !instance.constructor) return;

        const command = this.getCommandFromHandler(instance);
        if (!command) return;

        this.allCommands.set(command.name, command as CommandConstructor);

        const metadata = getWorkflowMetadata(command);
        if (metadata) {
          this.workflowCommands.set(command.name, command as CommandConstructor);
        }
      });
    });

    this.logger.log(
      `Registered ${this.allCommands.size} command(s): ${[...this.allCommands.keys()].join(', ')}`,
    );
    if (this.workflowCommands.size > 0) {
      this.logger.log(
        `Of which ${this.workflowCommands.size} are @Workflow: ${[...this.workflowCommands.keys()].join(', ')}`,
      );
    }
  }

  resolve(commandType: string): CommandConstructor | undefined {
    return this.workflowCommands.get(commandType);
  }

  resolveAction(actionName: string): CommandConstructor | undefined {
    return this.allCommands.get(actionName);
  }

  private getCommandFromHandler(handler: any): Function | undefined {
    const metadata = Reflect.getMetadata('__commandHandler__', handler.constructor);
    if (metadata) return metadata;

    const cqrsMetadata = Reflect.getMetadata('COMMAND_HANDLER_METADATA', handler.constructor);
    if (cqrsMetadata) return cqrsMetadata.command;

    return undefined;
  }
}
