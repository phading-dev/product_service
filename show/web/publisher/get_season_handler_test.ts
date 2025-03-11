import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteSeasonMoreStatement,
  deleteSeasonRatingStatement,
  deleteSeasonStatement,
  insertSeasonGradeStatement,
  insertSeasonMoreStatement,
  insertSeasonRatingStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { GetSeasonHandler } from "./get_season_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { GET_SEASON_RESPONSE } from "@phading/product_service_interface/show/web/publisher/interface";
import {
  EXCHANGE_SESSION_AND_CHECK_CAPABILITY,
  ExchangeSessionAndCheckCapabilityResponse,
} from "@phading/user_session_service_interface/node/interface";
import { newNotFoundError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "GetSeasonHandlerTest",
  cases: [
    {
      name: "GetSeasonWithoutDescriptionAndWithoutCoverImageAndWithoutRatingAndWithOneEffectiveGrade",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              name: "Season 1",
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
              totalEpisodes: 3,
            }),
            insertSeasonMoreStatement({
              seasonId: "season1",
              description: "",
              createdTimeMs: 50,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "2020-01-01",
              endDate: "2020-02-01",
              grade: 10,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade2",
              startDate: "2020-02-01",
              endDate: "2020-03-01",
              grade: 9,
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
                throw new Error(`Unexpected.`);
            }
          }
        })();
        let handler = new GetSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://public_access_domain",
          () => new Date(1580544000000), // 2020-02-01T08:00:00.000Z
        );

        // Execute
        let response = await handler.handle(
          "",
          { seasonId: "season1" },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              seasonDetails: {
                name: "Season 1",
                state: SeasonState.PUBLISHED,
                description: "",
                totalEpisodes: 3,
                createdTimeMs: 50,
                lastChangeTimeMs: 100,
                grade: 9,
                averageRating: 0,
              },
            },
            GET_SEASON_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement("season1"),
            deleteSeasonMoreStatement("season1"),
            deleteSeasonRatingStatement("season1"),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "GetSeasonWithCoverImageAndWithDescriptionAndWithRatingAndWithTwoGrades",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              name: "Season 1",
              coverImageR2Filename: "image1",
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
              totalEpisodes: 3,
            }),
            insertSeasonMoreStatement({
              seasonId: "season1",
              description: "something something",
              createdTimeMs: 50,
            }),
            insertSeasonRatingStatement({
              seasonId: "season1",
              averageRating: 4.5,
              updatedTimeMs: 100,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade1",
              startDate: "2020-01-01",
              endDate: "2020-02-01",
              grade: 10,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade2",
              startDate: "2020-02-01",
              endDate: "2020-03-01",
              grade: 9,
            }),
            insertSeasonGradeStatement({
              seasonId: "season1",
              gradeId: "grade3",
              startDate: "2020-03-01",
              endDate: "2020-04-01",
              grade: 8,
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
                throw new Error(`Unexpected.`);
            }
          }
        })();
        let handler = new GetSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://public_access_domain",
          () => new Date(1582884000000), // 2020-02-28T10:00:00.000Z
        );

        // Execute
        let response = await handler.handle(
          "",
          { seasonId: "season1" },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              seasonDetails: {
                name: "Season 1",
                state: SeasonState.DRAFT,
                description: "something something",
                coverImageUrl: "https://public_access_domain/image1",
                totalEpisodes: 3,
                createdTimeMs: 50,
                lastChangeTimeMs: 100,
                grade: 9,
                nextGrade: {
                  grade: 8,
                  effectiveDate: "2020-03-01",
                },
                averageRating: 4.5,
              },
            },
            GET_SEASON_RESPONSE,
          ),
          "response",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement("season1"),
            deleteSeasonMoreStatement("season1"),
            deleteSeasonRatingStatement("season1"),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "SeasonNotOwnedByPublisher",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.DRAFT,
              name: "Season 1",
              lastChangeTimeMs: 100,
              recentPremierTimeMs: 100,
              totalEpisodes: 3,
            }),
            insertSeasonMoreStatement({
              seasonId: "season1",
              description: "something something",
              createdTimeMs: 50,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new (class extends NodeServiceClientMock {
          public async send(request: any): Promise<any> {
            switch (request.descriptor) {
              case EXCHANGE_SESSION_AND_CHECK_CAPABILITY:
                return {
                  accountId: "publisher2",
                  capabilities: {
                    canPublishShows: true,
                  },
                } as ExchangeSessionAndCheckCapabilityResponse;
              default:
                throw new Error(`Unexpected.`);
            }
          }
        })();
        let handler = new GetSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          "https://public_access_domain",
          () => new Date(1580544000000), // 2020-02-01T08:00:00.000Z
        );

        // Execute
        let error = await assertReject(
          handler.handle("", { seasonId: "season1" }, "sessionStr"),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(newNotFoundError(`Season season1 is not found.`)),
          "response",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement("season1"),
            deleteSeasonMoreStatement("season1"),
            deleteSeasonRatingStatement("season1"),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
