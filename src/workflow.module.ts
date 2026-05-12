import { DynamicModule, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CqrsModule } from '@nestjs/cqrs';
import { WORKFLOW_ENGINE, WorkflowBehavior } from '@turkelk/nestjs-cqrs-kernel';
import { KogitoClient } from './KogitoClient';
import { KogitoWorkflowEngine } from './KogitoWorkflowEngine';
import { WorkflowCallbackController } from './WorkflowCallbackController';
import { WorkflowInstance } from './WorkflowInstance.entity';
import { WorkflowCommandRegistry } from './WorkflowCommandRegistry';
import { CancelWorkflowHandler } from './CancelWorkflowCommand';

export interface WorkflowModuleOptions {
  url: string;
  requestTimeout?: number;
  fallback?: 'throw' | 'skip' | 'queue';
  callbackSecret?: string;
}

@Module({})
export class WorkflowModule {
  static forRoot(options: WorkflowModuleOptions): DynamicModule {
    return {
      module: WorkflowModule,
      imports: [
        HttpModule.register({
          baseURL: options.url,
          timeout: options.requestTimeout ?? 10000,
        }),
        TypeOrmModule.forFeature([WorkflowInstance]),
        CqrsModule,
      ],
      controllers: [WorkflowCallbackController],
      providers: [
        { provide: 'WORKFLOW_MODULE_OPTIONS', useValue: options },
        KogitoClient,
        WorkflowCommandRegistry,
        {
          provide: WORKFLOW_ENGINE,
          useClass: KogitoWorkflowEngine,
        },
        WorkflowBehavior,
        CancelWorkflowHandler,
      ],
      exports: [WORKFLOW_ENGINE, WorkflowBehavior, KogitoClient, WorkflowCommandRegistry],
    };
  }
}
