import "../../../../local/env";
import { normalizeVideoContainerStagingData } from "./normalize_video_container_staging_data";
import {
  VIDEO_CONTAINER_STAGING_DATA,
  VideoContainerStagingData,
} from "@phading/video_service_interface/node/video_container_staging_data";
import { eqMessage } from "@selfage/message/test_matcher";
import { assertThat } from "@selfage/test_matcher";
import { TEST_RUNNER } from "@selfage/test_runner";

TEST_RUNNER.run({
  name: "NormalizeVideoContainerStagingDataTest",
  cases: [
    {
      name: "Empty",
      execute: async () => {
        // Prepare
        let videoContainer: VideoContainerStagingData = {};
        normalizeVideoContainerStagingData(videoContainer);

        // Verify
        assertThat(
          videoContainer,
          eqMessage(
            {
              videos: [],
              audios: [],
              subtitles: [],
            },
            VIDEO_CONTAINER_STAGING_DATA,
          ),
          "normalized",
        );
      },
    },
    {
      name: "MixedData",
      execute: async () => {
        // Prepare
        let videoContainer: VideoContainerStagingData = {
          videos: [
            {
              staging: {
                toAdd: true,
              },
            },
            {},
            {
              staging: {
                toDelete: true,
              },
            },
          ],
          audios: [
            {
              staging: {
                toAdd: {
                  name: "  ",
                },
              },
            },
            {
              staging: {
                toAdd: {},
              },
            },
            {
              staging: {
                toAdd: {
                  name: " Audio Track 1  ",
                },
              },
            },
            {},
            {
              staging: {
                toDelete: true,
              },
            },
          ],
          subtitles: [
            {
              staging: {
                toAdd: {
                  name: "  ",
                },
              },
            },
            {
              staging: {
                toAdd: {},
              },
            },
            {
              staging: {
                toAdd: {
                  name: " Subtitle Track 1  ",
                },
              },
            },
            {},
            {
              staging: {
                toDelete: true,
              },
            },
          ],
        };
        normalizeVideoContainerStagingData(videoContainer);

        // Verify
        assertThat(
          videoContainer,
          eqMessage(
            {
              videos: [
                {
                  staging: {
                    toAdd: true,
                  },
                },
                {},
                {
                  staging: {
                    toDelete: true,
                  },
                },
              ],
              audios: [
                {
                  staging: {
                    toAdd: {
                      name: "1",
                    },
                  },
                },
                {
                  staging: {
                    toAdd: {
                      name: "2",
                    },
                  },
                },
                {
                  staging: {
                    toAdd: {
                      name: "Audio Track 1",
                    },
                  },
                },
                {},
                {
                  staging: {
                    toDelete: true,
                  },
                },
              ],
              subtitles: [
                {
                  staging: {
                    toAdd: {
                      name: "1",
                    },
                  },
                },
                {
                  staging: {
                    toAdd: {
                      name: "2",
                    },
                  },
                },
                {
                  staging: {
                    toAdd: {
                      name: "Subtitle Track 1",
                    },
                  },
                },
                {},
                {
                  staging: {
                    toDelete: true,
                  },
                },
              ],
            },
            VIDEO_CONTAINER_STAGING_DATA,
          ),
          "normalized",
        );
      },
    },
  ],
});
