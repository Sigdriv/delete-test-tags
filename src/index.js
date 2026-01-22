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

    tags.forEach((tag) => {
      split = tag.name.split("+");

      if (split[1].split("-").length > 1) {
        deletedTags.push(tag.name);
      }

      console.log(`Tags to be deleted: ${deletedTags.length}`);
    });
  } catch (error) {
    console.error("Error deleting tag:", error);
  }
}

export async function run() {
  await deleteTag();
}
