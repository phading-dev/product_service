import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_INDIVIDUAL_SEASON_RATING_ROW,
  GET_SEASON_ROW,
  deleteIndividualSeasonRatingStatement,
  deleteSeasonStatement,
  getIndividualSeasonRating,
  getSeason,
  insertIndividualSeasonRatingStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { RateSeasonHandler } from "./rate_season_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { newNotFoundError } from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "RateSeasonHandlerTest",
  cases: [
    {
      name: "FirstRatingOfSeason",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              state: SeasonState.PUBLISHED,
              averageRating: 0,
              totalRatings: 0,
              ratingsCount: 0,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsume: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new RateSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle("", { seasonId: "season1", rating: 5 }, "authStr");

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, {
            seasonSeasonIdEq: "season1",
          }),
          isArray([
            eqMessage(
              {
                seasonSeasonId: "season1",
                seasonState: SeasonState.PUBLISHED,
                seasonTotalRatings: 5,
                seasonRatingsCount: 1,
                seasonAverageRating: 5,
                seasonRatingUpdatedTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "SeasonRating",
        );
        assertThat(
          await getIndividualSeasonRating(SPANNER_DATABASE, {
            individualSeasonRatingRaterIdEq: "account1",
            individualSeasonRatingSeasonIdEq: "season1",
          }),
          isArray([
            eqMessage(
              {
                individualSeasonRatingRaterId: "account1",
                individualSeasonRatingSeasonId: "season1",
                individualSeasonRatingRating: 5,
                individualSeasonRatingRatedTimeMs: 1000,
              },
              GET_INDIVIDUAL_SEASON_RATING_ROW,
            ),
          ]),
          "IndividualSeasonRating",
        );
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({
              seasonSeasonIdEq: "season1",
            }),
            deleteIndividualSeasonRatingStatement({
              individualSeasonRatingRaterIdEq: "account1",
              individualSeasonRatingSeasonIdEq: "season1",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "FirstRatingOfIndividual",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              state: SeasonState.PUBLISHED,
              averageRating: 5,
              totalRatings: 5,
              ratingsCount: 1,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsume: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new RateSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle("", { seasonId: "season1", rating: 3 }, "authStr");

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, {
            seasonSeasonIdEq: "season1",
          }),
          isArray([
            eqMessage(
              {
                seasonSeasonId: "season1",
                seasonState: SeasonState.PUBLISHED,
                seasonTotalRatings: 8,
                seasonRatingsCount: 2,
                seasonAverageRating: 4,
                seasonRatingUpdatedTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "SeasonRating",
        );
        assertThat(
          await getIndividualSeasonRating(SPANNER_DATABASE, {
            individualSeasonRatingRaterIdEq: "account1",
            individualSeasonRatingSeasonIdEq: "season1",
          }),
          isArray([
            eqMessage(
              {
                individualSeasonRatingRaterId: "account1",
                individualSeasonRatingSeasonId: "season1",
                individualSeasonRatingRating: 3,
                individualSeasonRatingRatedTimeMs: 1000,
              },
              GET_INDIVIDUAL_SEASON_RATING_ROW,
            ),
          ]),
          "IndividualSeasonRating",
        );
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({
              seasonSeasonIdEq: "season1",
            }),
            deleteIndividualSeasonRatingStatement({
              individualSeasonRatingRaterIdEq: "account1",
              individualSeasonRatingSeasonIdEq: "season1",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "UpdateRating",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              state: SeasonState.PUBLISHED,
              averageRating: 4,
              totalRatings: 8,
              ratingsCount: 2,
            }),
            insertIndividualSeasonRatingStatement({
              raterId: "account1",
              seasonId: "season1",
              rating: 3,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsume: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new RateSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle("", { seasonId: "season1", rating: 1 }, "authStr");

        // Verify
        assertThat(
          await getSeason(SPANNER_DATABASE, {
            seasonSeasonIdEq: "season1",
          }),
          isArray([
            eqMessage(
              {
                seasonSeasonId: "season1",
                seasonState: SeasonState.PUBLISHED,
                seasonTotalRatings: 6,
                seasonRatingsCount: 2,
                seasonAverageRating: 3,
                seasonRatingUpdatedTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "SeasonRating",
        );
        assertThat(
          await getIndividualSeasonRating(SPANNER_DATABASE, {
            individualSeasonRatingRaterIdEq: "account1",
            individualSeasonRatingSeasonIdEq: "season1",
          }),
          isArray([
            eqMessage(
              {
                individualSeasonRatingRaterId: "account1",
                individualSeasonRatingSeasonId: "season1",
                individualSeasonRatingRating: 1,
                individualSeasonRatingRatedTimeMs: 1000,
              },
              GET_INDIVIDUAL_SEASON_RATING_ROW,
            ),
          ]),
          "IndividualSeasonRating",
        );
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement({
              seasonSeasonIdEq: "season1",
            }),
            deleteIndividualSeasonRatingStatement({
              individualSeasonRatingRaterIdEq: "account1",
              individualSeasonRatingSeasonIdEq: "season1",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "SeasonNotFound",
      async execute() {
        // Prepare
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsume: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new RateSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        let error = await assertReject(
          handler.handle("", { seasonId: "season1", rating: 5 }, "authStr"),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(newNotFoundError("Season season1 is not found.")),
          "error",
        );
      },
      async tearDown() {},
    },
  ],
});
