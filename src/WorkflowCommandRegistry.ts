import { Injectable } from '@nestjs/common';

type CommandConstructor = new (...args: any[]) => object;

@Injectable()
export class WorkflowCommandRegistry {
  private readonly registry = new Map<string, CommandConstructor>();

  register(commandType: string, commandClass: CommandConstructor): void {
    this.registry.set(commandType, commandClass);
  }

  resolve(commandType: string): CommandConstructor | undefined {
    return this.registry.get(commandType);
  }

  getAll(): Map<string, CommandConstructor> {
    return new Map(this.registry);
  }
}
