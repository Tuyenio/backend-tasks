import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUserInvitation1764650038897 implements MigrationInterface {
    name = 'CreateUserInvitation1764650038897'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_invitations_status_enum" AS ENUM('pending', 'accepted', 'expired', 'cancelled')`);
        await queryRunner.query(`CREATE TABLE "user_invitations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "email" character varying NOT NULL, "token" character varying NOT NULL, "status" "public"."user_invitations_status_enum" NOT NULL DEFAULT 'pending', "roleIds" text, "invitedById" uuid, "expiresAt" TIMESTAMP NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_1c885f83eb2a34fedd887e43e82" UNIQUE ("token"), CONSTRAINT "PK_c8005acb91c3ce9a7ae581eca8f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "activity_logs" DROP COLUMN "projectid"`);
        await queryRunner.query(`ALTER TABLE "user_invitations" ADD CONSTRAINT "FK_f679e6eb5e1629f143a0d1cd3f9" FOREIGN KEY ("invitedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_invitations" DROP CONSTRAINT "FK_f679e6eb5e1629f143a0d1cd3f9"`);
        await queryRunner.query(`ALTER TABLE "activity_logs" ADD "projectid" uuid`);
        await queryRunner.query(`DROP TABLE "user_invitations"`);
        await queryRunner.query(`DROP TYPE "public"."user_invitations_status_enum"`);
    }

}
