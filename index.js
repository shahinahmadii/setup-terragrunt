/**
 * Modified to work for Terragrunt
 * Original source code available at https://github.com/hashicorp/setup-terraform
 *
 * Original code license:
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

const core = require('@actions/core');

const setup = require('./lib/setup-terragrunt');

(async () => {
  try {
    await setup();
  } catch (error) {
    core.setFailed(error.message);
  }
})();
