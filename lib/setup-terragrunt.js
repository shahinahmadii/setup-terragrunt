/**
 * Modified to work for Terragrunt
 * Original source code available at https://github.com/hashicorp/setup-terraform
 *
 * Original code license:
 * Copyright (c) HashiCorp, Inc.
 * SPDX-License-Identifier: MPL-2.0
 */

// Node.js core
const os = require('os');
const path = require('path');
const semver = require('semver');

// External
const { Octokit } = process.env.GITHUB_ACTION ? require('@octokit/action') : require('@octokit/rest');
const core = require('@actions/core');
const tc = require('@actions/tool-cache');
const io = require('@actions/io');

const octokitOptions = {
  userAgent: 'GitHub Action 01011111/setup-terragrunt'
};
if (!process.env.GITHUB_ACTION) { octokitOptions.auth = process.env.GITHUB_TOKEN; }
const octokit = new Octokit(octokitOptions);

// arch in [arm, x32, x64...] (https://nodejs.org/api/os.html#os_os_arch)
// return value in [amd64, 386, arm]
function mapArch (arch) {
  const mappings = {
    x32: '386',
    x64: 'amd64'
  };
  return mappings[arch] || arch;
}

// os in [darwin, linux, win32...] (https://nodejs.org/api/os.html#os_os_platform)
// return value in [darwin, linux, windows]
function mapOS (os) {
  const mappings = {
    win32: 'windows'
  };
  return mappings[os] || os;
}

async function getRelease (tag) {
  const res = await octokit.repos.getReleaseByTag({ owner: 'gruntwork-io', repo: 'terragrunt', tag: `v${tag}` });
  return res.data;
}

function getBuild (release, platform, arch) {
  return release.assets.find((asset) => asset.name.includes(platform) && asset.name.includes(arch));
}

async function downloadCLI (url) {
  core.debug(`Downloading Terragrunt CLI from ${url}`);
  const pathToCLI = await tc.downloadTool(url);

  core.debug(`Terragrunt CLI path is ${pathToCLI}.`);

  if (!pathToCLI) {
    throw new Error(`Unable to download Terragrunt from ${url}`);
  }

  return pathToCLI;
}

async function installWrapper (pathToCLI) {
  let source, target;

  // If we're on Windows, then the executable ends with .exe
  const exeSuffix = os.platform().startsWith('win') ? '.exe' : '';

  // Rename terragrunt(.exe) to terragrunt-bin(.exe)
  try {
    source = [pathToCLI, `terragrunt${exeSuffix}`].join(path.sep);
    target = [pathToCLI, `terragrunt-bin${exeSuffix}`].join(path.sep);
    core.debug(`Moving ${source} to ${target}.`);
    await io.mv(source, target);
  } catch (e) {
    core.error(`Unable to move ${source} to ${target}.`);
    throw e;
  }

  // Install our wrapper as terragrunt
  try {
    source = path.resolve([__dirname, '..', 'wrapper', 'dist', 'index.js'].join(path.sep));
    target = [pathToCLI, 'terragrunt'].join(path.sep);
    core.debug(`Copying ${source} to ${target}.`);
    await io.cp(source, target);
  } catch (e) {
    core.error(`Unable to copy ${source} to ${target}.`);
    throw e;
  }

  // Export a new environment variable, so our wrapper can locate the binary
  core.exportVariable('TERRAGRUNT_CLI_PATH', pathToCLI);
}

async function run () {
  try {
    // Gather GitHub Actions inputs
    let version = core.getInput('terragrunt_version');
    if (version[0] === 'v') { version = version.slice(1); }
    const wrapper = core.getInput('terragrunt_wrapper') === 'true';

    // Gather OS details
    const osPlatform = os.platform();
    const osArch = os.arch();

    core.debug(`Finding releases for Terragrunt version ${version}`);
    const release = await getRelease(version);
    const platform = mapOS(osPlatform);
    let arch = mapArch(osArch);

    // Terragrunt was not available for darwin/arm64 until 0.28.12, however macOS
    // runners can emulate darwin/amd64.
    if (platform === 'darwin' && arch === 'arm64' && semver.valid(release.tag_name) && semver.lt(release.tag_name, '0.28.12')) {
      core.warning('Terragrunt is not available for darwin/arm64 until version 0.28.12. Falling back to darwin/amd64.');
      arch = 'amd64';
    }

    core.debug(`Getting build for Terragrunt version ${release.tag_name}: ${platform} ${arch}`);
    const build = getBuild(release, platform, arch);
    if (!build) {
      throw new Error(`Terragrunt version ${version} not available for ${platform} and ${arch}`);
    }

    // Download requested version
    const pathToCLI = await downloadCLI(build.browser_download_url);

    // Install our wrapper
    if (wrapper) {
      await installWrapper(pathToCLI);
    }

    const cachedPath = await tc.cacheDir(pathToCLI, 'terragrunt', release.tag_name);

    // Add to path
    core.addPath(cachedPath);

    return release;
  } catch (error) {
    core.error(error);
    throw error;
  }
}

module.exports = run;
