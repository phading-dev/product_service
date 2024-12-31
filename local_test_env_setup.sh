#!/bin/bash

# Env variables
export PROJECT_ID=phading-dev
export INSTANCE_ID=test
export DATABASE_ID=test
export SEASON_COVER_IMAGE_BUCKET_NAME=season-cover-image-test
export COVER_IMAGE_PUBLIC_ACCESS_DOMAIN=https://cover_image_access_domain
export VIDEO_PUBLIC_ACCESS_DOMAIN=https://video_access_domain

# GCP auth
gcloud auth application-default login

# Spanner
gcloud spanner instances create test --config=regional-us-central1 --description="test" --edition=STANDARD --processing-units=100
gcloud spanner databases create test --instance=test
npx spanage update db/ddl -p phading-dev -i test -d test
