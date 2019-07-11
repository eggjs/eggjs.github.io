workflow "Push" {
  on = "push"
  resolves = ["Deployment"]
}

action "Installation" {
  needs = "Filters for GitHub Actions"
  uses = "./.github/actions-node/"
  args = "yarn"
}

action "Deployment" {
  needs = "Installation"
  uses = "./.github/actions-node/"
  args = "yarn deploy"
  secrets = ["GITHUB_TOKEN"]
}

# Filter for 1.0 branch
action "Filters for GitHub Actions" {
  uses = "actions/bin/filter@3c0b4f0e63ea54ea5df2914b4fabf383368cd0da"
  secrets = ["GITHUB_TOKEN"]
  args = "branch 1.0"
}