import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonStatement,
  getLastTwoSeasonGrade,
  getSeasonMetadata,
  insertSeasonGradeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { UpdateSeasonGradeHandler } from "./update_season_grade_handler";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/backend/interface";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import {
  assertReject,
  assertThat,
  containStr,
  eq,
} from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

async function cleanupSeason(): Promise<void> {
  try {
    await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
      await transaction.runUpdate(deleteSeasonStatement("season1"));
      await transaction.commit();
    });
  } catch (e) {}
}

TEST_RUNNER.run({
  name: "UpdateSeasonGradeHandlerTest",
  cases: [
    {
      name: "UpdateGradeInDraftState",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image.jpg",
              1000,
              1000,
              SeasonState.DRAFT,
              0,
            ),
            insertSeasonGradeStatement("season1", "grade1", 1, 1000, 10000),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let nowTimestamp = 1100;
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => nowTimestamp,
          () => "new grade",
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            grade: 10,
          },
          "session1",
        );

        // Verify
        let lastChangeTimestamp = (
          await getSeasonMetadata(SPANNER_DATABASE, "season1", "account1")
        )[0].seasonLastChangeTimestamp;
        assertThat(
          lastChangeTimestamp,
          eq(nowTimestamp),
          "last change timestamp",
        );
        let grade = (
          await getLastTwoSeasonGrade(SPANNER_DATABASE, "season1", nowTimestamp)
        )[0];
        assertThat(grade.seasonGradeGrade, eq(10), "grade");
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "UpdateGradeInPublishedState",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image.jpg",
              1000,
              1000,
              SeasonState.PUBLISHED,
              0,
            ),
            insertSeasonGradeStatement("season1", "grade1", 1, 1000, 10000),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let nowTimestamp = 1100;
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => nowTimestamp,
          () => "new grade",
        );
        let effectiveTimestamp = 2000 + 24 * 60 * 60 * 1000;

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            grade: 10,
            effectiveTimestamp,
          },
          "session1",
        );

        // Verify
        let lastChangeTimestamp = (
          await getSeasonMetadata(SPANNER_DATABASE, "season1", "account1")
        )[0].seasonLastChangeTimestamp;
        assertThat(
          lastChangeTimestamp,
          eq(nowTimestamp),
          "last change timestamp",
        );
        let grades = await getLastTwoSeasonGrade(
          SPANNER_DATABASE,
          "season1",
          nowTimestamp,
        );
        assertThat(grades.length, eq(2), "two grades");
        assertThat(grades[0].seasonGradeGrade, eq(10), "updated grade");
        assertThat(
          grades[0].seasonGradeStartTimestamp,
          eq(effectiveTimestamp),
          "updated grade start time",
        );
        assertThat(grades[1].seasonGradeGrade, eq(1), "current grade");
        assertThat(
          grades[1].seasonGradeEndTimestamp,
          eq(effectiveTimestamp),
          "current grade end time",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "UpdateGradePendingGradeInPublishedState",
      execute: async () => {
        // Prepare
        let effectiveTimestamp = 2000 + 24 * 60 * 60 * 1000;
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image.jpg",
              1000,
              1000,
              SeasonState.PUBLISHED,
              0,
            ),
            insertSeasonGradeStatement("season1", "grade1", 1, 1000, 10000),
            insertSeasonGradeStatement(
              "season1",
              "grade2",
              10,
              10000,
              effectiveTimestamp + 1000,
            ),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let nowTimestamp = 1100;
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => nowTimestamp,
          () => "new grade",
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            grade: 20,
            effectiveTimestamp,
          },
          "session1",
        );

        // Verify
        let lastChangeTimestamp = (
          await getSeasonMetadata(SPANNER_DATABASE, "season1", "account1")
        )[0].seasonLastChangeTimestamp;
        assertThat(
          lastChangeTimestamp,
          eq(nowTimestamp),
          "last change timestamp",
        );
        let grades = await getLastTwoSeasonGrade(
          SPANNER_DATABASE,
          "season1",
          nowTimestamp,
        );
        assertThat(grades.length, eq(2), "two grades");
        assertThat(grades[0].seasonGradeGrade, eq(20), "updated grade");
        assertThat(
          grades[0].seasonGradeStartTimestamp,
          eq(effectiveTimestamp),
          "updated grade start time",
        );
        assertThat(grades[1].seasonGradeGrade, eq(1), "current grade");
        assertThat(
          grades[1].seasonGradeEndTimestamp,
          eq(effectiveTimestamp),
          "current grade end time",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "GradeTooLarge",
      execute: async () => {
        // Prepare
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          new NodeServiceClientMock(),
          () => 1100,
          () => "new grade",
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              grade: 100,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(error.message, containStr("must be within 1 - 99"), "error");
      },
    },
    {
      name: "GradeNegative",
      execute: async () => {
        // Prepare
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          new NodeServiceClientMock(),
          () => 1100,
          () => "new grade",
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              grade: -1,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(error.message, containStr("must be within 1 - 99"), "error");
      },
    },
    {
      name: "SeasonNotOwned",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image.jpg",
              1000,
              1000,
              SeasonState.DRAFT,
              0,
            ),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account2",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 1100,
          () => "new grade",
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              grade: 10,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr("Season season1 is not found."),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonArchived",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image.jpg",
              1000,
              1000,
              SeasonState.ARCHIVED,
              0,
            ),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 1100,
          () => "new grade",
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              grade: 10,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr("Season season1 is archived"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonDraftWithTwoGrades",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image.jpg",
              1000,
              1000,
              SeasonState.DRAFT,
              0,
            ),
            insertSeasonGradeStatement("season1", "grade1", 1, 1000, 10000),
            insertSeasonGradeStatement("season1", "grade2", 10, 10000, 20000),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 1100,
          () => "new grade",
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              grade: 10,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr("Season season1 has 2 grade(s) while in draft"),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonPublishedWithoutEffectiveTimestamp",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image.jpg",
              1000,
              1000,
              SeasonState.PUBLISHED,
              0,
            ),
            insertSeasonGradeStatement("season1", "grade1", 1, 1000, 10000),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 1100,
          () => "new grade",
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              grade: 10,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr(`"effectiveTimestamp" is required`),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonPublishedEffectiveTimestampTooSoon",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image.jpg",
              1000,
              1000,
              SeasonState.PUBLISHED,
              0,
            ),
            insertSeasonGradeStatement("season1", "grade1", 1, 1000, 10000),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 1100,
          () => "new grade",
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              grade: 10,
              effectiveTimestamp: 2000,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr(
            `"effectiveTimestamp" must be at least 1 day apart from now`,
          ),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonPublishedNoGrade",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image.jpg",
              1000,
              1000,
              SeasonState.PUBLISHED,
              0,
            ),
            insertSeasonGradeStatement("season1", "grade1", 1, 100, 1000),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 1100,
          () => "new grade",
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              grade: 10,
              effectiveTimestamp: 2000 + 24 * 60 * 60 * 1000,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr(`Season season1 doesn't have any valid grade`),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonPublishedGradeStartTimeTooLarge",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image.jpg",
              1000,
              1000,
              SeasonState.PUBLISHED,
              0,
            ),
            insertSeasonGradeStatement("season1", "grade1", 1, 2000, 10000),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 1100,
          () => "new grade",
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              grade: 10,
              effectiveTimestamp: 2000 + 24 * 60 * 60 * 1000,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr(
            `Grade grade1's start timestamp 2000 should be smaller than now 1100`,
          ),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonPublishedNewGradeStartTimeTooSmall",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image.jpg",
              1000,
              1000,
              SeasonState.PUBLISHED,
              0,
            ),
            insertSeasonGradeStatement("season1", "grade1", 1, 1000, 10000),
            insertSeasonGradeStatement("season1", "grade2", 1, 1000, 100000),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 1100,
          () => "new grade",
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              grade: 10,
              effectiveTimestamp: 2000 + 24 * 60 * 60 * 1000,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr(
            `Grade grade2's start timestamp 1000 should be larger than now 1100`,
          ),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
    {
      name: "SeasonPublishedCurrentGradeStartTimeTooLarge",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement(
              "season1",
              "account1",
              "a name",
              "image.jpg",
              1000,
              1000,
              SeasonState.PUBLISHED,
              0,
            ),
            insertSeasonGradeStatement("season1", "grade1", 1, 2000, 10000),
            insertSeasonGradeStatement("season1", "grade2", 1, 10000, 100000),
          ]);
          await transaction.commit();
        });
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          clientMock,
          () => 1100,
          () => "new grade",
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              grade: 10,
              effectiveTimestamp: 2000 + 24 * 60 * 60 * 1000,
            },
            "session1",
          ),
        );

        // Verify
        assertThat(
          error.message,
          containStr(
            `Grade grade1's start timestamp 2000 should be smaller than now 1100`,
          ),
          "error",
        );
      },
      tearDown: async () => {
        await cleanupSeason();
      },
    },
  ],
});
