/**
 * Modified to work for Terragrunt
 * Original source code available at https://github.com/hashicorp/setup-terraform
 *
 * Original code license:
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

const OutputListener = require('../lib/output-listener');

describe('output-listener', () => {
  it('receives and exposes data', () => {
    const listener = new OutputListener();
    const listen = listener.listener;
    listen(Buffer.from('foo'));
    listen(Buffer.from('bar'));
    listen(Buffer.from('baz'));
    expect(listener.contents).toEqual('foobarbaz');
  });
});
