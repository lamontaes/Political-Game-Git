import fs from "fs";

export function generateIndex(manifestPath: string, outputHtml: string) {
  const manifestRaw = fs.readFileSync(manifestPath, "utf8");
  const manifest: unknown[] = JSON.parse(manifestRaw);

  let html = `
  <!DOCTYPE html>
  <html>
  <head>
    <title>HABS TX-3326 Triage Index</title>
    <style>
      body { font-family: sans-serif; background: #111; color: #eee; padding: 20px; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 20px; }
      .card { background: #222; padding: 10px; border-radius: 5px; }
      .card img { max-width: 100%; height: auto; display: block; margin: 0 auto 10px; }
      .card .title { font-size: 0.8em; margin-bottom: 5px; }
      .card .class { font-size: 0.7em; padding: 3px 5px; border-radius: 3px; display: inline-block; margin-bottom: 5px; }
      .high-relevance { background: #800; }
      .possible-relevance { background: #880; }
      .context-only { background: #008; }
      .irrelevant { background: #444; }
    </style>
  </head>
  <body>
    <h1>HABS TX-3326 Triage Index</h1>
    <div class="grid">
  `;

  for (const entry of manifest) {
    const thumbPath = `thumbnails/${entry.stable_id}_thumb.jpg`;
    let cssClass = "irrelevant";
    if (entry.relevance_classification === "high relevance")
      cssClass = "high-relevance";
    if (entry.relevance_classification === "possible relevance")
      cssClass = "possible-relevance";
    if (entry.relevance_classification === "context only")
      cssClass = "context-only";

    html += `
      <div class="card">
        <a href="${entry.canonical_url}" target="_blank">
          <img src="${thumbPath}" alt="Thumbnail" />
        </a>
        <div class="class ${cssClass.replace(" ", "-")}">${entry.relevance_classification}</div>
        <div class="title">Sheet ${entry.sheet_number}</div>
        <div class="title" style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${entry.title}">${entry.title}</div>
        <div class="title" style="color:#aaa;">${entry.notes}</div>
      </div>
    `;
  }

  html += `
    </div>
  </body>
  </html>
  `;

  fs.writeFileSync(outputHtml, html);
  console.log(`Generated HTML index at ${outputHtml}`);
}
