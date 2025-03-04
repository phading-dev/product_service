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
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
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
        let handler = new UnrateSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        await handler.handle("", { seasonId: "season1" }, "authStr");

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
          isArray([]),
          "IndividualRating",
        );
      },
      async tearDown() {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonRatingStatement("season1"),
            deleteIndividualSeasonRatingStatement("account1", "season1"),
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
            deleteSeasonRatingStatement("season1"),
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
            deleteIndividualSeasonRatingStatement("account1", "season1"),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
