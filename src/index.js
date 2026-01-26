import { getInput } from "@actions/core";
import { getOctokit, context } from "@actions/github";

async function deleteTag() {
  try {
    const token = getInput("github_token", { required: true });
    const octokit = getOctokit(token);

    const { owner, repo } = context.repo;

    const tags = await octokit.paginate(octokit.rest.repos.listTags, {
      owner,
      repo,
    });

    if (!tags || !Array.isArray(tags) || tags.length === 0) {
      console.log("No tags found in the repository.");
      return;
    }

    console.log(`Found ${tags.length} tags in the repository.`);

    const deletionThresholdDays = parseInt(
      getInput("deletionThreshold") || "30",
      10,
    );

    const tagsToBeDeleted = [];
    const now = Date.now();
    const THIRTY_DAYS_MS = deletionThresholdDays * 24 * 60 * 60 * 1000;

    for (const tag of tags) {
      const split = tag.name.split("+");

      if (!split[1]) {
        if (split[0].includes("-").length === 1) continue;
      }

      if (split[1].split("-").length === 1) continue;

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

      tagsToBeDeleted.push(tag.name);
      console.log(`Tag to be deleted: ${tag.name}`);
    }

    for (const tag of tagsToBeDeleted) {
      await octokit.rest.git.deleteRef({
        owner,
        repo,
        ref: `tags/${tag}`,
      });
      console.log(`Deleted tag: ${tag}`);
    }
  } catch (error) {
    console.error("Error deleting tags:", error);
    process.exit(1);
  }

  try {
    console.log("---------------------------------");

    // Default to true unless explicitly set to "false"
    const shouldDeleteDraftReleases =
      getInput("deleteDraftReleases") !== "false";

    if (!shouldDeleteDraftReleases) {
      console.log("Skipping deletion of draft releases.");
      return;
    }

    console.log("Deleteing related draft releases");

    const octokit = getOctokit(process.env.GITHUB_TOKEN);

    const { owner, repo } = context.repo;

    const releases = await octokit.paginate(octokit.rest.repos.listReleases, {
      owner,
      repo,
    });

    const draftReleases = releases.filter(({ draft }) => draft);

    for (const release of draftReleases) {
      cobsole.log(`Deleting draft release: ${release.name}`);

      await octokit.rest.repos.deleteRelease({
        owner,
        repo,
        release_id: release.id,
      });
    }
  } catch (error) {
    console.error("Error deleting draft releases:", error);
    process.exit(1);
  }
}

deleteTag();
