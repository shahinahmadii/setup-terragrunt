# setup-terragrunt

[![Continuous Integration](https://github.com/01011111/setup-terragrunt/actions/workflows/continuous-integration.yml/badge.svg)](https://github.com/01011111/setup-terragrunt/actions/workflows/continuous-integration.yml)
[![Setup Terragrunt](https://github.com/01011111/setup-terragrunt/actions/workflows/setup-terragrunt.yml/badge.svg)](https://github.com/01011111/setup-terragrunt/actions/workflows/setup-terragrunt.yml)

The `01011111/setup-terragrunt` action is a JavaScript action that sets up Terragrunt CLI in your GitHub Actions workflow by:

- Downloading a specific version of Terragrunt CLI and adding it to the `PATH`.
- Installing a wrapper script to wrap subsequent calls of the `terragrunt` binary and expose its STDOUT, STDERR, and exit code as outputs named `stdout`, `stderr`, and `exitcode` respectively. (This can be optionally skipped if subsequent steps in the same job do not need to access the results of Terragrunt commands.)

After you've used the action, subsequent steps in the same job can run arbitrary Terragrunt commands using [the GitHub Actions `run` syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#jobsjob_idstepsrun). This allows most Terragrunt commands to work exactly like they do on your local command line.

## Fork from (hashicorp/setup-terraform)[/hashicorp/setup-terraform]

This action is a fork of HashiCorp's setup-terraform action, but modified so it installs Terragrunt instead of Terraform.

## Usage

This action can be run on `ubuntu-latest`, `windows-latest`, and `macos-latest` GitHub Actions runners. When running on `windows-latest` the shell should be set to Bash. When running on self-hosted GitHub Actions runners, NodeJS must be previously installed with the version specified in the [`action.yml`](https://github.com/01011111/setup-terragrunt/blob/main/action.yml).

The default configuration installs the latest version of Terragrunt CLI and installs the wrapper script to wrap subsequent calls to the `terragrunt` binary:

```yaml
steps:
- uses: 01011111/setup-terragrunt@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

A specific version of Terragrunt CLI can be installed:

```yaml
steps:
- uses: 01011111/setup-terragrunt@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    terragrunt_version: "0.54.20"
```

The wrapper script installation can be skipped by setting the `terragrunt_wrapper` variable to `false`:

```yaml
steps:
- uses: 01011111/setup-terragrunt@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    terragrunt_wrapper: false
```

Subsequent steps can access outputs when the wrapper script is installed:

```yaml
steps:
- uses: 01011111/setup-terragrunt@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

- run: terragrunt init

- id: plan
  run: terragrunt plan -no-color

- run: echo ${{ steps.plan.outputs.stdout }}
- run: echo ${{ steps.plan.outputs.stderr }}
- run: echo ${{ steps.plan.outputs.exitcode }}
```

Outputs can be used in subsequent steps to comment on the pull request:

> **Notice:** There's a limit to the number of characters inside a GitHub comment (65535).
>
> Due to that limitation, you might end up with a failed workflow run even if the plan succeeded.
>
> Another approach is to append your plan into the $GITHUB_STEP_SUMMARY environment variable which supports markdown.

```yaml
defaults:
  run:
    working-directory: ${{ env.tf_actions_working_dir }}
permissions:
  pull-requests: write
steps:
- uses: actions/checkout@v4
- uses: 01011111/setup-terragrunt@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    terragrunt_version: "0.34.0"

- name: Terragrunt fmt
  id: fmt
  run: terragrunt hclfmt --terragrunt-check
  continue-on-error: true

- name: Terragrunt Init
  id: init
  run: terragrunt init

- name: Terragrunt Validate
  id: validate
  run: terragrunt validate -no-color

- name: Terragrunt Plan
  id: plan
  run: terragrunt plan -no-color
  continue-on-error: true

- uses: actions/github-script@v6
  if: github.event_name == 'pull_request'
  env:
    PLAN: "terragrunt\n${{ steps.plan.outputs.stdout }}"
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    script: |
      const output = `#### Terragrunt Format and Style 🖌\`${{ steps.fmt.outcome }}\`
      #### Terragrunt Initialization ⚙️\`${{ steps.init.outcome }}\`
      #### Terragrunt Validation 🤖\`${{ steps.validate.outcome }}\`
      <details><summary>Validation Output</summary>

      \`\`\`\n
      ${{ steps.validate.outputs.stdout }}
      \`\`\`

      </details>

      #### Terragrunt Plan 📖\`${{ steps.plan.outcome }}\`

      <details><summary>Show Plan</summary>

      \`\`\`\n
      ${process.env.PLAN}
      \`\`\`

      </details>

      *Pusher: @${{ github.actor }}, Action: \`${{ github.event_name }}\`, Working Directory: \`${{ env.tf_actions_working_dir }}\`, Workflow: \`${{ github.workflow }}\`*`;

      github.rest.issues.createComment({
        issue_number: context.issue.number,
        owner: context.repo.owner,
        repo: context.repo.repo,
        body: output
      })
```

Instead of creating a new comment each time, you can also update an existing one:

```yaml
defaults:
  run:
    working-directory: ${{ env.tf_actions_working_dir }}
permissions:
  pull-requests: write
steps:
- uses: actions/checkout@v4
- uses: 01011111/setup-terragrunt@v1
  env:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
  with:
    terragrunt_version: "0.34.0"

- name: Terragrunt fmt
  id: fmt
  run: terragrunt hclfmt --terragrunt-check
  continue-on-error: true

- name: Terragrunt Init
  id: init
  run: terragrunt init

- name: Terragrunt Validate
  id: validate
  run: terragrunt validate -no-color

- name: Terragrunt Plan
  id: plan
  run: terragrunt plan -no-color
  continue-on-error: true

- uses: actions/github-script@v6
  if: github.event_name == 'pull_request'
  env:
    PLAN: "terragrunt\n${{ steps.plan.outputs.stdout }}"
  with:
    github-token: ${{ secrets.GITHUB_TOKEN }}
    script: |
      // 1. Retrieve existing bot comments for the PR
      const { data: comments } = await github.rest.issues.listComments({
        owner: context.repo.owner,
        repo: context.repo.repo,
        issue_number: context.issue.number,
      })
      const botComment = comments.find(comment => {
        return comment.user.type === 'Bot' && comment.body.includes('Terragrunt Format and Style')
      })

      // 2. Prepare format of the comment
      const output = `#### Terragrunt Format and Style 🖌\`${{ steps.fmt.outcome }}\`
      #### Terragrunt Initialization ⚙️\`${{ steps.init.outcome }}\`
      #### Terragrunt Validation 🤖\`${{ steps.validate.outcome }}\`
      <details><summary>Validation Output</summary>

      \`\`\`\n
      ${{ steps.validate.outputs.stdout }}
      \`\`\`

      </details>

      #### Terragrunt Plan 📖\`${{ steps.plan.outcome }}\`

      <details><summary>Show Plan</summary>

      \`\`\`\n
      ${process.env.PLAN}
      \`\`\`

      </details>

      *Pusher: @${{ github.actor }}, Action: \`${{ github.event_name }}\`, Working Directory: \`${{ env.tf_actions_working_dir }}\`, Workflow: \`${{ github.workflow }}\`*`;

      // 3. If we have a comment, update it, otherwise create a new one
      if (botComment) {
        github.rest.issues.updateComment({
          owner: context.repo.owner,
          repo: context.repo.repo,
          comment_id: botComment.id,
          body: output
        })
      } else {
        github.rest.issues.createComment({
          issue_number: context.issue.number,
          owner: context.repo.owner,
          repo: context.repo.repo,
          body: output
        })
      }
```

## Inputs

The action supports the following inputs:

- `terragrunt_version` - (required) The version of Terragrunt CLI to install. Instead of a full version string.
- `terragrunt_wrapper` - (optional) Whether to install a wrapper to wrap subsequent calls of
   the `terragrunt` binary and expose its STDOUT, STDERR, and exit code as outputs
   named `stdout`, `stderr`, and `exitcode` respectively. Defaults to `true`.

You also need to pass the `GITHUB_TOKEN` secret as an environment variable to the action. This is required to download the Terragrunt CLI binary from the GitHub Releases API.

## Outputs

This action does not configure any outputs directly. However, when you set the `terragrunt_wrapper` input
to `true`, the following outputs are available for subsequent steps that call the `terragrunt` binary:

- `stdout` - The STDOUT stream of the call to the `terragrunt` binary.
- `stderr` - The STDERR stream of the call to the `terragrunt` binary.
- `exitcode` - The exit code of the call to the `terragrunt` binary.

## License

[Mozilla Public License v2.0](LICENSE)

## Experimental Status

By using the software in this repository (the "Software"), you acknowledge that: (1) the Software is still in development, may change, and has not been released as a commercial product by HashiCorp and is not currently supported in any way by HashiCorp; (2) the Software is provided on an "as-is" basis, and may include bugs, errors, or other issues;  (3) the Software is NOT INTENDED FOR PRODUCTION USE, use of the Software may result in unexpected results, loss of data, or other unexpected results, and HashiCorp disclaims any and all liability resulting from use of the Software; and (4) HashiCorp reserves all rights to make all decisions about the features, functionality and commercial release (or non-release) of the Software, at any time and without any obligation or liability whatsoever.

## Contributing

### License Headers

All source code files (excluding autogenerated files like `package.json`, prose, and files excluded in [.copywrite.hcl](.copywrite.hcl)) must have a license header at the top.

This can be autogenerated by installing the HashiCorp [`copywrite`](https://github.com/hashicorp/copywrite#getting-started) tool and running `copywrite headers` in the root of the repository.
