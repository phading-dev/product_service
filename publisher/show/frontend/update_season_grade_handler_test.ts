import {
  deleteSeason,
  getLastTwoSeasonGrade,
  getSeasonMetadata,
  insertSeason,
  insertSeasonGrade,
} from "../../../db/sql";
import { UpdateSeasonGradeHandler } from "./update_season_grade_handler";
import { Spanner } from "@google-cloud/spanner";
import { SeasonState } from "@phading/product_service_interface/publisher/show/season_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/backend/interface";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import {
  assertReject,
  assertThat,
  containStr,
  eq,
  ne,
} from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

process.env.SPANNER_EMULATOR_HOST = "localhost:9010";

let TEST_DATABASE = new Spanner({
  projectId: "local-project",
})
  .instance("test-instance")
  .database("test-database");

TEST_RUNNER.run({
  name: "UpdateSeasonGradeHandlerTest",
  cases: [
    {
      name: "UpdateGradeInDraftState",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "image.jpg",
            SeasonState.DRAFT,
            0,
          );
          await insertSeasonGrade(
            (query) => transaction.run(query),
            "season1",
            "grade1",
            1,
            1000,
            10000,
          );
          await transaction.commit();
        });
        let prevTimestamps = (
          await getSeasonMetadata(
            (query) => TEST_DATABASE.run(query),
            "season1",
            "account1",
          )
        )[0].seasonLastChangeTimestamp;
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonGradeHandler(
          TEST_DATABASE,
          clientMock,
          () => 1100,
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
          await getSeasonMetadata(
            (query) => TEST_DATABASE.run(query),
            "season1",
            "account1",
          )
        )[0].seasonLastChangeTimestamp;
        assertThat(
          lastChangeTimestamp,
          ne(prevTimestamps),
          "last change timestamp",
        );
        let grade = (
          await getLastTwoSeasonGrade(
            (query) => TEST_DATABASE.run(query),
            "season1",
            1100,
          )
        )[0];
        assertThat(grade.seasonGradeGrade, eq(10), "grade");
      },
      tearDown: async () => {
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
        } catch (e) {}
      },
    },
    {
      name: "UpdateGradeInPublishedState",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "image.jpg",
            SeasonState.PUBLISHED,
            0,
          );
          await insertSeasonGrade(
            (query) => transaction.run(query),
            "season1",
            "grade1",
            1,
            1000,
            10000,
          );
          await transaction.commit();
        });
        let prevTimestamps = (
          await getSeasonMetadata(
            (query) => TEST_DATABASE.run(query),
            "season1",
            "account1",
          )
        )[0].seasonLastChangeTimestamp;
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonGradeHandler(
          TEST_DATABASE,
          clientMock,
          () => 1100,
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
          await getSeasonMetadata(
            (query) => TEST_DATABASE.run(query),
            "season1",
            "account1",
          )
        )[0].seasonLastChangeTimestamp;
        assertThat(
          lastChangeTimestamp,
          ne(prevTimestamps),
          "last change timestamp",
        );
        let grades = await getLastTwoSeasonGrade(
          (query) => TEST_DATABASE.run(query),
          "season1",
          1100,
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
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
        } catch (e) {}
      },
    },
    {
      name: "UpdateGradePendingGradeInPublishedState",
      execute: async () => {
        // Prepare
        let effectiveTimestamp = 2000 + 24 * 60 * 60 * 1000;
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "image.jpg",
            SeasonState.PUBLISHED,
            0,
          );
          await insertSeasonGrade(
            (query) => transaction.run(query),
            "season1",
            "grade1",
            1,
            1000,
            10000,
          );
          await insertSeasonGrade(
            (query) => transaction.run(query),
            "season1",
            "grade2",
            10,
            10000,
            effectiveTimestamp + 1000,
          );
          await transaction.commit();
        });
        let prevTimestamps = (
          await getSeasonMetadata(
            (query) => TEST_DATABASE.run(query),
            "season1",
            "account1",
          )
        )[0].seasonLastChangeTimestamp;
        let clientMock = new NodeServiceClientMock();
        clientMock.response = {
          userSession: {
            accountId: "account1",
          },
          canPublishShows: true,
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new UpdateSeasonGradeHandler(
          TEST_DATABASE,
          clientMock,
          () => 1100,
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
          await getSeasonMetadata(
            (query) => TEST_DATABASE.run(query),
            "season1",
            "account1",
          )
        )[0].seasonLastChangeTimestamp;
        assertThat(
          lastChangeTimestamp,
          ne(prevTimestamps),
          "last change timestamp",
        );
        let grades = await getLastTwoSeasonGrade(
          (query) => TEST_DATABASE.run(query),
          "season1",
          1100,
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
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
        } catch (e) {}
      },
    },
    {
      name: "GradeTooLarge",
      execute: async () => {
        // Prepare
        let handler = new UpdateSeasonGradeHandler(
          TEST_DATABASE,
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
          TEST_DATABASE,
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
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account2",
            "a name",
            "image.jpg",
            SeasonState.DRAFT,
            0,
          );
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
          TEST_DATABASE,
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
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
        } catch (e) {}
      },
    },
    {
      name: "SeasonArchived",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "image.jpg",
            SeasonState.ARCHIVED,
            0,
          );
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
          TEST_DATABASE,
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
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
        } catch (e) {}
      },
    },
    {
      name: "SeasonDraftWithTwoGrades",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "image.jpg",
            SeasonState.DRAFT,
            0,
          );
          await insertSeasonGrade(
            (query) => transaction.run(query),
            "season1",
            "grade1",
            1,
            1000,
            10000,
          );
          await insertSeasonGrade(
            (query) => transaction.run(query),
            "season1",
            "grade2",
            10,
            10000,
            20000,
          );
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
          TEST_DATABASE,
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
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
        } catch (e) {}
      },
    },
    {
      name: "SeasonPublishedWithoutEffectiveTimestamp",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "image.jpg",
            SeasonState.PUBLISHED,
            0,
          );
          await insertSeasonGrade(
            (query) => transaction.run(query),
            "season1",
            "grade1",
            1,
            1000,
            10000,
          );
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
          TEST_DATABASE,
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
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
        } catch (e) {}
      },
    },
    {
      name: "SeasonPublishedEffectiveTimestampTooSoon",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "image.jpg",
            SeasonState.PUBLISHED,
            0,
          );
          await insertSeasonGrade(
            (query) => transaction.run(query),
            "season1",
            "grade1",
            1,
            1000,
            10000,
          );
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
          TEST_DATABASE,
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
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
        } catch (e) {}
      },
    },
    {
      name: "SeasonPublishedNoGrade",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "image.jpg",
            SeasonState.PUBLISHED,
            0,
          );
          await insertSeasonGrade(
            (query) => transaction.run(query),
            "season1",
            "grade1",
            1,
            100,
            1000,
          );
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
          TEST_DATABASE,
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
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
        } catch (e) {}
      },
    },
    {
      name: "SeasonPublishedGradeStartTimeTooLarge",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "image.jpg",
            SeasonState.PUBLISHED,
            0,
          );
          await insertSeasonGrade(
            (query) => transaction.run(query),
            "season1",
            "grade1",
            1,
            2000,
            10000,
          );
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
          TEST_DATABASE,
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
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
        } catch (e) {}
      },
    },
    {
      name: "SeasonPublishedNewGradeStartTimeTooSmall",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "image.jpg",
            SeasonState.PUBLISHED,
            0,
          );
          await insertSeasonGrade(
            (query) => transaction.run(query),
            "season1",
            "grade1",
            1,
            1000,
            10000,
          );
          await insertSeasonGrade(
            (query) => transaction.run(query),
            "season1",
            "grade2",
            1,
            1000,
            100000,
          );
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
          TEST_DATABASE,
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
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
        } catch (e) {}
      },
    },
    {
      name: "SeasonPublishedCurrentGradeStartTimeTooLarge",
      execute: async () => {
        // Prepare
        await TEST_DATABASE.runTransactionAsync(async (transaction) => {
          await insertSeason(
            (query) => transaction.run(query),
            "season1",
            "account1",
            "a name",
            "image.jpg",
            SeasonState.PUBLISHED,
            0,
          );
          await insertSeasonGrade(
            (query) => transaction.run(query),
            "season1",
            "grade1",
            1,
            2000,
            10000,
          );
          await insertSeasonGrade(
            (query) => transaction.run(query),
            "season1",
            "grade2",
            1,
            10000,
            100000,
          );
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
          TEST_DATABASE,
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
        try {
          await TEST_DATABASE.runTransactionAsync(async (transaction) => {
            await deleteSeason((query) => transaction.run(query), "season1");
            await transaction.commit();
          });
        } catch (e) {}
      },
    },
  ],
});
