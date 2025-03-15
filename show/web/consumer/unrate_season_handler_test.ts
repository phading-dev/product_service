import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_SEASON_RATING_ROW,
  deleteIndividualSeasonRatingStatement,
  deleteSeasonRatingStatement,
  getIndividualSeasonRating,
  getSeasonRating,
  insertIndividualSeasonRatingStatement,
  insertSeasonRatingStatement,
} from "../../../db/sql";
import { UnrateSeasonHandler } from "./unrate_season_handler";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import {
  newInternalServerErrorError,
  newNotFoundError,
} from "@selfage/http_error";
import { eqHttpError } from "@selfage/http_error/test_matcher";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertReject, assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "UnrateSeasonHandlerTest",
  cases: [
    {
      name: "UnrateSeason",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonRatingStatement({
              seasonId: "season1",
              totalRatings: 8,
              count: 2,
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
        let handler = new UnrateSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle("", { seasonId: "season1" }, "authStr");

        // Verify
        assertThat(
          await getSeasonRating(SPANNER_DATABASE, {
            seasonRatingSeasonIdEq: "season1",
          }),
          isArray([
            eqMessage(
              {
                seasonRatingSeasonId: "season1",
                seasonRatingTotalRatings: 5,
                seasonRatingCount: 1,
                seasonRatingAverageRating: 5,
                seasonRatingUpdatedTimeMs: 1000,
              },
              GET_SEASON_RATING_ROW,
            ),
          ]),
          "SeasonRating",
        );
        assertThat(
          await getIndividualSeasonRating(SPANNER_DATABASE, {
            individualSeasonRatingRaterIdEq: "account1",
            individualSeasonRatingSeasonIdEq: "season1",
          }),
          isArray([]),
          "IndividualRating",
        );
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonRatingStatement({
              seasonRatingSeasonIdEq: "season1",
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
      name: "UnrateSeasonWithOnlyOneRating",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonRatingStatement({
              seasonId: "season1",
              totalRatings: 5,
              count: 1,
            }),
            insertIndividualSeasonRatingStatement({
              raterId: "account1",
              seasonId: "season1",
              rating: 5,
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
        let handler = new UnrateSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle("", { seasonId: "season1" }, "authStr");

        // Verify
        assertThat(
          await getSeasonRating(SPANNER_DATABASE, {
            seasonRatingSeasonIdEq: "season1",
          }),
          isArray([
            eqMessage(
              {
                seasonRatingSeasonId: "season1",
                seasonRatingTotalRatings: 0,
                seasonRatingCount: 0,
                seasonRatingAverageRating: 0,
                seasonRatingUpdatedTimeMs: 1000,
              },
              GET_SEASON_RATING_ROW,
            ),
          ]),
          "SeasonRating",
        );
        assertThat(
          await getIndividualSeasonRating(SPANNER_DATABASE, {
            individualSeasonRatingRaterIdEq: "account1",
            individualSeasonRatingSeasonIdEq: "season1",
          }),
          isArray([]),
          "IndividualRating",
        );
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonRatingStatement({
              seasonRatingSeasonIdEq: "season1",
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
      name: "NoIndividualRating",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonRatingStatement({
              seasonId: "season1",
              totalRatings: 8,
              count: 2,
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
        let handler = new UnrateSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        let error = await assertReject(
          handler.handle("", { seasonId: "season1" }, "authStr"),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newNotFoundError("Account account1 has not rated season season1."),
          ),
          "error",
        );
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonRatingStatement({
              seasonRatingSeasonIdEq: "season1",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
    {
      name: "NoSeasonRating",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertIndividualSeasonRatingStatement({
              seasonId: "season1",
              raterId: "account1",
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
        let handler = new UnrateSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        let error = await assertReject(
          handler.handle("", { seasonId: "season1" }, "authStr"),
        );

        // Verify
        assertThat(
          error,
          eqHttpError(
            newInternalServerErrorError("Season rating season1 is not found."),
          ),
          "error",
        );
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteIndividualSeasonRatingStatement({
              individualSeasonRatingRaterIdEq: "account1",
              individualSeasonRatingSeasonIdEq: "season1",
            }),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
