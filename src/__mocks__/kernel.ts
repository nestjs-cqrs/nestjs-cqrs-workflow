import 'reflect-metadata';

export const WORKFLOW_ENGINE = Symbol('WORKFLOW_ENGINE');
const WORKFLOW_KEY = 'arex:workflow';

export function getWorkflowMetadata(target: object): { processDefinitionId: string } | undefined {
  return Reflect.getMetadata(WORKFLOW_KEY, target);
}

export interface WorkflowStartResult {
  workflowInstanceId: string;
  processInstanceId: string;
  status: 'STARTED';
}

export interface WorkflowEngine {
  startProcess(
    processDefinitionId: string,
    command: object,
    metadata: { commandType: string; correlationId?: string },
  ): Promise<WorkflowStartResult>;
  signalProcess(processInstanceId: string, signal: string, data?: unknown): Promise<void>;
  abortProcess(processInstanceId: string): Promise<void>;
}

export enum ErrorType {
  NotFound = 'NOT_FOUND',
  Forbidden = 'FORBIDDEN',
  Conflict = 'CONFLICT',
  ValidationError = 'VALIDATION_ERROR',
  InternalError = 'INTERNAL_ERROR',
  Unauthorized = 'UNAUTHORIZED',
  UnprocessableEntity = 'UNPROCESSABLE_ENTITY',
}

export class Result<T> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly value?: T,
    public readonly errorType?: ErrorType,
    public readonly errorMessage?: string,
  ) {}

  static success<T>(value: T): Result<T> {
    return new Result<T>(true, value);
  }

  static failure<T>(errorType: ErrorType, message: string): Result<T> {
    return new Result<T>(false, undefined, errorType, message);
  }

  static notFound<T>(message: string): Result<T> {
    return Result.failure<T>(ErrorType.NotFound, message);
  }

  static conflict<T>(message: string): Result<T> {
    return Result.failure<T>(ErrorType.Conflict, message);
  }
}

export class PipelineExecutor {
  async executeCommand<T>(command: object, context?: Map<string, unknown>): Promise<Result<T>> {
    return Result.success(undefined as unknown as T);
  }
}
