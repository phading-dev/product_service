import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  deleteIndividualSeasonRatingStatement,
  insertIndividualSeasonRatingStatement,
} from "../../../db/sql";
import { GetIndividualSeasonRatingHandler } from "./get_individual_season_rating_handler";
import { GET_INDIVIDUAL_SEASON_RATING_RESPONSE } from "@phading/product_service_interface/show/web/consumer/interface";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "GetIndividualSeasonRatingHandlerTest",
  cases: [
    {
      name: "NoRating",
      async execute() {
        // Prepare
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "account1",
          capabilities: {
            canConsume: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
        let handler = new GetIndividualSeasonRatingHandler(
          SPANNER_DATABASE,
          serviceClientMock,
        );

        // Execute
        let response = await handler.handle(
          "",
          { seasonId: "season1" },
          "authStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage({}, GET_INDIVIDUAL_SEASON_RATING_RESPONSE),
          "response",
        );
      },
      async tearDown() {},
    },
    {
      name: "GetRating",
      async execute() {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
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
        let handler = new GetIndividualSeasonRatingHandler(
          SPANNER_DATABASE,
          serviceClientMock,
        );

        // Execute
        let response = await handler.handle(
          "",
          { seasonId: "season1" },
          "authStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              rating: 3,
            },
            GET_INDIVIDUAL_SEASON_RATING_RESPONSE,
          ),
          "response",
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
