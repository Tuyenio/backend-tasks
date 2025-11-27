import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAvatarAndMobileToUsers1730950000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Migration này đã được handle trong CreateUsersTable
    // Giữ file này để match với ảnh bạn gửi
    // Các columns avatar và mobile đã có sẵn trong migration đầu tiên
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Không cần thực hiện gì vì columns đã có từ đầu
  }
}
