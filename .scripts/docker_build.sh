#!/bin/bash

# Copyright 2017 Apinf Oy
#This file is covered by the EUPL license.
#You may obtain a copy of the licence at
#https://joinup.ec.europa.eu/community/eupl/og_page/european-union-public-licence-eupl-v11

set -ev

if [ "${TRAVIS_PULL_REQUEST}" = "false" ]
then
  docker build -t apinf/platform:$DOCKER_TAG .
  docker login -u="$DOCKER_USERNAME" -p="$DOCKER_PASSWORD"
  docker push apinf/platform:$DOCKER_TAG
fi