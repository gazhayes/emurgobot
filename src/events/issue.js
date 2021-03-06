exports.run = function(payload) {
  const action = payload.action;
  const issue = payload.issue;
  const repo = payload.repository;
  const label = payload.label;

  if (this.cfg.activity.issues.inProgress) {
    this.automations.get("issueState").progress(payload);
  }

  if (["labeled", "unlabeled"].includes(action)) {
    this.automations.get("areaLabel").run(issue, repo, label);
  } else if (action === "closed" && this.cfg.activity.issues.clearClosed) {
    this.automations.get("issueState").close(issue, repo);
  } else if (action === "reopened") {
    this.automations.get("issueState").reopen(issue);
  } else if (action === "opened" || action === "created") {
    parse.call(this, payload);
  }
};

function parse(payload) {
  const data = payload.comment || payload.issue;
  const commenter = data.user.login;
  const body = data.body;
  const username = this.cfg.auth.username;

  if (commenter === username || !body) return;

  const prefix = RegExp(`@${username} +(\\w+)( +(--\\w+|"[^"]+"))*`, "g");
  const parsed = body.match(prefix);
  if (!parsed) return;

  parsed.forEach(command => {
    const codeBlocks = [`\`\`\`\r\n${command}\r\n\`\`\``, `\`${command}\``];
    if (codeBlocks.some(block => body.includes(block))) return;
    const keyword = command.replace(/\s+/, " ").split(" ")[1];
    const args = command.replace(/\s+/, " ").split(" ").slice(2).join(" ");
    const file = this.commands.get(keyword);

    if (file) {
      file.run.apply(this, [payload, commenter, args]);
    }
  });
}

exports.events = ["issues", "issue_comment"];
