import 'reflect-metadata';
import { WorkflowCommandRegistry } from './WorkflowCommandRegistry';

const WORKFLOW_KEY = 'arex:workflow';

class OnboardUserCommand {
  constructor(public readonly userId: string) {}
}
Reflect.defineMetadata(WORKFLOW_KEY, { processDefinitionId: 'onboarding' }, OnboardUserCommand);

class PlainCommand {
  constructor(public readonly id: string) {}
}

class OnboardUserHandler {
  async execute(cmd: OnboardUserCommand) { return cmd; }
}
Reflect.defineMetadata('COMMAND_HANDLER_METADATA', { command: OnboardUserCommand }, OnboardUserHandler);

class PlainHandler {
  async execute(cmd: PlainCommand) { return cmd; }
}
Reflect.defineMetadata('COMMAND_HANDLER_METADATA', { command: PlainCommand }, PlainHandler);

function createMockModulesContainer(handlers: any[]) {
  const providers = new Map<string, any>();
  handlers.forEach((handler, i) => {
    providers.set(`handler-${i}`, { instance: handler });
  });
  const modules = new Map();
  modules.set('AppModule', { providers });
  return modules;
}

describe('WorkflowCommandRegistry', () => {
  it('auto-discovers commands with @Workflow metadata from handlers', () => {
    const container = createMockModulesContainer([
      new OnboardUserHandler(),
      new PlainHandler(),
    ]);

    const registry = new WorkflowCommandRegistry(container as any);
    registry.onModuleInit();

    expect(registry.resolve('OnboardUserCommand')).toBe(OnboardUserCommand);
    expect(registry.resolve('PlainCommand')).toBeUndefined();
  });

  it('handles modules with no relevant providers', () => {
    const container = createMockModulesContainer([]);
    const registry = new WorkflowCommandRegistry(container as any);
    registry.onModuleInit();

    expect(registry.resolve('Anything')).toBeUndefined();
  });
});
