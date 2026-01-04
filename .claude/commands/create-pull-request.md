I will provide <PR name> to you.

If I do not provide a <PR name>, analyze the changes to generate a proper <PR name>.

If a <PR name> is provided, please do the following:

Branch Behavior

1. If the current branch is a feature branch (i.e., NOT main):
   - Use the current branch as the PR branch.

2. If the current branch is main:
   - Create a new branch from main.
   - The new branch name should be automatically generated from the latest commit message, by converting the commit title into a branch-friendly slug.
   - Move all current unpushed commits onto this new branch.
   - Use this branch as the PR branch.

PR Handling

3. Create a new Pull Request and push the PR branch.

4. Based on the differences with origin/main, automatically generate the PR description.

5. Write the PR description in the following structured format:

PR Title
Use <PR name>.

Summary
A brief explanation of the purpose and impact of this change.

Changes
A bullet-point list summarizing the main modifications.

Testing & Verification
Describe how the changes have been tested or validated.

Impact
Explain any potential effects on modules, services, dependencies, or user behavior.

Notes
Additional remarks, considerations, or follow-up work.
