#!/usr/bin/env node

const { execSync } = require('child_process');
const https = require('https');

const GITHUB_USER = 'ndobariya219';
const REPO = 'BrickLedger';
const MAX_WAIT_TIME = 1 * 60 * 1000; // 1 minutes
const POLL_INTERVAL = 3 * 1000; // 1 seconds

function githubGet(path) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Node.js Deploy Script',
        'Accept': 'application/vnd.github.v3+json'
      }
    };

    https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          if (res.statusCode && res.statusCode >= 400) {
            reject(new Error(`GitHub API ${res.statusCode}: ${JSON.stringify(parsed)}`));
            return;
          }
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject).end();
  });
}

async function getRecentDeployments() {
  const deployments = await githubGet(
    `/repos/${GITHUB_USER}/${REPO}/deployments?environment=github-pages&per_page=10`
  );

  return Array.isArray(deployments) ? deployments : [];
}

async function getDeploymentStatusById(deploymentId) {
  const statuses = await githubGet(
    `/repos/${GITHUB_USER}/${REPO}/deployments/${deploymentId}/statuses?per_page=1`
  );

  if (!Array.isArray(statuses) || statuses.length === 0) {
    return { status: 'pending', id: deploymentId };
  }

  const latestStatus = statuses[0];
  return {
    status: latestStatus.state, // 'pending', 'in_progress', 'queued', 'success', 'failure', 'inactive', 'error'
    id: deploymentId,
    description: latestStatus.description
  };
}

async function waitForDeployment(previousLatestDeploymentId, deploymentStartedAtMs) {
  const startTime = Date.now();
  let lastStatus = null;
  let targetDeploymentId = null;
  let hasPrintedSearchMessage = false;
  
  console.log('⏳ Waiting for GitHub Pages deployment to finish...\n');
  
  while (Date.now() - startTime < MAX_WAIT_TIME) {
    try {
      if (!targetDeploymentId) {
        const deployments = await getRecentDeployments();

        const previousIdNumber = Number(previousLatestDeploymentId);
        const hasPreviousId = Number.isFinite(previousIdNumber);

        const matchingDeployment = deployments.find((deployment) => {
          const deploymentIdNumber = Number(deployment.id);

          if (hasPreviousId && Number.isFinite(deploymentIdNumber)) {
            return deploymentIdNumber > previousIdNumber;
          }

          const createdAtMs = Date.parse(deployment.created_at || '');
          return Number.isFinite(createdAtMs) && createdAtMs >= deploymentStartedAtMs;
        });

        if (matchingDeployment) {
          targetDeploymentId = matchingDeployment.id;
          console.log(`🎯 Found new GitHub Pages deployment (ID: ${targetDeploymentId})`);
        } else {
          if (!hasPrintedSearchMessage) {
            console.log('🔎 Waiting for the new deployment entry to appear in GitHub...');
            hasPrintedSearchMessage = true;
          }

          await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
          continue;
        }
      }

      const { status, description } = await getDeploymentStatusById(targetDeploymentId);
      
      if (status !== lastStatus) {
        const statusEmoji = {
          'success': '✅',
          'failure': '❌',
          'pending': '⏳',
          'in_progress': '🔄',
          'queued': '📋',
          'error': '⚠️',
          'unknown': '❓'
        }[status] || '❓';
        
        console.log(`${statusEmoji} Deployment state: ${status.toUpperCase()}${description ? ` - ${description}` : ''}`);
        lastStatus = status;
      }
      
      if (status === 'success') {
        console.log('\n✅ Deployment completed successfully!');
        return 0;
      }
      
      if (status === 'failure' || status === 'error') {
        console.error('\n❌ Deployment failed!');
        return 1;
      }
      
      // Wait before next poll
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    } catch (error) {
      console.error('Error checking deployment status:', error.message);
      await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL));
    }
  }
  
  console.error('\n⏱️ Timeout waiting for deployment to complete');
  return 1;
}

async function main() {
  try {
    const deploymentsBefore = await getRecentDeployments();
    const latestBefore = deploymentsBefore[0] || null;
    const previousLatestDeploymentId = latestBefore ? latestBefore.id : null;

    console.log('🧹 Cleaning previous web build...');
    execSync('rm -rf dist', { stdio: 'inherit' });

    console.log('🏗️ Building web app...');
    execSync('expo export -p web', { stdio: 'inherit' });

    const deploymentTriggeredAtMs = Date.now();
    
    console.log('\n🚀 Publishing to GitHub Pages...');
    execSync(`gh-pages -d dist --nojekyll --no-history --cname app.arth-homes.com.au`, { stdio: 'inherit' });
    
    console.log('\n📡 Publish command completed. Monitoring deployment status...\n');
    const exitCode = await waitForDeployment(previousLatestDeploymentId, deploymentTriggeredAtMs);
    process.exit(exitCode);
  } catch (error) {
    console.error('Error during deployment:', error.message);
    process.exit(1);
  }
}

main();
