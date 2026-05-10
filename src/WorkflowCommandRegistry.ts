import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ModulesContainer } from '@nestjs/core';
import { getWorkflowMetadata } from '@turkelk/nestjs-cqrs-kernel';

type CommandConstructor = new (...args: any[]) => object;

@Injectable()
export class WorkflowCommandRegistry implements OnModuleInit {
  private readonly logger = new Logger(WorkflowCommandRegistry.name);
  private readonly registry = new Map<string, CommandConstructor>();

  constructor(private readonly modulesContainer: ModulesContainer) {}

  onModuleInit() {
    this.modulesContainer.forEach((module) => {
      module.providers.forEach((wrapper) => {
        const { instance } = wrapper;
        if (!instance || !instance.constructor) return;

        const handler = instance as any;
        const command = this.getCommandFromHandler(handler);
        if (!command) return;

        const metadata = getWorkflowMetadata(command);
        if (metadata) {
          this.registry.set(command.name, command as CommandConstructor);
        }
      });
    });

    this.logger.log(`Auto-discovered ${this.registry.size} workflow command(s): ${[...this.registry.keys()].join(', ')}`);
  }

  resolve(commandType: string): CommandConstructor | undefined {
    return this.registry.get(commandType);
  }

  private getCommandFromHandler(handler: any): Function | undefined {
    const metadata = Reflect.getMetadata('__commandHandler__', handler.constructor);
    if (metadata) return metadata;

    const cqrsMetadata = Reflect.getMetadata('COMMAND_HANDLER_METADATA', handler.constructor);
    if (cqrsMetadata) return cqrsMetadata.command;

    return undefined;
  }
}
