# Git Workflow Cheat Sheet for Ahmed Mostafa

This file will help you know all the commands you need to update the project across multiple machines safely and protect sensitive files.

---

## 1️⃣ Protect Sensitive Files
- Add files you don't want on GitHub to `.gitignore`
```
.env.local
```
> Any files here will not be tracked or uploaded to GitHub.

---

## 2️⃣ Before Starting Work on Any Machine
```bash
# Fetch latest updates from GitHub
git fetch origin

# Merge latest updates into your local copy
git pull origin main
```
> Ensures you are working on the latest version.

---

## 3️⃣ After Finishing Work on Any Machine
```bash
# Check project status
git status

# Add all modified files
git add .

# Commit your changes with a message
git commit -m "Describe the changes you made"

# Push changes to GitHub
git push origin main
```

---

## 4️⃣ If You Have Local Changes and Don't Want to Lose Them
```bash
# Temporarily save local changes
git stash

# Pull latest updates from GitHub
git pull origin main

# Restore your local changes
git stash pop
```
> Protects your local changes before pulling.

---

## 5️⃣ Check Latest Commits
```bash
# Show last 5 commits
git log --oneline -5
```
> Verify the latest GitHub commits are in your local copy.

---

## 6️⃣ Workflow Summary
1. Before starting: `fetch + pull`
2. After finishing work: `add + commit + push`
3. Sensitive files should be in `.gitignore`
4. If there are local changes before updating: `stash + pull + stash pop`

> Following these steps ensures no files or changes are lost on any machine.

