import { getOctokit, context } from "@actions/github";

async function deleteTag() {
  try {
    const octokit = getOctokit(process.env.GITHUB_TOKEN);

    const { owner, repo } = context.repo;

    const tags = await octokit.paginate(octokit.rest.repos.listTags, {
      owner,
      repo,
    });

    if (!tags || !Array.isArray(tags)) {
      console.log("No tags found in the repository.");
      return;
    }

    if (tags.length === 0) {
      console.log("No tags found in the repository.");
      return;
    }

    console.log(`Found ${tags.length} tags in the repository.`);

    const deletedTags = [];
    const now = Date.now();
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

    for (const tag of tags) {
      const split = tag.name.split("+");

      if (!split[1]) {
        continue;
      }

      // Skip tags younger than 30 days
      const commit = await octokit.rest.repos.getCommit({
        owner,
        repo,
        ref: tag.commit.sha,
      });

      const commitDate = commit.data.commit.committer?.date
        ? new Date(commit.data.commit.committer.date).getTime()
        : commit.data.commit.author?.date
          ? new Date(commit.data.commit.author.date).getTime()
          : NaN;

      if (Number.isNaN(commitDate)) {
        console.warn(`Could not determine date for tag ${tag.name}; skipping.`);
        continue;
      }

      if (now - commitDate < THIRTY_DAYS_MS) continue;

      if (split[1].split("-").length > 1) {
        deletedTags.push(tag.name);
        console.log(`Tag to be deleted: ${tag.name}`);
      }
    }
  } catch (error) {
    console.error("Error deleting tags:", error);
    process.exit(1);
  }
}

export async function run() {
  await deleteTag();
}

run();
