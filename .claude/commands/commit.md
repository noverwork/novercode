Commit the current changes.  
If a git hook fails, attempt to resolve the issue and retry.  
If the format or lint process makes modifications and stages files, ensure those files are also added with git add before committing.  

Use sub-agent to fix any issues.

You can commit many times until there are not staged files.
