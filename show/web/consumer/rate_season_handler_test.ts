import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_INDIVIDUAL_SEASON_RATING_ROW,
  GET_SEASON_RATING_ROW,
  deleteIndividualSeasonRatingStatement,
  deleteSeasonRatingStatement,
  deleteSeasonStatement,
  getIndividualSeasonRating,
  getSeasonRating,
  insertIndividualSeasonRatingStatement,
  insertSeasonRatingStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { RateSeasonHandler } from "./rate_season_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
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
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsumeShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new RateSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle("", { seasonId: "season1", rating: 5 }, "authStr");

        // Verify
        assertThat(
          await getSeasonRating(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonRatingData: {
                  seasonId: "season1",
                  totalRatings: 5,
                  count: 1,
                  updatedTimeMs: 1000,
                },
              },
              GET_SEASON_RATING_ROW,
            ),
          ]),
          "SeasonRating",
        );
        assertThat(
          await getIndividualSeasonRating(
            SPANNER_DATABASE,
            "account1",
            "season1",
          ),
          isArray([
            eqMessage(
              {
                individualSeasonRatingData: {
                  raterId: "account1",
                  seasonId: "season1",
                  rating: 5,
                  ratedTimeMs: 1000,
                },
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
            deleteSeasonStatement("season1"),
            deleteSeasonRatingStatement("season1"),
            deleteIndividualSeasonRatingStatement("account1", "season1"),
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
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
            }),
            insertSeasonRatingStatement({
              seasonId: "season1",
              totalRatings: 5,
              count: 1,
              updatedTimeMs: 100,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsumeShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new RateSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle("", { seasonId: "season1", rating: 3 }, "authStr");

        // Verify
        assertThat(
          await getSeasonRating(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonRatingData: {
                  seasonId: "season1",
                  totalRatings: 8,
                  count: 2,
                  updatedTimeMs: 1000,
                },
              },
              GET_SEASON_RATING_ROW,
            ),
          ]),
          "SeasonRating",
        );
        assertThat(
          await getIndividualSeasonRating(
            SPANNER_DATABASE,
            "account1",
            "season1",
          ),
          isArray([
            eqMessage(
              {
                individualSeasonRatingData: {
                  raterId: "account1",
                  seasonId: "season1",
                  rating: 3,
                  ratedTimeMs: 1000,
                },
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
            deleteSeasonStatement("season1"),
            deleteSeasonRatingStatement("season1"),
            deleteIndividualSeasonRatingStatement("account1", "season1"),
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
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
            }),
            insertSeasonRatingStatement({
              seasonId: "season1",
              totalRatings: 8,
              count: 2,
              updatedTimeMs: 100,
            }),
            insertIndividualSeasonRatingStatement({
              raterId: "account1",
              seasonId: "season1",
              rating: 3,
              ratedTimeMs: 100,
            }),
          ]);
          await transaction.commit();
        });
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsumeShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let handler = new RateSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle("", { seasonId: "season1", rating: 1 }, "authStr");

        // Verify
        assertThat(
          await getSeasonRating(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonRatingData: {
                  seasonId: "season1",
                  totalRatings: 6,
                  count: 2,
                  updatedTimeMs: 1000,
                },
              },
              GET_SEASON_RATING_ROW,
            ),
          ]),
          "SeasonRating",
        );
        assertThat(
          await getIndividualSeasonRating(
            SPANNER_DATABASE,
            "account1",
            "season1",
          ),
          isArray([
            eqMessage(
              {
                individualSeasonRatingData: {
                  raterId: "account1",
                  seasonId: "season1",
                  rating: 1,
                  ratedTimeMs: 1000,
                },
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
            deleteSeasonStatement("season1"),
            deleteSeasonRatingStatement("season1"),
            deleteIndividualSeasonRatingStatement("account1", "season1"),
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
            canConsumeShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
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
