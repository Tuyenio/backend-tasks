import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToMany,
  AfterLoad,
} from 'typeorm';
import { User } from './user.entity';

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  displayName: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'boolean', default: false })
  isSystem: boolean; // System roles cannot be deleted (super_admin, admin, etc.)

  @Column({ type: 'varchar', length: 20, default: '#6366f1' })
  color: string;

  @Column({
    type: 'text',
    default: '[]',
    transformer: {
      to: (value?: string[] | null): string =>
        JSON.stringify(Array.isArray(value) ? value : []),
      from: (value?: string | null): string[] => {
        try {
          const parsed: unknown = JSON.parse(value ?? '[]');
          const result: string[] = Array.isArray(parsed)
            ? parsed.filter((item): item is string => typeof item === 'string')
            : [];
          return result;
        } catch {
          return [];
        }
      },
    },
  })
  permissions: string[]; // Array of permission strings

  @AfterLoad()
  normalizePermissions() {
    this.permissions = Array.isArray(this.permissions)
      ? this.permissions.filter(
          (perm): perm is string => typeof perm === 'string',
        )
      : [];
  }

  @ManyToMany(() => User, (user) => user.roles)
  users: User[];

  @CreateDateColumn({ type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp' })
  updatedAt: Date;
}
