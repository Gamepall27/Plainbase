import { defineAddon } from "@plainbase/addon-sdk";

export const diagramsAddon = defineAddon<string | JSX.Element>({
  manifest: {
    id: "addon-diagrams",
    name: "Diagrams",
    version: "1.3.0",
    description: "Rendert einfache diagram-Codebloecke direkt in der Vorschau.",
    entry: "diagrams",
    capabilities: ["markdown", "diagram", "diagrams"],
    extensions: [
      {
        type: "sidebar-panel",
        id: "diagrams.sidebar.help",
        title: "Diagrams Hilfe",
        location: "right"
      },
      {
        type: "markdown-block-renderer",
        id: "diagrams.renderer.diagram",
        title: "Diagram Block Renderer",
        language: "diagram"
      }
    ]
  },
  extensions: [
    {
      type: "sidebar-panel",
      id: "diagrams.sidebar.help",
      title: "Diagrams Hilfe",
      location: "right",
      order: 40,
      render: () => (
        <div className="addon-panel-body">
          <p className="sidebar-copy">
            Verwende einen <code>diagram</code>-Block, um einfache Flows direkt
            im Markdown zu rendern.
          </p>
          <pre className="diagram-example-code">{diagramExample}</pre>
        </div>
      )
    },
    {
      type: "markdown-block-renderer",
      id: "diagrams.renderer.diagram",
      title: "Diagram Block Renderer",
      language: "diagram",
      render: ({ code }) => renderDiagramBlock(code)
    }
  ]
});

const diagramExample = ["```diagram", "A -> B", "B -> C", "```"].join("\n");

function renderDiagramBlock(code: string) {
  const edges = parseDiagramEdges(code);

  if (edges.length === 0) {
    return `
      <section class="addon-renderer-block diagram-block">
        <div class="addon-renderer-label">Diagramm</div>
        <p class="diagram-empty">
          Kein gueltiges Diagramm erkannt. Verwende Zeilen wie
          <code>A -&gt; B</code>.
        </p>
        <pre>${escapeHtml(code)}</pre>
      </section>
    `;
  }

  const nodes = buildDiagramNodeOrder(edges);
  const nodeMarkup = nodes
    .map(
      (node, index) => `
        <div class="diagram-node-segment">
          <span class="diagram-node">${escapeHtml(node)}</span>
          ${index < nodes.length - 1 ? '<span class="diagram-node-arrow">→</span>' : ""}
        </div>
      `
    )
    .join("");
  const edgeMarkup = edges
    .map(
      (edge) => `
        <li>
          <span class="diagram-edge-node">${escapeHtml(edge.from)}</span>
          <span class="diagram-edge-arrow">→</span>
          <span class="diagram-edge-node">${escapeHtml(edge.to)}</span>
        </li>
      `
    )
    .join("");

  return `
    <section class="addon-renderer-block diagram-block">
      <div class="addon-renderer-label">Diagramm</div>
      <div class="diagram-flow">${nodeMarkup}</div>
      <ul class="diagram-edge-list">${edgeMarkup}</ul>
    </section>
  `;
}

function parseDiagramEdges(code: string) {
  return code
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(/^(.+?)\s*->\s*(.+)$/);

      if (!match) {
        return null;
      }

      return {
        from: match[1].trim(),
        to: match[2].trim()
      };
    })
    .filter((edge): edge is { from: string; to: string } => edge !== null);
}

function buildDiagramNodeOrder(edges: Array<{ from: string; to: string }>) {
  const orderedNodes: string[] = [];

  for (const edge of edges) {
    if (orderedNodes.length === 0) {
      orderedNodes.push(edge.from, edge.to);
      continue;
    }

    const lastNode = orderedNodes[orderedNodes.length - 1];

    if (lastNode === edge.from) {
      orderedNodes.push(edge.to);
      continue;
    }

    if (!orderedNodes.includes(edge.from)) {
      orderedNodes.push(edge.from);
    }

    if (!orderedNodes.includes(edge.to)) {
      orderedNodes.push(edge.to);
    }
  }

  return orderedNodes;
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
