import { defineAddon } from "@plainbase/addon-sdk";

export const ticketsAddon = defineAddon<JSX.Element>({
  manifest: {
    id: "addon-tickets",
    name: "Tickets",
    version: "1.0.0",
    description: "Zeigt Ticket-Kontext als Sidebar-Panel an.",
    entry: "tickets",
    capabilities: ["tickets", "sidebar"],
    extensions: [
      {
        type: "sidebar-panel",
        id: "tickets.sidebar.summary",
        title: "Tickets Uebersicht",
        location: "right"
      }
    ]
  },
  extensions: [
    {
      type: "sidebar-panel",
      id: "tickets.sidebar.summary",
      title: "Tickets Uebersicht",
      location: "right",
      order: 10,
      render: ({ tickets }) => (
        <div className="addon-panel-body">
          {tickets.length === 0 ? (
            <p className="sidebar-copy">Keine Tickets im aktiven Workspace.</p>
          ) : (
            <ul className="ticket-list">
              {tickets.slice(0, 4).map((ticket) => (
                <li key={ticket.id}>
                  <strong>{ticket.title}</strong>
                  <span>{ticket.status}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )
    }
  ]
});
