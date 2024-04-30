/**
 * Modified to work for Terragrunt
 * Original source code available at https://github.com/hashicorp/setup-terraform
 *
 * Original code license:
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

const path = require('path');

module.exports = (() => {
  return [process.env.TERRAGRUNT_BIN].join(path.sep);
})();
