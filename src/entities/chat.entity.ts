import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  JoinTable,
  OneToMany,
} from 'typeorm';
import { User } from './user.entity';
import { Message } from './message.entity';

export enum ChatType {
  GROUP = 'group',
  DIRECT = 'direct',
}

@Entity('chats')
export class Chat {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({
    type: 'enum',
    enum: ChatType,
    default: ChatType.DIRECT,
  })
  type: ChatType;

  @ManyToMany(() => User)
  @JoinTable({
    name: 'chat_members',
    joinColumn: { name: 'chat_id', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'user_id', referencedColumnName: 'id' },
  })
  members: User[];

  @OneToMany(() => Message, 'chat')
  messages: Message[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
