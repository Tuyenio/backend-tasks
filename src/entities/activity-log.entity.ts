import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  Index,
} from 'typeorm';
import { User } from './user.entity';
import { Project } from './project.entity';

export enum ActivityAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  ASSIGN = 'assign',
  COMPLETE = 'complete',
  COMMENT = 'comment',
  SHARE = 'share',
}

export enum ActivityEntityType {
  USER = 'user',
  PROJECT = 'project',
  TASK = 'task',
  NOTE = 'note',
  CHAT = 'chat',
  MESSAGE = 'message',
}

@Entity('activity_logs')
export class ActivityLog {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  @Index()
  userId: string;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column({
    type: 'enum',
    enum: ActivityAction,
  })
  action: ActivityAction;

  @Column({
    type: 'enum',
    enum: ActivityEntityType,
  })
  @Index()
  entityType: ActivityEntityType;

  @Column({ type: 'uuid' })
  entityId: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, any>;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ipAddress: string;

  @Column({ type: 'uuid', nullable: true })
  @Index()
  projectId: string;

  @ManyToOne(() => Project, { nullable: true, onDelete: 'SET NULL' })
  project: Project;

  @CreateDateColumn({ type: 'timestamp' })
  @Index()
  createdAt: Date;
}
