import "../../../local/env";
import { FAR_FUTURE_TIME_MS } from "../../../common/constants";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_LAST_SEASON_GRADES_ROW,
  GET_SEASON_MORE_ROW,
  GET_SEASON_ROW,
  deleteSeasonMoreStatement,
  deleteSeasonStatement,
  getLastSeasonGrades,
  getSeason,
  getSeasonMore,
} from "../../../db/sql";
import { CreateSeasonHandler } from "./create_season_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { CREATE_SEASON_RESPONSE } from "@phading/product_service_interface/show/web/publisher/interface";
import { ExchangeSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "CreateSeasonHandlerTest",
  cases: [
    {
      name: "Success",
      execute: async () => {
        // Prepare
        let serviceClientMock = new NodeServiceClientMock();
        serviceClientMock.response = {
          accountId: "publisher1",
          capabilities: {
            canPublishShows: true,
          },
        } as ExchangeSessionAndCheckCapabilityResponse;
        let id = 0;
        let handler = new CreateSeasonHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
          () => `uuid${id++}`,
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            name: "Season 1",
          },
          "sessionStr",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              seasonId: "uuid0",
            },
            CREATE_SEASON_RESPONSE,
          ),
          "response",
        );
        assertThat(
          await getSeason(SPANNER_DATABASE, "uuid0"),
          isArray([
            eqMessage(
              {
                seasonData: {
                  seasonId: "uuid0",
                  publisherId: "publisher1",
                  state: SeasonState.DRAFT,
                  name: "Season 1",
                  totalEpisodes: 0,
                  lastChangeTimeMs: 1000,
                  recentPremierTimeMs: FAR_FUTURE_TIME_MS,
                },
              },
              GET_SEASON_ROW,
            ),
          ]),
          "GetSeason",
        );
        assertThat(
          await getSeasonMore(SPANNER_DATABASE, "uuid0"),
          isArray([
            eqMessage(
              {
                seasonMoreData: {
                  seasonId: "uuid0",
                  description: "",
                  createdTimeMs: 1000,
                },
              },
              GET_SEASON_MORE_ROW,
            ),
          ]),
          "GetSeasonMore",
        );
        assertThat(
          await getLastSeasonGrades(SPANNER_DATABASE, "uuid0", "2000-01-01", 2),
          isArray([
            eqMessage(
              {
                seasonGradeData: {
                  seasonId: "uuid0",
                  gradeId: "uuid1",
                  startDate: "1900-01-01",
                  endDate: "9999-12-31",
                  grade: 1,
                },
              },
              GET_LAST_SEASON_GRADES_ROW,
            ),
          ]),
          "seasonGrade",
        );
      },
      tearDown: async () => {
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            deleteSeasonStatement("uuid0"),
            deleteSeasonMoreStatement("uuid0"),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
