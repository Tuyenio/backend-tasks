import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTodosToNote1765447200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'notes',
      new TableColumn({
        name: 'todos',
        type: 'text',
        isNullable: true,
        comment: 'JSON stringified array of todo items',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('notes', 'todos');
  }
}
