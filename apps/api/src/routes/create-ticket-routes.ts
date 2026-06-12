import type { TicketResponse, TicketsResponse } from "@plainbase/shared";
import { Router } from "express";
import { TicketService } from "../services/ticket-service.js";

export function createTicketRoutes(ticketService: TicketService) {
  const router = Router();

  router.get("/workspaces/:workspaceId/tickets", (request, response) => {
    const payload: TicketsResponse = {
      success: true,
      data: {
        tickets: ticketService.listTicketsByWorkspace(request.params.workspaceId)
      }
    };

    response.json(payload);
  });

  router.post("/tickets", (request, response) => {
    const payload: TicketResponse = {
      success: true,
      data: {
        ticket: ticketService.createTicket(request.body)
      }
    };

    response.status(201).json(payload);
  });

  router.put("/tickets/:ticketId", (request, response) => {
    const payload: TicketResponse = {
      success: true,
      data: {
        ticket: ticketService.updateTicket(request.params.ticketId, request.body)
      }
    };

    response.json(payload);
  });

  return router;
}
