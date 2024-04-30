/**
 * Modified to work for Terragrunt
 * Original source code available at https://github.com/hashicorp/setup-terraform
 *
 * Original code license:
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

// Mock external modules by default
jest.mock('@actions/core');
jest.mock('@actions/tool-cache');
// Mock Node.js core modules
jest.mock('os');

const os = require('os');
const path = require('path');

const io = require('@actions/io');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const nock = require('nock');

const v05713json = require('./v0.57.13.json');
const setup = require('../lib/setup-terragrunt');

// Overwrite defaults
// core.debug = jest
//   .fn(console.log);
// core.error = jest
//   .fn(console.error);

describe('Setup Terragrunt', () => {
  const HOME = process.env.HOME;
  const APPDATA = process.env.APPDATA;

  beforeEach(() => {
    process.env.HOME = '/tmp/asdf';
    process.env.APPDATA = '/tmp/asdf';
  });

  afterEach(async () => {
    await io.rmRF(process.env.HOME);
    process.env.HOME = HOME;
    process.env.APPDATA = APPDATA;
  });

  test('gets specific version on linux, amd64', async () => {
    const version = '0.57.13';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version);

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('file');

    os.platform = jest
      .fn()
      .mockReturnValue('linux');

    os.arch = jest
      .fn()
      .mockReturnValue('amd64');

    nock('https://api.github.com')
      .get('/repos/gruntwork-io/terragrunt/releases/tags/v0.57.13')
      .reply(200, v05713json);

    const versionObj = await setup();
    expect(versionObj.tag_name).toEqual('v0.57.13');

    // downloaded CLI has been added to path
    expect(core.addPath).toHaveBeenCalled();
  });

  test('gets specific version on windows, 386', async () => {
    const version = '0.57.13';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version);

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('file');

    io.mv = jest.fn();

    os.platform = jest
      .fn()
      .mockReturnValue('win32');

    os.arch = jest
      .fn()
      .mockReturnValue('386');

    nock('https://api.github.com')
      .get('/repos/gruntwork-io/terragrunt/releases/tags/v0.57.13')
      .reply(200, v05713json);

    const versionObj = await setup();
    expect(versionObj.tag_name).toEqual('v0.57.13');

    // downloaded CLI has been added to path
    expect(core.addPath).toHaveBeenCalled();
  });

  test('gets specific version on linux, amd64', async () => {
    const version = '0.57.13';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version);

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('file');

    os.platform = jest
      .fn()
      .mockReturnValue('linux');

    os.arch = jest
      .fn()
      .mockReturnValue('amd64');

    nock('https://api.github.com')
      .get('/repos/gruntwork-io/terragrunt/releases/tags/v0.57.13')
      .reply(200, v05713json);

    const versionObj = await setup();
    expect(versionObj.tag_name).toEqual('v0.57.13');

    // downloaded CLI has been added to path
    expect(core.addPath).toHaveBeenCalled();
  });

  test('fails when specific version cannot be found', async () => {
    const version = '0.0.1';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version);

    nock('https://api.github.com')
      .get('/repos/gruntwork-io/terragrunt/releases/tags/v0.0.1')
      .reply(404);

    try {
      await setup();
    } catch (e) {
      expect(core.error).toHaveBeenCalled();
    }
  });

  test('fails when CLI for os and architecture cannot be found', async () => {
    const version = '0.57.13';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version);

    nock('https://api.github.com')
      .get('/repos/gruntwork-io/terragrunt/releases/tags/v0.57.13')
      .reply(200, v05713json);

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('file');

    os.platform = jest
      .fn()
      .mockReturnValue('madeupplat');

    os.arch = jest
      .fn()
      .mockReturnValue('madeuparch');

    try {
      await setup();
    } catch (e) {
      expect(core.error).toHaveBeenCalled();
    }
  });

  test('fails when CLI cannot be downloaded', async () => {
    const version = '0.57.13';

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version);

    nock('https://api.github.com')
      .get('/repos/gruntwork-io/terragrunt/releases/tags/v0.57.13')
      .reply(200, v05713json);

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('');

    os.platform = jest
      .fn()
      .mockReturnValue('linux');

    os.arch = jest
      .fn()
      .mockReturnValue('amd64');

    try {
      await setup();
    } catch (e) {
      expect(core.error).toHaveBeenCalled();
    }
  });

  test('installs wrapper on linux', async () => {
    const version = '0.57.13';
    const wrapperPath = path.resolve([__dirname, '..', 'wrapper', 'dist', 'index.js'].join(path.sep));

    const ioCp = jest.spyOn(io, 'cp')
      .mockImplementation(() => {});

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version)
      .mockReturnValueOnce('true');

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('file');

    os.platform = jest
      .fn()
      .mockReturnValue('linux');

    os.arch = jest
      .fn()
      .mockReturnValue('amd64');

    nock('https://api.github.com')
      .get('/repos/gruntwork-io/terragrunt/releases/tags/v0.57.13')
      .reply(200, v05713json);

    await setup();

    expect(ioCp).toHaveBeenCalledWith(wrapperPath, path.resolve([__dirname, '..', 'terragrunt'].join(path.sep)));
  });

  test('installs wrapper on windows', async () => {
    const version = '0.57.13';
    const wrapperPath = path.resolve([__dirname, '..', 'wrapper', 'dist', 'index.js'].join(path.sep));

    const ioCp = jest.spyOn(io, 'cp')
      .mockImplementation(() => {});

    core.getInput = jest
      .fn()
      .mockReturnValueOnce(version)
      .mockReturnValueOnce('true');

    tc.downloadTool = jest
      .fn()
      .mockReturnValueOnce('file');

    os.platform = jest
      .fn()
      .mockReturnValue('win32');

    os.arch = jest
      .fn()
      .mockReturnValue('386');

    nock('https://api.github.com')
      .get('/repos/gruntwork-io/terragrunt/releases/tags/v0.57.13')
      .reply(200, v05713json);

    await setup();

    expect(ioCp).toHaveBeenCalledWith(wrapperPath, path.resolve([__dirname, '..', 'terragrunt'].join(path.sep)));
  });
});
