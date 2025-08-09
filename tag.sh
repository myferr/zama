#!/bin/bash

git tag $1
git push $2 tag $1
