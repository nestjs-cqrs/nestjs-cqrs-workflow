import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { WorkflowStatus } from './WorkflowStatus.enum';

@Entity('workflow_instances')
export class WorkflowInstance {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column()
  processDefinitionId!: string;

  @Column({ nullable: true })
  processInstanceId!: string;

  @Column()
  commandType!: string;

  @Column('jsonb')
  commandPayload!: Record<string, unknown>;

  @Column({ type: 'enum', enum: WorkflowStatus, default: WorkflowStatus.STARTED })
  status!: WorkflowStatus;

  @Column({ nullable: true })
  correlationId!: string;

  @Column({ nullable: true, type: 'jsonb' })
  processVariables!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @Column({ nullable: true, type: 'timestamp' })
  completedAt!: Date | null;
}
