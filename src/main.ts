import * as core from '@actions/core'
import {context, getOctokit} from '@actions/github'
import {poll} from './poll.js'

async function run(): Promise<void> {
  try {
    const token = core.getInput('token', {required: true})
    await poll({
      client: getOctokit(token),
      log: msg => core.info(msg),
      currentRunId: context.runId,
      workflowFile: core.getInput('workflowFile', {required: true}),
      owner: core.getInput('owner') || context.repo.owner,
      repo: core.getInput('repo') || context.repo.repo,
      branch: core.getInput('branch', {required: true}),

      timeoutSeconds: parseInt(core.getInput('timeoutSeconds') || '600'),
      intervalSeconds: parseInt(core.getInput('intervalSeconds') || '10')
    })
  } catch (error) {
    core.setFailed(error instanceof Error ? error.message : String(error))
  }
}

run()
