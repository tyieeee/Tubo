# Remove the remote and add it back without token
git remote remove origin
git remote add origin https://github.com/tyieeee/Tubo.git

# Push - this will prompt for your GitHub username and password/token
git push -u origin main
