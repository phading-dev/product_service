import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_LAST_SEASON_GRADES_ROW,
  GET_SEASON_ROW,
  deleteSeasonStatement,
  getLastSeasonGrades,
  getSeason,
} from "../../../db/sql";
import { CreateSeasonHandler } from "./create_season_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { CREATE_SEASON_RESPONSE } from "@phading/product_service_interface/show/web/publisher/interface";
import { FetchSessionAndCheckCapabilityResponse } from "@phading/user_session_service_interface/node/interface";
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
            canPublish: true,
          },
        } as FetchSessionAndCheckCapabilityResponse;
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
          await getSeason(SPANNER_DATABASE, { seasonSeasonIdEq: "uuid0" }),
          isArray([
            eqMessage(
              {
                seasonSeasonId: "uuid0",
                seasonPublisherId: "publisher1",
                seasonState: SeasonState.DRAFT,
                seasonName: "Season 1",
                seasonTotalPublishedEpisodes: 0,
                seasonLastChangeTimeMs: 1000,
                seasonDescription: "",
                seasonCreatedTimeMs: 1000,
                seasonTotalRatings: 0,
                seasonRatingsCount: 0,
                seasonAverageRating: 0,
                seasonRatingUpdatedTimeMs: 1000,
              },
              GET_SEASON_ROW,
            ),
          ]),
          "GetSeason",
        );
        assertThat(
          await getLastSeasonGrades(SPANNER_DATABASE, {
            seasonGradeSeasonIdEq: "uuid0",
            seasonGradeEndDateGt: "2000-01-01",
            limit: 2,
          }),
          isArray([
            eqMessage(
              {
                seasonGradeSeasonId: "uuid0",
                seasonGradeGradeId: "uuid1",
                seasonGradeStartDate: "1900-01-01",
                seasonGradeEndDate: "9999-12-31",
                seasonGradeGrade: 1,
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
            deleteSeasonStatement({ seasonSeasonIdEq: "uuid0" }),
          ]);
          await transaction.commit();
        });
      },
    },
  ],
});
