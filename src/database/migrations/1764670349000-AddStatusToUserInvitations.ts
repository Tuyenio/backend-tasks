import { MigrationInterface, QueryRunner } from "typeorm";

export class AddStatusToUserInvitations1764670349000 implements MigrationInterface {
    name = 'AddStatusToUserInvitations1764670349000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Check if status column already exists
        const hasColumn = await queryRunner.hasColumn("user_invitations", "status");
        if (hasColumn) {
            console.log('Status column already exists, skipping...');
            return;
        }

        // Create enum type if it doesn't exist
        const enumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type WHERE typname = 'user_invitations_status_enum'
        `);

        if (!enumExists || enumExists.length === 0) {
            await queryRunner.query(`
                CREATE TYPE "public"."user_invitations_status_enum" AS ENUM('pending', 'accepted', 'expired', 'cancelled')
            `);
            console.log('Created enum type user_invitations_status_enum');
        }

        // Add status column
        await queryRunner.query(`
            ALTER TABLE "user_invitations" ADD COLUMN "status" "public"."user_invitations_status_enum" DEFAULT 'pending'
        `);
        console.log('Added status column to user_invitations table');
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        const hasColumn = await queryRunner.hasColumn("user_invitations", "status");
        if (hasColumn) {
            await queryRunner.query(`
                ALTER TABLE "user_invitations" DROP COLUMN "status"
            `);
        }
        
        const enumExists = await queryRunner.query(`
            SELECT 1 FROM pg_type WHERE typname = 'user_invitations_status_enum'
        `);
        if (enumExists && enumExists.length > 0) {
            await queryRunner.query(`
                DROP TYPE IF EXISTS "public"."user_invitations_status_enum"
            `);
        }
    }
}
