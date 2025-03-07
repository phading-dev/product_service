import "../../../local/env";
import { SPANNER_DATABASE } from "../../../common/spanner_database";
import {
  GET_SEASON_ROW,
  deleteSeasonStatement,
  getSeason,
  insertEpisodeStatement,
  insertSeasonStatement,
} from "../../../db/sql";
import { StartSubtitleUploadingHandler } from "./start_subtitle_uploading_handler";
import { SeasonState } from "@phading/product_service_interface/show/season_state";
import { START_SUBTITLE_UPLOADING_RESPONSE } from "@phading/product_service_interface/show/web/publisher/interface";
import {
  EXCHANGE_SESSION_AND_CHECK_CAPABILITY,
  ExchangeSessionAndCheckCapabilityResponse,
} from "@phading/user_session_service_interface/node/interface";
import {
  START_SUBTITLE_UPLOADING,
  START_SUBTITLE_UPLOADING_REQUEST_BODY,
  StartMediaUploadingResponse,
} from "@phading/video_service_interface/node/interface";
import { eqMessage } from "@selfage/message/test_matcher";
import { NodeServiceClientMock } from "@selfage/node_service_client/client_mock";
import { assertThat, eq, isArray } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "StartSubtitleUploadingHandlerTest",
  cases: [
    {
      name: "Success",
      execute: async () => {
        // Prepare
        await SPANNER_DATABASE.runTransactionAsync(async (transaction) => {
          await transaction.batchUpdate([
            insertSeasonStatement({
              seasonId: "season1",
              publisherId: "publisher1",
              state: SeasonState.PUBLISHED,
              lastChangeTimeMs: 100,
              recentPublishTimeMs: 100,
            }),
            insertEpisodeStatement({
              seasonId: "season1",
              episodeId: "episode1",
              index: 1,
              videoContainerId: "videoContainer1",
              publishTimeMs: 200,
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
              case START_SUBTITLE_UPLOADING:
                this.request = request;
                return {
                  uploadSessionUrl: "url1",
                  byteOffset: 25,
                } as StartMediaUploadingResponse;
              default:
                throw new Error(`Unexpected.`);
            }
          }
        })();
        let handler = new StartSubtitleUploadingHandler(
          SPANNER_DATABASE,
          serviceClientMock,
          () => 1000,
        );

        // Execute
        let response = await handler.handle(
          "",
          {
            seasonId: "season1",
            episodeId: "episode1",
            contentLength: 100,
            fileType: "zip",
          },
          "session1",
        );

        // Verify
        assertThat(
          response,
          eqMessage(
            {
              uploadSessionUrl: "url1",
              byteOffset: 25,
            },
            START_SUBTITLE_UPLOADING_RESPONSE,
          ),
          "response",
        );
        assertThat(
          serviceClientMock.request.descriptor,
          eq(START_SUBTITLE_UPLOADING),
          "RC",
        );
        assertThat(
          serviceClientMock.request.body,
          eqMessage(
            {
              containerId: "videoContainer1",
              contentLength: 100,
              fileType: "zip",
            },
            START_SUBTITLE_UPLOADING_REQUEST_BODY,
          ),
          "RC body",
        );
        assertThat(
          await getSeason(SPANNER_DATABASE, "season1"),
          isArray([
            eqMessage(
              {
                seasonData: {
                  seasonId: "season1",
                  publisherId: "publisher1",
                  state: SeasonState.PUBLISHED,
                  lastChangeTimeMs: 1000,
                  recentPublishTimeMs: 100,
                },
              },
              GET_SEASON_ROW,
            ),
          ]),
          "season",
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
