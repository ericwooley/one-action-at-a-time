import {getOctokit} from '@actions/github'
import {wait} from './wait.js'
export interface GithubClient {
  rest: {
    actions: {
      listWorkflowRuns: ReturnType<
        typeof getOctokit
      >['rest']['actions']['listWorkflowRuns']
    }
  }
}
export interface Options {
  client: GithubClient
  log: (message: string) => void

  workflowFile: string
  timeoutSeconds: number
  intervalSeconds: number
  currentRunId: number
  owner: string
  repo: string
  branch: string
}

export const poll = async (options: Options): Promise<void> => {
  const {
    client,
    log,
    workflowFile,
    currentRunId,
    timeoutSeconds,
    intervalSeconds,
    owner,
    repo,
    branch
  } = options

  log(`Current Run Id: ${currentRunId}`)
  let now = new Date().getTime()
  const deadline = now + timeoutSeconds * 1000

  while (now <= deadline) {
    log(
      `Retrieving check runs for ${workflowFile} on ${owner}/${repo}@${branch}...`
    )
    const result = await client.rest.actions.listWorkflowRuns({
      owner,
      repo,
      workflow_id: workflowFile,
      branch
    })
    const myRun = result.data.workflow_runs.find(run => run.id === currentRunId)
    if (!myRun) throw new Error('Could not find current run')
    const runsInProgress = result.data.workflow_runs
      .filter(run => run.status !== 'completed')
      .filter(run => run.id !== currentRunId)
      .filter(run => run.created_at < myRun?.created_at)

    log(
      `Found: ${runsInProgress.length} runs in progress for ${workflowFile} for branch ${branch}`
    )
    log(runsInProgress.map(r => `${r.id} => ${r.url}`).join('\n'))

    const stillRunning = !!runsInProgress.length
    if (stillRunning) {
      runsInProgress.forEach(run => {
        log(
          `Found an action which is still running, id: '${run.id}' status: ${run.status}`
        )
      })
    } else {
      log('No actions found to be running')
      return
    }

    await wait(intervalSeconds * 1000)

    now = new Date().getTime()
  }

  log(`No completed checks after ${timeoutSeconds} seconds, exiting`)
  throw new Error('Timed out')
}
