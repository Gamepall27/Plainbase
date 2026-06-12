const features = [
  {
    icon: "[]",
    title: "Navigation",
    copy: "Workspaces, Dokumente, Favoriten, Add-ons und Einstellungen."
  },
  {
    icon: "/",
    title: "Bearbeitung im Preview-Modus",
    copy: "Direkt im fertigen Layout arbeiten und die Markdown-Quelle nur bei Bedarf einblenden."
  },
  {
    icon: "+",
    title: "Add-on Panels",
    copy: "Erweiterungen wie Tickets, Diagramme und eigene Tools direkt integriert."
  }
];

export function FeatureStrip() {
  return (
    <section className="feature-strip">
      {features.map((feature) => (
        <article key={feature.title} className="feature-card">
          <div className="feature-icon">{feature.icon}</div>
          <div>
            <h3>{feature.title}</h3>
            <p>{feature.copy}</p>
          </div>
        </article>
      ))}
    </section>
  );
}
