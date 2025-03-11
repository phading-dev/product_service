import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_LAST_SEASON_GRADES_ROW,
  GET_SEASON_ROW,
  deleteSeasonStatement,
  getLastSeasonGrades,
  getSeason,
  insertSeasonGradeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { UpdateSeasonGradeHandler } from "./update_season_grade_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import {
  EXCHANGE_SESSION_AND_CHECK_CAPABILITY,
  ExchangeSessionAndCheckCapabilityResponse,
} from "@phading/user_session_service_interface/node/interface";
import { newBadRequestError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "UpdateSeasonGradeHandlerTest",
  cases: [
    {
      name: "UpdateDraftSeason",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "1900-01-01",
              endDate: "9999-12-31",
              grade: 3,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new (class extends NodeServiceClientMock {
          public async send(request: any): Promise<any> {
            switch (request.descriptor) {
              case EXCHANGE_SESSION_AND_CHECK_CAPABILITY:
                return {
                  accountId: "publisher1",
                  capabilities: {
                    canPublishShows: true,
                  },
                } as ExchangeSessionAndCheckCapabilityResponse;
              default:
                throw new Error(`Unexpected`);
            }
          }
        })();
        let id = 0;
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => new Date(1577908800000), // 2020-01-01T08:00:00Z
          () => `uuid${id++}`,
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            grade: 5,
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonData: {
                  seasonId: "season1",
                  publisherId: "publisher1",
                  state: SeasonState.DRAFT,
                  lastChangeTimeMs: 1577908800000,
                  recentPremierTimeMs: 100,
                },
              },
              GET_SEASON_ROW,
            ),
          ]),
          "Season",
        );
        assertThat(
          await getLastSeasonGrades(
            SPANNER_DATABASE,
            "season1",
            "2020-01-01",
            2,
          ),
          isArray([
            eqMessage(
              {
                seasonGradeData: {
                  seasonId: "season1",
                  gradeId: "grade1",
                  startDate: "1900-01-01",
                  endDate: "9999-12-31",
                  grade: 5,
                },
              },
              GET_LAST_SEASON_GRADES_ROW,
            ),
          ]),
          "SeasonGrades",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
          await transaction.commit();
        });
      },
    },
    {
      name: "UpdatePublishedSeasonWithOneGrade_EffectiveDateTooSoon_ThenSuccess",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "1900-01-01",
              endDate: "9999-12-31",
              grade: 3,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new (class extends NodeServiceClientMock {
          public async send(request: any): Promise<any> {
            switch (request.descriptor) {
              case EXCHANGE_SESSION_AND_CHECK_CAPABILITY:
                return {
                  accountId: "publisher1",
                  capabilities: {
                    canPublishShows: true,
                  },
                } as ExchangeSessionAndCheckCapabilityResponse;
              default:
                throw new Error(`Unexpected`);
            }
          }
        })();
        let id = 0;
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => new Date(1577908800000), // 2020-01-01T08:00:00Z
          () => `uuid${id++}`,
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              grade: 5,
              effectiveDate: "2020-01-02",
            },
            "sessionStr",
          ),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newBadRequestError(
              `"effectiveDate" 2020-01-02 must be at least 2 days apart from today 2020-01-01 when updating grade for the published season season1.`,
            ),
          ),
          "Error",
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            grade: 5,
            effectiveDate: "2020-01-03",
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonData: {
                  seasonId: "season1",
                  publisherId: "publisher1",
                  state: SeasonState.PUBLISHED,
                  lastChangeTimeMs: 1577908800000,
                  recentPremierTimeMs: 100,
                },
              },
              GET_SEASON_ROW,
            ),
          ]),
          "Season",
        );
        assertThat(
          await getLastSeasonGrades(
            SPANNER_DATABASE,
            "season1",
            "2020-01-01",
            2,
          ),
          isArray([
            eqMessage(
              {
                seasonGradeData: {
                  seasonId: "season1",
                  gradeId: "uuid0",
                  startDate: "2020-01-03",
                  endDate: "9999-12-31",
                  grade: 5,
                },
              },
              GET_LAST_SEASON_GRADES_ROW,
            ),
            eqMessage(
              {
                seasonGradeData: {
                  seasonId: "season1",
                  gradeId: "grade1",
                  startDate: "1900-01-01",
                  endDate: "2020-01-03",
                  grade: 3,
                },
              },
              GET_LAST_SEASON_GRADES_ROW,
            ),
          ]),
          "SeasonGrades",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
          await transaction.commit();
        });
      },
    },
    {
      name: "UpdatePublishedSeasonWithMultipleGrades_EffectiveDateTooSoon_ThenSuccess",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "1900-01-01",
              endDate: "2020-02-01",
              grade: 3,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade2",
              startDate: "2020-02-01",
              endDate: "9999-12-31",
              grade: 5,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new (class extends NodeServiceClientMock {
          public async send(request: any): Promise<any> {
            switch (request.descriptor) {
              case EXCHANGE_SESSION_AND_CHECK_CAPABILITY:
                return {
                  accountId: "publisher1",
                  capabilities: {
                    canPublishShows: true,
                  },
                } as ExchangeSessionAndCheckCapabilityResponse;
              default:
                throw new Error(`Unexpected`);
            }
          }
        })();
        let id = 0;
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => new Date(1577840400000), // 2020-01-01T01:00:00Z
          () => `uuid${id++}`,
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              grade: 4,
              effectiveDate: "2020-01-01",
            },
            "sessionStr",
          ),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newBadRequestError(
              `"effectiveDate" 2020-01-01 must be at least 2 days apart from today 2019-12-31 when updating grade for the published season season1.`,
            ),
          ),
          "Error",
        );

        // Execute
        await handler.handle(
          "",
          {
            seasonId: "season1",
            grade: 4,
            effectiveDate: "2020-01-02",
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonData: {
                  seasonId: "season1",
                  publisherId: "publisher1",
                  state: SeasonState.PUBLISHED,
                  lastChangeTimeMs: 1577840400000,
                  recentPremierTimeMs: 100,
                },
              },
              GET_SEASON_ROW,
            ),
          ]),
          "Season",
        );
        assertThat(
          await getLastSeasonGrades(
            SPANNER_DATABASE,
            "season1",
            "2020-01-01",
            2,
          ),
          isArray([
            eqMessage(
              {
                seasonGradeData: {
                  seasonId: "season1",
                  gradeId: "grade2",
                  startDate: "2020-01-02",
                  endDate: "9999-12-31",
                  grade: 4,
                },
              },
              GET_LAST_SEASON_GRADES_ROW,
            ),
            eqMessage(
              {
                seasonGradeData: {
                  seasonId: "season1",
                  gradeId: "grade1",
                  startDate: "1900-01-01",
                  endDate: "2020-01-02",
                  grade: 3,
                },
              },
              GET_LAST_SEASON_GRADES_ROW,
            ),
          ]),
          "SeasonGrades",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
          await transaction.commit();
        });
      },
    },
    {
      name: "SeasonArchived",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.ARCHIVED,
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "1900-01-01",
              endDate: "9999-12-31",
              grade: 3,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new (class extends NodeServiceClientMock {
          public async send(request: any): Promise<any> {
            switch (request.descriptor) {
              case EXCHANGE_SESSION_AND_CHECK_CAPABILITY:
                return {
                  accountId: "publisher1",
                  capabilities: {
                    canPublishShows: true,
                  },
                } as ExchangeSessionAndCheckCapabilityResponse;
              default:
                throw new Error(`Unexpected`);
            }
          }
        })();
        let id = 0;
        let handler = new UpdateSeasonGradeHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => new Date(1577908800000), // 2020-01-01T08:00:00Z
          () => `uuid${id++}`,
        );

        // Execute
        let error = await assertReject(
          handler.handle(
            "",
            {
              seasonId: "season1",
              grade: 5,
            },
            "sessionStr",
          ),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newBadRequestError(
              `Season season1 is archived and cannot be updated anymore.`,
            ),
          ),
          "Error",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([deleteSeasonStatement("season1")]);
          await transaction.commit();
        });
      },
    },
  ],
});
