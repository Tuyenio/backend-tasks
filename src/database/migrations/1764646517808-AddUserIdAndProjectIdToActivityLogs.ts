import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserIdAndProjectIdToActivityLogs1764646517808 implements MigrationInterface {
    name = 'AddUserIdAndProjectIdToActivityLogs1764646517808'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add projectId column if it doesn't exist
        const projectIdColumnExists = await queryRunner.hasColumn("activity_logs", "projectId");
        if (!projectIdColumnExists) {
            await queryRunner.query(`ALTER TABLE "activity_logs" ADD "projectId" uuid`);
        }
        
        // Drop the old foreign key constraint if it exists
        const table = await queryRunner.getTable("activity_logs");
        const userIdForeignKey = table?.foreignKeys.find(fk => fk.columnNames.indexOf("userId") !== -1);
        if (userIdForeignKey) {
            await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "${userIdForeignKey.name}"`);
        }
        
        // Alter userId column to NOT NULL
        await queryRunner.query(`ALTER TABLE "activity_logs" ALTER COLUMN "userId" SET NOT NULL`);
        
        // Create index if it doesn't exist
        const indexExists = await queryRunner.query(`
            SELECT indexname FROM pg_indexes 
            WHERE tablename = 'activity_logs' AND indexname = 'IDX_d9164fd61b6f08f6068e9c542e'
        `);
        if (!indexExists || indexExists.length === 0) {
            await queryRunner.query(`CREATE INDEX "IDX_d9164fd61b6f08f6068e9c542e" ON "activity_logs" ("projectId") `);
        }
        
        // Add new foreign key constraints
        await queryRunner.query(`ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_597e6df96098895bf19d4b5ea45" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_d9164fd61b6f08f6068e9c542ea" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_d9164fd61b6f08f6068e9c542ea"`);
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP CONSTRAINT "FK_597e6df96098895bf19d4b5ea45"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_d9164fd61b6f08f6068e9c542e"`);
        await queryRunner.query(`ALTER TABLE "activity_logs" ALTER COLUMN "userId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "activity_logs" ADD CONSTRAINT "FK_597e6df96098895bf19d4b5ea45" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP COLUMN "projectId"`);
    }

}
